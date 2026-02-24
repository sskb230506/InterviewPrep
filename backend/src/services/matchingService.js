import { callLLM } from '../llm/orchestrator.js';

/**
 * Computes skill match between Resume and JD using Llama 3 8B Instruct.
 * @param {string} resumeText
 * @param {string} jdText
 * @returns {Promise<Object>} JSON with matches, missing skills, and score.
 */
export async function computeSkillMatch(resumeText, jdText) {
    const systemPrompt = `You are an expert technical recruiter AI.
Analyze the provided Resume against the Job Description.

Output EXACTLY valid JSON with the following structure:
{
  "matchedSkills": ["skill1", "skill2"],
  "missingSkills": ["skill3", "skill4"],
  "matchScore": 75,
  "reasoning": "Brief explanation of the score based on skills."
}`;

    const userPrompt = `
Job Description:
${jdText.substring(0, 3000)}

Resume:
${resumeText.substring(0, 3000)}
`;

    // Provide deterministic model naming, map to process.env if available, fallback to typical groq/together slug
    const model = process.env.LLM_MODEL_EXTRACTION || 'llama3-8b-8192';

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
