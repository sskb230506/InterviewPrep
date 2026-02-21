import { mockUser } from '../data/mockData';
import { apiRequest, isMockMode } from './apiClient';
import { sleep } from '../utils/helpers';

export async function login(payload) {
  if (isMockMode()) {
    await sleep(600);
    return {
      token: 'mock-jwt-token',
      user: { ...mockUser, email: payload.email },
    };
  }

  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function signup(payload) {
  if (isMockMode()) {
    await sleep(700);
    return {
      token: 'mock-jwt-token',
      user: { ...mockUser, name: payload.name, email: payload.email },
    };
  }

  return apiRequest('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function forgotPassword(payload) {
  if (isMockMode()) {
    await sleep(600);
    return { message: `Reset link sent to ${payload.email}` };
  }

  return apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchMe() {
  if (isMockMode()) {
    await sleep(300);
    return mockUser;
  }

  return apiRequest('/auth/me');
}
