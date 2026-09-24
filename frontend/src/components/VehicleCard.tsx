import { Vehicle } from '@/types';
import { Truck, Users, Fuel } from 'lucide-react';

interface VehicleCardProps {
  vehicle: Vehicle;
}

const statusColors: Record<string, string> = {
  available: 'bg-green-100 text-green-700',
  busy: 'bg-amber-100 text-amber-700',
  maintenance: 'bg-red-100 text-red-700',
  offline: 'bg-slate-100 text-slate-700',
};

export default function VehicleCard({ vehicle }: VehicleCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-amber-500" />
          <span className="font-semibold text-slate-900">{vehicle.vehicleNumber}</span>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusColors[vehicle.status]}`}>
          {vehicle.status}
        </span>
      </div>
      <p className="text-sm text-slate-600 capitalize">{vehicle.brand} {vehicle.model} · {vehicle.vehicleType || vehicle.type}</p>
      <div className="mt-3 flex gap-4 text-sm text-slate-500">
        <span className="flex items-center gap-1"><Users className="h-4 w-4" />{vehicle.seatingCapacity} seats</span>
        <span className="flex items-center gap-1 capitalize"><Fuel className="h-4 w-4" />{vehicle.fuelType}</span>
      </div>
      {(vehicle.isVerified || vehicle.verificationStatus === 'approved') && (
        <span className="mt-2 inline-block rounded bg-green-50 px-2 py-0.5 text-xs text-green-700">Verified</span>
      )}
    </div>
  );
}
