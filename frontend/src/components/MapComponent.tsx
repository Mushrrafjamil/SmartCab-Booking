'use client';

import dynamic from 'next/dynamic';

const LeafletMap = dynamic(() => import('@/components/map/LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[300px] items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-500">
      Loading map...
    </div>
  ),
});

interface MapComponentProps {
  pickup?: { latitude: number; longitude: number; lat?: number; lng?: number };
  destination?: { latitude: number; longitude: number; lat?: number; lng?: number };
  driverLocation?: { latitude: number; longitude: number; lat?: number; lng?: number };
  pin?: { lat: number; lng: number };
  onPinMove?: (lat: number, lng: number) => void;
  interactive?: boolean;
  className?: string;
  zoom?: number;
}

const toPoint = (p?: { latitude?: number; longitude?: number; lat?: number; lng?: number }) =>
  p ? { lat: p.lat ?? p.latitude ?? 0, lng: p.lng ?? p.longitude ?? 0 } : undefined;

export default function MapComponent({
  pickup,
  destination,
  driverLocation,
  pin,
  onPinMove,
  interactive,
  className,
  zoom,
}: MapComponentProps) {
  const pickupPt = toPoint(pickup);
  const destPt = toPoint(destination);
  const driverPt = toPoint(driverLocation);
  const center = pin || pickupPt || destPt || { lat: 28.6139, lng: 77.209 };

  return (
    <LeafletMap
      center={center}
      pickup={pickupPt}
      destination={destPt}
      driverLocation={driverPt}
      pin={pin}
      onPinMove={onPinMove}
      interactive={interactive}
      className={className}
      zoom={zoom}
    />
  );
}
