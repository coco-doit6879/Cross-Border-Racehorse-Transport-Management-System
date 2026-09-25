import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Input, Modal, Select, Space, Table, Tag, message } from 'antd';
import { operationsApi } from '../../services/operationsApi';

const labels = { PENDING_UPLOAD: 'Chờ tải lên', PENDING_REVIEW: 'Chờ thẩm định', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối' };
const colors = { PENDING_UPLOAD: 'default', PENDING_REVIEW: 'orange', APPROVED: 'green', REJECTED: 'red' };

export default function ComplianceQueue() {
  const [documents, setDocuments] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [status, setStatus] = useState('PENDING_REVIEW'); const [review, setReview] = useState(null); const [reason, setReason] = useState('');
  const load = useCallback(async () => { setLoading(true); try { const response = await operationsApi.getComplianceDocuments(status ? { status } : {}); setDocuments(response.data.data); setError(''); } catch (err) { setError(err.response?.data?.message || 'Không thể tải giấy tờ.'); } finally { setLoading(false); } }, [status]);
  useEffect(() => { load(); }, [load]);
  const submit = async (decision) => {
    if (decision === 'REJECTED' && !reason.trim()) return message.error('Vui lòng nhập lý do từ chối.');
    try { await operationsApi.reviewComplianceDocument(review._id, { status: decision, rejectionReason: reason.trim() }); message.success(decision === 'APPROVED' ? 'Đã duyệt giấy tờ.' : 'Đã từ chối giấy tờ.'); setReview(null); setReason(''); load(); }
    catch (err) { message.error(err.response?.data?.message || 'Không thể lưu kết quả.'); }
  };
  return <Space direction="vertical" size={20} style={{ width: '100%' }}>
    <Card title="Hàng đợi giấy tờ kiểm dịch & thông quan" extra={<Select value={status} onChange={setStatus} style={{ width: 190 }} options={[{ value: '', label: 'Tất cả trạng thái' }, ...Object.entries(labels).map(([value, label]) => ({ value, label }))]} />}><p>Thẩm định từng giấy tờ. Khi toàn bộ giấy tờ của đơn được duyệt, hệ thống tự chuyển đơn sang đủ điều kiện vận chuyển.</p></Card>
    {error && <Alert type="error" showIcon message={error} />}
    <Table loading={loading} rowKey="_id" dataSource={documents} columns={[
      { title: 'Đơn', render: (_, item) => <><strong>{item.orderId?.bookingCode || '—'}</strong><div>{item.orderId?.customerId?.fullName}</div></> },
      { title: 'Ngựa', render: (_, item) => <><strong>{item.horseId?.name || '—'}</strong><div>{item.horseId?.microchipId}</div></> },
      { title: 'Loại giấy tờ', dataIndex: 'documentType' }, { title: 'Quốc gia', dataIndex: 'countryCode' },
      { title: 'Hết hạn', dataIndex: 'expiresAt', render: (value) => value ? new Date(value).toLocaleDateString('vi-VN') : '—' },
      { title: 'Trạng thái', dataIndex: 'status', render: (value) => <Tag color={colors[value]}>{labels[value]}</Tag> },
      { title: 'Thao tác', render: (_, item) => <Space>{item.fileUrl && <Button href={item.fileUrl} target="_blank">Mở tệp</Button>}{item.status === 'PENDING_REVIEW' && <Button type="primary" onClick={() => setReview(item)}>Thẩm định</Button>}</Space> }
    ]} />
    <Modal open={!!review} title={`Thẩm định ${review?.documentType || ''}`} onCancel={() => { setReview(null); setReason(''); }} footer={<Space><Button danger onClick={() => submit('REJECTED')}>Từ chối</Button><Button type="primary" onClick={() => submit('APPROVED')}>Duyệt giấy tờ</Button></Space>}><p>Đơn: <strong>{review?.orderId?.bookingCode}</strong> · Ngựa: <strong>{review?.horseId?.name}</strong></p><Input.TextArea rows={4} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Kết luận hoặc lý do từ chối" /></Modal>
  </Space>;
}
