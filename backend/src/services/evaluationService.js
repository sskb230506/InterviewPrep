import { callLLM } from '../llm/orchestrator.js';

/**
 * Evaluates an interview answer using DeepSeek-R1.
 * @param {string} questionText
 * @param {string} answerTranscript
 * @returns {Promise<Object>} JSON containing the evaluation scores and feedback.
 */
export async function evaluateAnswer(questionText, answerTranscript) {
    const systemPrompt = `You are a strict, objective, and expert technical interviewer evaluating a candidate's answer.
Analyze the user's answer to the provided question. 
You MUST provide reasoning for each score before arriving at the score.

Scoring Rubric (0-10 for each):
- Technical Accuracy
- Relevance to the question
- Depth of knowledge
- Clarity of explanation
- Structure of the answer

Confidence Score: Estimate confidence (0-10) based on filler words, tone (if transcript captures it), and directness.

Output EXACTLY valid JSON with this structure:
{
  "reasoningTech": "...",
  "scoreTech": 8,
  "reasoningRelevance": "...",
  "scoreRelevance": 7,
  "reasoningDepth": "...",
  "scoreDepth": 6,
  "reasoningClarity": "...",
  "scoreClarity": 8,
  "reasoningStructure": "...",
  "scoreStructure": 9,
  "reasoningConfidence": "...",
  "scoreConfidence": 8,
  "generalFeedback": "A short summary paragraph of what they did well and what to improve."
}`;

    const userPrompt = `
Question: ${questionText}

Candidate Answer (Transcript):
${answerTranscript || '[No answer provided or unintelligible]'}
`;

    const model = process.env.LLM_MODEL_REASONING || 'deepseek-r1-distill-llama-70b';

    const response = await callLLM({
        model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        response_format: { type: "json_object" },
        maxRetries: 3
    });

    return response;
}
