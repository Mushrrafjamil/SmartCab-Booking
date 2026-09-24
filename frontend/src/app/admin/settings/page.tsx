'use client';

import { useEffect, useState } from 'react';
import { notificationService } from '@/services';
import { toast } from '@/components/auth/Toast';

export default function AdminSettingsPage() {
  const [promo, setPromo] = useState({ title: '', message: '', target: 'all' });
  const [sending, setSending] = useState(false);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Admin Settings</h1>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-semibold">System Configuration</h2>
        <div className="grid gap-4 sm:grid-cols-2 text-sm text-slate-600">
          <p><strong>Assignment Timeout:</strong> 30 seconds</p>
          <p><strong>Max Assignment Attempts:</strong> 5</p>
          <p><strong>Driver Commission:</strong> 85%</p>
          <p><strong>Platform Fee:</strong> 15%</p>
          <p><strong>GST Rate:</strong> 5%</p>
          <p><strong>Search Radius:</strong> 15 km</p>
        </div>
        <p className="mt-4 text-xs text-slate-400">Configure via environment variables for production deployment.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-semibold">Send Promotional Notification</h2>
        <div className="space-y-3">
          <input value={promo.title} onChange={(e) => setPromo({ ...promo, title: e.target.value })}
            placeholder="Title" className="w-full rounded-lg border border-slate-300 px-4 py-2" />
          <textarea value={promo.message} onChange={(e) => setPromo({ ...promo, message: e.target.value })}
            placeholder="Message" rows={3} className="w-full rounded-lg border border-slate-300 px-4 py-2" />
          <select value={promo.target} onChange={(e) => setPromo({ ...promo, target: e.target.value })}
            className="rounded-lg border border-slate-300 px-4 py-2">
            <option value="all">All Users</option>
            <option value="passengers">Passengers</option>
            <option value="drivers">Drivers</option>
          </select>
          <button disabled={sending} onClick={async () => {
            setSending(true);
            try {
              const { data } = await notificationService.sendPromotional(promo);
              toast.success(data.message || 'Sent');
            } catch { toast.error('Failed to send'); }
            finally { setSending(false); }
          }} className="rounded-lg bg-amber-500 px-6 py-2 text-white hover:bg-amber-600 disabled:opacity-50">
            {sending ? 'Sending…' : 'Send Notification'}
          </button>
        </div>
      </div>
    </div>
  );
}
