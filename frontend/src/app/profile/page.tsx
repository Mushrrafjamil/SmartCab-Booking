'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { userService } from '@/services';
import { useAuth } from '@/context/AuthContext';
import { getImageUrl } from '@/lib/images';
import { validateEmail, validatePhone, validatePassword } from '@/lib/validation';
import PasswordStrength from '@/components/auth/PasswordStrength';
import OtpInput from '@/components/auth/OtpInput';
import { toast } from '@/components/auth/Toast';
import type { EmergencyContact, User } from '@/types';
import {
  Camera, Mail, Phone, Lock, Users, Save, X, Pencil, Trash2, Star, User as UserIcon,
} from 'lucide-react';

type Tab = 'profile' | 'photo' | 'phone' | 'email' | 'password' | 'emergency';

const tabs: { id: Tab; label: string; icon: typeof UserIcon }[] = [
  { id: 'profile', label: 'Edit Profile', icon: UserIcon },
  { id: 'photo', label: 'Photo', icon: Camera },
  { id: 'phone', label: 'Mobile', icon: Phone },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'password', label: 'Password', icon: Lock },
  { id: 'emergency', label: 'Emergency', icon: Users },
];

export default function ProfilePage() {
  const { user: authUser, updateUser } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [loading, setLoading] = useState(true);

  const [nameForm, setNameForm] = useState('');
  const [originalName, setOriginalName] = useState('');

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newPhone, setNewPhone] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);

  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [contactForm, setContactForm] = useState({ name: '', phone: '', relation: '' });
  const [editingContactId, setEditingContactId] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      const { data } = await userService.getProfile();
      const u = data.user as User;
      setProfile(u);
      setNameForm(u.name || '');
      setOriginalName(u.name || '');
      setContacts(u.emergencyContacts || []);
      updateUser({
        id: u.id || u._id || '',
        name: u.name || '',
        email: u.email,
        phone: u.phone,
        role: u.role as 'passenger' | 'driver' | 'admin' | 'super_admin',
        profilePhoto: u.profilePhoto,
        walletBalance: u.walletBalance,
        isEmailVerified: u.isEmailVerified,
        isPhoneVerified: u.isPhoneVerified,
      });
    } catch {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [updateUser]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const syncUser = (u: User) => {
    setProfile(u);
    updateUser({
      id: u.id || u._id || authUser?.id || '',
      name: u.name || '',
      email: u.email,
      phone: u.phone,
      role: (u.role || authUser?.role || 'passenger') as 'passenger' | 'driver' | 'admin' | 'super_admin',
      profilePhoto: u.profilePhoto,
      walletBalance: u.walletBalance,
      isEmailVerified: u.isEmailVerified,
      isPhoneVerified: u.isPhoneVerified,
    });
  };

  const handleSaveName = async () => {
    if (!nameForm.trim()) {
      toast.error('Name is required');
      return;
    }
    try {
      const { data } = await userService.updateProfile({ name: nameForm.trim() });
      syncUser(data.user);
      setOriginalName(nameForm.trim());
      toast.success('Profile updated');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Update failed';
      toast.error(msg);
    }
  };

  const handlePhotoSelect = (file: File | null) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Max file size is 5MB');
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleUploadPhoto = async () => {
    if (!photoFile) return;
    const fd = new FormData();
    fd.append('profilePhoto', photoFile);
    try {
      const { data } = await userService.uploadProfilePhoto(fd);
      syncUser(data.user);
      setPhotoFile(null);
      setPhotoPreview(null);
      toast.success('Profile photo updated');
    } catch {
      toast.error('Failed to upload photo');
    }
  };

  const handleRemovePhoto = async () => {
    try {
      const { data } = await userService.removeProfilePhoto();
      syncUser(data.user);
      setPhotoPreview(null);
      setPhotoFile(null);
      toast.success('Photo removed');
    } catch {
      toast.error('Failed to remove photo');
    }
  };

  const sendPhoneOtp = async () => {
    if (!validatePhone(newPhone)) {
      toast.error('Enter a valid 10-digit mobile number');
      return;
    }
    try {
      const { data } = await userService.requestPhoneUpdateOtp(newPhone);
      setPhoneOtpSent(true);
      toast.success('OTP sent');
      if (data.devOtp) toast.info(`Dev OTP: ${data.devOtp}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to send OTP';
      toast.error(msg);
    }
  };

  const verifyPhoneUpdate = async () => {
    try {
      const { data } = await userService.updatePhone({ phone: newPhone, otp: phoneOtp });
      syncUser(data.user);
      setPhoneOtpSent(false);
      setPhoneOtp('');
      setNewPhone('');
      toast.success('Phone number updated');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Verification failed';
      toast.error(msg);
    }
  };

  const sendEmailOtp = async () => {
    if (!validateEmail(newEmail)) {
      toast.error('Enter a valid email address');
      return;
    }
    try {
      const { data } = await userService.requestEmailUpdateOtp(newEmail);
      setEmailOtpSent(true);
      toast.success('Verification code sent');
      if (data.devOtp) toast.info(`Dev OTP: ${data.devOtp}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to send code';
      toast.error(msg);
    }
  };

  const verifyEmailUpdate = async () => {
    try {
      const { data } = await userService.updateEmail({ email: newEmail, otp: emailOtp });
      syncUser(data.user);
      setEmailOtpSent(false);
      setEmailOtp('');
      setNewEmail('');
      toast.success('Email updated');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Verification failed';
      toast.error(msg);
    }
  };

  const handleChangePassword = async () => {
    if (!passwords.currentPassword || !passwords.newPassword) {
      toast.error('Fill all password fields');
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (!validatePassword(passwords.newPassword)) {
      toast.error('Password must include upper, lower, number & special char');
      return;
    }
    try {
      await userService.changePassword(passwords);
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed successfully');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Password change failed';
      toast.error(msg);
    }
  };

  const saveContact = async () => {
    if (!contactForm.name.trim() || !validatePhone(contactForm.phone) || !contactForm.relation.trim()) {
      toast.error('Fill all contact fields correctly');
      return;
    }
    try {
      if (editingContactId) {
        const { data } = await userService.updateEmergencyContact(editingContactId, contactForm);
        setContacts(data.emergencyContacts);
        toast.success('Contact updated');
      } else {
        const { data } = await userService.addEmergencyContact({
          ...contactForm,
          isPrimary: contacts.length === 0,
        });
        setContacts(data.emergencyContacts);
        toast.success('Contact added');
      }
      setContactForm({ name: '', phone: '', relation: '' });
      setEditingContactId(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to save contact';
      toast.error(msg);
    }
  };

  const deleteContact = async (id: string) => {
    try {
      const { data } = await userService.deleteEmergencyContact(id);
      setContacts(data.emergencyContacts);
      toast.success('Contact removed');
    } catch {
      toast.error('Failed to delete contact');
    }
  };

  const setPrimary = async (id: string) => {
    try {
      const { data } = await userService.setPrimaryEmergencyContact(id);
      setContacts(data.emergencyContacts);
      toast.success('Primary contact updated');
    } catch {
      toast.error('Failed to set primary contact');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  const displayPhoto = photoPreview || getImageUrl(profile?.profilePhoto);
  const displayName = profile?.name || 'User';

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            {displayPhoto ? (
              <img src={displayPhoto} alt={displayName} className="h-20 w-20 rounded-full object-cover ring-4 ring-amber-100" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-2xl font-bold text-amber-700 ring-4 ring-amber-50">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{displayName}</h1>
            <p className="text-sm text-slate-500">{profile?.email} · {profile?.phone}</p>
            <p className="text-xs text-slate-400">ID: {profile?.userId}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="flex flex-row gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                activeTab === id ? 'bg-amber-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {activeTab === 'profile' && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Personal Information</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700">Full Name</label>
                <input
                  value={nameForm}
                  onChange={(e) => setNameForm(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div className="mb-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Email</label>
                  <input value={profile?.email || ''} disabled className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-500" />
                  <p className="mt-1 text-xs text-slate-400">Update via Email tab</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Mobile</label>
                  <input value={profile?.phone || ''} disabled className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-500" />
                  <p className="mt-1 text-xs text-slate-400">Update via Mobile tab</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleSaveName} className="flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600">
                  <Save className="h-4 w-4" /> Save Changes
                </button>
                <button onClick={() => setNameForm(originalName)} className="flex items-center gap-2 rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  <X className="h-4 w-4" /> Cancel
                </button>
              </div>
            </div>
          )}

          {activeTab === 'photo' && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Profile Photo</h2>
              <div className="flex flex-col items-start gap-6 sm:flex-row">
                {displayPhoto ? (
                  <img src={displayPhoto} alt="Preview" className="h-32 w-32 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-xl bg-slate-100 text-4xl font-bold text-slate-400">
                    {displayName.charAt(0)}
                  </div>
                )}
                <div className="space-y-3">
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                    onChange={(e) => handlePhotoSelect(e.target.files?.[0] || null)} />
                  <button onClick={() => fileInputRef.current?.click()} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">
                    Choose Image
                  </button>
                  {photoFile && (
                    <button onClick={handleUploadPhoto} className="ml-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600">
                      Upload
                    </button>
                  )}
                  {profile?.profilePhoto && (
                    <button onClick={handleRemovePhoto} className="block text-sm text-red-600 hover:underline">Remove photo</button>
                  )}
                  <p className="text-xs text-slate-400">JPG, PNG, WEBP · Max 5MB</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'phone' && (
            <div>
              <h2 className="mb-1 text-lg font-semibold text-slate-900">Update Mobile Number</h2>
              <p className="mb-4 text-sm text-slate-500">Current: {profile?.phone}</p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700">New Mobile Number</label>
                <input type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} disabled={phoneOtpSent}
                  className="mt-1 w-full max-w-sm rounded-lg border border-slate-300 px-4 py-2.5 disabled:bg-slate-50" />
              </div>
              {!phoneOtpSent ? (
                <button onClick={sendPhoneOtp} className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600">
                  Send OTP
                </button>
              ) : (
                <div className="space-y-4">
                  <OtpInput value={phoneOtp} onChange={setPhoneOtp} />
                  <button onClick={verifyPhoneUpdate} disabled={phoneOtp.length < 6}
                    className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
                    Verify & Save
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'email' && (
            <div>
              <h2 className="mb-1 text-lg font-semibold text-slate-900">Update Email Address</h2>
              <p className="mb-4 text-sm text-slate-500">Current: {profile?.email}</p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700">New Email Address</label>
                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} disabled={emailOtpSent}
                  className="mt-1 w-full max-w-sm rounded-lg border border-slate-300 px-4 py-2.5 disabled:bg-slate-50" />
              </div>
              {!emailOtpSent ? (
                <button onClick={sendEmailOtp} className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600">
                  Send Verification Code
                </button>
              ) : (
                <div className="space-y-4">
                  <OtpInput value={emailOtp} onChange={setEmailOtp} />
                  <button onClick={verifyEmailUpdate} disabled={emailOtp.length < 6}
                    className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
                    Verify & Save
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'password' && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Change Password</h2>
              {(['currentPassword', 'newPassword', 'confirmPassword'] as const).map((field) => (
                <div key={field} className="mb-4 max-w-md">
                  <label className="block text-sm font-medium capitalize text-slate-700">
                    {field.replace(/([A-Z])/g, ' $1')}
                  </label>
                  <input type="password" value={passwords[field]}
                    onChange={(e) => setPasswords({ ...passwords, [field]: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5" />
                  {field === 'newPassword' && <PasswordStrength password={passwords.newPassword} />}
                </div>
              ))}
              <button onClick={handleChangePassword} className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600">
                Update Password
              </button>
            </div>
          )}

          {activeTab === 'emergency' && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Emergency Contacts</h2>
              <div className="mb-6 grid gap-3 sm:grid-cols-3">
                <input placeholder="Name" value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <input placeholder="Phone" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <input placeholder="Relation" value={contactForm.relation} onChange={(e) => setContactForm({ ...contactForm, relation: e.target.value })}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <button onClick={saveContact} className="mb-6 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600">
                {editingContactId ? 'Update Contact' : 'Add Contact'}
              </button>

              <div className="space-y-3">
                {contacts.map((c) => (
                  <div key={c._id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 p-4">
                    <div>
                      <p className="font-medium text-slate-900">
                        {c.name}
                        {c.isPrimary && <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">Primary</span>}
                      </p>
                      <p className="text-sm text-slate-500">{c.phone} · {c.relation}</p>
                    </div>
                    <div className="flex gap-2">
                      {!c.isPrimary && (
                        <button onClick={() => c._id && setPrimary(c._id)} title="Set primary" className="rounded p-2 text-amber-600 hover:bg-amber-50">
                          <Star className="h-4 w-4" />
                        </button>
                      )}
                      <button onClick={() => { setEditingContactId(c._id || null); setContactForm({ name: c.name, phone: c.phone, relation: c.relation }); }}
                        className="rounded p-2 text-slate-500 hover:bg-slate-50">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => c._id && deleteContact(c._id)} className="rounded p-2 text-red-500 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {contacts.length === 0 && <p className="text-sm text-slate-500">No emergency contacts added yet.</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
