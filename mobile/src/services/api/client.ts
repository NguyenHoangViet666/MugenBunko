import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearAuthToken, getAuthToken } from '../storage/authToken';

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

const configuredHost = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '').replace(/\/api$/, '');
export const SERVER_HOST = configuredHost || (__DEV__ ? getDevHost() : '');
if (!SERVER_HOST) throw new Error('Cần cấu hình EXPO_PUBLIC_API_URL trước khi build production.');
const apiOrigin = new URL(SERVER_HOST);
const loopback = (host: string) => host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
const localWebPreview = Platform.OS === 'web' && loopback(apiOrigin.hostname) &&
  (typeof window === 'undefined' || loopback(window.location.hostname));
if (!__DEV__ && apiOrigin.protocol !== 'https:' && !localWebPreview) throw new Error('API production phải sử dụng HTTPS.');

export const API_URL = `${SERVER_HOST}/api`;

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  withCredentials: Platform.OS === 'web',
  headers: {
    'Content-Type': 'application/json',
    'X-Mugen-Client': Platform.OS === 'web' ? 'web' : 'native',
  },
});

// Interceptor gắn Token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await getAuthToken();
      if (token && !config.headers.Authorization) {
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

export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  unauthorizedHandler = handler;
};

// Interceptor xử lý lỗi
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 || error.response?.data?.code === 'ACCOUNT_SUSPENDED') {
      const isAuthRoute = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register') || error.config?.url?.includes('/auth/send-otp');
      const currentToken = await getAuthToken();
      const rejectedToken = error.config?.headers?.Authorization;
      if (!isAuthRoute && ((currentToken && rejectedToken === `Bearer ${currentToken}`) || (Platform.OS === 'web' && !rejectedToken))) {
        try {
          await clearAuthToken();
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
