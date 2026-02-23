import { mockExtractedSkills } from '../data/mockData';
import { sleep } from '../utils/helpers';
import { apiRequest, isMockMode } from './apiClient';

export async function uploadResume(file) {
  if (isMockMode()) {
    await sleep(1500);
    return {
      resumeId: `resume_${Date.now()}`,
      status: 'parsed',
      skills: mockExtractedSkills,
      fileName: file.name,
    };
  }

  const formData = new FormData();
  formData.append('resume', file);

  const token = localStorage.getItem('aiprep_token');
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/resume/upload`, {
    method: 'POST',
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined,
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Resume upload failed');
  }

  return response.json();
}

export async function updateSkills(skills) {
  if (isMockMode()) {
    await sleep(500);
    return { skills };
  }

  return apiRequest('/resume/skills', {
    method: 'PUT',
    body: JSON.stringify({ skills }),
  });
}
