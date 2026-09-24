'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminService } from '@/services';
import { toast } from '@/components/auth/Toast';
import { Ride } from '@/types';
import {
  RefreshCw, MapPin, User, Car, Loader2, Search, History,
  Zap, UserPlus, RotateCcw,
} from 'lucide-react';

interface AvailableDriver {
  driverId: string;
  name: string;
  phone?: string;
  rating?: number;
  distanceKm?: number;
  etaMinutes?: number;
  score?: number;
  vehicleType?: string;
  vehicleNumber?: string;
  status?: string;
}

interface AssignmentRecord {
  _id: string;
  type: string;
  status: string;
  assignedBy?: string;
  distanceKm?: number;
  etaMinutes?: number;
  reason?: string;
  createdAt: string;
  driverId?: { userId?: { name?: string; phone?: string } };
}

const STATUS_COLORS: Record<string, string> = {
  searching: 'bg-amber-100 text-amber-800',
  assigned: 'bg-blue-100 text-blue-800',
  arrived: 'bg-indigo-100 text-indigo-800',
  started: 'bg-green-100 text-green-800',
};

const getFare = (ride: Ride) =>
  ride.fare?.total ?? ride.fareDetails?.finalFare ?? ride.fareDetails?.total ?? 0;

export default function AdminRidesPage() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [selected, setSelected] = useState<Ride | null>(null);
  const [drivers, setDrivers] = useState<AvailableDriver[]>([]);
  const [history, setHistory] = useState<AssignmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [acting, setActing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const loadRides = useCallback(async () => {
    try {
      const { data } = await adminService.getLiveRides();
      setRides(data.rides || []);
    } catch {
      toast.error('Failed to load live rides');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRides();
    const interval = setInterval(loadRides, 15000);
    return () => clearInterval(interval);
  }, [loadRides]);

  const selectRide = async (ride: Ride) => {
    setSelected(ride);
    setDrivers([]);
    setShowHistory(false);
    try {
      const { data } = await adminService.getAssignmentHistory(ride._id);
      setHistory(data.history || []);
    } catch {
      setHistory([]);
    }
  };

  const searchDrivers = async () => {
    if (!selected) return;
    setSearching(true);
    try {
      const { data } = await adminService.searchAssignDrivers(selected._id, {
        vehicleType: selected.vehicleType,
      });
      setDrivers(data.drivers || []);
      if (!data.drivers?.length) toast.info('No eligible drivers found nearby');
    } catch {
      toast.error('Driver search failed');
    } finally {
      setSearching(false);
    }
  };

  const autoAssign = async () => {
    if (!selected) return;
    setActing(true);
    try {
      await adminService.autoAssignRide(selected._id);
      toast.success('Auto-assignment initiated');
      await loadRides();
    } catch {
      toast.error('Auto-assign failed');
    } finally {
      setActing(false);
    }
  };

  const manualAssign = async (driverId: string) => {
    if (!selected) return;
    setActing(true);
    try {
      const isReassign = selected.status !== 'searching' && !!selected.driver;
      if (isReassign) {
        await adminService.reassignRide(selected._id, driverId);
        toast.success('Driver reassigned');
      } else {
        await adminService.manualAssignRide(selected._id, driverId);
        toast.success('Driver assigned');
      }
      await loadRides();
      setSelected(null);
      setDrivers([]);
    } catch {
      toast.error('Assignment failed');
    } finally {
      setActing(false);
    }
  };

  const loadGlobalHistory = async () => {
    setShowHistory(true);
    setSelected(null);
    try {
      const { data } = await adminService.getAssignmentHistory();
      setHistory(data.history || []);
    } catch {
      toast.error('Failed to load history');
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ride Assignment</h1>
          <p className="text-sm text-slate-500">Monitor live rides and assign drivers</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadGlobalHistory}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <History className="h-4 w-4" />
            History
          </button>
          <button
            onClick={loadRides}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Live Rides ({rides.length})
          </h2>
          <div className="space-y-2">
            {rides.map((r) => {
              const passenger = r.passengerId as { name?: string; phone?: string } | undefined;
              const driver = r.driver as { userId?: { name?: string } } | undefined;
              const isSelected = selected?._id === r._id;
              return (
                <button
                  key={r._id}
                  onClick={() => selectRide(r)}
                  className={`w-full rounded-xl border p-4 text-left transition ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[r.status] || 'bg-slate-100 text-slate-700'}`}>
                      {r.status}
                    </span>
                    <span className="font-bold text-slate-900">₹{getFare(r)}</span>
                  </div>
                  <p className="mt-2 truncate text-sm text-slate-700">{r.pickup?.address}</p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1 capitalize">
                      <Car className="h-3 w-3" /> {r.vehicleType}
                    </span>
                    {passenger?.name && (
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3" /> {passenger.name}
                      </span>
                    )}
                    {driver?.userId?.name && (
                      <span className="text-blue-600">→ {driver.userId.name}</span>
                    )}
                  </div>
                </button>
              );
            })}
            {rides.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-500">No active rides</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-3">
          {showHistory && !selected ? (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Assignment History</h2>
              <div className="max-h-[32rem] space-y-2 overflow-y-auto">
                {history.map((h) => (
                  <div key={h._id} className="rounded-lg border border-slate-100 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize">{h.status}</span>
                      <span className="text-xs text-slate-400">{new Date(h.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="mt-1 text-slate-600">
                      {h.driverId?.userId?.name || 'Unknown driver'} · {h.type} · {h.assignedBy}
                    </p>
                    {h.reason && <p className="text-xs text-slate-400">{h.reason}</p>}
                  </div>
                ))}
                {history.length === 0 && <p className="text-center text-slate-500">No history</p>}
              </div>
            </div>
          ) : selected ? (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[selected.status] || 'bg-slate-100'}`}>
                    {selected.status}
                  </span>
                  <h2 className="mt-2 text-lg font-semibold text-slate-900">Ride Details</h2>
                </div>
                <span className="text-xl font-bold">₹{getFare(selected)}</span>
              </div>

              <div className="mb-4 space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 text-green-500" />
                  <span>{selected.pickup?.address}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 text-red-500" />
                  <span>{selected.destination?.address}</span>
                </div>
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                {selected.status === 'searching' && (
                  <button
                    disabled={acting}
                    onClick={autoAssign}
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
                  >
                    <Zap className="h-4 w-4" />
                    Auto Assign
                  </button>
                )}
                <button
                  disabled={searching}
                  onClick={searchDrivers}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Search className="h-4 w-4" />
                  {searching ? 'Searching…' : 'Find Drivers'}
                </button>
              </div>

              {drivers.length > 0 && (
                <div className="mb-4">
                  <h3 className="mb-2 text-sm font-semibold text-slate-700">Available Drivers</h3>
                  <div className="space-y-2">
                    {drivers.map((d) => (
                      <div key={d.driverId} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                        <div>
                          <p className="font-medium text-slate-900">{d.name}</p>
                          <p className="text-xs text-slate-500">
                            {d.vehicleType} · {d.vehicleNumber} · ⭐ {d.rating?.toFixed(1) ?? '—'}
                            {d.distanceKm != null && ` · ${d.distanceKm} km · ${d.etaMinutes} min`}
                          </p>
                        </div>
                        <button
                          disabled={acting}
                          onClick={() => manualAssign(d.driverId)}
                          className="inline-flex items-center gap-1 rounded-lg bg-green-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600 disabled:opacity-50"
                        >
                          {selected.driver ? <RotateCcw className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
                          {selected.driver ? 'Reassign' : 'Assign'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {history.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-slate-700">Assignment History</h3>
                  <div className="max-h-48 space-y-1 overflow-y-auto">
                    {history.map((h) => (
                      <div key={h._id} className="rounded border border-slate-50 px-3 py-2 text-xs text-slate-600">
                        <span className="font-medium capitalize">{h.status}</span>
                        {' · '}{h.driverId?.userId?.name} · {new Date(h.createdAt).toLocaleTimeString()}
                        {h.reason && <span className="text-slate-400"> — {h.reason}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white">
              <p className="text-slate-400">Select a ride to manage assignment</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
