'use client';

import { useCallback, useEffect, useState } from 'react';
import { reportService } from '@/services';
import { toast } from '@/components/auth/Toast';
import { Download, Loader2 } from 'lucide-react';

type ReportType = 'users' | 'drivers' | 'rides' | 'revenue' | 'payments' | 'vehicles' | 'coupons' | 'refunds';

const TABS: { id: ReportType; label: string }[] = [
  { id: 'users', label: 'Users' },
  { id: 'drivers', label: 'Drivers' },
  { id: 'rides', label: 'Rides' },
  { id: 'revenue', label: 'Revenue' },
  { id: 'payments', label: 'Payments' },
  { id: 'vehicles', label: 'Vehicles' },
  { id: 'coupons', label: 'Coupons' },
  { id: 'refunds', label: 'Refunds' },
];

export default function AdminReportsPage() {
  const [tab, setTab] = useState<ReportType>('revenue');
  const [report, setReport] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (from) params.from = from;
      if (to) params.to = to;

      const fetchers: Record<ReportType, () => Promise<{ data: { report: Record<string, unknown> } }>> = {
        users: () => reportService.getUserReport(params),
        drivers: () => reportService.getDriverReport(params),
        rides: () => reportService.getRideReport(params),
        revenue: () => reportService.getRevenueReport(params),
        payments: () => reportService.getPaymentReport(params),
        vehicles: () => reportService.getVehicleReport(params),
        coupons: () => reportService.getCouponReport(params),
        refunds: () => reportService.getRefundReport(params),
      };

      const { data } = await fetchers[tab]();
      setReport(data.report || {});
    } catch {
      toast.error('Failed to load report');
      setReport({});
    } finally {
      setLoading(false);
    }
  }, [tab, from, to]);

  useEffect(() => { load(); }, [load]);

  const exportCsv = async () => {
    try {
      const params: Record<string, string> = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const { data } = await reportService.exportReport(tab, params);
      const url = URL.createObjectURL(data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tab}-report.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Export failed');
    }
  };

  const renderValue = (value: unknown): string => {
    if (value === null || value === undefined) return '—';
    if (Array.isArray(value)) return `${value.length} items`;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const entries = Object.entries(report).filter(([, v]) => !Array.isArray(v) && typeof v !== 'object');

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
        <button onClick={exportCsv}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === t.id ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex gap-3">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {entries.map(([key, value]) => (
              <div key={key} className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-sm capitalize text-slate-500">{key.replace(/([A-Z])/g, ' $1')}</p>
                <p className="text-2xl font-bold text-slate-900">
                  {typeof value === 'number' && key.toLowerCase().includes('revenue') ? `₹${value}` :
                    typeof value === 'number' && key.toLowerCase().includes('earning') ? `₹${value}` :
                    renderValue(value)}
                </p>
              </div>
            ))}
          </div>

          {Array.isArray(report.driverPerformance) && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="mb-3 font-semibold">Top Drivers</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left text-slate-500">
                    <th className="pb-2">Name</th><th>Rating</th><th>Rides</th><th>Earnings</th><th>Status</th>
                  </tr></thead>
                  <tbody>
                    {(report.driverPerformance as { name: string; rating: number; rides: number; earnings: number; status: string }[]).map((d, i) => (
                      <tr key={i} className="border-b border-slate-50">
                        <td className="py-2">{d.name}</td>
                        <td>{d.rating?.toFixed(1)}</td>
                        <td>{d.rides}</td>
                        <td>₹{d.earnings}</td>
                        <td className="capitalize">{d.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {Array.isArray(report.paymentMethods) && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="mb-3 font-semibold">Payment Methods</h3>
              <div className="grid gap-2 sm:grid-cols-3">
                {(report.paymentMethods as { _id: string; count: number; total: number }[]).map((m) => (
                  <div key={m._id} className="rounded-lg bg-slate-50 p-3">
                    <p className="font-medium capitalize">{m._id}</p>
                    <p className="text-sm text-slate-500">{m.count} payments · ₹{Math.round(m.total)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
