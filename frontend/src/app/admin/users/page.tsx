'use client';

import { useEffect, useState } from 'react';
import api from '@/services/api';
import { toast } from '@/components/auth/Toast';

interface User {
  _id: string;
  userId?: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isSuspended?: boolean;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');

  const load = (q = '') => {
    const url = q ? `/admin/users/search?q=${encodeURIComponent(q)}` : '/admin/users';
    api.get(url).then(({ data }) => setUsers(data.data || data.users || [])).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const suspend = async (id: string) => {
    await api.put(`/admin/users/${id}/suspend`);
    toast.success('Account status updated');
    load(search);
  };

  const forceLogout = async (id: string) => {
    await api.post(`/admin/users/${id}/force-logout`);
    toast.success('Forced logout');
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">User Management</h1>
      <div className="mb-4 flex gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, phone..."
          className="flex-1 rounded-lg border border-slate-300 px-4 py-2" />
        <button onClick={() => load(search)} className="rounded-lg bg-amber-500 px-4 py-2 text-white">Search</button>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Verified</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id} className="border-b">
                <td className="px-4 py-3">
                  <p className="font-medium">{u.name}</p>
                  <p className="text-xs text-slate-500">{u.email} · {u.phone}</p>
                </td>
                <td className="px-4 py-3 capitalize">{u.role}</td>
                <td className="px-4 py-3">
                  {u.isEmailVerified && u.isPhoneVerified ? '✓ Both' : u.isEmailVerified ? 'Email' : u.isPhoneVerified ? 'Phone' : 'None'}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${u.isSuspended ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {u.isSuspended ? 'Suspended' : 'Active'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => suspend(u._id)} className="text-xs text-amber-600 hover:underline">
                      {u.isSuspended ? 'Activate' : 'Suspend'}
                    </button>
                    <button onClick={() => forceLogout(u._id)} className="text-xs text-red-600 hover:underline">Force Logout</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <p className="p-8 text-center text-slate-500">No users found</p>}
      </div>
    </div>
  );
}
