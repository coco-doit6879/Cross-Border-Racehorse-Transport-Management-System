import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Alert, Button, Card, Divider, Modal, Skeleton, Tag, message } from 'antd';
import { useOrderStore } from '../../store/useOrderStore';
import { useAuthStore } from '../../store/useAuthStore';
import LocationMap from '../../components/common/LocationMap';
import ComplianceDocuments from '../../components/operations/ComplianceDocuments';
import OrderOperations from '../../components/operations/OrderOperations';
import { Workspace, StatusPill } from '../../components/operations/OperationsUI';
import './order-detail.css';
import api from '../../services/apiClient';
import {ORDER_STEPS,customerOrderState} from '../../utils/customerOrders';

const formatVnd = value => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value || 0);
const locationText = value => typeof value === 'string' ? value : value?.address || 'Chưa cập nhật';
const progressLabels = ORDER_STEPS;
const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { orders, fetchOrderById, createVnpayPayment, loading, error } = useOrderStore();
  const user = useAuthStore(state => state.user);
  const [paymentOpen, setPaymentOpen] = useState(Boolean(location.state?.openPayment));
  const [tab, setTab] = useState(new URLSearchParams(location.search).get('tab') === 'documents' ? 'documents' : 'overview');
  const [visited, setVisited] = useState(['overview', ...(new URLSearchParams(location.search).get('tab') === 'documents' ? ['documents'] : [])]);
  const [pendingDocuments, setPendingDocuments] = useState(0);
  const [mapOpen, setMapOpen] = useState(false);
  const order = orders.find(o => String(o.id || o._id) === String(id) || o.orderCode === id);
  useEffect(() => { if (id) fetchOrderById(id).catch(() => {}); }, [fetchOrderById, id]);
  useEffect(() => { const target = new URLSearchParams(location.search).get('tab') === 'documents' ? 'documents' : 'overview'; setTab(target); setVisited(['overview', target]); setMapOpen(false); }, [id, location.search]);
  useEffect(() => {
    if (!order?._id && !order?.id) return;
    let active = true;
    const load = async () => { try { const r = await api.get('/compliance/checklist/' + (order.id || order._id)); if (active) setPendingDocuments(r.data.data.filter(d => d.category === 'HORSE' && ['PENDING_UPLOAD', 'REJECTED'].includes(d.status)).length); } catch { /* Existing order error handling remains available. */ } };
    load(); const timer = setInterval(load, 30000);
    return () => { active = false; clearInterval(timer); };
  }, [order?.id, order?._id]);
  const changeTab = value => { setTab(value); setVisited(current => current.includes(value) ? current : [...current, value]); };
  if (!order) return <Workspace eyebrow="Đơn vận chuyển" title="Chi tiết đơn hàng">{error ? <Alert type="error" message={error} action={<Button onClick={() => fetchOrderById(id).catch(() => {})}>Thử lại</Button>} /> : <Skeleton active />}</Workspace>;
  const needsDeposit = order.depositRequired && order.depositStatus !== 'PAID';
  const canPayBalance = ['APPROVED', 'DOCS_PROCESSING', 'CLEARED_FOR_TRANSPORT'].includes(order.status);
  const canPay =
    user?.role === 'CUSTOMER' &&
    order.paymentStatus !== 'PAID' &&
    (needsDeposit ? order.status === 'PENDING_APPROVAL' : canPayBalance) &&
    order.pricing?.totalAmountVnd;
  const paymentAmount = needsDeposit
    ? order.depositAmountVnd
    : Math.max(0, order.pricing?.totalAmountVnd - (order.depositStatus === 'PAID' ? order.depositAmountVnd : 0));

  const handlePayment = async () => {
    try {
      const payment = await createVnpayPayment(order.id || order._id);
      if (!payment?.paymentUrl) throw new Error('VNPAY không trả về địa chỉ thanh toán.');
      window.location.assign(payment.paymentUrl);
    } catch (err) {
      message.error(err.response?.data?.message || err.message || 'Không thể mở cổng thanh toán VNPAY.');
    }
  };


  const workflowState=customerOrderState(order);
  const step=order.status==='COMPLETED'?8:Math.max(0,workflowState.step-1);
  const terminal = ['CANCELLED', 'REJECTED'].includes(order.status);
  const attention=workflowState.message;
  const care = order.specialRequirements?.trim();
  const hasCare = care && !['không', 'không có', 'none', 'no'].includes(care.toLowerCase().replace(/[.!]$/, ''));
  const refresh = () => fetchOrderById(id).catch(() => {});
  return <div className="order-detail-shell"><Workspace eyebrow="Đơn vận chuyển" title={order.orderCode} description={order.customerName ? `Chủ hàng: ${order.customerName}` : undefined} actions={<Button onClick={() => navigate('/orders')}>Về danh sách</Button>}>
    {error && <Alert type="error" message={error} action={<Button onClick={refresh}>Thử tải lại</Button>} />}
    {user?.role === 'CUSTOMER' && pendingDocuments > 0 && <Alert type="warning" showIcon message={'Chuyên viên yêu cầu bổ sung ' + pendingDocuments + ' hồ sơ ngựa'} description="Mở Hồ sơ để xem yêu cầu cụ thể và gửi tệp cho chuyên viên thẩm định." action={<Button onClick={() => changeTab('documents')}>Bổ sung hồ sơ</Button>} />}
    <section className="order-summary">
      <div className="order-summary-top"><StatusPill value={order.status} label={workflowState.label} /><span className="order-payment-state"><StatusPill value={order.paymentStatus} /></span></div>
      <div className="order-route"><div><span>Điểm đón</span><strong>{locationText(order.origin)}</strong></div><div><span>Điểm giao</span><strong>{locationText(order.destination)}</strong></div></div>
      <dl className="order-summary-facts"><div><dt>Khởi hành</dt><dd>{order.departureDate} · {order.departureTime}</dd></div><div><dt>Ngựa vận chuyển</dt><dd>{order.horses?.join(', ') || 'Chưa cập nhật'}</dd></div><div><dt>Tài xế / xe</dt><dd>{order.driverName || 'Chưa phân công'}<small>{order.vehiclePlate || 'Chưa phân xe'}</small></dd></div></dl>
      {!terminal && <ol className="order-progress" aria-label="Tiến độ đơn hàng">{progressLabels.map((label, index) => <li key={label} className={index < step ? 'is-done' : index === step ? 'is-current' : ''} aria-current={index === step ? 'step' : undefined}>{label}</li>)}</ol>}
    </section>
    <nav className="order-detail-tabs" role="tablist" aria-label="Nội dung đơn vận chuyển">{[
      ['overview', 'Tổng quan'], ['journey', 'Hành trình'], ['documents', 'Hồ sơ'], ['finance', 'Thanh toán'], ['support', 'Hỗ trợ']
    ].map(([key, label]) => <button key={key} type="button" role="tab" tabIndex={tab === key ? 0 : -1} aria-selected={tab === key} onClick={() => changeTab(key)} onKeyDown={event => { if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return; event.preventDefault(); const buttons = [...event.currentTarget.parentElement.querySelectorAll('[role=tab]')]; const index = buttons.indexOf(event.currentTarget); const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length; buttons[next].click(); buttons[next].focus(); }}>{label}</button>)}</nav>
    <p className="order-tabs-hint">Vuốt thanh mục sang ngang để xem thêm.</p>
    <div hidden={tab !== 'overview'} className="order-overview">
      {!(order.status === 'DELIVERING' && user?.role === 'CUSTOMER') && <div className="order-attention"><p>{attention}</p>{canPay && <Button type="primary" onClick={() => setPaymentOpen(true)}>{needsDeposit ? 'Thanh toán tiền cọc' : 'Thanh toán phần còn lại'}</Button>}</div>}
      {hasCare && <div className="order-care"><strong>Lưu ý chăm sóc</strong><p>{care}</p></div>}
    </div>
    <div hidden={tab !== 'journey'}>
      <p className="ops-secondary">Lịch khởi hành tính theo giờ tại điểm đón ({order.departureTimezone}).</p>
      {visited.includes('journey') && <section className="order-map-section"><div><h2>Bản đồ tuyến đường</h2><p>Chỉ mở bản đồ khi cần tra cứu điểm đón và điểm giao.</p></div><Button aria-expanded={mapOpen} onClick={() => setMapOpen(value => !value)}>{mapOpen ? 'Thu gọn bản đồ' : 'Xem bản đồ'}</Button>{mapOpen && order.originLocation && order.destinationLocation && <div className="order-map-frame"><LocationMap originLocation={order.originLocation} destinationLocation={order.destinationLocation} height="280px" /></div>}</section>}
    </div>
    <div hidden={tab !== 'documents'}>{visited.includes('documents') && <ComplianceDocuments orderId={order.id || order._id} customer={user?.role === 'CUSTOMER'} specialist={user?.role === 'TRANSPORT_SPECIALIST'} onChanged={refresh} />}</div>
    <div hidden={tab !== 'finance'}>
      {/* Financials & Settlement Card */}
      <Card
        style={{
          borderRadius: 10,
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
        title={
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
            Chi phí và thanh toán
          </div>
        }
      >
        {order.pricing?.totalAmountVnd ? (
          <div style={{ maxWidth: 640 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
              <span style={{ color: '#475569' }}>
                Giá cước tuyến: {formatVnd(order.pricing.routeBaseUnitPriceVnd)} × {order.pricing.horseCount} ngựa
              </span>
              <strong style={{ color: '#0F172A' }}>{formatVnd(order.pricing.baseAmountVnd)}</strong>
            </div>

            {(order.pricing.addOns || []).map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 16,
                  marginBottom: 8,
                  fontSize: 14,
                  color: '#475569'
                }}
              >
                <span>{item.name} × {item.quantity}</span>
                <span>{formatVnd(item.amountVnd)}</span>
              </div>
            ))}

            <Divider style={{ margin: '14px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 17 }}>
              <strong style={{ color: '#0F172A' }}>Tổng giá trị đơn hàng</strong>
              <strong style={{ color: '#0F3E2E', fontSize: 19 }}>
                {formatVnd(order.pricing.totalAmountVnd)}
              </strong>
            </div>

            {order.depositRequired && (
              <div
                style={{
                  marginTop: 14,
                  padding: '10px 14px',
                  borderRadius: 6,
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 14
                }}
              >
                <span style={{ color: '#475569' }}>Tiền cọc yêu cầu ({order.depositPercent}%)</span>
                <span>
                  <strong style={{ color: '#0F172A', marginRight: 8 }}>{formatVnd(order.depositAmountVnd)}</strong>
                  <Tag
                    style={{
                      background: order.depositStatus === 'PAID' ? '#F0FDF4' : '#FFFBEB',
                      color: order.depositStatus === 'PAID' ? '#166534' : '#92400E',
                      border: `1px solid ${order.depositStatus === 'PAID' ? '#BBF7D0' : '#FDE68A'}`
                    }}
                  >
                    {order.depositStatus === 'PAID'
                      ? 'Đã đặt cọc'
                      : order.depositStatus === 'REFUND_PENDING'
                      ? 'Chờ hoàn cọc'
                      : 'Chưa đặt cọc'}
                  </Tag>
                </span>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10,
                marginTop: 16
              }}
            >
              <Tag
                style={{
                  padding: '4px 10px',
                  fontSize: 13,
                  fontWeight: 600,
                  background: order.paymentStatus === 'PAID' ? '#F0FDF4' : '#FFFBEB',
                  color: order.paymentStatus === 'PAID' ? '#166534' : '#92400E',
                  border: `1px solid ${order.paymentStatus === 'PAID' ? '#BBF7D0' : '#FDE68A'}`
                }}
              >
                {order.paymentStatus === 'PAID'
                  ? 'Đã thanh toán đủ'
                  : order.paymentStatus === 'PARTIALLY_PAID'
                  ? 'Đã đặt cọc'
                  : 'Chưa thanh toán'}
              </Tag>

              {canPay && (
                <Button
                  type="primary"
                  onClick={() => setPaymentOpen(true)}
                  style={{
                    background: '#0F3E2E',
                    borderColor: '#0F3E2E',
                    borderRadius: 6,
                    fontWeight: 600
                  }}
                >
                  {needsDeposit ? 'Đặt cọc ngay qua VNPAY' : 'Thanh toán phần còn lại'}
                </Button>
              )}
            </div>

            {order.paymentStatus === 'PAID' && (
              <div style={{ color: '#64748B', fontSize: 13, marginTop: 10 }}>
                Mã tham chiếu: {order.paymentReference} · {order.paidAt ? new Date(order.paidAt).toLocaleString('vi-VN') : ''}
              </div>
            )}
          </div>
        ) : (
          <div style={{ color: '#64748B', fontSize: 14 }}>
            Đơn hàng chưa có bảng giá chi tiết. Vui lòng liên hệ bộ phận điều hành CBRT.
          </div>
        )}
      </Card>


    </div>
    <OrderOperations key={order.id || order._id} orderId={order.id || order._id} view={tab} onChanged={refresh} />
      {/* VNPAY Payment Modal */}
      <Modal
        title={needsDeposit ? `Đặt cọc${order.depositPercent ? ` ${order.depositPercent}%` : ''} qua cổng VNPAY` : 'Thanh toán phần còn lại qua cổng VNPAY'}
        open={paymentOpen && Boolean(canPay)}
        onCancel={() => setPaymentOpen(false)}
        onOk={handlePayment}
        confirmLoading={loading}
        okText={`Chuyển đến VNPAY · ${formatVnd(paymentAmount)}`}
        cancelText="Đóng"
        okButtonProps={{ style: { background: '#0F3E2E', borderColor: '#0F3E2E' } }}
      >
        <div style={{ padding: '8px 0', fontSize: 15 }}>
          <div style={{ marginBottom: 12 }}>
            Số tiền thanh toán: <strong style={{ color: '#0F3E2E', fontSize: 17 }}>{formatVnd(paymentAmount)}</strong>
          </div>
          <div style={{ color: '#64748B', fontSize: 14, lineHeight: 1.5 }}>
            Bạn sẽ được chuyển hướng an toàn sang cổng thanh toán VNPAY để chọn phương thức QR ngân hàng (VietQR), thẻ ATM nội địa hoặc thẻ quốc tế (Visa/Mastercard).
          </div>
        </div>
      </Modal>

  </Workspace></div>;
};
export default OrderDetail;
