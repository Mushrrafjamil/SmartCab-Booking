'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/services';
import PasswordStrength from '@/components/auth/PasswordStrength';
import FileUpload from '@/components/auth/FileUpload';
import { validateEmail, validatePhone, validatePassword, validateAadhaar, validatePan } from '@/lib/validation';
import { toast } from '@/components/auth/Toast';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

const STEPS = [
  'Personal Details',
  'Identity Verification',
  'Driving License',
  'Vehicle Details',
  'Vehicle Documents',
  'Profile & Bank',
  'Submit',
];

export default function DriverRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);

  const [personal, setPersonal] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '',
    dateOfBirth: '', gender: 'male', address: '', city: '', state: '', pincode: '',
  });
  const [identity, setIdentity] = useState({ aadhaarNumber: '', panNumber: '' });
  const [identityFiles, setIdentityFiles] = useState<Record<string, File | null>>({});
  const [license, setLicense] = useState({ licenseNumber: '', licenseExpiry: '' });
  const [licenseFiles, setLicenseFiles] = useState<Record<string, File | null>>({});
  const [vehicle, setVehicle] = useState({
    vehicleType: 'sedan', vehicleBrand: '', vehicleModel: '', vehicleNumber: '', vehicleColor: '', manufacturingYear: '',
  });
  const [vehicleDocs, setVehicleDocs] = useState<Record<string, File | null>>({});
  const [profile, setProfile] = useState({
    emergencyName: '', emergencyPhone: '', emergencyRelation: '', bankAccount: '', ifscCode: '', upiId: '',
  });
  const [profileFiles, setProfileFiles] = useState<Record<string, File | null>>({});

  const appendFiles = (fd: FormData, files: Record<string, File | null>) => {
    Object.entries(files).forEach(([k, f]) => { if (f) fd.append(k, f); });
  };

  const submitStep = async () => {
    setLoading(true);
    try {
      const fd = new FormData();
      if (step === 1) {
        if (!validatePassword(personal.password)) { toast.error('Weak password'); return; }
        if (personal.password !== personal.confirmPassword) { toast.error('Passwords do not match'); return; }
        Object.entries(personal).forEach(([k, v]) => fd.append(k, v));
        const { data } = await authService.registerDriverStep(1, fd);
        setUserId(data.userId);
        toast.success('Step 1 complete');
        setStep(2);
      } else if (step === 2) {
        if (!validateAadhaar(identity.aadhaarNumber)) { toast.error('Invalid Aadhaar'); return; }
        if (!validatePan(identity.panNumber)) { toast.error('Invalid PAN'); return; }
        fd.append('userId', userId);
        Object.entries(identity).forEach(([k, v]) => fd.append(k, v));
        appendFiles(fd, identityFiles);
        await authService.registerDriverStep(2, fd);
        toast.success('Identity documents saved');
        setStep(3);
      } else if (step === 3) {
        fd.append('userId', userId);
        Object.entries(license).forEach(([k, v]) => fd.append(k, v));
        appendFiles(fd, licenseFiles);
        await authService.registerDriverStep(3, fd);
        toast.success('License saved');
        setStep(4);
      } else if (step === 4) {
        fd.append('userId', userId);
        Object.entries(vehicle).forEach(([k, v]) => fd.append(k, v));
        await authService.registerDriverStep(4, fd);
        toast.success('Vehicle details saved');
        setStep(5);
      } else if (step === 5) {
        fd.append('userId', userId);
        appendFiles(fd, vehicleDocs);
        await authService.registerDriverStep(5, fd);
        toast.success('Vehicle documents saved');
        setStep(6);
      } else if (step === 6) {
        fd.append('userId', userId);
        Object.entries(profile).forEach(([k, v]) => fd.append(k, v));
        appendFiles(fd, profileFiles);
        await authService.registerDriverStep(6, fd);
        toast.success('Profile saved');
        setStep(7);
      } else if (step === 7) {
        fd.append('userId', userId);
        const { data } = await authService.registerDriverStep(7, fd);
        toast.success('Registration submitted for admin review!');
        if (data.devOtp) toast.info(`Verify phone OTP: ${data.devOtp}`);
        router.push(`/verify-otp?phone=${encodeURIComponent(personal.phone)}`);
      }
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  const input = (label: string, value: string, onChange: (v: string) => void, type = 'text') => (
    <div>
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Driver Registration</h1>
      <p className="text-sm text-slate-600">Complete all 7 steps to register as a driver</p>

      {/* Progress */}
      <div className="mt-6 flex items-center justify-between overflow-x-auto pb-2">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const done = n < step;
          const active = n === step;
          return (
            <div key={label} className="flex flex-col items-center gap-1 min-w-[60px]">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-green-500 text-white' : active ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                {done ? <Check className="h-4 w-4" /> : n}
              </div>
              <span className="hidden text-center text-[10px] text-slate-500 sm:block">{label}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Step {step}: {STEPS[step - 1]}</h2>

        {step === 1 && (
          <div className="space-y-4">
            {input('Full Name', personal.name, (v) => setPersonal({ ...personal, name: v }))}
            {input('Email', personal.email, (v) => setPersonal({ ...personal, email: v }), 'email')}
            {input('Mobile', personal.phone, (v) => setPersonal({ ...personal, phone: v }), 'tel')}
            {input('Password', personal.password, (v) => setPersonal({ ...personal, password: v }), 'password')}
            <PasswordStrength password={personal.password} />
            {input('Confirm Password', personal.confirmPassword, (v) => setPersonal({ ...personal, confirmPassword: v }), 'password')}
            {input('Date of Birth', personal.dateOfBirth, (v) => setPersonal({ ...personal, dateOfBirth: v }), 'date')}
            <div>
              <label className="block text-sm font-medium text-slate-700">Gender</label>
              <select value={personal.gender} onChange={(e) => setPersonal({ ...personal, gender: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5">
                <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
              </select>
            </div>
            {input('Address', personal.address, (v) => setPersonal({ ...personal, address: v }))}
            <div className="grid grid-cols-2 gap-4">
              {input('City', personal.city, (v) => setPersonal({ ...personal, city: v }))}
              {input('State', personal.state, (v) => setPersonal({ ...personal, state: v }))}
            </div>
            {input('Pincode', personal.pincode, (v) => setPersonal({ ...personal, pincode: v }))}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {input('Aadhaar Number', identity.aadhaarNumber, (v) => setIdentity({ ...identity, aadhaarNumber: v }))}
            <FileUpload label="Aadhaar Front" onChange={(f) => setIdentityFiles({ ...identityFiles, aadhaarFront: f })} />
            <FileUpload label="Aadhaar Back" onChange={(f) => setIdentityFiles({ ...identityFiles, aadhaarBack: f })} />
            {input('PAN Number', identity.panNumber, (v) => setIdentity({ ...identity, panNumber: v.toUpperCase() }))}
            <FileUpload label="PAN Card Image" onChange={(f) => setIdentityFiles({ ...identityFiles, panCardImage: f })} />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            {input('License Number', license.licenseNumber, (v) => setLicense({ ...license, licenseNumber: v }))}
            {input('License Expiry', license.licenseExpiry, (v) => setLicense({ ...license, licenseExpiry: v }), 'date')}
            <FileUpload label="License Front" onChange={(f) => setLicenseFiles({ ...licenseFiles, licenseFront: f })} />
            <FileUpload label="License Back" onChange={(f) => setLicenseFiles({ ...licenseFiles, licenseBack: f })} />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Vehicle Type</label>
              <select value={vehicle.vehicleType} onChange={(e) => setVehicle({ ...vehicle, vehicleType: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5">
                {['mini', 'sedan', 'suv', 'premium', 'auto'].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {input('Brand', vehicle.vehicleBrand, (v) => setVehicle({ ...vehicle, vehicleBrand: v }))}
            {input('Model', vehicle.vehicleModel, (v) => setVehicle({ ...vehicle, vehicleModel: v }))}
            {input('Vehicle Number', vehicle.vehicleNumber, (v) => setVehicle({ ...vehicle, vehicleNumber: v.toUpperCase() }))}
            {input('Color', vehicle.vehicleColor, (v) => setVehicle({ ...vehicle, vehicleColor: v }))}
            {input('Manufacturing Year', vehicle.manufacturingYear, (v) => setVehicle({ ...vehicle, manufacturingYear: v }), 'number')}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <FileUpload label="RC Book" onChange={(f) => setVehicleDocs({ ...vehicleDocs, rcBook: f })} accept="image/*,application/pdf" />
            <FileUpload label="Insurance Certificate" onChange={(f) => setVehicleDocs({ ...vehicleDocs, insuranceCertificate: f })} accept="image/*,application/pdf" />
            <FileUpload label="Pollution Certificate" onChange={(f) => setVehicleDocs({ ...vehicleDocs, pollutionCertificate: f })} accept="image/*,application/pdf" />
            <FileUpload label="Fitness Certificate (Optional)" onChange={(f) => setVehicleDocs({ ...vehicleDocs, fitnessCertificate: f })} accept="image/*,application/pdf" />
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <FileUpload label="Profile Photo" onChange={(f) => setProfileFiles({ ...profileFiles, profilePhoto: f })} />
            <FileUpload label="Selfie Verification" onChange={(f) => setProfileFiles({ ...profileFiles, selfieVerification: f })} />
            {input('Emergency Contact Name', profile.emergencyName, (v) => setProfile({ ...profile, emergencyName: v }))}
            {input('Emergency Contact Phone', profile.emergencyPhone, (v) => setProfile({ ...profile, emergencyPhone: v }), 'tel')}
            {input('Relation', profile.emergencyRelation, (v) => setProfile({ ...profile, emergencyRelation: v }))}
            {input('Bank Account Number', profile.bankAccount, (v) => setProfile({ ...profile, bankAccount: v }))}
            {input('IFSC Code', profile.ifscCode, (v) => setProfile({ ...profile, ifscCode: v.toUpperCase() }))}
            {input('UPI ID', profile.upiId, (v) => setProfile({ ...profile, upiId: v }))}
          </div>
        )}

        {step === 7 && (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <Check className="h-8 w-8 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold">Ready to Submit</h3>
            <p className="text-sm text-slate-600">Your application will be reviewed by our admin team. You&apos;ll receive a notification once approved.</p>
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <button type="button" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1 || loading}
            className="flex items-center gap-1 rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50">
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <button type="button" onClick={submitStep} disabled={loading}
            className="flex items-center gap-1 rounded-lg bg-amber-500 px-6 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
            {loading ? 'Saving...' : step === 7 ? 'Submit Application' : 'Next'} <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="mt-4 text-center text-sm text-slate-600">
        <Link href="/register" className="text-amber-600 hover:underline">Register as passenger instead</Link>
      </p>
    </div>
  );
}
