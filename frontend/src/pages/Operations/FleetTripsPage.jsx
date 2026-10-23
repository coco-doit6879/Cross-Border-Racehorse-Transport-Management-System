import React, { useState, useEffect } from 'react';
import {
  Alert,
  Button,
  Card,
  Divider,
  Modal,
  Space,
  Tag,
  Tabs,
  message
} from 'antd';
import {
  Truck,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Compass,
  ArrowRight,
  ArrowLeft,
  Navigation,
  Eye
} from 'lucide-react';
import {
  wdpDemoService,
  VEHICLES_LIST,
  REST_STOPS_LIST
} from '../../services/wdpDemoService';

export default function FleetTripsPage() {
  const [activeTab, setActiveTab] = useState('PENDING'); // PENDING | CONFIRMED
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Vehicle & Rest Stop state
  const [selectedVehicle, setSelectedVehicle] = useState(VEHICLES_LIST[2]); // 51C-123.45
  const [selectedRestStop, setSelectedRestStop] = useState(REST_STOPS_LIST[0]); // Xuân Lộc
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [restStopModalOpen, setRestStopModalOpen] = useState(false);

  const loadData = () => {
    const list = wdpDemoService.getOrders();
    setOrders(list);
  };

  useEffect(() => {
    loadData();
  }, []);

  const pendingOrders = orders.filter(
    (o) => o.status === 'DOCS_VERIFIED' || (o.orderCode === 'BK-005' && !o.routeConfirmed && o.status !== 'PRICE_REVIEW' && o.status !== 'APPROVED')
  );
  const confirmedOrders = orders.filter((o) => o.routeConfirmed || o.status === 'PRICE_REVIEW' || o.status === 'APPROVED');

  const handleConfirmFleetAndRoute = () => {
    wdpDemoService.coordinatorAssignBK005({
      vehiclePlate: selectedVehicle.plateNumber,
      vehicleName: selectedVehicle.name,
      restStopName: selectedRestStop.name
    });
    message.success('Đã xác nhận xe chuyên dụng và lộ trình cho đơn BK-005! Đã chuyển tiếp sang Quản lý duyệt giá.');
    setSelectedOrder(null);
    loadData();
  };

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' }}>
              Điều phối viên đội xe & Lộ trình
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#0f172a' }}>
            Xe và lộ trình
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
            Bố trí xe thùng chuyên dụng có giảm chấn khí nén, xác định trạm dừng chân an toàn cho ngựa thi đấu.
          </p>
        </div>

        <Space>
          <Button onClick={loadData}>Làm mới</Button>
        </Space>
      </div>

      {!selectedOrder ? (
        /* MAIN LIST VIEW */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Tab filters */}
          <div
            style={{
              display: 'flex',
              gap: 10,
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '12px 20px'
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('PENDING')}
              style={{
                padding: '6px 18px',
                borderRadius: 20,
                border: activeTab === 'PENDING' ? '1px solid #ea580c' : '1px solid #e2e8f0',
                background: activeTab === 'PENDING' ? '#ea580c' : '#ffffff',
                color: activeTab === 'PENDING' ? '#ffffff' : '#64748b',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              Cần xác nhận ({pendingOrders.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('CONFIRMED')}
              style={{
                padding: '6px 18px',
                borderRadius: 20,
                border: activeTab === 'CONFIRMED' ? '1px solid #ea580c' : '1px solid #e2e8f0',
                background: activeTab === 'CONFIRMED' ? '#ea580c' : '#ffffff',
                color: activeTab === 'CONFIRMED' ? '#ffffff' : '#64748b',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              Đã chốt lộ trình ({confirmedOrders.length})
            </button>
          </div>

          <Card style={{ borderRadius: 14 }}>
            {activeTab === 'PENDING' ? (
              pendingOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                  <CheckCircle2 size={40} color="#059669" style={{ margin: '0 auto 12px' }} />
                  <strong>Tất cả chuyến đã được bố trí xe và chốt lộ trình</strong>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {pendingOrders.map((ord) => (
                    <div
                      key={ord.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '18px 22px',
                        border: '1.5px solid #fed7aa',
                        backgroundColor: '#fff7ed',
                        borderRadius: 12
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            backgroundColor: '#ffedd5',
                            color: '#ea580c',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: 16
                          }}
                        >
                          BK
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <strong style={{ fontSize: 16, color: '#0f172a' }}>{ord.orderCode}</strong>
                            <Tag color="purple">CHỜ BỐ TRÍ XE & LỘ TRÌNH</Tag>
                          </div>
                          <div style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>
                            Khách hàng: <strong>{ord.customerName}</strong> · Ngựa: <strong>{ord.horses?.join(', ')}</strong>
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                            Hành trình: {ord.routeLabel} · Khởi hành: {ord.departureTime} ({ord.departureDate})
                          </div>
                        </div>
                      </div>

                      <Button
                        type="primary"
                        onClick={() => setSelectedOrder(ord)}
                        style={{
                          height: 40,
                          padding: '0 20px',
                          borderRadius: 8,
                          backgroundColor: '#ea580c',
                          borderColor: '#ea580c',
                          fontWeight: 700
                        }}
                      >
                        Xem và xác nhận
                      </Button>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {confirmedOrders.map((ord) => (
                  <div
                    key={ord.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '14px 18px',
                      border: '1px solid #e2e8f0',
                      borderRadius: 10,
                      backgroundColor: '#ffffff'
                    }}
                  >
                    <div>
                      <strong>{ord.orderCode}</strong> · {ord.routeLabel} · Xe: <strong>{ord.vehiclePlate || '51C-123.45'}</strong>
                      <div style={{ fontSize: 12, color: '#059669', marginTop: 2 }}>
                        ✓ Đã chốt trạm nghỉ: {ord.restStopName || 'Trạm dừng chân Xuân Lộc (Km 65)'}
                      </div>
                    </div>
                    <Tag color="green">ĐÃ CHỐT XE & LỘ TRÌNH</Tag>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      ) : (
        /* DETAIL SECTIONS VIEW (3 sections matching WDP.odt) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <button
            type="button"
            onClick={() => setSelectedOrder(null)}
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
            <ArrowLeft size={16} /> Quay lại danh sách điều phối
          </button>

          {/* Section 1: Xe chuyên dụng của đơn */}
          <Card
            title={
              <Space>
                <Truck size={18} color="#ea580c" />
                <span style={{ fontSize: 16, fontWeight: 800 }}>1. Xe chuyên dụng của đơn</span>
              </Space>
            }
            extra={
              <Button
                onClick={() => setVehicleModalOpen(true)}
                style={{ fontWeight: 600, borderColor: '#ea580c', color: '#ea580c' }}
              >
                Đổi xe khác
              </Button>
            }
            style={{ borderRadius: 14 }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#fff7ed',
                border: '1.5px solid #fed7aa',
                borderRadius: 10,
                padding: '16px 20px'
              }}
            >
              <div>
                <Tag color="green" style={{ fontWeight: 700, marginBottom: 4 }}>
                  {selectedVehicle.statusLabel}
                </Tag>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                  Biển số: {selectedVehicle.plateNumber}
                </h3>
                <div style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>
                  {selectedVehicle.name} · Sức chứa: <strong>{selectedVehicle.capacityHorses} ngựa</strong>
                </div>
              </div>

              <div style={{ textAlign: 'right', fontSize: 12, color: '#64748b' }}>
                <div>✓ Kiểm định an toàn còn hạn</div>
                <div>✓ Camera giám sát hồng ngoại online</div>
              </div>
            </div>
          </Card>

          {/* Section 2: Bản đồ lộ trình & Trạm dừng nghỉ */}
          <Card
            title={
              <Space>
                <MapPin size={18} color="#ea580c" />
                <span style={{ fontSize: 16, fontWeight: 800 }}>2. Bản đồ lộ trình & Trạm dừng nghỉ</span>
              </Space>
            }
            extra={
              <Space>
                <Button
                  onClick={() => message.info('Đã áp dụng lộ trình chuẩn dưới 4 giờ cho động vật sống.')}
                  style={{ borderRadius: 6, fontSize: 12 }}
                >
                  Gợi ý chuẩn ≤ 4h
                </Button>
                <Button
                  onClick={() => setRestStopModalOpen(true)}
                  style={{ fontWeight: 600, borderColor: '#ea580c', color: '#ea580c' }}
                >
                  Chọn trạm trên bản đồ
                </Button>
              </Space>
            }
            style={{ borderRadius: 14 }}
          >
            {/* Visual Route Simulation Frame */}
            <div
              style={{
                height: 180,
                backgroundColor: '#f1f5f9',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                padding: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-around',
                position: 'relative'
              }}
            >
              <div style={{ textAlign: 'center', zIndex: 2 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: '#059669', color: '#fff', display: 'grid', placeItems: 'center', margin: '0 auto 6px' }}>
                  A
                </div>
                <strong>Điểm đón (Thủ Đức, TP.HCM)</strong>
                <div style={{ fontSize: 11, color: '#64748b' }}>Km 0</div>
              </div>

              <div style={{ height: 2, flex: 1, backgroundColor: '#ea580c', margin: '0 16px', position: 'relative' }}>
                <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
                  <Tag color="orange" style={{ fontWeight: 700 }}>{selectedRestStop.name}</Tag>
                </div>
              </div>

              <div style={{ textAlign: 'center', zIndex: 2 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: '#ea580c', color: '#fff', display: 'grid', placeItems: 'center', margin: '0 auto 6px' }}>
                  B
                </div>
                <strong>Điểm giao (Long Thành, Đồng Nai)</strong>
                <div style={{ fontSize: 11, color: '#64748b' }}>Km 72</div>
              </div>
            </div>

            <div style={{ marginTop: 14, fontSize: 13, color: '#475569' }}>
              Trạm dừng nghỉ đã chọn: <strong>{selectedRestStop.name}</strong> — {selectedRestStop.facility}
            </div>
          </Card>

          {/* Section 3: Lịch trình từng chặng */}
          <Card
            title={
              <Space>
                <Clock size={18} color="#ea580c" />
                <span style={{ fontSize: 16, fontWeight: 800 }}>3. Lịch trình từng chặng</span>
              </Space>
            }
            style={{ borderRadius: 14 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                <strong style={{ color: '#ea580c', minWidth: 60 }}>06:00</strong>
                <div>
                  <strong>Chặng 1: Xuất phát tại Trang trại Thủ Đức, TP.HCM</strong>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Lên xe, ổn định tâm lý ngựa, kiểm tra vòng khóa chốt khoang VIP</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                <strong style={{ color: '#ea580c', minWidth: 60 }}>08:30</strong>
                <div>
                  <strong>Chặng 2: Nghỉ ngơi & tiếp nước tại {selectedRestStop.name}</strong>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Bổ sung cỏ khô Timothy, đo thân nhiệt và thông gió hạ nhiệt khoang xe</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                <strong style={{ color: '#ea580c', minWidth: 60 }}>11:00</strong>
                <div>
                  <strong>Chặng 3: Bàn giao an toàn tại Trại ngựa Long Thành, Đồng Nai</strong>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Kiểm tra nhận dạng vi chip lần cuối, ký biên bản bàn giao điện tử</div>
                </div>
              </div>
            </div>

            <Divider style={{ margin: '20px 0' }} />

            <Button
              type="primary"
              size="large"
              onClick={handleConfirmFleetAndRoute}
              style={{
                height: 46,
                padding: '0 32px',
                fontSize: 15,
                fontWeight: 700,
                borderRadius: 8,
                backgroundColor: '#7c3aed',
                borderColor: '#7c3aed'
              }}
            >
              ✓ Xác nhận xe và lộ trình cho BK-005
            </Button>
          </Card>
        </div>
      )}

      {/* POPUP MODAL: CHỌN XE (Cards with Locked/Maintenance/Ready status) */}
      <Modal
        centered
        width={620}
        title="Chọn xe chuyên dụng"
        open={vehicleModalOpen}
        onCancel={() => setVehicleModalOpen(false)}
        footer={null}
        className="animate-modal-pop"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
          {VEHICLES_LIST.map((veh) => {
            const isSelected = selectedVehicle.id === veh.id;

            return (
              <div
                key={veh.id}
                onClick={() => {
                  if (veh.disabled) return;
                  setSelectedVehicle(veh);
                  setVehicleModalOpen(false);
                  message.success(`Đã chọn xe ${veh.plateNumber}`);
                }}
                style={{
                  border: isSelected ? '2px solid #ea580c' : '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '16px 20px',
                  backgroundColor: veh.disabled ? '#f1f5f9' : isSelected ? '#fff7ed' : '#ffffff',
                  cursor: veh.disabled ? 'not-allowed' : 'pointer',
                  opacity: veh.disabled ? 0.65 : 1,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong style={{ fontSize: 16, color: '#0f172a' }}>{veh.plateNumber}</strong>
                    <Tag color={veh.disabled ? 'default' : 'green'}>{veh.statusLabel}</Tag>
                  </div>
                  <div style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>
                    {veh.name} · Sức chứa: {veh.capacityHorses} ngựa
                  </div>
                  {veh.reason && (
                    <div style={{ fontSize: 12, color: '#dc2626', marginTop: 2 }}>{veh.reason}</div>
                  )}
                </div>

                {isSelected && !veh.disabled && (
                  <Tag color="orange" style={{ fontWeight: 700 }}>
                    ĐANG CHỌN
                  </Tag>
                )}
              </div>
            );
          })}
        </div>
      </Modal>

      {/* POPUP MODAL: CHỌN TRẠM DỪNG NGHỈ */}
      <Modal
        centered
        width={600}
        title="Chọn trạm dừng chân trên bản đồ lộ trình"
        open={restStopModalOpen}
        onCancel={() => setRestStopModalOpen(false)}
        footer={null}
        className="animate-modal-pop"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
          {REST_STOPS_LIST.map((stop) => {
            const isSelected = selectedRestStop.id === stop.id;

            return (
              <div
                key={stop.id}
                onClick={() => {
                  setSelectedRestStop(stop);
                  setRestStopModalOpen(false);
                  message.success(`Đã chọn trạm dừng ${stop.name}`);
                }}
                style={{
                  border: isSelected ? '2px solid #ea580c' : '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '14px 18px',
                  backgroundColor: isSelected ? '#fff7ed' : '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <strong style={{ fontSize: 15, color: '#0f172a' }}>{stop.name}</strong>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>{stop.facility}</div>
                </div>
                <Tag color={isSelected ? 'orange' : 'default'}>{isSelected ? 'Đang chọn' : 'Khả dụng'}</Tag>
              </div>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}
