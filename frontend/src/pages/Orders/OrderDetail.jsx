import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Divider, Modal, Space, Tag, Steps, message } from 'antd';
import { ArrowLeft, CreditCard } from 'lucide-react';
import { useOrderStore } from '../../store/useOrderStore';
import { useAuthStore } from '../../store/useAuthStore';

import LocationMap from '../../components/common/LocationMap';
const formatVnd = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value || 0);

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
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12, padding: 28 }}>
        {loading ? 'Đang tải chi tiết đơn vận chuyển...' : error || 'Không tìm thấy đơn vận chuyển.'}
      </div>
    );
  }

  const progressSteps = [
    { title: 'Phê duyệt đơn', description: order.status === 'PENDING_APPROVAL' ? 'Đang chờ phê duyệt' : 'Đã xử lý' },
    { title: 'Hồ sơ và kiểm dịch', description: ['APPROVED', 'DOCS_PROCESSING'].includes(order.status) ? 'Đang xử lý' : order.status === 'PENDING_APPROVAL' ? 'Chưa bắt đầu' : 'Đã xử lý' },
    { title: 'Vận chuyển', description: ['IN_TRANSIT', 'DELIVERING'].includes(order.status) ? 'Đang thực hiện' : order.status === 'COMPLETED' ? 'Đã hoàn tất' : 'Chưa bắt đầu' },
    { title: 'Bàn giao', description: order.status === 'COMPLETED' ? 'Đã hoàn tất' : 'Chưa bắt đầu' }
  ];
  const progressIndex = order.status === 'COMPLETED'
    ? 4
    : ['IN_TRANSIT', 'DELIVERING'].includes(order.status)
      ? 2
      : ['APPROVED', 'DOCS_PROCESSING', 'CLEARED_FOR_TRANSPORT'].includes(order.status)
        ? 1
        : 0;
  const canPay = user?.role === 'CUSTOMER' && order.paymentStatus !== 'PAID' && ['APPROVED', 'DOCS_PROCESSING', 'CLEARED_FOR_TRANSPORT'].includes(order.status) && order.pricing?.totalAmountVnd;
  const handlePayment = async () => {
    try {
      const payment = await createVnpayPayment(order.id || order._id);
      if (!payment?.paymentUrl) throw new Error('VNPAY không trả về địa chỉ thanh toán.');
      window.location.assign(payment.paymentUrl);
    } catch (err) {
      message.error(err.response?.data?.message || err.message || 'Không thể mở cổng thanh toán VNPAY.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: 12,
          padding: '16px 24px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Button
            icon={<ArrowLeft size={16} />}
            onClick={() => navigate('/orders')}
            style={{ borderRadius: 6 }}
          />
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>
              Chi tiết đơn {order?.orderCode}
            </h1>
            <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
              {order?.routeLabel} • Khách hàng: {order?.customerName}
            </div>
          </div>
        </div>

        <Tag color="green" style={{ fontSize: 13, padding: '4px 12px', fontWeight: 600 }}>
          {order?.status}
        </Tag>
      </div>

      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: 12,
          padding: 28,
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: 28
        }}
      >
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 16 }}>
            Thông tin chặng vận chuyển
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
            <div>
              <span style={{ color: '#6B7280' }}>Điểm đón:</span> <strong>{order?.origin}</strong>
            </div>
            <div>
              <span style={{ color: '#6B7280' }}>Điểm giao:</span> <strong>{order?.destination}</strong>
            </div>
            <div>
              <span style={{ color: '#6B7280' }}>Ngày khởi hành:</span>{' '}
              <strong>
                {order?.departureDate} {order?.departureTime && `(${order.departureTime})`}
              </strong>
              {order?.departureId && <div style={{ color: '#64748b', fontSize: 12 }}>Theo lịch cố định · Giờ tại điểm đón ({order.departureTimezone})</div>}
            </div>
            <div>
              <span style={{ color: '#6B7280' }}>Biển số xe:</span>{' '}
              <strong>{order?.vehiclePlate || 'Chưa phân công'}</strong>
            </div>
            <div>
              <span style={{ color: '#6B7280' }}>Tài xế phụ trách:</span>{' '}
              <strong>{order?.driverName || 'Chưa phân công'}</strong>
            </div>
            <div>
              <span style={{ color: '#6B7280' }}>Ngựa vận chuyển:</span>{' '}
              <strong>{Array.isArray(order?.horses) ? order.horses.join(', ') : order?.horses}</strong>
            </div>
            <div style={{ marginTop: 8 }}>
              <span style={{ color: '#6B7280' }}>Yêu cầu chăm sóc:</span>
              <p
                style={{
                  margin: '4px 0 0 0',
                  padding: 12,
                  backgroundColor: '#F9FAFB',
                  borderRadius: 8,
                  border: '1px solid #E5E7EB'
                }}
              >
                {order?.specialRequirements || 'Không có yêu cầu đặc biệt.'}
              </p>
            </div>

            {/* Embedded Route Map */}
            {order?.originLocation && order?.destinationLocation && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0F3E2E', marginBottom: 8 }}>
                  🗺️ Lộ trình & Bản đồ tuyến đường:
                </div>
                <LocationMap
                  originLocation={order.originLocation}
                  destinationLocation={order.destinationLocation}
                  height="240px"
                />
              </div>
            )}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 16 }}>
            Tiến độ các cột mốc (Waypoints)
          </div>
          <Steps
            direction="vertical"
            current={progressIndex}
            items={progressSteps}
          />
        </div>
      </div>
      <Card title={<Space><CreditCard size={18} /> Chi phí và thanh toán</Space>}>
        {order.pricing?.totalAmountVnd ? <div style={{ maxWidth: 680 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}><span>Giá tuyến: {formatVnd(order.pricing.routeBaseUnitPriceVnd)} × {order.pricing.horseCount} ngựa</span><strong>{formatVnd(order.pricing.baseAmountVnd)}</strong></div>
          {(order.pricing.addOns || []).map((item) => <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 10, color: '#475569' }}><span>{item.name} × {item.quantity}</span><span>{formatVnd(item.amountVnd)}</span></div>)}
          <Divider />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 18 }}><strong>Tổng thanh toán</strong><strong style={{ color: '#0f3e2e' }}>{formatVnd(order.pricing.totalAmountVnd)}</strong></div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginTop: 18 }}>
            <Tag color={order.paymentStatus === 'PAID' ? 'green' : 'orange'}>{order.paymentStatus === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}</Tag>
            {canPay && <Button type="primary" icon={<CreditCard size={16} />} onClick={() => setPaymentOpen(true)}>Thanh toán ngay</Button>}
            {user?.role === 'CUSTOMER' && order.status === 'PENDING_APPROVAL' && <span style={{ color: '#64748b' }}>Thanh toán được mở sau khi đơn được phê duyệt.</span>}
          </div>
          {order.paymentStatus === 'PAID' && <p style={{ color: '#64748b', marginBottom: 0 }}>Mã giao dịch: {order.paymentReference} · {order.paidAt ? new Date(order.paidAt).toLocaleString('vi-VN') : ''}</p>}
        </div> : <p style={{ color: '#64748b', margin: 0 }}>Đơn cũ chưa có bảng giá. Vui lòng liên hệ bộ phận điều hành.</p>}
      </Card>
      <Modal title="Thanh toán qua VNPAY" open={paymentOpen} onCancel={() => setPaymentOpen(false)} onOk={handlePayment} confirmLoading={loading} okText={`Sang VNPAY · ${formatVnd(order.pricing?.totalAmountVnd)}`} cancelText="Hủy">
        <p>Số tiền cần thanh toán: <strong>{formatVnd(order.pricing?.totalAmountVnd)}</strong></p>
        <p style={{ color: '#64748b', marginBottom: 0 }}>Bạn sẽ được chuyển đến VNPAY để chọn QR ngân hàng, thẻ nội địa hoặc thẻ quốc tế. Hệ thống chỉ ghi nhận đã thanh toán sau khi VNPAY xác nhận.</p>
      </Modal>
    </div>
  );
};

export default OrderDetail;
