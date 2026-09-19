import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Tag,
  Input,
  message,
  Select,
  Progress,
  Divider,
  Modal
} from 'antd';
import {
  Plus,
  AlertTriangle,
  MapPin,
  Clock,
  CheckCircle2,
  Calendar,
  Search,
  Check,
  X,
  Smartphone,
  ChevronRight,
  TrendingUp,
  Truck,
  Activity,
  FileCheck,
  Circle
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useHorseStore } from '../../store/useHorseStore';
import { useOrderStore } from '../../store/useOrderStore';

const { TextArea } = Input;

const Overview = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { horses } = useHorseStore();
  const { orders, approveOrder, rejectOrder } = useOrderStore();

  // For Manager View: selected order in approval queue
  const [selectedOrderCode, setSelectedOrderCode] = useState('TR-2026-0158');
  const [reviewNote, setReviewNote] = useState('');
  const [searchOrderQuery, setSearchOrderQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState('09/2026');

  const pendingOrders = orders.filter((o) => o.status === 'PENDING_APPROVAL');
  const filteredPendingOrders = pendingOrders.filter(
    (o) =>
      o.orderCode.toLowerCase().includes(searchOrderQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchOrderQuery.toLowerCase()) ||
      o.routeLabel.toLowerCase().includes(searchOrderQuery.toLowerCase())
  );

  const currentSelectedOrder =
    orders.find((o) => o.orderCode === selectedOrderCode) || pendingOrders[0] || null;

  // Active In-Transit order for Customer view
  const activeTrip = orders.find((o) => o.status === 'IN_TRANSIT') || orders[0];

  const handleApprove = (orderCode) => {
    approveOrder(orderCode, reviewNote);
    message.success(`Đã phê duyệt đơn vận chuyển ${orderCode} thành công!`);
    setReviewNote('');
  };

  const handleReject = (orderCode) => {
    if (!reviewNote.trim()) {
      message.warning('Vui lòng nhập lý do từ chối đơn!');
      return;
    }
    rejectOrder(orderCode, reviewNote);
    message.info(`Đã từ chối đơn ${orderCode}. Lý do: ${reviewNote}`);
    setReviewNote('');
  };

  /* =======================================================================
     1. CUSTOMER DASHBOARD (Figma screen 01-customer-overview 1)
     ======================================================================= */
  if (user?.role === 'CUSTOMER') {
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
              Theo dõi hành trình và sức khỏe đàn ngựa của bạn tại một nơi.
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

        {/* 2. Urgent Warning Banner */}
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
              <strong>Có 02 ngựa cần xử lý:</strong> Đơn <strong>TR-2026-0142</strong> khởi hành sau
              48 giờ, còn thiếu giấy khám sức khỏe.
            </span>
          </div>
          <Button
            size="small"
            onClick={() => navigate('/horses/H-001')}
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#D97706',
              color: '#92400E',
              fontWeight: 600,
              fontSize: 12,
              borderRadius: 6
            }}
          >
            Bổ sung hồ sơ
          </Button>
        </div>

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
                    <span
                      style={{
                        backgroundColor: '#ECFDF5',
                        color: '#059669',
                        border: '1px solid #A7F3D0',
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 6
                      }}
                    >
                      Đang vận chuyển
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
                    {activeTrip.routeLabel} / {activeTrip.horses.join(', ')}
                  </div>
                </div>
              </div>

              {/* Styled Mini Route Map (Visual Simulation matching Figma) */}
              <div
                style={{
                  width: '100%',
                  height: 200,
                  backgroundColor: '#EBF4F0',
                  borderRadius: 10,
                  border: '1px solid #D1E5DD',
                  position: 'relative',
                  overflow: 'hidden',
                  marginBottom: 18
                }}
              >
                {/* SVG Route Line */}
                <svg
                  style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
                >
                  <path
                    d="M 30 150 Q 140 120 220 80 T 420 50"
                    fill="none"
                    stroke="#0F3E2E"
                    strokeWidth="4"
                    strokeDasharray="6,4"
                  />
                  {/* Origin point */}
                  <circle cx="30" cy="150" r="6" fill="#0F3E2E" />
                  {/* Rest stop */}
                  <circle cx="150" cy="115" r="5" fill="#059669" />
                  {/* Current GPS vehicle pin */}
                  <circle cx="250" cy="74" r="8" fill="#10B981" />
                  <circle cx="250" cy="74" r="14" fill="#10B981" opacity="0.3" />
                  {/* Destination */}
                  <circle cx="420" cy="50" r="6" fill="#6B7280" />
                </svg>

                {/* Map Labels overlay */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 12,
                    left: 14,
                    backgroundColor: 'rgba(255,255,255,0.92)',
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#0F3E2E',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5
                  }}
                >
                  <MapPin size={12} color="#0F3E2E" />
                  <span>TP. Hồ Chí Minh → Phnom Penh</span>
                </div>
                <div
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 14,
                    backgroundColor: 'rgba(15,62,46,0.9)',
                    color: '#FFFFFF',
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 500
                  }}
                >
                  Xe chuyên dụng: {activeTrip.vehiclePlate || 'VN-TRUCK-001'}
                </div>
              </div>

              {/* GPS indicator & ETA */}
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
                      backgroundColor: '#10B981',
                      display: 'inline-block'
                    }}
                  />
                  <strong>GPS trực tuyến:</strong> 15 giây trước
                </div>
                <div style={{ fontSize: 13, color: '#111827', fontWeight: 600 }}>
                  Dự kiến đến 16:30 hôm nay
                </div>
              </div>

              {/* Milestones Horizontal Progress */}
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
                  <CheckCircle2 size={13} color="#059669" /> Đã xuất phát
                </span>
                <span style={{ color: '#D1D5DB' }}>|</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#059669', fontWeight: 600 }}>
                  <CheckCircle2 size={13} color="#059669" /> Trạm nghỉ
                </span>
                <span style={{ color: '#D1D5DB' }}>|</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#D97706', fontWeight: 600 }}>
                  <Clock size={13} color="#D97706" /> Cửa khẩu
                </span>
                <span style={{ color: '#D1D5DB' }}>|</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#9CA3AF' }}>
                  <Circle size={12} color="#9CA3AF" /> Bàn giao
                </span>
              </div>
            </div>

            {/* Link to mobile view */}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #F3F4F6' }}>
              <Button
                type="link"
                icon={<Smartphone size={14} />}
                style={{ padding: 0, fontSize: 13, color: '#0F3E2E', fontWeight: 600 }}
              >
                Xem trên điện thoại
              </Button>
            </div>
          </div>

          {/* Column Right: Live Welfare Card */}
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
                Sức khỏe trên hành trình
              </h2>
              <div style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 16px 0' }}>
                Cập nhật 10:20 | Người vận chuyển: <strong>Nguyễn Văn An</strong>
              </div>

              {/* Horses Biometrics */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                {/* Thunder Bolt */}
                <div
                  style={{
                    backgroundColor: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    borderRadius: 10,
                    padding: '12px 16px'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 6
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>
                      Thunder Bolt
                    </span>
                    <span
                      style={{
                        backgroundColor: '#EBF5F0',
                        color: '#0F3E2E',
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 6
                      }}
                    >
                      Bình tĩnh
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#4B5563' }}>
                    Thân nhiệt: <strong>37.8°C</strong> • Lượng nước: <strong>4 lít nước</strong>
                  </div>
                </div>

                {/* Silver Wind */}
                <div
                  style={{
                    backgroundColor: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    borderRadius: 10,
                    padding: '12px 16px'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 6
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>
                      Silver Wind
                    </span>
                    <span
                      style={{
                        backgroundColor: '#EBF5F0',
                        color: '#0F3E2E',
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 6
                      }}
                    >
                      Bình tĩnh
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#4B5563' }}>
                    Thân nhiệt: <strong>37.6°C</strong> • Lượng nước: <strong>4 lít nước</strong>
                  </div>
                </div>
              </div>

              {/* Lịch trình dừng chân gần nhất */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', marginBottom: 10 }}>
                  Lịch trình dừng chân
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, color: '#374151' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#0F3E2E', fontWeight: 600 }}>10:20</span>
                    <span>Khởi hành từ CLB Thảo Điền</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#0F3E2E', fontWeight: 600 }}>09:45</span>
                    <span>Đã đến cửa khẩu Mộc Bài</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#0F3E2E', fontWeight: 600 }}>08:30</span>
                    <span>Hoàn tất nghỉ tại Củ Chi</span>
                  </div>
                </div>
              </div>
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
            <span style={{ fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Chuyến sắp tới:
            </span>
            <span style={{ fontWeight: 600, color: '#111827' }}>TR-2026-0158</span>
            <span style={{ color: '#6B7280' }}>•</span>
            <span style={{ color: '#4B5563' }}>HÀ NỘI → SINGAPORE</span>
            <span style={{ color: '#6B7280' }}>•</span>
            <span style={{ color: '#4B5563' }}>17/09/2026</span>
          </div>
          <span
            style={{
              backgroundColor: '#FEF08A',
              color: '#92400E',
              fontWeight: 600,
              fontSize: 11,
              padding: '3px 10px',
              borderRadius: 6
            }}
          >
            Đang xử lý hồ sơ
          </span>
        </div>
      </div>
    );
  }

  /* =======================================================================
     2. LOGISTICS MANAGER DASHBOARD (Figma screen 04-manager 1)
     ======================================================================= */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 1. Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111827' }}>
            Trung tâm vận hành
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#6B7280' }}>
            Thứ Ba, 15 tháng 9, 2026 • Những việc cần xử lý hôm nay
          </p>
        </div>

        {/* Month Selector */}
        <div
          style={{
            backgroundColor: '#0F3E2E',
            color: '#FFFFFF',
            padding: '6px 14px',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Calendar size={14} />
          <span>Tháng 09 / 2026</span>
        </div>
      </div>

      {/* 2. 4 Key Metric / KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16
        }}
      >
        {/* KPI 1: OTD */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: 10,
            padding: '18px 20px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}>Giao đúng giờ (OTD)</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#111827', margin: '6px 0 2px 0' }}>
            96,4%
          </div>
          <div style={{ fontSize: 11, color: '#059669', fontWeight: 500 }}>
            54 / 56 chuyến đúng giờ
          </div>
        </div>

        {/* KPI 2: Total Distance */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: 10,
            padding: '18px 20px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}>Tổng quãng đường</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#111827', margin: '6px 0 2px 0' }}>
            18.420 km
          </div>
          <div style={{ fontSize: 11, color: '#6B7280' }}>Tháng hiện tại</div>
        </div>

        {/* KPI 3: Horses in system */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: 10,
            padding: '18px 20px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}>Ngựa trong hệ thống</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#0F3E2E', margin: '6px 0 2px 0' }}>
            03
          </div>
          <div style={{ fontSize: 11, color: '#059669', fontWeight: 500 }}>Đang hoạt động/vận chuyển</div>
        </div>

        {/* KPI 4: Pending Approval Orders */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: 10,
            padding: '18px 20px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}>Đơn chờ phê duyệt</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#D97706', margin: '6px 0 2px 0' }}>
            08
          </div>
          <div style={{ fontSize: 11, color: '#D97706', fontWeight: 500 }}>Đổi lịch / tạo mới trong tuần</div>
        </div>
      </div>

      {/* 3. Booking Approval Workspace (2 Columns Layout) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1.6fr',
          gap: 20
        }}
      >
        {/* Left Column: List of Pending Orders */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: 12,
            padding: 20
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 12 }}>
            Đơn chờ phê duyệt
          </div>

          {/* Search Input */}
          <Input
            prefix={<Search size={14} color="#9CA3AF" />}
            placeholder="Tìm đơn, khách hàng hoặc tuyến đường"
            value={searchOrderQuery}
            onChange={(e) => setSearchOrderQuery(e.target.value)}
            style={{ marginBottom: 14 }}
          />

          {/* List of Order Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredPendingOrders.map((order) => {
              const isSelected = order.orderCode === currentSelectedOrder?.orderCode;
              return (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrderCode(order.orderCode)}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 8,
                    border: isSelected ? '2px solid #0F3E2E' : '1px solid #E5E7EB',
                    backgroundColor: isSelected ? '#F6FAF8' : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>
                      {order.orderCode}
                    </span>
                    <span style={{ fontSize: 11, color: '#6B7280' }}>
                      {order.departureDate} • {order.horses?.length || 1} ngựa
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#4B5563', marginTop: 4 }}>
                    {order.routeLabel}
                  </div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                    Khách hàng: {order.customerName}
                  </div>
                </div>
              );
            })}

            {filteredPendingOrders.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
                Không có đơn hàng nào chờ phê duyệt
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Selected Order Detail & Approval Actions */}
        {currentSelectedOrder ? (
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
              {/* Order Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>
                  {currentSelectedOrder.orderCode}
                </div>
                <span
                  style={{
                    backgroundColor: '#FEF08A',
                    color: '#92400E',
                    fontWeight: 600,
                    fontSize: 12,
                    padding: '3px 10px',
                    borderRadius: 6
                  }}
                >
                  Chờ phê duyệt
                </span>
              </div>

              {/* Order Details list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                <div>
                  <span style={{ color: '#6B7280' }}>Khách hàng:</span>{' '}
                  <strong>{currentSelectedOrder.customerName}</strong>
                </div>
                <div>
                  <span style={{ color: '#6B7280' }}>Ngày khởi hành:</span>{' '}
                  <strong>
                    {currentSelectedOrder.departureDate}, {currentSelectedOrder.departureTime}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#6B7280' }}>Hành trình:</span>{' '}
                  <strong>{currentSelectedOrder.routeLabel}</strong>
                </div>
                <div>
                  <span style={{ color: '#6B7280' }}>Ngựa vận chuyển:</span>{' '}
                  <strong>{currentSelectedOrder.horses?.join(', ')}</strong>
                </div>
                <div
                  style={{
                    marginTop: 8,
                    padding: '10px 14px',
                    backgroundColor: '#F9FAFB',
                    borderRadius: 8,
                    border: '1px solid #F3F4F6'
                  }}
                >
                  <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 600, marginBottom: 4 }}>
                    YÊU CẦU ĐẶC BIỆT:
                  </div>
                  <div style={{ color: '#374151' }}>
                    {currentSelectedOrder.specialRequirements || 'Không có yêu cầu đặc biệt.'}
                  </div>
                </div>
              </div>

              {/* Ghi chú điều hành / lý do */}
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Ghi chú điều hành / lý do:
                </div>
                <TextArea
                  rows={3}
                  placeholder="Nhập ghi chú điều hành hoặc lý do từ chối..."
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 12,
                marginTop: 24,
                paddingTop: 16,
                borderTop: '1px solid #F3F4F6'
              }}
            >
              <Button
                onClick={() => handleReject(currentSelectedOrder.orderCode)}
                style={{ borderRadius: 8, height: 40, padding: '0 20px', fontWeight: 500 }}
              >
                Từ chối
              </Button>
              <Button
                type="primary"
                onClick={() => handleApprove(currentSelectedOrder.orderCode)}
                style={{
                  backgroundColor: '#0F3E2E',
                  borderColor: '#0F3E2E',
                  borderRadius: 8,
                  height: 40,
                  padding: '0 24px',
                  fontWeight: 600
                }}
              >
                Phê duyệt đơn
              </Button>
            </div>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: 12,
              padding: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9CA3AF'
            }}
          >
            Chọn một đơn hàng bên trái để xem chi tiết và phê duyệt
          </div>
        )}
      </div>
    </div>
  );
};

export default Overview;
