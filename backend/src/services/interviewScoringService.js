// backend/src/services/interviewScoringService.js
//
// Replaces the fake seededBase() math with:
//   1. Whisper STT        → real transcript
//   2. Evaluator LLM      → scores + feedback
//   3. Judge LLM          → fairness audit + final scores
//
// summarizeSession() now aggregates real scores.

import { transcribeAudio, chatCompletionJSON } from './llmClient.js';
import { env } from '../config/env.js';

// ─── Evaluator prompt ─────────────────────────────────────────────────────────

function buildEvaluatorPrompt({ questionText, type, transcript }) {
  const typeGuide =
    type === 'Behavioral'
      ? 'Use STAR (Situation, Task, Action, Result) as the evaluation framework.'
      : 'Evaluate technical accuracy, depth of knowledge, and real-world applicability.';

  return `You are an expert interviewer evaluating a candidate's spoken answer.

QUESTION (${type}):
"${questionText}"

CANDIDATE'S TRANSCRIPT:
"${transcript}"

EVALUATION FRAMEWORK: ${typeGuide}

Score the answer on three axes (0–100):
- technical: accuracy and depth of the content
- clarity: structure, coherence, and ease of following
- confidence: assertiveness, appropriate pacing, minimal hedging

Also provide:
- feedback: 2–4 bullet points of specific, actionable coaching (what was good, what to improve)
- betterAnswer: a model answer in 3–5 sentences the candidate can learn from
- keywords: 3–5 keywords that a strong answer should have covered
- fillerWords: estimated count of filler words (um, uh, like, you know) in the transcript

Return ONLY valid JSON in this exact shape:
{
  "scores": { "technical": 72, "clarity": 68, "confidence": 75 },
  "feedback": ["Good point about X", "Missed Y — add a concrete example"],
  "betterAnswer": "A strong answer would ...",
  "keywords": ["scalability", "tradeoffs", "metrics"],
  "fillerWords": 4
}`;
}

// ─── Judge prompt ─────────────────────────────────────────────────────────────

function buildJudgePrompt({ questionText, transcript, evaluation }) {
  return `You are a calibration judge reviewing an AI interviewer's evaluation for bias or scoring errors.

QUESTION: "${questionText}"
TRANSCRIPT: "${transcript}"
EVALUATOR'S SCORES: ${JSON.stringify(evaluation.scores)}
EVALUATOR'S FEEDBACK: ${JSON.stringify(evaluation.feedback)}

Check:
1. Are the scores fair given the transcript? Not too harsh or too lenient?
2. Is the feedback actionable and specific (not generic)?
3. Are there any cultural/language biases in the evaluation?

If any score needs adjustment (by more than 5 points), correct it.
Otherwise keep it unchanged.

Return ONLY valid JSON:
{
  "adjustedScores": { "technical": 72, "clarity": 68, "confidence": 75 },
  "auditNote": "Scores look fair. / Adjusted X because Y."
}`;
}

// ─── main evaluateAnswer ──────────────────────────────────────────────────────

/**
 * Full pipeline: Whisper → Evaluator LLM → Judge LLM → final result.
 *
 * @param {object} params
 * @param {string} params.questionId
 * @param {string} params.questionText
 * @param {string} params.type         "Technical" | "Behavioral"
 * @param {object} params.audio        stored audio metadata from storageService
 *   audio.path   — absolute local path (local storage)
 *   audio.url    — URL (S3 / public)
 *   audio.buffer — Buffer (if still in memory from multer)
 *   audio.fileName
 * @returns {Promise<object>} evaluation result
 */
export async function evaluateAnswer({ questionId, questionText, type, audio }) {
  // ── 1. Transcribe ──────────────────────────────────────────────────────────
  let transcript = '';
  try {
    const audioSource = audio?.buffer ?? audio?.path ?? null;
    const fileName = audio?.fileName ?? 'audio.webm';

    if (!audioSource) {
      throw new Error('No audio source available for transcription');
    }

    transcript = (await transcribeAudio(audioSource, fileName)).trim();
  } catch (err) {
    console.error(`[scoring] Whisper failed for ${questionId}:`, err.message);
    transcript = '[Transcription unavailable — audio could not be processed]';
  }

  // ── 2. Evaluate ────────────────────────────────────────────────────────────
  let evaluation = null;
  try {
    evaluation = await chatCompletionJSON(
      env.llmModelReasoning,
      [{ role: 'user', content: buildEvaluatorPrompt({ questionText, type, transcript }) }],
      { temperature: 0.3, max_tokens: 1024 },
    );
  } catch (err) {
    console.error(`[scoring] Evaluator LLM failed for ${questionId}:`, err.message);
    evaluation = buildFallbackEvaluation(questionText, type);
  }

  const safeScores = normalizeScores(evaluation?.scores);
  const safeFeedback = Array.isArray(evaluation?.feedback) ? evaluation.feedback : [];
  const safeBetterAnswer = evaluation?.betterAnswer ?? '';
  const safeKeywords = Array.isArray(evaluation?.keywords) ? evaluation.keywords : [];
  const safeFillerWords = Number.isFinite(evaluation?.fillerWords) ? evaluation.fillerWords : 0;

  // ── 3. Judge ───────────────────────────────────────────────────────────────
  let finalScores = safeScores;
  try {
    const judgeResult = await chatCompletionJSON(
      env.llmModelJudge,
      [
        {
          role: 'user',
          content: buildJudgePrompt({
            questionText,
            transcript,
            evaluation: { scores: safeScores, feedback: safeFeedback },
          }),
        },
      ],
      { temperature: 0.2, max_tokens: 512 },
    );
    finalScores = normalizeScores(judgeResult?.adjustedScores) ?? safeScores;
  } catch (err) {
    // Judge failure is non-fatal — keep evaluator scores
    console.error(`[scoring] Judge LLM failed for ${questionId}:`, err.message);
  }

  return {
    transcript,
    feedback: safeFeedback,
    betterAnswer: safeBetterAnswer,
    keywords: safeKeywords,
    scores: finalScores,
    fillerWords: safeFillerWords,
  };
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function normalizeScores(raw) {
  if (!raw || typeof raw !== 'object') return { technical: 50, clarity: 50, confidence: 50 };
  return {
    technical: clamp(Number(raw.technical) || 50),
    clarity: clamp(Number(raw.clarity) || 50),
    confidence: clamp(Number(raw.confidence) || 50),
  };
}

function buildFallbackEvaluation(questionText, type) {
  return {
    scores: { technical: 55, clarity: 55, confidence: 55 },
    feedback: [
      'Evaluation service was temporarily unavailable.',
      'Review your answer manually using the transcript above.',
    ],
    betterAnswer:
      type === 'Behavioral'
        ? `Use STAR format: describe the Situation, your Task, the Actions you took, and the Result for: "${questionText}"`
        : `Start with core concepts, discuss tradeoffs, and give a concrete example for: "${questionText}"`,
    keywords: ['clarity', 'specificity', 'impact'],
    fillerWords: 0,
  };
}

// ─── session summary (unchanged logic, now uses real scores) ──────────────────

export function summarizeSession(answers) {
  const completed = answers.filter((a) => a.status === 'completed');

  if (!completed.length) {
    return {
      overallScore: 0,
      confidenceScore: 0,
      technicalScore: 0,
      clarityScore: 0,
      strengths: ['Complete at least one answer to generate strengths.'],
      weaknesses: ['No responses were submitted in this session.'],
      improvements: ['Answer each question and use concise structured responses.'],
    };
  }

  const avg = (key) =>
    Math.round(completed.reduce((sum, a) => sum + (a.scores?.[key] ?? 0), 0) / completed.length);

  const technicalScore = avg('technical');
  const clarityScore = avg('clarity');
  const confidenceScore = avg('confidence');
  const overallScore = Math.round((technicalScore + clarityScore + confidenceScore) / 3);

  const strengths = [];
  const weaknesses = [];

  if (technicalScore >= 75) strengths.push('Strong technical depth and accurate terminology.');
  else weaknesses.push('Increase technical depth — add concrete examples and implementation detail.');

  if (clarityScore >= 72) strengths.push('Answers were well-structured and easy to follow.');
  else weaknesses.push('Work on structure — use Context → Action → Outcome consistently.');

  if (confidenceScore >= 70) strengths.push('Confident, well-paced verbal delivery.');
  else weaknesses.push('Reduce filler words, slow the pace, and commit to your answers.');

  if (!strengths.length) strengths.push('Good intent and reasoning throughout.');
  if (!weaknesses.length) weaknesses.push('Keep improving precision and measurable impact statements.');

  return {
    overallScore,
    confidenceScore,
    technicalScore,
    clarityScore,
    strengths,
    weaknesses,
    improvements: [
      'Use a consistent framework: Context → Action → Outcome.',
      'Quantify results with numbers wherever possible.',
      'Keep introductions short and close with a summary sentence.',
    ],
  };
}
