'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { addressService } from '@/services';
import { toast } from '@/components/auth/Toast';
import AddressForm, { AddressCard } from '@/components/address/AddressForm';
import MapComponent from '@/components/MapComponent';
import type { Address, GpsLocation, LocationHistoryEntry } from '@/types';
import {
  Home, Building2, MapPin, Navigation, RefreshCw, Save, History, Signal,
} from 'lucide-react';

type Tab = 'home' | 'office' | 'custom' | 'gps';

const tabs: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'office', label: 'Office', icon: Building2 },
  { id: 'custom', label: 'Custom', icon: MapPin },
  { id: 'gps', label: 'GPS Location', icon: Navigation },
];

export default function AddressesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [recommendations, setRecommendations] = useState<{ favorites: Address[]; recent: Address[]; defaults: Address[] }>({ favorites: [], recent: [], defaults: [] });
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [loading, setLoading] = useState(true);

  const [gps, setGps] = useState<GpsLocation | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsHistory, setGpsHistory] = useState<LocationHistoryEntry[]>([]);
  const [lastKnown, setLastKnown] = useState<LocationHistoryEntry | null>(null);

  const loadAddresses = useCallback(async () => {
    try {
      const [listRes, recRes] = await Promise.all([
        addressService.list({ type: activeTab === 'gps' ? undefined : activeTab }),
        addressService.getRecommendations(),
      ]);
      if (activeTab !== 'gps') {
        setAddresses(listRes.data.addresses || []);
      }
      setRecommendations(recRes.data.recommendations || { favorites: [], recent: [], defaults: [] });
    } catch {
      toast.error('Failed to load addresses');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  const loadGpsData = useCallback(async () => {
    try {
      const [histRes, lastRes] = await Promise.all([
        addressService.getGpsHistory(),
        addressService.getLastKnown(),
      ]);
      setGpsHistory(histRes.data.history || []);
      setLastKnown(lastRes.data.location || null);
    } catch { /* optional */ }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadAddresses();
    if (activeTab === 'gps') loadGpsData();
  }, [activeTab, loadAddresses, loadGpsData]);

  const detectLocation = (highAccuracy = true) => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { data } = await addressService.detectGps(
            pos.coords.latitude,
            pos.coords.longitude,
            pos.coords.accuracy
          );
          setGps(data.location);
          loadGpsData();
        } catch {
          setGps({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            signalStatus: pos.coords.accuracy <= 20 ? 'good' : pos.coords.accuracy <= 100 ? 'fair' : 'poor',
            fullAddress: `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`,
          });
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        toast.error(err.message || 'Location permission denied');
        if (lastKnown) {
          setGps({
            lat: lastKnown.lat,
            lng: lastKnown.lng,
            accuracy: lastKnown.accuracy,
            fullAddress: lastKnown.fullAddress,
            signalStatus: 'offline',
          });
        }
        setGpsLoading(false);
      },
      { enableHighAccuracy: highAccuracy, timeout: 15000, maximumAge: 0 }
    );
  };

  const saveCurrentLocation = async () => {
    if (!gps) return;
    try {
      await addressService.saveGps({
        type: 'custom',
        customLabel: 'Saved GPS Location',
        fullAddress: gps.fullAddress,
        lat: gps.lat,
        lng: gps.lng,
        accuracy: gps.accuracy,
        city: gps.city,
        state: gps.state,
        country: gps.country,
        pincode: gps.pincode,
        streetName: gps.streetName,
        areaLocality: gps.areaLocality,
      });
      toast.success('Current location saved');
      loadAddresses();
    } catch {
      toast.error('Failed to save location');
    }
  };

  const handleBook = async (address: Address) => {
    const id = address._id || address.id;
    if (id) await addressService.recordUsage(id);
    router.push(`/book-ride?pickup=${encodeURIComponent(address.fullAddress)}&pickupLat=${address.lat}&pickupLng=${address.lng}`);
  };

  const signalColor = (s?: string) =>
    s === 'good' ? 'text-green-600' : s === 'fair' ? 'text-yellow-600' : s === 'poor' ? 'text-orange-600' : 'text-slate-500';

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Address Management</h1>
          <p className="text-sm text-slate-500">Manage home, office, custom addresses and GPS locations</p>
        </div>
        {activeTab !== 'gps' && !showForm && (
          <button onClick={() => { setEditing(null); setShowForm(true); }}
            className="rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600">
            Add {activeTab} address
          </button>
        )}
      </div>

      {/* Recommendations */}
      {(recommendations.favorites.length > 0 || recommendations.recent.length > 0) && !showForm && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          {recommendations.recent.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Recently Used</h3>
              <div className="space-y-2">
                {recommendations.recent.slice(0, 3).map((a) => (
                  <button key={a._id || a.id} onClick={() => handleBook(a)}
                    className="block w-full truncate rounded-lg bg-slate-50 px-3 py-2 text-left text-sm hover:bg-amber-50">
                    {a.fullAddress}
                  </button>
                ))}
              </div>
            </div>
          )}
          {recommendations.favorites.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Favorites</h3>
              <div className="space-y-2">
                {recommendations.favorites.slice(0, 3).map((a) => (
                  <button key={a._id || a.id} onClick={() => handleBook(a)}
                    className="block w-full truncate rounded-lg bg-slate-50 px-3 py-2 text-left text-sm hover:bg-amber-50">
                    {a.fullAddress}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        <nav className="flex flex-row gap-2 overflow-x-auto lg:flex-col">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => { setActiveTab(id); setShowForm(false); setEditing(null); }}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium capitalize transition ${
                activeTab === id ? 'bg-amber-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </nav>

        <div>
          {activeTab === 'gps' ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-slate-900">Current GPS Location</h2>
                  <div className="flex gap-2">
                    <button onClick={() => detectLocation(true)} disabled={gpsLoading}
                      className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50">
                      <RefreshCw className={`h-4 w-4 ${gpsLoading ? 'animate-spin' : ''}`} />
                      {gpsLoading ? 'Detecting...' : 'Detect Location'}
                    </button>
                    <button onClick={() => detectLocation(false)} disabled={gpsLoading}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">High Accuracy</button>
                  </div>
                </div>

                {gps ? (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-700">{gps.fullAddress}</p>
                    <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                      <span>{gps.lat.toFixed(6)}, {gps.lng.toFixed(6)}</span>
                      {gps.accuracy != null && <span>Accuracy: ±{Math.round(gps.accuracy)}m</span>}
                      <span className={`flex items-center gap-1 ${signalColor(gps.signalStatus)}`}>
                        <Signal className="h-3 w-3" /> GPS: {gps.signalStatus || 'good'}
                      </span>
                    </div>
                    {gps.nearbyLandmarks && gps.nearbyLandmarks.length > 0 && (
                      <p className="text-xs text-slate-500">Nearby: {gps.nearbyLandmarks.join(', ')}</p>
                    )}
                    <MapComponent pin={{ lat: gps.lat, lng: gps.lng }} className="h-[300px]" zoom={16} />
                    <div className="flex gap-2">
                      <button onClick={saveCurrentLocation} className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600">
                        <Save className="h-4 w-4" /> Save Location
                      </button>
                      <button onClick={() => router.push(`/book-ride?pickup=${encodeURIComponent(gps.fullAddress || '')}&pickupLat=${gps.lat}&pickupLng=${gps.lng}`)}
                        className="flex items-center gap-1.5 rounded-lg border border-amber-500 px-4 py-2 text-sm font-medium text-amber-600 hover:bg-amber-50">
                        <Navigation className="h-4 w-4" /> Book Ride Here
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Click &quot;Detect Location&quot; to get your current GPS position. Location permission is required.</p>
                )}

                {lastKnown && !gps && (
                  <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
                    <p className="font-medium text-slate-700">Last Known Location (offline)</p>
                    <p className="text-slate-500">{lastKnown.fullAddress}</p>
                    <p className="text-xs text-slate-400">{new Date(lastKnown.createdAt).toLocaleString()}</p>
                  </div>
                )}
              </div>

              {gpsHistory.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-900"><History className="h-4 w-4" /> Location History</h3>
                  <div className="max-h-48 space-y-2 overflow-y-auto">
                    {gpsHistory.map((h) => (
                      <div key={h._id} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                        <span className="truncate">{h.fullAddress || `${h.lat}, ${h.lng}`}</span>
                        <span className="shrink-0 text-xs text-slate-400">{new Date(h.createdAt).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : showForm ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold capitalize text-slate-900">{editing ? 'Edit' : 'Add'} {activeTab} Address</h2>
              <AddressForm
                type={activeTab}
                addressId={editing?._id || editing?.id}
                initial={editing ? {
                  ...editing,
                  type: activeTab,
                } : undefined}
                onSaved={() => { setShowForm(false); setEditing(null); loadAddresses(); }}
                onCancel={() => { setShowForm(false); setEditing(null); }}
              />
            </div>
          ) : loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-4">
              {addresses.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
                  <MapPin className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-3 text-slate-600">No {activeTab} addresses saved yet</p>
                  <button onClick={() => setShowForm(true)} className="mt-4 text-sm font-medium text-amber-600 hover:underline">
                    Add your first {activeTab} address
                  </button>
                </div>
              ) : (
                addresses.map((a) => (
                  <AddressCard
                    key={a._id || a.id}
                    address={a}
                    onEdit={(addr) => { setEditing(addr); setShowForm(true); }}
                    onRefresh={loadAddresses}
                    onBook={handleBook}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
