import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatusBadge } from '@/components/StatusBadge';
import { useSession } from '@/context/session';
import { useGpsTracking } from '@/hooks/useGpsTracking';
import { enqueueOfflineEvent, newEventId } from '@/lib/offlineQueue';
import { colors } from '@/theme';
import type { TransportRoute, Waypoint } from '@/types/domain';

const nextStatus: Partial<Record<TransportRoute['status'], { status: TransportRoute['status']; label: string }>> = {
  SCHEDULED: { status: 'IN_TRANSIT', label: 'Bắt đầu chuyến' },
  IN_TRANSIT: { status: 'DELIVERING', label: 'Bắt đầu bàn giao' },
  INCIDENT_HANDLING: { status: 'IN_TRANSIT', label: 'Tiếp tục hành trình' },
  DELIVERING: { status: 'COMPLETED', label: 'Hoàn thành chuyến' },
};

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { apiFetch, accessToken } = useSession();
  const [route, setRoute] = useState<TransportRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState('');
  const active = !!route && ['IN_TRANSIT', 'INCIDENT_HANDLING', 'DELIVERING'].includes(route.status);
  const gps = useGpsTracking(id, accessToken, active);

  const load = useCallback(async () => {
    try { const body = await apiFetch<{ data: TransportRoute }>(`/routes/${id}`); setRoute(body.data); }
    catch (reason) { setNotice(reason instanceof Error ? reason.message : 'Không thể tải chuyến.'); }
    finally { setLoading(false); }
  }, [apiFetch, id]);
  useEffect(() => {
    // Initial network hydration belongs to this screen lifecycle.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const changeStatus = async () => {
    if (!route || !nextStatus[route.status]) return;
    const target = nextStatus[route.status]!; setWorking(true); setNotice('');
    try {
      const body = await apiFetch<{ data: TransportRoute }>(`/routes/${route._id}/status`, { method: 'PATCH', body: JSON.stringify({ status: target.status }) });
      setRoute(body.data); setNotice('Đã cập nhật trạng thái chuyến.');
    } catch (reason) { Alert.alert('Không thể cập nhật', reason instanceof Error ? reason.message : 'Vui lòng thử lại.'); }
    finally { setWorking(false); }
  };

  const checkIn = async (waypoint: Waypoint) => {
    if (!route) return;
    const event = { event_id: newEventId('waypoint'), event_type: 'WAYPOINT_CHECKIN' as const, payload: { tripId: route._id, waypointId: waypoint._id, sequence: waypoint.sequence, status: 'ARRIVED', recordedAt: new Date().toISOString() } };
    setWorking(true);
    try {
      const body = await apiFetch<{ data: TransportRoute }>(`/routes/${route._id}/waypoint-checkin`, { method: 'PATCH', body: JSON.stringify(event.payload) });
      setRoute(body.data); setNotice(`Đã check-in ${waypoint.name}.`);
    } catch {
      await enqueueOfflineEvent(event);
      setRoute({ ...route, waypoints: route.waypoints.map((item) => item._id === waypoint._id ? { ...item, status: 'ARRIVED', actualArrival: new Date().toISOString() } : item) });
      setNotice('Mất kết nối: đã lưu check-in, ứng dụng sẽ tự đồng bộ.');
    } finally { setWorking(false); }
  };

  const openMap = (waypoint: Waypoint) => {
    const [lng, lat] = waypoint.location.coordinates;
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (!route) return <SafeAreaView style={styles.center}><Text style={styles.error}>{notice || 'Không tìm thấy chuyến.'}</Text><Pressable onPress={() => router.back()}><Text style={styles.link}>Quay lại</Text></Pressable></SafeAreaView>;
  const action = nextStatus[route.status];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}><Pressable onPress={() => router.back()}><Text style={styles.back}>‹</Text></Pressable><View style={{ flex: 1 }}><Text style={styles.headerCode}>{route.orderId.bookingCode}</Text><Text style={styles.headerTitle}>Chi tiết chuyến</Text></View><StatusBadge status={route.status} /></View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Lộ trình</Text><Text style={styles.place}>{route.orderId.origin.address}</Text><Text style={styles.line}>│</Text><Text style={styles.place}>{route.orderId.destination.address}</Text>
          <View style={styles.infoRow}><Text style={styles.muted}>Biển số xe</Text><Text style={styles.value}>{route.vehiclePlateNumber}</Text></View>
          <View style={styles.infoRow}><Text style={styles.muted}>Số ngựa</Text><Text style={styles.value}>{route.orderId.horseIds.length}</Text></View>
          <View style={styles.infoRow}><Text style={styles.muted}>Khởi hành</Text><Text style={styles.value}>{new Date(route.orderId.requestedDepartureDate).toLocaleString('vi-VN')}</Text></View>
        </View>

        <View style={styles.gpsCard}><View><Text style={styles.gpsTitle}>● Theo dõi GPS</Text><Text style={styles.muted}>{active ? (gps.tracking ? 'Đang gửi vị trí mỗi 10 giây' : 'Đang kết nối vị trí…') : 'Tự bật khi bắt đầu chuyến'}</Text></View></View>
        {!!gps.error && <Text style={styles.error}>{gps.error}</Text>}
        {!!notice && <Text style={styles.notice}>{notice}</Text>}

        <Text style={styles.sectionHeading}>Các điểm trên hành trình</Text>
        {route.waypoints.sort((a, b) => a.sequence - b.sequence).map((waypoint) => (
          <View style={styles.waypoint} key={waypoint._id}>
            <View style={[styles.dot, waypoint.status === 'ARRIVED' && styles.dotDone]}><Text style={styles.dotText}>{waypoint.status === 'ARRIVED' ? '✓' : waypoint.sequence}</Text></View>
            <View style={{ flex: 1 }}><Text style={styles.waypointName}>{waypoint.name}</Text><Text style={styles.muted}>{waypoint.type.replaceAll('_', ' ')} · {new Date(waypoint.estimatedArrival).toLocaleString('vi-VN')}</Text>
              <View style={styles.row}><Pressable onPress={() => openMap(waypoint)}><Text style={styles.mapLink}>Mở chỉ đường</Text></Pressable>{waypoint.status === 'PENDING' && <Pressable disabled={working} style={styles.checkButton} onPress={() => checkIn(waypoint)}><Text style={styles.checkText}>Check-in</Text></Pressable>}</View>
            </View>
          </View>
        ))}

        <Pressable style={styles.sos} onPress={() => router.push({ pathname: '/(driver)/sos', params: { tripId: route._id, code: route.orderId.bookingCode } })}><Text style={styles.sosText}>SOS · Báo sự cố khẩn cấp</Text></Pressable>
        {action && <Pressable style={[styles.primary, working && { opacity: 0.6 }]} disabled={working} onPress={changeStatus}>{working ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{action.label}</Text>}</Pressable>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.border, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }, back: { fontSize: 38, color: colors.navy, lineHeight: 38 }, headerCode: { color: colors.primary, fontWeight: '800' }, headerTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  content: { padding: 18, gap: 14, paddingBottom: 42 }, card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: colors.border }, sectionTitle: { color: colors.muted, fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 },
  place: { fontSize: 17, fontWeight: '800', color: colors.text }, line: { color: colors.primary, marginVertical: 5 }, infoRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', gap: 14 }, muted: { color: colors.muted, fontSize: 13 }, value: { color: colors.text, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  gpsCard: { backgroundColor: '#ECFDF5', borderRadius: 14, padding: 15, borderWidth: 1, borderColor: '#A7F3D0' }, gpsTitle: { color: colors.success, fontWeight: '800', marginBottom: 4 }, error: { color: colors.danger, textAlign: 'center' }, notice: { color: colors.success, backgroundColor: '#ECFDF5', borderRadius: 10, padding: 12 }, link: { color: colors.primary, fontWeight: '700', marginTop: 12 },
  sectionHeading: { color: colors.text, fontWeight: '800', fontSize: 19, marginTop: 8 }, waypoint: { backgroundColor: '#fff', borderRadius: 14, padding: 15, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', gap: 12 }, dot: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' }, dotDone: { backgroundColor: colors.success }, dotText: { color: '#fff', fontWeight: '800' }, waypointName: { color: colors.text, fontWeight: '800', fontSize: 15, marginBottom: 4 }, row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }, mapLink: { color: '#2563EB', fontWeight: '700' }, checkButton: { backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9 }, checkText: { color: '#fff', fontWeight: '800' },
  sos: { borderWidth: 1.5, borderColor: colors.danger, borderRadius: 13, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 8 }, sosText: { color: colors.danger, fontWeight: '800' }, primary: { backgroundColor: colors.primary, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, primaryText: { color: '#fff', fontWeight: '800', fontSize: 17 },
});
