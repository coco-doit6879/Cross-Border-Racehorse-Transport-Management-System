import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatusBadge } from '@/components/StatusBadge';
import { useSession } from '@/context/session';
import { listOfflineEvents, removeOfflineEvents } from '@/lib/offlineQueue';
import { colors } from '@/theme';
import type { TransportRoute } from '@/types/domain';

export default function TripsScreen() {
  const { user, signOut, apiFetch } = useSession();
  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');
  const active = routes.filter(route => ['IN_TRANSIT', 'DELIVERING', 'INCIDENT_HANDLING'].includes(route.status));
  const scheduled = routes.filter(route => route.status === 'SCHEDULED');
  const priority = active[0] || scheduled[0];
  const visibleRoutes = routes.filter(route => filter === 'ALL' || (filter === 'ACTIVE' ? active.includes(route) : filter === 'SCHEDULED' ? route.status === 'SCHEDULED' : ['COMPLETED', 'CANCELLED'].includes(route.status)));
  const openTrip = (trip: TransportRoute) => router.push({ pathname: '/(driver)/trips/[id]', params: { id: trip._id } });

  const syncQueue = useCallback(async () => {
    const events = (await listOfflineEvents(user?.id || '')).slice(0, 100); setPending(events.length);
    if (!events.length) return;
    try {
      const body = await apiFetch<{ results: { event_id: string; status: string }[] }>('/sync/events', { method: 'POST', body: JSON.stringify({ events }) });
      const done = body.results.filter((item) => item.status === 'SUCCESS').map((item) => item.event_id);
      await removeOfflineEvents(done); setPending(events.length - done.length);
    } catch { /* giữ lại để đồng bộ ở lần sau */ }
  }, [apiFetch, user?.id]);

  const load = useCallback(async () => {
    try {
      const body = await apiFetch<{ data: TransportRoute[] }>('/routes'); setRoutes(body.data); setError(''); await syncQueue();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể tải chuyến.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [apiFetch, syncQueue]);

  useEffect(() => {
    // Initial network hydration belongs to this screen lifecycle.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}><Text style={styles.eyebrow}>CHÀO MỪNG TRỞ LẠI</Text><Text style={styles.name}>{user?.fullName}</Text></View>
        <Pressable accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center', paddingLeft: 12 }} onPress={async () => { await signOut(); router.replace('/login'); }}><Text style={styles.logout}>Đăng xuất</Text></Pressable>
      </View>
        <FlatList data={visibleRoutes} keyExtractor={(item) => item._id} contentContainerStyle={styles.list}
          ListHeaderComponent={<>
            <View style={styles.pageHeading}><Text style={styles.title}>Công việc của bạn</Text><Text style={styles.pageHint}>{new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}</Text></View>
            {!!error && <View style={styles.errorBox}><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Pressable accessibilityRole="button" style={styles.retry} onPress={() => { setRefreshing(true); void load(); }}><Text style={styles.logout}>Thử lại</Text></Pressable></View>}
            {pending > 0 && <Text accessibilityLiveRegion="polite" style={styles.pending}>{pending} cập nhật chờ đồng bộ</Text>}
            {!loading && priority && <View style={styles.focusCard}><View style={styles.focusTop}><Text style={styles.focusLabel}>{active.length ? 'CHUYẾN ĐANG THỰC HIỆN' : 'CHUYẾN SẮP TỚI'}</Text><View style={styles.liveDot} /></View><Text style={styles.focusCode}>{priority.orderId?.bookingCode || 'Chuyến vận chuyển'}</Text><Text style={styles.focusDestination}>{priority.orderId?.destination?.address || 'Chờ điểm giao'}</Text><View style={styles.focusDivider} /><Text style={styles.focusHint}>{priority.status === 'INCIDENT_HANDLING' ? 'Đang chờ điều phối xử lý sự cố.' : priority.status === 'SCHEDULED' ? 'Kiểm tra vận đơn, ngựa và km đầu trước khi đi.' : priority.status === 'DELIVERING' ? 'Kiểm tra ngựa và hoàn tất bàn giao tại điểm đến.' : `Điểm tiếp theo: ${[...priority.waypoints].sort((a, b) => a.sequence - b.sequence).find(w => w.status === 'PENDING')?.name || 'Chuẩn bị bàn giao'}`}</Text><Pressable accessibilityRole="button" onPress={() => openTrip(priority)} style={({ pressed }) => [styles.focusButton, pressed && { opacity: 0.8 }]}><Text style={styles.focusButtonText}>{priority.status === 'SCHEDULED' ? 'Chuẩn bị khởi hành' : priority.status === 'INCIDENT_HANDLING' ? 'Xem chuyến & hồ sơ' : 'Tiếp tục hành trình'}</Text><Text style={styles.focusButtonText}>→</Text></Pressable></View>}
            <View style={styles.titleRow}><Text style={styles.sectionTitle}>Danh sách chuyến</Text><Text style={styles.pageHint}>{routes.length} chuyến được phân công</Text></View>
            <View style={styles.filters}>{[['ALL', 'Tất cả'], ['ACTIVE', 'Đang chạy'], ['SCHEDULED', 'Sắp tới'], ['HISTORY', 'Lịch sử']].map(([key, label]) => <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: filter === key }} onPress={() => setFilter(key)} style={[styles.filter, filter === key && styles.filterActive]}><Text style={[styles.filterText, filter === key && { color: colors.primary }]}>{label}</Text></Pressable>)}</View>
          </>}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={loading ? <ActivityIndicator style={{ margin: 40 }} color={colors.primary} /> : <View style={styles.empty}><View style={styles.emptyMark}><View style={styles.emptyLine} /><View style={styles.emptyLine} /><View style={[styles.emptyLine, { width: 16 }]} /></View><Text style={styles.emptyTitle}>{filter === 'ALL' ? 'Bạn chưa có chuyến mới' : 'Chưa có chuyến trong mục này'}</Text><Text style={styles.emptyText}>Chuyến được phân công sẽ xuất hiện tại đây.</Text><Pressable accessibilityRole="button" style={styles.retry} onPress={() => { setRefreshing(true); void load(); }}><Text style={styles.logout}>Làm mới danh sách ↻</Text></Pressable></View>}
          renderItem={({ item }) => <Pressable accessibilityRole="button" style={({ pressed }) => [styles.card, pressed && { opacity: 0.75 }]} onPress={() => router.push({ pathname: '/(driver)/trips/[id]', params: { id: item._id } })}>
            <View style={styles.cardTop}><Text style={styles.code}>{item.orderId?.bookingCode || 'Chuyến vận chuyển'}</Text><StatusBadge status={item.status} /></View>
            <Text style={styles.departure}>{item.orderId?.requestedDepartureDate ? new Date(item.orderId.requestedDepartureDate).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : 'Chưa có lịch khởi hành'}</Text>
            <Text style={styles.locationLabel}>ĐIỂM ĐÓN</Text><Text style={styles.route}>{item.orderId?.origin?.address || 'Điểm đón'}</Text><Text style={styles.arrow}>│</Text><Text style={styles.locationLabel}>ĐIỂM GIAO</Text><Text style={styles.route}>{item.orderId?.destination?.address || 'Điểm giao'}</Text>
            <View style={styles.meta}><View style={{ flex: 1 }}><Text style={styles.locationLabel}>PHƯƠNG TIỆN</Text><Text style={styles.metaText}>{item.vehiclePlateNumber || 'Chưa cập nhật'}</Text></View><View><Text style={styles.locationLabel}>VẬN CHUYỂN</Text><Text style={styles.metaText}>{item.orderId?.horseIds?.length || 0} ngựa</Text></View><Text style={styles.open}>↗</Text></View>
          </Pressable>} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pageHeading: { marginBottom: 24, gap: 6 }, pageHint: { fontSize: 12, color: colors.muted, lineHeight: 19 }, sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  focusCard: { padding: 22, backgroundColor: colors.primary, borderRadius: 20, marginBottom: 26 }, focusTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, focusLabel: { color: '#C5DDD2', letterSpacing: 1.3, fontSize: 10, fontWeight: '700' }, liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#A9D8BF' }, focusCode: { fontSize: 13, color: '#C5DDD2', marginTop: 20 }, focusDestination: { fontSize: 23, lineHeight: 32, fontWeight: '700', color: '#fff', marginTop: 6 }, focusDivider: { height: 1, backgroundColor: '#3C6253', marginVertical: 18 }, focusHint: { fontSize: 14, lineHeight: 22, color: '#E0ECE5' }, focusButton: { backgroundColor: '#fff', minHeight: 52, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, marginTop: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }, focusButtonText: { color: colors.primary, fontSize: 14, fontWeight: '700', flexShrink: 1 },
  errorBox: { backgroundColor: '#FEF2F2', padding: 16, borderRadius: 14, marginBottom: 16 }, retry: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 8, marginTop: 8 }, departure: { color: colors.muted, fontSize: 12, marginTop: -10, marginBottom: 20 }, emptyMark: { width: 56, height: 64, borderWidth: 2, borderColor: colors.accentBorder, borderRadius: 12, padding: 12, gap: 7, justifyContent: 'center', marginBottom: 20 }, emptyLine: { height: 2, width: 26, backgroundColor: colors.accentBorder },
  filters: { flexDirection: 'row', padding: 4, borderRadius: 14, backgroundColor: '#E7EEEA' }, filter: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 11 }, filterActive: { backgroundColor: '#fff' }, filterText: { color: colors.muted, fontSize: 12, fontWeight: '600' }, locationLabel: { color: colors.muted, fontSize: 9, fontWeight: '700', letterSpacing: 1.2, marginBottom: 6 }, open: { color: colors.primary, fontSize: 24, alignSelf: 'center' },
  safe: { flex: 1, backgroundColor: colors.background }, header: { padding: 20, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }, name: { color: colors.text, fontSize: 21, fontWeight: '800', marginTop: 2 }, logout: { color: colors.primary, fontWeight: '700' },
  titleRow: { marginBottom: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'space-between', alignItems: 'center' }, title: { fontSize: 28, fontWeight: '700', color: colors.text },
  pending: { color: colors.warning, fontSize: 12, fontWeight: '600', marginBottom: 16 }, error: { color: colors.danger, lineHeight: 21 }, list: { padding: 20, gap: 14, paddingBottom: 40, width: '100%', maxWidth: 640, alignSelf: 'center', flexGrow: 1 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 22, borderWidth: 1, borderColor: colors.border }, cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 22 },
  code: { color: colors.primary, fontWeight: '800' }, route: { fontSize: 15, lineHeight: 23, color: colors.text, fontWeight: '600' }, arrow: { color: colors.muted, marginVertical: 4 },
  meta: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 16, paddingTop: 14, flexDirection: 'row', gap: 18 }, metaText: { color: colors.muted, fontWeight: '600' },
  empty: { backgroundColor: '#fff', borderRadius: 16, padding: 28, alignItems: 'center' }, emptyTitle: { fontWeight: '800', color: colors.text, fontSize: 17 }, emptyText: { color: colors.muted, textAlign: 'center', marginTop: 8, lineHeight: 21 },
});
