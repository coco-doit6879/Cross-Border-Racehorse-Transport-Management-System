import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useSession } from '@/context/session';
import { API_URL } from '@/lib/config';
import { enqueueOfflineEvent, newEventId } from '@/lib/offlineQueue';
import { colors } from '@/theme';
import type { HealthLog } from '@/types/domain';

type Horse = { _id: string; name: string; microchipId?: string };
type Choice<T extends string> = { value: T; label: string };

const FOOD: Choice<string>[] = [{ value: 'NORMAL', label: 'Ăn bình thường' }, { value: 'REDUCED', label: 'Ăn ít' }, { value: 'REFUSED', label: 'Bỏ ăn' }];
const CONDITIONS: Choice<HealthLog['condition']>[] = [{ value: 'STABLE', label: 'Ổn định' }, { value: 'STRESSED', label: 'Căng thẳng' }, { value: 'UNSTABLE', label: 'Không ổn định' }];
const ALERTS: Choice<HealthLog['alertType']>[] = [{ value: 'NONE', label: 'Không' }, { value: 'FEVER', label: 'Sốt' }, { value: 'INJURED', label: 'Bị thương' }, { value: 'DEHYDRATION', label: 'Mất nước' }];
export const HEALTH_LABELS = {
  food: Object.fromEntries(FOOD.map(c => [c.value, c.label])) as Record<string, string>,
  condition: Object.fromEntries(CONDITIONS.map(c => [c.value, c.label])) as Record<string, string>,
  alert: Object.fromEntries(ALERTS.map(c => [c.value, c.label])) as Record<string, string>,
};
const OPEN_STATUSES = ['IN_TRANSIT', 'INCIDENT_HANDLING', 'DELIVERING'];

// Camera photos are shrunk to ≤1280px JPEG so they fit the 1.5 MB server limit and offline storage.
async function capturePhoto(): Promise<{ uri: string; dataUrl: string } | null> {
  let result: ImagePicker.ImagePickerResult;
  if (Platform.OS === 'web') {
    result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  } else {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) { Alert.alert('Cần quyền camera', 'Vui lòng cho phép ứng dụng dùng camera trong Cài đặt để chụp ảnh ngựa.'); return null; }
    result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
  }
  const asset = result.canceled ? null : result.assets?.[0];
  if (!asset) return null;
  const resize = asset.width > 1280 ? [{ resize: { width: 1280 } }] : [];
  const small = await manipulateAsync(asset.uri, resize, { compress: 0.6, format: SaveFormat.JPEG, base64: true });
  if (!small.base64) throw new Error('Không đọc được ảnh vừa chụp.');
  return { uri: small.uri, dataUrl: `data:image/jpeg;base64,${small.base64}` };
}

function Chips<T extends string>({ options, value, onChange, danger }: { options: Choice<T>[]; value: T; onChange: (value: T) => void; danger?: (value: T) => boolean }) {
  return <View style={ui.chips}>{options.map(option => {
    const active = option.value === value, warn = active && danger?.(option.value);
    return <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: active }} onPress={() => onChange(option.value)} style={[ui.chip, active && ui.chipActive, warn && ui.chipDanger]}>
      <Text style={[ui.chipText, active && { color: '#fff' }]}>{option.label}</Text>
    </Pressable>;
  })}</View>;
}

export function HealthLogPanel({ tripId, orderId, status, canRecord }: { tripId: string; orderId: string; status: string; canRecord: boolean }) {
  const { apiFetch, accessToken, user } = useSession();
  const [horses, setHorses] = useState<Horse[]>([]);
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [horseId, setHorseId] = useState('');
  const [temperature, setTemperature] = useState('');
  const [water, setWater] = useState('');
  const [food, setFood] = useState('NORMAL');
  const [condition, setCondition] = useState<HealthLog['condition']>('STABLE');
  const [alertType, setAlertType] = useState<HealthLog['alertType']>('NONE');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<{ uri: string; dataUrl: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [ops, history] = await Promise.all([
        apiFetch<{ data: { order: { horseIds: Horse[] } } }>(`/orders/${orderId}/operations`),
        apiFetch<{ data: HealthLog[] }>(`/health-logs?tripId=${tripId}`),
      ]);
      setHorses(ops.data.order.horseIds);
      setHorseId(current => current || ops.data.order.horseIds[0]?._id || '');
      setLogs(history.data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Không tải được nhật ký sức khỏe.'); }
  }, [apiFetch, orderId, tripId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const takePhoto = async () => {
    try { const shot = await capturePhoto(); if (shot) setPhoto(shot); }
    catch (e) { Alert.alert('Chụp ảnh', e instanceof Error ? e.message : 'Không chụp được ảnh.'); }
  };

  const temp = Number(temperature.replace(',', '.')), liters = Number(water.replace(',', '.'));
  const valid = Boolean(horseId) && temperature.trim() !== '' && water.trim() !== '' && temp >= 30 && temp <= 45 && liters >= 0 && liters <= 100;
  const needsPhoto = alertType === 'INJURED' && !photo;

  const submit = async () => {
    if (!valid || needsPhoto || busy) return;
    setBusy(true); setError(''); setMessage('');
    const payload = {
      eventId: newEventId('health'), tripId, horseId, temperatureCelsius: temp, waterIntakeLiters: liters,
      foodIntakeStatus: food, condition, alertType, notes: notes.trim() || undefined,
      photoData: photo?.dataUrl, recordedAt: new Date().toISOString(),
    };
    try {
      await apiFetch('/health-logs', { method: 'POST', body: JSON.stringify(payload) });
      setMessage(condition === 'UNSTABLE' || alertType !== 'NONE' ? 'Đã gửi nhật ký. Điều phối đã nhận cảnh báo SOS.' : 'Đã gửi nhật ký. Khách hàng xem được ngay.');
      reset(); await load();
    } catch (e) {
      // HTTP errors carry a status; anything else is a lost connection, so keep the record for auto-sync.
      if (e && typeof e === 'object' && 'status' in e) { setError(e instanceof Error ? e.message : 'Không gửi được nhật ký.'); }
      else {
        await enqueueOfflineEvent({ event_id: payload.eventId, event_type: 'HEALTH_LOG', payload: { ...payload, eventId: undefined } }, user?.id || '');
        setMessage('Mất kết nối: đã lưu nhật ký trên máy, sẽ tự gửi khi có mạng.'); reset();
      }
    } finally { setBusy(false); }
  };
  const reset = () => { setTemperature(''); setWater(''); setFood('NORMAL'); setCondition('STABLE'); setAlertType('NONE'); setNotes(''); setPhoto(null); };

  const horseName = (log: HealthLog) => typeof log.horseId === 'object' ? log.horseId.name : horses.find(h => h._id === log.horseId)?.name || 'Ngựa';
  const open = OPEN_STATUSES.includes(status);

  return <View style={{ gap: 16 }}>
    {canRecord && <View style={ui.card}>
      <Text style={ui.title}>Ghi nhật ký sức khỏe</Text>
      {!open ? <Text style={ui.caption}>Nhật ký sức khỏe được ghi khi chuyến đang chạy (sau khi khởi hành, trước khi hoàn thành).</Text> : <>
        <Text style={ui.label}>Ngựa</Text>
        <Chips options={horses.map(h => ({ value: h._id, label: h.name }))} value={horseId} onChange={setHorseId} />
        <View style={ui.row}>
          <View style={{ flex: 1 }}><Text style={ui.label}>Thân nhiệt (°C)</Text><TextInput accessibilityLabel="Thân nhiệt" style={ui.input} keyboardType="decimal-pad" placeholder="37.8" value={temperature} onChangeText={setTemperature} /></View>
          <View style={{ flex: 1 }}><Text style={ui.label}>Nước uống (lít)</Text><TextInput accessibilityLabel="Lượng nước uống" style={ui.input} keyboardType="decimal-pad" placeholder="10" value={water} onChangeText={setWater} /></View>
        </View>
        {temperature.trim() !== '' && !(temp >= 30 && temp <= 45) && <Text style={ui.error}>Thân nhiệt phải trong khoảng 30–45 °C.</Text>}
        <Text style={ui.label}>Tình trạng ăn</Text>
        <Chips options={FOOD} value={food} onChange={setFood} />
        <Text style={ui.label}>Thể trạng</Text>
        <Chips options={CONDITIONS} value={condition} onChange={setCondition} danger={v => v === 'UNSTABLE'} />
        <Text style={ui.label}>Cảnh báo</Text>
        <Chips options={ALERTS} value={alertType} onChange={setAlertType} danger={v => v !== 'NONE'} />
        <Text style={ui.label}>Ảnh thể trạng / vết thương</Text>
        {photo ? <View style={{ gap: 8 }}>
          <Image source={{ uri: photo.uri }} style={ui.preview} accessibilityLabel="Ảnh vừa chụp" />
          <View style={ui.row}><Pressable style={[ui.secondary, { flex: 1 }]} onPress={takePhoto}><Text style={ui.secondaryText}>Chụp lại</Text></Pressable><Pressable style={[ui.secondary, { flex: 1 }]} onPress={() => setPhoto(null)}><Text style={ui.secondaryText}>Bỏ ảnh</Text></Pressable></View>
        </View> : <Pressable accessibilityRole="button" style={ui.secondary} onPress={takePhoto}><Text style={ui.secondaryText}>📷  Chụp ảnh ngựa</Text></Pressable>}
        {needsPhoto && <Text style={ui.error}>Ngựa bị thương: cần chụp ảnh vết thương trước khi gửi.</Text>}
        <TextInput accessibilityLabel="Ghi chú" style={[ui.input, { minHeight: 72, textAlignVertical: 'top' }]} multiline placeholder="Ghi chú (vị trí vết thương, biểu hiện…)" value={notes} onChangeText={setNotes} maxLength={500} />
        {(condition === 'UNSTABLE' || alertType !== 'NONE') && <Text style={ui.warn}>Nhật ký này sẽ tự động gửi SOS cho điều phối.</Text>}
        {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
        {!!message && <Text accessibilityRole="alert" style={ui.ok}>{message}</Text>}
        <Pressable accessibilityRole="button" disabled={!valid || needsPhoto || busy} onPress={submit} style={[ui.button, (!valid || needsPhoto || busy) && { opacity: 0.45 }]}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={ui.buttonText}>Gửi nhật ký sức khỏe</Text>}
        </Pressable>
      </>}
    </View>}

    <View style={ui.card}>
      <View style={ui.rowBetween}><Text style={ui.title}>Nhật ký đã ghi</Text><Pressable onPress={load} hitSlop={8}><Text style={{ color: colors.primary, fontWeight: '600' }}>Tải lại</Text></Pressable></View>
      {!canRecord && !!error && <Text style={ui.error}>{error}</Text>}
      {!logs.length && <Text style={ui.caption}>Chưa có nhật ký sức khỏe cho chuyến này.</Text>}
      {logs.map(log => {
        const alarm = log.condition === 'UNSTABLE' || log.alertType !== 'NONE';
        return <View key={log._id} style={[ui.log, alarm && { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' }]}>
          <View style={ui.rowBetween}><Text style={{ fontWeight: '700', color: colors.text }}>{horseName(log)}</Text><Text style={ui.caption}>{new Date(log.recordedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</Text></View>
          <Text style={{ color: colors.text }}>{log.temperatureCelsius} °C · {log.waterIntakeLiters} lít · {HEALTH_LABELS.food[log.foodIntakeStatus] || log.foodIntakeStatus}</Text>
          <Text style={{ color: alarm ? colors.danger : colors.success, fontWeight: '600' }}>{HEALTH_LABELS.condition[log.condition]}{log.alertType !== 'NONE' ? ` · ${HEALTH_LABELS.alert[log.alertType]}` : ''}</Text>
          {!!log.notes && <Text style={ui.caption}>{log.notes}</Text>}
          {log.photoPath && <Image source={{ uri: `${API_URL}${log.photoPath}`, headers: { Authorization: `Bearer ${accessToken}` } }} style={ui.thumb} accessibilityLabel={`Ảnh của ${horseName(log)}`} />}
        </View>;
      })}
    </View>
  </View>;
}

const ui = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 22, padding: 20, gap: 12, borderWidth: 1, borderColor: colors.border },
  title: { fontSize: 17, fontWeight: '700', color: colors.text }, label: { fontSize: 12, fontWeight: '600', color: colors.muted, marginTop: 4 },
  caption: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  row: { flexDirection: 'row', gap: 10 }, rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  input: { borderWidth: 1, borderColor: colors.border, padding: 14, borderRadius: 14, backgroundColor: '#F8FAF9', fontSize: 16, color: colors.text, minHeight: 50, marginTop: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, minHeight: 40, justifyContent: 'center', borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: '#F8FAF9' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary }, chipDanger: { backgroundColor: colors.danger, borderColor: colors.danger },
  chipText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  preview: { width: '100%', aspectRatio: 4 / 3, borderRadius: 14, backgroundColor: '#E7EEEA' },
  thumb: { width: '100%', aspectRatio: 4 / 3, borderRadius: 12, marginTop: 4, backgroundColor: '#E7EEEA' },
  secondary: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', padding: 12 },
  secondaryText: { color: colors.primary, fontWeight: '700' },
  button: { minHeight: 52, padding: 14, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  error: { color: colors.danger, fontSize: 13 }, warn: { color: colors.warning, fontSize: 13, fontWeight: '600' }, ok: { color: colors.success, fontSize: 13, fontWeight: '600' },
  log: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, gap: 4, backgroundColor: '#F8FAF9' },
});
