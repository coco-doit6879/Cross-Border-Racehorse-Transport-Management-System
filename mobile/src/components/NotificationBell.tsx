import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { io } from 'socket.io-client';
import { useSession } from '@/context/session';
import { SOCKET_URL } from '@/lib/config';
import { colors } from '@/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Notice = { _id: string; title: string; message: string; mobilePath?: string; readAt?: string; createdAt: string; urgent: boolean };
type Inbox = { data: Notice[]; unreadCount: number; hasMore: boolean };
export function NotificationBell() {
  const { apiFetch, accessToken, user } = useSession();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false), [items, setItems] = useState<Notice[]>([]), [count, setCount] = useState(0);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [more, setMore] = useState(false);
  const generation = useRef(0);
  const bellRef = useRef<View>(null);
  const [entrance] = useState(() => new Animated.Value(0));
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [anchor, setAnchor] = useState({ left: 12, top: 64, width: 360, arrowRight: 24 });
  const positionPanel = useCallback(() => {
    bellRef.current?.measureInWindow((x, y, width, height) => {
      const panelWidth = Math.min(380, windowWidth - 24);
      const left = Math.max(12, Math.min(x + width - panelWidth, windowWidth - panelWidth - 12));
      setAnchor({ left, top: y + height + 10, width: panelWidth, arrowRight: Math.max(18, Math.min(panelWidth - 24, left + panelWidth - x - width / 2)) });
      setOpen(true);
    });
  }, [windowWidth]);
  useEffect(() => {
    if (!open) return;
    entrance.setValue(0);
    const animation = Animated.timing(entrance, { toValue: 1, duration: 170, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [open, entrance]);
  useEffect(() => { setOpen(false); }, [windowWidth, windowHeight]);
  const load = useCallback(async (before?: string) => {
    const current = generation.current;
    try {
      const r = await apiFetch<Inbox>('/notifications' + (before ? `?before=${before}` : ''));
      if (current !== generation.current) return;
      setItems(old => before ? [...old, ...r.data.filter(n => !old.some(x => x._id === n._id))] : r.data);
      setCount(r.unreadCount); setMore(r.hasMore); setError('');
    } catch (e) { if (current === generation.current) setError(e instanceof Error ? e.message : 'Không tải được thông báo.'); }
  }, [apiFetch]);
  useEffect(() => {
    generation.current++; setItems([]); setCount(0); setOpen(false);
    if (!accessToken || !user) return;
    void load();
    const socket = io(SOCKET_URL, { auth: { token: accessToken } });
    const refresh = () => { void load(); };
    socket.on('notification:new', refresh); socket.on('connect', refresh);
    const timer = setInterval(refresh, 30000);
    return () => { generation.current++; socket.disconnect(); clearInterval(timer); };
  }, [accessToken, user, load]);
  const act = async (fn: () => Promise<void>) => {
    setBusy(true); try { await fn(); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Không cập nhật được.'); } finally { setBusy(false); }
  };
  const visit = (n: Notice) => act(async () => {
    await apiFetch(`/notifications/${n._id}/read`, { method: 'PATCH' });
    setOpen(false);
    if (n.mobilePath?.startsWith('/trips/')) router.push(n.mobilePath as Href);
  });
  return <>
    <View style={[s.bar, { paddingTop: insets.top + 6 }]}><Text style={s.brand}>CBRT DRIVER</Text><View ref={bellRef} collapsable={false}><Pressable accessibilityRole="button" accessibilityLabel={`Thông báo, ${count} chưa đọc`} accessibilityState={{ expanded: open }} onPress={() => { positionPanel(); void load(); }} style={[s.bell, open && s.bellActive]}><Text style={s.bellText}>Thông báo{count ? ` (${count > 99 ? '99+' : count})` : ''}</Text></Pressable></View></View>
    <Modal visible={open} animationType="none" transparent onRequestClose={() => setOpen(false)}>
      <View style={s.shade}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Đóng bảng thông báo" onPress={() => setOpen(false)} />
        <Animated.View accessibilityViewIsModal style={[s.panel, { left: anchor.left, top: anchor.top, width: anchor.width, maxHeight: Math.max(120, Math.min(windowHeight * 0.7, windowHeight - anchor.top - 16)), opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }] }]}>
        <View pointerEvents="none" style={[s.arrow, { right: anchor.arrowRight }]} />
        <View style={s.heading}><Text style={s.title}>Thông báo · {count} chưa đọc</Text><Pressable accessibilityRole="button" accessibilityLabel="Đóng thông báo" onPress={() => setOpen(false)} style={s.close}><Text>Đóng ✕</Text></Pressable></View>
        <View style={s.actions}><Pressable disabled={busy || !count || !items.length} onPress={() => act(async () => { await apiFetch('/notifications/read-all', { method: 'PATCH', body: JSON.stringify({ through: items[0]._id }) }); })}><Text style={s.link}>Đánh dấu tất cả đã đọc</Text></Pressable><Pressable disabled={busy} onPress={() => load()}><Text style={s.link}>Làm mới</Text></Pressable></View>
        {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}{busy && <ActivityIndicator color={colors.primary} />}
        <ScrollView>{!items.length && !error && <Text style={s.empty}>Chưa có thông báo. Nhiệm vụ mới và các cập nhật quan trọng sẽ xuất hiện tại đây.</Text>}
          {items.map(n => <Pressable accessibilityRole="button" disabled={busy} key={n._id} onPress={() => visit(n)} style={[s.item, !n.readAt && s.unread, n.urgent && s.urgent]}><Text style={s.itemTitle}>{!n.readAt && '● '}{n.title}</Text><Text style={s.body}>{n.message}</Text><Text style={s.time}>{new Date(n.createdAt).toLocaleString('vi-VN')}{n.mobilePath ? ' · Mở chuyến' : ''}</Text></Pressable>)}
          {more && <Pressable disabled={busy} style={s.close} onPress={() => load(items[items.length - 1]._id)}><Text style={s.link}>Xem thông báo cũ hơn</Text></Pressable>}
        </ScrollView>
      </Animated.View></View>
    </Modal>
  </>;
}
const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 5, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.border },
  brand: { fontSize: 10, letterSpacing: 2, fontWeight: '700', color: colors.primary }, bell: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 14, backgroundColor: colors.accentLight }, bellText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  bellActive: { backgroundColor: '#edf4ef', borderRadius: 10 },
  shade: { flex: 1, backgroundColor: '#0928190a' },
  panel: { position: 'absolute', backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e2eae4', shadowColor: '#123624', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 22, elevation: 10 },
  arrow: { position: 'absolute', top: -7, width: 13, height: 13, backgroundColor: '#fff', borderTopWidth: 1, borderLeftWidth: 1, borderColor: '#e2eae4', transform: [{ rotate: '45deg' }] },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, title: { fontSize: 16, fontWeight: '700', color: colors.text, flexShrink: 1 }, close: { padding: 12, minHeight: 44 }, actions: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, gap: 12 }, link: { color: colors.primary, fontWeight: '600', fontSize: 12 },
  item: { padding: 16, gap: 8, borderBottomWidth: 1, borderBottomColor: colors.border }, unread: { backgroundColor: '#edf6f0' }, urgent: { borderLeftWidth: 3, borderLeftColor: colors.danger }, itemTitle: { color: colors.text, fontWeight: '700', lineHeight: 22 }, body: { color: colors.text, lineHeight: 21 }, time: { color: colors.muted, fontSize: 11 }, error: { color: colors.danger, paddingVertical: 12 }, empty: { color: colors.muted, paddingVertical: 28, lineHeight: 22 }
});
