import Link from 'next/link';
import { Car } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4 sm:px-6">
        <div>
          <div className="mb-4 flex items-center gap-2 font-bold text-slate-900">
            <Car className="h-6 w-6 text-amber-500" />
            CabBook
          </div>
          <p className="text-sm text-slate-600">Safe, reliable rides at your fingertips.</p>
        </div>
        <div>
          <h4 className="mb-3 font-semibold text-slate-900">Quick Links</h4>
          <ul className="space-y-2 text-sm text-slate-600">
            <li><Link href="/addresses">Saved Addresses</Link></li>
            <li><Link href="/book-ride">Book Ride</Link></li>
            <li><Link href="/ride-history">Ride History</Link></li>
            <li><Link href="/wallet">Wallet</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 font-semibold text-slate-900">Support</h4>
          <ul className="space-y-2 text-sm text-slate-600">
            <li><Link href="/help">Help & FAQ</Link></li>
            <li><Link href="/terms">Terms & Conditions</Link></li>
            <li><Link href="/profile">Profile</Link></li>
            <li><Link href="/settings">Settings</Link></li>
            <li><Link href="/notifications">Notifications</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 font-semibold text-slate-900">Drive With Us</h4>
          <Link href="/register/driver" className="text-sm text-amber-600 hover:underline">
            Become a Driver
          </Link>
        </div>
      </div>
      <div className="border-t border-slate-200 py-4 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} CabBook. All rights reserved.
      </div>
    </footer>
  );
}
