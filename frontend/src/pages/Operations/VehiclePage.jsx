import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, message } from 'antd';
import { operationsApi } from '../../services/operationsApi';

const statusLabels = { ACTIVE: 'Hoạt động', MAINTENANCE: 'Bảo dưỡng', INACTIVE: 'Ngừng hoạt động' };
export default function VehiclePage() {
  const [vehicles, setVehicles] = useState([]); const [loading, setLoading] = useState(true); const [editing, setEditing] = useState(null); const [open, setOpen] = useState(false); const [form] = Form.useForm();
  const load = useCallback(async () => { setLoading(true); try { const response = await operationsApi.getVehicles(); setVehicles(response.data.data); } catch (err) { message.error(err.response?.data?.message || 'Không thể tải phương tiện.'); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  const show = (vehicle) => { setEditing(vehicle || null); form.setFieldsValue(vehicle ? { ...vehicle, registrationExpiresAt: vehicle.registrationExpiresAt?.slice(0, 10), inspectionExpiresAt: vehicle.inspectionExpiresAt?.slice(0, 10) } : { status: 'ACTIVE', countryCode: 'VN', capacityHorses: 2 }); setOpen(true); };
  const save = async (values) => {
    const payload = values;
    try { if (editing) await operationsApi.updateVehicle(editing._id, payload); else await operationsApi.createVehicle(payload); message.success('Đã lưu phương tiện.'); setOpen(false); form.resetFields(); load(); }
    catch (err) { message.error(err.response?.data?.message || 'Không thể lưu phương tiện.'); }
  };
  return <Space direction="vertical" size={20} style={{ width: '100%' }}>
    <Card title="Đội xe vận chuyển ngựa" extra={<Button type="primary" onClick={() => show(null)}>Thêm phương tiện</Button>}><Alert type="info" showIcon message="Biển số chỉ xuất hiện trên đơn và dashboard sau khi phương tiện được phân công cho chuyến." /></Card>
    <Table loading={loading} rowKey="_id" dataSource={vehicles} columns={[
      { title: 'Biển số', dataIndex: 'plateNumber', render: (value) => <strong>{value}</strong> }, { title: 'Tên xe', dataIndex: 'name' }, { title: 'Sức chứa', dataIndex: 'capacityHorses', render: (value) => `${value} ngựa` }, { title: 'Quốc gia', dataIndex: 'countryCode' },
      { title: 'Đăng kiểm', dataIndex: 'inspectionExpiresAt', render: (value) => <span style={{ color: new Date(value) < new Date() ? '#cf1322' : undefined }}>{new Date(value).toLocaleDateString('vi-VN')}</span> },
      { title: 'Trạng thái', render: (_, item) => item.activeAssignment ? <Tag color="blue">Đang có chuyến</Tag> : <Tag color={item.status === 'ACTIVE' ? 'green' : 'orange'}>{statusLabels[item.status]}</Tag> },
      { title: '', render: (_, item) => <Button onClick={() => show(item)}>Chỉnh sửa</Button> }
    ]} />
    <Modal open={open} title={editing ? 'Cập nhật phương tiện' : 'Thêm phương tiện'} onCancel={() => setOpen(false)} onOk={() => form.submit()} okText="Lưu"><Form form={form} layout="vertical" onFinish={save}>
      <Form.Item name="plateNumber" label="Biển số" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="name" label="Tên/loại xe" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item name="capacityHorses" label="Sức chứa ngựa" rules={[{ required: true, type: 'number', min: 1, max: 12 }]}><InputNumber min={1} max={12} style={{ width: '100%' }} /></Form.Item><Form.Item name="countryCode" label="Quốc gia đăng ký" rules={[{ required: true }]}><Select options={['VN', 'TH', 'KH', 'SG'].map((value) => ({ value }))} /></Form.Item>
      <Form.Item name="registrationExpiresAt" label="Hạn đăng ký" rules={[{ required: true }]}><Input type="date" /></Form.Item><Form.Item name="inspectionExpiresAt" label="Hạn đăng kiểm" rules={[{ required: true }]}><Input type="date" /></Form.Item>
      <Form.Item name="status" label="Trạng thái" rules={[{ required: true }]}><Select options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} /></Form.Item><Form.Item name="notes" label="Ghi chú"><Input.TextArea rows={3} /></Form.Item>
    </Form></Modal>
  </Space>;
}
