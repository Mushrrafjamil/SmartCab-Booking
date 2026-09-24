'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService, userService, notificationService } from '@/services';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/auth/Toast';
import PasswordStrength from '@/components/auth/PasswordStrength';
import { validatePassword } from '@/lib/validation';
import { Monitor, Trash2 } from 'lucide-react';

interface Session {
  _id: string;
  deviceName: string;
  browser: string;
  os: string;
  ipAddress: string;
  lastActivity: string;
  createdAt: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loginHistory, setLoginHistory] = useState<unknown[]>([]);
  const [changingPassword, setChangingPassword] = useState(false);
  const [prefs, setPrefs] = useState({ email: true, sms: true, push: true, promotional: true });

  useEffect(() => {
    authService.getSessions().then(({ data }) => setSessions(data.data || data.sessions || [])).catch(() => {});
    authService.getLoginHistory().then(({ data }) => setLoginHistory(data.data || data.history || [])).catch(() => {});
    notificationService.getPreferences().then(({ data }) => {
      if (data.preferences) setPrefs(data.preferences);
    }).catch(() => {});
  }, []);

  const savePrefs = async () => {
    try {
      await notificationService.updatePreferences(prefs);
      toast.success('Notification preferences saved');
    } catch {
      toast.error('Failed to save preferences');
    }
  };

  const revokeSession = async (id: string) => {
    await authService.revokeSession(id);
    setSessions((prev) => prev.filter((s) => s._id !== id));
    toast.success('Session revoked');
  };

  const logoutAll = async () => {
    await logout(true);
    toast.success('Logged out from all devices');
    router.push('/login');
  };

  const handleChangePassword = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (!validatePassword(passwords.newPassword)) {
      toast.error('Password must include upper, lower, number & special char');
      return;
    }
    setChangingPassword(true);
    try {
      await userService.changePassword(passwords);
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed successfully');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Password change failed';
      toast.error(msg);
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Settings & Security</h1>

      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Active Sessions</h2>
          <button onClick={logoutAll} className="text-sm text-red-600 hover:underline">Logout all devices</button>
        </div>
        <div className="space-y-3">
          {sessions.map((s) => (
            <div key={s._id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
              <div className="flex items-center gap-3">
                <Monitor className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-sm font-medium">{s.deviceName || `${s.browser} on ${s.os}`}</p>
                  <p className="text-xs text-slate-500">{s.ipAddress} · Last active {new Date(s.lastActivity).toLocaleString()}</p>
                </div>
              </div>
              <button onClick={() => revokeSession(s._id)} className="text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          {sessions.length === 0 && <p className="text-sm text-slate-500">No active sessions</p>}
        </div>
      </div>

      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-slate-900">Login History</h2>
        <div className="max-h-60 space-y-2 overflow-y-auto">
          {(loginHistory as { loginType: string; success: boolean; ipAddress: string; createdAt: string }[]).map((h, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="capitalize">{h.loginType} login · {h.ipAddress}</span>
              <span className={h.success ? 'text-green-600' : 'text-red-600'}>{h.success ? 'Success' : 'Failed'} · {new Date(h.createdAt).toLocaleDateString()}</span>
            </div>
          ))}
          {loginHistory.length === 0 && <p className="text-sm text-slate-500">No login history</p>}
        </div>
      </div>

      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-slate-900">Notification Preferences</h2>
        <div className="space-y-3">
          {(['email', 'sms', 'push', 'promotional'] as const).map((key) => (
            <label key={key} className="flex items-center gap-3 text-sm capitalize">
              <input type="checkbox" checked={prefs[key]}
                onChange={(e) => setPrefs({ ...prefs, [key]: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300" />
              {key} notifications
            </label>
          ))}
        </div>
        <button onClick={savePrefs} className="mt-4 rounded-lg bg-amber-500 px-4 py-2 text-sm text-white hover:bg-amber-600">Save Preferences</button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-slate-900">Change Password</h2>
        {(['currentPassword', 'newPassword', 'confirmPassword'] as const).map((field) => (
          <div key={field} className="mb-4">
            <label className="block text-sm font-medium capitalize text-slate-700">{field.replace(/([A-Z])/g, ' $1')}</label>
            <input type="password" value={passwords[field]}
              onChange={(e) => setPasswords({ ...passwords, [field]: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5" />
            {field === 'newPassword' && <PasswordStrength password={passwords.newPassword} />}
          </div>
        ))}
        <button onClick={handleChangePassword} disabled={changingPassword}
          className="rounded-lg bg-amber-500 px-6 py-2.5 font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
          {changingPassword ? 'Updating...' : 'Update Password'}
        </button>
      </div>
    </div>
  );
}
