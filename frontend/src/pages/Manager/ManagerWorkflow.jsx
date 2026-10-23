import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Divider,
  Input,
  Modal,
  Space,
  Spin,
  Tabs,
  Tag,
  message
} from 'antd';
import {
  Shield,
  CheckCircle2,
  Clock,
  ArrowRight,
  Truck,
  Users,
  Search,
  FileCheck2,
  Calendar,
  AlertCircle,
  Eye,
  UserCheck,
  CreditCard,
  DollarSign
} from 'lucide-react';
import { useOrderStore } from '../../store/useOrderStore';
import { useAuthStore } from '../../store/useAuthStore';
import {
  wdpDemoService,
  DRIVERS_LIST,
  ESCORTS_LIST
} from '../../services/wdpDemoService';

const formatVnd = (value) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value || 0);

export default function ManagerWorkflow() {
  const navigate = useNavigate();
  const { orders, fetchOrders } = useOrderStore();
  const { user } = useAuthStore();

  const [query, setQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [approvalModalOrder, setApprovalModalOrder] = useState(null);

  // Driver & Escort selection for quotation approval
  const [selectedDriver, setSelectedDriver] = useState(DRIVERS_LIST[0]);
  const [selectedEscort, setSelectedEscort] = useState(ESCORTS_LIST[0]);
  const [driverPickerOpen, setDriverPickerOpen] = useState(false);
  const [escortPickerOpen, setEscortPickerOpen] = useState(false);

  useEffect(() => {
    fetchOrders().catch(() => {});
  }, [fetchOrders]);

  const allOrders = orders.length > 0 ? orders : wdpDemoService.getOrders();

  // Kanban lanes definition matching WDP.odt
  const lanes = [
    {
      id: 'LANE_PENDING',
      title: 'Chờ tiếp nhận',
      description: 'Đơn mới tạo từ khách hàng',
      filter: (o) => o.status === 'PENDING_APPROVAL',
      color: '#ea580c'
    },
    {
      id: 'LANE_REVIEWING',
      title: 'Đang thẩm định',
      description: 'Kiểm dịch đối chiếu hồ sơ ngựa',
      filter: (o) => o.status === 'DOCS_PROCESSING' || o.status === 'DOCS_VERIFIED',
      color: '#0284c7'
    },
    {
      id: 'LANE_QUOTE',
      title: 'Chờ duyệt giá',
      description: 'Điều phối & chốt báo giá',
      filter: (o) => o.status === 'PRICE_REVIEW',
      color: '#7c3aed'
    },
    {
      id: 'LANE_DEPOSIT',
      title: 'Chờ đặt cọc',
      description: 'Khách hàng thanh toán 30%',
      filter: (o) => o.status === 'PENDING_DEPOSIT' || (o.depositRequired && o.depositStatus === 'UNPAID' && o.status !== 'PENDING_APPROVAL'),
      color: '#d97706'
    },
    {
      id: 'LANE_PREPARING',
      title: 'Chuẩn bị chuyến',
      description: 'Đã cọc · Chuẩn bị xe & tài xế',
      filter: (o) => o.status === 'APPROVED' && o.depositStatus === 'PAID',
      color: '#059669'
    }
  ];

  // Week schedule strip
  const weekDays = [
    { day: 'Thứ Hai', date: '20/10', count: 3 },
    { day: 'Thứ Ba', date: '21/10', count: 5 },
    { day: 'Thứ Tư', date: '22/10', count: 4 },
    { day: 'Thứ Năm', date: '23/10', count: 6, isToday: true },
    { day: 'Thứ Sáu', date: '24/10', count: 8 },
    { day: 'Thứ Bảy', date: '25/10', count: 7 },
    { day: 'Chủ Nhật', date: '26/10', count: 2 }
  ];

  // Action: Manager receives BK-005
  const handleManagerReceive = () => {
    wdpDemoService.managerReceiveBK005();
    message.success('Đã tiếp nhận đơn BK-005 và kích hoạt phân công thẩm định hồ sơ cho Chuyên viên kiểm dịch!');
    setSelectedOrder(null);
    fetchOrders().catch(() => {});
  };

  // Action: Manager approves quotation for BK-005
  const handleApproveQuotation = () => {
    wdpDemoService.managerApproveQuotationBK005({
      driverName: `${selectedDriver.code} ${selectedDriver.fullName} (${selectedDriver.phone})`,
      escortName: `${selectedEscort.code} ${selectedEscort.fullName} (${selectedEscort.phone})`
    });
    message.success('Đã duyệt và gửi báo giá BK-005 cho khách hàng đặt cọc 30%!');
    setApprovalModalOrder(null);
    fetchOrders().catch(() => {});
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
            <span style={{ fontSize: 12, fontWeight: 700, color: '#ea580c', textTransform: 'uppercase' }}>
              Quản lý logistics
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#0f172a' }}>
            Điều hành vận chuyển & Duyệt báo giá
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
            Theo dõi tiến độ Kanban, tiếp nhận đơn mới, phân bổ chuyên viên và phê duyệt kíp xe - báo giá.
          </p>
        </div>

        <Space>
          <Button onClick={() => fetchOrders().catch(() => {})}>Làm mới</Button>
          <Button
            type="primary"
            onClick={() => {
              const bk005 = allOrders.find((o) => o.orderCode === 'BK-005');
              setApprovalModalOrder(bk005 || allOrders[0]);
            }}
            style={{ backgroundColor: '#ea580c', borderColor: '#ea580c', fontWeight: 600 }}
          >
            Duyệt báo giá BK-005
          </Button>
        </Space>
      </div>

      {/* Week Schedule Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 10,
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '12px 14px'
        }}
      >
        {weekDays.map((w) => (
          <div
            key={w.date}
            style={{
              padding: '10px 8px',
              borderRadius: 8,
              textAlign: 'center',
              backgroundColor: w.isToday ? '#fff7ed' : '#f8fafc',
              border: w.isToday ? '1.5px solid #ea580c' : '1px solid #e2e8f0',
              cursor: 'pointer'
            }}
          >
            <div style={{ fontSize: 12, color: w.isToday ? '#ea580c' : '#64748b', fontWeight: w.isToday ? 700 : 500 }}>
              {w.day}
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
              {w.date}
            </div>
            <div style={{ fontSize: 11, color: w.isToday ? '#c2410c' : '#94a3b8', fontWeight: 600 }}>
              {w.count} chuyến
            </div>
          </div>
        ))}
      </div>

      {/* Search Input */}
      <div style={{ maxWidth: 420 }}>
        <Input
          prefix={<Search size={15} color="#94a3b8" />}
          placeholder="Tìm đơn hàng, khách hàng hoặc tuyến đường..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          allowClear
          style={{ borderRadius: 8, height: 40 }}
        />
      </div>

      {/* Kanban Board */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(260px, 1fr))',
          gap: 16,
          overflowX: 'auto',
          paddingBottom: 16
        }}
      >
        {lanes.map((lane) => {
          const laneOrders = allOrders
            .filter(lane.filter)
            .filter((o) =>
              query.trim()
                ? `${o.orderCode} ${o.customerName} ${o.routeLabel}`.toLowerCase().includes(query.toLowerCase())
                : true
            );

          return (
            <div
              key={lane.id}
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                minHeight: 460
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: 10,
                  borderBottom: '1px solid #e2e8f0'
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                    {lane.title}
                  </h3>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{lane.description}</div>
                </div>
                <Tag color={lane.color} style={{ fontWeight: 700, borderRadius: 12 }}>
                  {laneOrders.length}
                </Tag>
              </div>

              {/* Cards inside Lane */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                {laneOrders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8', fontSize: 12 }}>
                    Chưa có đơn
                  </div>
                ) : (
                  laneOrders.map((ord) => {
                    const isBK005 = ord.orderCode === 'BK-005';

                    return (
                      <div
                        key={ord.id || ord.orderCode}
                        onClick={() => setSelectedOrder(ord)}
                        style={{
                          backgroundColor: '#ffffff',
                          border: isBK005 ? '2px solid #ea580c' : '1px solid #e2e8f0',
                          borderRadius: 10,
                          padding: '14px',
                          cursor: 'pointer',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#ea580c';
                          e.currentTarget.style.boxShadow = '0 4px 14px rgba(234, 88, 12, 0.08)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = isBK005 ? '#ea580c' : '#e2e8f0';
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <strong style={{ fontSize: 14, color: '#0f172a' }}>{ord.orderCode}</strong>
                          <span style={{ fontSize: 11, color: '#64748b' }}>{ord.departureTime}</span>
                        </div>

                        <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                          {ord.customerName}
                        </div>

                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                          {ord.routeLabel}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                          <Tag color="orange" style={{ fontSize: 10, borderRadius: 4 }}>
                            {Array.isArray(ord.horses) ? ord.horses.join(', ') : ord.horses}
                          </Tag>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#ea580c' }}>
                            {ord.pricing?.totalAmountVnd ? formatVnd(ord.pricing.totalAmountVnd) : 'Chờ giá'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: CHI TIẾT & TIẾP NHẬN ĐƠN (4 TABS) */}
      <Modal
        centered
        width={780}
        open={Boolean(selectedOrder)}
        onCancel={() => setSelectedOrder(null)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
              Đơn vận chuyển · {selectedOrder?.orderCode}
            </span>
            <Tag color="orange">{selectedOrder?.routeLabel}</Tag>
          </div>
        }
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '10px 0 4px' }}>
            <Button onClick={() => setSelectedOrder(null)}>Đóng</Button>
            {selectedOrder?.status === 'PENDING_APPROVAL' && (
              <Button
                type="primary"
                onClick={handleManagerReceive}
                style={{ backgroundColor: '#ea580c', borderColor: '#ea580c', fontWeight: 700 }}
              >
                Tiếp nhận và kích hoạt thẩm định
              </Button>
            )}
            {selectedOrder?.status === 'PRICE_REVIEW' && (
              <Button
                type="primary"
                onClick={() => {
                  setApprovalModalOrder(selectedOrder);
                  setSelectedOrder(null);
                }}
                style={{ backgroundColor: '#ea580c', borderColor: '#ea580c', fontWeight: 700 }}
              >
                Mở cửa sổ duyệt báo giá
              </Button>
            )}
          </div>
        }
        className="animate-modal-pop"
      >
        {selectedOrder && (
          <Tabs
            defaultActiveKey="customer"
            tabPosition="left"
            style={{ minHeight: 320, marginTop: 12 }}
            items={[
              {
                key: 'customer',
                label: 'Khách hàng',
                children: (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingLeft: 12 }}>
                    <div>
                      <span style={{ color: '#64748b', fontSize: 12 }}>HỌ TÊN KHÁCH HÀNG</span>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                        {selectedOrder.customerName || 'Tran Le Anh Quan'}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: 12 }}>SỐ ĐIỆN THOẠI</span>
                      <div style={{ fontSize: 14, color: '#0f172a' }}>
                        {selectedOrder.customerPhone || '0901234567'}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: 12 }}>EMAIL XÁC NHẬN</span>
                      <div style={{ fontSize: 14, color: '#0f172a' }}>
                        {selectedOrder.customerEmail || 'anhquan@gmail.com'}
                      </div>
                    </div>
                  </div>
                )
              },
              {
                key: 'horses',
                label: 'Hồ sơ ngựa',
                children: (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingLeft: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 8, background: '#fed7aa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                        🏇
                      </div>
                      <div>
                        <strong style={{ fontSize: 16, color: '#0f172a' }}>
                          {Array.isArray(selectedOrder.horses) ? selectedOrder.horses.join(', ') : selectedOrder.horses}
                        </strong>
                        <div style={{ fontSize: 12, color: '#64748b' }}>
                          Mã chip: 985141005544332 · Hộ chiếu FEI: VN-982367
                        </div>
                      </div>
                    </div>
                    <Tag color="blue">CẦN CHUYÊN VIÊN KIỂM DỊCH ĐỐI CHIẾU HỒ SƠ GỐC</Tag>
                  </div>
                )
              },
              {
                key: 'trip',
                label: 'Thông tin đơn',
                children: (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingLeft: 12 }}>
                    <div>
                      <span style={{ color: '#64748b', fontSize: 12 }}>LỘ TRÌNH VẬN CHUYỂN</span>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>
                        {selectedOrder.origin} → {selectedOrder.destination}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: 12 }}>THỜI GIAN KHỞI HÀNH</span>
                      <div style={{ fontSize: 14 }}>
                        {selectedOrder.departureTime} ngày {selectedOrder.departureDate}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: 12 }}>LƯU Ý CHĂM SÓC</span>
                      <div style={{ fontSize: 13, color: '#475569' }}>
                        {selectedOrder.specialRequirements || 'Duy trì nhiệt độ khoang 22-24°C, bổ sung nước điện giải.'}
                      </div>
                    </div>
                  </div>
                )
              },
              {
                key: 'dispatch',
                label: 'Giao việc',
                children: (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingLeft: 12 }}>
                    <div style={{ padding: 12, border: '1px solid #e2e8f0', borderRadius: 8, backgroundColor: '#f8fafc' }}>
                      <strong style={{ fontSize: 14, color: '#0f172a' }}>1. Thẩm định kiểm dịch:</strong>
                      <div style={{ fontSize: 13, color: '#0284c7', fontWeight: 600, marginTop: 4 }}>
                        Phân công: SP-01 specialist01@gmail.com
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>Kiểm tra Hộ chiếu FEI, Sổ tiêm chủng, Giấy xét nghiệm EIA.</div>
                    </div>

                    <div style={{ padding: 12, border: '1px solid #e2e8f0', borderRadius: 8, backgroundColor: '#f8fafc' }}>
                      <strong style={{ fontSize: 14, color: '#0f172a' }}>2. Bố trí xe & lộ trình:</strong>
                      <div style={{ fontSize: 13, color: '#7c3aed', fontWeight: 600, marginTop: 4 }}>
                        Phân công: CO-01 coordinator01@gmail.com
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>Khảo sát trạm dừng chân, chốt xe thùng đệm khí nén.</div>
                    </div>
                  </div>
                )
              }
            ]}
          />
        )}
      </Modal>

      {/* MODAL: DUYỆT BÁO GIÁ & KÍP XE (FLOW 1 PHẦN 2) */}
      <Modal
        centered
        width={760}
        open={Boolean(approvalModalOrder)}
        onCancel={() => setApprovalModalOrder(null)}
        title={
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
            Duyệt báo giá & Phân công kíp xe · {approvalModalOrder?.orderCode || 'BK-005'}
          </div>
        }
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '10px 0 4px' }}>
            <Button onClick={() => setApprovalModalOrder(null)}>Đóng</Button>
            <Button
              type="primary"
              onClick={handleApproveQuotation}
              style={{ backgroundColor: '#ea580c', borderColor: '#ea580c', fontWeight: 700 }}
            >
              Duyệt và gửi báo giá cho khách
            </Button>
          </div>
        }
        className="animate-modal-pop"
      >
        <Tabs
          defaultActiveKey="personnel"
          items={[
            {
              key: 'personnel',
              label: '1. Tài xế, hộ tống',
              children: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
                  {/* Driver Card */}
                  <div
                    style={{
                      border: '1.5px solid #fed7aa',
                      borderRadius: 12,
                      padding: '16px 20px',
                      backgroundColor: '#fff7ed',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#ea580c', textTransform: 'uppercase' }}>
                        Tài xế chuyên dụng phụ trách
                      </div>
                      <strong style={{ fontSize: 16, color: '#0f172a' }}>
                        {selectedDriver.code} · {selectedDriver.fullName}
                      </strong>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        SĐT: {selectedDriver.phone} · Đánh giá: {selectedDriver.rating} · {selectedDriver.note}
                      </div>
                    </div>

                    <Button
                      onClick={() => setDriverPickerOpen(true)}
                      style={{ borderRadius: 6, fontWeight: 600, borderColor: '#ea580c', color: '#ea580c' }}
                    >
                      Đổi tài xế
                    </Button>
                  </div>

                  {/* Escort Card */}
                  <div
                    style={{
                      border: '1.5px solid #fed7aa',
                      borderRadius: 12,
                      padding: '16px 20px',
                      backgroundColor: '#fff7ed',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#ea580c', textTransform: 'uppercase' }}>
                        Chuyên viên hộ tống thú y
                      </div>
                      <strong style={{ fontSize: 16, color: '#0f172a' }}>
                        {selectedEscort.code} · {selectedEscort.fullName}
                      </strong>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        SĐT: {selectedEscort.phone} · Chứng chỉ: {selectedEscort.cert} · {selectedEscort.note}
                      </div>
                    </div>

                    <Button
                      onClick={() => setEscortPickerOpen(true)}
                      style={{ borderRadius: 6, fontWeight: 600, borderColor: '#ea580c', color: '#ea580c' }}
                    >
                      Đổi hộ tống
                    </Button>
                  </div>

                  {/* Assigned Vehicle */}
                  <div style={{ padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 8, backgroundColor: '#f8fafc' }}>
                    <span style={{ color: '#64748b', fontSize: 12 }}>PHƯƠNG TIỆN ĐÃ ĐƯỢC ĐIỀU PHỐI: </span>
                    <strong style={{ color: '#0f172a' }}>51C-123.45 (Xe chuyên dụng TransEquine 4 khoang VIP)</strong>
                  </div>
                </div>
              )
            },
            {
              key: 'quotation',
              label: '2. Báo giá (26.076.000 đ)',
              children: (
                <div style={{ maxWidth: 640, paddingTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                    <span style={{ color: '#64748b' }}>Cước vận chuyển cơ bản TP.HCM → Đồng Nai:</span>
                    <strong>{formatVnd(20000000)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                    <span style={{ color: '#64748b' }}>Khoang mở rộng VIP:</span>
                    <strong>{formatVnd(3000000)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                    <span style={{ color: '#64748b' }}>Dinh dưỡng & nước điện giải cao cấp:</span>
                    <strong>{formatVnd(1500000)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                    <span style={{ color: '#64748b' }}>Thuế GTGT & phí cao tốc:</span>
                    <strong>{formatVnd(1576000)}</strong>
                  </div>

                  <Divider style={{ margin: '14px 0' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16 }}>
                    <strong>Tổng giá trị đơn hàng:</strong>
                    <strong style={{ fontSize: 20, color: '#ea580c' }}>{formatVnd(26076000)}</strong>
                  </div>

                  <div
                    style={{
                      marginTop: 14,
                      backgroundColor: '#fff7ed',
                      border: '1px solid #fed7aa',
                      borderRadius: 8,
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span style={{ color: '#c2410c', fontWeight: 600 }}>Tiền cọc yêu cầu (30%):</span>
                    <strong style={{ color: '#ea580c', fontSize: 18 }}>{formatVnd(7823000)}</strong>
                  </div>
                </div>
              )
            }
          ]}
        />
      </Modal>

      {/* POPUP MODAL: ĐỔI TÀI XẾ */}
      <Modal
        centered
        title="Chọn tài xế chuyên dụng"
        open={driverPickerOpen}
        onCancel={() => setDriverPickerOpen(false)}
        footer={null}
        width={560}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
          {DRIVERS_LIST.map((drv) => {
            const isSelected = selectedDriver.id === drv.id;
            return (
              <div
                key={drv.id}
                onClick={() => {
                  setSelectedDriver(drv);
                  setDriverPickerOpen(false);
                  message.success(`Đã chọn tài xế ${drv.fullName}`);
                }}
                style={{
                  border: isSelected ? '2px solid #ea580c' : '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '14px 16px',
                  backgroundColor: isSelected ? '#fff7ed' : '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <strong style={{ fontSize: 15, color: '#0f172a' }}>{drv.code} · {drv.fullName}</strong>
                  <div style={{ fontSize: 12, color: '#64748b' }}>SĐT: {drv.phone} · {drv.note}</div>
                </div>
                <Tag color={isSelected ? 'orange' : 'default'}>{isSelected ? 'Đang chọn' : 'Khả dụng'}</Tag>
              </div>
            );
          })}
        </div>
      </Modal>

      {/* POPUP MODAL: ĐỔI HỘ TỐNG */}
      <Modal
        centered
        title="Chọn chuyên viên hộ tống thú y"
        open={escortPickerOpen}
        onCancel={() => setEscortPickerOpen(false)}
        footer={null}
        width={560}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
          {ESCORTS_LIST.map((esc) => {
            const isSelected = selectedEscort.id === esc.id;
            return (
              <div
                key={esc.id}
                onClick={() => {
                  setSelectedEscort(esc);
                  setEscortPickerOpen(false);
                  message.success(`Đã chọn chuyên viên ${esc.fullName}`);
                }}
                style={{
                  border: isSelected ? '2px solid #ea580c' : '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '14px 16px',
                  backgroundColor: isSelected ? '#fff7ed' : '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <strong style={{ fontSize: 15, color: '#0f172a' }}>{esc.code} · {esc.fullName}</strong>
                  <div style={{ fontSize: 12, color: '#64748b' }}>SĐT: {esc.phone} · {esc.cert}</div>
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
