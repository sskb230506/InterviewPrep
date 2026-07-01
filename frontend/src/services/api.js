import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050/api',
});

api.interceptors.request.use((config) => {
    // Read from the canonical key used by AuthContext
    const token = localStorage.getItem('aiprep_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 || error.response?.status === 403) {
            // Clear the correct keys so AuthContext also resets
            localStorage.removeItem('aiprep_token');
            localStorage.removeItem('aiprep_user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
