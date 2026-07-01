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
      ? 'Use STAR (Situation, Task, Action, Result) as the evaluation framework. Check whether the candidate described a real Situation, their specific Task/role, the concrete Actions they took, and a measurable Result.'
      : 'Evaluate technical accuracy, depth of knowledge, correct terminology, and real-world applicability. Check for misconceptions, missing fundamentals, or vague hand-waving.';

  return `You are an expert technical interviewer giving highly personalized, honest feedback to a candidate.

QUESTION (${type}):
"${questionText}"

CANDIDATE'S ACTUAL ANSWER (verbatim transcript):
"${transcript}"

YOUR JOB:
1. Read what the candidate ACTUALLY said — do NOT give generic advice.
2. ${typeGuide}
3. Quote or paraphrase specific things they said to make feedback concrete.
4. Identify what was good, what was missing, and what was wrong.

Score 0–100 on three axes:
- technical: accuracy and depth of the actual content they gave
- clarity: structure, coherence, logical flow of THEIR answer
- confidence: assertiveness, appropriate pacing, minimal hedging in THEIR delivery

Return ONLY valid JSON:
{
  "scores": { "technical": 72, "clarity": 68, "confidence": 75 },
  "feedback": [
    "You correctly mentioned X — that shows solid understanding of Y.",
    "You said '...' but missed explaining Z, which is crucial here.",
    "Your answer lacked a concrete example — add one to strengthen it."
  ],
  "betterAnswer": "A strong answer to this question would start by... then explain... and close with...",
  "keywords": ["term1", "term2", "term3"],
  "fillerWords": 3
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
// Minimum meaningful transcript length (words) to attempt evaluation
const MIN_TRANSCRIPT_WORDS = 5;

/**
 * Returns true when the transcript indicates no real speech was captured.
 */
function isEmptyTranscript(transcript) {
  if (!transcript || !transcript.trim()) return true;
  if (transcript.startsWith('[Transcription unavailable')) return true;
  // Groq Whisper sometimes returns transcriptions like "Thank you." or just filler for silence
  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;
  return wordCount < MIN_TRANSCRIPT_WORDS;
}

export async function evaluateAnswer({ questionId, questionText, type, audio }) {
  // ── 1. Transcribe ──────────────────────────────────────────────────────────
  let transcript = '';
  let transcriptionFailed = false;
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
    transcriptionFailed = true;
  }

  // ── Guard: no real audio detected ─────────────────────────────────────────
  if (transcriptionFailed || isEmptyTranscript(transcript)) {
    console.warn(`[scoring] Empty/silent audio for ${questionId} — skipping LLM evaluation.`);
    return {
      transcript: transcript || '[No speech detected in the recording]',
      feedback: [
        'No spoken answer was detected in your recording.',
        'Please record a response with your microphone clearly active and speak your answer aloud.',
        'Ensure your microphone is not muted and you are speaking close enough to be captured.',
      ],
      betterAnswer: `For this question — "${questionText}" — please record a spoken response. Describe your approach clearly using the ${type === 'Behavioral' ? 'STAR framework (Situation, Task, Action, Result)' : 'concept definition, how it works, and a real-world example'}.`,
      keywords: [],
      scores: { technical: 0, clarity: 0, confidence: 0 },
      fillerWords: 0,
      noAudioDetected: true,
    };
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

  const safeScores = normalizeScores(evaluation?.scores) ?? { technical: 0, clarity: 0, confidence: 0 };
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
  if (!raw || typeof raw !== 'object') return null;
  return {
    technical: clamp(Number(raw.technical) || 0),
    clarity: clamp(Number(raw.clarity) || 0),
    confidence: clamp(Number(raw.confidence) || 0),
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
