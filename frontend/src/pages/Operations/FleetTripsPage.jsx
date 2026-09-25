import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Form, Input, Modal, Select, Space, Table, Tag, message } from 'antd';
import { orderApi } from '../../services/orderApi';
import { routeApi } from '../../services/routeApi';
import { operationsApi } from '../../services/operationsApi';

const allowed = ['APPROVED', 'DOCS_PROCESSING', 'CLEARED_FOR_TRANSPORT'];
const statusLabels = { PENDING_APPROVAL: 'Chờ duyệt', APPROVED: 'Đã duyệt đơn', DOCS_PROCESSING: 'Đang xử lý giấy tờ', CLEARED_FOR_TRANSPORT: 'Đủ điều kiện', SCHEDULED: 'Đã phân công', IN_TRANSIT: 'Đang chạy', INCIDENT_HANDLING: 'Có sự cố', DELIVERING: 'Đang bàn giao', COMPLETED: 'Hoàn thành', CANCELLED: 'Đã hủy' };

export default function FleetTripsPage() {
  const [orders, setOrders] = useState([]); const [routes, setRoutes] = useState([]); const [vehicles, setVehicles] = useState([]); const [staff, setStaff] = useState([]); const [loading, setLoading] = useState(true); const [selected, setSelected] = useState(null); const [form] = Form.useForm();
  const load = useCallback(async () => { setLoading(true); try { const [o, r, v, s] = await Promise.all([orderApi.getOrders(), routeApi.getRoutes(), operationsApi.getVehicles(), operationsApi.getOperationalStaff()]); setOrders(o.data.data); setRoutes(r.data.data); setVehicles(v.data.data); setStaff(s.data.data); } catch (err) { message.error(err.response?.data?.message || 'Không thể tải dữ liệu điều phối.'); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  const routeByOrder = useMemo(() => new Map(routes.map((route) => [String(route.orderId?._id || route.orderId), route])), [routes]);
  const rows = orders.filter((order) => allowed.includes(order.status) || routeByOrder.has(String(order._id))).map((order) => ({ ...order, route: routeByOrder.get(String(order._id)) }));
  const open = (row) => { setSelected(row); const route = row.route; form.setFieldsValue({ vehicleId: route?.vehicleId?._id || route?.vehicleId, driverId: route?.driverId?._id || route?.driverId, escortId: route?.escortId?._id || route?.escortId, assignmentNote: route?.assignmentNote || '', reason: '' }); };
  const save = async (values) => { try { if (selected.route) await routeApi.updateAssignment(selected.route._id, values); else await routeApi.dispatch({ orderId: selected._id, ...values }); message.success(selected.route ? 'Đã cập nhật phân công.' : 'Đã tạo chuyến và phân công.'); setSelected(null); form.resetFields(); load(); } catch (err) { message.error(err.response?.data?.message || 'Không thể lưu phân công.'); } };
  const drivers = staff.filter((item) => item.role === 'DRIVER' && item.isActive); const escorts = staff.filter((item) => item.role === 'ESCORT' && item.isActive);
  return <Space direction="vertical" size={20} style={{ width: '100%' }}><Card title="Phân công chuyến vận chuyển"><Alert type="info" showIcon message="Chỉ đơn đã thanh toán đủ mới được phân công xe, tài xế và phụ xe. Biển số không xuất hiện trước thời điểm này." /></Card><Table loading={loading} rowKey="_id" dataSource={rows} columns={[
    { title: 'Đơn', render: (_, row) => <><strong>{row.bookingCode}</strong><div>{new Date(row.requestedDepartureDate).toLocaleString('vi-VN')}</div></> }, { title: 'Hành trình', render: (_, row) => `${row.origin?.address} → ${row.destination?.address}` }, { title: 'Ngựa', render: (_, row) => row.horseIds?.length || 0 },
    { title: 'Xe', render: (_, row) => row.route?.vehiclePlateNumber || <Tag>Chưa phân công</Tag> }, { title: 'Tài xế', render: (_, row) => row.route?.driverId?.fullName || <Tag>Chưa phân công</Tag> },
    { title: 'Thanh toán', render: (_, row) => <Tag color={row.paymentStatus === 'PAID' ? 'green' : 'orange'}>{row.paymentStatus === 'PAID' ? 'Đã thanh toán đủ' : 'Chưa thanh toán đủ'}</Tag> },
    { title: 'Trạng thái', render: (_, row) => <Tag color={row.route ? 'blue' : row.status === 'CLEARED_FOR_TRANSPORT' ? 'green' : 'orange'}>{statusLabels[row.route?.status || row.status]}</Tag> },
    { title: '', render: (_, row) => <Button type={row.route ? 'default' : 'primary'} disabled={row.paymentStatus !== 'PAID' || (row.route && row.route.status !== 'SCHEDULED')} title={row.paymentStatus !== 'PAID' ? 'Khách hàng chưa thanh toán đủ' : undefined} onClick={() => open(row)}>{row.route ? 'Đổi phân công' : 'Phân công'}</Button> }
  ]} />
  <Modal open={!!selected} title={`${selected?.route ? 'Đổi phân công' : 'Phân công'} · ${selected?.bookingCode || ''}`} onCancel={() => setSelected(null)} onOk={() => form.submit()} okText="Lưu phân công"><Form form={form} layout="vertical" onFinish={save}>
    <Form.Item name="vehicleId" label="Phương tiện" rules={[{ required: true }]}><Select options={vehicles.filter((item) => item.status === 'ACTIVE').map((item) => ({ value: item._id, label: `${item.plateNumber} · ${item.name} · ${item.capacityHorses} ngựa` }))} /></Form.Item>
    <Form.Item name="driverId" label="Tài xế" rules={[{ required: true }]}><Select options={drivers.map((item) => ({ value: item._id, label: `${item.fullName} · ${item.phone}` }))} /></Form.Item><Form.Item name="escortId" label="Phụ xe" rules={[{ required: true }]}><Select options={escorts.map((item) => ({ value: item._id, label: `${item.fullName} · ${item.phone}` }))} /></Form.Item>
    {selected?.route && <Form.Item name="reason" label="Lý do thay đổi" rules={[{ required: true }]}><Input.TextArea rows={2} /></Form.Item>}<Form.Item name="assignmentNote" label="Ghi chú cho tổ vận chuyển"><Input.TextArea rows={3} /></Form.Item>
  </Form></Modal></Space>;
}
