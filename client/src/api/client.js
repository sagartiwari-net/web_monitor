import axios from 'axios';

// Update with production URL if needed, or use env variable
export const API_URL = import.meta.env.VITE_API_URL || 'https://api.webelearners.in';

const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('wm_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('wm_token');
      localStorage.removeItem('wm_user');
      // Dispatch custom event to let AuthContext know
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(error.response?.data || error);
  }
);

export default apiClient;
