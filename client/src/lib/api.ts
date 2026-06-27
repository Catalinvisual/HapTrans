import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://haptrans-production.up.railway.app/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hapcargo_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || '';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    const isLoginRequest = url.includes('login') || url.includes('/auth/');
    const isLoginPage = pathname.includes('login') || pathname === '/';

    if (err.response?.status === 401 && !isLoginRequest && !isLoginPage) {
      localStorage.removeItem('hapcargo_token');
      localStorage.removeItem('hapcargo_user');
      if (pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
