'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MapComponent from '@/components/MapComponent';
import AddressSearch from '@/components/address/AddressSearch';
import { rideService, addressService, couponService } from '@/services';
import { toast } from '@/components/auth/Toast';
import type { Address, FareBreakdown } from '@/types';
import { Navigation, MapPin, Home, Building2, Star, ChevronRight, ChevronLeft, Clock, Tag } from 'lucide-react';

const VEHICLES = [
  { id: 'bike', label: 'Bike', capacity: 1, icon: '🏍️' },
  { id: 'auto', label: 'Auto', capacity: 3, icon: '🛺' },
  { id: 'mini', label: 'Mini', capacity: 4, icon: '🚗' },
  { id: 'sedan', label: 'Sedan', capacity: 4, icon: '🚙' },
  { id: 'suv', label: 'SUV', capacity: 6, icon: '🚐' },
  { id: 'xl', label: 'XL', capacity: 7, icon: '🚌' },
  { id: 'premium', label: 'Luxury', capacity: 4, icon: '✨' },
  { id: 'electric', label: 'Electric', capacity: 4, icon: '⚡' },
];

interface Point { address: string; lat: number; lng: number; }

function BookRideForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [pickup, setPickup] = useState<Point>({ address: '', lat: 28.6139, lng: 77.209 });
  const [destination, setDestination] = useState<Point>({ address: '', lat: 28.5355, lng: 77.391 });
  const [vehicleType, setVehicleType] = useState('mini');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [notes, setNotes] = useState('');
  const [pickupNotes, setPickupNotes] = useState('');
  const [dropNotes, setDropNotes] = useState('');
  const [landmark, setLandmark] = useState('');
  const [gateNumber, setGateNumber] = useState('');
  const [route, setRoute] = useState<{ distanceKm: number; durationMinutes: number } | null>(null);
  const [allFares, setAllFares] = useState<Record<string, FareBreakdown>>({});
  const [nearbyDrivers, setNearbyDrivers] = useState(0);
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  useEffect(() => {
    const pAddr = searchParams.get('pickup');
    const pLat = searchParams.get('pickupLat');
    const pLng = searchParams.get('pickupLng');
    if (pAddr && pLat && pLng) setPickup({ address: pAddr, lat: parseFloat(pLat), lng: parseFloat(pLng) });
    addressService.getRecommendations().then(({ data }) => {
      const rec = data.recommendations;
      const all = [...(rec?.defaults || []), ...(rec?.favorites || []), ...(rec?.recent || [])];
      setSavedAddresses(all.filter((a: Address, i: number, arr: Address[]) =>
        arr.findIndex((b) => (b._id || b.id) === (a._id || a.id)) === i));
      const dp = rec?.defaults?.find((a: Address) => a.isDefaultPickup);
      if (dp && !pAddr) setPickup({ address: dp.fullAddress, lat: dp.lat, lng: dp.lng });
    }).catch(() => {});
  }, [searchParams]);

  const fetchEstimate = useCallback(async () => {
    if (!pickup.address || !destination.address) return;
    try {
      const { data } = await rideService.estimateFare({
        pickup, destination, vehicleType, couponCode: couponCode || undefined,
      });
      setRoute(data.route);
      setAllFares(data.allVehicles || {});
      setNearbyDrivers(data.nearbyDrivers || 0);
      if (data.couponError) toast.error(data.couponError);
    } catch { /* silent */ }
  }, [pickup, destination, vehicleType, couponCode]);

  useEffect(() => { if (step >= 2) fetchEstimate(); }, [step, fetchEstimate]);

  const detectGps = (target: 'pickup' | 'destination') => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { data } = await addressService.detectGps(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
          const pt = { address: data.location.fullAddress, lat: data.location.lat, lng: data.location.lng };
          target === 'pickup' ? setPickup(pt) : setDestination(pt);
          toast.success('Location detected');
        } catch {
          const pt = { address: `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`, lat: pos.coords.latitude, lng: pos.coords.longitude };
          target === 'pickup' ? setPickup(pt) : setDestination(pt);
        } finally { setGpsLoading(false); }
      },
      () => { toast.error('Location permission denied'); setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const applyAddress = (addr: Address, target: 'pickup' | 'destination') => {
    const pt = { address: addr.fullAddress, lat: addr.lat, lng: addr.lng };
    target === 'pickup' ? setPickup(pt) : setDestination(pt);
    const id = addr._id || addr.id;
    if (id) addressService.recordUsage(id);
  };

  const validateCoupon = async () => {
    if (!couponCode) return;
    try {
      const fare = allFares[vehicleType]?.finalFare || allFares[vehicleType]?.total || 100;
      const { data } = await couponService.validateCoupon(couponCode, fare);
      setCouponDiscount(data.discount || data.data?.discount || 0);
      toast.success(`Coupon applied! Save ₹${data.discount || data.data?.discount || 0}`);
      fetchEstimate();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Invalid coupon';
      toast.error(msg);
    }
  };

  const selectedFare = allFares[vehicleType];

  const handleBook = async () => {
    setLoading(true);
    try {
      const { data } = await rideService.bookRide({
        pickup, destination, vehicleType, paymentMethod, couponCode: couponCode || undefined,
        isScheduled, scheduledAt: isScheduled ? scheduledAt : undefined,
        notes, pickupNotes, dropNotes, landmark, gateNumber,
        distance: route?.distanceKm, duration: route?.durationMinutes,
      });
      const rideId = data.ride?._id || data.data?._id;
      toast.success(isScheduled ? 'Ride scheduled!' : 'Ride booked! Finding driver...');
      router.push(`/ride-tracking/${rideId}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Booking failed. Please login.';
      toast.error(msg);
    } finally { setLoading(false); }
  };

  const iconForType = (type: string) => type === 'home' ? <Home className="h-3 w-3" /> : type === 'office' ? <Building2 className="h-3 w-3" /> : <MapPin className="h-3 w-3" />;

  const steps = ['Location', 'Vehicle & Fare', 'Confirm'];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Book a Ride</h1>
      <div className="mb-6 flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500'}`}>{i + 1}</span>
            <span className={`text-sm ${step === i + 1 ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>{s}</span>
            {i < steps.length - 1 && <ChevronRight className="h-4 w-4 text-slate-300" />}
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          {step === 1 && (
            <>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">Pickup Location</label>
                  <button onClick={() => detectGps('pickup')} disabled={gpsLoading} className="flex items-center gap-1 text-xs text-amber-600 hover:underline">
                    <Navigation className="h-3 w-3" /> GPS
                  </button>
                </div>
                <AddressSearch placeholder="Search pickup..." onSelect={(r) => setPickup({ address: r.fullAddress, lat: r.lat, lng: r.lng })} />
                <input value={pickup.address} onChange={(e) => setPickup({ ...pickup, address: e.target.value })}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-amber-500 focus:outline-none" />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">Drop Location</label>
                  <button onClick={() => detectGps('destination')} disabled={gpsLoading} className="flex items-center gap-1 text-xs text-amber-600 hover:underline">
                    <Navigation className="h-3 w-3" /> GPS
                  </button>
                </div>
                <AddressSearch placeholder="Search destination..." onSelect={(r) => setDestination({ address: r.fullAddress, lat: r.lat, lng: r.lng })} />
                <input value={destination.address} onChange={(e) => setDestination({ ...destination, address: e.target.value })}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-amber-500 focus:outline-none" />
              </div>
              {savedAddresses.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-slate-500">Saved & Recent</p>
                  <div className="flex flex-wrap gap-2">
                    {savedAddresses.slice(0, 8).map((a) => (
                      <button key={a._id || a.id} type="button" onClick={() => applyAddress(a, 'pickup')}
                        className="flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs hover:border-amber-400 hover:bg-amber-50">
                        {iconForType(a.type)} {a.type === 'custom' ? a.customLabel : a.type}
                        {a.isFavorite && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={() => { if (!pickup.address || !destination.address) { toast.error('Enter both locations'); return; } setStep(2); }}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 py-3 font-semibold text-white hover:bg-amber-600">
                Continue <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}

          {step === 2 && (
            <>
              {route && (
                <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
                  <span className="font-medium">{route.distanceKm} km</span> · ~{route.durationMinutes} min · {nearbyDrivers} drivers nearby
                </div>
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                {VEHICLES.map((v) => {
                  const fare = allFares[v.id];
                  return (
                    <button key={v.id} type="button" onClick={() => setVehicleType(v.id)}
                      className={`rounded-xl border p-3 text-left transition ${vehicleType === v.id ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-200' : 'border-slate-200 hover:border-slate-300'}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-lg">{v.icon}</span>
                        <span className="font-bold text-slate-900">₹{fare?.finalFare || fare?.total || '—'}</span>
                      </div>
                      <p className="mt-1 font-medium text-slate-900">{v.label}</p>
                      <p className="text-xs text-slate-500">{v.capacity} seats · ~{fare?.estimatedArrival || 5} min away</p>
                    </button>
                  );
                })}
              </div>
              {selectedFare && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                  <h3 className="mb-2 font-semibold">Fare Breakdown</h3>
                  {[
                    ['Base Fare', selectedFare.baseFare], ['Distance', selectedFare.distanceCharge],
                    ['Time', selectedFare.timeCharge], ['Peak', selectedFare.peakCharge],
                    ['Night', selectedFare.nightCharge], ['Toll', selectedFare.tollTax],
                    ['Surge', selectedFare.surgeCharge], ['GST (5%)', selectedFare.gst],
                    ['Discount', -(selectedFare.couponDiscount || 0)],
                  ].filter(([, v]) => v).map(([label, val]) => (
                    <div key={label as string} className="flex justify-between py-0.5 text-slate-600">
                      <span>{label}</span><span>₹{val}</span>
                    </div>
                  ))}
                  <div className="mt-2 flex justify-between border-t pt-2 font-bold text-slate-900">
                    <span>Total</span><span>₹{selectedFare.finalFare || selectedFare.total}</span>
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-300 py-3 font-medium hover:bg-slate-50">
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
                <button onClick={() => setStep(3)} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-amber-500 py-3 font-semibold text-white hover:bg-amber-600">
                  Continue <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                <p><strong>From:</strong> {pickup.address}</p>
                <p className="mt-1"><strong>To:</strong> {destination.address}</p>
                <p className="mt-1"><strong>Vehicle:</strong> {VEHICLES.find((v) => v.id === vehicleType)?.label} · ₹{selectedFare?.finalFare || selectedFare?.total}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">Payment</label>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm">
                    <option value="cash">Cash</option><option value="upi">UPI</option><option value="wallet">Wallet</option><option value="card">Card</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Coupon</label>
                  <div className="mt-1 flex gap-2">
                    <input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="PROMO"
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
                    <button onClick={validateCoupon} className="rounded-lg bg-slate-100 px-3 text-sm font-medium hover:bg-slate-200"><Tag className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isScheduled} onChange={(e) => setIsScheduled(e.target.checked)} />
                <Clock className="h-4 w-4 text-slate-400" /> Schedule for later
              </label>
              {isScheduled && <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />}
              <input value={pickupNotes} onChange={(e) => setPickupNotes(e.target.value)} placeholder="Pickup instructions (gate, landmark...)" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
              <input value={dropNotes} onChange={(e) => setDropNotes(e.target.value)} placeholder="Drop instructions" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="Landmark" className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
                <input value={gateNumber} onChange={(e) => setGateNumber(e.target.value)} placeholder="Gate/Apt No." className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
              </div>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes for driver (optional)" rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-300 py-3 font-medium hover:bg-slate-50">
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
                <button onClick={handleBook} disabled={loading}
                  className="flex flex-1 items-center justify-center rounded-lg bg-amber-500 py-3 font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
                  {loading ? 'Booking...' : isScheduled ? 'Schedule Ride' : 'Book Now'}
                </button>
              </div>
            </>
          )}
        </div>

        <MapComponent
          pickup={{ latitude: pickup.lat, longitude: pickup.lng }}
          destination={{ latitude: destination.lat, longitude: destination.lng }}
          className="h-[500px] lg:sticky lg:top-24"
        />
      </div>
    </div>
  );
}

export default function BookRidePage() {
  return (
    <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center">Loading...</div>}>
      <BookRideForm />
    </Suspense>
  );
}
