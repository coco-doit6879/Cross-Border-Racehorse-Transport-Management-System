import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, Form, Input, Select, Space, Table, Tag, message } from 'antd';
import api from '../../services/apiClient';
import './compliance-clarity.css';

const clearanceKey = v => JSON.stringify(['horseId','countryCode','checkpoint','status','referenceNumber','notes'].map(k => String(v?.[k] || '').trim()));

const countryLabel = code => {
  if (!code) return 'Chưa xác định quốc gia';
  const names = { VN: 'Việt Nam', KH: 'Campuchia', TH: 'Thái Lan', MY: 'Malaysia', SG: 'Singapore' };
  const name = names[code] || new Intl.DisplayNames(['vi'], { type: 'region' }).of(code);
  return name && name !== code ? `${name} (${code})` : code;
};

export default function CustomsClearance({ orderId, readOnly = false }) {
  const [data, setData] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [form] = Form.useForm();
  const lock = useRef(false), selectedKey = useRef('');
  const [savedSnapshot, setSavedSnapshot] = useState('');
  const values = Form.useWatch([], form) || {};
  const checkpoint = Form.useWatch('checkpoint', form);
  const status = Form.useWatch('status', form);
  const load = useCallback(async () => {
    try { setData((await api.get(`/orders/${orderId}/operations`)).data.data); setError(''); }
    catch (e) { setError(e.response?.data?.message || 'Không tải được thông tin thông quan.'); }
  }, [orderId]);
  useEffect(() => { void load(); const timer = setInterval(load, 30000); return () => clearInterval(timer); }, [load]);
  const save = async values => {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try {
      await api.patch(`/orders/${orderId}/operations`, { action: 'CLEARANCE', ...values, version: data.route.operationsVersion || 0 });
      setSavedSnapshot(clearanceKey(values)); message.success('Đã lưu kết quả thông quan.'); await load();
    } catch (e) { message.error(e.response?.data?.message || 'Chưa lưu được kết quả.'); await load(); }
    finally { lock.current = false; setBusy(false); }
  };
  const planned = data?.customsCheckpoints || [];
  useEffect(() => { if (!data || readOnly || !planned.length) return; const selected = planned.find(p=>p.name===checkpoint) || (!checkpoint && planned.length === 1 ? planned[0] : null); if (selected) form.setFieldsValue({ checkpoint: selected.name, countryCode: selected.countryCode }); }, [checkpoint, JSON.stringify(planned), form, Boolean(data), readOnly]);
  const latest = [...(data?.route?.clearances || [])].reverse().find(c => String(c.horseId) === String(values.horseId) && c.checkpoint === values.checkpoint && c.countryCode === values.countryCode);
  const saved = clearanceKey(values) === savedSnapshot || Boolean(latest && clearanceKey(latest) === clearanceKey(values));
  useEffect(() => {
    if (!values.horseId || !values.checkpoint || !values.countryCode || readOnly) return;
    const key = [values.horseId, values.checkpoint, values.countryCode].join(':');
    if (selectedKey.current === key) return;
    selectedKey.current = key; setSavedSnapshot('');
    form.setFieldsValue({ status: latest?.status || 'PENDING', referenceNumber: latest?.referenceNumber || '', notes: latest?.notes || '' });
  }, [values.horseId, values.checkpoint, values.countryCode, latest, form, readOnly]);
  if (!data) return <Card title="Thông quan & kiểm dịch cửa khẩu" loading={!error}>{error && <Alert type="error" message={error} action={<Button onClick={load}>Thử lại</Button>} />}</Card>;
  const { order, route } = data;
  const international = order.origin.countryCode !== order.destination.countryCode;
  const canEdit = !readOnly && route && ['SCHEDULED', 'IN_TRANSIT', 'INCIDENT_HANDLING', 'DELIVERING'].includes(route.status);
  return <Card className="compliance-clarity" title={<div>Kết quả tại cửa khẩu<div className="compliance-subtitle">Ghi nhận kết quả thực tế cho từng ngựa khi xe đến cửa khẩu</div></div>} extra={<Button onClick={load}>Làm mới</Button>}>
    {error && <Alert type="error" message={error} />}
    <div className="compliance-state" role="status"><span className="compliance-state-icon" aria-hidden="true">2</span><div><strong>{international ? `Nước đến: ${countryLabel(order.destination.countryCode)}` : 'Tuyến nội địa — không bắt buộc thông quan quốc tế'}</strong><p>{readOnly ? 'Xem kết quả chuyên viên đã ghi nhận bên dưới.' : international ? 'Chọn ngựa và cửa khẩu → nhập kết quả, số chứng từ → lưu.' : 'Chỉ cập nhật nếu chuyến có yêu cầu xử lý tại cửa khẩu.'}</p></div></div>
    <details className="compliance-help"><summary>Ai cập nhật và cần chuẩn bị gì?</summary><p>Chuyên viên ghi nhận kết quả cho từng ngựa. Cửa khẩu do điều phối chọn trong lộ trình. Khi chọn “Đã thông quan”, cần nhập số chứng từ thực tế. Khách hàng chỉ bổ sung giấy tờ khi có yêu cầu.</p></details>
    {route && international && !planned.length && <Alert type="warning" showIcon style={{marginBottom:16}} message="Điều phối chưa khai báo cửa khẩu trong lộ trình" description="Nhờ tài khoản Điều phối mở Xe và lộ trình → Thiếu cửa khẩu → Bổ sung cửa khẩu cho đơn này, rồi lưu kế hoạch. Chuyên viên sẽ thấy cửa khẩu được phân công sau khi bấm Làm mới." />}
    {!route && <p>Chưa có vận đơn. Có thể ghi nhận thông quan sau khi phân công chuyến.</p>}
    {route && <><h3 className="compliance-section-title">Kết quả đã ghi nhận</h3><Table size="small" rowKey="_id" scroll={{ x: 560 }} pagination={{ pageSize: 5, hideOnSinglePage: true }} dataSource={[...(route.clearances || [])].reverse()} locale={{ emptyText: 'Chưa có kết quả. Chuyên viên cập nhật khi xe đến cửa khẩu.' }} columns={[
      { title: 'Ngựa', render: (_, c) => order.horseIds.find(h => String(h._id) === String(c.horseId))?.name || '—' },
      { title: 'Quốc gia', dataIndex: 'countryCode', render: countryLabel }, { title: 'Cửa khẩu', dataIndex: 'checkpoint' },
      { title: 'Kết quả', render: (_, c) => <Tag color={c.status === 'CLEARED' ? 'green' : c.status === 'HELD' ? 'red' : 'gold'}>{({ PENDING: 'Chưa thông quan', CLEARED: 'Đã thông quan', HELD: 'Đang bị giữ' })[c.status]}</Tag> },
      { title: 'Số chứng từ', dataIndex: 'referenceNumber' }
    ]} /></>}
    {canEdit && planned.length > 0 && <Form form={form} layout="vertical" initialValues={{ horseId: order.horseIds.length === 1 ? order.horseIds[0]._id : undefined, status: 'PENDING' }} onFinish={save} style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: 16 }}>Ghi nhận kết quả thông quan</h3>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Form.Item name="horseId" label="Ngựa" rules={[{ required: true, message: 'Chọn ngựa cần ghi nhận.' }]}><Select options={order.horseIds.map(h => ({ value: h._id, label: h.name + ' · ' + h.microchipId }))} /></Form.Item>
        <Form.Item name="countryCode" label="Quốc gia nhập cảnh (theo lộ trình)" rules={[{ required: true }]}><Select disabled options={[...new Set(planned.map(p=>p.countryCode))].map(code=>({value:code,label:countryLabel(code)}))} /></Form.Item>
        <Form.Item name="checkpoint" label="Cửa khẩu thực tế" rules={[{ required: true, whitespace: true, message: 'Chọn cửa khẩu đã phân công.' }]}><Select placeholder="Chọn cửa khẩu điều phối đã phân công" options={planned.map(p=>({value:p.name,label:p.name + " · " + countryLabel(p.countryCode)}))} /></Form.Item>
        <Form.Item name="status" label="Kết quả" rules={[{ required: true }]}><Select options={[{ value: 'PENDING', label: 'Chưa thông quan' }, { value: 'CLEARED', label: 'Đã thông quan' }, { value: 'HELD', label: 'Đang bị giữ' }]} /></Form.Item>
        <Form.Item name="referenceNumber" label="Số chứng từ thông quan" rules={[{ required: status === 'CLEARED', whitespace: true, message: 'Cần số chứng từ để xác nhận đã thông quan.' }]}><Input maxLength={200} placeholder="Nhập số chứng từ thực tế" /></Form.Item>
        <Form.Item name="notes" label="Ghi chú"><Input.TextArea rows={2} maxLength={2000} /></Form.Item>
      </Space>
      <Button type="primary" htmlType="submit" loading={busy} disabled={saved}>{saved ? "Đã lưu kết quả thông quan" : "Lưu kết quả thông quan"}</Button>{saved && <p style={{color:"#52715c",fontSize:13,marginTop:10}}>Kết quả đã được lưu. Chỉ cần lưu lại khi thay đổi nội dung.</p>}
    </Form>}
  </Card>;
}
