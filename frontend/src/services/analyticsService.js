import { mockAnalytics } from '../data/mockData';
import { sleep } from '../utils/helpers';
import { apiRequest, isMockMode } from './apiClient';

export async function fetchAnalytics() {
  if (isMockMode()) {
    await sleep(600);
    return mockAnalytics;
  }

  return apiRequest('/analytics');
}
