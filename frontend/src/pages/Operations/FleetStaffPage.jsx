import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Card, Space, Table, Tag } from 'antd';
import { operationsApi } from '../../services/operationsApi';
import { routeApi } from '../../services/routeApi';

export default function FleetStaffPage() {
  const [staff, setStaff] = useState([]); const [routes, setRoutes] = useState([]); const [error, setError] = useState('');
  useEffect(() => { Promise.all([operationsApi.getOperationalStaff(), routeApi.getRoutes()]).then(([people, trips]) => { setStaff(people.data.data); setRoutes(trips.data.data); }).catch((err) => setError(err.response?.data?.message || 'Không thể tải nhân sự.')); }, []);
  const assigned = useMemo(() => new Map(routes.filter((route) => ['SCHEDULED', 'IN_TRANSIT', 'INCIDENT_HANDLING', 'DELIVERING'].includes(route.status)).flatMap((route) => [[String(route.driverId?._id || route.driverId), route], [String(route.escortId?._id || route.escortId), route]])), [routes]);
  return <Space direction="vertical" size={20} style={{ width: '100%' }}><Card title="Nhân sự vận hành"><p>Danh sách tài xế và phụ xe để điều phối. Việc tạo tài khoản và khóa tài khoản thuộc Quản lý logistics.</p></Card>{error && <Alert type="error" message={error} />}<Table rowKey="_id" dataSource={staff} columns={[{ title: 'Họ tên', dataIndex: 'fullName', render: (value, item) => <><strong>{value}</strong><div>{item.username}</div></> }, { title: 'Vai trò', dataIndex: 'role', render: (value) => value === 'DRIVER' ? 'Tài xế' : 'Phụ xe' }, { title: 'Liên hệ', render: (_, item) => <>{item.phone}<div>{item.email}</div></> }, { title: 'Tài khoản', dataIndex: 'isActive', render: (value) => <Tag color={value ? 'green' : 'red'}>{value ? 'Hoạt động' : 'Đã khóa'}</Tag> }, { title: 'Phân công', render: (_, item) => { const route = assigned.get(String(item._id)); return route ? <Tag color="blue">{route.orderId?.bookingCode || 'Đang có chuyến'}</Tag> : <Tag>Sẵn sàng</Tag>; } }]} /></Space>;
}
