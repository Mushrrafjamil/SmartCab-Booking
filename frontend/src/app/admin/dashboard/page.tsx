'use client';

import { useEffect, useState } from 'react';
import { adminService } from '@/services';
import { Users, Car, MapPin, IndianRupee } from 'lucide-react';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalUsers: 0, totalDrivers: 0, activeDrivers: 0, todayRides: 0, todayRevenue: 0, pendingApprovals: 0,
  });

  useEffect(() => {
    adminService.getStats().then(({ data }) => {
      const s = data.stats || data.data || {};
      setStats({
        totalUsers: s.totalUsers || 0,
        totalDrivers: s.totalDrivers || 0,
        activeDrivers: s.activeDrivers || 0,
        todayRides: s.totalRides || s.todayRides || 0,
        todayRevenue: s.totalRevenue || s.todayRevenue || 0,
        pendingApprovals: s.pendingDriverApprovals || s.pendingApprovals || 0,
      });
    }).catch(() => {});
  }, []);

  const cards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'bg-blue-500' },
    { label: 'Total Drivers', value: stats.totalDrivers, icon: Car, color: 'bg-green-500' },
    { label: 'Active Drivers', value: stats.activeDrivers, icon: Car, color: 'bg-amber-500' },
    { label: "Today's Rides", value: stats.todayRides, icon: MapPin, color: 'bg-purple-500' },
    { label: "Today's Revenue", value: `₹${stats.todayRevenue}`, icon: IndianRupee, color: 'bg-emerald-500' },
    { label: 'Pending Approvals', value: stats.pendingApprovals, icon: Users, color: 'bg-red-500' },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Admin Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color} text-white`}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
