// backend/src/services/audioService.js
//
// Rewritten to use native fetch + FormData (Node 18+) — no axios or form-data package needed.

import fs from 'fs';

/**
 * Transcribes audio using Groq Whisper.
 * @param {string} audioFilePath - Path to the saved audio file
 * @returns {Promise<string>} Transcription text
 */
export async function transcribeAudio(audioFilePath) {
  const apiKey = process.env.WHISPER_API_KEY || process.env.LLM_API_KEY;
  const baseURL =
    process.env.WHISPER_BASE_URL || 'https://api.groq.com/openai/v1/audio/transcriptions';

  if (!apiKey) {
    throw new Error('WHISPER_API_KEY or LLM_API_KEY environment variable is missing.');
  }

  let buffer;
  try {
    buffer = fs.readFileSync(audioFilePath);
  } catch (readErr) {
    throw new Error(`Failed to read audio file: ${readErr.message}`);
  }

  const formData = new FormData();
  const blob = new Blob([buffer], { type: 'audio/webm' });
  formData.append('file', blob, 'answer.webm');
  formData.append('model', process.env.WHISPER_MODEL || 'whisper-large-v3');
  formData.append('response_format', 'json');

  try {
    const res = await fetch(baseURL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Whisper API error ${res.status}: ${text}`);
    }

    const data = await res.json();
    return data.text ?? '';
  } catch (error) {
    console.error('Audio transcription failed:', error.message);
    throw new Error(`Failed to transcribe audio: ${error.message}`);
  } finally {
    // Clean up the temp file
    fs.unlink(audioFilePath, () => {});
  }
}
