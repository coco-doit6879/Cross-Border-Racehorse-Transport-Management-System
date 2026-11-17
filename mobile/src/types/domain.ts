export type User = { id: string; username: string; email?: string; fullName: string; role: string; phone?: string; permissions?: string[] };
export type Waypoint = {
  demoDepartedAt?: string;
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
  demoSimulation?: boolean;
  _id: string; orderId: Order; vehiclePlateNumber: string; driverId: User | string; escortId: User | string;
  waypoints: Waypoint[];
  status: 'SCHEDULED' | 'IN_TRANSIT' | 'INCIDENT_HANDLING' | 'DELIVERING' | 'COMPLETED' | 'CANCELLED';
  currentLocation?: { coordinates: [number, number]; updatedAt: string } | null;
};
export type OfflineEvent = {
  event_id: string; event_type: 'WAYPOINT_CHECKIN' | 'SOS_TRIGGER' | 'HEALTH_LOG'; payload: Record<string, unknown>;
};
export type HealthLog = {
  _id: string; eventId: string; tripId: string;
  horseId: { _id: string; name: string } | string;
  recordedBy?: { fullName?: string } | string;
  temperatureCelsius: number; waterIntakeLiters: number; foodIntakeStatus: string;
  condition: 'STABLE' | 'STRESSED' | 'UNSTABLE';
  alertType: 'NONE' | 'FEVER' | 'INJURED' | 'DEHYDRATION';
  notes?: string; recordedAt: string; hasPhoto?: boolean; photoPath?: string | null;
};
