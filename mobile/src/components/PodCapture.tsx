import { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import { useSession } from '@/context/session';
import { signatureToPng, type Stroke } from '@/lib/signaturePng';
import { colors } from '@/theme';

type Horse = { _id: string; name: string; microchipId: string };
const ROLES = [
  { value: 'AUTHORIZED_RECIPIENT', label: 'Người nhận ủy quyền' },
  { value: 'STABLE_MANAGER', label: 'Quản lý chuồng đích' },
  { value: 'CUSTOMER', label: 'Chủ ngựa' },
  { value: 'VETERINARIAN', label: 'Bác sĩ thú y' },
] as const;
const CONDITIONS = [
  { value: 'EXCELLENT', label: 'Rất tốt' },
  { value: 'GOOD', label: 'Tốt' },
  { value: 'MINOR_STRESS', label: 'Căng thẳng nhẹ' },
] as const;

/** Receiver signs on the crew's phone at the destination. */
export function PodCapture({ tripId, orderId, horses, recipient, onSigning, onDone }: {
  tripId: string; orderId: string; horses: Horse[]; recipient?: { fullName?: string; phone?: string };
  onSigning?: (active: boolean) => void; onDone: () => void;
}) {
  const { apiFetch } = useSession();
  const [role, setRole] = useState<string>('AUTHORIZED_RECIPIENT');
  const [name, setName] = useState(recipient?.fullName || '');
  const [phone, setPhone] = useState(recipient?.phone || '');
  const [conditions, setConditions] = useState<Record<string, string>>(() => Object.fromEntries(horses.map(h => [h._id, 'GOOD'])));
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [busy, setBusy] = useState(false);
  const box = useRef({ width: 1, height: 1 });
  const current = useRef<Stroke>([]);

  const at = (e: GestureResponderEvent) => ({ x: Math.max(0, Math.min(box.current.width, e.nativeEvent.locationX)), y: Math.max(0, Math.min(box.current.height, e.nativeEvent.locationY)) });
  const start = (e: GestureResponderEvent) => { onSigning?.(true); current.current = [at(e)]; setStrokes(s => [...s, current.current]); };
  const move = (e: GestureResponderEvent) => { current.current.push(at(e)); setStrokes(s => [...s.slice(0, -1), [...current.current]]); };
  const end = () => onSigning?.(false);
  const inkPoints = strokes.reduce((n, s) => n + s.length, 0);

  const submit = async () => {
    if (!name.trim() || !/^[+\d][\d\s.-]{6,19}$/.test(phone.trim())) return Alert.alert('Biên bản giao nhận', 'Nhập họ tên và số điện thoại hợp lệ của người ký nhận.');
    if (inkPoints < 10) return Alert.alert('Biên bản giao nhận', 'Người nhận cần ký tay vào khung chữ ký.');
    setBusy(true);
    try {
      await apiFetch('/pod/sign', { method: 'POST', body: JSON.stringify({
        tripId, orderId, signerName: name.trim(), signerPhone: phone.trim(), signerRole: role,
        signatureImageUrl: signatureToPng(strokes, box.current.width, box.current.height),
        horseConditionsOnArrival: horses.map(h => ({ horseId: h._id, conditionStatus: conditions[h._id] })),
      }) });
      onDone();
    } catch (e) { Alert.alert('Biên bản giao nhận', e instanceof Error ? e.message : 'Không lưu được biên bản.'); }
    finally { setBusy(false); }
  };

  const chip = (selected: boolean, label: string, onPress: () => void) => <Pressable key={label} accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress} style={[ui.chip, selected && ui.chipOn]}><Text style={[ui.chipText, selected && { color: '#fff' }]}>{label}</Text></Pressable>;

  return <View style={ui.card}>
    <Text style={ui.title}>Biên bản giao nhận (POD)</Text>
    <Text style={ui.caption}>Đưa máy cho người nhận ngựa kiểm tra tình trạng từng con và ký xác nhận.</Text>
    <Text style={ui.label}>Bên ký nhận</Text>
    <View style={ui.row}>{ROLES.map(r => chip(role === r.value, r.label, () => setRole(r.value)))}</View>
    <TextInput style={ui.input} placeholder="Họ tên người ký nhận" value={name} onChangeText={setName} maxLength={120} />
    <TextInput style={ui.input} placeholder="Số điện thoại người ký nhận" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={20} />
    {horses.map(h => <View key={h._id} style={{ gap: 6 }}>
      <Text style={ui.label}>{h.name} · {h.microchipId}</Text>
      <View style={ui.row}>{CONDITIONS.map(c => chip(conditions[h._id] === c.value, c.label, () => setConditions(v => ({ ...v, [h._id]: c.value }))))}</View>
    </View>)}
    <Text style={ui.caption}>Ngựa bị thương: không ký, hãy báo SOS để điều phối xử lý trước.</Text>
    <View style={ui.row}><Text style={[ui.label, { flex: 1 }]}>Chữ ký người nhận</Text><Pressable onPress={() => setStrokes([])}><Text style={{ color: colors.primary, fontWeight: '600' }}>Xóa chữ ký</Text></Pressable></View>
    <View
      accessibilityLabel="Khung chữ ký"
      style={ui.pad}
      onLayout={(e: LayoutChangeEvent) => { box.current = { width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height }; }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={start}
      onResponderMove={move}
      onResponderRelease={end}
      onResponderTerminate={end}
    >
      {strokes.flatMap((stroke, si) => stroke.slice(1).map((q, i) => {
        const p = stroke[i], length = Math.hypot(q.x - p.x, q.y - p.y);
        return <View pointerEvents="none" key={`${si}-${i}`} style={{ position: 'absolute', left: (p.x + q.x) / 2 - (length + 3) / 2, top: (p.y + q.y) / 2 - 1.5, width: length + 3, height: 3, borderRadius: 1.5, backgroundColor: colors.text, transform: [{ rotate: `${Math.atan2(q.y - p.y, q.x - p.x)}rad` }] }} />;
      }))}
      {!strokes.length && <Text pointerEvents="none" style={ui.placeholder}>Ký tại đây</Text>}
    </View>
    <Pressable disabled={busy} onPress={submit} accessibilityRole="button" style={[ui.button, busy && { opacity: 0.5 }]}><Text style={ui.buttonText}>{busy ? 'Đang lưu…' : 'Lưu biên bản đã ký'}</Text></Pressable>
  </View>;
}

const ui = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 22, padding: 20, gap: 12, borderWidth: 1, borderColor: colors.border },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  caption: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  label: { color: colors.text, fontSize: 14, fontWeight: '600' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff' },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: colors.border, padding: 14, borderRadius: 14, backgroundColor: '#F8FAF9', fontSize: 16, color: colors.text, minHeight: 50 },
  pad: { height: 170, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: '#fff', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  placeholder: { color: colors.muted, fontSize: 14 },
  button: { minHeight: 52, padding: 14, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
