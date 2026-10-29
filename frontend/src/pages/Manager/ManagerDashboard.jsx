import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Empty, Input, Skeleton, Table } from 'antd';
import { ArrowRight, ArrowUpRight, Search, RefreshCw, CalendarDays, ChevronLeft, ChevronRight, LayoutGrid, List, PackageCheck, Route, Users, MoveUpRight, Clock3, ShieldCheck, Check, Truck } from 'lucide-react';
import usePlanning from '../Backoffice/usePlanning';
import OrderReviewModal from '../Backoffice/OrderReviewModal';
import { date, idOf, readyForQuote, routeLabel } from '../Backoffice/planningUtils';
import './manager-overview.css';

const phase = o => ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(o.status) ? 'closed' : o.status === 'INCIDENT_HANDLING' ? 'incident' : ['IN_TRANSIT', 'DELIVERING'].includes(o.status) ? 'transit' : o.preparation?.assignedAt ? 'assigned' : o.status === 'PENDING_APPROVAL' ? o.depositStatus === 'PAID' ? 'intake' : 'deposit' : o.paymentStatus !== 'PAID' ? 'balance' : o.preparation?.confirmedAt ? 'crew' : 'plan';
const labels = { deposit: 'Chờ đặt cọc', intake: 'Chờ tiếp nhận', balance: 'Chờ thanh toán đủ', plan: 'Chờ xe & lộ trình', crew: 'Chờ phân công kíp xe', assigned: 'Đã phân công', transit: 'Đang vận chuyển', incident: 'Đang xử lý sự cố', closed: 'Đã kết thúc' };
const groups = [
  { key: 'intake', title: 'Tiếp nhận', phases: ['deposit', 'intake'], icon: PackageCheck, hint: 'Đơn mới và đặt cọc' },
  { key: 'preparation', title: 'Chuẩn bị chuyến', phases: ['balance', 'plan', 'crew', 'assigned'], icon: Users, hint: 'Thanh toán, xe và kíp xe' },
  { key: 'journey', title: 'Trên hành trình', phases: ['transit', 'incident'], icon: Route, hint: 'Vận chuyển và giao nhận' },
  { key: 'closed', title: 'Đã kết thúc', phases: ['closed'], icon: Check, hint: 'Hoàn thành, hủy hoặc từ chối' }
];
const dayKey = (value, zone = 'Asia/Bangkok') => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat('en-CA', { timeZone: zone || 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
};
const addDays = (key, amount) => { const d = new Date(key + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + amount); return d.toISOString().slice(0, 10); };
const time = o => new Date(o.requestedDepartureDate).toLocaleTimeString('vi-VN', { timeZone: o.departureTimezone || 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' });
const stop = location => (location?.address || 'Chưa có điểm').replace(/, (VN|KH|TH|MY|SG)$/, '');
function Phase({ order }) { return <span className={'mo-phase mo-phase-' + phase(order)}>{order.status === 'COMPLETED' ? 'Hoàn thành' : order.status === 'CANCELLED' ? 'Đã hủy' : order.status === 'REJECTED' ? 'Từ chối' : labels[phase(order)]}</span>; }

export default function ManagerDashboard() {
  const { data, loading, error, load } = usePlanning();
  const today = dayKey(new Date());
  const [query, setQuery] = useState(''), [filter, setFilter] = useState('all'), [view, setView] = useState('board');
  const [selectedId, setSelectedId] = useState(null), [selectedDay, setSelectedDay] = useState(today), [weekStart, setWeekStart] = useState(today);
  const orders = data.orders.map(o => data.routes.some(r => r.status === 'INCIDENT_HANDLING' && idOf(r.orderId) === idOf(o)) ? { ...o, status: 'INCIDENT_HANDLING' } : o);
  const active = orders.filter(o => phase(o) !== 'closed');
  const intake = active.filter(o => phase(o) === 'intake'), crew = active.filter(readyForQuote);
  const travelling = active.filter(o => ['transit', 'incident'].includes(phase(o)));
  const incidents = data.routes.filter(r => r.status === 'INCIDENT_HANDLING');
  const upcoming = active.filter(o => !['transit', 'incident'].includes(phase(o)) && new Date(o.requestedDepartureDate) >= new Date()).sort((a,b) => new Date(a.requestedDepartureDate) - new Date(b.requestedDepartureDate));
  const next = upcoming[0], selected = data.orders.find(o => idOf(o) === selectedId);
  const matchesPhase = (o, key) => key === 'all' || (key === 'active' ? phase(o) !== 'closed' : key === 'decision' ? phase(o) === 'intake' || readyForQuote(o) : key === 'transit' ? ['transit', 'incident'].includes(phase(o)) : phase(o) === key);
  const countFor = key => orders.filter(o => matchesPhase(o, key)).length;
  const rows = orders.filter(o => matchesPhase(o, filter) && `${o.bookingCode} ${o.customerId?.fullName || ''} ${routeLabel(o)}`.toLowerCase().includes(query.toLowerCase()));
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const scheduled = active.filter(o => dayKey(o.requestedDepartureDate, o.departureTimezone) === selectedDay).sort((a,b) => new Date(a.requestedDepartureDate) - new Date(b.requestedDepartureDate));
  const selectDay = key => { if (!key) return; setSelectedDay(key); if (key < weekStart || key > addDays(weekStart, 6)) setWeekStart(key); };
  const metrics = [
    { label: 'Đơn đang mở', value: active.length, suffix: 'đơn', icon: PackageCheck, note: 'Toàn bộ đơn chưa kết thúc', action: () => setFilter('active') },
    { label: 'Cần quyết định', value: intake.length + crew.length, suffix: 'việc', icon: MoveUpRight, note: intake.length + ' tiếp nhận · ' + crew.length + ' phân công', action: () => setFilter('decision') },
    { label: 'Đang vận chuyển', value: travelling.length, suffix: 'chuyến', icon: Truck, note: incidents.length ? incidents.length + ' chuyến đang xử lý sự cố' : 'Bao gồm chuyến đang giao nhận', action: () => setFilter('transit') },
    { label: 'Ngựa trong kế hoạch', value: active.reduce((sum,o) => sum + (o.horseIds?.length || 0), 0), suffix: 'ngựa', icon: ShieldCheck, note: 'Theo các đơn vận chuyển đang mở', action: () => setFilter('all') }
  ];
  const orderCard = o => <button className="mo-order" key={idOf(o)} onClick={() => setSelectedId(idOf(o))}>
    <div className="mo-order-top"><strong>{o.bookingCode}</strong><ArrowUpRight size={15} /></div><Phase order={o} /><p className="mo-customer">{o.customerId?.fullName || 'Chưa cập nhật khách hàng'}</p>
    <div className="mo-card-route"><span><i />{stop(o.origin)}</span><span><i />{stop(o.destination)}</span></div>
    <div className="mo-card-meta"><span><CalendarDays size={12} />{date(o.requestedDepartureDate)}</span><span>{o.horseIds?.length || 0} ngựa</span></div>
    <div className="mo-card-owner"><span className="mo-avatar">{['intake','crew'].includes(phase(o)) ? 'QL' : phase(o) === 'assigned' ? 'TX' : 'CB'}</span>{['intake','crew'].includes(phase(o)) ? 'Quản lý cần xử lý' : labels[phase(o)]}</div>
  </button>;
  return <section className="bo-page mo-dashboard" aria-busy={loading}>
    <header className="mo-heading"><div><span className="mo-eyebrow">CBRT / BÀN ĐIỀU HÀNH</span><h1>Tổng quan vận hành<span>.</span></h1><p>Nhìn toàn cảnh. Quyết định đúng lúc.</p></div><div className="mo-heading-tools"><span>{new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Bangkok' }).format(new Date())}</span><Button aria-label="Làm mới tổng quan" onClick={load} loading={loading} icon={<RefreshCw size={15} />}>Làm mới</Button></div></header>
    {error && <Alert type="error" showIcon message={error} action={<Button onClick={load}>Thử lại</Button>} />}
    {!!incidents.length && <Alert type="error" showIcon message={incidents.length + ' chuyến đang cần xử lý sự cố'} action={<Link to="/incidents/sos">Mở xử lý SOS →</Link>} />}
    <div className="mo-spotlight-grid">
      <section className="mo-spotlight"><div className="mo-spotlight-top"><span><i />CHUYẾN KHỞI HÀNH GẦN NHẤT</span><span className="mo-outline-tag">{next ? next.origin?.countryCode === next.destination?.countryCode ? 'Nội địa' : 'Xuyên biên giới' : 'Lịch vận chuyển'}</span></div>
        {loading && !data.orders.length ? <Skeleton active paragraph={{ rows: 2 }} /> : next ? <>
          <div className="mo-hero-code"><strong>{next.bookingCode}</strong><span>{date(next.requestedDepartureDate)}<b>·</b>{time(next)}</span></div>
          <div className="mo-hero-route"><div><span>ĐIỂM ĐÓN</span><h2>{stop(next.origin)}</h2><small>{next.origin?.countryCode}</small></div><div className="mo-route-line" aria-hidden="true"><i /><span /><Truck size={22} /><span /><i /></div><div><span>ĐIỂM GIAO</span><h2>{stop(next.destination)}</h2><small>{next.destination?.countryCode}</small></div></div>
          <div className="mo-hero-footer"><span><Users size={14} />{next.horseIds?.length || 0} ngựa<em>·</em>{labels[phase(next)]}</span><button onClick={() => setSelectedId(idOf(next))}>Xem hành trình<ArrowUpRight size={16} /></button></div>
        </> : <div className="mo-hero-empty"><Route size={32} /><h2>Sẵn sàng cho hành trình tiếp theo</h2><p>Chuyến sắp khởi hành sẽ xuất hiện tại đây khi có lịch mới.</p><Link to="/manager/trips">Xem các chuyến vận chuyển <ArrowRight size={15} /></Link></div>}
      </section>
      <section className="mo-decisions"><div className="mo-section-heading"><div><span className="mo-eyebrow">ƯU TIÊN XỬ LÝ</span><h2>Cần bạn quyết định</h2></div><span className="mo-count">{intake.length + crew.length}</span></div><Link to="/manager/intake"><span className="mo-decision-icon"><PackageCheck size={20} /></span><div><strong>Tiếp nhận đơn</strong><small>Đã thanh toán tiền cọc</small></div><b>{intake.length}</b><ArrowUpRight size={16} /></Link><Link to="/manager/approvals"><span className="mo-decision-icon"><Users size={20} /></span><div><strong>Phân công kíp xe</strong><small>Xe và lộ trình đã xác nhận</small></div><b>{crew.length}</b><ArrowUpRight size={16} /></Link><p className="mo-decision-note"><ShieldCheck size={14} />{intake.length + crew.length ? 'Các bước tiếp theo đang chờ quyết định của bạn.' : 'Chưa có công việc chờ quản lý xử lý.'}</p></section>
    </div>
    <div className="mo-metrics">{metrics.map((m,i) => <button key={m.label} className={'mo-metric mo-metric-' + i} onClick={m.action}><div><span>{m.label}</span><m.icon size={17} /></div><strong>{loading && !data.orders.length ? '—' : m.value}<small>{m.suffix}</small></strong><p>{m.note}</p></button>)}</div>
    <section className="mo-calendar"><div className="mo-section-heading"><div className="mo-calendar-title"><span className="mo-icon-square"><CalendarDays size={19} /></span><div><h2>Lịch khởi hành</h2><p>Theo giờ tại điểm đón · chọn ngày để xem chuyến</p></div></div><div className="mo-calendar-controls"><button aria-label="Tuần trước" onClick={() => { setWeekStart(addDays(weekStart,-7)); setSelectedDay(addDays(selectedDay,-7)); }}><ChevronLeft size={17} /></button><button onClick={() => { setWeekStart(today); setSelectedDay(today); }}>Hôm nay</button><button aria-label="Tuần sau" onClick={() => { setWeekStart(addDays(weekStart,7)); setSelectedDay(addDays(selectedDay,7)); }}><ChevronRight size={17} /></button><label className="mo-date-picker"><span>Chọn ngày</span><input type="date" aria-label="Chọn ngày khởi hành" value={selectedDay} onChange={e => selectDay(e.target.value)} /></label></div></div>
      <div className="mo-calendar-body"><div className="mo-week">{week.map(key => { const n = active.filter(o => dayKey(o.requestedDepartureDate,o.departureTimezone) === key).length; return <button key={key} className={selectedDay === key ? 'is-selected' : ''} aria-pressed={selectedDay === key} aria-label={date(key + 'T12:00:00Z') + ', ' + n + ' chuyến'} onClick={() => setSelectedDay(key)}><span>{new Date(key + 'T12:00:00Z').toLocaleDateString('vi-VN',{weekday:'short',timeZone:'UTC'})}{key === today && <i />}</span><strong>{key.slice(8)}</strong><small>{key.slice(5,7)} / {key.slice(0,4)}</small><em className={n ? 'has-trips' : ''}>{n ? n + ' chuyến' : 'Trống lịch'}</em></button>; })}</div><div className="mo-day-agenda"><span className="mo-eyebrow">NGÀY {date(selectedDay + 'T12:00:00Z')}</span>{scheduled.length ? scheduled.map(o => <button key={idOf(o)} onClick={() => setSelectedId(idOf(o))}><time>{time(o)}</time><div><strong>{o.bookingCode}</strong><span>{stop(o.origin)} → {stop(o.destination)}</span></div><ArrowUpRight size={15} /></button>) : <div className="mo-agenda-empty"><Clock3 size={22} /><p>Chưa có chuyến khởi hành</p><span>Chọn ngày có lịch để xem chi tiết.</span></div>}</div></div>
    </section>
    <section className="mo-register"><div className="mo-section-heading"><div><span className="mo-eyebrow">THEO DÕI XUYÊN SUỐT</span><h2>Tiến độ vận chuyển <small>{data.orders.length} đơn</small></h2></div><div className="mo-register-tools"><Input prefix={<Search size={15} />} aria-label="Tìm đơn vận chuyển" placeholder="Mã đơn, khách hàng, tuyến…" value={query} onChange={e => setQuery(e.target.value)} allowClear /><div className="mo-view-switch"><button aria-label="Xem dạng bảng tiến độ" aria-pressed={view === 'board'} onClick={() => setView('board')}><LayoutGrid size={17} /></button><button aria-label="Xem dạng danh sách" aria-pressed={view === 'list'} onClick={() => setView('list')}><List size={17} /></button></div></div></div>
      <div className="mo-filters" aria-label="Lọc giai đoạn">{[['all','Tất cả'],['active','Đang mở'],['decision','Cần quyết định'],...Object.entries(labels)].map(([key,label]) => <button key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}<span>{countFor(key)}</span></button>)}</div>
      {loading && !data.orders.length ? <Skeleton active paragraph={{rows:4}} /> : view === 'board' ? <div className="mo-board">{groups.map(group => { const orders = rows.filter(o => group.phases.includes(phase(o))); const Icon=group.icon; return <section className={'mo-lane mo-lane-' + group.key} key={group.key}><header><span className="mo-lane-dot" /><h3>{group.title}</h3><b>{orders.length}</b></header><p className="mo-lane-hint">{group.hint}</p>{orders.length ? orders.map(orderCard) : <div className="mo-lane-empty"><Icon size={22} strokeWidth={1.3} /><span>{query || filter !== 'all' ? 'Không có đơn phù hợp' : 'Chưa có đơn ở giai đoạn này'}</span></div>}</section>; })}</div> : <div className="mo-table"><Table rowKey={idOf} dataSource={rows} pagination={{pageSize:8,hideOnSinglePage:true}} scroll={{x:650}} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có đơn phù hợp" /> }} columns={[
        { title:'Đơn / Khách hàng', render:(_,o)=><><strong>{o.bookingCode}</strong><div className="bo-secondary">{o.customerId?.fullName || 'Chưa cập nhật'}</div></> },
        { title:'Hành trình', render:(_,o)=><><span>{routeLabel(o)}</span><div className="bo-secondary">{date(o.requestedDepartureDate)} · {o.horseIds?.length || 0} ngựa</div></> },
        { title:'Giai đoạn', render:(_,o)=><Phase order={o} /> },
        { title:'',render:(_,o)=><button className="mo-detail-button" onClick={()=>setSelectedId(idOf(o))}>Xem đơn <ArrowUpRight size={14}/></button> }
      ]} /></div>}
      <footer className="mo-register-footer"><span>Hiển thị {rows.length} / {data.orders.length} đơn vận chuyển</span><Link to="/manager/trips">Xem tất cả chuyến<ArrowRight size={14} /></Link></footer>
    </section>
    {selected && <OrderReviewModal order={selected} data={data} mode={readyForQuote(selected) ? 'quote' : 'intake'} onClose={() => setSelectedId(null)} onSaved={load} />}
  </section>;
}
