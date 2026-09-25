export type User = { id: string; username: string; email?: string; fullName: string; role: string; phone?: string; permissions?: string[] };
export type Waypoint = {
  _id: string; sequence: number; name: string;
  type: 'PICKUP' | 'REST_STOP' | 'BORDER_CUSTOMS' | 'VET_CHECK' | 'DELIVERY';
  location: { coordinates: [number, number] }; estimatedArrival: string; actualArrival?: string;
  status: 'PENDING' | 'ARRIVED' | 'SKIPPED';
};
export type Order = {
  _id: string; bookingCode: string;
  origin: { address: string; countryCode: string; coordinates: [number, number] };
  destination: { address: string; countryCode: string; coordinates: [number, number] };
  requestedDepartureDate: string; horseIds: string[]; status: string;
};
export type TransportRoute = {
  _id: string; orderId: Order; vehiclePlateNumber: string; driverId: User | string; escortId: User | string;
  waypoints: Waypoint[];
  status: 'SCHEDULED' | 'IN_TRANSIT' | 'INCIDENT_HANDLING' | 'DELIVERING' | 'COMPLETED' | 'CANCELLED';
  currentLocation?: { coordinates: [number, number]; updatedAt: string } | null;
};
export type OfflineEvent = {
  event_id: string; event_type: 'WAYPOINT_CHECKIN' | 'SOS_TRIGGER'; payload: Record<string, unknown>;
};
