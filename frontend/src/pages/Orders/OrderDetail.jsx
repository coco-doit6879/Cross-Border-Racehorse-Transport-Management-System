import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Tag, Steps } from 'antd';
import { ArrowLeft, Truck, MapPin, CheckCircle, Clock } from 'lucide-react';
import { useOrderStore } from '../../store/useOrderStore';

import LocationMap from '../../components/common/LocationMap';

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { orders } = useOrderStore();

  const order = orders.find((o) => o.id === id || o.orderCode === id) || orders[0];

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
              <strong>{order?.vehiclePlate || 'Xe chuyên dụng 51D-246.80'}</strong>
            </div>
            <div>
              <span style={{ color: '#6B7280' }}>Tài xế phụ trách:</span>{' '}
              <strong>{order?.driverName || 'Nguyễn Minh Hoàng'}</strong>
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
            current={1}
            items={[
              {
                title: 'Khởi hành tại CLB đón',
                description: 'Đã xuất phát lúc 08:15'
              },
              {
                title: 'Trạm dừng nghỉ & Kiểm tra sức khỏe',
                description: 'Đã hoàn tất lúc 09:30 tại Củ Chi'
              },
              {
                title: 'Cửa khẩu kiểm dịch thông quan',
                description: 'Đang tiến hành thủ tục'
              },
              {
                title: 'Bàn giao & Ký nghiệm thu POD',
                description: 'Dự kiến 16:30'
              }
            ]}
          />
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
