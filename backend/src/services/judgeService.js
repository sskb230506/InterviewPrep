import { callLLM } from '../llm/orchestrator.js';

/**
 * Audits an evaluation using Mistral 7B to ensure fairness and logical consistency.
 * @param {string} questionText
 * @param {string} answerTranscript
 * @param {Object} evaluationPayload - The JSON output from evaluateAnswer
 * @returns {Promise<Object>} JSON with audit results.
 */
export async function judgeEvaluation(questionText, answerTranscript, evaluationPayload) {
    const systemPrompt = `You are a "Judge AI" (auditor). Your task is to audit the evaluation produced by another AI for fairness, logical consistency, and specificity.
Does the evaluation's reasoning actually justify the scores given? Is the feedback actionable and relevant to the answer?

Evaluate based on:
1. Suggestion relevance
2. Fairness of scoring
3. Logical consistency
4. Specificity of improvements

Output EXACTLY valid JSON with this structure:
{
  "confidenceScore": 85, // 0 to 100 on how reliable the evaluation is
  "isValid": true, // Boolean. True if confidence > 70.
  "suggestedRegeneration": false, // True if the evaluation is egregiously bad/hallucinated
  "auditReasoning": "Brief explanation of why the evaluation is fair or flawed."
}`;

    const userPrompt = `
Question: ${questionText}

Candidate Answer:
${answerTranscript || '[No answer]'}

AI Evaluation to Audit:
${JSON.stringify(evaluationPayload, null, 2)}
`;

    const model = process.env.LLM_MODEL_JUDGE || 'mixtral-8x7b-32768'; // Or mistral-saba-24b, whichever Mistral variant is configured

    const response = await callLLM({
        model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        response_format: { type: "json_object" },
        maxRetries: 2
    });

    return response;
}
