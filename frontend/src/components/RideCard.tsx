import { Ride } from '@/types';
import { MapPin, Clock, IndianRupee, Star, RotateCcw, XCircle } from 'lucide-react';
import Link from 'next/link';

const statusColors: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  started: 'bg-blue-100 text-blue-700',
  assigned: 'bg-amber-100 text-amber-700',
  arrived: 'bg-teal-100 text-teal-700',
  searching: 'bg-purple-100 text-purple-700',
  scheduled: 'bg-indigo-100 text-indigo-700',
  pending: 'bg-slate-100 text-slate-700',
};

interface RideCardProps {
  ride: Ride;
  onSelect?: () => void;
  onRebook?: () => void;
  onRate?: () => void;
  onCancel?: () => void;
}

export default function RideCard({ ride, onSelect, onRebook, onRate, onCancel }: RideCardProps) {
  const fare = ride.fare || ride.fareDetails;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={onSelect} className="text-sm font-medium text-slate-500 hover:text-amber-600">#{ride.rideId}</button>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusColors[ride.status] || statusColors.pending}`}>
          {ride.status}
        </span>
      </div>
      <div className="space-y-2">
        <div className="flex items-start gap-2 text-sm">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
          <span className="line-clamp-1 text-slate-700">{ride.pickup?.address || 'Pickup'}</span>
        </div>
        <div className="flex items-start gap-2 text-sm">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <span className="line-clamp-1 text-slate-700">{ride.destination?.address || 'Destination'}</span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
        <span className="capitalize">{ride.vehicleType}</span>
        <span>{ride.distance} km</span>
        <span>{ride.duration} min</span>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{new Date(ride.createdAt).toLocaleDateString()}</span>
          <span className="flex items-center gap-1 font-semibold text-slate-900"><IndianRupee className="h-4 w-4" />{fare?.finalFare || fare?.total || 0}</span>
        </div>
        <div className="flex gap-1">
          {ride.status === 'completed' && !ride.driverRating && onRate && (
            <button onClick={onRate} title="Rate" className="rounded p-1.5 text-amber-500 hover:bg-amber-50"><Star className="h-4 w-4" /></button>
          )}
          {onRebook && (
            <button onClick={onRebook} title="Rebook" className="rounded p-1.5 text-slate-500 hover:bg-slate-50"><RotateCcw className="h-4 w-4" /></button>
          )}
          {ride.status === 'scheduled' && onCancel && (
            <button onClick={onCancel} title="Cancel" className="rounded p-1.5 text-red-500 hover:bg-red-50"><XCircle className="h-4 w-4" /></button>
          )}
          <Link href={`/ride-tracking/${ride._id}`} className="rounded p-1.5 text-sm font-medium text-amber-600 hover:bg-amber-50">Track</Link>
        </div>
      </div>
    </div>
  );
}
