import React, { useMemo, useState, useEffect } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  message
} from 'antd';
import {
  AlertCircle,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  CreditCard,
  FileCheck,
  FileText,
  Filter,
  Globe,
  Inbox,
  Info,
  MapPin,
  Package,
  PackageCheck,
  Play,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Truck,
  User,
  UserCheck,
  Users,
  XCircle
} from 'lucide-react';
import { useManagerData } from '../../context/ManagerDataContext';
import { orderApi } from '../../services/orderApi';
import OrderReviewModal from '../Backoffice/OrderReviewModal';
import usePlanning from '../Backoffice/usePlanning';
import './manager-dashboard.css';

const formatVnd = (value) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(value || 0);

const formatDate = (d) => {
  if (!d) return 'Chưa xác định';
  try {
    return new Date(d).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return String(d);
  }
};

export default function ManagerDashboard() {
  const { data, loading: contextLoading, refreshData } = useManagerData();
  const {data:planningData,load:loadPlanning}=usePlanning();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeModalTab, setActiveModalTab] = useState('overview');
  const [processingAction, setProcessingAction] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Classify orders by the actual approval, payment and assignment gates.
  const allOrders = useMemo(() => (data?.orders || []).map(o => {
    const flowStep = ['CANCELLED','REJECTED','COMPLETED'].includes(o.status)?0:['IN_TRANSIT','DELIVERING'].includes(o.status)||o.preparation?.assignedAt?6:o.status==='PENDING_APPROVAL'?(o.depositStatus==='PAID'?1:4):o.paymentStatus!=='PAID'?2:o.preparation?.confirmedAt?3:5;
    return {...o,id:o._id,orderCode:o.bookingCode,customerName:o.customerId?.fullName || 'Chưa cập nhật',customerEmail:o.customerId?.email || '',customerPhone:o.customerId?.phone || '',origin:o.origin?.address || '',destination:o.destination?.address || '',routeLabel:`${o.origin?.address || ''} → ${o.destination?.address || ''}`,departureDate:formatDate(o.requestedDepartureDate),horses:(o.horseIds||[]).map(h=>h.name),totalAmountVnd:o.pricing?.totalAmountVnd,flowStep,isRealDb:true};
  }), [data?.orders]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    if (!searchTerm.trim()) return allOrders;
    const term = searchTerm.toLowerCase();
    return allOrders.filter(
      (o) =>
        (o.orderCode && o.orderCode.toLowerCase().includes(term)) ||
        (o.customerName && o.customerName.toLowerCase().includes(term)) ||
        (o.origin && o.origin.toLowerCase().includes(term)) ||
        (o.destination && o.destination.toLowerCase().includes(term))
    );
  }, [allOrders, searchTerm]);

  // Group by 5 Kanban status columns matching Screenshot 1
  const kanbanColumns = useMemo(() => {
    const sequence=['DEPOSIT_PENDING','PENDING_APPROVAL','DOCS_PROCESSING','CLEARED_FOR_TRANSPORT','PRICE_REVIEW','ASSIGNED'];
    return [
      {
        id: 'PENDING_APPROVAL',
        title: 'Chờ duyệt đơn',
        icon: Inbox,
        color: '#0284c7',
        orders: filteredOrders.filter(
          (o) => o.flowStep === 1
        )
      },
      {
        id: 'DOCS_PROCESSING',
        title: 'Chờ trả phần còn lại',
        icon: Search,
        color: '#059669',
        orders: filteredOrders.filter(
          (o) => o.flowStep === 2
        )
      },
      {
        id: 'PRICE_REVIEW',
        title: 'Chờ phân công kíp xe',
        icon: FileText,
        color: '#d97706',
        orders: filteredOrders.filter(
          (o) => o.flowStep === 3
        )
      },
      {
        id: 'DEPOSIT_PENDING',
        title: 'Chờ đặt cọc',
        icon: CreditCard,
        color: '#ea580c',
        orders: filteredOrders.filter(
          (o) => o.flowStep === 4
        )
      },
      {
        id: 'CLEARED_FOR_TRANSPORT',
        title: 'Chờ điều phối xe',
        icon: Truck,
        color: '#16a34a',
        orders: filteredOrders.filter(
          (o) => o.flowStep === 5
        )
      },
      {id:'ASSIGNED',title:'Đã phân công / đang chạy',icon:Truck,color:'#16a34a',orders:filteredOrders.filter(o=>o.flowStep===6)}
    ].sort((a,b)=>sequence.indexOf(a.id)-sequence.indexOf(b.id));
  }, [filteredOrders]);

  // Calendar strip days (7 days centered on today)
  const calendarDays = useMemo(() => {
    const today = new Date();
    const days = [];
    const dayNames = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const isToday = i === 0;
      const dayName = `${dayNames[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}`;
      days.push({
        date: d,
        label: dayName,
        isToday,
        tripsCount: isToday ? 0 : 0
      });
    }
    return days;
  }, []);

  return (
    <div className="mgr-dashboard-container">
      {/* Page Title & Refresh */}
      <div className="mgr-page-title-row">
        <div>
          <h1 className="mgr-page-title">Tổng quan</h1>
        </div>
        <Space>
          <Button
            icon={<RotateCcw size={14} />}
            onClick={() => {
              if (refreshData) refreshData();
              message.success('Đã làm mới dữ liệu điều hành.');
            }}
          >
            Làm mới
          </Button>
        </Space>
      </div>

      {/* Widget 1: 7-Day Calendar Strip matching Screenshot 1 */}
      <div className="mgr-calendar-strip-card">
        <div className="mgr-calendar-header">
          <div className="mgr-calendar-title">
            <CalendarDays size={18} color="#ea580c" />
            <span>Lịch khởi hành</span>
          </div>

          <Space>
            <Button.Group size="small">
              <Button icon={<ChevronLeft size={14} />} />
              <Button style={{ fontWeight: 600 }}>Hôm nay</Button>
              <Button icon={<ChevronRight size={14} />} />
            </Button.Group>
            <Button size="small" icon={<Calendar size={13} />} style={{ fontSize: 12 }}>
              Xem lịch tháng, năm
            </Button>
          </Space>
        </div>

        <div className="mgr-calendar-days-grid">
          {calendarDays.map((day, idx) => (
            <div
              key={idx}
              className={`mgr-day-cell ${day.isToday ? 'mgr-day-cell--today' : ''}`}
            >
              <div className="mgr-day-name">{day.label}</div>
              <div className="mgr-day-status">
                {day.tripsCount > 0 ? `${day.tripsCount} chuyến` : 'Không có chuyến'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Widget 2: Kanban Board ("Tất cả đơn") matching Screenshot 1 */}
      <div className="mgr-board-header">
        <h2 className="mgr-board-title">Tất cả đơn</h2>
        <Input
          prefix={<Search size={15} color="#94a3b8" />}
          placeholder="Tìm theo mã đơn, khách hàng, tuyến..."
          className="mgr-board-search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          allowClear
        />
      </div>

      <Spin spinning={contextLoading} tip="Đang đồng bộ dữ liệu điều phối...">
        <div className="mgr-kanban-row">
          {kanbanColumns.map((col) => {
            const Icon = col.icon;
            return (
              <div key={col.id} className="mgr-kanban-col">
                <div className="mgr-col-header">
                  <div className="mgr-col-title-wrap">
                    <Icon size={16} color={col.color} />
                    <span>{col.title}</span>
                  </div>
                  <span
                    className={`mgr-col-badge ${col.orders.length > 0 ? 'mgr-col-badge--active' : ''}`}
                  >
                    {col.orders.length}
                  </span>
                </div>

                <div style={{ flex: 1 }}>
                  {col.orders.length === 0 ? (
                    <div className="mgr-card-empty-slot">Không có đơn</div>
                  ) : (
                    col.orders.map((order) => {
                      const isDomestic = !order.routeLabel?.includes('Quốc tế');
                      const progressPct =
                        order.flowStep ? Math.round((({1:3,2:4,3:6,4:2,5:5,6:['IN_TRANSIT','DELIVERING'].includes(order.status)?7:6}[order.flowStep]) / 8) * 100) : order.status === 'PENDING_APPROVAL' ? 0 : 25;

                      return (
                        <div
                          key={order.id || order._id}
                          className="mgr-order-card"
                          onClick={() => {
                            setSelectedOrder(order);
                            setActiveModalTab('overview');
                          }}
                        >
                          <div className="mgr-card-top-row">
                            <span className="mgr-card-code">
                              {order.orderCode || order.bookingCode}
                            </span>
                            <span className="mgr-card-tag">{order.flowStep===1?'Cần duyệt':order.flowStep===3?'Chọn kíp xe':order.flowStep===4?'Chờ cọc':order.flowStep===2?'Chờ thanh toán':order.flowStep===5?'Chờ điều phối':'Đã phân công'}</span>
                          </div>

                          <div className="mgr-card-meta">
                            <Calendar size={12} />
                            <span>
                              {order.departureDate || 'Chưa có lịch'} ·{' '}
                              <strong>{isDomestic ? 'Trong nước' : 'Quốc tế'}</strong>
                            </span>
                          </div>

                          <div className="mgr-card-route">
                            {order.routeLabel || `${order.origin} → ${order.destination}`}
                          </div>

                          <div>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: 11,
                                color: '#64748b',
                                marginBottom: 4
                              }}
                            >
                              <span>Tiến độ: {progressPct}%</span>
                            </div>
                            <div className="mgr-card-progress-bar">
                              <div
                                className="mgr-card-progress-fill"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>

                          <div className="mgr-card-bottom-row">
                            <span>{order.status === 'PENDING_APPROVAL' ? 'Chưa giao' : 'Đang xử lý'}</span>
                            <div className="mgr-card-bottom-icons">
                              <span>🐴 {order.horses?.length || 1}</span>
                              <span>🚛 {order.vehiclePlate ? 1 : 0}</span>
                            </div>
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
      </Spin>

      {selectedOrder && planningData.orders.find(o=>String(o._id)===String(selectedOrder.id)) && <OrderReviewModal order={planningData.orders.find(o=>String(o._id)===String(selectedOrder.id))} data={planningData} mode={selectedOrder.flowStep===3||selectedOrder.flowStep===6?'quote':'intake'} onClose={()=>setSelectedOrder(null)} onSaved={async()=>{await Promise.all([loadPlanning(),refreshData()]);}} />}
    </div>
  );
}
