import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

import { SOCKET_URL } from '@/lib/config';

export function useGpsTracking(tripId: string, accessToken: string | null, active: boolean) {
  const [tracking, setTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active || !accessToken || !tripId) return;
    let mounted = true;
    let socket: Socket | undefined;
    let subscription: Location.LocationSubscription | undefined;

    (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error('Bạn cần cho phép truy cập vị trí để chạy chuyến.');
      socket = io(SOCKET_URL, { auth: { token: accessToken }, transports: ['websocket'] });
      socket.emit('join_trip', { tripId });
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 10000, distanceInterval: 30 },
        ({ coords, timestamp }) => socket?.emit('gps:update', {
          tripId, latitude: coords.latitude, longitude: coords.longitude,
          speedKmh: Math.max(0, (coords.speed || 0) * 3.6), headingDegree: coords.heading || 0,
          timestamp: new Date(timestamp).toISOString(),
        }),
      );
      if (mounted) { setTracking(true); setError(null); }
    })().catch((reason) => { if (mounted) setError(reason instanceof Error ? reason.message : 'Không thể bật GPS.'); });

    return () => { mounted = false; subscription?.remove(); socket?.disconnect(); setTracking(false); };
  }, [tripId, accessToken, active]);

  return { tracking: active && tracking, error };
}
