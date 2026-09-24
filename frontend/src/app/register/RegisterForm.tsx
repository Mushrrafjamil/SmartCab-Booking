'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/services';
import PasswordStrength from '@/components/auth/PasswordStrength';
import FileUpload from '@/components/auth/FileUpload';
import { validateEmail, validatePhone, validatePassword } from '@/lib/validation';
import { toast } from '@/components/auth/Toast';

export default function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '', referralCode: '', acceptTerms: false,
  });
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!validateEmail(form.email)) e.email = 'Invalid email';
    if (!validatePhone(form.phone)) e.phone = 'Invalid 10-digit mobile';
    if (!validatePassword(form.password)) e.password = 'Password must include upper, lower, number & special char';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!form.acceptTerms) e.acceptTerms = 'Accept terms to continue';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
      if (profilePhoto) fd.append('profilePhoto', profilePhoto);
      const { data } = await authService.register(fd);
      toast.success(data.message || 'Registered! Verify OTP.');
      if (data.devOtps) toast.info(`Dev OTPs - Phone: ${data.devOtps.phone}, Email: ${data.devOtps.email}`);
      router.push(`/verify-otp?email=${encodeURIComponent(form.email)}&phone=${encodeURIComponent(form.phone)}`);
    } catch (err: unknown) {
      const axiosErr = err as { message?: string; response?: { data?: { message?: string } } };
      const msg = axiosErr.response?.data?.message || axiosErr.message || 'Registration failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const field = (name: keyof typeof form, label: string, type = 'text') => (
    <div>
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <input name={name} type={type} value={form[name] as string}
        onChange={(e) => setForm({ ...form, [name]: type === 'checkbox' ? e.target.checked : e.target.value })}
        className={`mt-1 w-full rounded-lg border px-4 py-2.5 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 ${errors[name] ? 'border-red-400' : 'border-slate-300'}`} />
      {errors[name] && <p className="mt-1 text-xs text-red-500">{errors[name]}</p>}
      {name === 'password' && <PasswordStrength password={form.password} />}
    </div>
  );

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-slate-900">Create Account</h1>
        <p className="mt-1 text-sm text-slate-600">Join CabBook as a passenger</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {field('name', 'Full Name')}
          {field('email', 'Email Address', 'email')}
          {field('phone', 'Mobile Number', 'tel')}
          {field('password', 'Password', 'password')}
          {field('confirmPassword', 'Confirm Password', 'password')}
          <FileUpload label="Profile Photo (Optional)" onChange={setProfilePhoto} />
          {field('referralCode', 'Referral Code (Optional)')}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.acceptTerms} onChange={(e) => setForm({ ...form, acceptTerms: e.target.checked })} />
            I accept the <Link href="/terms" className="text-amber-600 hover:underline">Terms & Conditions</Link>
          </label>
          {errors.acceptTerms && <p className="text-xs text-red-500">{errors.acceptTerms}</p>}
          <button type="submit" disabled={loading}
            className="w-full rounded-lg bg-amber-500 py-3 font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-600">
          Want to drive? <Link href="/register/driver" className="font-medium text-amber-600 hover:underline">Driver Registration</Link>
        </p>
        <p className="mt-2 text-center text-sm text-slate-600">
          Already have an account? <Link href="/login" className="font-medium text-amber-600 hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
}
