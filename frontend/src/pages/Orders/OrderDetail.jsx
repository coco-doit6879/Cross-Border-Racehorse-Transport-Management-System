import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Divider,
  Modal,
  Space,
  Tag,
  Tabs,
  message
} from 'antd';
import {
  ArrowLeft,
  Clock,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  MapPin,
  Truck,
  User,
  FileCheck2,
  Calendar,
  Sparkles,
  QrCode,
  Copy
} from 'lucide-react';
import { useOrderStore } from '../../store/useOrderStore';
import { useAuthStore } from '../../store/useAuthStore';
import { wdpDemoService } from '../../services/wdpDemoService';

const formatVnd = (value) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value || 0);

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { orders, fetchOrderById } = useOrderStore();
  const { user } = useAuthStore();

  const [order, setOrder] = useState(null);
  const [agreedTerms, setAgreedTerms] = useState(true);
  const [vnpayModalOpen, setVnpayModalOpen] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(899); // 14:59 countdown

  useEffect(() => {
    const found = orders.find(
      (o) => String(o.id) === String(id) || String(o._id) === String(id) || o.orderCode === id
    ) || wdpDemoService.getOrderById(id) || wdpDemoService.getOrderById('BK-005');
    setOrder(found);
  }, [id, orders]);

  // VNPAY countdown timer
  useEffect(() => {
    if (!vnpayModalOpen || secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [vnpayModalOpen, secondsRemaining]);

  if (!order) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p>Đang tải thông tin đơn hàng...</p>
      </div>
    );
  }

  const isBK005 = order.orderCode === 'BK-005';
  const isDepositPaid = order.depositStatus === 'PAID';
  const totalAmount = order.pricing?.totalAmountVnd || 26076000;
  const depositAmount = order.depositAmountVnd || 7823000;
  const remainingAmount = order.remainingAmountVnd || totalAmount - depositAmount;

  const handleSimulatePayment = () => {
    wdpDemoService.customerPayDepositBK005();
    const updated = wdpDemoService.getOrderById('BK-005');
    setOrder(updated);
    setPaymentSuccess(true);
    setVnpayModalOpen(false);
    message.success('Thanh toán tiền cọc thành công qua cổng VNPAY!');
  };

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Back button & Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => navigate('/orders')}
          style={{
            border: 'none',
            background: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: '#64748b',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600
          }}
        >
          <ArrowLeft size={16} /> Quay lại danh sách đơn
        </button>

        <Space>
          <Tag color={isDepositPaid ? 'green' : 'gold'} style={{ padding: '4px 12px', fontSize: 13, fontWeight: 700 }}>
            {isDepositPaid ? 'ĐÃ ĐẶT CỌC (30%) · ĐANG CHUẨN BỊ XE' : 'CHỜ ĐẶT CỌC GIỮ XE (30%)'}
          </Tag>
        </Space>
      </div>

      {/* SUCCESS BANNER AFTER PAYMENT */}
      {paymentSuccess || isDepositPaid ? (
        <Alert
          message={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle2 size={22} color="#059669" />
              <div>
                <strong style={{ fontSize: 15, color: '#065f46' }}>
                  Đã thanh toán tiền cọc thành công {formatVnd(depositAmount)}!
                </strong>
                <div style={{ fontSize: 13, color: '#047857', marginTop: 2 }}>
                  Mã giao dịch VNPAY: <strong>VNPAY-BK005-2026</strong>. Điều phối viên đang hoàn tất kiểm tra kỹ thuật xe chuyên dụng và trạm dừng nghỉ.
                </div>
              </div>
            </div>
          }
          type="success"
          showIcon={false}
          style={{
            borderRadius: 12,
            border: '1.5px solid #a7f3d0',
            backgroundColor: '#ecfdf5',
            padding: '16px 20px'
          }}
        />
      ) : null}

      {/* URGENCY BANNER: VIỆC CỦA BẠN BÂY GIỜ */}
      {!isDepositPaid && (
        <div
          style={{
            backgroundColor: '#fffbeb',
            border: '1.5px solid #fde68a',
            borderRadius: 14,
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 16
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              backgroundColor: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Clock size={24} />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#b45309', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              Việc của bạn bây giờ
            </div>
            <h3 style={{ margin: '4px 0 6px', fontSize: 18, fontWeight: 800, color: '#92400e' }}>
              Đặt cọc 30% trong 23 giờ 59 phút
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: '#78350f', lineHeight: 1.6 }}>
              Báo giá và lịch trình cho chuyến vận chuyển ngựa <strong>BK-005</strong> đã được duyệt. Hãy thanh toán tiền cọc {formatVnd(depositAmount)} qua cổng VNPAY để kích hoạt chuẩn bị xe chuyên dụng và đội ngũ hộ tống thú y.
            </p>
          </div>
        </div>
      )}

      {/* ORDER SUMMARY HEADER CARD */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 14,
          padding: '24px 28px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: 18
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, color: '#64748b' }}>Chi tiết đơn vận chuyển</div>
            <h2 style={{ margin: '2px 0 0', fontSize: 24, fontWeight: 800, color: '#0f172a' }}>
              {order.orderCode} · {order.customerName}
            </h2>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: '#64748b' }}>Tổng giá trị đơn hàng</div>
            <strong style={{ fontSize: 24, color: '#ea580c' }}>{formatVnd(totalAmount)}</strong>
          </div>
        </div>

        {/* Route Details */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 16,
            backgroundColor: '#f8fafc',
            border: '1px solid #f1f5f9',
            borderRadius: 10,
            padding: '16px 20px',
            fontSize: 13
          }}
        >
          <div>
            <span style={{ color: '#64748b', display: 'block', fontSize: 11 }}>ĐIỂM ĐÓN</span>
            <strong style={{ color: '#0f172a' }}>{order.origin}</strong>
          </div>
          <div>
            <span style={{ color: '#64748b', display: 'block', fontSize: 11 }}>ĐIỂM GIAO</span>
            <strong style={{ color: '#0f172a' }}>{order.destination}</strong>
          </div>
          <div>
            <span style={{ color: '#64748b', display: 'block', fontSize: 11 }}>KHỞI HÀNH</span>
            <strong style={{ color: '#0f172a' }}>{order.departureTime} · {order.departureDate}</strong>
          </div>
          <div>
            <span style={{ color: '#64748b', display: 'block', fontSize: 11 }}>NGỰA VẬN CHUYỂN</span>
            <strong style={{ color: '#ea580c' }}>
              {Array.isArray(order.horses) ? order.horses.join(', ') : order.horses}
            </strong>
          </div>
        </div>
      </div>

      {/* SECTION: ĐẶT CỌC GIỮ XE (30%) */}
      {!isDepositPaid && (
        <Card
          title={
            <Space>
              <CreditCard size={18} color="#ea580c" />
              <span style={{ fontSize: 16, fontWeight: 800 }}>Đặt cọc giữ xe (30%)</span>
            </Space>
          }
          style={{
            border: '1.5px solid #fed7aa',
            borderRadius: 14,
            boxShadow: '0 4px 20px rgba(234, 88, 12, 0.06)'
          }}
        >
          <div style={{ maxWidth: 680 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14 }}>
              <span style={{ color: '#475569' }}>Tổng giá trị chuyến đi:</span>
              <strong style={{ color: '#0f172a' }}>{formatVnd(totalAmount)}</strong>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 10,
                fontSize: 15,
                backgroundColor: '#fff7ed',
                padding: '12px 16px',
                borderRadius: 8,
                border: '1px solid #fed7aa'
              }}
            >
              <span style={{ color: '#c2410c', fontWeight: 600 }}>Tiền cọc yêu cầu thanh toán (30%):</span>
              <strong style={{ color: '#ea580c', fontSize: 18 }}>{formatVnd(depositAmount)}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 13, color: '#64748b' }}>
              <span>Phần còn lại (70%):</span>
              <span>{formatVnd(remainingAmount)} (Thanh toán trước khi phương tiện lăn bánh)</span>
            </div>

            <Divider style={{ margin: '16px 0' }} />

            {/* Terms checkbox */}
            <div style={{ marginBottom: 20 }}>
              <Checkbox checked={agreedTerms} onChange={(e) => setAgreedTerms(e.target.checked)}>
                <span style={{ fontSize: 13, color: '#334155' }}>
                  Tôi đồng ý với <strong>Điều khoản vận chuyển ngựa đua</strong> và <strong>Chính sách bảo lưu / hoàn tiền cọc</strong> của CBRT Equine Express.
                </span>
              </Checkbox>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <Button
                id="btn-pay-vnpay"
                type="primary"
                size="large"
                onClick={() => {
                  setAgreedTerms(true);
                  setSecondsRemaining(899);
                  setVnpayModalOpen(true);
                }}
                style={{
                  height: 48,
                  padding: '0 28px',
                  fontSize: 15,
                  fontWeight: 700,
                  borderRadius: 8,
                  backgroundColor: '#ea580c',
                  borderColor: '#ea580c',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <CreditCard size={18} />
                <span>Mở cổng VNPAY QR · {formatVnd(depositAmount)}</span>
              </Button>

              <Button
                id="btn-simulate-pay-instant"
                size="large"
                onClick={handleSimulatePayment}
                style={{
                  height: 48,
                  padding: '0 24px',
                  fontSize: 14,
                  fontWeight: 700,
                  borderRadius: 8,
                  backgroundColor: '#059669',
                  borderColor: '#059669',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <CheckCircle2 size={18} />
                <span>✓ Xác nhận cọc ngay (Simulate IPN)</span>
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* DETAIL TABS */}
      <Card style={{ borderRadius: 14 }}>
        <Tabs
          defaultActiveKey="pricing"
          items={[
            {
              key: 'pricing',
              label: 'Báo giá & Chi phí chi tiết',
              children: (
                <div style={{ maxWidth: 680, paddingTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14 }}>
                    <span style={{ color: '#475569' }}>Cước vận chuyển tuyến TP.HCM → Đồng Nai:</span>
                    <strong>{formatVnd(20000000)}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14 }}>
                    <span style={{ color: '#475569' }}>Khoang mở rộng VIP & đệm khí nén:</span>
                    <strong>{formatVnd(3000000)}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14 }}>
                    <span style={{ color: '#475569' }}>Dinh dưỡng cỏ khô Timothy & nước điện giải:</span>
                    <strong>{formatVnd(1500000)}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14 }}>
                    <span style={{ color: '#475569' }}>Thuế GTGT & phí cầu đường cao tốc:</span>
                    <strong>{formatVnd(1576000)}</strong>
                  </div>

                  <Divider style={{ margin: '14px 0' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 17 }}>
                    <strong>Tổng cộng:</strong>
                    <strong style={{ color: '#ea580c', fontSize: 20 }}>{formatVnd(totalAmount)}</strong>
                  </div>
                </div>
              )
            },
            {
              key: 'route',
              label: 'Phương tiện & Lộ trình',
              children: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 8 }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Phương tiện chuyên dụng: </span>
                    <strong style={{ color: '#0f172a' }}>{order.vehiclePlate || '51C-123.45 (Xe 4 khoang VIP đệm khí nén)'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Tài xế phụ trách: </span>
                    <strong style={{ color: '#0f172a' }}>{order.driverName || 'TX-01 Nguyễn Minh Hoàng (0901234567)'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Chuyên viên hộ tống: </span>
                    <strong style={{ color: '#0f172a' }}>{order.escortName || 'NV-01 Đỗ Thu Hà (Bác sĩ thú y sơ cấp)'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Trạm dừng chân tiêu chuẩn: </span>
                    <strong style={{ color: '#0f172a' }}>{order.restStopName || 'Trạm dừng chân Xuân Lộc (Km 65)'}</strong>
                  </div>
                </div>
              )
            },
            {
              key: 'horses',
              label: 'Hồ sơ ngựa & Sức khỏe',
              children: (
                <div style={{ paddingTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 8, background: '#fed7aa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                      🏇
                    </div>
                    <div>
                      <strong style={{ fontSize: 16, color: '#0f172a' }}>Storm Runner</strong>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        Mã chip: 985141005544332 · Hộ chiếu FEI: VN-982367
                      </div>
                    </div>
                  </div>
                  <Tag color="green">ĐÃ THẨM ĐỊNH HỒ SƠ & KIỂM DỊCH THÚ Y ĐẠT CHUẨN</Tag>
                </div>
              )
            }
          ]}
        />
      </Card>

      {/* VNPAY GATEWAY PAYMENT MODAL */}
      <Modal
        centered
        width={460}
        open={vnpayModalOpen}
        onCancel={() => setVnpayModalOpen(false)}
        footer={null}
        maskClosable={true}
        zIndex={100000}
      >
        <div style={{ textAlign: 'center', padding: '10px 4px 6px' }}>
          {/* VNPAY Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: '#005baa' }}>VN</span>
            <span style={{ fontSize: 22, fontWeight: 900, color: '#ed1c24' }}>PAY</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#64748b' }}>QR Gateway</span>
          </div>

          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#64748b' }}>Số tiền thanh toán tiền cọc 30%</div>
            <strong style={{ fontSize: 22, color: '#ea580c' }}>{formatVnd(depositAmount)}</strong>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              Đơn hàng: <strong>BK-005</strong> · Khách hàng: <strong>Tran Le Anh Quan</strong>
            </div>
          </div>

          {/* QR Code Representation */}
          <div
            style={{
              width: 200,
              height: 200,
              margin: '0 auto 14px',
              border: '2px dashed #005baa',
              borderRadius: 12,
              padding: 10,
              backgroundColor: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(0,0,0,0.06)'
            }}
          >
            <QrCode size={130} color="#0f172a" />
            <div style={{ fontSize: 11, fontWeight: 700, color: '#005baa', marginTop: 6 }}>
              QUÉT MÃ VNPAY-QR
            </div>
          </div>

          {/* Countdown timer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, color: '#dc2626', marginBottom: 16 }}>
            <Clock size={15} />
            <span>Thời gian giữ mã QR: <strong>{formatTimer(secondsRemaining)}</strong></span>
          </div>

          {/* Bank Details */}
          <div
            style={{
              backgroundColor: '#f1f5f9',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 12,
              textAlign: 'left',
              lineHeight: 1.6,
              marginBottom: 20
            }}
          >
            <div>Ngân hàng: <strong>Vietcombank - CN Tân Bình</strong></div>
            <div>Số tài khoản: <strong>9999888877</strong></div>
            <div>Chủ tài khoản: <strong>CBRT EQUINE EXPRESS CO LTD</strong></div>
            <div>Nội dung chuyển khoản: <strong>CBRT BK005</strong></div>
          </div>

          {/* Action Simulation Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Button
              type="primary"
              size="large"
              onClick={handleSimulatePayment}
              style={{
                height: 44,
                backgroundColor: '#059669',
                borderColor: '#059669',
                fontWeight: 700,
                borderRadius: 8
              }}
            >
              ✓ Xác nhận thanh toán thành công (Simulate VNPAY IPN)
            </Button>

            <Button onClick={() => setVnpayModalOpen(false)}>
              Đóng và thanh toán sau
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
