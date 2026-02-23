import { mockDashboard } from '../data/mockData';
import { sleep } from '../utils/helpers';
import { apiRequest, isMockMode } from './apiClient';

export async function fetchDashboard() {
  if (isMockMode()) {
    await sleep(500);
    return mockDashboard;
  }

  return apiRequest('/dashboard');
}
