import { API_URL } from './env';

export const getApiUrl = (path: string) => {
  if (!path) return '';

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${API_URL}/${path.replace(/^\/+/, '')}`;
};
