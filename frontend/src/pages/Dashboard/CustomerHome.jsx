import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Empty, Spin } from 'antd';
import { ArrowUpRight, ArrowRight, FolderHeart } from 'lucide-react';
import { orderApi } from '../../services/orderApi';
import { routeApi } from '../../services/routeApi';
import { connectSocket, getSocket } from '../../socket/socketClient';
import { customerOrderState } from '../../utils/customerOrders';
import { useAuthStore } from '../../store/useAuthStore';
import CustomerTripMap from './CustomerTripMap';
const idOf = o => String(o?._id || o?.id || o || '');
const address = value => typeof value === 'string' ? value : value?.address || 'Chưa cập nhật';
export default function CustomerHome() {
  const user = useAuthStore(s => s.user);
  const [orders, setOrders] = useState([]),
    [routes, setRoutes] = useState([]),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [selected, setSelected] = useState('');
  const load = useCallback(async () => {
    try {
      const [o, r] = await Promise.all([orderApi.getOrders(), routeApi.getRoutes()]);
      setOrders(o.data.data);
      setRoutes(r.data.data);
      setError('');
    } catch (e) {
      setError(e.response?.data?.message || 'Không tải được hành trình.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);
    const socket = connectSocket();
    const refresh = () => load();
    socket?.on('route:location_changed', refresh);
    socket?.on('trip:waypoint_updated', refresh);
    socket?.on('trip:status_updated', refresh);
    return () => {
      clearInterval(timer);
      socket?.off('route:location_changed', refresh);
      socket?.off('trip:waypoint_updated', refresh);
      socket?.off('trip:status_updated', refresh);
    };
  }, [load]);
  const visible = orders.filter(o => ['APPROVED', 'DOCS_PROCESSING', 'CLEARED_FOR_TRANSPORT', 'IN_TRANSIT', 'DELIVERING'].includes(o.status) && (o.preparation?.confirmedAt || routes.some(r => idOf(r.orderId) === idOf(o))));
  useEffect(() => {
    const socket = getSocket();
    for (const route of routes) socket?.emit('join_trip', {
      tripId: route._id
    });
    return () => {
      for (const route of routes) socket?.emit('leave_trip', {
        tripId: route._id
      });
    };
  }, [routes]);
  const order = visible.find(o => idOf(o) === selected) || visible[0],
    route = order && routes.find(r => idOf(r.orderId) === idOf(order));
  const stops = route?.waypoints || [],
    arrived = stops.filter(w => w.status === 'ARRIVED');
  const actions = orders.filter(o => ['payment', 'additional', 'settlement'].includes(customerOrderState(o).group));
  return <section className="customer-home customer-orders-page heritage-home"><header className="home-welcome"><div><span className="h-kicker">Hành trình của bạn</span><h1>Chào {user?.fullName?.replace(/\s*\([^)]*\)/g, '').trim().split(' ').at(-1) || 'bạn'},<br /><em>mọi chuyến đi bắt đầu từ đây.</em></h1><p>Hồ sơ, thanh toán và hành trình — rõ ràng ở từng bước.</p></div><Link className="h-button" to="/orders/create">Sắp xếp chuyến mới<ArrowUpRight size={18} /></Link></header>
 {error && <Alert type="error" showIcon message={error} action={<button onClick={load}>Thử lại</button>} />}
 {loading ? <Spin /> : <><div className="home-top-grid"><section className="home-actions"><div className="home-section-heading"><h2>Việc cần bạn thực hiện</h2><span>{actions.length} yêu cầu</span></div>{actions.length ? actions.map(o => {
            const state = customerOrderState(o);
            return <Link key={idOf(o)} to={`/orders/${idOf(o)}`} className="home-action-row"><span className="home-action-dot" /><div><small>{o.bookingCode}</small><strong>{state.label}</strong><p>{state.message}</p></div><ArrowUpRight size={18} /></Link>;
          }) : <div className="home-clear"><span>Đã sẵn sàng cho bước tiếp theo.</span><p>Hiện không có yêu cầu thanh toán, bổ sung hay bàn giao cần bạn xử lý.</p><Link to="/orders">Xem các đơn của tôi<ArrowRight size={15} /></Link></div>}</section><Link to="/horses" className="home-passport"><FolderHeart size={25} /><span>Hồ sơ ngựa</span><h2>Chuẩn bị tốt.<br />Khởi hành an tâm.</h2><p>Kiểm tra hồ sơ sức khỏe và giấy tờ của ngựa trước khi đặt chuyến.</p><span className="home-passport-link">Mở hồ sơ<ArrowUpRight size={17} /></span></Link></div>
 <div className="home-section-heading home-tracking-heading"><div><span className="h-kicker">Theo dõi vận chuyển</span><h2>Những hành trình đang tiếp nối</h2></div><Link to="/orders">Tất cả chuyến<ArrowRight size={16} /></Link></div>
 {!order ? <div className="home-no-trip"><Empty description="Chưa có chuyến đã xác nhận lộ trình." /><p>Khi phương án được điều phối xác nhận, bản đồ và các mốc hành trình sẽ xuất hiện tại đây.</p><Link to="/orders">Kiểm tra trạng thái đơn →</Link></div> : <div className="home-tracking-workspace"><aside className="home-trip-list">{visible.map(o => <button key={idOf(o)} className={idOf(o) === idOf(order) ? 'is-active' : ''} onClick={() => setSelected(idOf(o))}><small>{o.bookingCode}</small><strong>{address(o.origin)}<ArrowRight size={14} />{address(o.destination)}</strong><span>{customerOrderState(o).label}</span></button>)}</aside><article className="home-trip-map"><div className="home-section-heading"><div><h2>{order.bookingCode}</h2><p>{address(order.origin)} → {address(order.destination)}</p></div><Link to={`/orders/${idOf(order)}`}>Chi tiết<ArrowUpRight size={15} /></Link></div><CustomerTripMap route={route} order={order} /><p className="home-map-caption">{route ? `${arrived.length}/${stops.length} điểm đã đến · ${arrived.length ? `Gần nhất: ${arrived.at(-1).name}` : 'Chưa khởi hành'}` : 'Lộ trình đã xác nhận · Chờ quản lý phân công kíp xe'}</p><ol className="customer-stop-list">{(stops.length ? stops : order.preparation?.plan?.restStops || []).map((w, i) => <li key={w._id || i} className={w.status === 'ARRIVED' ? 'is-arrived' : ''}><strong>{w.status === 'ARRIVED' ? '✓' : i + 1} · {w.name}</strong><span>{w.actualArrival ? `Đã đến ${new Date(w.actualArrival).toLocaleString('vi-VN')}` : 'Chưa xác nhận đến'}</span></li>)}</ol></article></div>}</>}
 </section>;
}
