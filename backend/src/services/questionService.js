import { callLLM } from '../llm/orchestrator.js';

/**
 * Generates an interview question using DeepSeek-R1.
 * @param {Object} context
 * @param {string} context.resumeText
 * @param {string} context.jdText
 * @param {Array<string>} context.previousQuestions
 * @param {string} context.difficulty - 'Beginner', 'Intermediate', 'Advanced'
 * @returns {Promise<Object>} The generated question.
 */
export async function generateQuestion({ resumeText, jdText, previousQuestions = [], difficulty = 'Intermediate' }) {
    const systemPrompt = `You are an expert technical interviewer.
Based on the candidate's Resume and the target Job Description, generate ONE highly relevant interview question.
Do NOT repeat the general topic of previous questions.
The question complexity should be: ${difficulty}.

Output EXACTLY valid JSON with the following structure:
{
  "question": "The interview question text",
  "difficulty": "${difficulty}",
  "reasoning": "Why this question is relevant to the candidate's skills and the JD missing gaps."
}`;

    const userPrompt = `
Job Description:
${jdText.substring(0, 1500)}

Resume:
${resumeText.substring(0, 1500)}

Previous Questions Asked:
${previousQuestions.length > 0 ? previousQuestions.join('\n') : 'None'}
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
