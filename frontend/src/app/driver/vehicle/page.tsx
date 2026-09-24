'use client';

import { useCallback, useEffect, useState } from 'react';
import VehicleCard from '@/components/VehicleCard';
import { vehicleService } from '@/services';
import { toast } from '@/components/auth/Toast';
import { Vehicle } from '@/types';
import { Loader2 } from 'lucide-react';

const VEHICLE_TYPES = ['mini', 'sedan', 'suv', 'luxury', 'auto', 'bike', 'xl', 'premium', 'electric'];
const FUEL_TYPES = ['petrol', 'diesel', 'cng', 'electric'];

const emptyForm = {
  vehicleNumber: '',
  type: 'sedan',
  brand: '',
  model: '',
  color: '',
  seatingCapacity: '4',
  fuelType: 'petrol',
  insuranceNumber: '',
  rcBookNumber: '',
  pollutionCertificate: '',
};

export default function DriverVehiclePage() {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadVehicle = useCallback(async () => {
    try {
      const { data } = await vehicleService.getVehicle();
      setVehicle(data.vehicle);
    } catch {
      setVehicle(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadVehicle(); }, [loadVehicle]);

  const addVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await vehicleService.createVehicle({
        ...form,
        seatingCapacity: Number(form.seatingCapacity),
      });
      setVehicle(data.vehicle);
      toast.success(data.message || 'Vehicle added successfully');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to add vehicle';
      toast.error(msg);
    } finally {
      setSaving(false);
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
      <h1 className="mb-6 text-2xl font-bold text-slate-900">My Vehicle</h1>
      {vehicle ? (
        <VehicleCard vehicle={vehicle} />
      ) : (
        <form onSubmit={addVehicle} className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 font-semibold text-slate-900">Add Vehicle</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-slate-700">Vehicle Number *</label>
              <input required value={form.vehicleNumber} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value.toUpperCase() })}
                placeholder="KA-01-AB-1234" className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2" />
            </div>
            <div>
              <label className="block text-sm text-slate-700">Vehicle Type *</label>
              <select required value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 capitalize">
                {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-700">Brand *</label>
              <input required value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })}
                placeholder="Honda" className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2" />
            </div>
            <div>
              <label className="block text-sm text-slate-700">Model *</label>
              <input required value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })}
                placeholder="Amaze" className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2" />
            </div>
            <div>
              <label className="block text-sm text-slate-700">Color *</label>
              <input required value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}
                placeholder="White" className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2" />
            </div>
            <div>
              <label className="block text-sm text-slate-700">Seating Capacity *</label>
              <input required type="number" min={1} max={20} value={form.seatingCapacity}
                onChange={(e) => setForm({ ...form, seatingCapacity: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2" />
            </div>
            <div>
              <label className="block text-sm text-slate-700">Fuel Type *</label>
              <select required value={form.fuelType} onChange={(e) => setForm({ ...form, fuelType: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 capitalize">
                {FUEL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-700">Insurance Number *</label>
              <input required value={form.insuranceNumber} onChange={(e) => setForm({ ...form, insuranceNumber: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2" />
            </div>
            <div>
              <label className="block text-sm text-slate-700">RC Book Number *</label>
              <input required value={form.rcBookNumber} onChange={(e) => setForm({ ...form, rcBookNumber: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm text-slate-700">Pollution Certificate</label>
              <input value={form.pollutionCertificate} onChange={(e) => setForm({ ...form, pollutionCertificate: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2" />
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="mt-6 rounded-lg bg-amber-500 px-6 py-2.5 font-medium text-white hover:bg-amber-600 disabled:opacity-50">
            {saving ? 'Saving…' : 'Add Vehicle'}
          </button>
        </form>
      )}
    </div>
  );
}
