'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import { defaultIcon, pickupIcon, dropIcon, pinIcon } from '@/lib/mapIcons';

interface MapPoint {
  lat: number;
  lng: number;
  label?: string;
}

interface LeafletMapProps {
  center?: MapPoint;
  pickup?: MapPoint;
  destination?: MapPoint;
  pin?: MapPoint;
  driverLocation?: MapPoint;
  onPinMove?: (lat: number, lng: number) => void;
  interactive?: boolean;
  className?: string;
  zoom?: number;
}

function MapController({ center, zoom }: { center: LatLngExpression; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
}

function PinMover({ onPinMove }: { onPinMove?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPinMove?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LeafletMap({
  center = { lat: 28.6139, lng: 77.209 },
  pickup,
  destination,
  pin,
  driverLocation,
  onPinMove,
  interactive = true,
  className = 'h-[400px]',
  zoom = 13,
}: LeafletMapProps) {
  const mapCenter: LatLngExpression = [
    pin?.lat ?? pickup?.lat ?? center.lat,
    pin?.lng ?? pickup?.lng ?? center.lng,
  ];

  const route: LatLngExpression[] = [];
  if (pickup) route.push([pickup.lat, pickup.lng]);
  if (destination) route.push([destination.lat, destination.lng]);

  return (
    <div className={`overflow-hidden rounded-xl border border-slate-200 ${className}`}>
      <MapContainer center={mapCenter} zoom={zoom} className="h-full w-full" scrollWheelZoom={interactive}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController center={mapCenter} zoom={zoom} />
        {interactive && onPinMove && <PinMover onPinMove={onPinMove} />}

        {pickup && (
          <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}>
            {pickup.label && <div />}</Marker>
        )}
        {destination && (
          <Marker position={[destination.lat, destination.lng]} icon={dropIcon} />
        )}
        {pin && <Marker position={[pin.lat, pin.lng]} icon={pinIcon} />}
        {driverLocation && (
          <Marker position={[driverLocation.lat, driverLocation.lng]} icon={defaultIcon} />
        )}
        {route.length === 2 && (
          <Polyline positions={route} pathOptions={{ color: '#f59e0b', weight: 4, opacity: 0.8, dashArray: '8 8' }} />
        )}
      </MapContainer>
    </div>
  );
}
