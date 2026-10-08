import { useEffect, useState } from 'react';
import { AppState, Text, View } from 'react-native';
import { useSession } from '@/context/session';
import { listOfflineEvents, removeOfflineEvents } from '@/lib/offlineQueue';

export function OfflineSync() {
  const { user, apiFetch } = useSession();
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (!user?.id) return;
    let disposed = false; let running = false;
    const sync = async () => {
      if (running || disposed || AppState.currentState !== 'active') return;
      running = true;
      try {
        const events = (await listOfflineEvents(user.id)).slice(0, 100);
        if (!events.length) { if (!disposed) setNotice(''); return; }
        if (disposed) return;
        const body = await apiFetch<{ results: { event_id: string; status: string; error?: string }[] }>('/sync/events', { method: 'POST', body: JSON.stringify({ events }) });
        await removeOfflineEvents(body.results.filter(x => x.status === 'SUCCESS').map(x => x.event_id));
        const failed = body.results.filter(x => x.status !== 'SUCCESS');
        if (!disposed) setNotice(failed.length ? `${failed.length} sự kiện chưa gửi được: ${failed[0].error || 'Cần kiểm tra với điều phối'}` : '');
      } catch { if (!disposed) setNotice('Dữ liệu offline chưa đồng bộ. SOS khẩn cấp: gọi trực tiếp điều phối.'); }
      finally { running = false; }
    };
    void sync(); const timer = setInterval(sync, 15000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void sync(); });
    return () => { disposed = true; clearInterval(timer); listener.remove(); };
  }, [user?.id, apiFetch]);
  return notice ? <View style={{ padding: 10, backgroundColor: '#fff3cd' }}><Text accessibilityRole="alert">{notice}</Text></View> : null;
}
