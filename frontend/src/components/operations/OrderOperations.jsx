import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Input, InputNumber, Select, Space, Table, Tag, message } from 'antd';
import api from '../../services/apiClient';
import { useAuthStore } from '../../store/useAuthStore';
import { hasPermission } from '../../utils/permissions';
import DeliveryAcceptance from './DeliveryAcceptance';
import ExceptionRequests from './ExceptionRequests';
import RescueTransfer from './RescueTransfer';

const money = n => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const date = value => value ? new Date(value).toLocaleString('vi-VN') : '—';
export default function OrderOperations({ orderId, onChanged }) {
  const user = useAuthStore(s => s.user);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState('');
  const [chargeForm] = Form.useForm(); const [receiptForm] = Form.useForm(); const [clearForm] = Form.useForm();
  const load = useCallback(async () => {
    try { setData((await api.get(`/orders/${orderId}/operations`)).data.data); setError(''); }
    catch (e) { setError(e.response?.data?.message || 'Không thể tải vận đơn và quyết toán.'); }
  }, [orderId]);
  useEffect(() => { load(); const timer = setInterval(load, 30000); return () => clearInterval(timer); }, [load]);
  const recover = async (action, values) => {
    setBusy(true);
    try { await api.post(`/orders/${orderId}/recovery`, { action, ...values, version: data.order.operationsVersion || 0 }); message.success('Đã xử lý và lưu lịch sử.'); await load(); onChanged?.(); }
    catch (e) { message.error(e.response?.data?.message || 'Không thể thực hiện.'); await load(); }
    finally { setBusy(false); }
  };
  const act = async (action, values = {}, routeAction = false) => {
    setBusy(true);
    try {
      await api.patch(`/orders/${orderId}/operations`, { action, ...values, version: (routeAction ? data.route : data.order)?.operationsVersion || 0 });
      message.success('Đã cập nhật.'); await load(); onChanged?.();
    } catch (e) { message.error(e.response?.data?.message || 'Không thể cập nhật.'); await load(); }
    finally { setBusy(false); }
  };
  if (error) return <Alert type="error" message={error} action={<Button onClick={load}>Thử lại</Button>} />;
  if (!data) return <Card loading />;
  const { order, route, financials: f } = data;
  const operational = hasPermission(user, 'booking:approve');
  const manager = hasPermission(user, 'user:manage');
  const specialist = hasPermission(user, 'compliance:review');
  const coordinator = hasPermission(user, 'route:dispatch');
  const closed = !!order.settlement?.closedAt;
  const stages = [
    ['Tạo đơn', date(order.createdAt)],
    ['Khách kiểm tra', ({ PENDING: 'Chờ xác nhận', CHANGES_REQUESTED: 'Yêu cầu sửa', CONFIRMED: 'Đã xác nhận', NOT_REQUIRED: 'Khách tự nhập' })[order.customerConfirmation || 'NOT_REQUIRED']],
    ['Tiếp nhận đơn', order.status === 'PENDING_APPROVAL' ? 'Chờ duyệt' : order.status === 'REJECTED' ? 'Từ chối' : 'Đã xử lý'],
    ['Tạo vận đơn', route ? `VD-${order.bookingCode}` : 'Chưa phân công'],
    ['Tài xế tiếp nhận', date(route?.acceptedAt)],
    ['Giao nhận / quyết toán', closed ? 'Đã đóng đơn' : order.status === 'COMPLETED' ? 'Đã giao — chờ quyết toán' : 'Chưa giao xong']
  ];
  return <Space direction="vertical" size={16} style={{ width: '100%' }}>
    {order.operationsNotices?.length > 0 && <Alert type="info" showIcon message="Thông báo cập nhật đơn" description={<ul>{order.operationsNotices.slice(-5).reverse().map(n => <li key={n._id}>{date(n.at)} — {n.message}</li>)}</ul>} />}
    <ExceptionRequests order={order} manager={manager} busy={busy} act={act} recover={recover} destinationOptions={data.destinationOptions} />
    {manager && route?.status === 'INCIDENT_HANDLING' && <RescueTransfer order={order} route={route} recover={recover} busy={busy} />}
    {manager && route?.status === 'SCHEDULED' && <Card title="Hủy chuyến đã phân công (chưa nhận ngựa)"><Form onFinish={v => recover('CANCEL_ASSIGNED', v)}><Form.Item name="reason" rules={[{ required: true, whitespace: true }]}><Input.TextArea placeholder="Lý do hủy bắt buộc; hoàn tiền được xử lý riêng" /></Form.Item><Button danger htmlType="submit" loading={busy}>Hủy chuyến chưa khởi hành</Button></Form></Card>}
    {user?.role === 'CUSTOMER' && route?.status === 'DELIVERING' && <DeliveryAcceptance order={order} route={route} onChanged={() => { load(); onChanged?.(); }} />}
    <Card title="Vận đơn và tiến độ xử lý" extra={<Button onClick={load}>Làm mới</Button>}>
      <Space wrap>{stages.map(([label, value]) => <div key={label} style={{ minWidth: 170, padding: 10 }}><strong>{label}</strong><p>{value}</p></div>)}</Space>
      {order.confirmationNotes && <Alert message={`Phản hồi khách: ${order.confirmationNotes}`} />}
      {user?.role === 'CUSTOMER' && ['PENDING', 'CHANGES_REQUESTED'].includes(order.customerConfirmation) && <Space direction="vertical" style={{ width: '100%', marginTop: 12 }}><p>Kiểm tra hành trình, danh sách ngựa, giá và ghi chú ở đơn trước khi xác nhận.</p><Input.TextArea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Nội dung yêu cầu sửa" /><Space><Button disabled={busy} type="primary" onClick={() => act('CONFIRM')}>Xác nhận thông tin</Button><Button disabled={busy || !notes.trim()} onClick={() => act('REQUEST_CHANGES', { notes })}>Yêu cầu sửa</Button></Space></Space>}
      {operational && order.customerConfirmation === 'CHANGES_REQUESTED' && <Space direction="vertical" style={{ width: '100%', marginTop: 12 }}><Input.TextArea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ghi chú chăm sóc đã chỉnh sửa. Nếu đổi tuyến/ngựa/giá: hủy bản nháp và tạo lại." /><Button disabled={busy || !notes.trim()} onClick={() => act('RESUBMIT', { notes })}>Gửi lại khách kiểm tra</Button></Space>}
      {route && <><p>Biển số: <strong>{route.vehiclePlateNumber}</strong> · Tài xế nhận lúc {date(route.acceptedAt)}</p><Table size="small" pagination={false} rowKey="_id" dataSource={order.horseIds} columns={[
        { title: 'Ngựa', dataIndex: 'name' }, { title: 'Mã chip', dataIndex: 'microchipId' },
        { title: 'Vị trí', render: (_, horse) => { const m = route.horseMovements?.find(x => x.horseId === horse._id); return m?.unloadedAt ? `Đã giao · ${date(m.unloadedAt)}` : m?.loadedAt ? `Trên xe ${route.vehiclePlateNumber}` : `Dự kiến lên xe ${route.vehiclePlateNumber}`; } }
      ]} />
      <p>Km đầu xe hiện tại: {route.odometerStart ?? 'Chưa ghi'} · Km cuối: {route.odometerEnd ?? 'Chưa ghi'} · Tổng quãng đường các xe: {route.odometerEnd != null && route.odometerStart != null ? `${(route.previousVehicleDistanceKm || 0) + route.odometerEnd - route.odometerStart} km` : 'Chưa có'}</p>
      {route.rescueHistory?.map(r => <Alert key={r._id} type="info" message={`Bàn giao cứu hộ ${date(r.at)}: ${r.reason}`} description={`${r.evidence} · ${r.acceptedAt ? `Tài xế mới nhận lúc ${date(r.acceptedAt)}` : 'Chờ tài xế mới tiếp nhận'}`} />)}
      <Tag>{route.distanceVerifiedAt ? 'Điều phối đã xác nhận km' : 'Km chưa được xác nhận'}</Tag>
      {coordinator && !closed && <Button disabled={busy || route.odometerEnd == null || !!route.distanceVerifiedAt} onClick={() => act('VERIFY_DISTANCE', {}, true)}>Xác nhận km thực tế</Button>}
      {!route.plannedPath?.length && <Alert type="warning" message="Chưa có đường đi dự kiến: hệ thống chưa thể cảnh báo lệch tuyến, chỉ theo dõi GPS và dừng lâu." />}
      {coordinator && ['SCHEDULED', 'INCIDENT_HANDLING'].includes(route.status) && <Form onFinish={v => { try { act('PLAN_PATH', { path: JSON.parse(v.path) }, true); } catch { message.error('Tọa độ phải là mảng JSON hợp lệ.'); } }}><Form.Item name="path" label="Đường đi đã kiểm tra (mảng tọa độ GeoJSON [lng, lat])" rules={[{ required: true }]}><Input.TextArea placeholder="[[106.7008,10.7769], ...]" /></Form.Item><Button loading={busy} htmlType="submit">Lưu đường đi dự kiến</Button></Form>}
      </>}
    </Card>
    {route && <Card title="Thông quan từng ngựa theo cửa khẩu">
      <p>Nhân viên cập nhật kết quả thực tế; lịch sử các lần cập nhật được giữ lại.</p>
      <Table size="small" rowKey="_id" dataSource={[...(route.clearances || [])].reverse()} columns={[
        { title: 'Ngựa', render: (_, c) => order.horseIds.find(h => h._id === c.horseId)?.name || c.horseId },
        { title: 'Quốc gia', dataIndex: 'countryCode' }, { title: 'Cửa khẩu', dataIndex: 'checkpoint' },
        { title: 'Trạng thái', render: (_, c) => ({ PENDING: 'Chưa thông quan', CLEARED: 'Đã thông quan', HELD: 'Đang bị giữ' })[c.status] },
        { title: 'Số chứng từ', dataIndex: 'referenceNumber' }, { title: 'Cập nhật', render: (_, c) => date(c.updatedAt) }
      ]} />
      {specialist && !closed && <Form form={clearForm} layout="vertical" onFinish={values => act('CLEARANCE', values, true)}><Space wrap align="start">
        <Form.Item name="horseId" label="Ngựa" rules={[{ required: true }]}><Select style={{ width: 180 }} options={order.horseIds.map(h => ({ value: h._id, label: h.name }))} /></Form.Item>
        <Form.Item name="countryCode" label="Mã quốc gia" rules={[{ required: true }, { pattern: /^[A-Z]{2}$/ }]}><Input maxLength={2} placeholder="VN / KH / TH / SG" /></Form.Item>
        <Form.Item name="checkpoint" label="Cửa khẩu" rules={[{ required: true }]}><Input placeholder="Trùng tên điểm trên vận đơn" /></Form.Item>
        <Form.Item name="status" label="Kết quả" rules={[{ required: true }]}><Select style={{ width: 170 }} options={[{ value: 'PENDING', label: 'Chưa thông quan' }, { value: 'CLEARED', label: 'Đã thông quan' }, { value: 'HELD', label: 'Đang bị giữ' }]} /></Form.Item>
        <Form.Item name="referenceNumber" label="Số chứng từ"><Input /></Form.Item><Form.Item name="notes" label="Ghi chú"><Input /></Form.Item>
      </Space><Button htmlType="submit" loading={busy}>Lưu kết quả thông quan</Button></Form>}
    </Card>}
    <Card title={closed ? 'Quyết toán đã đóng' : 'Thu tiền và phụ thu'}>
      <Space wrap><Tag>Giá đã đặt: {money(f.base)}</Tag><Tag>Phụ thu đã duyệt: {money(f.extra)}</Tag><Tag color="green">Đã thu: {money(f.paid)}</Tag><Tag color={f.outstanding ? 'orange' : 'green'}>Còn phải thu: {money(f.outstanding)}</Tag></Space>
      <p>Tiền cước và tiền cọc theo thanh toán của đơn. Chứng từ bên dưới ghi nhận thu các khoản phụ thu đã duyệt.</p>
      <p>Đã hoàn: {money(f.refunded)} · Đã bồi thường: {money(f.compensated)} · Thu ròng sau các khoản chi đã ghi nhận: {money(f.netReceived)}</p>
      <Table size="small" rowKey="_id" dataSource={order.settlement?.surcharges || []} columns={[
        { title: 'Phụ thu', dataIndex: 'description' }, { title: 'Số tiền', render: (_, x) => money(x.amountVnd) },
        { title: 'Trạng thái', render: (_, x) => ({ PENDING: 'Chờ quản lý duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối' })[x.status] },
        { title: 'Xử lý', render: (_, x) => manager && !closed && x.status === 'PENDING' && <Space><Button disabled={busy} onClick={() => act('REVIEW_SURCHARGE', { itemId: x._id, status: 'APPROVED' })}>Duyệt</Button><Button disabled={busy} onClick={() => act('REVIEW_SURCHARGE', { itemId: x._id, status: 'REJECTED' })}>Từ chối</Button></Space> }
      ]} />
      {operational && !closed && <Form form={chargeForm} layout="inline" onFinish={values => act('SURCHARGE', values)}><Form.Item name="description" rules={[{ required: true }]}><Input placeholder="Lý do / dịch vụ phát sinh" /></Form.Item><Form.Item name="amountVnd" rules={[{ required: true }]}><InputNumber min={1} precision={0} placeholder="Số tiền VND" /></Form.Item><Button htmlType="submit" disabled={busy}>Đề xuất phụ thu</Button></Form>}
      <Table style={{ marginTop: 16 }} size="small" rowKey="_id" dataSource={order.settlement?.receipts || []} columns={[{ title: 'Chứng từ thu phụ thu', dataIndex: 'reference' }, { title: 'Số tiền', render: (_, r) => money(r.amountVnd) }, { title: 'Hình thức', render: (_, r) => r.method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản' }, { title: 'Ngày thu', render: (_, r) => date(r.at) }]} />
      {manager && !closed && <><Form form={receiptForm} layout="inline" onFinish={values => act('RECEIPT', values)}><Form.Item name="reference" rules={[{ required: true }]}><Input placeholder="Mã chứng từ thu" /></Form.Item><Form.Item name="amountVnd" rules={[{ required: true }]}><InputNumber min={1} precision={0} placeholder="VND" /></Form.Item><Form.Item name="method" rules={[{ required: true }]}><Select style={{ width: 150 }} placeholder="Hình thức" options={[{ value: 'CASH', label: 'Tiền mặt' }, { value: 'BANK_TRANSFER', label: 'Chuyển khoản' }]} /></Form.Item><Button htmlType="submit" disabled={busy}>Xác nhận đã thu</Button></Form><Button style={{ marginTop: 16 }} type="primary" disabled={busy || order.status !== 'COMPLETED' || f.outstanding > 0 || !route?.distanceVerifiedAt || order.settlement?.surcharges?.some(s => s.status === 'PENDING')} onClick={() => act('CLOSE')}>Đóng đơn và quyết toán</Button></>}
      {closed && <p>Đóng lúc {date(order.settlement.closedAt)}</p>}
    </Card>
  </Space>;
}
