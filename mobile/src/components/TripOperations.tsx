import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useSession } from '@/context/session';
import { API_URL } from '@/lib/config';
import { colors } from '@/theme';

type Horse = { _id: string; name: string; microchipId: string };
type Movement = { horseId: string; loadedAt?: string; unloadedAt?: string };
type Workflow = { customsCheckpoints?: { name: string; countryCode: string; status: string; actualArrival?: string }[]; order: { _id: string; horseIds: Horse[] }; route: { status: string; rescuePending?: boolean; acceptedAt?: string; odometerStart?: number; odometerEnd?: number; operationsVersion?: number; horseMovements?: Movement[]; clearances?: { _id: string; horseId: string; checkpoint: string; status: string }[] } };
type Document = { _id: string; documentType: string; status: string; fileUrl?: string; stage?: string; expiresAt?: string };

export function TripOperations({ orderId, onChanged, compact = false }: { orderId: string; onChanged: () => void; compact?: boolean }) {
  const { apiFetch, accessToken } = useSession();
  const [data, setData] = useState<Workflow | null>(null);
  const [departureReady, setDepartureReady] = useState(false);
  const [docs, setDocs] = useState<Document[]>([]);
  const [km, setKm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      const [workflow, documents] = await Promise.all([apiFetch<{ data: Workflow }>(`/orders/${orderId}/operations`), apiFetch<{ data: Document[]; departureReview?: { confirmedAt?: string } }>(`/compliance/checklist/${orderId}`)]);
      setDepartureReady(Boolean(documents.departureReview?.confirmedAt) && documents.data.filter(d => (d.stage || 'DEPARTURE') === 'DEPARTURE').every(d => d.status === 'APPROVED' && (!d.expiresAt || new Date(d.expiresAt) >= new Date()))); setData(workflow.data); setDocs(documents.data); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thể tải hồ sơ chuyến.'); }
  }, [apiFetch, orderId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); const timer = setInterval(() => void load(), 30000); return () => clearInterval(timer); }, [load]);
  const act = async (action: string, values: Record<string, unknown> = {}) => {
    setBusy(true);
    try { await apiFetch(`/orders/${orderId}/operations`, { method: 'PATCH', body: JSON.stringify({ action, version: data?.route?.operationsVersion || 0, ...values }) }); await load(); onChanged(); }
    catch (e) { await load(); setError(e instanceof Error ? e.message : 'Không thể cập nhật. Thử lại.'); }
    finally { setBusy(false); }
  };
  const openDocument = async (doc: Document) => {
    setBusy(true);
    try {
      const url = `${API_URL}/compliance/${doc._id}/file`;
      const headers = { Authorization: `Bearer ${accessToken}` };
      if (Platform.OS === 'web') {
        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error('Không tải được tệp. Vui lòng tải lại phiên đăng nhập.');
        const objectUrl = URL.createObjectURL(await response.blob());
        const link = document.createElement('a'); link.href = objectUrl; link.download = doc.documentType; link.click();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
      } else {
        const temp = `${FileSystem.cacheDirectory}trip-${doc._id}`;
        const result = await FileSystem.downloadAsync(url, temp, { headers });
        if (result.status !== 200) { await FileSystem.deleteAsync(temp, { idempotent: true }); throw new Error('Không tải được tệp hoặc phiên đăng nhập đã hết hạn.'); }
        const mime = result.mimeType || 'application/pdf';
        const extension = mime.includes('pdf') ? 'pdf' : mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
        const destination = `${temp}.${extension}`;
        await FileSystem.deleteAsync(destination, { idempotent: true });
        await FileSystem.moveAsync({ from: temp, to: destination });
        try {
          if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(destination, { mimeType: mime, dialogTitle: doc.documentType });
          else await Share.share({ url: destination });
        } finally { await FileSystem.deleteAsync(destination, { idempotent: true }); }
      }
    } catch (e) { Alert.alert('Giấy tờ chuyến', e instanceof Error ? e.message : 'Không thể mở tệp.'); }
    finally { setBusy(false); }
  };
  const button = (label: string, action: () => void, disabled = false) => <Pressable disabled={busy || disabled} onPress={action} accessibilityRole="button" style={[ui.button, (busy || disabled) && { opacity: 0.45 }]}><Text style={ui.buttonText}>{label}</Text></Pressable>;
  if (!data) return <View>{error ? <Text>{error}</Text> : <ActivityIndicator />}{button('Tải lại vận đơn', load)}</View>;
  const route = data.route;
  return <View style={ui.card}>
    {!compact && <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>Ngựa & hồ sơ chuyến</Text>}
    {!!error && <Text style={{ color: colors.danger }}>{error}</Text>}
    {!!error && button('Thử tải lại', load)}
    {route.status === 'SCHEDULED' && <Text style={{ color: departureReady ? colors.primary : colors.danger }}>{departureReady ? 'Chuyên viên đã xác nhận hồ sơ khởi hành.' : 'Chờ chuyên viên xác nhận hồ sơ khởi hành. Khách chỉ bổ sung khi chuyên viên có yêu cầu.'}</Text>}
    <Text style={ui.caption}>{route.acceptedAt ? `Đã nhận: ${new Date(route.acceptedAt).toLocaleString('vi-VN')}` : 'Chưa xác nhận nhận nhiệm vụ'}</Text>
    {route.status === 'SCHEDULED' && !route.acceptedAt && button('Tôi tiếp nhận vận đơn', () => act('ACCEPT'))}
    {data.order.horseIds.map(horse => {
      const movement = route.horseMovements?.find(m => m.horseId === horse._id);
      return <View key={horse._id} style={ui.horse}><Text style={{ fontWeight: '700' }}>{horse.name} · {horse.microchipId}</Text><Text style={ui.caption}>{movement?.unloadedAt ? 'Đã giao ngựa' : movement?.loadedAt ? 'Ngựa đang trên xe' : 'Chưa lên xe'}</Text>
        {route.status === 'SCHEDULED' && !movement?.loadedAt && button('Xác nhận ngựa lên xe', () => act('LOAD', { horseId: horse._id }), !route.acceptedAt)}
        {route.status === 'DELIVERING' && movement?.loadedAt && !movement.unloadedAt && button('Xác nhận giao ngựa', () => act('UNLOAD', { horseId: horse._id }))}
      </View>;
    })}
    <Text style={ui.odometer}>Km đầu: {route.odometerStart ?? 'Chưa ghi'} · Km cuối: {route.odometerEnd ?? 'Chưa ghi'}</Text>
    {route.rescuePending && <><Text>Đối chiếu toàn bộ mã chip ở trên trước khi tiếp nhận xe cứu hộ.</Text><TextInput style={ui.input} placeholder="Km đầu xe thay thế" keyboardType="decimal-pad" value={km} onChangeText={setKm} />{button('Xác nhận đã nhận đủ ngựa trên xe thay thế', () => Alert.alert('Xác nhận bàn giao', 'Bạn đã kiểm tra đúng và đủ tất cả ngựa?', [{ text: 'Chưa', style: 'cancel' }, { text: 'Đã nhận đủ', onPress: () => act('ACCEPT_RESCUE', { value: Number(km), confirmAllHorses: true }) }]), !km.trim() || !Number.isFinite(Number(km)))}</>}
    {['SCHEDULED', 'DELIVERING'].includes(route.status) && (route.status === 'SCHEDULED' ? route.odometerStart == null : route.odometerEnd == null) && <><TextInput accessibilityLabel="Chỉ số công-tơ-mét" placeholder="Nhập chỉ số km trên xe" keyboardType="decimal-pad" value={km} onChangeText={setKm} style={ui.input} />{button(route.status === 'SCHEDULED' ? 'Lưu km đầu chuyến' : 'Lưu km cuối chuyến', () => act('ODOMETER', { kind: route.status === 'SCHEDULED' ? 'START' : 'END', value: Number(km) }), !km.trim() || !Number.isFinite(Number(km)))}</>}
    {!compact && <>
    <Text style={ui.heading}>Thông quan — do vận hành cập nhật</Text>
    {(data.customsCheckpoints || []).map(c => <Text key={c.name}>{c.name} · {({VN:'Việt Nam',KH:'Campuchia',TH:'Thái Lan',SG:'Singapore',MY:'Malaysia',LA:'Lào'} as Record<string,string>)[c.countryCode] || c.countryCode} · {c.status === 'ARRIVED' ? 'Đã đến cửa khẩu' : 'Theo lộ trình điều phối'}</Text>)}
    {!(data.customsCheckpoints || []).length && <Text>Điều phối chưa khai báo cửa khẩu.</Text>}
    {!(route.clearances || []).length && <Text>Chưa có kết quả thông quan; chuyên viên cập nhật khi xe đến cửa khẩu.</Text>}
    {[...(route.clearances || [])].reverse().map(c => <Text key={c._id}>{data.order.horseIds.find(h => h._id === c.horseId)?.name} · {c.checkpoint}: {({ PENDING: 'Chưa thông quan', CLEARED: 'Đã thông quan', HELD: 'Đang bị giữ' })[c.status]}</Text>)}
    <Text style={{ fontWeight: '800' }}>Giấy tờ xuất trình</Text>
    {docs.filter(d => d.status === 'APPROVED' && d.fileUrl).map(doc => <View key={doc._id}>{button(`Mở / tải ${doc.documentType}`, () => openDocument(doc))}</View>)}
    {!docs.some(d => d.status === 'APPROVED' && d.fileUrl) && <Text>Chưa có tệp được xác nhận để xuất trình.</Text>}
    </>}
  </View>;
}

const ui = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 22, padding: 20, gap: 16, borderWidth: 1, borderColor: colors.border },
  horse: { backgroundColor: '#F6F9F7', borderRadius: 16, padding: 16, gap: 8, borderWidth: 1, borderColor: colors.border },
  caption: { color: colors.muted, fontSize: 13, lineHeight: 21 }, heading: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: 8 },
  odometer: { color: colors.primary, backgroundColor: colors.accentLight, padding: 14, borderRadius: 12, lineHeight: 22, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: colors.border, padding: 16, borderRadius: 14, backgroundColor: '#F8FAF9', fontSize: 16, color: colors.text, minHeight: 54 },
  button: { minHeight: 48, padding: 14, borderRadius: 12, backgroundColor: colors.primary, marginTop: 8, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '600', textAlign: 'center', lineHeight: 21 }, disabled: { backgroundColor: '#E4EBE7' },
});
