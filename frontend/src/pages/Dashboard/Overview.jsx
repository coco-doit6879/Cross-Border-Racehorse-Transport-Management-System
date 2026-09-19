import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'antd';
import {
  Plus,
  AlertTriangle,
  MapPin,
  Clock,
  CheckCircle2,
  Smartphone,
  Circle
} from 'lucide-react';
import { useHorseStore } from '../../store/useHorseStore';
import { useOrderStore } from '../../store/useOrderStore';

const Overview = () => {
  const navigate = useNavigate();
  const { horses } = useHorseStore();
  const { orders } = useOrderStore();

  // Active In-Transit order for Customer view
  const activeTrip = orders.find((o) => o.status === 'IN_TRANSIT') || orders[0];

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

            {/* Styled Mini Route Map */}
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
                <circle cx="30" cy="150" r="6" fill="#0F3E2E" />
                <circle cx="150" cy="115" r="5" fill="#059669" />
                <circle cx="250" cy="74" r="8" fill="#10B981" />
                <circle cx="250" cy="74" r="14" fill="#10B981" opacity="0.3" />
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

        {/* Column Right: Live Welfare Card (Không có nhiệt độ và lượng nước) */}
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

            {/* Horses Welfare Status (Đã loại bỏ nhiệt độ và lượng nước) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {/* Thunder Bolt */}
              <div
                style={{
                  backgroundColor: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: 10,
                  padding: '16px 18px'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: 15, color: '#111827' }}>
                    Thunder Bolt
                  </span>
                  <span
                    style={{
                      backgroundColor: '#EBF5F0',
                      color: '#0F3E2E',
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '3px 12px',
                      borderRadius: 6
                    }}
                  >
                    Bình tĩnh
                  </span>
                </div>
              </div>

              {/* Silver Wind */}
              <div
                style={{
                  backgroundColor: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: 10,
                  padding: '16px 18px'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: 15, color: '#111827' }}>
                    Silver Wind
                  </span>
                  <span
                    style={{
                      backgroundColor: '#EBF5F0',
                      color: '#0F3E2E',
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '3px 12px',
                      borderRadius: 6
                    }}
                  >
                    Bình tĩnh
                  </span>
                </div>
              </div>
            </div>

            {/* Lịch trình dừng chân gần nhất */}
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#6B7280',
                  textTransform: 'uppercase',
                  marginBottom: 10
                }}
              >
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
          <span
            style={{
              fontWeight: 700,
              color: '#374151',
              textTransform: 'uppercase',
              letterSpacing: 0.5
            }}
          >
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
};

export default Overview;
