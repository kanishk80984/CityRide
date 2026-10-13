import axios from 'axios';

const rawUrl = import.meta.env.VITE_API_URL || '/api';
const API_BASE_URL = rawUrl.endsWith('/') && rawUrl !== '/' ? rawUrl.slice(0, -1) : rawUrl;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

export const getApiUrl = () => API_BASE_URL;
export const getSocketUrl = () => '';
export const getUploadsUrl = () => '/uploads';

export const resolveImageUrl = (url) => {
  if (!url) return '';
  const match = url.match(/\/uploads\/(.*)/);
  if (match) {
    return `/uploads/${match[1]}`;
  }
  return url;
};

export default apiClient;
