'use client';

import { useEffect, useState } from 'react';
import { couponService } from '@/services';
import { Coupon } from '@/types';
import { Ticket } from 'lucide-react';

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  useEffect(() => {
    couponService.getCoupons().then(({ data }) => setCoupons(data.coupons || data.data || [])).catch(() => setCoupons([]));
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Coupons & Offers</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {coupons.map((c) => (
          <div key={c._id} className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-5">
            <div className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-amber-600" />
              <span className="font-mono text-lg font-bold text-amber-700">{c.code}</span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{c.description || `${c.discountValue}${c.discountType === 'percentage' ? '%' : '₹'} off`}</p>
            <p className="mt-1 text-xs text-slate-500">Expires: {new Date(c.expiryDate).toLocaleDateString()}</p>
          </div>
        ))}
        {coupons.length === 0 && <p className="col-span-2 text-center text-slate-500">No active coupons</p>}
      </div>
    </div>
  );
}
