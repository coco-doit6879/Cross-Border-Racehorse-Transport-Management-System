import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useSession } from '@/context/session';
import type { TransportRoute } from '@/types/domain';

export function DemoJourney({ route, onChanged }: { route: TransportRoute; onChanged: () => void }) {
  const { apiFetch } = useSession();
  const [busy, setBusy] = useState(false);
  const ordered = [...route.waypoints].sort((a, b) => a.sequence - b.sequence);
  const next = ordered.find(w => w.status === 'PENDING');
  const rest = ordered.find(w => w.type === 'REST_STOP' && w.status === 'ARRIVED' && !w.demoDepartedAt);
  const act = async (action: string) => {
    setBusy(true);
    try {
      await apiFetch(`/routes/${route._id}/demo`, { method: 'POST', body: JSON.stringify({ action }) });
      onChanged();
      if (action === 'ARRIVE') Alert.alert('Đã đến điểm mô phỏng', 'Bấm Check-in tại điểm tiếp theo bên dưới để ghi nhận.');
    } catch (e) { Alert.alert('Mô phỏng', e instanceof Error ? e.message : 'Không thể cập nhật.'); }
    finally { setBusy(false); }
  };
  const button = (label: string, action: string) => <Pressable disabled={busy} onPress={() => act(action)} style={{ backgroundColor: busy ? '#94a3b8' : '#0f3e2e', padding: 16, borderRadius: 10 }}><Text style={{ color: 'white', fontWeight: '700' }}>{busy ? 'Đang cập nhật…' : label}</Text></Pressable>;
  if (!['SCHEDULED', 'IN_TRANSIT', 'DELIVERING'].includes(route.status)) return null;
  return <View style={{ backgroundColor: '#fff7ed', borderColor: '#fdba74', borderWidth: 1, borderRadius: 14, padding: 16, gap: 12 }}>
    <Text style={{ fontWeight: '800', fontSize: 18 }}>DEMO · Hành trình mô phỏng</Text>
    <Text>Vị trí và trạm nghỉ giả lập để trình diễn; không phải GPS thực tế.</Text>
    {!route.demoSimulation ? button('Bật mô phỏng và thêm trạm nghỉ', 'ENABLE') : <>
      <Text>Đã đến {ordered.filter(w => w.status === 'ARRIVED').length}/{ordered.length} điểm.</Text>
      <Text style={{ fontWeight: '700' }}>{rest ? `Đang nghỉ: ${rest.name}` : next ? `Điểm tiếp theo: ${next.name}` : 'Đã tới tất cả điểm. Có thể bắt đầu bàn giao.'}</Text>
      <Text>Di chuyển mô phỏng → Check-in → Kết thúc nghỉ → Điểm tiếp theo.</Text>
      {route.status === 'SCHEDULED' ? <Text>Hoàn tất tiếp nhận, hồ sơ và bấm Bắt đầu chuyến trước.</Text> : rest ? button('Kết thúc nghỉ · Tiếp tục hành trình', 'CONTINUE') : next ? button('Di chuyển mô phỏng tới điểm tiếp theo', 'ARRIVE') : null}
      {ordered.filter(w => w.actualArrival).map(w => <Text key={w._id}>{w.name}: đến {new Date(w.actualArrival!).toLocaleTimeString('vi-VN')}{w.demoDepartedAt ? ` · rời ${new Date(w.demoDepartedAt).toLocaleTimeString('vi-VN')}` : ''}</Text>)}
    </>}
  </View>;
}
