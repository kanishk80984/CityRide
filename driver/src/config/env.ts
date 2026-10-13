import Config from 'react-native-config';

export const API_URL = (Config.API_URL || '').replace(/\/+$/, '');
export const SOCKET_URL = (Config.SOCKET_URL || '').replace(/\/+$/, '');

if (!API_URL) {
  console.warn('[ENV] API_URL is missing');
}

if (!SOCKET_URL) {
  console.warn('[ENV] SOCKET_URL is missing');
}
