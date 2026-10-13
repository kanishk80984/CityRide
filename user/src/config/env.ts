import Config from 'react-native-config';

export const API_URL = (Config.API_URL || '').replace(/\/+$/, '');
export const SOCKET_URL = (Config.SOCKET_URL || '').replace(/\/+$/, '');
