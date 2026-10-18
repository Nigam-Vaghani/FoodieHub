import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthResponse } from '../types';
import { authApi } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (data: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    address?: string;
  }) => Promise<AuthResponse>;
  logout: () => void;
  updateUser: (updated: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('foodiehub_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('foodiehub_token');
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const verifyAuth = async () => {
      const storedToken = localStorage.getItem('foodiehub_token');
      if (storedToken) {
        try {
          const freshUser = await authApi.getMe();
          setUser(freshUser);
          localStorage.setItem('foodiehub_user', JSON.stringify(freshUser));
        } catch {
          // Token invalid or expired
          setUser(null);
          setToken(null);
          localStorage.removeItem('foodiehub_token');
          localStorage.removeItem('foodiehub_user');
        }
      }
      setIsLoading(false);
    };

    verifyAuth();

    const handleAuthChange = () => {
      setToken(localStorage.getItem('foodiehub_token'));
      const savedUser = localStorage.getItem('foodiehub_user');
      setUser(savedUser ? JSON.parse(savedUser) : null);
    };

    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    setToken(res.access_token);
    setUser(res.user);
    localStorage.setItem('foodiehub_token', res.access_token);
    localStorage.setItem('foodiehub_user', JSON.stringify(res.user));
    return res;
  };

  const register = async (data: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    address?: string;
  }) => {
    const res = await authApi.register(data);
    setToken(res.access_token);
    setUser(res.user);
    localStorage.setItem('foodiehub_token', res.access_token);
    localStorage.setItem('foodiehub_user', JSON.stringify(res.user));
    return res;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('foodiehub_token');
    localStorage.removeItem('foodiehub_user');
    window.dispatchEvent(new Event('auth-change'));
  };

  const updateUser = (updated: User) => {
    setUser(updated);
    localStorage.setItem('foodiehub_user', JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
