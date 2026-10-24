import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Button, Empty, Popconfirm, Skeleton, message } from 'antd';
import { CalendarDays, CheckCircle2, ChevronRight, CreditCard, FileText, Flag, Inbox, Plus, Search, Truck, X } from 'lucide-react';
import { useOrderStore } from '../../store/useOrderStore';
import { CUSTOMER_ORDER_FILTERS, ORDER_STEPS, customerOrderState, depositTimeLeft, departureDay, matchesCustomerOrder } from '../../utils/customerOrders';
import './customer-orders.css';

const money = (amount) => `${new Intl.NumberFormat('vi-VN').format(amount)} ₫`;
const statusIcon = (state) => state.group === 'payment' ? CreditCard : state.group === 'completed' ? CheckCircle2 : state.group === 'transit' ? Truck : state.group === 'waiting' ? Inbox : FileText;

function OrderCard({ order, highlighted, now }) {
  const navigate = useNavigate();
  const cancelOrder = useOrderStore((store) => store.cancelOrder);
  const state = customerOrderState(order);
  const StatusIcon = statusIcon(state);
  const id = order.id || order._id;
  const horses = (order.horses || []).map(horse => typeof horse === 'string' ? horse : horse.name).filter(Boolean);
  const originCountry = order.originLocation?.countryCode;
  const destinationCountry = order.destinationLocation?.countryCode;
  const routeType = originCountry && destinationCountry ? originCountry === destinationCountry ? 'Trong nước' : 'Quốc tế' : null;
  const day = departureDay(order);
  const departureLabel = day ? day.split('-').reverse().join('/') : 'Chưa có lịch';
  const total = order.pricing?.totalAmountVnd;
  const paymentExpired = state.needsDeposit && order.depositDueAt && new Date(order.depositDueAt).getTime() <= now;
  const notice = state.needsDeposit ? depositTimeLeft(order, now) || state.message : state.message;
  return <article className={`customer-order-card ${state.group === 'payment' ? 'customer-order-card--payment' : ''} ${highlighted ? 'customer-order-card--new' : ''}`} aria-label={`Đơn ${order.orderCode}`}>
    <header className="customer-order-card-header">
      <div className="customer-order-card-code"><strong>{order.orderCode}</strong>{highlighted && <span className="customer-order-new-tag">Vừa đặt</span>}{routeType && <span className="customer-order-type">{routeType}</span>}</div>
      <span className={`customer-order-status customer-order-status--${state.tone}`}><StatusIcon size={13} />{state.label}</span>
    </header>
    <div className="customer-order-card-body">
      <div className="customer-order-summary"><div className="customer-order-route"><h2>{order.routeLabel || `${order.origin} → ${order.destination}`}</h2><div className="customer-order-meta"><span><CalendarDays size={13} />Khởi hành {departureLabel}</span><span><span aria-hidden="true">♞</span>{horses.length} ngựa</span>{(order.borderCrossing?.name || order.borderGateName) && <span><Flag size={13} />{order.borderCrossing?.name || order.borderGateName}</span>}</div>{horses.length > 0 && <p className="customer-order-horses">{horses.join(', ')}</p>}</div>
        {state.step > 0 && <div className="customer-order-progress"><strong>Bước {state.step}/8: {ORDER_STEPS[state.step - 1]}</strong><div className="customer-order-progress-track" role="progressbar" aria-label={`Tiến độ đơn ${order.orderCode}`} aria-valuemin={0} aria-valuemax={8} aria-valuenow={state.step} aria-valuetext={`${state.step}/8: ${ORDER_STEPS[state.step - 1]}`}>{ORDER_STEPS.map((step, index) => <span key={step} className={state.group === 'completed' || index + 1 < state.step ? 'is-complete' : index + 1 === state.step ? 'is-current' : ''} />)}</div></div>}
      </div>
      <div className={`customer-order-notice ${state.group === 'payment' ? 'customer-order-notice--payment' : ''}`}><StatusIcon size={14} /><p>{notice}</p></div>
    </div>
    <footer className="customer-order-card-footer"><div className="customer-order-total">{Number.isFinite(total) && total > 0 ? <>Tổng giá trị <strong>{money(total)}</strong></> : 'Chưa có báo giá'}</div><div className="customer-order-actions">{order.status === 'PENDING_APPROVAL' && <Popconfirm title="Xác nhận hủy đơn?" description={`Bạn có chắc chắn muốn hủy đơn ${order.orderCode}?`} okText="Hủy đơn" cancelText="Quay lại" okButtonProps={{danger:true}} onConfirm={async () => { try { await cancelOrder(id, 'Khách hàng chủ động hủy đơn'); message.success(`Đã hủy đơn ${order.orderCode}.`); } catch (error) { message.error(error.response?.data?.message || error.message || 'Không thể hủy đơn.'); } }}><button className="customer-order-cancel" type="button">Hủy đơn</button></Popconfirm>}<Link className={`customer-order-button ${state.canPay ? 'customer-order-button--secondary' : ''}`} to={`/orders/${id}`}>Xem chi tiết</Link>{state.canPay && !paymentExpired && <button className="customer-order-button" type="button" onClick={() => navigate(`/orders/${id}`, { state: { openPayment: true } })}>{state.needsDeposit ? order.depositPercent ? `Đặt cọc ${order.depositPercent}%` : 'Đặt cọc' : 'Thanh toán'}</button>}</div></footer>
  </article>;
}

export default function CustomerOrderList() {
  const { orders, fetchOrders, loading, error } = useOrderStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [now, setNow] = useState(Date.now());
  const [dismissedNewId, setDismissedNewId] = useState(null);
  const createdId = location.state?.createdOrderId;
  const newOrder = createdId && orders.find(order => String(order.id || order._id) === String(createdId));
  const requestedStatus = params.get('status') || 'all';
  const status = CUSTOMER_ORDER_FILTERS.some(([value]) => value === requestedStatus) ? requestedStatus : 'all';
  useEffect(() => { fetchOrders().catch(() => {}); }, [fetchOrders]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  const changeStatus = (value) => {
    const next = new URLSearchParams(params);
    if (value === 'all') next.delete('status'); else next.set('status', value);
    setParams(next, { replace: true, state: location.state });
  };
  const invalidDates = Boolean(from && to && from > to);
  const filtered = invalidDates ? [] : orders.filter(order => matchesCustomerOrder(order, {query, status, from, to}));
  const hasFilters = Boolean(query || from || to || status !== 'all');
  const resetFilters = () => { setQuery(''); setFrom(''); setTo(''); changeStatus('all'); };
  const newState = newOrder && customerOrderState(newOrder);
  return <section className="customer-orders-page">
    <nav className="customer-orders-breadcrumb" aria-label="Đường dẫn"><Link to="/dashboard">Trang chủ</Link><ChevronRight size={11} /><span>Đơn hàng của tôi</span></nav>
    <div className="customer-orders-heading"><h1>Đơn hàng của tôi</h1><button className="customer-order-button customer-orders-create" type="button" onClick={() => navigate('/orders/create')}><Plus size={16} />Đặt chuyến mới</button></div>
    {newOrder && dismissedNewId !== createdId && <div className="customer-orders-success" role="status"><CheckCircle2 size={17} /><p>Đơn <strong>{newOrder.orderCode}</strong> vừa tạo nằm trong bộ lọc <strong>{CUSTOMER_ORDER_FILTERS.find(([value]) => value === newState.group)?.[1] || newState.label}</strong>{newState.step > 0 && <>, bước <strong>{newState.step}/8: {ORDER_STEPS[newState.step - 1]}</strong></>}. Theo dõi đơn được đánh dấu bên dưới.{status !== 'all' && status !== newState.group && <button type="button" onClick={() => changeStatus(newState.group)}>Xem đơn vừa tạo</button>}</p><button type="button" aria-label="Đóng thông báo đơn mới" onClick={() => setDismissedNewId(createdId)}><X size={15} /></button></div>}
    <div className="customer-orders-filters" role="search" aria-label="Lọc đơn hàng"><label className="customer-orders-search"><Search size={17} /><input aria-label="Tìm đơn hàng" placeholder="Tìm theo mã đơn, điểm đón, điểm giao, tên ngựa" value={query} onChange={event => setQuery(event.target.value)} />{query && <button type="button" aria-label="Xóa từ khóa" onClick={() => setQuery('')}><X size={14} /></button>}</label><label className="customer-orders-status-filter"><span>Trạng thái</span><select aria-label="Trạng thái" value={status} onChange={event => changeStatus(event.target.value)}>{CUSTOMER_ORDER_FILTERS.map(([value, label]) => <option key={value} value={value}>{label} ({value === 'all' ? orders.length : orders.filter(order => customerOrderState(order).group === value).length})</option>)}</select></label><div className="customer-orders-date-filter"><span>Khởi hành</span><input type="date" aria-label="Khởi hành từ ngày" value={from} onInput={event => setFrom(event.currentTarget.value)} max={to || undefined} onChange={event => setFrom(event.target.value)} /><span aria-hidden="true">→</span><input type="date" aria-label="Khởi hành đến ngày" value={to} onInput={event => setTo(event.currentTarget.value)} min={from || undefined} onChange={event => setTo(event.target.value)} /></div></div>
    {invalidDates && <p className="customer-orders-date-error" role="alert">Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.</p>}
    {error && <Alert type="error" showIcon message="Không thể tải đơn hàng" description={error} action={<Button onClick={() => fetchOrders().catch(() => {})}>Thử lại</Button>} />}
    {loading && orders.length === 0 ? <div className="customer-orders-loading" aria-label="Đang tải đơn hàng"><Skeleton active /><Skeleton active /></div> : !error && <div className="customer-orders-list">{filtered.length > 0 ? filtered.map(order => <OrderCard key={order.id || order._id} order={order} highlighted={String(order.id || order._id) === String(createdId)} now={now} />) : <div className="customer-orders-empty"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={hasFilters ? 'Không có đơn hàng phù hợp với bộ lọc.' : 'Bạn chưa có đơn vận chuyển nào.'} />{hasFilters ? <button className="customer-order-button customer-order-button--secondary" onClick={resetFilters}>Xóa bộ lọc</button> : <button className="customer-order-button" onClick={() => navigate('/orders/create')}><Plus size={15} />Đặt chuyến đầu tiên</button>}</div>}</div>}
  </section>;
}


