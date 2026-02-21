import { apiRequest, isMockMode } from './apiClient';
import { sleep } from '../utils/helpers';

export async function updateProfile(payload) {
  if (isMockMode()) {
    await sleep(500);
    return payload;
  }

  return apiRequest('/settings/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function changePassword(payload) {
  if (isMockMode()) {
    await sleep(500);
    return { success: true };
  }

  return apiRequest('/settings/password', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteAccount() {
  if (isMockMode()) {
    await sleep(600);
    return { success: true };
  }

  return apiRequest('/settings/account', {
    method: 'DELETE',
  });
}
