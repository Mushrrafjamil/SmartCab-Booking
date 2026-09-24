'use client';

import { useEffect, useState } from 'react';
import { driverService, API_BASE } from '@/services';
import VehicleCard from '@/components/VehicleCard';
import { Driver, User, Vehicle } from '@/types';
import { Loader2, MapPin, Phone, Mail, Star, Shield, Circle } from 'lucide-react';

const profilePhotoUrl = (path?: string) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_BASE.replace(/\/api\/?$/, '')}${path}`;
};

export default function DriverProfilePage() {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    driverService.getProfile()
      .then(({ data }) => setDriver(data.driver))
      .catch((err) => {
        setError(err?.response?.data?.message || 'Failed to load profile');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !driver) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-700">{error || 'Driver profile not found'}</p>
      </div>
    );
  }

  const user = (driver.userId || driver.user) as User | undefined;
  const vehicle = (driver.vehicleId || driver.vehicle) as Vehicle | undefined;
  const photo = profilePhotoUrl(user?.profilePhoto);
  const statusColor = driver.status === 'online' ? 'text-green-600' : driver.status === 'busy' ? 'text-amber-600' : 'text-slate-500';
  const verifyColor = driver.verificationStatus === 'approved' ? 'bg-green-100 text-green-700'
    : driver.verificationStatus === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700';

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Driver Profile</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2">
          <div className="flex items-start gap-4">
            {photo ? (
              <img src={photo} alt={user?.name} className="h-20 w-20 rounded-full object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-200 text-2xl font-bold text-slate-500">
                {user?.name?.charAt(0) || 'D'}
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-slate-900">{user?.name || 'Driver'}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                {user?.email && <span className="flex items-center gap-1"><Mail className="h-4 w-4" />{user.email}</span>}
                {user?.phone && <span className="flex items-center gap-1"><Phone className="h-4 w-4" />{user.phone}</span>}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${verifyColor}`}>
                  <Shield className="h-3 w-3" /> {driver.verificationStatus?.replace('_', ' ') || 'pending'}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize ${statusColor}`}>
                  <Circle className="h-2 w-2 fill-current" /> {driver.status}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Rating</p>
              <p className="mt-1 flex items-center gap-1 text-lg font-semibold">
                <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                {driver.rating?.toFixed(1) || '5.0'}
                {driver.ratingCount != null && <span className="text-sm font-normal text-slate-500">({driver.ratingCount})</span>}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Total Rides</p>
              <p className="mt-1 text-lg font-semibold">{driver.totalRides ?? 0}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Total Earnings</p>
              <p className="mt-1 text-lg font-semibold">₹{driver.totalEarnings ?? 0}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs text-slate-500">License Number</p>
              <p className="mt-1 font-medium">{driver.licenseNumber || '—'}</p>
            </div>
          </div>

          {(driver.address || driver.city) && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Address</h3>
              <p className="flex items-start gap-2 text-sm text-slate-600">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                {[driver.address, driver.city, driver.state, driver.pincode].filter(Boolean).join(', ') || '—'}
              </p>
            </div>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-2 text-sm">
            <p><span className="text-slate-500">Aadhaar:</span> {driver.aadhaarNumber || '—'}</p>
            <p><span className="text-slate-500">PAN:</span> {driver.panNumber || '—'}</p>
            {driver.licenseExpiry && <p><span className="text-slate-500">License Expiry:</span> {new Date(driver.licenseExpiry).toLocaleDateString()}</p>}
          </div>
        </div>

        <div className="space-y-4">
          {vehicle && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Vehicle</h3>
              <VehicleCard vehicle={vehicle} />
            </div>
          )}

          {driver.documents && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-700">Documents</h3>
              <div className="space-y-1 text-sm">
                {Object.entries(driver.documents).map(([key, doc]) => (
                  <p key={key} className="flex justify-between">
                    <span className="text-slate-500">{doc.label}</span>
                    <span className={doc.url ? 'text-green-600' : 'text-slate-400'}>{doc.url ? '✓' : '—'}</span>
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
