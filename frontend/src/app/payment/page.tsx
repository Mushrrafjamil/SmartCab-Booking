'use client';

import { useCallback, useEffect, useState } from 'react';
import { paymentService } from '@/services';
import { toast } from '@/components/auth/Toast';
import { Payment } from '@/types';
import { CreditCard, Download, Mail, RefreshCw, RotateCcw, Loader2, FileText } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-slate-100 text-slate-700',
  refund_pending: 'bg-purple-100 text-purple-700',
};

export default function PaymentPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const { data } = await paymentService.getPayments(params);
      setPayments(data.payments || []);
    } catch {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const retry = async (id: string) => {
    setActing(id);
    try {
      await paymentService.retryPayment(id);
      toast.success('Payment retried');
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Retry failed';
      toast.error(msg);
    } finally { setActing(null); }
  };

  const refund = async (id: string) => {
    const reason = prompt('Refund reason (optional):') || '';
    setActing(id);
    try {
      await paymentService.requestRefund(id, reason);
      toast.success('Refund requested');
      load();
    } catch {
      toast.error('Refund request failed');
    } finally { setActing(null); }
  };

  const downloadInvoice = async (rideId: string) => {
    try {
      const { data } = await paymentService.getInvoice(rideId, 'html');
      const blob = new Blob([data as string], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch {
      toast.error('Invoice download failed');
    }
  };

  const emailInvoice = async (rideId: string) => {
    try {
      const { data } = await paymentService.emailInvoice(rideId);
      toast.success(data.message || 'Invoice sent');
    } catch {
      toast.error('Failed to email invoice');
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Payments & Invoices</h1>
        <button onClick={load} className="inline-flex items-center gap-1 text-sm text-amber-600 hover:underline">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {['all', 'pending', 'paid', 'failed', 'refunded', 'refund_pending'].map((f) => (
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
          {payments.map((p) => {
            const rideId = typeof p.rideId === 'object' ? p.rideId?._id : p.rideId;
            return (
              <div key={p._id} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-amber-500" />
                      <span className="font-semibold text-slate-900">₹{p.amount}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${STATUS_COLORS[p.status] || 'bg-slate-100'}`}>
                        {p.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {typeof p.rideId === 'object' ? p.rideId?.rideId : 'Ride'} · {p.method} · {p.paymentId}
                    </p>
                    <p className="text-xs text-slate-400">
                      Txn: {p.transactionId} · {p.paidAt ? new Date(p.paidAt).toLocaleString() : new Date(p.createdAt || '').toLocaleString()}
                    </p>
                    {(p.taxAmount || p.discountAmount) ? (
                      <p className="mt-1 text-xs text-slate-500">
                        GST: ₹{p.taxAmount || 0} · Discount: ₹{p.discountAmount || 0}
                        {p.couponCode ? ` (${p.couponCode})` : ''}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {rideId && p.status === 'paid' && (
                      <>
                        <button onClick={() => downloadInvoice(rideId)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs hover:bg-slate-50">
                          <Download className="h-3 w-3" /> Invoice
                        </button>
                        <button onClick={() => emailInvoice(rideId)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs hover:bg-slate-50">
                          <Mail className="h-3 w-3" /> Email
                        </button>
                      </>
                    )}
                    {p.status === 'failed' && (
                      <button disabled={acting === p._id} onClick={() => retry(p._id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs text-white hover:bg-amber-600 disabled:opacity-50">
                        <RotateCcw className="h-3 w-3" /> Retry
                      </button>
                    )}
                    {p.status === 'paid' && (
                      <button disabled={acting === p._id} onClick={() => refund(p._id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50">
                        Refund
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {payments.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center">
              <FileText className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-slate-500">No payments found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
