'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  username: string;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  role: string;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    email: string;
    username: string;
    password: string;
    fullName: string;
    phone?: string;
  }) => Promise<void>;
  updateProfile: (profileData: {
    username?: string;
    fullName?: string;
    phone?: string;
    avatarUrl?: string;
  }) => Promise<void>;
  changePassword: (passwordData: {
    currentPassword: string;
    newPassword: string;
  }) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response: any = await api.getProfile();
      setUser(response.data.user);
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response: any = await api.login({ email, password });
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData: {
    email: string;
    username: string;
    password: string;
    fullName: string;
    phone?: string;
  }) => {
    try {
      const response: any = await api.register(userData);
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
    } catch (error) {
      throw error;
    }
  };

  const updateProfile = async (profileData: {
    username?: string;
    fullName?: string;
    phone?: string;
    avatarUrl?: string;
  }) => {
    try {
      const response: any = await api.updateProfile(profileData);
      setUser(response.data.user);
    } catch (error) {
      throw error;
    }
  };

  const changePassword = async (passwordData: {
    currentPassword: string;
    newPassword: string;
  }) => {
    try {
      await api.changePassword(passwordData);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        updateProfile,
        changePassword,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
