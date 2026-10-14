import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Input, Select, Table } from 'antd';
import { operationsApi } from '../../services/operationsApi';
import { routeApi } from '../../services/routeApi';
import { DataPanel, Metrics, StatusPill, Workspace } from '../../components/operations/OperationsUI';

const normalize = (value) => String(value || '').toLocaleLowerCase('vi-VN');
export default function FleetStaffPage() {
  const [staff, setStaff] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [availability, setAvailability] = useState('ALL');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [people, trips] = await Promise.all([operationsApi.getOperationalStaff(), routeApi.getRoutes()]);
      setStaff(people.data.data); setRoutes(trips.data.data);
    } catch (err) { setError(err.response?.data?.message || 'Không thể tải nhân sự.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const assigned = useMemo(() => new Map(routes.filter((route) => ['SCHEDULED', 'IN_TRANSIT', 'INCIDENT_HANDLING', 'DELIVERING'].includes(route.status)).flatMap((route) => [[String(route.driverId?._id || route.driverId), route], [String(route.escortId?._id || route.escortId), route]])), [routes]);
  const filtered = staff.filter((person) => {
    const route = assigned.get(String(person._id));
    const text = [person.fullName, person.username, person.phone, person.email, route?.orderId?.bookingCode].join(' ');
    return normalize(text).includes(normalize(query.trim())) && (role === 'ALL' || person.role === role)
      && (status === 'ALL' || (status === 'ACTIVE' ? person.isActive : !person.isActive))
      && (availability === 'ALL' || (availability === 'ASSIGNED' ? !!route : person.isActive && !route));
  });
  return <Workspace eyebrow="Điều phối vận tải" title="Nhân sự vận hành" description="Tra cứu tài xế, phụ xe và tình trạng phân công để bố trí tổ vận chuyển." actions={<Button loading={loading} onClick={load}>Làm mới</Button>}>
    <Metrics items={[
      { label: 'Tổng nhân sự', value: staff.length, detail: 'Tài xế và phụ xe trong hệ thống' },
      { label: 'Tài xế sẵn sàng', value: staff.filter((person) => person.role === 'DRIVER' && person.isActive && !assigned.has(String(person._id))).length, detail: 'Tài khoản hoạt động, chưa có chuyến' },
      { label: 'Phụ xe sẵn sàng', value: staff.filter((person) => person.role === 'ESCORT' && person.isActive && !assigned.has(String(person._id))).length, detail: 'Tài khoản hoạt động, chưa có chuyến' },
      { label: 'Đã phân công', value: staff.filter((person) => assigned.has(String(person._id))).length, detail: 'Chuyến đã xếp lịch hoặc đang thực hiện' },
    ]} />
    <Alert type="info" message="Điều phối viên chỉ tra cứu nhân sự. Việc tạo tài khoản và khóa tài khoản thuộc Quản lý logistics." />
    {error && <Alert type="error" message={error} />}
    <DataPanel title="Danh sách nhân sự" description="Tìm theo tên, thông tin liên hệ hoặc mã đơn đang phụ trách." extra={`${filtered.length} / ${staff.length} nhân sự`}>
      <div className="ops-toolbar">
        <Input aria-label="Tìm nhân sự vận hành" placeholder="Tên, tài khoản, liên hệ hoặc mã đơn" value={query} onChange={(event) => setQuery(event.target.value)} style={{ width: 320, maxWidth: '100%' }} />
        <Select aria-label="Lọc vai trò nhân sự" value={role} onChange={setRole} style={{ width: 160 }} options={[{ value: 'ALL', label: 'Tất cả vai trò' }, { value: 'DRIVER', label: 'Tài xế' }, { value: 'ESCORT', label: 'Phụ xe' }]} />
        <Select aria-label="Lọc trạng thái tài khoản" value={status} onChange={setStatus} style={{ width: 190 }} options={[{ value: 'ALL', label: 'Tất cả tài khoản' }, { value: 'ACTIVE', label: 'Hoạt động' }, { value: 'INACTIVE', label: 'Đã khóa' }]} />
        <Select aria-label="Lọc phân công nhân sự" value={availability} onChange={setAvailability} style={{ width: 190 }} options={[{ value: 'ALL', label: 'Tất cả phân công' }, { value: 'AVAILABLE', label: 'Sẵn sàng' }, { value: 'ASSIGNED', label: 'Đang có chuyến' }]} />
        <Button onClick={() => { setQuery(''); setRole('ALL'); setStatus('ALL'); setAvailability('ALL'); }}>Xóa bộ lọc</Button>
      </div>
      <Table loading={loading} rowKey="_id" dataSource={filtered} scroll={{ x: 900 }} locale={{ emptyText: error ? 'Chưa tải được danh sách nhân sự.' : 'Không có nhân sự phù hợp.' }} columns={[
        { title: 'Họ tên', dataIndex: 'fullName', width: 210, render: (value, item) => <><strong>{value}</strong><div className="ops-secondary">{item.username || '—'}</div></> },
        { title: 'Vai trò', dataIndex: 'role', width: 120, render: (value) => value === 'DRIVER' ? 'Tài xế' : 'Phụ xe' },
        { title: 'Liên hệ', width: 260, render: (_, item) => <><div>{item.phone || 'Chưa có số điện thoại'}</div><div className="ops-secondary">{item.email || 'Chưa có email'}</div></> },
        { title: 'Tài khoản', dataIndex: 'isActive', width: 150, render: (value) => <StatusPill value={value ? 'ACTIVE' : 'INACTIVE'} label={value ? 'Hoạt động' : 'Đã khóa'} /> },
        { title: 'Phân công', width: 180, render: (_, item) => { const route = assigned.get(String(item._id)); return route ? <><StatusPill value={route.status} label={route.orderId?.bookingCode || 'Đang có chuyến'} /><div className="ops-secondary">{route.status === 'SCHEDULED' ? 'Đã xếp lịch' : 'Đang thực hiện'}</div></> : <StatusPill value={item.isActive ? 'AVAILABLE' : 'INACTIVE'} label={item.isActive ? 'Sẵn sàng' : 'Không sẵn sàng'} />; } },
      ]} />
    </DataPanel>
  </Workspace>;
}
