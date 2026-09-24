import Link from 'next/link';
import { Car } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <Car className="mb-4 h-16 w-16 text-amber-500" />
      <h1 className="text-4xl font-bold text-slate-900">404</h1>
      <p className="mt-2 text-lg text-slate-600">Page not found</p>
      <p className="mt-1 max-w-md text-sm text-slate-500">
        The page you are looking for does not exist or has been moved.
      </p>
      <div className="mt-8 flex gap-4">
        <Link href="/" className="rounded-lg bg-amber-500 px-6 py-2.5 font-semibold text-white hover:bg-amber-600">
          Go Home
        </Link>
        <Link href="/help" className="rounded-lg border border-slate-300 px-6 py-2.5 font-semibold text-slate-700 hover:bg-slate-50">
          Get Help
        </Link>
      </div>
    </div>
  );
}
