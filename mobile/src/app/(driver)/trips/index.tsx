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

  const syncQueue = useCallback(async () => {
    const events = await listOfflineEvents(); setPending(events.length);
    if (!events.length) return;
    try {
      const body = await apiFetch<{ results: { event_id: string; status: string }[] }>('/sync/events', { method: 'POST', body: JSON.stringify({ events }) });
      const done = body.results.filter((item) => item.status === 'SUCCESS').map((item) => item.event_id);
      await removeOfflineEvents(done); setPending(events.length - done.length);
    } catch { /* giữ lại để đồng bộ ở lần sau */ }
  }, [apiFetch]);

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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View><Text style={styles.eyebrow}>XIN CHÀO</Text><Text style={styles.name}>{user?.fullName}</Text></View>
        <Pressable onPress={async () => { await signOut(); router.replace('/login'); }}><Text style={styles.logout}>Đăng xuất</Text></Pressable>
      </View>
      <View style={styles.titleRow}><Text style={styles.title}>Chuyến của tôi</Text>{pending > 0 && <Text style={styles.pending}>{pending} chờ đồng bộ</Text>}</View>
      {!!error && <Text style={styles.error}>{error}</Text>}
      {loading ? <ActivityIndicator style={{ marginTop: 60 }} size="large" color={colors.primary} /> : (
        <FlatList data={routes} keyExtractor={(item) => item._id} contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>Chưa có chuyến được phân công</Text><Text style={styles.emptyText}>Chuyến sẽ xuất hiện sau khi điều phối viên gán tài xế và xe.</Text></View>}
          renderItem={({ item }) => <Pressable style={styles.card} onPress={() => router.push({ pathname: '/(driver)/trips/[id]', params: { id: item._id } })}>
            <View style={styles.cardTop}><Text style={styles.code}>{item.orderId?.bookingCode || 'Chuyến vận chuyển'}</Text><StatusBadge status={item.status} /></View>
            <Text style={styles.route}>{item.orderId?.origin?.address || 'Điểm đón'}</Text><Text style={styles.arrow}>↓</Text><Text style={styles.route}>{item.orderId?.destination?.address || 'Điểm giao'}</Text>
            <View style={styles.meta}><Text style={styles.metaText}>🚚 {item.vehiclePlateNumber}</Text><Text style={styles.metaText}>🐎 {item.orderId?.horseIds?.length || 0} ngựa</Text></View>
          </Pressable>} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, header: { padding: 20, backgroundColor: colors.navy, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: '#94A3B8', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }, name: { color: '#fff', fontSize: 21, fontWeight: '800', marginTop: 2 }, logout: { color: '#FDBA74', fontWeight: '700' },
  titleRow: { paddingHorizontal: 20, paddingTop: 22, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, title: { fontSize: 24, fontWeight: '800', color: colors.text },
  pending: { color: colors.warning, fontSize: 12, fontWeight: '700' }, error: { color: colors.danger, margin: 20 }, list: { padding: 20, gap: 14, paddingBottom: 40 },
  card: { backgroundColor: '#fff', padding: 18, borderRadius: 16, borderWidth: 1, borderColor: colors.border }, cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  code: { color: colors.primary, fontWeight: '800' }, route: { fontSize: 16, color: colors.text, fontWeight: '700' }, arrow: { color: colors.muted, marginVertical: 4 },
  meta: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 16, paddingTop: 14, flexDirection: 'row', gap: 18 }, metaText: { color: colors.muted, fontWeight: '600' },
  empty: { backgroundColor: '#fff', borderRadius: 16, padding: 28, alignItems: 'center' }, emptyTitle: { fontWeight: '800', color: colors.text, fontSize: 17 }, emptyText: { color: colors.muted, textAlign: 'center', marginTop: 8, lineHeight: 21 },
});
