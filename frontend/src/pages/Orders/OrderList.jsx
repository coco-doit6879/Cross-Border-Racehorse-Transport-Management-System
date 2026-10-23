import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Input,
  Modal,
  Popconfirm,
  Space,
  Spin,
  Tag,
  message
} from 'antd';
import {
  Plus,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  Truck,
  ShieldAlert,
  Calendar,
  XCircle,
  AlertTriangle,
  CreditCard
} from 'lucide-react';
import { useOrderStore } from '../../store/useOrderStore';
import { useAuthStore } from '../../store/useAuthStore';
import { wdpDemoService } from '../../services/wdpDemoService';

const formatVnd = (value) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value || 0);

export default function OrderList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const statusParam = searchParams.get('status');

  const { orders, loading, fetchOrders, cancelOrder } = useOrderStore();
  const { user } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState(statusParam === 'completed' ? 'DONE' : 'ALL');

  useEffect(() => {
    fetchOrders().catch(() => {});
  }, [fetchOrders]);

  const justCreatedBK005 = orders.find((o) => o.orderCode === 'BK-005' && o.isJustCreated);

  // Group definitions matching WDP.odt
  const groups = [
    { key: 'ALL', label: 'Tất cả', count: orders.length },
    {
      key: 'PENDING',
      label: 'Chờ tiếp nhận',
      count: orders.filter((o) => o.status === 'PENDING_APPROVAL').length
    },
    {
      key: 'UNPAID',
      label: 'Chờ thanh toán',
      count: orders.filter((o) => o.status === 'PENDING_DEPOSIT' || (o.depositRequired && o.depositStatus === 'UNPAID')).length
    },
    {
      key: 'TRANSIT',
      label: 'Đang vận chuyển',
      count: orders.filter((o) => ['IN_TRANSIT', 'DELIVERING'].includes(o.status)).length
    },
    {
      key: 'DONE',
      label: 'Hoàn thành',
      count: orders.filter((o) => o.status === 'COMPLETED').length
    }
  ];

  const filteredOrders = orders.filter((o) => {
    if (filterTab === 'PENDING' && o.status !== 'PENDING_APPROVAL') return false;
    if (filterTab === 'UNPAID' && o.status !== 'PENDING_DEPOSIT' && !(o.depositRequired && o.depositStatus === 'UNPAID')) return false;
    if (filterTab === 'TRANSIT' && !['IN_TRANSIT', 'DELIVERING'].includes(o.status)) return false;
    if (filterTab === 'DONE' && o.status !== 'COMPLETED') return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (o.orderCode && o.orderCode.toLowerCase().includes(q)) ||
      (o.customerName && o.customerName.toLowerCase().includes(q)) ||
      (o.routeLabel && o.routeLabel.toLowerCase().includes(q)) ||
      (o.horses && o.horses.join(' ').toLowerCase().includes(q))
    );
  });

  const handleCancel = async (orderId, orderCode) => {
    try {
      await cancelOrder(orderId, 'Khách hàng hủy đơn');
      message.success(`Đã hủy đơn vận chuyển ${orderCode}`);
    } catch {
      message.error('Không thể hủy đơn');
    }
  };

  const getStepProgressIndex = (order) => {
    if (order.status === 'COMPLETED') return 8;
    if (order.status === 'DELIVERING') return 7;
    if (order.status === 'IN_TRANSIT') return 6;
    if (order.status === 'APPROVED' && order.depositStatus === 'PAID') return 5;
    if (order.status === 'PENDING_DEPOSIT') return 4;
    if (order.status === 'PRICE_REVIEW') return 3;
    if (order.status === 'DOCS_PROCESSING' || order.status === 'DOCS_VERIFIED') return 2;
    return 1;
  };

  const renderStatusTag = (order) => {
    if (order.isJustCreated) {
      return (
        <Tag color="orange" style={{ fontWeight: 700, borderRadius: 6 }}>
          VỪA ĐẶT
        </Tag>
      );
    }
    if (order.status === 'PENDING_DEPOSIT') {
      return (
        <Tag color="gold" style={{ fontWeight: 700, borderRadius: 6 }}>
          CHỜ ĐẶT CỌC (30%)
        </Tag>
      );
    }
    if (order.status === 'DOCS_PROCESSING') {
      return (
        <Tag color="blue" style={{ fontWeight: 700, borderRadius: 6 }}>
          ĐANG THẨM ĐỊNH HỒ SƠ
        </Tag>
      );
    }
    if (order.status === 'PRICE_REVIEW') {
      return (
        <Tag color="purple" style={{ fontWeight: 700, borderRadius: 6 }}>
          CHỜ DUYỆT BÁO GIÁ
        </Tag>
      );
    }
    if (order.status === 'APPROVED' && order.depositStatus === 'PAID') {
      return (
        <Tag color="green" style={{ fontWeight: 700, borderRadius: 6 }}>
          ĐÃ ĐẶT CỌC · CHUẨN BỊ XE
        </Tag>
      );
    }
    if (order.status === 'IN_TRANSIT') {
      return (
        <Tag color="cyan" style={{ fontWeight: 700, borderRadius: 6 }}>
          ĐANG VẬN CHUYỂN
        </Tag>
      );
    }
    if (order.status === 'COMPLETED') {
      return (
        <Tag color="default" style={{ fontWeight: 700, borderRadius: 6 }}>
          HOÀN TẤT
        </Tag>
      );
    }
    return (
      <Tag color="orange" style={{ fontWeight: 700, borderRadius: 6 }}>
        CHỜ TIẾP NHẬN
      </Tag>
    );
  };

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Banner if user just created BK-005 */}
      {justCreatedBK005 && (
        <Alert
          message={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={18} color="#059669" />
              <span>
                <strong>Bạn vừa gửi thành công đơn BK-005.</strong> Quản lý logistics đang tiếp nhận xử lý và đối chiếu hồ sơ ngựa.
              </span>
            </div>
          }
          type="success"
          showIcon={false}
          closable
          style={{
            borderRadius: 10,
            border: '1.5px solid #a7f3d0',
            backgroundColor: '#ecfdf5',
            padding: '12px 18px'
          }}
        />
      )}

      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 14,
          padding: '22px 28px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#0f172a' }}>
            Đơn của tôi
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748b' }}>
            Theo dõi trạng thái, thẩm định kiểm dịch và thanh toán đặt cọc cho mỗi chuyến đi.
          </p>
        </div>

        <Button
          type="primary"
          icon={<Plus size={16} />}
          onClick={() => navigate('/orders/create')}
          style={{
            height: 42,
            padding: '0 20px',
            fontSize: 14,
            fontWeight: 700,
            borderRadius: 8,
            backgroundColor: '#ea580c',
            borderColor: '#ea580c'
          }}
        >
          Đặt chuyến mới
        </Button>
      </div>

      {/* Filter Tabs & Search */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '12px 20px',
          gap: 16,
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
          {groups.map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => setFilterTab(g.key)}
              style={{
                padding: '6px 16px',
                borderRadius: 20,
                border: filterTab === g.key ? '1px solid #ea580c' : '1px solid #e2e8f0',
                background: filterTab === g.key ? '#ea580c' : '#ffffff',
                color: filterTab === g.key ? '#ffffff' : '#64748b',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
            >
              {g.label} ({g.count})
            </button>
          ))}
        </div>

        <Input
          prefix={<Search size={15} color="#94a3b8" />}
          placeholder="Tìm kiếm mã đơn, hành trình, tên ngựa..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: 340, borderRadius: 8 }}
          allowClear
        />
      </div>

      {/* Order Cards List */}
      <Spin spinning={loading}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {filteredOrders.length === 0 ? (
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1.5px dashed #cbd5e1',
                borderRadius: 14,
                padding: '60px 24px',
                textAlign: 'center'
              }}
            >
              <Truck size={48} color="#cbd5e1" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                Không tìm thấy đơn hàng nào
              </h3>
              <p style={{ margin: '8px auto 20px', color: '#64748b', maxWidth: 360, fontSize: 13 }}>
                Hãy thử chọn bộ lọc trạng thái khác hoặc đặt chuyến mới ngay bây giờ.
              </p>
              <Button type="primary" onClick={() => navigate('/orders/create')} style={{ backgroundColor: '#ea580c' }}>
                Đặt chuyến ngay
              </Button>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const isHighlight = order.orderCode === 'BK-005';
              const stepIndex = getStepProgressIndex(order);
              const needsDeposit =
                order.status === 'PENDING_DEPOSIT' ||
                (order.depositRequired && order.depositStatus === 'UNPAID' && order.pricing?.totalAmountVnd);

              return (
                <div
                  key={order.id || order.orderCode}
                  className={order.isJustCreated ? 'order-card--highlight' : ''}
                  style={{
                    backgroundColor: '#ffffff',
                    border: isHighlight && !order.isJustCreated ? '1.5px solid #fed7aa' : '1px solid #e2e8f0',
                    borderRadius: 14,
                    padding: '24px 28px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Card Header: Code + Route + Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span
                        style={{
                          fontSize: 18,
                          fontWeight: 800,
                          color: '#0f172a',
                          letterSpacing: '-0.3px'
                        }}
                      >
                        {order.orderCode}
                      </span>
                      {renderStatusTag(order)}
                    </div>

                    <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                      {order.routeLabel}
                    </div>
                  </div>

                  {/* Fact Details Strip */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '10px 20px',
                      backgroundColor: '#f8fafc',
                      padding: '14px 18px',
                      borderRadius: 10,
                      border: '1px solid #f1f5f9',
                      fontSize: 13
                    }}
                  >
                    <div>
                      <span style={{ color: '#64748b' }}>Khởi hành: </span>
                      <strong style={{ color: '#0f172a' }}>
                        {order.departureTime} · {order.departureDate}
                      </strong>
                    </div>

                    <div>
                      <span style={{ color: '#64748b' }}>Ngựa vận chuyển: </span>
                      <strong style={{ color: '#ea580c' }}>
                        {Array.isArray(order.horses) ? order.horses.join(', ') : order.horses}
                      </strong>
                    </div>

                    <div>
                      <span style={{ color: '#64748b' }}>Tổng chi phí: </span>
                      <strong style={{ color: '#0f172a' }}>
                        {order.pricing?.totalAmountVnd ? formatVnd(order.pricing.totalAmountVnd) : 'Chờ duyệt báo giá'}
                      </strong>
                    </div>

                    <div>
                      <span style={{ color: '#64748b' }}>Phương tiện: </span>
                      <strong style={{ color: '#0f172a' }}>
                        {order.vehiclePlate || 'Đang bố trí xe'}
                      </strong>
                    </div>
                  </div>

                  {/* 8-Stage Visual Progress Bar */}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#64748b',
                        marginBottom: 6
                      }}
                    >
                      <span style={{ color: '#ea580c' }}>
                        {order.flowStepLabel || `Bước ${stepIndex}/8`}
                      </span>
                      <span>8 bước hoàn thành</span>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(8, 1fr)',
                        gap: 4
                      }}
                    >
                      {[
                        'Gửi đơn',
                        'Thẩm định hồ sơ',
                        'Bố trí xe & lộ trình',
                        'Đặt cọc',
                        'Chuẩn bị xe',
                        'Vận chuyển',
                        'Bàn giao',
                        'Hoàn tất'
                      ].map((stageName, idx) => {
                        const isDone = idx + 1 <= stepIndex;
                        const isCurrent = idx + 1 === stepIndex;

                        return (
                          <div
                            key={stageName}
                            title={`Bước ${idx + 1}: ${stageName}`}
                            style={{
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: isDone ? '#ea580c' : '#e2e8f0',
                              transition: 'all 0.2s ease'
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Urgency Box if needs deposit (Step 4) */}
                  {needsDeposit && (
                    <div
                      style={{
                        backgroundColor: '#fffbeb',
                        border: '1.5px solid #fde68a',
                        borderRadius: 10,
                        padding: '12px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Clock size={20} color="#b45309" />
                        <div>
                          <strong style={{ color: '#92400E', fontSize: 14 }}>
                            Đặt cọc 30% trong 23 giờ 59 phút
                          </strong>
                          <div style={{ color: '#b45309', fontSize: 12 }}>
                            Báo giá và lịch trình đã được duyệt. Hãy thanh toán tiền cọc {formatVnd(order.depositAmountVnd || 7823000)} để kích hoạt chuẩn bị xe.
                          </div>
                        </div>
                      </div>

                      <Button
                        type="primary"
                        onClick={() => navigate(`/orders/${order.orderCode || order.id}`)}
                        style={{
                          backgroundColor: '#ea580c',
                          borderColor: '#ea580c',
                          fontWeight: 700,
                          borderRadius: 6
                        }}
                      >
                        Đặt cọc 30%
                      </Button>
                    </div>
                  )}

                  {/* Card Footer Actions */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: 12,
                      borderTop: '1px solid #f1f5f9'
                    }}
                  >
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {order.status === 'PENDING_APPROVAL' && 'Đơn đang chờ Quản lý logistics tiếp nhận và kích hoạt thẩm định.'}
                      {order.status === 'DOCS_PROCESSING' && 'Chuyên viên kiểm dịch đang đối chiếu hồ sơ Hộ chiếu & Tiêm chủng.'}
                      {order.status === 'PRICE_REVIEW' && 'Điều phối viên đang chốt xe chuyên dụng và trạm dừng chân.'}
                      {order.status === 'APPROVED' && order.depositStatus === 'PAID' && 'Đã đặt cọc thành công. Xe và tài xế đang được chuẩn bị.'}
                    </div>

                    <Space>
                      {order.status === 'PENDING_APPROVAL' && (
                        <Popconfirm
                          title="Hủy đơn vận chuyển này?"
                          description={`Bạn có chắc chắn muốn hủy đơn ${order.orderCode}?`}
                          okText="Hủy đơn"
                          cancelText="Giữ lại"
                          okButtonProps={{ danger: true }}
                          onConfirm={() => handleCancel(order.id, order.orderCode)}
                        >
                          <Button danger size="small" style={{ borderRadius: 6 }}>
                            Hủy đơn
                          </Button>
                        </Popconfirm>
                      )}

                      <Button
                        type="primary"
                        onClick={() => navigate(`/orders/${order.orderCode || order.id}`)}
                        style={{
                          borderRadius: 6,
                          fontWeight: 600,
                          backgroundColor: '#ea580c',
                          borderColor: '#ea580c'
                        }}
                      >
                        Xem chi tiết đơn <ArrowRight size={13} style={{ marginLeft: 4 }} />
                      </Button>
                    </Space>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Spin>
    </div>
  );
}
