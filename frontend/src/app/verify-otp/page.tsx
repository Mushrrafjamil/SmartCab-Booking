'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/services';
import { useAuth } from '@/context/AuthContext';
import { dashboardForRole } from '@/lib/auth';
import OtpInput from '@/components/auth/OtpInput';
import { toast } from '@/components/auth/Toast';

function VerifyOtpForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuth();
  const email = params.get('email') || '';
  const phone = params.get('phone') || '';
  const [emailOtp, setEmailOtp] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const verify = async (type: 'email' | 'phone', otp: string) => {
    setLoading(true);
    try {
      const { data } = await authService.verifyOtp({ email, phone, otp, type });
      if (type === 'email') setEmailVerified(true);
      if (type === 'phone') setPhoneVerified(true);
      toast.success(`${type} verified`);
      if (data.accessToken) {
        login(data.accessToken, data.refreshToken, data.user);
        router.push(dashboardForRole(data.user.role));
      }
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const resend = async (type: 'email' | 'phone') => {
    await authService.resendOtp({ email, phone, type });
    setCountdown(60);
    toast.info(`OTP resent to ${type}`);
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900">Verify Your Account</h1>
      <p className="mt-1 text-sm text-slate-600">Enter OTPs sent to your email and phone</p>

      <div className="mt-8 space-y-8">
        <div className={`rounded-xl border p-6 ${emailVerified ? 'border-green-200 bg-green-50' : 'border-slate-200'}`}>
          <h2 className="font-semibold text-slate-900">Email Verification {emailVerified && '✓'}</h2>
          <p className="text-sm text-slate-500">{email}</p>
          {!emailVerified && (
            <>
              <div className="mt-4"><OtpInput value={emailOtp} onChange={setEmailOtp} /></div>
              <button onClick={() => verify('email', emailOtp)} disabled={loading || emailOtp.length < 6}
                className="mt-3 w-full rounded-lg bg-amber-500 py-2 text-white disabled:opacity-50">Verify Email</button>
            </>
          )}
        </div>

        <div className={`rounded-xl border p-6 ${phoneVerified ? 'border-green-200 bg-green-50' : 'border-slate-200'}`}>
          <h2 className="font-semibold text-slate-900">Phone Verification {phoneVerified && '✓'}</h2>
          <p className="text-sm text-slate-500">{phone}</p>
          {!phoneVerified && (
            <>
              <div className="mt-4"><OtpInput value={phoneOtp} onChange={setPhoneOtp} /></div>
              <button onClick={() => verify('phone', phoneOtp)} disabled={loading || phoneOtp.length < 6}
                className="mt-3 w-full rounded-lg bg-amber-500 py-2 text-white disabled:opacity-50">Verify Phone</button>
            </>
          )}
        </div>

        {countdown > 0 ? (
          <p className="text-center text-sm text-slate-500">Resend OTP in {countdown}s</p>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => resend('email')} className="flex-1 text-sm text-amber-600 hover:underline">Resend Email OTP</button>
            <button onClick={() => resend('phone')} className="flex-1 text-sm text-amber-600 hover:underline">Resend Phone OTP</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center">Loading...</div>}>
      <VerifyOtpForm />
    </Suspense>
  );
}
