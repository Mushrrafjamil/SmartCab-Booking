import axios from 'axios';
import {
  getAccessToken,
  getRefreshToken,
  setAuthStorage,
  clearAuthStorage,
  type AuthUser,
} from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

let refreshPromise: Promise<{ accessToken: string; refreshToken: string } | null> | null = null;

export const refreshAccessToken = async (): Promise<{ accessToken: string; refreshToken: string } | null> => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_URL}/auth/refresh`, { token: refreshToken })
      .then(({ data }) => {
        const storedUser = localStorage.getItem('user');
        const user = storedUser ? (JSON.parse(storedUser) as AuthUser) : null;
        if (user) {
          setAuthStorage(data.accessToken, data.refreshToken, user);
        } else {
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
        }
        return { accessToken: data.accessToken, refreshToken: data.refreshToken };
      })
      .catch(() => {
        clearAuthStorage();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!error.response) {
      error.message = 'Cannot connect to server. Make sure the backend is running on port 5000.';
      return Promise.reject(error);
    }

    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const tokens = await refreshAccessToken();
      if (tokens) {
        originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
        return api(originalRequest);
      }
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        clearAuthStorage();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
export { API_URL };
