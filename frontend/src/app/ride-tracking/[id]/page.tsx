'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MapComponent from '@/components/MapComponent';
import DriverCard from '@/components/DriverCard';
import RatingCard from '@/components/RatingCard';
import { rideService } from '@/services';
import { joinRideRoom, leaveRideRoom, onRideLocation, onRideStatus, onRideAssigned } from '@/lib/socket';
import { toast } from '@/components/auth/Toast';
import { Ride } from '@/types';
import { Phone, Share2, XCircle, AlertTriangle, Clock, Navigation } from 'lucide-react';

const STATUS_STEPS = ['searching', 'assigned', 'arrived', 'started', 'completed'];

export default function RideTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [ride, setRide] = useState<Ride | null>(null);
  const [driverLoc, setDriverLoc] = useState<{ latitude: number; longitude: number } | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [rated, setRated] = useState(false);

  const fetchRide = async () => {
    if (!id) return;
    try {
      const { data } = await rideService.trackRide(id);
      const r = data.ride || data.data;
      setRide(r);
      if (r?.driverLocation) setDriverLoc(r.driverLocation);
    } catch { /* silent */ }
  };

  useEffect(() => {
    if (!id) return;
    fetchRide();
    joinRideRoom(id);

    const unsubLoc = onRideLocation((loc) => {
      setDriverLoc({ latitude: loc.lat, longitude: loc.lng });
    });
    const unsubStatus = onRideStatus((data) => {
      if (data.ride) setRide(data.ride as Ride);
      else fetchRide();
    });
    const unsubAssigned = onRideAssigned(() => {
      fetchRide();
      toast.success('Driver assigned!');
    });

    const interval = setInterval(fetchRide, 10000);
    return () => {
      clearInterval(interval);
      leaveRideRoom(id);
      unsubLoc?.();
      unsubStatus?.();
      unsubAssigned?.();
    };
  }, [id]);

  const handleCancel = async () => {
    if (!ride || !confirm('Cancel this ride?')) return;
    setCancelling(true);
    try {
      await rideService.cancelRide(ride._id, 'User cancelled');
      toast.success('Ride cancelled');
      router.push('/ride-history');
    } catch {
      toast.error('Failed to cancel');
    } finally { setCancelling(false); }
  };

  const handleShare = async () => {
    if (!ride) return;
    try {
      const { data } = await rideService.shareRide(ride._id);
      if (navigator.share) await navigator.share({ title: 'Track my ride', url: data.share.url });
      else { await navigator.clipboard.writeText(data.share.url); toast.success('Link copied!'); }
    } catch { toast.error('Share failed'); }
  };

  const handleRate = async (rating: number, comment: string) => {
    if (!ride) return;
    await rideService.submitRating(ride._id, rating, comment);
    setRated(true);
    toast.success('Thank you for your rating!');
  };

  if (!ride) return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      <p className="text-slate-500">Loading ride...</p>
    </div>
  );

  const fare = ride.fare || ride.fareDetails;
  const isActive = !['completed', 'cancelled'].includes(ride.status);
  const stepIdx = STATUS_STEPS.indexOf(ride.status);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ride #{ride.rideId}</h1>
          <p className="text-sm text-slate-500">{ride.pickup?.address} → {ride.destination?.address}</p>
        </div>
        <span className="rounded-full bg-amber-100 px-4 py-1.5 text-sm font-semibold capitalize text-amber-700">{ride.status}</span>
      </div>

      {/* Status progress */}
      {isActive && (
        <div className="mb-6 flex items-center gap-1">
          {STATUS_STEPS.slice(0, 4).map((s, i) => (
            <div key={s} className="flex flex-1 flex-col items-center gap-1">
              <div className={`h-2 w-full rounded-full ${i <= stepIdx ? 'bg-amber-500' : 'bg-slate-200'}`} />
              <span className="text-xs capitalize text-slate-500">{s}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <MapComponent
          pickup={ride.pickup}
          destination={ride.destination}
          driverLocation={driverLoc || undefined}
          className="h-[420px]"
        />

        <div className="space-y-4">
          {ride.status === 'searching' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-center">
              <Navigation className="mx-auto h-8 w-8 animate-pulse text-amber-500" />
              <p className="mt-2 font-semibold text-amber-800">Searching for nearby drivers...</p>
              <p className="text-sm text-amber-600">Your ride OTP: <strong>{ride.otp}</strong></p>
            </div>
          )}

          {ride.driver && <DriverCard driver={ride.driver} />}

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="font-semibold text-slate-900">Trip Details</h3>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <div className="flex items-center gap-2"><Clock className="h-4 w-4" /> {ride.distance} km · ~{ride.duration} min</div>
              <p><strong>Vehicle:</strong> {ride.vehicleType}</p>
              {ride.pickupNotes && <p><strong>Pickup note:</strong> {ride.pickupNotes}</p>}
              {ride.notes && <p><strong>Notes:</strong> {ride.notes}</p>}
            </div>
            {fare && (
              <div className="mt-3 border-t pt-3">
                <p className="text-lg font-bold text-slate-900">₹{fare.finalFare || fare.total}</p>
                <p className="text-xs text-slate-500">{ride.paymentMethod} · {ride.paymentStatus}</p>
              </div>
            )}
          </div>

          {isActive && (
            <div className="flex flex-wrap gap-2">
              {ride.driver && (
                <a href={`tel:${(ride.driver.user || ride.driver.userId)?.phone}`}
                  className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-600">
                  <Phone className="h-4 w-4" /> Call Driver
                </a>
              )}
              <button onClick={handleShare} className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium hover:bg-slate-50">
                <Share2 className="h-4 w-4" /> Share Ride
              </button>
              <button onClick={handleCancel} disabled={cancelling}
                className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50">
                <XCircle className="h-4 w-4" /> Cancel
              </button>
              <a href="tel:112" className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700">
                <AlertTriangle className="h-4 w-4" /> SOS
              </a>
            </div>
          )}

          {ride.status === 'completed' && !rated && !ride.driverRating && (
            <RatingCard onSubmit={handleRate} title="Rate your driver" />
          )}

          {ride.status === 'completed' && (
            <div className="flex gap-2">
              <button onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/rides/${ride._id}/invoice?format=html`, '_blank')}
                className="rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600">
                Download Invoice
              </button>
              <button onClick={() => router.push(`/book-ride?pickup=${encodeURIComponent(ride.destination.address)}&pickupLat=${ride.destination.lat || ride.destination.latitude}&pickupLng=${ride.destination.lng || ride.destination.longitude}`)}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium hover:bg-slate-50">
                Rebook
              </button>
            </div>
          )}

          {ride.status === 'cancelled' && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm">
              <p className="font-medium text-red-800">Ride Cancelled</p>
              <p className="text-red-600">{ride.cancellationReason}</p>
              {ride.cancellationCharge ? <p className="mt-1">Cancellation fee: ₹{ride.cancellationCharge}</p> : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
