'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/services';
import { useAuth } from '@/context/AuthContext';
import { dashboardForRole } from '@/lib/auth';
import OtpInput from '@/components/auth/OtpInput';
import { toast } from '@/components/auth/Toast';

type LoginMode = 'email' | 'phone' | 'otp';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [mode, setMode] = useState<LoginMode>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const redirectAfterLogin = (role: string) => {
    const redirect = searchParams.get('redirect');
    if (redirect && redirect.startsWith('/') && !redirect.startsWith('/login')) {
      router.push(redirect);
      return;
    }
    router.push(dashboardForRole(role));
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = mode === 'email' ? { email, password } : { phone, password };
      const { data } = await authService.login(payload);
      login(data.accessToken, data.refreshToken, data.user);
      toast.success('Login successful');
      redirectAfterLogin(data.user.role);
    } catch (err: unknown) {
      const axiosErr = err as { message?: string; response?: { data?: { message?: string } } };
      const msg = axiosErr.response?.data?.message || axiosErr.message || 'Login failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await authService.sendLoginOtp(phone);
      setOtpSent(true);
      toast.success('OTP sent to your phone');
      if (data.devOtp) toast.info(`Dev OTP: ${data.devOtp}`);
    } catch (err: unknown) {
      const axiosErr = err as { message?: string; response?: { data?: { message?: string } } };
      const msg = axiosErr.response?.data?.message || axiosErr.message || 'Failed to send OTP';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtpLogin = async () => {
    setLoading(true);
    try {
      const { data } = await authService.loginWithOtp({ phone, otp });
      login(data.accessToken, data.refreshToken, data.user);
      toast.success('Login successful');
      redirectAfterLogin(data.user.role);
    } catch (err: unknown) {
      const axiosErr = err as { message?: string; response?: { data?: { message?: string } } };
      const msg = axiosErr.response?.data?.message || axiosErr.message || 'Invalid OTP';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-600">Sign in to your CabBook account</p>

        <div className="mt-4 flex rounded-lg bg-slate-100 p-1">
          {(['email', 'phone', 'otp'] as LoginMode[]).map((m) => (
            <button key={m} type="button" onClick={() => { setMode(m); setError(''); setOtpSent(false); }}
              className={`flex-1 rounded-md py-2 text-sm font-medium capitalize transition ${mode === m ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-600'}`}>
              {m === 'otp' ? 'OTP' : m}
            </button>
          ))}
        </div>

        {error && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600" role="alert">{error}</div>}

        {mode !== 'otp' ? (
          <form onSubmit={handlePasswordLogin} className="mt-6 space-y-4">
            {mode === 'email' ? (
              <div>
                <label className="block text-sm font-medium text-slate-700">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-slate-700">Mobile Number</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required pattern="[6-9][0-9]{9}"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
            </div>
            <Link href="/forgot-password" className="block text-sm text-amber-600 hover:underline">Forgot password?</Link>
            <button type="submit" disabled={loading}
              className="w-full rounded-lg bg-amber-500 py-3 font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Mobile Number</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={otpSent}
                className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 disabled:bg-slate-50" />
            </div>
            {!otpSent ? (
              <button onClick={sendOtp} disabled={loading || phone.length < 10}
                className="w-full rounded-lg bg-amber-500 py-3 font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
                Send OTP
              </button>
            ) : (
              <>
                <OtpInput value={otp} onChange={setOtp} />
                <button onClick={verifyOtpLogin} disabled={loading || otp.length < 6}
                  className="w-full rounded-lg bg-amber-500 py-3 font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
                  Verify & Login
                </button>
                <button type="button" onClick={sendOtp} className="w-full text-sm text-amber-600 hover:underline">Resend OTP</button>
              </>
            )}
          </div>
        )}

        <p className="mt-6 text-center text-sm text-slate-600">
          Don&apos;t have an account? <Link href="/register" className="font-medium text-amber-600 hover:underline">Register</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[80vh] items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
