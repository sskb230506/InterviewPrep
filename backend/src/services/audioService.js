import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

/**
 * Transcribes audio using an open-source Whisper model via API.
 * @param {string} audioFilePath - Path to the saved audio file
 * @returns {Promise<string>} Transcription text
 */
export async function transcribeAudio(audioFilePath) {
    // Can use Hugging Face Inference API or standard Groq Whisper-large-v3
    const apiKey = process.env.WHISPER_API_KEY || process.env.LLM_API_KEY;
    const baseURL = process.env.WHISPER_BASE_URL || 'https://api.groq.com/openai/v1/audio/transcriptions';

    if (!apiKey) {
        throw new Error('WHISPER_API_KEY or LLM_API_KEY environment variable is missing.');
    }

    const formData = new FormData();
    // Groq Whisper requires a filename with a valid extension to detect the codec
    formData.append('file', fs.createReadStream(audioFilePath), {
        filename: 'answer.webm',
        contentType: 'audio/webm',
    });
    formData.append('model', process.env.WHISPER_MODEL || 'whisper-large-v3');
    formData.append('response_format', 'json');

    try {
        const response = await axios.post(baseURL, formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${apiKey}`,
            },
            timeout: 30000,
        });
        return response.data.text;
    } catch (error) {
        const detail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
        console.error('Audio transcription failed:', detail);
        throw new Error(`Failed to transcribe audio: ${detail}`);
    } finally {
        fs.unlink(audioFilePath, () => { });
    }
}
