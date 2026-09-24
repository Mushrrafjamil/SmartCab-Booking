'use client';

import { useEffect, useState } from 'react';
import { driverService } from '@/services';
import { Loader2 } from 'lucide-react';

type Period = 'daily' | 'weekly' | 'monthly' | 'total';

interface EarningsData {
  total: number;
  daily: number;
  weekly: number;
  monthly: number;
  tripsCompleted: number;
}

const empty: EarningsData = { total: 0, daily: 0, weekly: 0, monthly: 0, tripsCompleted: 0 };

export default function DriverEarningsPage() {
  const [period, setPeriod] = useState<Period>('daily');
  const [data, setData] = useState<EarningsData>(empty);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    driverService.getEarnings(period)
      .then(({ data: res }) => {
        const earnings = res.earnings || {};
        setData({
          total: earnings.total ?? 0,
          daily: earnings.daily ?? 0,
          weekly: earnings.weekly ?? 0,
          monthly: earnings.monthly ?? 0,
          tripsCompleted: res.tripsCompleted ?? 0,
        });
      })
      .catch(() => setData(empty))
      .finally(() => setLoading(false));
  }, [period]);

  const periodAmount = period === 'total' ? data.total : data[period];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Earnings</h1>
      <div className="mb-6 flex flex-wrap gap-2">
        {(['daily', 'weekly', 'monthly', 'total'] as Period[]).map((p) => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize ${period === p ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {p}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:col-span-2">
          <p className="text-sm capitalize text-slate-500">{period} Earnings</p>
          <p className="text-3xl font-bold text-green-600">₹{periodAmount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">All-time Earnings</p>
          <p className="text-2xl font-bold text-slate-900">₹{data.total}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">Completed Rides</p>
          <p className="text-2xl font-bold text-slate-900">{data.tripsCompleted}</p>
        </div>
      </div>
    </div>
  );
}
