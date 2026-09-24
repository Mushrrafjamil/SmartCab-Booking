'use client';

import { useCallback, useEffect, useState } from 'react';
import { paymentService } from '@/services';
import { toast } from '@/components/auth/Toast';
import { Payment } from '@/types';
import { Loader2 } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-slate-100 text-slate-700',
  refund_pending: 'bg-purple-100 text-purple-700',
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<{ _id: string; count: number; total: number }[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const { data } = await paymentService.getAllPaymentsAdmin(params);
      setPayments(data.payments || []);
      setSummary(data.summary || []);
    } catch {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleRefund = async (id: string, action: 'approve' | 'reject') => {
    try {
      await paymentService.processRefundAdmin(id, action);
      toast.success(`Refund ${action}d`);
      load();
    } catch {
      toast.error('Action failed');
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Payment Management</h1>

      {summary.length > 0 && (
        <div className="mb-6 grid gap-3 sm:grid-cols-4">
          {summary.map((s) => (
            <div key={s._id} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs capitalize text-slate-500">{s._id?.replace('_', ' ')}</p>
              <p className="text-lg font-bold">{s.count}</p>
              <p className="text-sm text-green-600">₹{Math.round(s.total || 0)}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mb-4 flex gap-2">
        {['all', 'pending', 'paid', 'failed', 'refund_pending', 'refunded'].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-sm capitalize ${filter === f ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => (
            <div key={p._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <div>
                <p className="font-medium">₹{p.amount} · <span className="capitalize">{p.method}</span></p>
                <p className="text-sm text-slate-500">{p.paymentId} · {p.transactionId}</p>
                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs capitalize ${STATUS_COLORS[p.status] || ''}`}>
                  {p.status.replace('_', ' ')}
                </span>
              </div>
              {p.status === 'refund_pending' && (
                <div className="flex gap-2">
                  <button onClick={() => handleRefund(p._id, 'approve')}
                    className="rounded-lg bg-green-500 px-3 py-1.5 text-sm text-white">Approve Refund</button>
                  <button onClick={() => handleRefund(p._id, 'reject')}
                    className="rounded-lg bg-red-500 px-3 py-1.5 text-sm text-white">Reject</button>
                </div>
              )}
            </div>
          ))}
          {payments.length === 0 && <p className="text-center text-slate-500">No payments found</p>}
        </div>
      )}
    </div>
  );
}
