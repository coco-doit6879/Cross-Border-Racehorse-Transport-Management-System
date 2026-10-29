import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Badge, Button, Popover, Alert, notification } from 'antd';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/apiClient';
import { connectSocket } from '../../socket/socketClient';
import { useAuthStore } from '../../store/useAuthStore';
import './notifications.css';

export default function NotificationBell() {
  const userId = useAuthStore(s => s.user?._id || s.user?.id);
  const navigate = useNavigate();
  const [items, setItems] = useState([]), [count, setCount] = useState(0), [more, setMore] = useState(false);
  const [error, setError] = useState(''), [open, setOpen] = useState(false), [busy, setBusy] = useState(false);
  const [popup, context] = notification.useNotification();
  const shown = useRef(new Set()), generation = useRef(0);
  const load = useCallback(async (before) => {
    const current = generation.current;
    try {
      const r = await api.get('/notifications', { params: before ? { before } : {} });
      if (current !== generation.current) return;
      setItems(old => before ? [...old, ...r.data.data.filter(n => !old.some(x => x._id === n._id))] : r.data.data);
      setCount(r.data.unreadCount); setMore(r.data.hasMore); setError('');
      for (const n of r.data.data) if (!n.urgent || n.readAt) popup.destroy(n._id);
      for (const n of r.data.data.filter(n => n.urgent && !n.readAt)) {
        if (shown.current.has(n._id)) continue;
        shown.current.add(n._id);
        popup.error({ key: n._id, message: n.title, description: n.message, duration: 0,
          btn: <Button danger onClick={() => { popup.destroy(n._id); navigate(n.webPath); }}>Mở xử lý SOS</Button> });
      }
    } catch { if (current === generation.current) setError('Không tải được thông báo. Bấm thử lại.'); }
  }, [navigate, popup]);
  useEffect(() => {
    generation.current++; setItems([]); setCount(0); shown.current.clear();
    if (!userId) return;
    void load(); const socket = connectSocket(); const refresh = () => { void load(); };
    socket.on('notification:new', refresh); socket.on('connect', refresh);
    const timer = setInterval(refresh, 30000);
    return () => { generation.current++; clearInterval(timer); socket.off('notification:new', refresh); socket.off('connect', refresh); popup.destroy(); };
  }, [userId, load, popup]);
  const act = async fn => { setBusy(true); try { await fn(); await load(); } catch { setError('Chưa cập nhật được thông báo. Thử lại.'); } finally { setBusy(false); } };
  const visit = item => act(async () => { await api.patch(`/notifications/${item._id}/read`); setOpen(false); popup.destroy(item._id); navigate(item.webPath); });
  return <>{context}<Popover trigger="click" placement="bottomRight" open={open} onOpenChange={value => { setOpen(value); if (value) void load(); }} content={<section className="notification-inbox" aria-label="Thông báo">
    <div className="notification-heading"><strong>Thông báo · {count} chưa đọc</strong><Button size="small" disabled={busy || !items.length || !count} onClick={() => act(() => api.patch('/notifications/read-all', { through: items[0]._id }))}>Đọc tất cả</Button></div>
    {error && <Alert type="error" message={error} action={<Button size="small" onClick={() => load()}>Thử lại</Button>} />}
    {!items.length && !error && <p className="notification-empty">Chưa có thông báo. Các việc cần xử lý sẽ xuất hiện tại đây.</p>}
    <div className="notification-list">{items.map(n => <button type="button" disabled={busy} className={`notification-item ${n.readAt ? '' : 'unread'} ${n.urgent ? 'urgent' : ''}`} key={n._id} onClick={() => visit(n)}><strong>{!n.readAt && '● '}{n.title}</strong><span>{n.message}</span><small>{new Date(n.createdAt).toLocaleString('vi-VN')} · Mở chi tiết</small></button>)}</div>
    {more && <Button block disabled={busy} onClick={() => load(items[items.length - 1]._id)}>Xem thông báo cũ hơn</Button>}
  </section>}><button className="notification-trigger" type="button" aria-label={`Thông báo, ${count} chưa đọc`} aria-expanded={open}><Badge count={count} overflowCount={99}><Bell size={21} /></Badge></button></Popover></>;
}
