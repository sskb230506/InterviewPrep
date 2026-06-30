// backend/src/services/questionService.js
//
// Replaces the old hardcoded question library.
// Calls the LLM with resume + JD + role + difficulty to generate
// contextual, difficulty-calibrated questions.
//
// MCQ options are strictly short (≤8 words each) so the UI doesn't overflow.
// Questions are biased toward the candidate's actual resume and job description.

import { chatCompletionJSON } from './llmClient.js';
import { env } from '../config/env.js';
import crypto from 'crypto';

// ─── difficulty calibration ──────────────────────────────────────────────────

const DIFFICULTY_CONFIG = {
  Easy: {
    label: 'entry-level / fresher (0–1 years experience)',
    guidance: `
- Focus on fundamentals: language basics, data structures, basic algorithms, HTTP.
- Ask about personal/academic projects listed in the resume.
- Avoid system design, distributed systems, or advanced architecture topics.
- Behavioral questions should be about learning, teamwork, handling feedback.
- Complexity: "explain what X is and give a simple example."`,
  },
  Medium: {
    label: 'mid-level (2–4 years experience)',
    guidance: `
- Mix of applied concepts and practical tradeoffs.
- Ask about specific technologies, libraries, or patterns mentioned in the resume.
- Include one design/architecture question (at component level, not full system).
- Behavioral questions should involve ownership, conflict, deadline pressure.
- Complexity: "compare X vs Y, when would you use each, and what tradeoffs matter."`,
  },
  Hard: {
    label: 'senior-level (5+ years experience)',
    guidance: `
- Deep system design, scalability, distributed systems, performance tuning.
- Focus on architecture decisions, failure modes, observability, trade-offs at scale.
- Behavioral questions should cover leading teams, cross-functional conflicts, technical vision.
- Complexity: "design X to handle Y scale, walk me through your decisions and edge cases."`,
  },
};

// ─── interview type split ─────────────────────────────────────────────────────

function getTypeSplit(interviewType, count) {
  if (interviewType === 'Technical') {
    return { technical: count, behavioral: 0 };
  }
  if (interviewType === 'Behavioral') {
    return { technical: 0, behavioral: count };
  }
  // Mixed: roughly 60/40 technical/behavioral
  const technical = Math.ceil(count * 0.6);
  return { technical, behavioral: count - technical };
}

// ─── prompt builder ──────────────────────────────────────────────────────────

function buildPrompt({ role, difficulty, interviewType, count, resumeText, jdText }) {
  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.Medium;
  const { technical, behavioral } = getTypeSplit(interviewType, count);

  const resumeSection = resumeText?.trim()
    ? `CANDIDATE RESUME:\n${resumeText.trim()}`
    : 'CANDIDATE RESUME: Not provided.';

  const jdSection = jdText?.trim()
    ? `JOB DESCRIPTION:\n${jdText.trim()}`
    : 'JOB DESCRIPTION: Not provided.';

  return `You are a technical interviewer conducting a ${config.label} interview for a ${role} position.

${resumeSection}

${jdSection}

DIFFICULTY RULES for ${difficulty}:
${config.guidance}

TASK:
Generate exactly ${count} interview question(s) for this session.
- ${technical} Technical question(s)
- ${behavioral} Behavioral question(s)

CRITICAL RULES:
1. At least 60% of questions MUST reference something specific from the resume or job description above.
   If the resume has a project, ask about it. If the JD mentions a technology, ask about it.
2. Difficulty MUST match "${difficulty}" (${config.label}). Do NOT ask system design questions to a fresher.
3. For MCQ questions: provide exactly 4 options. Each option MUST be ≤8 words. No full sentences as options.
   GOOD option: "It reduces re-renders by memoizing"
   BAD option: "Because it prevents unnecessary re-renders by using a comparison function to check if props have changed"
4. Exactly one MCQ option must be correct (correctIndex = 0, 1, 2, or 3).
5. Mix MCQ and open-ended questions. Do not make all questions MCQ.

Return ONLY a valid JSON object in this exact shape:
{
  "questions": [
    {
      "type": "Technical",
      "format": "mcq",
      "text": "The question text here",
      "options": ["option A", "option B", "option C", "option D"],
      "correctIndex": 0,
      "hint": "What a strong answer should cover (1 sentence)"
    },
    {
      "type": "Behavioral",
      "format": "open",
      "text": "The question text here",
      "hint": "What a strong answer should cover (1 sentence)"
    }
  ]
}`;
}

// ─── main export ──────────────────────────────────────────────────────────────

/**
 * Generates interview questions using the LLM.
 *
 * @param {object} params
 * @param {string} params.role           - e.g. "Frontend Engineer"
 * @param {string} params.difficulty     - "Easy" | "Medium" | "Hard"
 * @param {string} params.interviewType  - "Technical" | "Behavioral" | "Mixed"
 * @param {number} params.count          - number of questions (default 5)
 * @param {string} [params.resumeText]   - parsed resume text
 * @param {string} [params.jdText]       - job description text
 * @returns {Promise<Array>} questions array ready to save into InterviewSession
 */
export async function generateInterviewQuestions({
  role,
  difficulty,
  interviewType,
  count = 5,
  resumeText = '',
  jdText = '',
}) {
  const prompt = buildPrompt({ role, difficulty, interviewType, count, resumeText, jdText });

  let parsed;
  try {
    parsed = await chatCompletionJSON(
      env.llmModelReasoning, // use the stronger model for question generation
      [{ role: 'user', content: prompt }],
      { temperature: 0.6, max_tokens: 2048 },
    );
  } catch (err) {
    console.error('[questionService] LLM call failed, falling back to stubs:', err.message);
    return buildFallbackQuestions({ role, difficulty, interviewType, count });
  }

  const rawQuestions = parsed?.questions;
  if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
    console.error('[questionService] LLM returned unexpected shape, falling back');
    return buildFallbackQuestions({ role, difficulty, interviewType, count });
  }

  // Normalise and stamp IDs
  return rawQuestions.slice(0, count).map((q, i) => {
    const id = `q_${i + 1}_${crypto.randomUUID().slice(0, 8)}`;

    const base = {
      id,
      type: q.type === 'Behavioral' ? 'Behavioral' : 'Technical',
      format: q.format === 'mcq' ? 'mcq' : 'open',
      text: String(q.text || '').trim(),
      hint: String(q.hint || '').trim(),
    };

    if (base.format === 'mcq' && Array.isArray(q.options) && q.options.length === 4) {
      base.options = q.options.map((o) => String(o).trim());
      base.correctIndex = Number.isInteger(q.correctIndex) ? q.correctIndex : 0;
    } else {
      base.format = 'open'; // demote malformed MCQ to open
    }

    return base;
  });
}

// ─── fallback (used only when LLM is down) ───────────────────────────────────

function buildFallbackQuestions({ role, difficulty, interviewType, count }) {
  const stubs = {
    Technical: [
      { text: `What does a ${role} do day-to-day?`, format: 'open' },
      { text: 'Explain the difference between synchronous and asynchronous code.', format: 'open' },
      {
        text: 'Which of these best describes a REST API?',
        format: 'mcq',
        options: [
          'Stateless client-server protocol',
          'Requires WebSocket connection',
          'Only works with SQL databases',
          'Uses binary encoding only',
        ],
        correctIndex: 0,
      },
    ],
    Behavioral: [
      { text: 'Tell me about a project you are proud of.', format: 'open' },
      { text: 'How do you handle feedback on your code?', format: 'open' },
    ],
  };

  const pool =
    interviewType === 'Behavioral'
      ? stubs.Behavioral
      : interviewType === 'Technical'
        ? stubs.Technical
        : [...stubs.Technical, ...stubs.Behavioral];

  return Array.from({ length: count }, (_, i) => {
    const stub = pool[i % pool.length];
    return {
      id: `q_${i + 1}_fallback_${crypto.randomUUID().slice(0, 8)}`,
      type: interviewType === 'Behavioral' ? 'Behavioral' : 'Technical',
      format: stub.format,
      text: stub.text,
      hint: '',
      ...(stub.format === 'mcq'
        ? { options: stub.options, correctIndex: stub.correctIndex }
        : {}),
    };
  });
}
