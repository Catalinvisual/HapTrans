import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://haptrans-production.up.railway.app/api',
  withCredentials: true, // Necessary for HttpOnly cookies (Refresh Token)
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hapcargo_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Avoid infinite refresh loops
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;
    const url = originalRequest?.url || '';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    const isLoginRequest = url.includes('login') || url.includes('/auth/refresh');
    const isLoginPage = pathname.includes('login') || pathname === '/';

    if (err.response?.status === 401 && !originalRequest._retry && !isLoginRequest && !isLoginPage) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Try to refresh token
        const { data } = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = data.access_token;
        localStorage.setItem('hapcargo_token', newAccessToken);
        if (data.user) {
          localStorage.setItem('hapcargo_user', JSON.stringify(data.user));
        }

        api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Refresh token failed or expired
        localStorage.removeItem('hapcargo_token');
        localStorage.removeItem('hapcargo_user');
        if (pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // If 401 and it's already a retry or login page, just redirect to login
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
