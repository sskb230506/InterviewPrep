const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050/api';
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

export function isMockMode() {
  return USE_MOCK;
}

export function getAuthToken() {
  // Only read from the canonical key that AuthContext writes to.
  // Do NOT fall back to 'token' — that's a legacy key that no longer exists
  // and reading it would send a stale/invalid token causing 401 loops.
  return localStorage.getItem('aiprep_token');
}

export async function apiRequest(path, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null);
    const message = errorPayload?.message || `Request failed: ${response.status}`;
    // NOTE: Do NOT redirect or clear localStorage here.
    // AuthContext.bootstrap() already handles 401 from /auth/me by clearing
    // state and setting isAuthenticated=false → ProtectedRoute redirects to /login.
    // DashboardPage also handles it via its own catch block.
    // A window.location.href here would bypass React Router and cause reload loops.
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function uploadBinary(uploadUrl, file, options = {}) {
  const response = await fetch(uploadUrl, {
    method: options.method || 'PUT',
    headers: options.headers,
    body: file,
  });

  if (!response.ok) {
    throw new Error(options.errorMessage || 'Direct upload failed');
  }

  return response;
}
