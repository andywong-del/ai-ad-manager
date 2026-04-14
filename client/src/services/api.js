import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 120000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fb_long_lived_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-sync demo token on auth errors (expired token)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.error || '';
    if (typeof msg === 'string' && (msg.includes('Session has expired') || msg.includes('access token'))) {
      window.dispatchEvent(new Event('fb_token_error'));
    }
    return Promise.reject(err);
  }
);

export default api;
