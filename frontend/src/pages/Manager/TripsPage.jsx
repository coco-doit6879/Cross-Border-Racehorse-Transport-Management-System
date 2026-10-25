import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Drawer, Empty, Input, Table, Tag, Timeline } from 'antd';
import { Link } from 'react-router-dom';
import { RefreshCw, Truck, AlertTriangle, CalendarClock, CheckCircle2 } from 'lucide-react';
import { routeApi } from '../../services/routeApi';
import { orderApi } from '../../services/orderApi';
import { StatusPill } from '../../components/operations/OperationsUI';
import LocationMap from '../../components/common/LocationMap';
import { activeTrip, filterTrips, idOf, tripAlerts, lastCheckin } from '../../utils/tripMonitoring';
import './trip-monitoring.css';
const date = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('vi-VN') : 'Chưa cập nhật';
const point = value => typeof value === 'string' ? value : value?.address || 'Chưa cập nhật';
const filters = [['ALL','Tất cả'],['TODAY','Hôm nay'],['UPCOMING','Sắp khởi hành'],['ACTIVE','Đang chạy'],['ATTENTION','Cần chú ý'],['COMPLETED','Hoàn thành']];
export default function TripsPage() {
  const [data,setData] = useState({routes:[],orders:[]}), [loading,setLoading] = useState(true), [error,setError] = useState('');
  const [updated,setUpdated] = useState(null), [now,setNow] = useState(Date.now()), [filter,setFilter] = useState('ALL'), [search,setSearch] = useState(''), [selected,setSelected] = useState(null);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const [r,o] = await Promise.all([routeApi.getRoutes(),orderApi.getOrders()]);
      if (!Array.isArray(r.data.data) || !Array.isArray(o.data.data)) throw new Error('Dữ liệu chuyến không hợp lệ.');
      setData({routes:r.data.data,orders:o.data.data}); setUpdated(new Date()); setNow(Date.now());
    } catch(e) { setError(e.response?.data?.message || e.message || 'Không thể tải chuyến vận chuyển.'); }
    finally { setLoading(false); }
  },[]);
  useEffect(()=>{load(); const timer=setInterval(load,30000); return ()=>clearInterval(timer);},[load]);
  const rows = data.routes.map(route => { const order = data.orders.find(o=>idOf(o)===idOf(route.orderId)) || (typeof route.orderId==='object' ? route.orderId : {}); return {key:idOf(route),route,order,alerts:tripAlerts(route,order,now)}; });
  const visible = filterTrips(rows,filter,search,now);
  const detail = rows.find(row=>row.key===selected);
  const counts = [
    ['Sắp khởi hành', rows.filter(r=>r.route.status==='SCHEDULED').length, CalendarClock, 'UPCOMING'],
    ['Đang vận chuyển', rows.filter(r=>activeTrip(r.route)).length, Truck, 'ACTIVE'],
    ['Cần chú ý', rows.filter(r=>r.alerts.length).length, AlertTriangle, 'ATTENTION'],
    ['Đã hoàn thành', rows.filter(r=>r.route.status==='COMPLETED').length, CheckCircle2, 'COMPLETED']
  ];
  return <section className="trip-monitor-page">
    <header className="trip-monitor-heading"><div><span className="ops-eyebrow">Điều hành logistics</span><h1>Giám sát chuyến vận chuyển</h1><p>Theo dõi tiến độ, nhân sự và các chuyến cần can thiệp.</p></div><Button onClick={load} loading={loading} icon={<RefreshCw size={15}/>}>Làm mới</Button></header>
    {error && <Alert type="error" showIcon message={error} description={updated ? 'Đang giữ dữ liệu từ lần tải thành công gần nhất.' : 'Chưa tải được dữ liệu. Vui lòng thử lại.'} />}
    <div className="trip-monitor-stats">{counts.map(([label,count,Icon,value])=><button key={value} onClick={()=>setFilter(value)} aria-pressed={filter===value}><Icon size={20}/><span>{label}<strong>{!updated ? '—' : count}</strong></span></button>)}</div>
    <div className="trip-monitor-panel"><div className="trip-monitor-toolbar"><div className="trip-monitor-tabs">{filters.map(([value,label])=><button key={value} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{label}</button>)}</div><Input aria-label="Tìm chuyến vận chuyển" placeholder="Mã đơn, tuyến, biển số, tài xế…" value={search} onChange={e=>setSearch(e.target.value)} allowClear /></div>
    <div className="trip-monitor-updated"><span>{visible.length} / {rows.length} chuyến</span><span>{updated ? 'Cập nhật: '+date(updated)+' · Tự làm mới mỗi 30 giây' : 'Đang chờ dữ liệu từ máy chủ'}</span></div>
    <Table rowKey="key" dataSource={visible} loading={loading} scroll={{x:1100}} pagination={{pageSize:10,showSizeChanger:false}} locale={{emptyText:<Empty description={error ? 'Không thể tải danh sách chuyến.' : rows.length ? 'Không có chuyến phù hợp bộ lọc.' : 'Chưa có vận đơn. Chuyến sẽ xuất hiện sau khi hoàn tất xe, lộ trình và phân công kíp xe.'}/>}} columns={[
      {title:'Chuyến / Hành trình',width:280,render:(_,r)=><div><strong>{r.order.bookingCode || r.key}</strong><p>{point(r.order.origin)} → {point(r.order.destination)}</p><small>{date(r.order.requestedDepartureDate)}</small></div>},
      {title:'Xe & Kíp xe',width:210,render:(_,r)=><div><strong>{r.route.vehiclePlateNumber || 'Chưa có xe'}</strong><p>{r.route.driverId?.fullName || 'Chưa có tài xế'}</p><small>Hộ tống: {r.route.escortId?.fullName || 'Chưa phân công'}</small></div>},
      {title:'Tiến độ',width:220,render:(_,r)=>{const waypoints=r.route.waypoints || []; const arrived=waypoints.filter(w=>w.status==='ARRIVED').length;return <div><StatusPill value={r.route.status}/><p>{r.route.acceptedAt ? 'Tài xế đã tiếp nhận' : 'Tài xế chưa tiếp nhận'}</p><small>{arrived}/{waypoints.length} điểm đã đến</small></div>;}},
      {title:'Theo dõi',width:260,render:(_,r)=><div>{r.alerts.map(a=><Tag color="orange" key={a}>{a}</Tag>)}{!r.alerts.length && <small>Chưa ghi nhận cảnh báo</small>}<p>Check-in: {lastCheckin(r.route)?.name || 'Chưa có'}</p><small>{date(lastCheckin(r.route)?.actualArrival)}</small></div>},
      {title:'',width:150,fixed:'right',render:(_,r)=><Button onClick={()=>setSelected(r.key)}>Xem hành trình</Button>}
    ]}/></div>
    <Drawer title={detail?.order.bookingCode || 'Chi tiết chuyến'} open={!!selected} onClose={()=>setSelected(null)} width="min(740px, 100vw)">
      {detail && <><div className="trip-monitor-detail"><StatusPill value={detail.route.status}/><h2>{point(detail.order.origin)} → {point(detail.order.destination)}</h2><p>Khởi hành: {date(detail.order.requestedDepartureDate)}</p><p>Xe: {detail.route.vehiclePlateNumber || 'Chưa phân công'} · Tài xế: {detail.route.driverId?.fullName || 'Chưa phân công'}</p><p>Hộ tống: {detail.route.escortId?.fullName || 'Chưa phân công'}</p><p>Ngựa: {(detail.order.horseIds || []).map(h=>h.name || idOf(h)).join(', ') || 'Chưa cập nhật'}</p>{detail.alerts.map(a=><Alert key={a} type="warning" showIcon message={a}/>)}</div>
      <h3>Các mốc hành trình</h3><Timeline items={[{children:'Tạo vận đơn · '+date(detail.route.createdAt)},{color:detail.route.acceptedAt?'green':'gray',children:'Tài xế tiếp nhận · '+date(detail.route.acceptedAt)},...(detail.route.waypoints || []).map(w=>({color:w.status==='ARRIVED'?'green':'gray',children:<><strong>{w.name}</strong><p>{w.status==='ARRIVED'?'Đã đến: '+date(w.actualArrival):w.status==='SKIPPED'?'Đã bỏ qua':'Dự kiến: '+date(w.estimatedArrival)}</p></>}))]}/>
      <h3>Điểm check-in gần nhất</h3>{lastCheckin(detail.route) ? <p>{lastCheckin(detail.route).name} · {date(lastCheckin(detail.route).actualArrival)}</p> : <p>Tài xế chưa check-in điểm dừng.</p>}
      <LocationMap originLocation={{coordinates:detail.order.origin?.coordinates,formattedAddress:point(detail.order.origin)}} destinationLocation={{coordinates:detail.order.destination?.coordinates,formattedAddress:point(detail.order.destination)}} height="280px"/>
      <p className="trip-monitor-note">Bản đồ minh họa điểm đón và điểm giao cố định. Tiến độ được cập nhật khi tài xế check-in.</p>
      <div className="trip-monitor-links"><Link className="button button--primary" to={'/orders/'+idOf(detail.order)}>Mở hồ sơ, giao nhận & quyết toán</Link><Link className="button button--secondary" to="/incidents/sos">Sự cố & cảnh báo</Link></div>
      <p className="trip-monitor-note">Ảnh giao nhận, yêu cầu giấy tờ và quyết toán được xem trong chi tiết đơn vận chuyển.</p></>}
    </Drawer>
  </section>;
}
