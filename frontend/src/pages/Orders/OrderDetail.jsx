import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Divider, Modal, Space, Tag, Steps, message } from 'antd';
import { ArrowLeft, CreditCard } from 'lucide-react';
import { useOrderStore } from '../../store/useOrderStore';
import { useAuthStore } from '../../store/useAuthStore';

import LocationMap from '../../components/common/LocationMap';
import ComplianceDocuments from '../../components/operations/ComplianceDocuments';
import OrderOperations from '../../components/operations/OrderOperations';

const formatVnd = (value) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value || 0);

const STATUS_CONFIG = {
  PENDING_APPROVAL: { label: 'Chờ phê duyệt', color: '#92400E', bg: '#FEF3C7', border: '#FDE68A' },
  APPROVED: { label: 'Đã phê duyệt', color: '#1E40AF', bg: '#DBEAFE', border: '#BFDBFE' },
  DOCS_PROCESSING: { label: 'Xử lý hồ sơ kiểm dịch', color: '#1E40AF', bg: '#DBEAFE', border: '#BFDBFE' },
  CLEARED_FOR_TRANSPORT: { label: 'Đủ điều kiện xuất phát', color: '#15803D', bg: '#DCFCE7', border: '#BBF7D0' },
  IN_TRANSIT: { label: 'Đang vận chuyển trên đường', color: '#0369A1', bg: '#E0F2FE', border: '#BAE6FD' },
  DELIVERING: { label: 'Đang bàn giao tại đích', color: '#166534', bg: '#DCFCE7', border: '#86EFAC' },
  COMPLETED: { label: 'Đã hoàn thành', color: '#166534', bg: '#DCFCE7', border: '#86EFAC' },
  CANCELLED: { label: 'Đã hủy', color: '#991B1B', bg: '#FEE2E2', border: '#FECACA' },
  REJECTED: { label: 'Từ chối', color: '#991B1B', bg: '#FEE2E2', border: '#FECACA' }
};

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { orders, fetchOrderById, createVnpayPayment, loading, error } = useOrderStore();
  const { user } = useAuthStore();
  const [paymentOpen, setPaymentOpen] = useState(false);

  const order = orders.find((o) => String(o.id || o._id) === String(id) || o.orderCode === id);

  useEffect(() => {
    if (!order && id) fetchOrderById(id).catch(() => {});
  }, [fetchOrderById, id, order]);

  if (!order) {
    return (
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 20 }}>
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: 24 }}>
          {loading ? 'Đang tải chi tiết đơn vận chuyển...' : error || 'Không tìm thấy đơn vận chuyển.'}
        </div>
      </div>
    );
  }

  const progressSteps = [
    {
      title: 'Đặt cọc',
      description: order.depositRequired
        ? order.depositStatus === 'PAID'
          ? 'Đã nhận tiền cọc'
          : 'Đang chờ đặt cọc'
        : 'Không áp dụng'
    },
    {
      title: 'Phê duyệt đơn',
      description:
        order.status === 'PENDING_APPROVAL'
          ? order.depositStatus === 'PAID' || !order.depositRequired
            ? 'Đang chờ phê duyệt'
            : 'Mở sau khi đặt cọc'
          : 'Đã xử lý'
    },
    {
      title: 'Hồ sơ kiểm dịch',
      description: ['APPROVED', 'DOCS_PROCESSING'].includes(order.status)
        ? 'Đang xử lý'
        : order.status === 'PENDING_APPROVAL'
        ? 'Chưa bắt đầu'
        : 'Đã xử lý'
    },
    {
      title: 'Vận chuyển',
      description: ['IN_TRANSIT', 'DELIVERING'].includes(order.status)
        ? 'Đang thực hiện'
        : order.status === 'COMPLETED'
        ? 'Đã hoàn tất'
        : 'Chưa bắt đầu'
    },
    {
      title: 'Bàn giao',
      description: order.status === 'COMPLETED' ? 'Đã hoàn tất' : 'Chưa bắt đầu'
    }
  ];

  const progressIndex =
    order.status === 'COMPLETED'
      ? 5
      : ['IN_TRANSIT', 'DELIVERING'].includes(order.status)
      ? 3
      : ['APPROVED', 'DOCS_PROCESSING', 'CLEARED_FOR_TRANSPORT'].includes(order.status)
      ? 2
      : order.depositStatus === 'PAID' || !order.depositRequired
      ? 1
      : 0;

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

  const statusMeta = STATUS_CONFIG[order?.status] || {
    label: order?.status,
    color: '#334155',
    bg: '#F1F5F9',
    border: '#CBD5E1'
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18, padding: '8px 4px 32px' }}>
      {/* Top Header Card */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 10,
          padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button
            icon={<ArrowLeft size={16} />}
            onClick={() => navigate('/orders')}
            style={{ borderRadius: 6 }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0F172A' }}>
                Đơn vận chuyển {order?.orderCode}
              </h1>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: statusMeta.color,
                  backgroundColor: statusMeta.bg,
                  border: `1px solid ${statusMeta.border}`,
                  padding: '2px 8px',
                  borderRadius: 4
                }}
              >
                {statusMeta.label}
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>
              {order?.routeLabel} · Khách hàng: {order?.customerName}
            </div>
          </div>
        </div>

        {canPay && (
          <Button
            type="primary"
            icon={<CreditCard size={15} />}
            onClick={() => setPaymentOpen(true)}
            style={{
              background: '#0F3E2E',
              borderColor: '#0F3E2E',
              borderRadius: 6,
              fontWeight: 600,
              height: 38
            }}
          >
            {needsDeposit ? 'Đặt cọc 20% qua VNPAY' : 'Thanh toán phần còn lại'}
          </Button>
        )}
      </div>

      {/* Main Info Grid: Responsive (Auto-fit into 1 col on mobile, 2 cols on desktop) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 18
        }}
      >
        {/* Left Column: Shipment Journey & Vehicle */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 10,
            padding: 20,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 14 }}>
            Thông tin chặng vận chuyển
          </div>

          {/* Route origin to destination visual */}
          <div
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              padding: 14,
              marginBottom: 16
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 11, color: '#64748B', display: 'block', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
                  Điểm đón (Origin)
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', display: 'block', marginTop: 2 }}>
                  {order?.origin}
                </span>
              </div>
              <div style={{ padding: '0 8px', color: '#94A3B8', fontSize: 18, fontWeight: 700 }}>
                →
              </div>
              <div style={{ flex: 1, textAlign: 'right' }}>
                <span style={{ fontSize: 11, color: '#64748B', display: 'block', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
                  Điểm giao (Destination)
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', display: 'block', marginTop: 2 }}>
                  {order?.destination}
                </span>
              </div>
            </div>
          </div>

          {/* Meta rows */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, fontSize: 13, marginBottom: 16 }}>
            <div>
              <span style={{ color: '#64748B', display: 'block', fontSize: 12 }}>Ngày khởi hành:</span>
              <strong style={{ color: '#0F172A' }}>
                {order?.departureDate} {order?.departureTime && `(${order.departureTime})`}
              </strong>
              {order?.departureId && (
                <div style={{ color: '#64748B', fontSize: 11 }}>Giờ tại điểm đón ({order.departureTimezone})</div>
              )}
            </div>
            <div>
              <span style={{ color: '#64748B', display: 'block', fontSize: 12 }}>Biển số xe chuyên dụng:</span>
              <strong style={{ color: '#0F172A' }}>{order?.vehiclePlate || 'Chưa phân công'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748B', display: 'block', fontSize: 12 }}>Tài xế phụ trách:</span>
              <strong style={{ color: '#0F172A' }}>{order?.driverName || 'Chưa phân công'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748B', display: 'block', fontSize: 12 }}>Ngựa vận chuyển:</span>
              <strong style={{ color: '#0F172A' }}>
                {Array.isArray(order?.horses) ? order.horses.join(', ') : order?.horses}
              </strong>
            </div>
          </div>

          {order?.specialRequirements && (
            <div style={{ marginBottom: 16 }}>
              <span style={{ color: '#64748B', fontSize: 12, display: 'block', marginBottom: 4 }}>
                Yêu cầu chăm sóc đặc biệt:
              </span>
              <div
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: 6,
                  border: '1px solid #E2E8F0',
                  fontSize: 13,
                  color: '#334155'
                }}
              >
                {order.specialRequirements}
              </div>
            </div>
          )}

          {/* Embedded Route Map */}
          {order?.originLocation && order?.destinationLocation && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 6 }}>
                Bản đồ lộ trình
              </div>
              <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
                <LocationMap
                  originLocation={order.originLocation}
                  destinationLocation={order.destinationLocation}
                  height="220px"
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Milestones & Progress */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 10,
            padding: 20,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 16 }}>
            Tiến độ hành trình
          </div>
          <div style={{ paddingLeft: 4 }}>
            <Steps
              direction="vertical"
              current={progressIndex}
              items={progressSteps}
            />
          </div>
        </div>
      </div>

      {/* Operational Modules: POD, Odometer stats, Clearances */}
      <OrderOperations
        orderId={order.id || order._id}
        onChanged={() => fetchOrderById(id).catch(() => {})}
      />

      {/* Compliance Documents */}
      <ComplianceDocuments
        orderId={order.id || order._id}
        customer={user?.role === 'CUSTOMER'}
        specialist={user?.role === 'TRANSPORT_SPECIALIST'}
        onChanged={() => fetchOrderById(id).catch(() => {})}
      />

      {/* Financials & Settlement Card */}
      <Card
        style={{
          borderRadius: 10,
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
        title={
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
            Chi phí và thanh toán
          </div>
        }
      >
        {order.pricing?.totalAmountVnd ? (
          <div style={{ maxWidth: 640 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
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
                  fontSize: 13,
                  color: '#475569'
                }}
              >
                <span>{item.name} × {item.quantity}</span>
                <span>{formatVnd(item.amountVnd)}</span>
              </div>
            ))}

            <Divider style={{ margin: '14px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 16 }}>
              <strong style={{ color: '#0F172A' }}>Tổng giá trị đơn hàng</strong>
              <strong style={{ color: '#0F3E2E', fontSize: 18 }}>
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
                  fontSize: 13
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
                  fontSize: 12,
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
                  icon={<CreditCard size={15} />}
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
              <div style={{ color: '#64748B', fontSize: 12, marginTop: 10 }}>
                Mã tham chiếu: {order.paymentReference} · {order.paidAt ? new Date(order.paidAt).toLocaleString('vi-VN') : ''}
              </div>
            )}
          </div>
        ) : (
          <div style={{ color: '#64748B', fontSize: 13 }}>
            Đơn hàng chưa có bảng giá chi tiết. Vui lòng liên hệ bộ phận điều hành CBRT.
          </div>
        )}
      </Card>

      {/* VNPAY Payment Modal */}
      <Modal
        title={needsDeposit ? 'Đặt cọc 20% qua cổng VNPAY' : 'Thanh toán phần còn lại qua cổng VNPAY'}
        open={paymentOpen}
        onCancel={() => setPaymentOpen(false)}
        onOk={handlePayment}
        confirmLoading={loading}
        okText={`Chuyển đến VNPAY · ${formatVnd(paymentAmount)}`}
        cancelText="Đóng"
        okButtonProps={{ style: { background: '#0F3E2E', borderColor: '#0F3E2E' } }}
      >
        <div style={{ padding: '8px 0', fontSize: 14 }}>
          <div style={{ marginBottom: 12 }}>
            Số tiền thanh toán: <strong style={{ color: '#0F3E2E', fontSize: 16 }}>{formatVnd(paymentAmount)}</strong>
          </div>
          <div style={{ color: '#64748B', fontSize: 13, lineHeight: 1.5 }}>
            Bạn sẽ được chuyển hướng an toàn sang cổng thanh toán VNPAY để chọn phương thức QR ngân hàng (VietQR), thẻ ATM nội địa hoặc thẻ quốc tế (Visa/Mastercard).
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default OrderDetail;
