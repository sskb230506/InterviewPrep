import { callLLM } from '../llm/orchestrator.js';

const TOPICS = [
    'Arrays', 'Strings', 'Linked Lists', 'Stacks & Queues', 'Trees & BST',
    'Graphs', 'Dynamic Programming', 'Recursion & Backtracking', 'Sorting & Searching',
    'Hashing', 'Heaps & Priority Queues', 'Tries', 'Greedy Algorithms',
    'Bit Manipulation', 'Math & Number Theory', 'Object-Oriented Design',
    'System Design Concepts', 'Databases & SQL', 'Operating Systems',
    'Computer Networks', 'Operating System Internals'
];

/**
 * Generate a conceptual interview question (for Core Concepts mode).
 * Returns either MCQ or open-ended voice question format.
 */
export async function generateConceptQuestion({
    topic,
    difficulty,
    yoe,
    answerMode = 'mcq',
    previousQuestions = []
}) {
    const experienceContext = yoe === 0
        ? 'a fresher with no professional experience'
        : yoe === 1
        ? 'a junior developer with 1 year of experience'
        : yoe <= 3
        ? `a mid-level developer with ${yoe} years of experience`
        : yoe <= 7
        ? `a senior developer with ${yoe} years of experience`
        : `a tech lead or architect with ${yoe}+ years of experience`;

    if (answerMode === 'mcq') {
        const systemPrompt = `You are a senior technical interviewer creating MCQ (multiple choice) questions for a core concepts assessment.
The candidate is ${experienceContext}.
Topic: ${topic}. Difficulty: ${difficulty}.

IMPORTANT difficulty guidelines:
- Easy: Fundamental definitions, basic syntax, simple "what does X do?" questions.
- Medium: Conceptual "why" and "how" questions, real-world application, trade-offs.
- Hard: Nuanced edge cases, architectural decisions, deep internals.

Do NOT repeat topic/concept from previous questions: ${previousQuestions.length > 0 ? previousQuestions.join(', ') : 'None'}

Return EXACTLY valid JSON:
{
  "question": "The question text",
  "options": {
    "A": "First option",
    "B": "Second option", 
    "C": "Third option",
    "D": "Fourth option"
  },
  "correctAnswer": "B",
  "explanation": "Detailed explanation of why B is correct and why others are wrong",
  "topic": "${topic}",
  "difficulty": "${difficulty}",
  "concept": "The specific sub-concept being tested"
}`;

        const userPrompt = `Generate one ${difficulty} MCQ question on ${topic} for ${experienceContext}.`;

        const model = process.env.LLM_MODEL_REASONING || 'llama-3.3-70b-versatile';
        return await callLLM({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            response_format: { type: 'json_object' },
            maxRetries: 3
        });

    } else {
        // Voice mode — open-ended conceptual question
        const systemPrompt = `You are a senior technical interviewer conducting a core concepts interview.
The candidate is ${experienceContext}.
Topic: ${topic}. Difficulty: ${difficulty}.

Generate a high-quality open-ended conceptual question that:
- Matches the candidate's experience level
- Tests understanding, not memorization
- Encourages the candidate to explain their reasoning
- Is specific and focused (not too broad)

Do NOT repeat topic from: ${previousQuestions.length > 0 ? previousQuestions.join(', ') : 'None'}

Return EXACTLY valid JSON:
{
  "question": "The question text",
  "expectedKeyPoints": ["Key point 1 to look for in the answer", "Key point 2", "Key point 3"],
  "follow_up": "A follow-up question to ask if the answer is superficial",
  "topic": "${topic}",
  "difficulty": "${difficulty}",
  "concept": "The specific concept being tested"
}`;

        const userPrompt = `Generate one ${difficulty} open-ended voice interview question on ${topic} for ${experienceContext}.`;

        const model = process.env.LLM_MODEL_REASONING || 'llama-3.3-70b-versatile';
        return await callLLM({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            response_format: { type: 'json_object' },
            maxRetries: 3
        });
    }
}

/**
 * Evaluate an MCQ answer
 */
export async function evaluateMCQAnswer({ question, selectedOption, correctAnswer, explanation }) {
    const isCorrect = selectedOption === correctAnswer;
    return {
        isCorrect,
        selectedOption,
        correctAnswer,
        explanation,
        score: isCorrect ? 10 : 0
    };
}

/**
 * Evaluate a voice answer for a concepts question
 */
export async function evaluateConceptAnswer({ question, keyPoints, transcript }) {
    const systemPrompt = `You are an expert technical interviewer evaluating a candidate's spoken answer to a core concepts question.

Assess how well the transcript covers the expected key points. Be encouraging but honest.

Return EXACTLY valid JSON:
{
  "score": 7,
  "coveredPoints": ["Key points the candidate mentioned"],
  "missedPoints": ["Key points the candidate missed"],
  "generalFeedback": "2-3 sentences of constructive feedback",
  "strengthAreas": "What the candidate did well",
  "improvementAreas": "What they should work on"
}`;

    const userPrompt = `Question: ${question}
Expected Key Points: ${keyPoints.join(', ')}

Candidate's Answer Transcript: "${transcript}"`;

    const model = process.env.LLM_MODEL_JUDGE || 'llama-3.1-8b-instant';
    return await callLLM({
        model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        maxRetries: 2
    });
}

export { TOPICS };
