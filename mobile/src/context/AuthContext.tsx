import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearAuthToken, getAuthToken, setAuthToken } from '@/services/storage/authToken';
import apiClient, { setUnauthorizedHandler } from '@/services/api/client';
import { AppState, Platform } from 'react-native';
import { initializeSocket, disconnectSocket } from '@/services/socket/socketClient';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  sendOtp: (email: string) => Promise<{ success: boolean; message?: string; error?: string; devOtp?: string }>;
  register: (
    username: string,
    displayname: string,
    password: string,
    email: string,
    otp: string
  ) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (displayname: string, bio: string) => Promise<void>;
  refreshUser: () => Promise<User | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const activeUser = useRef(user);
  activeUser.current = user;
  const refreshUser = useCallback(async () => {
    const id = activeUser.current?.id;
    if (!id) return null;
    const { data } = await apiClient.get<{ user: User }>(`/auth/refresh/${id}`);
    if (activeUser.current?.id !== id) return null;
    await AsyncStorage.setItem('mugen_session', JSON.stringify(data.user));
    if (activeUser.current?.id !== id) return null;
    setUser(data.user); return data.user;
  }, []);
  useEffect(() => {
    if (!token) return;
    initializeSocket(token);
    void refreshUser().catch(() => {});
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void refreshUser().catch(() => {}); });
    return () => { subscription.remove(); disconnectSocket(); };
  }, [token, refreshUser]);

  // Register unauthorized listener to handle token expiry gracefully
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setToken(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  // Load session on startup
  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        const storedToken = await getAuthToken();
        const storedUser = await AsyncStorage.getItem('mugen_session');

        if (storedUser && (storedToken || Platform.OS === 'web')) {
          let restored = JSON.parse(storedUser);
          if (Platform.OS === 'web' && storedToken) {
            restored = (await apiClient.get(`/auth/refresh/${restored.id}`)).data.user;
            await clearAuthToken();
          }
          setToken(Platform.OS === 'web' ? 'cookie' : storedToken);
          setUser(restored);
        }
      } catch (e) {
        console.warn('Lỗi đọc session từ AsyncStorage:', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredAuth();
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await apiClient.post('/auth/login', { username, password });
      const { user: userData, token: userToken } = response.data;

      if (userData && userToken) {
        await setAuthToken(userToken);
        await AsyncStorage.setItem('mugen_session', JSON.stringify(userData));
        setUser(userData);
        setToken(Platform.OS === 'web' ? 'cookie' : userToken);
        return { success: true };
      }
      return { success: false, error: 'Dữ liệu đăng nhập không hợp lệ!' };
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Sai tên đăng nhập hoặc mật khẩu!';
      return { success: false, error: msg };
    }
  };

  const sendOtp = async (email: string): Promise<{ success: boolean; message?: string; error?: string; devOtp?: string }> => {
    try {
      const response = await apiClient.post('/auth/send-otp', { email });
      return {
        success: true,
        message: response.data?.message || 'Mã OTP đã được gửi!',
        devOtp: response.data?.devOtp,
      };
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Không thể gửi mã OTP!';
      return { success: false, error: msg };
    }
  };

  const register = async (
    username: string,
    displayname: string,
    password: string,
    email: string,
    otp: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await apiClient.post('/auth/register', {
        username,
        displayname,
        password,
        email,
        otp,
        role: 'reader',
      });

      if (response.data?.success) {
        const { user: userData, token: userToken } = response.data;
        if (userData && userToken) {
          await setAuthToken(userToken);
          await AsyncStorage.setItem('mugen_session', JSON.stringify(userData));
          setUser(userData);
          setToken(Platform.OS === 'web' ? 'cookie' : userToken);
        }
        return { success: true };
      }
      return { success: false, error: response.data?.error || 'Đăng ký thất bại!' };
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Lỗi khi đăng ký tài khoản!';
      return { success: false, error: msg };
    }
  };

  const updateProfile = async (displayname: string, bio: string) => {
    const { data } = await apiClient.post('/auth/update-profile', { displayname, bio, avatarSeed: user?.avatarSeed || '' });
    await AsyncStorage.setItem('mugen_session', JSON.stringify(data.user));
    setUser(data.user);
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error: any) {
      if (error.response?.status !== 401 && error.response?.data?.code !== 'ACCOUNT_SUSPENDED') {
        throw error;
      }
    }
    try {
      setUser(null);
      setToken(null);
      await clearAuthToken();
      await AsyncStorage.removeItem('mugen_session');
    } catch (e) {
      console.warn('Lỗi đăng xuất:', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, sendOtp, register, logout, updateProfile, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
