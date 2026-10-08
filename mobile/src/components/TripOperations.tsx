import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, Share, Text, TextInput, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useSession } from '@/context/session';
import { API_URL } from '@/lib/config';
import { colors } from '@/theme';

type Horse = { _id: string; name: string; microchipId: string };
type Movement = { horseId: string; loadedAt?: string; unloadedAt?: string };
type Workflow = { order: { _id: string; horseIds: Horse[] }; route: { status: string; rescuePending?: boolean; acceptedAt?: string; odometerStart?: number; odometerEnd?: number; operationsVersion?: number; horseMovements?: Movement[]; clearances?: { _id: string; horseId: string; checkpoint: string; status: string }[] } };
type Document = { _id: string; documentType: string; status: string; fileUrl?: string; stage?: string };

export function TripOperations({ orderId, onChanged }: { orderId: string; onChanged: () => void }) {
  const { apiFetch, accessToken } = useSession();
  const [data, setData] = useState<Workflow | null>(null);
  const [docs, setDocs] = useState<Document[]>([]);
  const [km, setKm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      const [workflow, documents] = await Promise.all([apiFetch<{ data: Workflow }>(`/orders/${orderId}/operations`), apiFetch<{ data: Document[] }>(`/compliance/checklist/${orderId}`)]);
      setData(workflow.data); setDocs(documents.data); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thể tải hồ sơ chuyến.'); }
  }, [apiFetch, orderId]);
  useEffect(() => { void load(); }, [load]);
  const act = async (action: string, values: Record<string, unknown> = {}) => {
    setBusy(true);
    try { await apiFetch(`/orders/${orderId}/operations`, { method: 'PATCH', body: JSON.stringify({ action, version: data?.route?.operationsVersion || 0, ...values }) }); await load(); onChanged(); }
    catch (e) { Alert.alert('Không thể cập nhật', e instanceof Error ? e.message : 'Thử lại.'); await load(); }
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
  const button = (label: string, action: () => void, disabled = false) => <Pressable disabled={busy || disabled} onPress={action} style={{ padding: 12, borderRadius: 8, backgroundColor: busy || disabled ? '#94a3b8' : colors.primary, marginTop: 8 }}><Text style={{ color: '#fff', fontWeight: '700' }}>{label}</Text></Pressable>;
  if (!data) return <View>{error ? <Text>{error}</Text> : <ActivityIndicator />}{button('Tải lại vận đơn', load)}</View>;
  const route = data.route;
  return <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 10 }}>
    <Text style={{ fontSize: 18, fontWeight: '800' }}>Tiếp nhận vận đơn và hồ sơ</Text>
    {!!error && <Text style={{ color: colors.danger }}>{error}</Text>}
    {button('Làm mới vận đơn', load)}
    <Text>{route.acceptedAt ? `Đã nhận: ${new Date(route.acceptedAt).toLocaleString('vi-VN')}` : 'Chưa xác nhận nhận nhiệm vụ'}</Text>
    {route.status === 'SCHEDULED' && !route.acceptedAt && button('Tôi tiếp nhận vận đơn', () => act('ACCEPT'))}
    {data.order.horseIds.map(horse => {
      const movement = route.horseMovements?.find(m => m.horseId === horse._id);
      return <View key={horse._id}><Text style={{ fontWeight: '700' }}>{horse.name} · {horse.microchipId}</Text><Text>{movement?.unloadedAt ? 'Đã giao ngựa' : movement?.loadedAt ? 'Ngựa đang trên xe' : 'Chưa lên xe'}</Text>
        {route.status === 'SCHEDULED' && !movement?.loadedAt && button('Xác nhận ngựa lên xe', () => act('LOAD', { horseId: horse._id }), !route.acceptedAt)}
        {route.status === 'DELIVERING' && movement?.loadedAt && !movement.unloadedAt && button('Xác nhận giao ngựa', () => act('UNLOAD', { horseId: horse._id }))}
      </View>;
    })}
    <Text>Km đầu: {route.odometerStart ?? 'Chưa ghi'} · Km cuối: {route.odometerEnd ?? 'Chưa ghi'}</Text>
    {route.rescuePending && <><Text>Đối chiếu toàn bộ mã chip ở trên trước khi tiếp nhận xe cứu hộ.</Text><TextInput placeholder="Km đầu xe thay thế" keyboardType="decimal-pad" value={km} onChangeText={setKm} />{button('Xác nhận đã nhận đủ ngựa trên xe thay thế', () => Alert.alert('Xác nhận bàn giao', 'Bạn đã kiểm tra đúng và đủ tất cả ngựa?', [{ text: 'Chưa', style: 'cancel' }, { text: 'Đã nhận đủ', onPress: () => act('ACCEPT_RESCUE', { value: Number(km), confirmAllHorses: true }) }]), !km.trim() || !Number.isFinite(Number(km)))}</>}
    {['SCHEDULED', 'DELIVERING', 'COMPLETED'].includes(route.status) && <><TextInput accessibilityLabel="Chỉ số công-tơ-mét" placeholder="Chỉ số công-tơ-mét" keyboardType="decimal-pad" value={km} onChangeText={setKm} style={{ borderWidth: 1, borderColor: colors.border, padding: 12, borderRadius: 8 }} />{button(route.status === 'SCHEDULED' ? 'Ghi km đầu chuyến' : 'Ghi km cuối chuyến', () => act('ODOMETER', { kind: route.status === 'SCHEDULED' ? 'START' : 'END', value: Number(km) }), !km.trim() || !Number.isFinite(Number(km)))}</>}
    <Text style={{ fontWeight: '800' }}>Thông quan — do vận hành cập nhật</Text>
    {!(route.clearances || []).length && <Text>Chưa ghi nhận thông quan.</Text>}
    {[...(route.clearances || [])].reverse().map(c => <Text key={c._id}>{data.order.horseIds.find(h => h._id === c.horseId)?.name} · {c.checkpoint}: {({ PENDING: 'Chưa thông quan', CLEARED: 'Đã thông quan', HELD: 'Đang bị giữ' })[c.status]}</Text>)}
    <Text style={{ fontWeight: '800' }}>Giấy tờ xuất trình</Text>
    {docs.filter(d => d.status === 'APPROVED' && d.fileUrl).map(doc => <View key={doc._id}>{button(`Mở / tải ${doc.documentType}`, () => openDocument(doc))}</View>)}
    {!docs.some(d => d.status === 'APPROVED' && d.fileUrl) && <Text>Chưa có tệp được xác nhận để xuất trình.</Text>}
  </View>;
}
