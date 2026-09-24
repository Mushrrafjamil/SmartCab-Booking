'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Car, Menu, X, User, LogOut, LayoutDashboard } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { dashboardForRole } from '@/lib/auth';
import { toast } from '@/components/auth/Toast';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname.startsWith('/register/');

  if (isAuthPage) return null;

  const passengerLinks = [
    { href: '/', label: 'Home' },
    { href: '/book-ride', label: 'Book Ride' },
    { href: '/addresses', label: 'Addresses' },
    { href: '/ride-history', label: 'History' },
    { href: '/wallet', label: 'Wallet' },
    { href: '/payment', label: 'Payments' },
    { href: '/notifications', label: 'Notifications' },
    { href: '/help', label: 'Help' },
  ];

  const handleLogout = async () => {
    await logout(false);
    toast.success('Logged out successfully');
    router.push('/login');
  };

  const dashboardHref = user ? dashboardForRole(user.role) : '/dashboard';

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <Car className="h-7 w-7 text-amber-500" />
          CabBook
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          {(!isAuthenticated || user?.role === 'passenger') &&
            passengerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition ${
                  pathname === link.href ? 'text-amber-600' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {link.label}
              </Link>
            ))}

          {!isLoading && isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <Link
                href={dashboardHref}
                className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <Link
                href={user.role === 'driver' ? '/driver/profile' : '/profile'}
                className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                <User className="h-4 w-4" />
                Profile
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          ) : (
            !isLoading && (
              <Link href="/login" className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600">
                Login
              </Link>
            )
          )}
        </div>

        <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200 px-4 py-4 md:hidden">
          {(!isAuthenticated || user?.role === 'passenger') &&
            passengerLinks.map((link) => (
              <Link key={link.href} href={link.href} className="block py-2 text-slate-700" onClick={() => setMobileOpen(false)}>
                {link.label}
              </Link>
            ))}
          {isAuthenticated && user ? (
            <>
              <Link href={dashboardHref} className="block py-2 text-slate-700" onClick={() => setMobileOpen(false)}>Dashboard</Link>
              <Link href={user.role === 'driver' ? '/driver/profile' : '/profile'} className="block py-2 text-slate-700" onClick={() => setMobileOpen(false)}>Profile</Link>
              <button onClick={() => { setMobileOpen(false); handleLogout(); }} className="mt-2 block w-full rounded-lg border border-slate-200 px-4 py-2 text-left text-slate-700">
                Logout
              </button>
            </>
          ) : (
            <Link href="/login" className="mt-2 block rounded-lg bg-amber-500 px-4 py-2 text-center text-white" onClick={() => setMobileOpen(false)}>
              Login
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
