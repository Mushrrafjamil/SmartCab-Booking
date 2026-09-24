'use client';

import { useCallback, useEffect, useState } from 'react';
import VehicleCard from '@/components/VehicleCard';
import { adminService } from '@/services';
import { toast } from '@/components/auth/Toast';
import { Vehicle } from '@/types';
import { Loader2 } from 'lucide-react';

export default function AdminVehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    adminService.getPendingVehicles()
      .then(({ data }) => setVehicles(data.vehicles || []))
      .catch(() => toast.error('Failed to load vehicles'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const verify = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await adminService.approveVehicle(id, status);
      toast.success(`Vehicle ${status}`);
      load();
    } catch {
      toast.error('Action failed');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Vehicle Management</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {vehicles.map((v) => (
          <div key={v._id}>
            <VehicleCard vehicle={v} />
            {v.verificationStatus !== 'approved' && (
              <div className="mt-2 flex gap-2">
                <button onClick={() => verify(v._id, 'approved')}
                  className="flex-1 rounded-lg bg-green-500 py-2 text-sm text-white hover:bg-green-600">Approve</button>
                <button onClick={() => verify(v._id, 'rejected')}
                  className="flex-1 rounded-lg bg-red-500 py-2 text-sm text-white hover:bg-red-600">Reject</button>
              </div>
            )}
          </div>
        ))}
      </div>
      {vehicles.length === 0 && <p className="text-center text-slate-500">No pending vehicles</p>}
    </div>
  );
}
