'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Car,
  MapPin,
  CreditCard,
  BarChart3,
  Settings,
  Truck,
} from 'lucide-react';

interface SidebarProps {
  role: 'admin' | 'driver';
}

const adminLinks = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/drivers', label: 'Drivers', icon: Car },
  { href: '/admin/vehicles', label: 'Vehicles', icon: Truck },
  { href: '/admin/rides', label: 'Rides', icon: MapPin },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/coupons', label: 'Coupons', icon: CreditCard },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { href: '/admin/security', label: 'Security Logs', icon: Settings },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

const driverLinks = [
  { href: '/driver/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/driver/ride-requests', label: 'Ride Requests', icon: MapPin },
  { href: '/driver/earnings', label: 'Earnings', icon: CreditCard },
  { href: '/driver/vehicle', label: 'Vehicle', icon: Truck },
  { href: '/driver/documents', label: 'Documents', icon: Settings },
  { href: '/driver/wallet', label: 'Wallet', icon: CreditCard },
  { href: '/driver/notifications', label: 'Notifications', icon: BarChart3 },
  { href: '/driver/profile', label: 'Profile', icon: Users },
];

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const links = role === 'admin' ? adminLinks : driverLinks;

  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-slate-900 md:block">
      <div className="px-6 py-6">
        <h2 className="text-lg font-bold text-white">{role === 'admin' ? 'Admin Panel' : 'Driver Panel'}</h2>
      </div>
      <nav className="space-y-1 px-3">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              pathname === href
                ? 'bg-amber-500 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
