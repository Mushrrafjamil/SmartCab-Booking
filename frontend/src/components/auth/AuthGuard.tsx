'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { GUEST_ONLY_ROUTES, isPublicRoute, dashboardForRole } from '@/lib/auth';

const PASSENGER_ONLY = ['/dashboard', '/book-ride', '/addresses', '/ride-history', '/coupons', '/payment'];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated && user && GUEST_ONLY_ROUTES.includes(pathname)) {
      router.replace(dashboardForRole(user.role));
      return;
    }

    if (!isAuthenticated && !isPublicRoute(pathname)) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (isAuthenticated && user) {
      if (pathname.startsWith('/admin') && !['admin', 'super_admin'].includes(user.role)) {
        router.replace(dashboardForRole(user.role));
        return;
      }
      if (pathname.startsWith('/driver') && user.role !== 'driver') {
        router.replace(dashboardForRole(user.role));
        return;
      }
      if (user.role !== 'passenger' && PASSENGER_ONLY.some((r) => pathname === r || pathname.startsWith(`${r}/`))) {
        router.replace(dashboardForRole(user.role));
      }
    }
  }, [isLoading, isAuthenticated, user, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated && !isPublicRoute(pathname)) return null;
  if (isAuthenticated && GUEST_ONLY_ROUTES.includes(pathname)) return null;

  return <>{children}</>;
}
