import Link from 'next/link';
import { Car, Shield, Clock, Wallet } from 'lucide-react';

export default function HomePage() {
  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-amber-900 px-4 py-24 sm:px-6">
        <div className="relative mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Your ride, <span className="text-amber-400">your way</span>
            </h1>
            <p className="mt-6 text-lg text-slate-300">
              Book instant or scheduled rides. Track your driver in real-time. Pay securely with multiple options.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/book-ride" className="rounded-xl bg-amber-500 px-8 py-3.5 font-semibold text-white shadow-lg hover:bg-amber-600">
                Book a Ride
              </Link>
              <Link href="/register?role=driver" className="rounded-xl border border-white/30 px-8 py-3.5 font-semibold text-white hover:bg-white/10">
                Drive With Us
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <h2 className="mb-12 text-center text-3xl font-bold text-slate-900">Why Choose CabBook?</h2>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Car, title: 'Multiple Vehicle Types', desc: 'Mini, Sedan, SUV, Premium & Auto' },
            { icon: Shield, title: 'Safe & Verified', desc: 'Background-checked drivers' },
            { icon: Clock, title: 'Real-time Tracking', desc: 'Live GPS tracking on every ride' },
            { icon: Wallet, title: 'Flexible Payments', desc: 'Cash, UPI, Cards & Wallet' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-amber-100">
                <Icon className="h-7 w-7 text-amber-600" />
              </div>
              <h3 className="font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm text-slate-600">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
