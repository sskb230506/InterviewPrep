import axios from 'axios';

/**
 * Core LLM caller with retry and timeout logic.
 * Assumes an OpenAI-compatible endpoint (like Groq, Together, etc.).
 * @param {Object} params
 * @param {string} params.model - Model identifier (e.g., 'llama3-8b-8192')
 * @param {Array} params.messages - Array of {role, content}
 * @param {Object} [params.response_format] - { type: "json_object" }
 * @param {number} [params.maxRetries=3]
 * @param {number} [params.timeout=15000] - 15 seconds
 */
export async function callLLM({
    model,
    messages,
    response_format,
    maxRetries = 3,
    timeout = 20000,
}) {
    const apiKey = process.env.LLM_API_KEY;
    const baseURL = process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1';

    if (!apiKey) {
        throw new Error('LLM_API_KEY environment variable is missing.');
    }

    let attempt = 0;
    while (attempt < maxRetries) {
        try {
            const response = await axios.post(
                `${baseURL}/chat/completions`,
                {
                    model,
                    messages,
                    response_format,
                    temperature: 0.2, // Low temp for structured/reasoning outputs
                },
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    timeout, // axios timeout setting
                }
            );

            const content = response.data.choices[0].message.content;

            if (response_format && response_format.type === 'json_object') {
                // Validate JSON parsing
                try {
                    return JSON.parse(content);
                } catch (jsonErr) {
                    // If the model prepended markdown ```json, strip it
                    const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
                    return JSON.parse(cleaned);
                }
            }

            return content;
        } catch (error) {
            attempt++;
            const errorMessage = error.response?.data ? JSON.stringify(error.response.data) : error.message;
            console.warn(`[LLM Orchestrator] Attempt ${attempt} failed for ${model}:`, errorMessage);
            if (attempt >= maxRetries) {
                throw new Error(`[LLM Orchestrator] Max retries reached: ${errorMessage}`);
            }
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        }
    }
}
