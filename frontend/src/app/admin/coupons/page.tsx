'use client';

import { useEffect, useState } from 'react';
import { couponService } from '@/services';
import { toast } from '@/components/auth/Toast';
import { Plus, Trash2, Loader2 } from 'lucide-react';

interface Coupon {
  _id: string;
  code: string;
  discountPercentage: number;
  maxDiscount: number;
  minRideValue: number;
  expiryDate: string;
  isActive: boolean;
}

const emptyForm = {
  code: '', discountPercentage: '10', maxDiscount: '100', minRideValue: '0', expiryDate: '',
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    couponService.getAllCoupons()
      .then(({ data }) => setCoupons(data.coupons || []))
      .catch(() => toast.error('Failed to load coupons'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await couponService.createCoupon({
        code: form.code,
        discountPercentage: Number(form.discountPercentage),
        maxDiscount: Number(form.maxDiscount),
        minRideValue: Number(form.minRideValue),
        expiryDate: form.expiryDate,
      });
      toast.success('Coupon created');
      setShowForm(false);
      setForm(emptyForm);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed';
      toast.error(msg);
    }
  };

  const deactivate = async (id: string) => {
    await couponService.deleteCoupon(id);
    toast.success('Coupon deactivated');
    load();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Coupon Management</h1>
        <button onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600">
          <Plus className="h-4 w-4" /> Create Coupon
        </button>
      </div>

      {showForm && (
        <form onSubmit={create} className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-3">
          {(['code', 'discountPercentage', 'maxDiscount', 'minRideValue', 'expiryDate'] as const).map((f) => (
            <div key={f}>
              <label className="block text-xs font-medium capitalize text-slate-600">{f.replace(/([A-Z])/g, ' $1')}</label>
              <input required={f !== 'minRideValue'} type={f === 'expiryDate' ? 'date' : f.includes('Percentage') || f.includes('Discount') || f.includes('Value') ? 'number' : 'text'}
                value={form[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
          ))}
          <div className="flex items-end gap-2 sm:col-span-3">
            <button type="submit" className="rounded-lg bg-green-500 px-4 py-2 text-sm text-white">Save</button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
      ) : (
        <div className="space-y-3">
          {coupons.map((c) => (
            <div key={c._id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
              <div>
                <p className="font-mono font-bold text-amber-700">{c.code}</p>
                <p className="text-sm text-slate-500">{c.discountPercentage}% off · Max ₹{c.maxDiscount} · Min ride ₹{c.minRideValue}</p>
                <p className="text-xs text-slate-400">Expires {new Date(c.expiryDate).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {c.isActive ? 'Active' : 'Inactive'}
                </span>
                {c.isActive && (
                  <button onClick={() => deactivate(c._id)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                )}
              </div>
            </div>
          ))}
          {coupons.length === 0 && <p className="text-center text-slate-500">No coupons</p>}
        </div>
      )}
    </div>
  );
}
