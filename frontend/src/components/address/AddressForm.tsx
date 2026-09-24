'use client';

import { useState } from 'react';
import { addressService } from '@/services';
import { toast } from '@/components/auth/Toast';
import AddressSearch from './AddressSearch';
import MapComponent from '@/components/MapComponent';
import type { Address } from '@/types';
import { Star, Trash2, Pencil, Share2, CheckCircle, Navigation } from 'lucide-react';

export interface AddressFormData {
  type: 'home' | 'office' | 'custom';
  customLabel?: string;
  displayLabel?: string;
  houseFlatNumber?: string;
  streetName?: string;
  areaLocality?: string;
  landmark?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  companyName?: string;
  buildingName?: string;
  floorNumber?: string;
  officeNumber?: string;
  fullAddress: string;
  lat: number;
  lng: number;
  isDefault?: boolean;
  isFavorite?: boolean;
}

const emptyForm = (type: 'home' | 'office' | 'custom'): AddressFormData => ({
  type,
  country: 'India',
  fullAddress: '',
  lat: 28.6139,
  lng: 77.209,
});

interface AddressFormProps {
  type: 'home' | 'office' | 'custom';
  initial?: Partial<AddressFormData>;
  addressId?: string;
  onSaved: () => void;
  onCancel: () => void;
}

export default function AddressForm({ type, initial, addressId, onSaved, onCancel }: AddressFormProps) {
  const [form, setForm] = useState<AddressFormData>({ ...emptyForm(type), ...initial, type });
  const [saving, setSaving] = useState(false);

  const setField = (key: keyof AddressFormData, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearchSelect = (r: {
    fullAddress: string; lat: number; lng: number;
    houseFlatNumber?: string; streetName?: string; areaLocality?: string;
    city?: string; state?: string; country?: string; pincode?: string;
  }) => {
    setForm((prev) => ({
      ...prev,
      fullAddress: r.fullAddress,
      lat: r.lat,
      lng: r.lng,
      houseFlatNumber: r.houseFlatNumber || prev.houseFlatNumber,
      streetName: r.streetName || prev.streetName,
      areaLocality: r.areaLocality || prev.areaLocality,
      city: r.city || prev.city,
      state: r.state || prev.state,
      country: r.country || prev.country,
      pincode: r.pincode || prev.pincode,
    }));
  };

  const handleSave = async () => {
    if (!form.fullAddress.trim()) {
      toast.error('Address is required');
      return;
    }
    setSaving(true);
    try {
      if (addressId) {
        await addressService.update(addressId, form);
        toast.success('Address updated');
      } else {
        await addressService.create(form);
        toast.success('Address saved');
      }
      onSaved();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to save';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500';

  return (
    <div className="space-y-4">
      <AddressSearch onSelect={handleSearchSelect} placeholder="Search and auto-fill address..." />

      {type === 'custom' && (
        <div>
          <label className="text-sm font-medium text-slate-700">Custom Label (Gym, School, Airport...)</label>
          <input value={form.customLabel || ''} onChange={(e) => setField('customLabel', e.target.value)} className={inputCls} placeholder="e.g. Gym, Friend's House" />
        </div>
      )}

      {type === 'office' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="text-sm font-medium text-slate-700">Company Name</label><input value={form.companyName || ''} onChange={(e) => setField('companyName', e.target.value)} className={inputCls} /></div>
          <div><label className="text-sm font-medium text-slate-700">Building Name</label><input value={form.buildingName || ''} onChange={(e) => setField('buildingName', e.target.value)} className={inputCls} /></div>
          <div><label className="text-sm font-medium text-slate-700">Floor Number</label><input value={form.floorNumber || ''} onChange={(e) => setField('floorNumber', e.target.value)} className={inputCls} /></div>
          <div><label className="text-sm font-medium text-slate-700">Office Number</label><input value={form.officeNumber || ''} onChange={(e) => setField('officeNumber', e.target.value)} className={inputCls} /></div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="text-sm font-medium text-slate-700">House/Flat No.</label><input value={form.houseFlatNumber || ''} onChange={(e) => setField('houseFlatNumber', e.target.value)} className={inputCls} /></div>
        <div><label className="text-sm font-medium text-slate-700">Street Name</label><input value={form.streetName || ''} onChange={(e) => setField('streetName', e.target.value)} className={inputCls} /></div>
        <div><label className="text-sm font-medium text-slate-700">Area/Locality</label><input value={form.areaLocality || ''} onChange={(e) => setField('areaLocality', e.target.value)} className={inputCls} /></div>
        <div><label className="text-sm font-medium text-slate-700">Landmark</label><input value={form.landmark || ''} onChange={(e) => setField('landmark', e.target.value)} className={inputCls} /></div>
        <div><label className="text-sm font-medium text-slate-700">City</label><input value={form.city || ''} onChange={(e) => setField('city', e.target.value)} className={inputCls} /></div>
        <div><label className="text-sm font-medium text-slate-700">State</label><input value={form.state || ''} onChange={(e) => setField('state', e.target.value)} className={inputCls} /></div>
        <div><label className="text-sm font-medium text-slate-700">Country</label><input value={form.country || 'India'} onChange={(e) => setField('country', e.target.value)} className={inputCls} /></div>
        <div><label className="text-sm font-medium text-slate-700">PIN/ZIP Code</label><input value={form.pincode || ''} onChange={(e) => setField('pincode', e.target.value)} className={inputCls} /></div>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">Full Address</label>
        <textarea value={form.fullAddress} onChange={(e) => setField('fullAddress', e.target.value)} rows={2} className={inputCls} />
      </div>

      <MapComponent
        pin={{ lat: form.lat, lng: form.lng }}
        onPinMove={(lat, lng) => { setField('lat', lat); setField('lng', lng); }}
        interactive
        className="h-[280px]"
        zoom={15}
      />
      <p className="text-xs text-slate-500">Click on map to set GPS coordinates · {form.lat.toFixed(5)}, {form.lng.toFixed(5)}</p>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={!!form.isDefault} onChange={(e) => setField('isDefault', e.target.checked)} />
        Set as default {type} address
      </label>

      <div className="flex gap-3">
        <button onClick={handleSave} disabled={saving} className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
          {saving ? 'Saving...' : addressId ? 'Update Address' : 'Save Address'}
        </button>
        <button onClick={onCancel} className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
      </div>
    </div>
  );
}

interface AddressCardProps {
  address: Address;
  onEdit: (address: Address) => void;
  onRefresh: () => void;
  onBook?: (address: Address) => void;
}

export function AddressCard({ address, onEdit, onRefresh, onBook }: AddressCardProps) {
  const id = address._id || address.id || '';

  const handleDelete = async () => {
    if (!confirm('Delete this address?')) return;
    await addressService.delete(id);
    toast.success('Address deleted');
    onRefresh();
  };

  const handleFavorite = async () => {
    await addressService.toggleFavorite(id);
    onRefresh();
  };

  const handleDefault = async (role: 'general' | 'pickup' | 'drop') => {
    await addressService.setDefault(id, role);
    toast.success('Default updated');
    onRefresh();
  };

  const handleShare = async () => {
    const { data } = await addressService.share(id);
    if (navigator.share) {
      await navigator.share({ title: 'My Address', text: data.share.text, url: data.share.mapsUrl });
    } else {
      await navigator.clipboard.writeText(data.share.mapsUrl);
      toast.success('Maps link copied');
    }
  };

  const handleVerify = async () => {
    await addressService.verify(id);
    toast.success('Address verified');
    onRefresh();
  };

  const typeLabel = address.type === 'custom' ? (address.customLabel || 'Custom') : address.type;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-700">{typeLabel}</span>
            {address.isDefault && <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">Default</span>}
            {address.isDefaultPickup && <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">Default Pickup</span>}
            {address.isDefaultDrop && <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">Default Drop</span>}
            {address.isVerified && <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">Verified</span>}
            {address.isFavorite && <Star className="h-4 w-4 fill-amber-400 text-amber-400" />}
          </div>
          <p className="mt-2 text-sm font-medium text-slate-900">{address.fullAddress}</p>
          <p className="mt-1 text-xs text-slate-500">{address.lat.toFixed(5)}, {address.lng.toFixed(5)} · Used {address.useCount || 0} times</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button onClick={handleFavorite} title="Favorite" className="rounded p-2 text-slate-400 hover:bg-slate-50 hover:text-amber-500"><Star className="h-4 w-4" /></button>
          <button onClick={() => onEdit(address)} title="Edit" className="rounded p-2 text-slate-400 hover:bg-slate-50"><Pencil className="h-4 w-4" /></button>
          <button onClick={handleShare} title="Share" className="rounded p-2 text-slate-400 hover:bg-slate-50"><Share2 className="h-4 w-4" /></button>
          <button onClick={handleDelete} title="Delete" className="rounded p-2 text-red-400 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {!address.isVerified && (
          <button onClick={handleVerify} className="flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50">
            <CheckCircle className="h-3 w-3" /> Verify
          </button>
        )}
        <button onClick={() => handleDefault('pickup')} className="rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50">Set Pickup Default</button>
        <button onClick={() => handleDefault('drop')} className="rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50">Set Drop Default</button>
        {onBook && (
          <button onClick={() => onBook(address)} className="flex items-center gap-1 rounded bg-amber-500 px-2 py-1 text-xs font-medium text-white hover:bg-amber-600">
            <Navigation className="h-3 w-3" /> Book Ride
          </button>
        )}
      </div>
    </div>
  );
}
