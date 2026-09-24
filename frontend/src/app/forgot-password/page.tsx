'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/services';
import OtpInput from '@/components/auth/OtpInput';
import PasswordStrength from '@/components/auth/PasswordStrength';
import { validatePassword } from '@/lib/validation';
import { toast } from '@/components/auth/Toast';

type Step = 'request' | 'reset';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [useEmail, setUseEmail] = useState(true);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const requestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authService.forgotPassword(useEmail ? { email } : { phone });
      toast.success('Reset OTP sent');
      if (data.devOtp) toast.info(`Dev OTP: ${data.devOtp}`);
      setStep('reset');
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePassword(newPassword)) return toast.error('Password too weak');
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match');
    setLoading(true);
    try {
      await authService.resetPassword({ email: useEmail ? email : undefined, phone: useEmail ? undefined : phone, otp, newPassword, confirmPassword });
      toast.success('Password reset! Please login.');
      router.push('/login');
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-slate-900">Forgot Password</h1>

        {step === 'request' ? (
          <form onSubmit={requestReset} className="mt-6 space-y-4">
            <div className="flex gap-2">
              <button type="button" onClick={() => setUseEmail(true)} className={`flex-1 rounded-lg py-2 text-sm ${useEmail ? 'bg-amber-500 text-white' : 'bg-slate-100'}`}>Email</button>
              <button type="button" onClick={() => setUseEmail(false)} className={`flex-1 rounded-lg py-2 text-sm ${!useEmail ? 'bg-amber-500 text-white' : 'bg-slate-100'}`}>Phone</button>
            </div>
            {useEmail ? (
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Email"
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5" />
            ) : (
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="Mobile"
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5" />
            )}
            <button type="submit" disabled={loading} className="w-full rounded-lg bg-amber-500 py-3 font-semibold text-white disabled:opacity-50">
              {loading ? 'Sending...' : 'Send Reset OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={resetPassword} className="mt-6 space-y-4">
            <OtpInput value={otp} onChange={setOtp} />
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required placeholder="New password"
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5" />
            <PasswordStrength password={newPassword} />
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="Confirm password"
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5" />
            <button type="submit" disabled={loading || otp.length < 6} className="w-full rounded-lg bg-amber-500 py-3 font-semibold text-white disabled:opacity-50">
              Reset Password
            </button>
          </form>
        )}

        <Link href="/login" className="mt-4 block text-center text-sm text-amber-600 hover:underline">Back to Login</Link>
      </div>
    </div>
  );
}
