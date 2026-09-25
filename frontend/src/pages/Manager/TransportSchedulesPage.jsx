import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Checkbox, Col, Form, Modal, Row, Select, Space, Switch, Table, Tag, message } from 'antd';
import { transportScheduleApi } from '../../services/transportScheduleApi';

const DAYS = [{ value: 1, label: 'Thứ 2' }, { value: 2, label: 'Thứ 3' }, { value: 3, label: 'Thứ 4' }, { value: 4, label: 'Thứ 5' }, { value: 5, label: 'Thứ 6' }, { value: 6, label: 'Thứ 7' }, { value: 0, label: 'CN' }];

export default function TransportSchedulesPage() {
  const [catalog, setCatalog] = useState(null);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await transportScheduleApi.getCatalog();
      setCatalog(response.data.data); setRules(response.data.data.rules); setDirty(false);
    } catch (err) { setError(err.response?.data?.message || 'Không thể tải lịch vận chuyển.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const stops = catalog?.stops || [];
  const name = (id) => stops.find((stop) => stop.id === id)?.name || id;
  const changeRule = (target, changes) => { setRules((current) => current.map((rule) => rule.originStopId === target.originStopId && rule.destinationStopId === target.destinationStopId ? { ...rule, ...changes } : rule)); setDirty(true); };
  const save = async () => {
    setSaving(true);
    try {
      const response = await transportScheduleApi.updateSchedule({ revision: catalog.revision, rules });
      setCatalog((current) => ({ ...current, ...response.data.data }));
      setRules(response.data.data.rules); setDirty(false);
      message.success('Đã công bố lịch mới cho khách hàng.');
    } catch (err) { message.error(err.response?.data?.message || 'Không thể lưu lịch.'); }
    finally { setSaving(false); }
  };
  const add = (values) => {
    if (values.originStopId === values.destinationStopId) { message.error('Điểm đón và điểm trả phải khác nhau.'); return; }
    if (rules.some((rule) => rule.originStopId === values.originStopId && rule.destinationStopId === values.destinationStopId)) { message.error('Tuyến này đã có. Hãy chỉnh lịch trong bảng.'); return; }
    setRules((current) => [...current, { ...values, active: true }]); setDirty(true); setOpen(false); form.resetFields();
  };
  const stopOptions = (catalog?.countries || []).map((country) => ({ label: country.name, options: stops.filter((stop) => stop.countryCode === country.code).map((stop) => ({ label: stop.name, value: stop.id })) }));
  const columns = [
    { title: 'Tuyến cố định (một chiều)', key: 'route', width: 270, render: (_, rule) => <><strong>{name(rule.originStopId)} → {name(rule.destinationStopId)}</strong><div style={{ color: '#64748b', fontSize: 12 }}>Giờ tại điểm đón · UTC{stops.find((stop) => stop.id === rule.originStopId)?.utcOffset}</div></> },
    { title: 'Ngày khởi hành hàng tuần', key: 'weekdays', width: 300, render: (_, rule) => <Select aria-label={`Ngày chạy ${name(rule.originStopId)} đến ${name(rule.destinationStopId)}`} mode="multiple" style={{ width: '100%' }} options={DAYS} value={rule.weekdays} onChange={(weekdays) => changeRule(rule, { weekdays })} disabled={saving} /> },
    { title: 'Khung giờ', key: 'times', width: 220, render: (_, rule) => <Select aria-label={`Giờ chạy ${name(rule.originStopId)} đến ${name(rule.destinationStopId)}`} mode="multiple" style={{ width: '100%' }} options={(catalog?.timeSlots || []).map((value) => ({ value, label: value }))} value={rule.times} onChange={(times) => changeRule(rule, { times })} disabled={saving} /> },
    { title: 'Nhận đặt chuyến', key: 'active', width: 150, render: (_, rule) => <Switch aria-label={`Nhận đặt ${name(rule.originStopId)} đến ${name(rule.destinationStopId)}`} checked={rule.active} checkedChildren="Đang mở" unCheckedChildren="Tạm dừng" disabled={saving} onChange={(active) => changeRule(rule, { active })} /> }
  ];
  return <Space direction="vertical" size={20} style={{ width: '100%' }}>
    <Card title="Lịch vận chuyển cố định" extra={<Tag color={dirty ? 'orange' : 'green'}>{dirty ? 'Có thay đổi chưa lưu' : 'Lịch đang công bố'}</Tag>}>
      <p>Thiết lập tuyến, ngày trong tuần và khung giờ. Khách hàng chỉ chọn được những chuyến thuộc lịch đang mở.</p>
      <Space wrap><Button type="primary" loading={saving} disabled={!catalog || !dirty || loading} onClick={save}>Lưu & công bố lịch</Button><Button disabled={!catalog || saving || loading} onClick={() => setOpen(true)}>Thêm tuyến cố định</Button><Button loading={loading} disabled={saving} onClick={load}>Tải lại lịch đã lưu</Button></Space>
    </Card>
    {error && <Alert type="error" showIcon message={error} />}
    <Alert type="info" showIcon message={`Mở đặt trong ${catalog?.bookingWindowDays || 28} ngày tới, đóng nhận trước giờ khởi hành ${catalog?.minNoticeHours || 24} giờ.`} description="Thay đổi lịch áp dụng cho yêu cầu đặt mới. Đơn đã tạo giữ nguyên điểm đón/trả và giờ khởi hành đã ghi nhận; xử lý riêng nếu cần đổi hoặc hủy chuyến." />
    <Row gutter={[16, 16]}>{(catalog?.countries || []).map((country) => <Col xs={24} sm={12} xl={6} key={country.code}><Card size="small" title={country.name}>{stops.filter((stop) => stop.countryCode === country.code).map((stop) => <p key={stop.id} style={{ margin: '6px 0' }}>{stop.name}</p>)}</Card></Col>)}</Row>
    <Table columns={columns} dataSource={rules} rowKey={(rule) => `${rule.originStopId}:${rule.destinationStopId}`} loading={loading} pagination={{ pageSize: 8 }} scroll={{ x: 1000 }} />
    <Modal title="Thêm tuyến vận chuyển cố định" open={open} onCancel={() => { setOpen(false); form.resetFields(); }} onOk={() => form.submit()} okText="Thêm vào lịch" cancelText="Hủy">
      <Form form={form} layout="vertical" onFinish={add} initialValues={{ weekdays: [1, 3, 5], times: ['08:00'] }}>
        <Form.Item name="originStopId" label="Điểm đón" rules={[{ required: true }]}><Select options={stopOptions} /></Form.Item>
        <Form.Item name="destinationStopId" label="Điểm trả" rules={[{ required: true }]}><Select options={stopOptions} /></Form.Item>
        <Form.Item name="weekdays" label="Ngày khởi hành" rules={[{ required: true, type: 'array', min: 1 }]}><Checkbox.Group options={DAYS} /></Form.Item>
        <Form.Item name="times" label="Khung giờ tại điểm đón" rules={[{ required: true, type: 'array', min: 1 }]}><Checkbox.Group options={catalog?.timeSlots || []} /></Form.Item>
      </Form>
    </Modal>
  </Space>;
}

