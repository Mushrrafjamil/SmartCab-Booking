import { io, Socket } from 'socket.io-client';

const SOCKET_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

let socket: Socket | null = null;

export const getSocket = () => {
  if (typeof window === 'undefined') return null;
  if (!socket) {
    socket = io(SOCKET_URL, { transports: ['websocket', 'polling'], autoConnect: true });
  }
  return socket;
};

export const joinRideRoom = (rideId: string) => {
  getSocket()?.emit('join:ride', rideId);
};

export const leaveRideRoom = (rideId: string) => {
  getSocket()?.emit('leave:ride', rideId);
};

export const onRideLocation = (cb: (data: { lat: number; lng: number; updatedAt?: string }) => void) => {
  getSocket()?.on('ride:location', cb);
  return () => { getSocket()?.off('ride:location', cb); };
};

export const onRideStatus = (cb: (data: { status: string; ride?: unknown; rideId?: string }) => void) => {
  getSocket()?.on('ride:status', cb);
  return () => { getSocket()?.off('ride:status', cb); };
};

export const joinDriverRoom = (userId: string) => {
  getSocket()?.emit('join:driver', userId);
};

export const leaveDriverRoom = (userId: string) => {
  getSocket()?.emit('leave:driver', userId);
};

export interface RideRequestPayload {
  rideId: string;
  ride?: {
    id: string;
    pickup: { address: string; lat?: number; lng?: number };
    destination: { address: string; lat?: number; lng?: number };
    fare?: { total?: number; finalFare?: number };
    vehicleType?: string;
  };
  expiresAt?: string;
  etaMinutes?: number;
  assignmentId?: string;
}

export const onRideRequest = (cb: (data: RideRequestPayload) => void) => {
  getSocket()?.on('ride:request', cb);
  return () => { getSocket()?.off('ride:request', cb); };
};

export const onRideAssigned = (cb: (data: { rideId: string; status: string; driverId?: string }) => void) => {
  getSocket()?.on('ride:assigned', cb);
  return () => { getSocket()?.off('ride:assigned', cb); };
};

export const joinUserRoom = (userId: string) => {
  getSocket()?.emit('join:user', userId);
};

export const leaveUserRoom = (userId: string) => {
  getSocket()?.emit('leave:user', userId);
};

export const onNotification = (cb: (data: { id: string; title: string; message: string; type: string }) => void) => {
  getSocket()?.on('notification:new', cb);
  return () => { getSocket()?.off('notification:new', cb); };
};
