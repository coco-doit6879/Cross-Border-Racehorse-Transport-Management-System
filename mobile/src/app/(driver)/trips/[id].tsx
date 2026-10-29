import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TripOperations } from '@/components/TripOperations';
import { StatusBadge } from '@/components/StatusBadge';
import { useSession } from '@/context/session';
import { colors } from '@/theme';
import type { TransportRoute } from '@/types/domain';

const name = (value: string) => value;
const labels = { PICKUP: 'Điểm đón', REST_STOP: 'Dừng nghỉ', BORDER_CUSTOMS: 'Cửa khẩu', VET_CHECK: 'Kiểm tra sức khỏe', DELIVERY: 'Điểm giao' };
export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { apiFetch } = useSession();
  const [route, setRoute] = useState<TransportRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [documents, setDocuments] = useState(false);
  const lock = useRef(false);
  const load = useCallback(async () => {
    try { setRoute((await apiFetch<{ data: TransportRoute }>(`/routes/${id}`)).data); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không thể tải chuyến.'); }
    finally { setLoading(false); }
  }, [apiFetch, id]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); const timer = setInterval(() => void load(), 30000); return () => clearInterval(timer); }, [load]);
  const advance = async () => {
    if (!route || lock.current) return;
    lock.current = true; setWorking(true); setError('');
    try {
      if (route.status === 'SCHEDULED') {
        await apiFetch(`/routes/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'IN_TRANSIT' }) });
      } else if (route.status === 'DELIVERING') {
        await apiFetch(`/routes/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'COMPLETED' }) });
      } else {
        const next = [...route.waypoints].sort((a,b)=>a.sequence-b.sequence).find(w=>w.status==='PENDING');
        if(next) await apiFetch(`/routes/${id}/waypoint-checkin`, { method:'PATCH', body:JSON.stringify({waypointId:next._id,status:'ARRIVED'}) });
        else await apiFetch(`/routes/${id}/status`, { method:'PATCH', body:JSON.stringify({status:'DELIVERING'}) });
      }
      await load();
    } catch (e) {
      await load();
      setError(e && typeof e === 'object' && 'status' in e && e.status === 404 ? 'Máy chủ chưa cập nhật tính năng hành trình. Vui lòng khởi động lại backend.' : e instanceof Error ? e.message : 'Chưa cập nhật được. Vui lòng thử lại.');
    } finally { lock.current = false; setWorking(false); }
  };
  if (loading) return <View style={s.center}><ActivityIndicator color={colors.primary} size="large" /></View>;
  if (!route) return <SafeAreaView style={s.center}><Text>{error || 'Không tìm thấy chuyến.'}</Text><Pressable style={s.button} onPress={load}><Text style={s.buttonText}>Thử lại</Text></Pressable></SafeAreaView>;
  const ordered = [...route.waypoints].sort((a, b) => a.sequence - b.sequence);
  const next = ordered.find(w => w.status === 'PENDING');
  const done = ordered.filter(w => w.status === 'ARRIVED').length;
  const preparing = route.status === 'SCHEDULED', delivering = route.status === 'DELIVERING';
  const completed = route.status === 'COMPLETED', incident = route.status === 'INCIDENT_HANDLING';
  const title = completed ? 'Hành trình hoàn tất' : delivering ? 'Bàn giao tại điểm đến' : incident ? 'Chờ xử lý sự cố' : route.status === 'CANCELLED' ? 'Chuyến đã hủy' : preparing ? 'Sẵn sàng cho hành trình' : next ? name(next.name) : 'Đã đến cuối hành trình';
  const hint = completed ? 'Cảm ơn bạn đã hoàn thành chuyến vận chuyển.' : delivering ? 'Xác nhận đã giao đủ ngựa, ghi km cuối rồi xác nhận giao xong.' : incident ? 'Liên hệ điều phối để tiếp tục chuyến an toàn.' : preparing ? 'Nhận vận đơn, kiểm tra ngựa và ghi km trước khi đi.' : next ? `${labels[next.type]} · ${done + 1} / ${ordered.length}` : 'Bạn có thể bắt đầu bàn giao ngựa cho khách hàng.';
  const actionLabel = delivering ? 'Xác nhận giao xong' : preparing ? 'Bắt đầu chuyến' : next ? next.type === 'PICKUP' ? 'Đã đến điểm đón' : next.type === 'REST_STOP' ? 'Đã đến trạm nghỉ' : next.type === 'BORDER_CUSTOMS' ? 'Đã đến cửa khẩu' : next.type === 'DELIVERY' ? 'Đã đến điểm giao' : 'Xác nhận đã đến' : 'Bắt đầu bàn giao';
  return <SafeAreaView style={s.safe} edges={['bottom']}>
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" hitSlop={10} onPress={() => router.back()} style={s.back}><Text style={s.backText}>‹</Text></Pressable>
      <View style={{ flex: 1 }}><Text style={s.eyebrow}>CHUYẾN CỦA BẠN</Text><Text style={s.code}>{route.orderId.bookingCode}</Text></View>
      {!completed && route.status !== 'CANCELLED' && <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/(driver)/sos', params: { tripId: route._id, code: route.orderId.bookingCode } })} style={s.sos}><Text style={s.sosText}>SOS</Text></Pressable>}
    </View>
    <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <View style={s.hero}>
        <View style={[s.row, { flexWrap: 'wrap' }]}><Text style={s.heroEyebrow}>{preparing ? 'VIỆC CẦN LÀM TRƯỚC KHI ĐI' : delivering ? 'VIỆC CẦN LÀM TẠI ĐIỂM GIAO' : 'HÀNH TRÌNH HIỆN TẠI'}</Text><StatusBadge status={route.status} /></View>
        <Text style={s.heroTitle}>{title}</Text><Text style={s.heroHint}>{hint}</Text>
        <View style={s.progress}><View style={[s.progressFill, { width: `${ordered.length ? done / ordered.length * 100 : 0}%` }]} /></View>
        <View style={s.row}><Text style={s.heroMeta}>{done}/{ordered.length} điểm đã đến</Text><Text style={s.heroMeta}>{route.orderId.horseIds.length} ngựa</Text></View>
      </View>
      <View style={s.summary}><Text style={s.eyebrow}>THÔNG TIN VẬN CHUYỂN</Text><View style={s.summaryRoute}><View style={s.routeMarker} /><View style={{ flex: 1 }}><Text style={s.caption}>Điểm đón</Text><Text style={s.summaryTitle}>{route.orderId.origin.address}</Text></View></View><View style={s.summaryRoute}><View style={[s.routeMarker, { borderRadius: 2, backgroundColor: colors.primary }]} /><View style={{ flex: 1 }}><Text style={s.caption}>Điểm giao</Text><Text style={s.summaryTitle}>{route.orderId.destination.address}</Text></View></View><View style={s.summaryBottom}><Text style={s.caption}>{route.vehiclePlateNumber} · {route.orderId.horseIds.length} ngựa</Text><Text style={s.caption}>{new Date(route.orderId.requestedDepartureDate).toLocaleDateString('vi-VN')}</Text></View></View>
      <View style={s.tabs}>{[false, true].map(value => <Pressable accessibilityRole="tab" accessibilityState={{ selected: documents === value }} key={String(value)} style={[s.tab, documents === value && s.tabActive]} onPress={() => setDocuments(value)}><Text style={[s.tabText, documents === value && s.tabTextActive]}>{value ? 'Ngựa & hồ sơ' : 'Hành trình'}</Text></Pressable>)}</View>
      {!documents ? <>
        <View style={s.row}><Text style={s.sectionTitle}>Các điểm dừng</Text><Text style={s.caption}>{ordered.length} điểm</Text></View>
        <View style={s.timeline}>{ordered.map((w, index) => {
          const arrived = w.status === 'ARRIVED', focus = !completed && !delivering && w._id === next?._id;
          return <View key={w._id} style={s.stop}>
            <View style={s.rail}><View style={[s.dot, arrived && s.dotDone, focus && s.dotFocus]}><Text style={[s.dotText, (arrived || focus) && { color: '#fff' }]}>{arrived ? '✓' : index + 1}</Text></View>{index < ordered.length - 1 && <View style={s.connector} />}</View>
            <View style={[s.stopBody, index === ordered.length - 1 && { paddingBottom: 0 }]}><View style={s.row}><Text style={s.stopType}>{labels[w.type]}</Text>{focus && <Text style={s.pill}>Tiếp theo</Text>}</View><Text style={[s.stopTitle, focus && { color: colors.primary }]}>{name(w.name)}</Text><Text style={s.caption}>{w.actualArrival ? `Đã đến ${new Date(w.actualArrival).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : `Dự kiến ${new Date(w.estimatedArrival).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`}</Text></View>
          </View>;
        })}</View>
        {(preparing || delivering || route.status === 'IN_TRANSIT') && <><Text style={s.sectionTitle}>{preparing ? 'Chuẩn bị khởi hành' : delivering ? 'Hoàn tất bàn giao' : 'Hồ sơ & thông quan trong hành trình'}</Text><TripOperations key={route.status} orderId={route.orderId._id} onChanged={load} compact={route.status !== 'IN_TRANSIT'} /></>}
      </> : <TripOperations key={route.status} orderId={route.orderId._id} onChanged={load} />}
    </ScrollView>
    <View style={s.footer}>
      {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      {preparing || delivering || route.status === 'IN_TRANSIT' ? <><Text style={s.footerHint}>{preparing ? 'Hoàn tất kiểm tra trước khi khởi hành' : next ? name(next.name) : 'Chuyển sang giao nhận'}</Text><Pressable accessibilityRole="button" disabled={working} onPress={advance} style={[s.button, working && { opacity: 0.6 }]}>{working ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>{actionLabel}  →</Text>}</Pressable></> : <Text style={s.footerHint}>{delivering ? 'Hoàn tất giao ngựa và km cuối rồi bấm hoàn thành chuyến'  : incident ? 'Điều phối đang xử lý sự cố' : 'Chuyến đã kết thúc'}</Text>}
    </View>
  </SafeAreaView>;
}
const s = StyleSheet.create({
  summaryRoute: { flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 8 }, routeMarker: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: colors.primary }, summaryBottom: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', paddingTop: 12, marginTop: 6, borderTopWidth: 1, borderTopColor: colors.border },
  safe: { flex: 1, backgroundColor: colors.background }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#fff' }, back: { width: 40, height: 44, justifyContent: 'center' }, backText: { color: colors.primary, fontSize: 36 }, eyebrow: { color: colors.muted, fontSize: 10, letterSpacing: 1.5, fontWeight: '600' }, code: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 3 }, sos: { backgroundColor: '#FEF2F2', borderRadius: 22, paddingHorizontal: 18, minHeight: 44, justifyContent: 'center' }, sosText: { color: colors.danger, fontSize: 12, fontWeight: '800' },
  content: { padding: 20, gap: 18, paddingBottom: 24 }, hero: { backgroundColor: colors.primary, borderRadius: 24, padding: 24, gap: 14 }, heroEyebrow: { color: '#A3D4C0', fontSize: 10, letterSpacing: 1.6, fontWeight: '700' }, heroMeta: { color: '#C6DED2', fontSize: 12 }, heroTitle: { color: '#fff', fontSize: 26, fontWeight: '700', lineHeight: 34 }, heroHint: { color: '#D4E7DD', fontSize: 14, lineHeight: 21 }, progress: { height: 4, backgroundColor: '#35604D', borderRadius: 3, overflow: 'hidden', marginTop: 8 }, progressFill: { height: 4, backgroundColor: '#A3D4C0' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, summary: { padding: 18, gap: 8, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, summaryTitle: { fontSize: 14, fontWeight: '600', color: colors.text, lineHeight: 21 }, caption: { fontSize: 12, color: colors.muted, lineHeight: 20 },
  tabs: { flexDirection: 'row', backgroundColor: '#E7EEEA', padding: 4, borderRadius: 14 }, tab: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 11 }, tabActive: { backgroundColor: '#fff' }, tabText: { color: colors.muted, fontSize: 13, fontWeight: '600' }, tabTextActive: { color: colors.primary }, sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  timeline: { backgroundColor: '#fff', borderRadius: 22, padding: 20, borderWidth: 1, borderColor: colors.border }, stop: { flexDirection: 'row', gap: 14 }, rail: { width: 30, alignItems: 'center' }, dot: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#EDF2EF', alignItems: 'center', justifyContent: 'center' }, dotDone: { backgroundColor: colors.primaryLight }, dotFocus: { backgroundColor: colors.primary }, dotText: { color: colors.muted, fontSize: 12, fontWeight: '700' }, connector: { width: 1, backgroundColor: '#DCE7DF', flex: 1, marginVertical: 6, minHeight: 30 }, stopBody: { flex: 1, paddingBottom: 28, gap: 5 }, stopType: { fontSize: 11, color: colors.muted }, stopTitle: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: colors.text }, pill: { color: colors.primary, backgroundColor: colors.accentLight, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, fontSize: 10, fontWeight: '600' },
  footer: { backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, borderTopWidth: 1, borderTopColor: colors.border, gap: 10 }, footerHint: { textAlign: 'center', fontSize: 12, color: colors.muted, lineHeight: 18 }, button: { backgroundColor: colors.primary, minHeight: 56, borderRadius: 16, padding: 16, alignItems: 'center', justifyContent: 'center' }, buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 }, error: { color: colors.danger, fontSize: 13, lineHeight: 19 }
});
