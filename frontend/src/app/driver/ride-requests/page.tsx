'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { assignmentService } from '@/services';
import { useAuth } from '@/context/AuthContext';
import { joinDriverRoom, leaveDriverRoom, onRideRequest, type RideRequestPayload } from '@/lib/socket';
import { toast } from '@/components/auth/Toast';
import { Ride } from '@/types';
import { Clock, MapPin, User, Car, Loader2 } from 'lucide-react';

interface PendingOffer extends Ride {
  expiresAt?: string;
  assignmentExpiresAt?: string;
  isDirectOffer?: boolean;
  etaMinutes?: number;
}

const getFare = (ride: PendingOffer) =>
  ride.fare?.total ?? ride.fareDetails?.finalFare ?? ride.fareDetails?.total ?? 0;

function Countdown({ expiresAt }: { expiresAt?: string }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSeconds(diff);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (!expiresAt) return null;
  const urgent = seconds <= 10;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${urgent ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>
      <Clock className="h-3 w-3" />
      {seconds}s left
    </span>
  );
}

export default function DriverRideRequestsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [offers, setOffers] = useState<PendingOffer[]>([]);
  const [activeRides, setActiveRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const loadPending = useCallback(async () => {
    try {
      const { data } = await assignmentService.getPendingForDriver();
      const direct = (data.pendingOffers || []).filter((o: PendingOffer) => o.isDirectOffer);
      setOffers(direct);
      setActiveRides(data.activeRides || []);
    } catch {
      toast.error('Failed to load ride requests');
    } finally {
      setLoading(false);
    }
  }, []);

  const upsertOffer = useCallback((payload: RideRequestPayload) => {
    const rideId = payload.rideId;
    const toLocation = (loc?: { address: string; lat?: number; lng?: number }) => ({
      address: loc?.address || '',
      latitude: loc?.lat ?? 0,
      longitude: loc?.lng ?? 0,
      lat: loc?.lat,
      lng: loc?.lng,
    });
    setOffers((prev) => {
      const existing = prev.find((o) => o._id === rideId);
      const next: PendingOffer = existing || {
        _id: rideId,
        rideId,
        pickup: toLocation(payload.ride?.pickup),
        destination: toLocation(payload.ride?.destination),
        vehicleType: payload.ride?.vehicleType || 'sedan',
        fare: payload.ride?.fare as PendingOffer['fare'],
        status: 'searching',
        paymentMethod: 'cash',
        paymentStatus: 'pending',
        distance: 0,
        duration: 0,
        createdAt: new Date().toISOString(),
      };
      return [
        { ...next, expiresAt: payload.expiresAt, etaMinutes: payload.etaMinutes, isDirectOffer: true },
        ...prev.filter((o) => o._id !== rideId),
      ];
    });
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  useEffect(() => {
    if (!user?.id) return;
    joinDriverRoom(user.id);
    const unsub = onRideRequest((payload) => {
      upsertOffer(payload);
      toast.info('New ride request!');
    });
    return () => {
      leaveDriverRoom(user.id);
      unsub?.();
    };
  }, [user?.id, upsertOffer]);

  useEffect(() => {
    const interval = setInterval(() => {
      setOffers((prev) =>
        prev.filter((o) => {
          const exp = o.expiresAt || o.assignmentExpiresAt;
          return !exp || new Date(exp).getTime() > Date.now();
        })
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const accept = async (id: string) => {
    setActing(id);
    try {
      await assignmentService.acceptRide(id);
      toast.success('Ride accepted!');
      setOffers((prev) => prev.filter((o) => o._id !== id));
      await loadPending();
      router.push('/driver/dashboard');
    } catch {
      toast.error('Could not accept ride');
    } finally {
      setActing(null);
    }
  };

  const reject = async (id: string) => {
    setActing(id);
    try {
      await assignmentService.rejectRide(id, 'Driver declined');
      setOffers((prev) => prev.filter((o) => o._id !== id));
      toast.info('Ride declined');
    } catch {
      toast.error('Could not reject ride');
    } finally {
      setActing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Ride Requests</h1>
      <p className="mb-6 text-sm text-slate-500">Accept within 30 seconds or the offer goes to another driver.</p>

      {activeRides.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-slate-800">Active Rides</h2>
          <div className="space-y-3">
            {activeRides.map((r) => (
              <div key={r._id} className="rounded-xl border border-green-200 bg-green-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize text-green-800">{r.status}</span>
                  <span className="font-bold text-slate-900">₹{getFare(r)}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{r.pickup?.address}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {offers.map((r) => {
          const passenger = r.passengerId as { name?: string; phone?: string } | undefined;
          const busy = acting === r._id;
          return (
            <div key={r._id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium capitalize text-blue-800">
                  <Car className="h-3 w-3" />
                  {r.vehicleType}
                </span>
                <Countdown expiresAt={r.expiresAt || r.assignmentExpiresAt} />
              </div>

              <div className="flex items-start gap-2 text-sm">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                <span>{r.pickup?.address}</span>
              </div>
              <div className="mt-1 flex items-start gap-2 text-sm">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <span>{r.destination?.address}</span>
              </div>

              {passenger?.name && (
                <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                  <User className="h-4 w-4" />
                  <span>{passenger.name}</span>
                  {passenger.phone && <span className="text-slate-400">· {passenger.phone}</span>}
                </div>
              )}

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                <div>
                  <span className="text-2xl font-bold text-slate-900">₹{getFare(r)}</span>
                  {r.etaMinutes != null && (
                    <span className="ml-2 text-sm text-slate-500">{r.etaMinutes} min to pickup</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={busy}
                    onClick={() => reject(r._id)}
                    className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => accept(r._id)}
                    className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50"
                  >
                    {busy ? 'Processing…' : 'Accept'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {offers.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center">
            <Car className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="text-slate-500">No pending ride requests</p>
            <p className="mt-1 text-sm text-slate-400">Stay online — new requests appear here instantly</p>
          </div>
        )}
      </div>
    </div>
  );
}
