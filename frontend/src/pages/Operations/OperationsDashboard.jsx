import React, { useEffect, useState } from 'react';
import { Alert, Card, Col, Row, Space, Spin, Statistic, Table, Tag } from 'antd';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { horseApi } from '../../services/horseApi';
import { orderApi } from '../../services/orderApi';
import { routeApi } from '../../services/routeApi';
import { operationsApi } from '../../services/operationsApi';

const dataOf = (result) => result?.data?.data || [];

export default function OperationsDashboard() {
  const role = useAuthStore((state) => state.user?.role);
  const specialist = role === 'TRANSPORT_SPECIALIST';
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const requests = specialist
      ? [horseApi.getHorses(), operationsApi.getComplianceDocuments(), orderApi.getOrders()]
      : [routeApi.getRoutes(), operationsApi.getVehicles(), operationsApi.getOperationalStaff(), orderApi.getOrders()];
    Promise.all(requests).then((responses) => active && setData(responses.map(dataOf))).catch((err) => active && setError(err.response?.data?.message || 'Không thể tải dữ liệu tổng quan.'));
    return () => { active = false; };
  }, [specialist]);
  if (error) return <Alert type="error" showIcon message={error} />;
  if (!data) return <Spin />;

  if (specialist) {
    const [horses, documents, orders] = data;
    const pendingHorses = horses.filter((item) => item.reviewStatus === 'PENDING_REVIEW');
    const pendingDocs = documents.filter((item) => item.status === 'PENDING_REVIEW');
    return <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <header className="page-header"><div><span className="eyebrow">Thủ tục & kiểm dịch</span><h1>Bàn làm việc chuyên viên</h1><p>Ưu tiên hồ sơ ngựa và giấy tờ đang chờ xác minh.</p></div></header>
      <Row gutter={[16, 16]}><Col xs={24} md={8}><Card><Statistic title="Hồ sơ ngựa chờ duyệt" value={pendingHorses.length} /></Card></Col><Col xs={24} md={8}><Card><Statistic title="Giấy tờ chờ thẩm định" value={pendingDocs.length} /></Card></Col><Col xs={24} md={8}><Card><Statistic title="Đơn đang xử lý giấy tờ" value={orders.filter((item) => item.status === 'DOCS_PROCESSING').length} /></Card></Col></Row>
      <Card title="Hồ sơ cần xử lý" extra={<Link to="/specialist/horses">Mở hàng đợi</Link>}><Table size="small" pagination={false} rowKey="_id" dataSource={pendingHorses.slice(0, 6)} columns={[{ title: 'Ngựa', dataIndex: 'name' }, { title: 'Microchip', dataIndex: 'microchipId' }, { title: 'Địa điểm', dataIndex: 'currentStopId' }, { title: '', render: (_, item) => <Link to={`/horses/${item._id}`}>Kiểm duyệt</Link> }]} /></Card>
      <Card title="Giấy tờ kiểm dịch chờ thẩm định" extra={<Link to="/specialist/compliance">Xem tất cả</Link>}><Table size="small" pagination={false} rowKey="_id" dataSource={pendingDocs.slice(0, 6)} columns={[{ title: 'Đơn', render: (_, item) => item.orderId?.bookingCode }, { title: 'Ngựa', render: (_, item) => item.horseId?.name }, { title: 'Loại giấy tờ', dataIndex: 'documentType' }, { title: 'Quốc gia', dataIndex: 'countryCode' }]} /></Card>
    </Space>;
  }

  const [routes, vehicles, staff, orders] = data;
  const assignedOrderIds = new Set(routes.map((item) => String(item.orderId?._id || item.orderId)));
  const waiting = orders.filter((order) => ['APPROVED', 'DOCS_PROCESSING', 'CLEARED_FOR_TRANSPORT'].includes(order.status) && !assignedOrderIds.has(String(order._id)));
  return <Space direction="vertical" size={20} style={{ width: '100%' }}>
    <header className="page-header"><div><span className="eyebrow">Đội xe & lộ trình</span><h1>Trung tâm điều phối</h1><p>Quản lý lịch, phương tiện, nhân sự và chuyến vận chuyển từ dữ liệu thực.</p></div></header>
    <Row gutter={[16, 16]}><Col xs={24} md={6}><Card><Statistic title="Đơn chờ phân công" value={waiting.length} /></Card></Col><Col xs={24} md={6}><Card><Statistic title="Chuyến đang chạy" value={routes.filter((item) => ['IN_TRANSIT', 'INCIDENT_HANDLING', 'DELIVERING'].includes(item.status)).length} /></Card></Col><Col xs={24} md={6}><Card><Statistic title="Xe hoạt động" value={vehicles.filter((item) => item.status === 'ACTIVE').length} /></Card></Col><Col xs={24} md={6}><Card><Statistic title="Tài xế & phụ xe" value={staff.filter((item) => item.isActive).length} /></Card></Col></Row>
    {waiting.length > 0 && <Alert type="warning" showIcon message={`${waiting.length} đơn đã đủ điều kiện nhưng chưa có xe và nhân sự.`} action={<Link to="/fleet/trips">Phân công ngay</Link>} />}
    <Card title="Chuyến gần nhất" extra={<Link to="/fleet/trips">Quản lý chuyến</Link>}><Table size="small" pagination={false} rowKey="_id" dataSource={routes.slice(0, 8)} columns={[{ title: 'Đơn', render: (_, item) => item.orderId?.bookingCode }, { title: 'Lộ trình', render: (_, item) => `${item.orderId?.origin?.address || '—'} → ${item.orderId?.destination?.address || '—'}` }, { title: 'Xe', render: (_, item) => item.vehiclePlateNumber || <Tag>Chưa phân công</Tag> }, { title: 'Trạng thái', dataIndex: 'status', render: (value) => <Tag color="blue">{value}</Tag> }]} /></Card>
  </Space>;
}
