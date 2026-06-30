// backend/src/llm/orchestrator.js
//
// Rewritten to use native fetch (Node 18+) instead of axios,
// so no extra npm install is required.

/**
 * Core LLM caller with retry and timeout logic.
 * Assumes an OpenAI-compatible endpoint (like Groq, Together, etc.).
 * @param {Object} params
 * @param {string} params.model - Model identifier (e.g., 'llama3-8b-8192')
 * @param {Array}  params.messages - Array of {role, content}
 * @param {Object} [params.response_format] - { type: "json_object" }
 * @param {number} [params.maxRetries=3]
 * @param {number} [params.timeout=20000] - ms before aborting
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
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          response_format,
          temperature: 0.2,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const data = await res.json();
      const content = data.choices[0].message.content;

      if (response_format?.type === 'json_object') {
        try {
          return JSON.parse(content);
        } catch {
          const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
          return JSON.parse(cleaned);
        }
      }

      return content;
    } catch (error) {
      clearTimeout(timer);
      attempt++;
      const msg = error.name === 'AbortError' ? 'Request timed out' : error.message;
      console.warn(`[LLM Orchestrator] Attempt ${attempt} failed for ${model}:`, msg);
      if (attempt >= maxRetries) {
        throw new Error(`[LLM Orchestrator] Max retries reached: ${msg}`);
      }
      // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }
}
