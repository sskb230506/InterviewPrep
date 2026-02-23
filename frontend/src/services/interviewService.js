import { mockQuestionBank, mockResults } from '../data/mockData';
import { sleep } from '../utils/helpers';
import { apiRequest, isMockMode } from './apiClient';

export async function createInterviewSession(payload) {
  if (isMockMode()) {
    await sleep(600);
    return {
      sessionId: `session_${Date.now()}`,
      ...payload,
      createdAt: new Date().toISOString(),
    };
  }

  return apiRequest('/interview/session', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchNextQuestion(sessionId, index) {
  if (isMockMode()) {
    await sleep(800);
    return mockQuestionBank[index] || null;
  }

  return apiRequest(`/interview/session/${sessionId}/question?index=${index}`);
}

export async function submitAudioAnswer(sessionId, questionId, audioBlob) {
  if (isMockMode()) {
    await sleep(1000);
    return {
      status: 'processed',
      questionId,
    };
  }

  const formData = new FormData();
  formData.append('audio', audioBlob, `${questionId}.webm`);
  formData.append('questionId', questionId);

  const token = localStorage.getItem('aiprep_token');
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/interview/session/${sessionId}/answer`,
    {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    },
  );

  if (!response.ok) {
    throw new Error('Failed to submit answer audio');
  }

  return response.json();
}

export async function endInterviewSession(sessionId) {
  if (isMockMode()) {
    await sleep(500);
    return { sessionId, status: 'completed' };
  }

  return apiRequest(`/interview/session/${sessionId}/end`, {
    method: 'POST',
  });
}

export async function fetchInterviewResults(sessionId) {
  if (isMockMode()) {
    await sleep(700);
    return {
      sessionId,
      ...mockResults,
    };
  }

  return apiRequest(`/interview/session/${sessionId}/results`);
}

export async function fetchInterviewReview(sessionId) {
  if (isMockMode()) {
    await sleep(800);
    return {
      sessionId,
      perQuestion: mockResults.perQuestion,
    };
  }

  return apiRequest(`/interview/session/${sessionId}/review`);
}
