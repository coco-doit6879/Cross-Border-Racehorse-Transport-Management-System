import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Form, Input, Modal, Select, Table, message } from 'antd';
import { DataPanel, Metrics, StatusPill, Workspace } from '../../components/operations/OperationsUI';
import { orderApi } from '../../services/orderApi';
import { routeApi } from '../../services/routeApi';
import { operationsApi } from '../../services/operationsApi';
import { Link } from 'react-router-dom';

const normalize = (value) => String(value || '').toLocaleLowerCase('vi-VN');
const allowed = ['APPROVED', 'DOCS_PROCESSING', 'CLEARED_FOR_TRANSPORT'];
const statusLabels = { PENDING_APPROVAL: 'Chờ duyệt', APPROVED: 'Đã duyệt đơn', DOCS_PROCESSING: 'Đang xử lý giấy tờ', CLEARED_FOR_TRANSPORT: 'Đủ điều kiện', SCHEDULED: 'Đã phân công', IN_TRANSIT: 'Đang chạy', INCIDENT_HANDLING: 'Có sự cố', DELIVERING: 'Đang bàn giao', COMPLETED: 'Hoàn thành', CANCELLED: 'Đã hủy' };

export default function FleetTripsPage() {
  const [orders, setOrders] = useState([]); const [routes, setRoutes] = useState([]); const [vehicles, setVehicles] = useState([]); const [staff, setStaff] = useState([]); const [loading, setLoading] = useState(true); const [selected, setSelected] = useState(null); const [form] = Form.useForm();
  const [error, setError] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { const [o, r, v, s] = await Promise.all([orderApi.getOrders(), routeApi.getRoutes(), operationsApi.getVehicles(), operationsApi.getOperationalStaff()]); setOrders(o.data.data); setRoutes(r.data.data); setVehicles(v.data.data); setStaff(s.data.data); } catch (err) { setError(err.response?.data?.message || 'Không thể tải dữ liệu điều phối.'); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  const routeByOrder = useMemo(() => new Map(routes.map((route) => [String(route.orderId?._id || route.orderId), route])), [routes]);
  const rows = orders.filter((order) => allowed.includes(order.status) || routeByOrder.has(String(order._id))).map((order) => ({ ...order, route: routeByOrder.get(String(order._id)) }));
  const open = (row) => { setSelected(row); const route = row.route; form.setFieldsValue({ vehicleId: route?.vehicleId?._id || route?.vehicleId, driverId: route?.driverId?._id || route?.driverId, escortId: route?.escortId?._id || route?.escortId, assignmentNote: route?.assignmentNote || '', reason: '' }); };
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [payment, setPayment] = useState('ALL');
  const filtered = rows.filter((row) => normalize([row.bookingCode, row.origin?.address, row.destination?.address, row.route?.vehiclePlateNumber, row.route?.driverId?.fullName, ...(row.horseIds || []).map((horse) => horse.name)].join(' ')).includes(normalize(query.trim())) && (status === 'ALL' || (row.route?.status || row.status) === status) && (payment === 'ALL' || (payment === 'PAID' ? row.paymentStatus === 'PAID' : row.paymentStatus !== 'PAID')));
  const save = async (values) => {
    if (saving || !selected) return;
    if (selected.paymentStatus !== 'PAID' || (selected.route && selected.route.status !== 'SCHEDULED')) {
      message.error('Chỉ phân công đơn đã thanh toán đủ; chỉ đổi phân công trước khi khởi hành.');
      return;
    }
    setSaving(true);
    try {
      if (selected.route) await routeApi.updateAssignment(selected.route._id, values);
      else await routeApi.dispatch({ orderId: selected._id, ...values });
      message.success(selected.route ? 'Đã cập nhật phân công.' : 'Đã tạo chuyến và phân công.');
      setSelected(null); form.resetFields(); await load();
    } catch (err) { message.error(err.response?.data?.message || 'Không thể lưu phân công.'); }
    finally { setSaving(false); }
  };
  const drivers = staff.filter((item) => item.role === 'DRIVER' && item.isActive); const escorts = staff.filter((item) => item.role === 'ESCORT' && item.isActive);
  return <Workspace eyebrow="Điều phối vận tải" title="Phân công chuyến" description="Theo dõi thanh toán và bố trí phương tiện, tài xế, phụ xe." actions={<Button loading={loading} onClick={load}>Làm mới</Button>}>
    {error && <Alert type="error" message={error} action={<Button onClick={load}>Thử lại</Button>} />}
    <Metrics items={[
      { label: 'Tổng đơn theo dõi', value: rows.length, detail: 'Đơn chờ điều phối và đơn đã có chuyến' },
      { label: 'Chờ phân công', value: rows.filter((row) => !row.route && row.paymentStatus === 'PAID').length, detail: 'Đã thanh toán đủ, chưa tạo vận đơn' },
      { label: 'Chưa thanh toán đủ', value: rows.filter((row) => row.paymentStatus !== 'PAID').length, detail: 'Chưa thể phân công, kể cả đã đặt cọc' },
      { label: 'Đang vận chuyển', value: rows.filter((row) => ['IN_TRANSIT', 'INCIDENT_HANDLING', 'DELIVERING'].includes(row.route?.status)).length, detail: 'Bao gồm xử lý sự cố và bàn giao' },
    ]} />
    <Alert type="info" message="Chỉ đơn đã thanh toán đủ mới được phân công xe, tài xế và phụ xe. Đặt cọc không đủ điều kiện phân công. Biển số không xuất hiện trước thời điểm phân công." />
    <DataPanel title="Danh sách điều phối" description="Tra cứu đơn hàng, hành trình và tình trạng phân công." extra={`${filtered.length} / ${rows.length} đơn`}>
      <div className="ops-toolbar">
        <Input aria-label="Tìm đơn điều phối" placeholder="Mã đơn, hành trình, ngựa, biển số hoặc tài xế" value={query} onChange={(event) => setQuery(event.target.value)} style={{ width: 360, maxWidth: '100%' }} />
        <Select aria-label="Lọc trạng thái chuyến" value={status} onChange={setStatus} style={{ width: 210 }} options={[{ value: 'ALL', label: 'Tất cả trạng thái' }, ...Object.entries(statusLabels).map(([value, label]) => ({ value, label }))]} />
        <Select aria-label="Lọc thanh toán" value={payment} onChange={setPayment} style={{ width: 210 }} options={[{ value: 'ALL', label: 'Tất cả thanh toán' }, { value: 'PAID', label: 'Đã thanh toán đủ' }, { value: 'UNPAID', label: 'Chưa thanh toán đủ' }]} />
        <Button onClick={() => { setQuery(''); setStatus('ALL'); setPayment('ALL'); }}>Xóa bộ lọc</Button>
      </div>
      <Table loading={loading} rowKey="_id" dataSource={filtered} scroll={{ x: 1450 }} locale={{ emptyText: 'Không có đơn điều phối phù hợp.' }} columns={[
    { title: 'Đơn / Vận đơn', render: (_, row) => <><Link to={`/orders/${row._id}`}>{row.bookingCode}</Link><div className="ops-secondary">{row.route?.acceptedAt ? 'Tài xế đã tiếp nhận' : row.route ? 'Chờ tài xế nhận' : 'Chưa tạo vận đơn'}</div><div className="ops-secondary">{row.requestedDepartureDate ? new Date(row.requestedDepartureDate).toLocaleString('vi-VN') : 'Chưa có ngày khởi hành'}</div></> }, { title: 'Hành trình', render: (_, row) => `${row.origin?.address} → ${row.destination?.address}` }, { title: 'Ngựa', render: (_, row) => row.horseIds?.map(h => h.name).join(', ') || '—' },
    { title: 'Xe', render: (_, row) => row.route?.vehiclePlateNumber || <span className="ops-secondary">Chưa phân công</span> }, { title: 'Tài xế', render: (_, row) => row.route?.driverId?.fullName || <span className="ops-secondary">Chưa phân công</span> },
    { title: 'Thanh toán', render: (_, row) => <StatusPill value={row.paymentStatus === 'PAID' ? 'PAID' : 'PENDING'} label={row.paymentStatus === 'PAID' ? 'Đã thanh toán đủ' : 'Chưa thanh toán đủ'} /> },
    { title: 'Trạng thái', render: (_, row) => <StatusPill value={row.route?.status || row.status} label={statusLabels[row.route?.status || row.status] || row.route?.status || row.status} /> },
    { title: 'Thao tác', render: (_, row) => <Button type={row.route ? 'default' : 'primary'} disabled={row.paymentStatus !== 'PAID' || (row.route && row.route.status !== 'SCHEDULED')} title={row.paymentStatus !== 'PAID' ? 'Khách hàng chưa thanh toán đủ' : undefined} onClick={() => open(row)}>{row.route ? 'Đổi phân công' : 'Phân công'}</Button> }
  ]} />
  </DataPanel>
  <Modal open={!!selected} title={`${selected?.route ? 'Đổi phân công' : 'Phân công'} · ${selected?.bookingCode || ''}`} onCancel={() => { if (!saving) setSelected(null); }} onOk={() => form.submit()} confirmLoading={saving} cancelButtonProps={{ disabled: saving }} closable={!saving} maskClosable={!saving} keyboard={!saving} okText="Lưu phân công"><Form form={form} layout="vertical" onFinish={save} disabled={saving}>
    <Form.Item name="vehicleId" label="Phương tiện" rules={[{ required: true }]}><Select aria-label="Phương tiện" showSearch optionFilterProp="label" options={vehicles.filter((item) => item.status === 'ACTIVE').map((item) => ({ value: item._id, label: `${item.plateNumber} · ${item.name} · ${item.capacityHorses} ngựa` }))} /></Form.Item>
    <Form.Item name="driverId" label="Tài xế" rules={[{ required: true }]}><Select aria-label="Tài xế" showSearch optionFilterProp="label" options={drivers.map((item) => ({ value: item._id, label: `${item.fullName} · ${item.phone}` }))} /></Form.Item><Form.Item name="escortId" label="Phụ xe" rules={[{ required: true }]}><Select aria-label="Phụ xe" showSearch optionFilterProp="label" options={escorts.map((item) => ({ value: item._id, label: `${item.fullName} · ${item.phone}` }))} /></Form.Item>
    {selected?.route && <Form.Item name="reason" label="Lý do thay đổi" rules={[{ required: true }]}><Input.TextArea rows={2} /></Form.Item>}<Form.Item name="assignmentNote" label="Ghi chú cho tổ vận chuyển"><Input.TextArea rows={3} /></Form.Item>
  </Form></Modal></Workspace>;
}
