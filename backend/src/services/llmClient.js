// backend/src/services/llmClient.js
//
// Thin wrappers around the Groq-compatible OpenAI API configured in env.js.
// Uses: LLM_API_KEY, LLM_BASE_URL, LLM_MODEL_*, WHISPER_API_KEY, WHISPER_BASE_URL, WHISPER_MODEL.

import fs from 'fs';
import { env } from '../config/env.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

function llmHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${env.llmApiKey}`,
  };
}

// ─── chat completion ──────────────────────────────────────────────────────────

/**
 * @param {string} model    - one of env.llmModelExtraction / Reasoning / Judge
 * @param {Array}  messages - OpenAI-style [{role, content}]
 * @param {object} opts     - optional overrides: { temperature, max_tokens, response_format }
 * @returns {Promise<string>} the assistant message content
 */
export async function chatCompletion(model, messages, opts = {}) {
  const body = {
    model,
    messages,
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.max_tokens ?? 2048,
    ...(opts.response_format ? { response_format: opts.response_format } : {}),
  };

  const res = await fetch(`${env.llmBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: llmHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

// ─── JSON chat completion ─────────────────────────────────────────────────────

/**
 * Same as chatCompletion but parses and returns a JSON object.
 * Strips markdown code fences if the model wraps the JSON in ```json ... ```.
 */
export async function chatCompletionJSON(model, messages, opts = {}) {
  const raw = await chatCompletion(model, messages, {
    ...opts,
    response_format: { type: 'json_object' },
  });

  // strip markdown fences just in case
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error(`LLM returned invalid JSON: ${cleaned.slice(0, 200)}`);
  }
}

// ─── Whisper STT ──────────────────────────────────────────────────────────────

/**
 * Transcribes an audio file using Whisper via Groq.
 * Uses multipart/form-data with native Node.js fetch + FormData (Node 18+).
 *
 * @param {Buffer|string} audioSource - Buffer or absolute file path
 * @param {string}        fileName    - original filename (used to infer MIME type)
 * @returns {Promise<string>} transcript text
 */
export async function transcribeAudio(audioSource, fileName = 'audio.webm') {
  const formData = new FormData();

  if (Buffer.isBuffer(audioSource)) {
    const blob = new Blob([audioSource]);
    formData.append('file', blob, fileName);
  } else {
    const buffer = fs.readFileSync(audioSource);
    const blob = new Blob([buffer]);
    formData.append('file', blob, fileName);
  }

  formData.append('model', env.whisperModel);
  formData.append('response_format', 'text');

  const res = await fetch(env.whisperBaseUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.whisperApiKey}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Whisper API error ${res.status}: ${text}`);
  }

  return res.text(); // response_format=text returns plain text
}
