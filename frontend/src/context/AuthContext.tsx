'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import api from '@/services/api';
import { authService } from '@/services';
import {
  type AuthUser,
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  setAuthStorage,
  clearAuthStorage,
  updateStoredUser,
  dashboardForRole,
} from '@/lib/auth';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (accessToken: string, refreshToken: string, user: AuthUser) => void;
  logout: (allDevices?: boolean) => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
  updateUser: (user: AuthUser) => void;
  getDashboardPath: () => string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const { data } = await api.get('/auth/me');
      const nextUser = data.user as AuthUser;
      setUser(nextUser);
      updateStoredUser(nextUser);
      return nextUser;
    } catch {
      return null;
    }
  }, []);

  const bootstrap = useCallback(async () => {
    const storedUser = getStoredUser();
    const accessToken = getAccessToken();
    const refreshToken = getRefreshToken();

    if (!accessToken && !refreshToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    if (storedUser) setUser(storedUser);

    if (accessToken) {
      const me = await refreshUser();
      if (me) {
        setIsLoading(false);
        return;
      }
    }

    if (refreshToken) {
      try {
        const { data } = await authService.refresh(refreshToken);
        const baseUser = storedUser || getStoredUser();
        if (baseUser) {
          setAuthStorage(data.accessToken, data.refreshToken, baseUser);
        } else {
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
        }
        const me = await refreshUser();
        if (!me) clearAuthStorage();
        setUser(me);
      } catch {
        clearAuthStorage();
        setUser(null);
      }
    } else {
      clearAuthStorage();
      setUser(null);
    }

    setIsLoading(false);
  }, [refreshUser]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const login = useCallback((accessToken: string, refreshToken: string, nextUser: AuthUser) => {
    setAuthStorage(accessToken, refreshToken, nextUser);
    setUser(nextUser);
  }, []);

  const logout = useCallback(async (allDevices = false) => {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) await authService.logout(refreshToken, allDevices);
    } catch {
      /* proceed with local logout */
    }
    clearAuthStorage();
    setUser(null);
  }, []);

  const updateUser = useCallback((nextUser: AuthUser) => {
    updateStoredUser(nextUser);
    setUser(nextUser);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      refreshUser,
      updateUser,
      getDashboardPath: () => dashboardForRole(user?.role || 'passenger'),
    }),
    [user, isLoading, login, logout, refreshUser, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
