const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';
const USER_KEY = 'user';

export interface AuthUser {
  id: string;
  userId?: string;
  name: string;
  email: string;
  phone: string;
  role: 'passenger' | 'driver' | 'admin' | 'super_admin';
  profilePhoto?: string;
  walletBalance?: number;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  referralCode?: string;
  driverStatus?: string | null;
}

export const getAccessToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem(ACCESS_KEY) : null;

export const getRefreshToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem(REFRESH_KEY) : null;

export const getStoredUser = (): AuthUser | null => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
};

export const setAuthStorage = (accessToken: string, refreshToken: string, user: AuthUser) => {
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const updateStoredUser = (user: AuthUser) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearAuthStorage = () => {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
};

export const dashboardForRole = (role: string) => {
  if (role === 'admin' || role === 'super_admin') return '/admin/dashboard';
  if (role === 'driver') return '/driver/dashboard';
  return '/dashboard';
};

export const PUBLIC_ROUTES = ['/', '/login', '/register', '/verify-otp', '/forgot-password', '/help', '/terms'];
export const GUEST_ONLY_ROUTES = ['/login', '/register', '/forgot-password'];

export const isPublicRoute = (pathname: string) =>
  PUBLIC_ROUTES.includes(pathname) || pathname.startsWith('/register');
