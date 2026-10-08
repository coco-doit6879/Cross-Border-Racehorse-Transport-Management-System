import React, { useRef, useState } from 'react';
import { Alert, Button, Card, Form, Input, Select, Space, message } from 'antd';
import api from '../../services/apiClient';

export default function DeliveryAcceptance({ order, route, onChanged }) {
  const canvas = useRef(null);
  const drawing = useRef(false);
  const signed = useRef(false);
  const [busy, setBusy] = useState(false);
  const point = event => {
    const box = canvas.current.getBoundingClientRect();
    return [(event.clientX - box.left) * canvas.current.width / box.width, (event.clientY - box.top) * canvas.current.height / box.height];
  };
  const submit = async values => {
    if (!signed.current) return message.error('Vui lòng ký xác nhận.');
    setBusy(true);
    try {
      const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }));
      if (position.coords.accuracy > 100) throw new Error('GPS chưa đủ chính xác (cần ≤ 100 m). Hãy thử lại ngoài trời.');
      await api.post('/pod/sign', {
        tripId: route._id, orderId: order._id, signerName: values.name, signerPhone: values.phone, signerRole: 'CUSTOMER',
        signatureImageUrl: canvas.current.toDataURL('image/png'),
        coordinates: [position.coords.longitude, position.coords.latitude],
        horseConditionsOnArrival: order.horseIds.map(h => ({ horseId: h._id, conditionStatus: values.conditions[h._id], notes: values.notes?.[h._id] || '' }))
      });
      message.success('Đã ký biên bản giao nhận.'); onChanged();
    } catch (error) { message.error(error.response?.data?.message || error.message || 'Không thể xác nhận vị trí.'); }
    finally { setBusy(false); }
  };
  return <Card title="Khách hàng xác nhận nhận ngựa">
    <Alert type="warning" showIcon message="Chỉ ký sau khi kiểm tra đủ ngựa tại đúng điểm giao. Nếu có ngựa bị thương, liên hệ điều phối xử lý sự cố trước khi ký." />
    <Form layout="vertical" onFinish={submit} style={{ marginTop: 16 }}>
      <Form.Item name="name" label="Họ tên người nhận" rules={[{ required: true, whitespace: true }]}><Input maxLength={120} /></Form.Item>
      <Form.Item name="phone" label="Số điện thoại" rules={[{ required: true, pattern: /^[+\d\s()-]{8,25}$/ }]}><Input maxLength={25} /></Form.Item>
      {order.horseIds.map(h => <div key={h._id}><Form.Item name={['conditions', h._id]} label={`Tình trạng: ${h.name}`} rules={[{ required: true }]}><Select options={[{ value: 'EXCELLENT', label: 'Rất tốt' }, { value: 'GOOD', label: 'Tốt' }, { value: 'MINOR_STRESS', label: 'Căng thẳng nhẹ' }]} /></Form.Item><Form.Item name={['notes', h._id]} label="Ghi chú kiểm tra"><Input.TextArea maxLength={1000} /></Form.Item></div>)}
      <p>Chữ ký người nhận</p>
      <canvas ref={canvas} width={600} height={180} style={{ width: '100%', maxWidth: 600, height: 180, border: '1px solid #aaa', touchAction: 'none' }}
        onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); drawing.current = true; const ctx = canvas.current.getContext('2d'); ctx.beginPath(); ctx.moveTo(...point(event)); }}
        onPointerMove={event => { if (!drawing.current) return; const ctx = canvas.current.getContext('2d'); ctx.lineWidth = 2; ctx.lineTo(...point(event)); ctx.stroke(); signed.current = true; }}
        onPointerUp={() => { drawing.current = false; }} onPointerCancel={() => { drawing.current = false; }} />
      <Space style={{ display: 'flex', marginTop: 12 }}><Button disabled={busy} onClick={() => { canvas.current.getContext('2d').clearRect(0, 0, 600, 180); signed.current = false; }}>Ký lại</Button><Button loading={busy} type="primary" htmlType="submit">Xác nhận vị trí và ký nhận</Button></Space>
    </Form>
  </Card>;
}
