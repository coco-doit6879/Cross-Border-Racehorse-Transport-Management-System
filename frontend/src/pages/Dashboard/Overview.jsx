import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Tag, Empty } from 'antd';
import {
  Plus,
  AlertTriangle,
  MapPin,
  Clock,
  CheckCircle2,
  Smartphone,
  Circle,
  Truck,
  ShieldCheck,
  Package
} from 'lucide-react';
import { useHorseStore } from '../../store/useHorseStore';
import { useOrderStore } from '../../store/useOrderStore';

const getStatusBadge = (status) => {
  switch (status) {
    case 'IN_TRANSIT':
      return <Tag color="processing">Đang vận chuyển</Tag>;
    case 'APPROVED':
      return <Tag color="success">Đã phê duyệt</Tag>;
    case 'COMPLETED':
      return <Tag color="default">Đã hoàn thành</Tag>;
    case 'PENDING_APPROVAL':
    default:
      return <Tag color="warning">Chờ phê duyệt</Tag>;
  }
};

const Overview = () => {
  const navigate = useNavigate();
  const { horses, fetchHorses } = useHorseStore();
  const { orders, fetchOrders } = useOrderStore();

  useEffect(() => {
    fetchHorses().catch(() => {});
    fetchOrders().catch(() => {});
  }, [fetchHorses, fetchOrders]);

  // Find active or latest customer order from backend REST API
  const activeTrip = orders.find((o) => o.status === 'IN_TRANSIT') || orders[0] || null;

  // Upcoming trip (pending approval or scheduled)
  const upcomingTrip = orders.find((o) => o.status === 'PENDING_APPROVAL' || o.status === 'APPROVED');

  // Pending items count
  const pendingOrdersCount = orders.filter((o) => o.status === 'PENDING_APPROVAL').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 1. Hero Banner */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: 12,
          padding: '24px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 700,
              color: '#111827',
              letterSpacing: '-0.3px'
            }}
          >
            An tâm trên từng chặng đường.
          </h1>
          <p style={{ margin: '6px 0 0 0', fontSize: 14, color: '#4B5563' }}>
            Theo dõi hành trình và sức khỏe đàn ngựa của bạn trực tiếp từ hệ thống.
          </p>
        </div>
        <Button
          type="primary"
          icon={<Plus size={16} />}
          onClick={() => navigate('/orders/create')}
          style={{
            backgroundColor: '#0F3E2E',
            borderColor: '#0F3E2E',
            height: 42,
            padding: '0 20px',
            fontSize: 14,
            fontWeight: 600,
            borderRadius: 8
          }}
        >
          Tạo đơn vận chuyển
        </Button>
      </div>

      {/* 2. Dynamic Status Banner */}
      {pendingOrdersCount > 0 ? (
        <div
          style={{
            backgroundColor: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: 10,
            padding: '14px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                backgroundColor: '#FEF3C7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <AlertTriangle size={16} color="#D97706" />
            </div>
            <span style={{ fontSize: 13, color: '#92400E', fontWeight: 500 }}>
              <strong>Có {pendingOrdersCount} đơn vận chuyển đang chờ duyệt:</strong> Đơn mới tạo sẽ được Quản lý kiểm tra và phê duyệt.
            </span>
          </div>
          <Button
            size="small"
            onClick={() => navigate('/orders')}
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#D97706',
              color: '#92400E',
              fontWeight: 600,
              fontSize: 12,
              borderRadius: 6
            }}
          >
            Xem danh sách đơn
          </Button>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            borderRadius: 10,
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}
        >
          <ShieldCheck size={20} color="#059669" />
          <span style={{ fontSize: 13, color: '#065F46', fontWeight: 500 }}>
            Tất cả hồ sơ và đơn vận chuyển của bạn đang ở trạng thái ổn định.
          </span>
        </div>
      )}

      {/* 3. Main Active Trip & Live Welfare - 2 Columns Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: 20
        }}
      >
        {/* Column Left: Active Trip Tracking Card */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: 12,
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          {activeTrip ? (
            <div>
              {/* Header Info */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 16
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
                      {activeTrip.orderCode}
                    </span>
                    {getStatusBadge(activeTrip.status)}
                  </div>
                  <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
                    Tuyến: <strong>{activeTrip.routeLabel}</strong> {activeTrip.horses.length > 0 ? `• Ngựa: ${activeTrip.horses.join(', ')}` : ''}
                  </div>
                </div>
              </div>

              {/* Route Card Box */}
              <div
                style={{
                  width: '100%',
                  backgroundColor: '#EBF4F0',
                  borderRadius: 10,
                  border: '1px solid #D1E5DD',
                  padding: 20,
                  position: 'relative',
                  marginBottom: 18
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#0F3E2E' }}>
                    <MapPin size={16} color="#0F3E2E" />
                    <span>{activeTrip.origin} → {activeTrip.destination}</span>
                  </div>
                  <div
                    style={{
                      backgroundColor: 'rgba(15,62,46,0.9)',
                      color: '#FFFFFF',
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 500
                    }}
                  >
                    Xe: {activeTrip.vehiclePlate}
                  </div>
                </div>

                <div style={{ fontSize: 12, color: '#374151' }}>
                  Tài xế phụ trách: <strong>{activeTrip.driverName}</strong>
                </div>
              </div>

              {/* Status Details */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151' }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: activeTrip.status === 'IN_TRANSIT' ? '#10B981' : '#F59E0B',
                      display: 'inline-block'
                    }}
                  />
                  <strong>Cập nhật trạng thái:</strong> {activeTrip.gpsTimeAgo}
                </div>
                <div style={{ fontSize: 13, color: '#111827', fontWeight: 600 }}>
                  {activeTrip.eta}
                </div>
              </div>

              {/* Milestones Progress */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  fontSize: 12,
                  color: '#4B5563',
                  padding: '10px 14px',
                  backgroundColor: '#F9FAFB',
                  borderRadius: 8,
                  border: '1px solid #F3F4F6'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#059669', fontWeight: 600 }}>
                  <CheckCircle2 size={13} color="#059669" /> Đăng ký đơn
                </span>
                <span style={{ color: '#D1D5DB' }}>|</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: activeTrip.status !== 'PENDING_APPROVAL' ? '#059669' : '#D97706', fontWeight: 600 }}>
                  <Clock size={13} color={activeTrip.status !== 'PENDING_APPROVAL' ? '#059669' : '#D97706'} /> Phê duyệt
                </span>
                <span style={{ color: '#D1D5DB' }}>|</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: activeTrip.status === 'IN_TRANSIT' || activeTrip.status === 'COMPLETED' ? '#059669' : '#9CA3AF' }}>
                  <Truck size={13} /> Vận chuyển
                </span>
                <span style={{ color: '#D1D5DB' }}>|</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: activeTrip.status === 'COMPLETED' ? '#059669' : '#9CA3AF' }}>
                  <Circle size={12} /> Bàn giao
                </span>
              </div>
            </div>
          ) : (
            <div style={{ padding: '30px 0', textAlign: 'center' }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Chưa có chuyến xe nào được tạo."
              />
              <Button
                type="primary"
                onClick={() => navigate('/orders/create')}
                style={{ marginTop: 12, backgroundColor: '#0F3E2E', borderColor: '#0F3E2E' }}
              >
                Tạo đơn vận chuyển ngay
              </Button>
            </div>
          )}

          {/* Quick link */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #F3F4F6' }}>
            <Button
              type="link"
              onClick={() => navigate('/orders')}
              style={{ padding: 0, fontSize: 13, color: '#0F3E2E', fontWeight: 600 }}
            >
              Xem danh sách đơn vận chuyển →
            </Button>
          </div>
        </div>

        {/* Column Right: Live Horses Summary */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: 12,
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>
              Đàn ngựa của bạn ({horses.length})
            </h2>
            <div style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 16px 0' }}>
              Danh mục nhận dạng và hồ sơ hộ chiếu FEI từ MongoDB
            </div>

            {/* List of Customer Horses */}
            {horses.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                {horses.slice(0, 3).map((horse) => (
                  <div
                    key={horse.id}
                    style={{
                      backgroundColor: '#F9FAFB',
                      border: '1px solid #E5E7EB',
                      borderRadius: 10,
                      padding: '14px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>
                        {horse.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                        Mã chip: {horse.microchipId} • {horse.breed || 'Chưa phân loại'}
                      </div>
                    </div>
                    <Tag color="blue" style={{ fontSize: 11, borderRadius: 6 }}>
                      Sẵn sàng
                    </Tag>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '20px 0', textAlign: 'center' }}>
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa đăng ký chú ngựa nào." />
                <Button
                  size="small"
                  onClick={() => navigate('/horses')}
                  style={{ marginTop: 8 }}
                >
                  Đăng ký hồ sơ ngựa
                </Button>
              </div>
            )}
          </div>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #F3F4F6' }}>
            <Button
              type="link"
              onClick={() => navigate('/horses')}
              style={{ padding: 0, fontSize: 13, color: '#0F3E2E', fontWeight: 600 }}
            >
              Xem chi tiết hồ sơ đàn ngựa →
            </Button>
          </div>
        </div>
      </div>

      {/* 4. Upcoming Trip Footer Banner */}
      {upcomingTrip && (
        <div
          style={{
            backgroundColor: '#F3F4F6',
            border: '1px solid #E5E7EB',
            borderRadius: 10,
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 13
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span
              style={{
                fontWeight: 700,
                color: '#374151',
                textTransform: 'uppercase',
                letterSpacing: 0.5
              }}
            >
              Đơn vận chuyển gần nhất:
            </span>
            <span style={{ fontWeight: 600, color: '#111827' }}>{upcomingTrip.orderCode}</span>
            <span style={{ color: '#6B7280' }}>•</span>
            <span style={{ color: '#4B5563' }}>{upcomingTrip.routeLabel}</span>
            <span style={{ color: '#6B7280' }}>•</span>
            <span style={{ color: '#4B5563' }}>{upcomingTrip.departureDate}</span>
          </div>
          {getStatusBadge(upcomingTrip.status)}
        </div>
      )}
    </div>
  );
};

export default Overview;
