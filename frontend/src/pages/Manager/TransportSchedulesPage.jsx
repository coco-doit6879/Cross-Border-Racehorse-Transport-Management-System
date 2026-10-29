import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Checkbox, Col, Form, Input, InputNumber, Modal, Row, Select, Space, Switch, Table, message } from 'antd';
import { transportScheduleApi } from '../../services/transportScheduleApi';
import { DataPanel, Metrics, Workspace } from '../../components/operations/OperationsUI';

const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
const scheduleStatus = (rule) => rule.active ? 'ACTIVE' : 'PAUSED';
const statusOptions = [{ value: 'ALL', label: 'Tất cả trạng thái' }, { value: 'ACTIVE', label: 'Đang nhận đặt chuyến' }, { value: 'PAUSED', label: 'Tạm dừng nhận đặt' }];
const controlStyle = { flex: '0 1 240px', minWidth: 0, width: '100%' };

const DAYS = [{ value: 1, label: 'Thứ 2' }, { value: 2, label: 'Thứ 3' }, { value: 3, label: 'Thứ 4' }, { value: 4, label: 'Thứ 5' }, { value: 5, label: 'Thứ 6' }, { value: 6, label: 'Thứ 7' }, { value: 0, label: 'CN' }];
const estimateKm = (a, b) => { const toRad = n => n * Math.PI / 180; const [lon1, lat1] = a.coordinates, [lon2, lat2] = b.coordinates; const dLat = toRad(lat2-lat1), dLon = toRad(lon2-lon1); const h = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2; return Math.ceil(6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))*1.25); };
const fare = (rule, stops) => { const a=stops.find(s=>s.id===rule.originStopId), b=stops.find(s=>s.id===rule.destinationStopId); return a&&b ? (rule.baseFeeVnd ?? 2000000)+estimateKm(a,b)*(rule.rateVndPerKm ?? 12000) : 0; };
const formatVnd = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value || 0);

export default function TransportSchedulesPage() {
  const [catalog, setCatalog] = useState(null);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
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
  const query = normalize(search.trim());
  const filteredRules = rules.filter((rule) => (status === 'ALL' || scheduleStatus(rule) === status)
    && normalize([name(rule.originStopId), name(rule.destinationStopId), rule.originStopId, rule.destinationStopId].join(' ')).includes(query));
  const activeCount = rules.filter((rule) => rule.active).length;
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
    setRules((current) => [...current, { ...values, baseFeeVnd: values.baseFeeVnd ?? 2000000, rateVndPerKm: values.rateVndPerKm ?? 12000, active: true }]); setDirty(true); setOpen(false); form.resetFields();
  };
  const stopOptions = (catalog?.countries || []).map((country) => ({ label: country.name, options: stops.filter((stop) => stop.countryCode === country.code).map((stop) => ({ label: stop.name, value: stop.id })) }));
  const columns = [
    { title: 'Tuyến cố định (một chiều)', key: 'route', width: 270, render: (_, rule) => <><strong>{name(rule.originStopId)} → {name(rule.destinationStopId)}</strong><div className="ops-secondary">Giờ tại điểm đón · UTC{stops.find((stop) => stop.id === rule.originStopId)?.utcOffset}</div></> },
    { title: 'Ngày khởi hành hàng tuần', key: 'weekdays', width: 300, render: (_, rule) => <Select aria-label={`Ngày chạy ${name(rule.originStopId)} đến ${name(rule.destinationStopId)}`} mode="multiple" style={{ width: '100%' }} options={DAYS} value={rule.weekdays} onChange={(weekdays) => changeRule(rule, { weekdays })} disabled={saving} /> },
    { title: 'Khung giờ', key: 'times', width: 220, render: (_, rule) => <Select aria-label={`Giờ chạy ${name(rule.originStopId)} đến ${name(rule.destinationStopId)}`} mode="multiple" style={{ width: '100%' }} options={(catalog?.timeSlots || []).map((value) => ({ value, label: value }))} value={rule.times} onChange={(times) => changeRule(rule, { times })} disabled={saving} /> },
    { title: 'Giá / ngựa', key: 'basePriceVnd', width: 270, render: (_, rule) => <><strong>{formatVnd(fare(rule,stops))}</strong><div className="ops-secondary">Ước tính {estimateKm(stops.find(s=>s.id===rule.originStopId),stops.find(s=>s.id===rule.destinationStopId))} km</div><InputNumber aria-label="Phí mở tuyến" min={0} step={100000} value={rule.baseFeeVnd ?? 2000000} onChange={(baseFeeVnd) => changeRule(rule, {baseFeeVnd})} addonBefore="Phí cố định" style={{width:'100%',marginTop:6}}/><InputNumber aria-label="Đơn giá mỗi km" min={1} step={1000} value={rule.rateVndPerKm ?? 12000} onChange={(rateVndPerKm) => changeRule(rule, {rateVndPerKm})} addonBefore="VND/km" style={{width:'100%',marginTop:6}}/></> },
    { title: 'Nhận đặt chuyến', key: 'active', width: 150, render: (_, rule) => <Switch aria-label={`Nhận đặt ${name(rule.originStopId)} đến ${name(rule.destinationStopId)}`} checked={rule.active} checkedChildren="Đang mở" unCheckedChildren="Tạm dừng" disabled={saving} onChange={(active) => changeRule(rule, { active })} /> }
  ];
  return <Workspace
    eyebrow="Điều phối vận chuyển"
    title="Tuyến & lịch vận chuyển"
    description="Quản lý từng chiều tuyến, ngày chạy, khung giờ và giá. Khách hàng chỉ chọn chuyến đã công bố."
    actions={<Space wrap><Button type="primary" loading={saving} disabled={!catalog || !dirty || loading} onClick={save}>Lưu & công bố lịch</Button><Button disabled={!catalog || saving || loading} onClick={() => setOpen(true)}>Thêm tuyến cố định</Button><Button loading={loading} disabled={saving} onClick={load}>Tải lại lịch đã lưu</Button></Space>}
  >
    <Metrics items={[
      { label: 'Tổng tuyến', value: rules.length, detail: 'Tuyến cố định một chiều' },
      { label: 'Đang nhận đặt', value: activeCount, detail: 'Tuyến mở cho khách hàng' },
      { label: 'Tạm dừng', value: rules.length - activeCount, detail: 'Chưa nhận đặt chuyến mới' },
      { label: 'Điểm dừng', value: stops.length, detail: `${catalog?.countries?.length || 0} quốc gia trong mạng lưới` }
    ]} />
    {error && <Alert type="error" message={error} />}
    <Alert type={dirty ? 'warning' : 'info'} message={dirty ? 'Có thay đổi chưa lưu' : 'Lịch đang công bố'} description={dirty ? 'Các thay đổi chỉ áp dụng cho khách hàng sau khi lưu & công bố lịch.' : 'Khách hàng đang sử dụng phiên bản lịch đã công bố gần nhất.'} />
    <DataPanel title="Lịch chạy & giá tuyến" description="Giá/ngựa = phí mở tuyến + km ước tính × đơn giá/km. Km ước tính dùng khoảng cách thẳng nhân hệ số 1,25, không phải km đường thực tế. Giá mới áp dụng cho đơn tạo sau khi lưu; đơn đã tạo giữ giá tại thời điểm đặt. Bộ lọc không làm mất thay đổi chưa lưu." extra={<span className="ops-secondary" aria-live="polite">{filteredRules.length} / {rules.length} tuyến</span>}>
      <div className="ops-toolbar" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <Input aria-label="Tìm tuyến vận chuyển" allowClear placeholder="Tìm điểm đón, điểm trả hoặc mã điểm dừng" value={search} onChange={(event) => setSearch(event.target.value)} style={{ flex: '1 1 280px', minWidth: 0 }} />
        <Select aria-label="Lọc trạng thái nhận đặt" value={status} onChange={setStatus} options={statusOptions} style={controlStyle} />
      </div>
      <Table columns={columns} dataSource={filteredRules} rowKey={(rule) => `${rule.originStopId}:${rule.destinationStopId}`} loading={loading} pagination={{ pageSize: 8 }} scroll={{ x: 1190 }} locale={{ emptyText: 'Không có tuyến phù hợp.' }} />
    </DataPanel>
    <DataPanel title="Phạm vi & quy định đặt chuyến" description={`Mở đặt trong ${catalog?.bookingWindowDays || 28} ngày tới; đóng nhận trước giờ khởi hành ${catalog?.minNoticeHours || 24} giờ.`}>
      <p className="ops-secondary">Thay đổi lịch áp dụng cho yêu cầu đặt mới. Đơn đã tạo giữ nguyên điểm đón/trả và giờ khởi hành đã ghi nhận; xử lý riêng nếu cần đổi hoặc hủy chuyến.</p>
      <Row gutter={[16, 16]}>{(catalog?.countries || []).map((country) => <Col xs={24} sm={12} xl={6} key={country.code}><strong>{country.name}</strong>{stops.filter((stop) => stop.countryCode === country.code).map((stop) => <p className="ops-secondary" key={stop.id} style={{ margin: '6px 0' }}>{stop.name}</p>)}</Col>)}</Row>
    </DataPanel>
    <Modal title="Thêm tuyến vận chuyển cố định" open={open} onCancel={() => { setOpen(false); form.resetFields(); }} onOk={() => form.submit()} okText="Thêm vào lịch" cancelText="Hủy">
      <Form form={form} layout="vertical" onFinish={add} initialValues={{ weekdays: [1, 3, 5], times: ['08:00'], baseFeeVnd: 2000000, rateVndPerKm: 12000 }}>
        <Form.Item name="originStopId" label="Điểm đón" rules={[{ required: true }]}><Select options={stopOptions} /></Form.Item>
        <Form.Item name="destinationStopId" label="Điểm trả" rules={[{ required: true }]}><Select options={stopOptions} /></Form.Item>
        <Form.Item name="weekdays" label="Ngày khởi hành" rules={[{ required: true, type: 'array', min: 1 }]}><Checkbox.Group options={DAYS} /></Form.Item>
        <Form.Item name="times" label="Khung giờ tại điểm đón" rules={[{ required: true, type: 'array', min: 1 }]}><Checkbox.Group options={catalog?.timeSlots || []} /></Form.Item>
        <Form.Item name="baseFeeVnd" label="Phí mở tuyến (VND)" rules={[{ required: true, type: 'number', min: 0 }]}><InputNumber min={0} step={100000} style={{width:'100%'}} /></Form.Item><Form.Item name="rateVndPerKm" label="Đơn giá mỗi km (VND)" rules={[{ required: true, type: 'number', min: 1 }]}><InputNumber min={1} step={1000} style={{width:'100%'}} /></Form.Item>
      </Form>
    </Modal>
  </Workspace>;
}
