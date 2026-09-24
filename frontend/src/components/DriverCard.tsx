import { Driver } from '@/types';
import { Star, Phone } from 'lucide-react';

interface DriverCardProps {
  driver: Driver;
  onSelect?: () => void;
}

export default function DriverCard({ driver, onSelect }: DriverCardProps) {
  const user = driver.user || driver.userId;
  const displayName = user?.name || user?.fullName || 'Driver';
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-xl font-bold text-amber-700">
          {displayName.charAt(0)}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900">{displayName}</h3>
          <div className="flex items-center gap-1 text-sm text-slate-500">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            {(driver.rating ?? 5).toFixed(1)} · {driver.totalRides ?? 0} rides
          </div>
        </div>
        {driver.isOnline && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Online</span>
        )}
      </div>
      {driver.vehicle && (
        <p className="mt-3 text-sm text-slate-600">
          {driver.vehicle.brand} {driver.vehicle.model} · {driver.vehicle.vehicleNumber}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        {user?.phone && (
          <a href={`tel:${user.phone}`} className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
            <Phone className="h-4 w-4" /> Call
          </a>
        )}
        {onSelect && (
          <button onClick={onSelect} className="rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-600">
            Select
          </button>
        )}
      </div>
    </div>
  );
}
