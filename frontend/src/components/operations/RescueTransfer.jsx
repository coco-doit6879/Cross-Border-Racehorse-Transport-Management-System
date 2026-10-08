import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, Checkbox, Form, Input, InputNumber, Select, message } from 'antd';
import { operationsApi } from '../../services/operationsApi';
export default function RescueTransfer({ order, route, recover, busy }) {
  const [vehicles, setVehicles] = useState([]); const [staff, setStaff] = useState([]);
  useEffect(() => { Promise.all([operationsApi.getVehicles(), operationsApi.getOperationalStaff()]).then(([v, s]) => { setVehicles(v.data.data); setStaff(s.data.data); }).catch(() => message.error('Không thể tải xe/nhân sự cứu hộ.')); }, []);
  return <Card title="Bàn giao ngựa sang xe / tổ vận chuyển thay thế">
    <Alert type="warning" showIcon message="Chỉ ghi nhận sau khi bàn giao thực tế và đối chiếu mã chip. Chuyến vẫn dừng cho đến khi tài xế mới xác nhận tiếp nhận và điều phối giải quyết sự cố." />
    <Form layout="vertical" onFinish={values => recover('RESCUE_TRANSFER', values)}>
      <Form.Item name="vehicleId" label="Xe tiếp nhận" rules={[{ required: true }]}><Select options={vehicles.filter(v => v.status === 'ACTIVE').map(v => ({ value: v._id, label: `${v.plateNumber} (${v.capacityHorses} ngựa)` }))} /></Form.Item>
      {['DRIVER', 'ESCORT'].map(role => <Form.Item key={role} name={role === 'DRIVER' ? 'driverId' : 'escortId'} label={role === 'DRIVER' ? 'Tài xế tiếp nhận' : 'Phụ xe tiếp nhận'} rules={[{ required: true }]}><Select options={staff.filter(s => s.role === role && s.isActive).map(s => ({ value: s._id, label: s.fullName }))} /></Form.Item>)}
      <Form.Item name="horseIds" label="Đã đối chiếu và bàn giao từng ngựa" rules={[{ required: true }]}><Checkbox.Group options={order.horseIds.map(h => ({ value: h._id, label: `${h.name} — ${h.microchipId}` }))} /></Form.Item>
      <Form.Item name="reason" label="Lý do" rules={[{ required: true, whitespace: true }]}><Input.TextArea maxLength={2000} /></Form.Item>
      <Form.Item name="evidence" label="Mã biên bản và người chứng kiến" rules={[{ required: true, whitespace: true }]}><Input maxLength={2000} /></Form.Item>
      <Form.Item name="previousOdometerEnd" label="Km cuối của xe trước khi bàn giao" rules={[{ required: true }]}><InputNumber min={route.odometerStart || 0} /></Form.Item>
      <Button htmlType="submit" loading={busy} disabled={route.rescuePending}>Ghi nhận bàn giao — chờ tài xế mới tiếp nhận</Button>
    </Form>
  </Card>;
}
