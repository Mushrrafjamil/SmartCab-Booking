'use client';

import { useEffect, useState } from 'react';
import { driverService } from '@/services';
import { Driver } from '@/types';

export default function DriverDashboardPage() {
  const [data, setData] = useState<{ driver: Driver | null; todayEarnings: number; completedToday: number; pendingRides: unknown[] }>({
    driver: null, todayEarnings: 0, completedToday: 0, pendingRides: [],
  });

  useEffect(() => {
    driverService.getDashboard().then(({ data: res }) => {
      setData({
        driver: res.driver ? { ...res.driver, isOnline: res.driver.isOnline } as Driver : null,
        todayEarnings: res.todayEarnings || 0,
        completedToday: res.completedToday || 0,
        pendingRides: res.pendingRides || [],
      });
    }).catch(() => {});
  }, []);

  const toggleOnline = async () => {
    const isOnline = data.driver?.isOnline;
    await driverService.updateStatus(isOnline ? 'offline' : 'online');
    driverService.getDashboard().then(({ data: res }) => {
      setData({
        driver: res.driver ? { ...res.driver, isOnline: !isOnline } as Driver : null,
        todayEarnings: res.todayEarnings || 0,
        completedToday: res.completedToday || 0,
        pendingRides: res.pendingRides || [],
      });
    });
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Driver Dashboard</h1>
        <button onClick={toggleOnline}
          className={`rounded-full px-6 py-2 font-semibold text-white ${data.driver?.isOnline ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}>
          {data.driver?.isOnline ? 'Go Offline' : 'Go Online'}
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Today&apos;s Earnings</p>
          <p className="text-2xl font-bold text-slate-900">₹{data.todayEarnings}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Completed Today</p>
          <p className="text-2xl font-bold text-slate-900">{data.completedToday}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Pending Rides</p>
          <p className="text-2xl font-bold text-slate-900">{data.pendingRides.length}</p>
        </div>
      </div>
    </div>
  );
}
