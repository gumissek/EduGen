import axios from 'axios';

const AUTH_COOKIE = 'edugen-auth';

/** Read the JWT token from the auth cookie (client-side only). */
function getTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${AUTH_COOKIE}=`));
  if (!match) return null;
  try {
    return decodeURIComponent(match.split('=').slice(1).join('=')) || null;
  } catch {
    return null;
  }
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = getTokenFromCookie();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        // Clear the auth cookie so middleware redirects to login
        document.cookie = `${AUTH_COOKIE}=; path=/; SameSite=Lax; max-age=0`;
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
