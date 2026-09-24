'use client';

import { useEffect, useState } from 'react';
import { adminService } from '@/services';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/auth/Toast';
import { Plus, X, Loader2 } from 'lucide-react';

interface Driver {
  _id: string;
  verificationStatus: string;
  adminRemarks?: string;
  licenseNumber?: string;
  vehicleNumber?: string;
  registrationStep?: number;
  userId?: { name: string; email: string; phone: string };
}

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  licenseNumber: '',
  aadhaarNumber: '',
  panNumber: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  vehicleNumber: '',
  vehicleType: 'sedan',
  vehicleBrand: '',
  vehicleModel: '',
  vehicleColor: '',
  autoApprove: true,
};

export default function AdminDriversPage() {
  const { user } = useAuth();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filter, setFilter] = useState('all');
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);

  const canCreate = user && ['admin', 'super_admin'].includes(user.role);

  const load = () => {
    setLoading(true);
    adminService.getDrivers()
      .then(({ data }) => setDrivers(data.drivers || []))
      .catch(() => toast.error('Failed to load drivers'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const review = async (driverId: string, status: string) => {
    try {
      await adminService.reviewDriver(driverId, status, remarks[driverId] || '');
      toast.success(`Driver ${status}`);
      load();
    } catch {
      toast.error('Action failed');
    }
  };

  const createDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await adminService.createDriver(form);
      toast.success('Driver created successfully');
      setShowForm(false);
      setForm(emptyForm);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create driver';
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const filtered = drivers.filter((d) => filter === 'all' || d.verificationStatus === filter);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Driver Management</h1>
        {canCreate && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
          >
            <Plus className="h-4 w-4" /> Add Driver
          </button>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Create Driver</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={createDriver} className="grid gap-3 sm:grid-cols-2">
              {(['name', 'email', 'phone', 'password', 'licenseNumber', 'aadhaarNumber', 'panNumber'] as const).map((field) => (
                <div key={field}>
                  <label className="block text-xs font-medium capitalize text-slate-600">{field.replace(/([A-Z])/g, ' $1')}{['name', 'email', 'phone', 'password'].includes(field) ? ' *' : ''}</label>
                  <input
                    required={['name', 'email', 'phone', 'password'].includes(field)}
                    type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
                    value={form[field]}
                    onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              ))}
              {(['address', 'city', 'state', 'pincode', 'vehicleNumber', 'vehicleBrand', 'vehicleModel', 'vehicleColor'] as const).map((field) => (
                <div key={field}>
                  <label className="block text-xs font-medium capitalize text-slate-600">{field.replace(/([A-Z])/g, ' $1')}</label>
                  <input value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-slate-600">Vehicle Type</label>
                <select value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm capitalize">
                  {['sedan', 'suv', 'mini', 'auto', 'bike', 'xl', 'premium', 'luxury', 'electric'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <input type="checkbox" id="autoApprove" checked={form.autoApprove}
                  onChange={(e) => setForm({ ...form, autoApprove: e.target.checked })} />
                <label htmlFor="autoApprove" className="text-sm text-slate-600">Auto-approve driver and vehicle</label>
              </div>
              <div className="flex gap-2 sm:col-span-2">
                <button type="submit" disabled={creating}
                  className="rounded-lg bg-green-500 px-6 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50">
                  {creating ? 'Creating…' : 'Create Driver'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="rounded-lg border border-slate-300 px-6 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="mb-4 flex gap-2">
        {['all', 'pending', 'under_review', 'approved', 'rejected'].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-sm capitalize ${filter === f ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
      ) : (
        <div className="space-y-4">
          {filtered.map((d) => (
            <div key={d._id} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">{d.userId?.name}</p>
                  <p className="text-sm text-slate-500">{d.userId?.email} · {d.userId?.phone}</p>
                  <p className="mt-1 text-sm">License: {d.licenseNumber || '—'} · Vehicle: {d.vehicleNumber || '—'}</p>
                  <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs capitalize ${
                    d.verificationStatus === 'approved' ? 'bg-green-100 text-green-700' :
                    d.verificationStatus === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>{d.verificationStatus.replace('_', ' ')}</span>
                </div>
                {['pending', 'under_review'].includes(d.verificationStatus) && (
                  <div className="flex flex-col gap-2">
                    <input placeholder="Admin remarks" value={remarks[d._id] || ''}
                      onChange={(e) => setRemarks({ ...remarks, [d._id]: e.target.value })}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
                    <div className="flex gap-2">
                      <button onClick={() => review(d._id, 'approved')} className="rounded-lg bg-green-500 px-4 py-2 text-sm text-white">Approve</button>
                      <button onClick={() => review(d._id, 'rejected')} className="rounded-lg bg-red-500 px-4 py-2 text-sm text-white">Reject</button>
                      <button onClick={() => review(d._id, 'under_review')} className="rounded-lg bg-blue-500 px-4 py-2 text-sm text-white">Review</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-slate-500">No drivers found</p>}
        </div>
      )}
    </div>
  );
}
