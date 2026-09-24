'use client';

import { Suspense } from 'react';
import RegisterForm from './RegisterForm';

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[80vh] items-center justify-center text-slate-500">Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
