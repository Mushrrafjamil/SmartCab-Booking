'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Wallet, MapPin, Ticket } from 'lucide-react';
import RideCard from '@/components/RideCard';
import { userService } from '@/services';
import { Ride, User } from '@/types';

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [rides, setRides] = useState<Ride[]>([]);

  useEffect(() => {
    userService.getDashboard().then(({ data }) => {
      setUser(data.user);
      setRides(data.upcomingRides || []);
    }).catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Welcome, {user?.name || user?.fullName || 'User'}!</h1>
        <p className="text-slate-600">Where would you like to go today?</p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/book-ride" className="flex items-center gap-4 rounded-xl bg-amber-500 p-5 text-white shadow-md hover:bg-amber-600 sm:col-span-2">
          <MapPin className="h-8 w-8" />
          <div><p className="font-semibold">Book a Ride</p><p className="text-sm text-amber-100">Instant or scheduled</p></div>
        </Link>
        <Link href="/wallet" className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md">
          <Wallet className="h-8 w-8 text-amber-500" />
          <div><p className="font-semibold text-slate-900">₹{user?.walletBalance || 0}</p><p className="text-sm text-slate-500">Wallet</p></div>
        </Link>
        <Link href="/payment" className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md">
          <Ticket className="h-8 w-8 text-amber-500" />
          <div><p className="font-semibold text-slate-900">Payments</p><p className="text-sm text-slate-500">History & invoices</p></div>
        </Link>
        <Link href="/addresses" className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md">
          <MapPin className="h-8 w-8 text-amber-500" />
          <div><p className="font-semibold text-slate-900">Addresses</p><p className="text-sm text-slate-500">Saved locations</p></div>
        </Link>
        <Link href="/coupons" className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md">
          <Ticket className="h-8 w-8 text-amber-500" />
          <div><p className="font-semibold text-slate-900">Coupons</p><p className="text-sm text-slate-500">Discounts</p></div>
        </Link>
        <Link href="/notifications" className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md">
          <MapPin className="h-8 w-8 text-amber-500" />
          <div><p className="font-semibold text-slate-900">Notifications</p><p className="text-sm text-slate-500">Ride & payment alerts</p></div>
        </Link>
        <Link href="/help" className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md">
          <MapPin className="h-8 w-8 text-amber-500" />
          <div><p className="font-semibold text-slate-900">Help</p><p className="text-sm text-slate-500">Support & FAQ</p></div>
        </Link>
        <Link href="/reviews" className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md">
          <Ticket className="h-8 w-8 text-amber-500" />
          <div><p className="font-semibold text-slate-900">My Reviews</p><p className="text-sm text-slate-500">Ratings given</p></div>
        </Link>
      </div>

      <h2 className="mb-4 text-lg font-semibold text-slate-900">Upcoming Rides</h2>
      {rides.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">{rides.map((ride) => <RideCard key={ride._id} ride={ride} />)}</div>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">No upcoming rides. Book your first ride!</p>
      )}
    </div>
  );
}
