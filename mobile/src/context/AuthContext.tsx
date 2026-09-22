import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient, { setUnauthorizedHandler } from '@/services/api/client';
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
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Register unauthorized listener to handle token expiry gracefully
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setToken(null);
    });
  }, []);

  // Load session on startup
  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('mugen_mobile_token');
        const storedUser = await AsyncStorage.getItem('mugen_session');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
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
        setUser(userData);
        setToken(userToken);
        await AsyncStorage.setItem('mugen_mobile_token', userToken);
        await AsyncStorage.setItem('mugen_session', JSON.stringify(userData));
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
          setUser(userData);
          setToken(userToken);
          await AsyncStorage.setItem('mugen_mobile_token', userToken);
          await AsyncStorage.setItem('mugen_session', JSON.stringify(userData));
        }
        return { success: true };
      }
      return { success: false, error: response.data?.error || 'Đăng ký thất bại!' };
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Lỗi khi đăng ký tài khoản!';
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    try {
      setUser(null);
      setToken(null);
      await AsyncStorage.removeItem('mugen_mobile_token');
      await AsyncStorage.removeItem('mugen_session');
    } catch (e) {
      console.warn('Lỗi đăng xuất:', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, sendOtp, register, logout }}>
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
