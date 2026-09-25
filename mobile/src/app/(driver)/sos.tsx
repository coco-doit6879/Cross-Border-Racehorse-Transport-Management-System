import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '@/context/session';
import { enqueueOfflineEvent, newEventId } from '@/lib/offlineQueue';
import { colors } from '@/theme';

export default function SosScreen() {
  const { tripId, code } = useLocalSearchParams<{ tripId: string; code?: string }>();
  const { apiFetch } = useSession();
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const send = async () => {
    if (description.trim().length < 5) { Alert.alert('Thiếu thông tin', 'Hãy mô tả ngắn tình trạng đang xảy ra.'); return; }
    setSubmitting(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error('Cần quyền vị trí để gửi SOS.');
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const event = { event_id: newEventId('sos'), event_type: 'SOS_TRIGGER' as const, payload: { tripId, coordinates: [location.coords.longitude, location.coords.latitude], description: description.trim(), recordedAt: new Date().toISOString() } };
      try {
        await apiFetch('/incidents/sos', { method: 'POST', body: JSON.stringify({ eventId: event.event_id, ...event.payload }) });
        Alert.alert('Đã gửi SOS', 'Trung tâm điều phối đã nhận cảnh báo và vị trí của bạn.', [{ text: 'Đóng', onPress: () => router.back() }]);
      } catch {
        await enqueueOfflineEvent(event);
        Alert.alert('Đã lưu cảnh báo', 'Hiện không có kết nối. Ứng dụng sẽ gửi SOS ngay khi kết nối lại.', [{ text: 'Đóng', onPress: () => router.back() }]);
      }
    } catch (reason) { Alert.alert('Không thể gửi SOS', reason instanceof Error ? reason.message : 'Vui lòng thử lại.'); }
    finally { setSubmitting(false); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}><Pressable onPress={() => router.back()}><Text style={styles.back}>‹</Text></Pressable><Text style={styles.headerTitle}>Báo sự cố</Text></View>
      <View style={styles.content}><View style={styles.icon}><Text style={styles.iconText}>!</Text></View><Text style={styles.title}>SOS khẩn cấp</Text><Text style={styles.subtitle}>Chuyến {code || tripId}</Text><Text style={styles.help}>Vị trí hiện tại và mô tả sẽ được gửi tới trung tâm điều phối.</Text>
        <Text style={styles.label}>Mô tả tình trạng</Text><TextInput value={description} onChangeText={setDescription} multiline style={styles.input} placeholder="Ví dụ: xe gặp sự cố, ngựa có dấu hiệu bất thường…" textAlignVertical="top" />
        <Pressable disabled={submitting} style={[styles.button, submitting && { opacity: 0.6 }]} onPress={send}>{submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Gửi SOS ngay</Text>}</Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, header: { height: 62, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 16 }, back: { fontSize: 38, lineHeight: 38, color: colors.navy }, headerTitle: { fontSize: 19, fontWeight: '800', color: colors.text },
  content: { padding: 24, alignItems: 'center' }, icon: { width: 78, height: 78, borderRadius: 39, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', marginTop: 24 }, iconText: { color: '#fff', fontSize: 48, fontWeight: '900' }, title: { color: colors.danger, fontWeight: '900', fontSize: 29, marginTop: 18 }, subtitle: { color: colors.text, fontWeight: '800', marginTop: 6 }, help: { color: colors.muted, textAlign: 'center', lineHeight: 21, marginTop: 12, marginBottom: 28 }, label: { alignSelf: 'stretch', color: colors.text, fontWeight: '800', marginBottom: 8 }, input: { alignSelf: 'stretch', minHeight: 130, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: '#fff', padding: 14, fontSize: 16 }, button: { alignSelf: 'stretch', height: 58, borderRadius: 14, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', marginTop: 20 }, buttonText: { color: '#fff', fontSize: 17, fontWeight: '900' },
});
