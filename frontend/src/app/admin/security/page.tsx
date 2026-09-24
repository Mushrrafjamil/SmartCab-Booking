'use client';

import { useEffect, useState } from 'react';
import api from '@/services/api';

export default function AdminSecurityPage() {
  const [securityLogs, setSecurityLogs] = useState<unknown[]>([]);
  const [otpLogs, setOtpLogs] = useState<unknown[]>([]);
  const [tab, setTab] = useState<'security' | 'otp' | 'activity'>('security');
  const [activityLogs, setActivityLogs] = useState<unknown[]>([]);

  useEffect(() => {
    if (tab === 'security') api.get('/admin/security-logs').then(({ data }) => setSecurityLogs(data.data || [])).catch(() => {});
    if (tab === 'otp') api.get('/admin/otp-logs').then(({ data }) => setOtpLogs(data.data || [])).catch(() => {});
    if (tab === 'activity') api.get('/admin/activity-logs').then(({ data }) => setActivityLogs(data.data || [])).catch(() => {});
  }, [tab]);

  const logs = tab === 'security' ? securityLogs : tab === 'otp' ? otpLogs : activityLogs;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Security & Audit Logs</h1>
      <div className="mb-4 flex gap-2">
        {(['security', 'otp', 'activity'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm capitalize ${tab === t ? 'bg-amber-500 text-white' : 'bg-slate-100'}`}>{t} logs</button>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Details</th>
              <th className="px-4 py-3">Time</th>
            </tr>
          </thead>
          <tbody>
            {(logs as { event?: string; action?: string; type?: string; severity?: string; details?: unknown; createdAt: string }[]).map((log, i) => (
              <tr key={i} className="border-b">
                <td className="px-4 py-3 font-medium">{log.event || log.action || log.type || '-'}{log.severity && <span className="ml-1 text-xs text-red-500">({log.severity})</span>}</td>
                <td className="px-4 py-3 text-slate-500">{JSON.stringify(log.details || {}).slice(0, 60)}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && <p className="p-8 text-center text-slate-500">No logs found</p>}
      </div>
    </div>
  );
}
