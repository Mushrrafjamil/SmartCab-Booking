'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Info } from 'lucide-react';

export interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

let toastId = 0;
const listeners: ((t: ToastMessage) => void)[] = [];

export const toast = {
  success: (message: string) => listeners.forEach((l) => l({ id: ++toastId, type: 'success', message })),
  error: (message: string) => listeners.forEach((l) => l({ id: ++toastId, type: 'error', message })),
  info: (message: string) => listeners.forEach((l) => l({ id: ++toastId, type: 'info', message })),
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handler = (t: ToastMessage) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 4000);
    };
    listeners.push(handler);
    return () => { const i = listeners.indexOf(handler); if (i >= 0) listeners.splice(i, 1); };
  }, []);

  const icons = { success: CheckCircle, error: XCircle, info: Info };
  const colors = { success: 'bg-green-50 text-green-800 border-green-200', error: 'bg-red-50 text-red-800 border-red-200', info: 'bg-blue-50 text-blue-800 border-blue-200' };

  return (
    <div className="fixed right-4 top-4 z-[100] space-y-2" aria-live="polite">
      {toasts.map((t) => {
        const Icon = icons[t.type];
        return (
          <div key={t.id} className={`flex items-center gap-2 rounded-lg border px-4 py-3 shadow-lg ${colors[t.type]}`}>
            <Icon className="h-5 w-5 shrink-0" />
            <span className="text-sm">{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
