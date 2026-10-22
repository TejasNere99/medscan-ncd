import axios from 'axios';

export function normalizeApiUrl(raw) {
  if (!raw || typeof raw !== 'string') {
    return 'http://localhost:5000/api';
  }
  // Strip outer quotes, literal bracket placeholders (< >), and leading/trailing whitespace
  let cleaned = raw.trim().replace(/^['"]+|['"]+$/g, '').replace(/[<>]/g, '').trim();
  if (!cleaned) {
    return 'http://localhost:5000/api';
  }

  // Prepend https:// if protocol is missing and not a relative path
  if (!/^https?:\/\//i.test(cleaned) && !cleaned.startsWith('/')) {
    cleaned = `https://${cleaned}`;
  }

  // Normalize trailing slash and ensure /api endpoint
  cleaned = cleaned.replace(/\/+$/, '');
  return cleaned.endsWith('/api') ? cleaned : `${cleaned}/api`;
}

const API_URL = normalizeApiUrl(import.meta.env.VITE_API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request Interceptor: Attach JWT Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Catch 401 Unauthorized & sanitize network errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if unauthenticated
      if (!window.location.pathname.startsWith('/login')) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
      }
    }

    // Sanitize browser URL construction errors or unreachable backend
    let message = error.response?.data?.message || error.message || 'Network Error';
    if (typeof message === 'string' && message.includes('Failed to construct') && message.includes('URL')) {
      message = 'Invalid API URL configuration. Please verify VITE_API_URL in your hosting settings.';
    }

    return Promise.reject(error.response?.data || { message });
  }
);

export default api;

