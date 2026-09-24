export interface User {
  _id?: string;
  id?: string;
  userId?: string;
  name?: string;
  fullName?: string;
  email: string;
  phone: string;
  role: 'passenger' | 'driver' | 'admin' | 'super_admin' | 'user';
  profilePhoto?: string;
  walletBalance: number;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  referralCode?: string;
  savedLocations?: SavedLocation[];
  emergencyContacts?: EmergencyContact[];
  notificationPreferences?: {
    email: boolean;
    sms: boolean;
    push: boolean;
    promotional: boolean;
  };
  createdAt?: string;
}

export interface EmergencyContact {
  _id?: string;
  name: string;
  phone: string;
  relation: string;
  isPrimary?: boolean;
}

export interface SavedLocation {
  _id?: string;
  label: 'home' | 'office' | 'custom';
  address: string;
  latitude: number;
  longitude: number;
  isDefault?: boolean;
}

export interface Address {
  _id?: string;
  id?: string;
  userId?: string;
  type: 'home' | 'office' | 'custom';
  customLabel?: string;
  displayLabel?: string;
  label?: string;
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
  accuracy?: number;
  isDefault?: boolean;
  isDefaultPickup?: boolean;
  isDefaultDrop?: boolean;
  isFavorite?: boolean;
  isVerified?: boolean;
  useCount?: number;
  lastUsedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GpsLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  signalStatus?: 'good' | 'fair' | 'poor' | 'offline';
  fullAddress?: string;
  houseFlatNumber?: string;
  streetName?: string;
  areaLocality?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  nearbyLandmarks?: string[];
}

export interface LocationHistoryEntry {
  _id: string;
  lat: number;
  lng: number;
  accuracy?: number;
  fullAddress: string;
  source: string;
  signalStatus: string;
  createdAt: string;
}

export interface Driver {
  _id: string;
  user?: User;
  userId?: User;
  licenseNumber?: string;
  licenseExpiry?: string;
  aadhaarNumber?: string;
  panNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  isOnline?: boolean;
  isApproved?: boolean;
  rating: number;
  ratingCount?: number;
  totalRides?: number;
  totalEarnings?: number;
  walletBalance?: number;
  vehicle?: Vehicle;
  vehicleId?: Vehicle;
  status: string;
  verificationStatus?: string;
  registrationStep?: number;
  documents?: Record<string, { label: string; url: string | null }>;
  currentLocation?: { lat: number; lng: number };
}

export interface Vehicle {
  _id: string;
  vehicleNumber: string;
  vehicleType?: 'mini' | 'sedan' | 'suv' | 'premium' | 'auto' | 'bike' | 'xl' | 'luxury' | 'electric';
  type?: string;
  brand?: string;
  model?: string;
  color?: string;
  seatingCapacity: number;
  fuelType: string;
  insuranceNumber?: string;
  rcBookNumber?: string;
  pollutionCertificate?: string;
  status: string;
  verificationStatus?: string;
  isVerified?: boolean;
}

export interface Location {
  address: string;
  latitude: number;
  longitude: number;
  lat?: number;
  lng?: number;
}

export interface FareBreakdown {
  baseFare: number;
  distanceCharge: number;
  timeCharge: number;
  nightCharge?: number;
  peakCharge?: number;
  tollTax?: number;
  waitingCharge?: number;
  surgeCharge?: number;
  surgeMultiplier?: number;
  gst: number;
  couponDiscount: number;
  finalFare?: number;
  total: number;
  capacity?: number;
  estimatedArrival?: number;
}

export interface Ride {
  _id: string;
  rideId: string;
  user?: User;
  passengerId?: User;
  driver?: Driver;
  vehicle?: Vehicle;
  pickup: Location;
  destination: Location;
  distance: number;
  duration: number;
  eta?: number;
  etaMinutes?: number;
  vehicleType: string;
  fare?: FareBreakdown;
  fareDetails?: FareBreakdown;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  isScheduled?: boolean;
  scheduledAt?: string;
  notes?: string;
  pickupNotes?: string;
  dropNotes?: string;
  otp?: string;
  driverLocation?: { latitude: number; longitude: number; updatedAt?: string };
  cancellationReason?: string;
  cancelledBy?: string;
  cancellationCharge?: number;
  invoiceNumber?: string;
  driverRating?: { rating: number; comment?: string };
  createdAt: string;
}

export interface Payment {
  _id: string;
  paymentId: string;
  transactionId?: string;
  invoiceNumber?: string;
  amount: number;
  taxAmount?: number;
  discountAmount?: number;
  couponCode?: string;
  method: string;
  status: string;
  refundStatus?: string;
  refundReason?: string;
  fareBreakdown?: FareBreakdown;
  rideId?: { _id: string; rideId?: string; pickup?: Location; destination?: Location; status?: string };
  paidAt?: string;
  createdAt?: string;
}

export interface Coupon {
  _id: string;
  code: string;
  description?: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  maxDiscount?: number;
  expiryDate: string;
}

export interface Notification {
  _id: string;
  title: string;
  message: string;
  type: string;
  channel?: string;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface WalletTransaction {
  _id: string;
  type: string;
  amount: number;
  balance: number;
  description: string;
  status: string;
  createdAt: string;
}

export interface Review {
  _id: string;
  rating: number;
  comment?: string;
  reviewType: string;
  reviewer: User;
  createdAt: string;
}
