import React, { useState } from 'react';
import { Alert, Button, Card, Form, Input, InputNumber, Select, Space, Table, Tag, Modal } from 'antd';

const labels = { REFUND: 'Hoàn tiền', COMPENSATION: 'Bồi thường', DESTINATION_CHANGE: 'Đổi điểm giao' };
export default function ExceptionRequests({ order, manager, busy, act, recover, destinationOptions = [] }) {
  const [kind, setKind] = useState('REFUND');
  const [reasons, setReasons] = useState({});
  const confirmExecution = item => Modal.confirm({
    title: item.kind === 'DESTINATION_CHANGE' ? 'Áp dụng điểm giao đã duyệt?' : 'Bạn đã kiểm tra chứng từ và chuyển tiền thực tế?',
    content: 'Thao tác được lưu vào lịch sử, không tự gửi lệnh chuyển tiền ngân hàng.',
    onOk: () => item.kind === 'DESTINATION_CHANGE'
      ? recover('APPLY_DESTINATION', { itemId: item._id, reason: reasons[`exec-${item._id}`] })
      : act('EXECUTE_EXCEPTION', { itemId: item._id, reference: reasons[`exec-${item._id}`], confirmTransferred: true })
  });
  return <Card title="Yêu cầu ngoại lệ — quản lý duyệt từng trường hợp">
    <Alert type="info" showIcon message="Duyệt chưa đồng nghĩa đã chuyển tiền hoặc đổi điểm giao. Quản lý cần thực hiện bước riêng bên dưới. Xác nhận chi tiền chỉ ghi sổ chứng từ đã chuyển thực tế, không gọi ngân hàng chuyển tiền." />
    <Table style={{ marginTop: 16 }} rowKey="_id" dataSource={order.exceptionRequests || []} columns={[
      { title: 'Yêu cầu', render: (_, x) => <><strong>{labels[x.kind]}</strong><p>{x.reason}</p><p>Chứng từ: {x.evidence}</p><p>{x.kind === 'DESTINATION_CHANGE' ? x.proposedDestination : `${x.amountVnd?.toLocaleString('vi-VN')} VND`}</p></> },
      { title: 'Quyết định', render: (_, x) => <>
        <Tag>{({ PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt — chờ thực hiện', REJECTED: 'Từ chối', EXECUTED: 'Đã thực hiện / ghi sổ' })[x.status]}</Tag>
        <p>{x.decisionReason}</p><p>{x.executionReference}</p>
        {manager && x.status === 'APPROVED' && <Space direction="vertical">
          <Input placeholder="Mã chứng từ / lý do thực hiện" value={reasons[`exec-${x._id}`]} onChange={e => setReasons({ ...reasons, [`exec-${x._id}`]: e.target.value })} />
          <Button disabled={busy || !reasons[`exec-${x._id}`]?.trim()} onClick={() => confirmExecution(x)}>{x.kind === 'DESTINATION_CHANGE' ? 'Áp dụng điểm giao' : 'Ghi nhận đã chi tiền'}</Button>
        </Space>}
      </> },
      { title: 'Quản lý xử lý', render: (_, x) => manager && x.status === 'PENDING' && <Space direction="vertical"><Input.TextArea placeholder="Lý do quyết định (bắt buộc)" maxLength={2000} value={reasons[x._id]} onChange={e => setReasons({ ...reasons, [x._id]: e.target.value })} /><Space><Button disabled={busy || !reasons[x._id]?.trim()} onClick={() => act('REVIEW_EXCEPTION', { itemId: x._id, status: 'APPROVED', reason: reasons[x._id] })}>Duyệt</Button><Button disabled={busy || !reasons[x._id]?.trim()} onClick={() => act('REVIEW_EXCEPTION', { itemId: x._id, status: 'REJECTED', reason: reasons[x._id] })}>Từ chối</Button></Space></Space> }
    ]} />
    <Form layout="vertical" initialValues={{ kind: 'REFUND' }} onFinish={values => act('REQUEST_EXCEPTION', values)}>
      <Form.Item name="kind" label="Loại yêu cầu" rules={[{ required: true }]}><Select onChange={setKind} options={Object.entries(labels).map(([value, label]) => ({ value, label }))} /></Form.Item>
      <Form.Item name="reason" label="Lý do" rules={[{ required: true, whitespace: true }]}><Input.TextArea maxLength={2000} /></Form.Item>
      <Form.Item name="evidence" label="Mã chứng từ / mô tả bằng chứng để đối chiếu" rules={[{ required: true, whitespace: true }]}><Input.TextArea maxLength={2000} /></Form.Item>
      {kind === 'DESTINATION_CHANGE' ? <Form.Item name="proposedStopId" label="Điểm giao đề xuất (cùng quốc gia)" rules={[{ required: true }]}><Select options={destinationOptions.filter(s => s.id !== order.destinationStopId).map(s => ({ value: s.id, label: s.name }))} /></Form.Item> : <Form.Item name="amountVnd" label="Số tiền đề nghị (VND)" rules={[{ required: true }]}><InputNumber min={1} max={Number.MAX_SAFE_INTEGER} precision={0} /></Form.Item>}
      <Button htmlType="submit" loading={busy}>Gửi quản lý xem xét</Button>
    </Form>
  </Card>;
}
