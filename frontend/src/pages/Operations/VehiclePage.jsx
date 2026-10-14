import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Form, Input, InputNumber, Modal, Select, Table, message } from 'antd';
import { operationsApi } from '../../services/operationsApi';
import { DataPanel, Metrics, StatusPill, Workspace } from '../../components/operations/OperationsUI';

const statusLabels = { ACTIVE: 'Hoạt động', MAINTENANCE: 'Bảo dưỡng', INACTIVE: 'Ngừng hoạt động' };
const normalize = (value) => String(value || '').toLocaleLowerCase('vi-VN');
const expired = (value) => value && new Date(value).getTime() < Date.now();
export default function VehiclePage() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [availability, setAvailability] = useState('ALL');
  const [form] = Form.useForm();
  const load = useCallback(async () => {
    setLoading(true);
    try { const response = await operationsApi.getVehicles(); setVehicles(response.data.data); }
    catch (err) { message.error(err.response?.data?.message || 'Không thể tải phương tiện.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const show = (vehicle) => {
    setEditing(vehicle || null);
    form.resetFields();
    form.setFieldsValue(vehicle ? { ...vehicle, registrationExpiresAt: vehicle.registrationExpiresAt?.slice(0, 10), inspectionExpiresAt: vehicle.inspectionExpiresAt?.slice(0, 10) } : { status: 'ACTIVE', countryCode: 'VN', capacityHorses: 2 });
    setOpen(true);
  };
  const save = async (values) => {
    if (saving) return;
    setSaving(true);
    try {
      if (editing) await operationsApi.updateVehicle(editing._id, values);
      else await operationsApi.createVehicle(values);
      message.success('Đã lưu phương tiện.'); setOpen(false); form.resetFields(); await load();
    } catch (err) { message.error(err.response?.data?.message || 'Không thể lưu phương tiện.'); }
    finally { setSaving(false); }
  };
  const filtered = vehicles.filter((vehicle) => {
    const text = [vehicle.plateNumber, vehicle.name, vehicle.countryCode, ...(vehicle.assignments || []).map((route) => route.orderId?.bookingCode)].join(' ');
    return normalize(text).includes(normalize(query.trim())) && (status === 'ALL' || vehicle.status === status)
      && (availability === 'ALL' || (availability === 'ASSIGNED' ? !!vehicle.activeAssignment : vehicle.status === 'ACTIVE' && !vehicle.activeAssignment));
  });
  return <Workspace eyebrow="Điều phối vận tải" title="Đội xe" description="Quản lý phương tiện, sức chứa và tình trạng sẵn sàng vận chuyển." actions={<Button type="primary" onClick={() => show(null)}>Thêm phương tiện</Button>}>
    <Metrics items={[
      { label: 'Tổng phương tiện', value: vehicles.length, detail: 'Toàn bộ đội xe trong hệ thống' },
      { label: 'Chưa phân công', value: vehicles.filter((vehicle) => vehicle.status === 'ACTIVE' && !vehicle.activeAssignment).length, detail: 'Đang hoạt động, chưa có chuyến' },
      { label: 'Đang vận chuyển', value: vehicles.filter((vehicle) => vehicle.assignments?.some((route) => ['IN_TRANSIT', 'INCIDENT_HANDLING', 'DELIVERING'].includes(route.status))).length, detail: 'Bao gồm xử lý sự cố và bàn giao' },
      { label: 'Bảo dưỡng', value: vehicles.filter((vehicle) => vehicle.status === 'MAINTENANCE').length, detail: 'Cần kiểm tra trước khi bố trí chuyến' },
    ]} />
    <Alert type="info" message="Biển số chỉ xuất hiện trên đơn và dashboard sau khi phương tiện được phân công cho chuyến." />
    <DataPanel title="Danh sách phương tiện" description="Tra cứu xe và kiểm tra hạn đăng kiểm trước khi điều phối." extra={`${filtered.length} / ${vehicles.length} xe`}>
      <div className="ops-toolbar">
        <Input aria-label="Tìm phương tiện" placeholder="Biển số, tên xe, quốc gia hoặc mã đơn" value={query} onChange={(event) => setQuery(event.target.value)} style={{ width: 340, maxWidth: '100%' }} />
        <Select aria-label="Lọc trạng thái phương tiện" value={status} onChange={setStatus} style={{ width: 210 }} options={[{ value: 'ALL', label: 'Tất cả trạng thái' }, ...Object.entries(statusLabels).map(([value, label]) => ({ value, label }))]} />
        <Select aria-label="Lọc phân công phương tiện" value={availability} onChange={setAvailability} style={{ width: 210 }} options={[{ value: 'ALL', label: 'Tất cả phân công' }, { value: 'AVAILABLE', label: 'Chưa phân công' }, { value: 'ASSIGNED', label: 'Đang có chuyến' }]} />
        <Button onClick={() => { setQuery(''); setStatus('ALL'); setAvailability('ALL'); }}>Xóa bộ lọc</Button>
        <Button loading={loading} onClick={load}>Làm mới</Button>
      </div>
      <Table loading={loading} rowKey="_id" dataSource={filtered} scroll={{ x: 1200 }} locale={{ emptyText: 'Không có phương tiện phù hợp.' }} columns={[
        { title: 'Biển số', dataIndex: 'plateNumber', width: 140, render: (value) => <strong>{value}</strong> },
        { title: 'Tên xe', dataIndex: 'name', width: 170 },
        { title: 'Sức chứa', dataIndex: 'capacityHorses', width: 110, render: (value) => `${value} ngựa` },
        { title: 'Quốc gia', dataIndex: 'countryCode', width: 100 },
        { title: 'Đăng kiểm', dataIndex: 'inspectionExpiresAt', width: 150, render: (value) => value ? <><div>{new Date(value).toLocaleDateString('vi-VN')}</div>{expired(value) && <StatusPill value="EXPIRED" label="Đã hết hạn" />}</> : <span className="ops-secondary">Chưa cập nhật</span> },
        { title: 'Trạng thái', width: 180, render: (_, item) => <><StatusPill value={item.status} label={statusLabels[item.status] || item.status} />{item.activeAssignment && <div className="ops-secondary">Đang có chuyến</div>}</> },
        { title: 'Ngựa trên xe / dự kiến', width: 300, render: (_, item) => item.assignments?.length ? item.assignments.map((route) => <div key={route._id}><strong>{route.orderId?.bookingCode || 'Chuyến vận chuyển'}</strong><div className="ops-secondary">{route.orderId?.horseIds?.map((horse) => { const movement = route.horseMovements?.find((entry) => String(entry.horseId) === String(horse._id)); return `${horse.name} (${movement?.unloadedAt ? 'đã giao' : movement?.loadedAt ? 'trên xe' : 'dự kiến'})`; }).join(', ') || 'Chưa có thông tin ngựa'}</div></div>) : <span className="ops-secondary">Chưa có chuyến</span> },
        { title: 'Thao tác', width: 120, render: (_, item) => <Button onClick={() => show(item)}>Chỉnh sửa</Button> },
      ]} />
    </DataPanel>
    <Modal open={open} title={editing ? 'Cập nhật phương tiện' : 'Thêm phương tiện'} onCancel={() => { if (!saving) setOpen(false); }} onOk={() => form.submit()} confirmLoading={saving} cancelButtonProps={{ disabled: saving }} closable={!saving} maskClosable={!saving} keyboard={!saving} okText="Lưu">
      <Form form={form} layout="vertical" onFinish={save} disabled={saving}>
        <Form.Item name="plateNumber" label="Biển số" rules={[{ required: true }]}><Input aria-label="Biển số" /></Form.Item>
        <Form.Item name="name" label="Tên/loại xe" rules={[{ required: true }]}><Input aria-label="Tên hoặc loại xe" /></Form.Item>
        <Form.Item name="capacityHorses" label="Sức chứa ngựa" rules={[{ required: true, type: 'number', min: 1, max: 12 }]}><InputNumber aria-label="Sức chứa ngựa" min={1} max={12} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="countryCode" label="Quốc gia đăng ký" rules={[{ required: true }]}><Select aria-label="Quốc gia đăng ký" options={['VN', 'TH', 'KH', 'SG'].map((value) => ({ value }))} /></Form.Item>
        <Form.Item name="registrationExpiresAt" label="Hạn đăng ký" rules={[{ required: true }]}><Input aria-label="Hạn đăng ký" type="date" /></Form.Item>
        <Form.Item name="inspectionExpiresAt" label="Hạn đăng kiểm" rules={[{ required: true }]}><Input aria-label="Hạn đăng kiểm" type="date" /></Form.Item>
        <Form.Item name="status" label="Trạng thái" rules={[{ required: true }]}><Select aria-label="Trạng thái phương tiện" options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} /></Form.Item>
        <Form.Item name="notes" label="Ghi chú"><Input.TextArea aria-label="Ghi chú phương tiện" rows={3} /></Form.Item>
      </Form>
    </Modal>
  </Workspace>;
}
