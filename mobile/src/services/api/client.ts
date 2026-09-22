import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Constants from 'expo-constants';

const getDevHost = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:5000';
  }
  
  // Lấy IP của máy chủ từ Expo Metro bundler khi test trên điện thoại thật
  const hostUri = Constants.expoConfig?.hostUri 
    || (Constants as any).manifest2?.extra?.expoGo?.debuggerHost 
    || (Constants as any).manifest?.debuggerHost;

  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:5000`;
  }
  
  // Fallback cho Android Emulator
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000';
  }
  
  return 'http://localhost:5000';
};

export const SERVER_HOST = __DEV__
  ? getDevHost()
  : 'https://mugenbunko.example.com';

export const API_URL = `${SERVER_HOST}/api`;

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor gắn Token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('mugen_mobile_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('Error reading token from AsyncStorage', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let unauthorizedHandler: (() => void) | null = null;

export const setUnauthorizedHandler = (handler: () => void) => {
  unauthorizedHandler = handler;
};

// Interceptor xử lý lỗi
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const isAuthRoute = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register') || error.config?.url?.includes('/auth/send-otp');
      if (!isAuthRoute) {
        try {
          await AsyncStorage.removeItem('mugen_mobile_token');
          await AsyncStorage.removeItem('mugen_session');
        } catch (e) {
          console.warn('Error clearing expired mobile auth storage:', e);
        }
        if (unauthorizedHandler) {
          unauthorizedHandler();
        }
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Xử lý link ảnh bìa: nếu ảnh là relative path, nối thêm host backend
 */
export const resolveCoverUrl = (coverUrl?: string | null): string => {
  if (!coverUrl) return 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80';
  if (coverUrl.startsWith('http://') || coverUrl.startsWith('https://') || coverUrl.startsWith('data:')) {
    return coverUrl;
  }
  // Loại bỏ dấu / đầu nếu có
  const cleanPath = coverUrl.startsWith('/') ? coverUrl.slice(1) : coverUrl;
  return `${SERVER_HOST}/${cleanPath}`;
};

export default apiClient;
