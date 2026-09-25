import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme';

const labels: Record<string, string> = {
  SCHEDULED: 'Đã phân công', IN_TRANSIT: 'Đang vận chuyển', INCIDENT_HANDLING: 'Đang xử lý sự cố',
  DELIVERING: 'Đang bàn giao', COMPLETED: 'Hoàn thành', CANCELLED: 'Đã hủy',
};

export function StatusBadge({ status }: { status: string }) {
  const tone = status === 'COMPLETED' ? colors.success : status === 'CANCELLED' || status === 'INCIDENT_HANDLING' ? colors.danger : status === 'SCHEDULED' ? colors.warning : '#2563EB';
  return <View style={[styles.badge, { backgroundColor: `${tone}16` }]}><Text style={[styles.text, { color: tone }]}>{labels[status] || status}</Text></View>;
}
const styles = StyleSheet.create({ badge: { alignSelf: 'flex-start', borderRadius: 99, paddingVertical: 6, paddingHorizontal: 10 }, text: { fontSize: 12, fontWeight: '800' } });
