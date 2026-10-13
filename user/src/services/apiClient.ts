import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_URL } from '../config/env';

const BASE_API_URL = `${API_URL}/api`;
const apiClient = axios.create({
  baseURL: BASE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;
