'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RideCard from '@/components/RideCard';
import RatingCard from '@/components/RatingCard';
import { rideService } from '@/services';
import { toast } from '@/components/auth/Toast';
import { Ride } from '@/types';
import { X } from 'lucide-react';

const tabs = [
  { id: 'all', label: 'All' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'upcoming', label: 'Upcoming' },
] as const;

export default function RideHistoryPage() {
  const router = useRouter();
  const [rides, setRides] = useState<Ride[]>([]);
  const [tab, setTab] = useState<(typeof tabs)[number]['id']>('all');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Ride | null>(null);
  const [ratingRide, setRatingRide] = useState<Ride | null>(null);

  const load = () => {
    setLoading(true);
    rideService.getRideHistory(tab === 'all' ? undefined : tab)
      .then(({ data }) => setRides(data.rides || data.data || []))
      .catch(() => setRides([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [tab]);

  const handleRate = async (rating: number, comment: string) => {
    if (!ratingRide) return;
    await rideService.submitRating(ratingRide._id, rating, comment);
    toast.success('Rating submitted!');
    setRatingRide(null);
    load();
  };

  const handleCancelScheduled = async (ride: Ride) => {
    if (!confirm('Cancel this scheduled ride?')) return;
    await rideService.cancelRide(ride._id, 'User cancelled scheduled ride');
    toast.success('Ride cancelled');
    load();
  };

  const handleRebook = (ride: Ride) => {
    const dest = ride.destination;
    router.push(`/book-ride?pickup=${encodeURIComponent(dest.address)}&pickupLat=${dest.lat || dest.latitude}&pickupLng=${dest.lng || dest.longitude}`);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Ride History</h1>

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === t.id ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
        </div>
      ) : rides.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rides.map((ride) => (
            <RideCard key={ride._id} ride={ride} onSelect={() => setSelected(ride)} onRebook={() => handleRebook(ride)}
              onRate={() => setRatingRide(ride)} onCancel={() => handleCancelScheduled(ride)} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <p className="text-slate-500">No rides found</p>
          <button onClick={() => router.push('/book-ride')} className="mt-4 text-sm font-medium text-amber-600 hover:underline">Book your first ride</button>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Ride #{selected.rideId}</h2>
              <button onClick={() => setSelected(null)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3 text-sm">
              <p><strong>Status:</strong> <span className="capitalize">{selected.status}</span></p>
              <p><strong>From:</strong> {selected.pickup?.address}</p>
              <p><strong>To:</strong> {selected.destination?.address}</p>
              <p><strong>Distance:</strong> {selected.distance} km · {selected.duration} min</p>
              <p><strong>Vehicle:</strong> {selected.vehicleType}</p>
              <p><strong>Fare:</strong> ₹{(selected.fare || selected.fareDetails)?.finalFare || (selected.fare || selected.fareDetails)?.total}</p>
              <p><strong>Payment:</strong> {selected.paymentMethod} · {selected.paymentStatus}</p>
              {selected.driver && <p><strong>Driver:</strong> {(selected.driver.user || selected.driver.userId)?.name}</p>}
              {selected.cancellationReason && <p className="text-red-600"><strong>Cancelled:</strong> {selected.cancellationReason}</p>}
              {selected.invoiceNumber && <p><strong>Invoice:</strong> {selected.invoiceNumber}</p>}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => router.push(`/ride-tracking/${selected._id}`)} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white">Track / View</button>
              {selected.status === 'completed' && (
                <button onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/rides/${selected._id}/invoice?format=html`, '_blank')}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50">Invoice</button>
              )}
              <button onClick={() => handleRebook(selected)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50">Rebook</button>
            </div>
          </div>
        </div>
      )}

      {ratingRide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Rate Ride #{ratingRide.rideId}</h2>
              <button onClick={() => setRatingRide(null)}><X className="h-5 w-5" /></button>
            </div>
            <RatingCard onSubmit={handleRate} />
          </div>
        </div>
      )}
    </div>
  );
}
