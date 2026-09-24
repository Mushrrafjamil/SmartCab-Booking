'use client';

import { getPasswordStrength } from '@/lib/validation';

export default function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const { score, label, color } = getPasswordStrength(password);
  return (
    <div className="mt-2" aria-label="Password strength">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= score ? color : 'bg-slate-200'}`} />
        ))}
      </div>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}
