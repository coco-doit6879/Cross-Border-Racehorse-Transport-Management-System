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
  const isCustomer = user?.role === 'CUSTOMER';
  const totalKm =
    route?.odometerEnd != null && route?.odometerStart != null
      ? (route.previousVehicleDistanceKm || 0) + route.odometerEnd - route.odometerStart
      : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {order.operationsNotices?.length > 0 && (
        <Alert
          type="info"
          showIcon
          style={{ borderRadius: 8 }}
          message="Thông báo cập nhật tiến độ"
          description={
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {order.operationsNotices
                .slice(-3)
                .reverse()
                .map((n) => (
                  <li key={n._id}>
                    {date(n.at)} — {n.message}
                  </li>
                ))}
            </ul>
          }
        />
      )}

      {/* 1. Digital POD Acceptance Form (Show FIRST for Customer when delivering) */}
      {isCustomer && route?.status === 'DELIVERING' && (
        <DeliveryAcceptance
          order={order}
          route={route}
          onChanged={() => {
            load();
            onChanged?.();
          }}
        />
      )}

      {/* 2. Manager Incident / Cancel actions */}
      {manager && route?.status === 'INCIDENT_HANDLING' && (
        <RescueTransfer order={order} route={route} recover={recover} busy={busy} />
      )}

      {manager && route?.status === 'SCHEDULED' && (
        <Card
          title="Hủy chuyến đã phân công (chưa nhận ngựa)"
          style={{ borderRadius: 10, border: '1px solid #E2E8F0' }}
        >
          <Form onFinish={(v) => recover('CANCEL_ASSIGNED', v)}>
            <Form.Item name="reason" rules={[{ required: true, whitespace: true }]}>
              <Input.TextArea placeholder="Lý do hủy bắt buộc; hoàn tiền được xử lý riêng" />
            </Form.Item>
            <Button danger htmlType="submit" loading={busy}>
              Hủy chuyến chưa khởi hành
            </Button>
          </Form>
        </Card>
      )}

      {/* 3. Transport Operations & Vehicle Info */}
      <Card
        style={{
          borderRadius: 10,
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
              Vận đơn và hành trình vận chuyển
            </span>
            <Button size="small" onClick={load} style={{ fontSize: 12 }}>
              Làm mới
            </Button>
          </div>
        }
      >
        {/* Stages Strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 10,
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            padding: 12,
            marginBottom: 16
          }}
        >
          {stages.map(([label, value]) => (
            <div key={label}>
              <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginTop: 2 }}>{value}</div>
            </div>
          ))}
        </div>

        {order.confirmationNotes && (
          <Alert message={`Phản hồi khách hàng: ${order.confirmationNotes}`} style={{ marginBottom: 12 }} />
        )}

        {isCustomer && ['PENDING', 'CHANGES_REQUESTED'].includes(order.customerConfirmation) && (
          <div
            style={{
              background: '#F8FAFC',
              padding: 14,
              borderRadius: 8,
              border: '1px solid #E2E8F0',
              marginBottom: 16
            }}
          >
            <p style={{ margin: '0 0 10px 0', fontSize: 13, color: '#334155' }}>
              Vui lòng kiểm tra lại hành trình, danh sách ngựa, giá cước và ghi chú trước khi xác nhận đơn.
            </p>
            <Input.TextArea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Nội dung yêu cầu điều chỉnh (nếu có)"
              style={{ marginBottom: 10 }}
            />
            <Space>
              <Button
                disabled={busy}
                type="primary"
                onClick={() => act('CONFIRM')}
                style={{ background: '#0F3E2E', borderColor: '#0F3E2E' }}
              >
                Xác nhận thông tin
              </Button>
              <Button disabled={busy || !notes.trim()} onClick={() => act('REQUEST_CHANGES', { notes })}>
                Yêu cầu sửa đổi
              </Button>
            </Space>
          </div>
        )}

        {operational && order.customerConfirmation === 'CHANGES_REQUESTED' && (
          <div style={{ marginBottom: 16 }}>
            <Input.TextArea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi chú chăm sóc đã chỉnh sửa. Nếu đổi tuyến/ngựa/giá: hủy bản nháp và tạo lại."
              style={{ marginBottom: 8 }}
            />
            <Button disabled={busy || !notes.trim()} onClick={() => act('RESUBMIT', { notes })}>
              Gửi lại khách kiểm tra
            </Button>
          </div>
        )}

        {/* Vehicle & Odometer Metrics */}
        {route && (
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: '#475569', marginBottom: 10 }}>
                Xe chuyên dụng: <strong style={{ color: '#0F172A' }}>{route.vehiclePlateNumber}</strong> · Tài xế nhận chuyến:{' '}
                <strong style={{ color: '#0F172A' }}>{date(route.acceptedAt)}</strong>
              </div>

              {/* Odometer Metric Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: 10,
                  marginBottom: 12
                }}
              >
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Km xuất phát</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                    {route.odometerStart != null ? `${route.odometerStart.toLocaleString('vi-VN')} km` : 'Chưa ghi'}
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Km kết thúc</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                    {route.odometerEnd != null ? `${route.odometerEnd.toLocaleString('vi-VN')} km` : 'Chưa ghi'}
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Tổng cự ly xe chạy</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0F3E2E', marginTop: 2 }}>
                    {totalKm != null ? `${totalKm.toLocaleString('vi-VN')} km` : 'Chưa có'}
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Đối soát quãng đường</div>
                  <div style={{ marginTop: 4 }}>
                    <Tag
                      style={{
                        background: route.distanceVerifiedAt ? '#F0FDF4' : '#FFFBEB',
                        color: route.distanceVerifiedAt ? '#166534' : '#92400E',
                        border: `1px solid ${route.distanceVerifiedAt ? '#BBF7D0' : '#FDE68A'}`,
                        fontWeight: 600,
                        margin: 0
                      }}
                    >
                      {route.distanceVerifiedAt ? 'Đã đối soát' : 'Chờ xác nhận'}
                    </Tag>
                  </div>
                </div>
              </div>

              {coordinator && !closed && (
                <Button
                  size="small"
                  disabled={busy || route.odometerEnd == null || !!route.distanceVerifiedAt}
                  onClick={() => act('VERIFY_DISTANCE', {}, true)}
                  style={{ marginBottom: 12 }}
                >
                  Xác nhận km thực tế
                </Button>
              )}
            </div>

            {/* Horse status on vehicle */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 8 }}>
                Trạng thái ngựa trên chuyến:
              </div>
              <Table
                size="small"
                pagination={false}
                rowKey="_id"
                dataSource={order.horseIds}
                columns={[
                  {
                    title: 'Ngựa',
                    dataIndex: 'name',
                    render: (t) => <strong style={{ color: '#0F172A' }}>{t}</strong>
                  },
                  { title: 'Mã chip', dataIndex: 'microchipId' },
                  {
                    title: 'Vị trí hiện tại',
                    render: (_, horse) => {
                      const m = route.horseMovements?.find((x) => x.horseId === horse._id);
                      if (m?.unloadedAt) {
                        return <Tag style={{ background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0' }}>Đã bàn giao · {date(m.unloadedAt)}</Tag>;
                      }
                      if (m?.loadedAt) {
                        return <Tag style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE' }}>Trên xe {route.vehiclePlateNumber}</Tag>;
                      }
                      return <Tag>Dự kiến lên xe {route.vehiclePlateNumber}</Tag>;
                    }
                  }
                ]}
              />
            </div>

            {/* Rescue History */}
            {route.rescueHistory?.map((r) => (
              <Alert
                key={r._id}
                type="info"
                style={{ marginBottom: 10, borderRadius: 6 }}
                message={`Bàn giao cứu hộ lúc ${date(r.at)}: ${r.reason}`}
                description={`${r.evidence} · ${r.acceptedAt ? `Tài xế mới nhận lúc ${date(r.acceptedAt)}` : 'Chờ tài xế mới tiếp nhận'}`}
              />
            ))}

            {/* Coordinator Plan Path form */}
            {coordinator && ['SCHEDULED', 'INCIDENT_HANDLING'].includes(route.status) && (
              <Form
                onFinish={(v) => {
                  try {
                    act('PLAN_PATH', { path: JSON.parse(v.path) }, true);
                  } catch {
                    message.error('Tọa độ phải là mảng JSON hợp lệ.');
                  }
                }}
                style={{ marginTop: 12 }}
              >
                <Form.Item name="path" label="Đường đi đã kiểm tra (mảng tọa độ GeoJSON [lng, lat])" rules={[{ required: true }]}>
                  <Input.TextArea placeholder="[[106.7008,10.7769], ...]" />
                </Form.Item>
                <Button loading={busy} htmlType="submit">
                  Lưu đường đi dự kiến
                </Button>
              </Form>
            )}
          </>
        )}
      </Card>

      {/* 4. Clearance by Checkpoint (Only show if there are records or specialist) */}
      {route && (route.clearances?.length > 0 || specialist) && (
        <Card
          style={{
            borderRadius: 10,
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}
          title={
            <div>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
                Hồ sơ thông quan cửa khẩu ({route.clearances?.length || 0})
              </span>
              <div style={{ fontSize: 12, color: '#64748B', fontWeight: 400 }}>
                Ghi nhận tình trạng kiểm dịch và hải quan tại từng cửa khẩu quốc tế
              </div>
            </div>
          }
        >
          {route.clearances?.length > 0 ? (
            <Table
              size="small"
              rowKey="_id"
              pagination={false}
              dataSource={[...(route.clearances || [])].reverse()}
              columns={[
                {
                  title: 'Ngựa',
                  render: (_, c) => order.horseIds.find((h) => h._id === c.horseId)?.name || c.horseId
                },
                { title: 'Quốc gia', dataIndex: 'countryCode' },
                { title: 'Cửa khẩu', dataIndex: 'checkpoint' },
                {
                  title: 'Kết quả',
                  render: (_, c) => {
                    const map = {
                      PENDING: { label: 'Chưa thông quan', color: '#92400E', bg: '#FEF3C7', border: '#FDE68A' },
                      CLEARED: { label: 'Đã thông quan', color: '#166534', bg: '#DCFCE7', border: '#BBF7D0' },
                      HELD: { label: 'Đang bị giữ', color: '#991B1B', bg: '#FEE2E2', border: '#FECACA' }
                    };
                    const item = map[c.status] || { label: c.status, color: '#334155', bg: '#F1F5F9', border: '#CBD5E1' };
                    return (
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: item.color,
                          backgroundColor: item.bg,
                          border: `1px solid ${item.border}`,
                          padding: '2px 8px',
                          borderRadius: 4
                        }}
                      >
                        {item.label}
                      </span>
                    );
                  }
                },
                { title: 'Số chứng từ', dataIndex: 'referenceNumber' },
                { title: 'Cập nhật', render: (_, c) => date(c.updatedAt) }
              ]}
            />
          ) : (
            <div style={{ color: '#64748B', fontSize: 13 }}>Chưa có thông tin thông quan cửa khẩu.</div>
          )}

          {specialist && !closed && (
            <div style={{ marginTop: 14, background: '#F8FAFC', padding: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8, color: '#0F172A' }}>
                Cập nhật kết quả thông quan
              </span>
              <Form form={clearForm} layout="vertical" onFinish={(values) => act('CLEARANCE', values, true)}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                  <Form.Item name="horseId" label="Ngựa" rules={[{ required: true }]}>
                    <Select options={order.horseIds.map((h) => ({ value: h._id, label: h.name }))} />
                  </Form.Item>
                  <Form.Item name="countryCode" label="Mã quốc gia" rules={[{ required: true }, { pattern: /^[A-Z]{2}$/ }]}>
                    <Input maxLength={2} placeholder="VN / KH / TH" />
                  </Form.Item>
                  <Form.Item name="checkpoint" label="Cửa khẩu" rules={[{ required: true }]}>
                    <Input placeholder="Mộc Bài / Bavet" />
                  </Form.Item>
                  <Form.Item name="status" label="Kết quả" rules={[{ required: true }]}>
                    <Select
                      options={[
                        { value: 'PENDING', label: 'Chưa thông quan' },
                        { value: 'CLEARED', label: 'Đã thông quan' },
                        { value: 'HELD', label: 'Đang bị giữ' }
                      ]}
                    />
                  </Form.Item>
                  <Form.Item name="referenceNumber" label="Số chứng từ">
                    <Input />
                  </Form.Item>
                  <Form.Item name="notes" label="Ghi chú">
                    <Input />
                  </Form.Item>
                </div>
                <Button htmlType="submit" loading={busy} type="primary" style={{ background: '#0F3E2E', borderColor: '#0F3E2E' }}>
                  Lưu kết quả thông quan
                </Button>
              </Form>
            </div>
          )}
        </Card>
      )}

      {/* 5. Settlement & Surcharges (Phụ thu và quyết toán tài chính) */}
      <Card
        style={{
          borderRadius: 10,
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
        title={
          <div>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
              {closed ? 'Quyết toán đơn hàng đã đóng' : 'Đối soát tài chính & phụ thu'}
            </span>
          </div>
        }
      >
        {/* Financial KPI stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 10,
            marginBottom: 16
          }}
        >
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Giá đã đặt</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>{money(f.base)}</div>
          </div>
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Phụ thu đã duyệt</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>{money(f.extra)}</div>
          </div>
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Đã thu</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#166534', marginTop: 2 }}>{money(f.paid)}</div>
          </div>
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Còn phải thu</div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: f.outstanding ? '#B45309' : '#166534',
                marginTop: 2
              }}
            >
              {money(f.outstanding)}
            </div>
          </div>
        </div>

        {/* Surcharges list if any */}
        {(order.settlement?.surcharges?.length > 0 || operational) && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 8 }}>
              Các khoản phụ thu phát sinh:
            </div>
            {order.settlement?.surcharges?.length > 0 && (
              <Table
                size="small"
                pagination={false}
                rowKey="_id"
                dataSource={order.settlement.surcharges}
                columns={[
                  { title: 'Nội dung', dataIndex: 'description' },
                  { title: 'Số tiền', render: (_, x) => money(x.amountVnd) },
                  {
                    title: 'Trạng thái',
                    render: (_, x) => ({ PENDING: 'Chờ quản lý duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối' })[x.status]
                  },
                  {
                    title: 'Thao tác',
                    render: (_, x) =>
                      manager &&
                      !closed &&
                      x.status === 'PENDING' && (
                        <Space>
                          <Button size="small" disabled={busy} onClick={() => act('REVIEW_SURCHARGE', { itemId: x._id, status: 'APPROVED' })}>
                            Duyệt
                          </Button>
                          <Button size="small" disabled={busy} onClick={() => act('REVIEW_SURCHARGE', { itemId: x._id, status: 'REJECTED' })}>
                            Từ chối
                          </Button>
                        </Space>
                      )
                  }
                ]}
              />
            )}

            {operational && !closed && (
              <Form form={chargeForm} layout="inline" style={{ marginTop: 10 }} onFinish={(values) => act('SURCHARGE', values)}>
                <Form.Item name="description" rules={[{ required: true }]}>
                  <Input placeholder="Lý do / dịch vụ phát sinh" />
                </Form.Item>
                <Form.Item name="amountVnd" rules={[{ required: true }]}>
                  <InputNumber min={1} precision={0} placeholder="Số tiền VND" />
                </Form.Item>
                <Button htmlType="submit" disabled={busy}>
                  Đề xuất phụ thu
                </Button>
              </Form>
            )}
          </div>
        )}

        {/* Receipts list */}
        {order.settlement?.receipts?.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 8 }}>
              Chứng từ thu:
            </div>
            <Table
              size="small"
              pagination={false}
              rowKey="_id"
              dataSource={order.settlement.receipts}
              columns={[
                { title: 'Chứng từ', dataIndex: 'reference' },
                { title: 'Số tiền', render: (_, r) => money(r.amountVnd) },
                { title: 'Hình thức', render: (_, r) => (r.method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản') },
                { title: 'Ngày thu', render: (_, r) => date(r.at) }
              ]}
            />
          </div>
        )}

        {/* Manager settlement close button */}
        {manager && !closed && (
          <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 12, marginTop: 12 }}>
            <Form form={receiptForm} layout="inline" onFinish={(values) => act('RECEIPT', values)} style={{ marginBottom: 10 }}>
              <Form.Item name="reference" rules={[{ required: true }]}>
                <Input placeholder="Mã chứng từ thu" />
              </Form.Item>
              <Form.Item name="amountVnd" rules={[{ required: true }]}>
                <InputNumber min={1} precision={0} placeholder="Số tiền VND" />
              </Form.Item>
              <Form.Item name="method" rules={[{ required: true }]}>
                <Select
                  style={{ width: 140 }}
                  placeholder="Hình thức"
                  options={[
                    { value: 'CASH', label: 'Tiền mặt' },
                    { value: 'BANK_TRANSFER', label: 'Chuyển khoản' }
                  ]}
                />
              </Form.Item>
              <Button htmlType="submit" disabled={busy}>
                Xác nhận đã thu
              </Button>
            </Form>

            <Button
              type="primary"
              disabled={busy || order.status !== 'COMPLETED' || f.outstanding > 0 || !route?.distanceVerifiedAt || order.settlement?.surcharges?.some((s) => s.status === 'PENDING')}
              onClick={() => act('CLOSE')}
              style={{ background: '#0F3E2E', borderColor: '#0F3E2E' }}
            >
              Đóng đơn và quyết toán
            </Button>
          </div>
        )}

        {closed && (
          <div style={{ color: '#166534', fontSize: 12, marginTop: 8, fontWeight: 500 }}>
            Đơn hàng đã quyết toán và đóng sổ vào lúc: {date(order.settlement.closedAt)}
          </div>
        )}
      </Card>

      {/* 6. Exception Requests & Claims (Placed cleanly at the bottom) */}
      <ExceptionRequests
        order={order}
        manager={manager}
        busy={busy}
        act={act}
        recover={recover}
        destinationOptions={data.destinationOptions}
      />
    </div>
  );
}
