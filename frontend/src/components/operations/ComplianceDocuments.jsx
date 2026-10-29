import React, { useEffect, useState, useCallback } from 'react';
import { Alert, Button, Card, Input, Select, Space, Tag, message } from 'antd';
import api from '../../services/apiClient';
import { horseApi } from '../../services/horseApi';
import './compliance-clarity.css';

export default function ComplianceDocuments({ orderId, specialist = false, customer = false, onChanged }) {
  const [review, setReview] = useState({});
  const [orderStatus, setOrderStatus] = useState('');
  const [docs, setDocs] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [type, setType] = useState('');
  const [reason, setReason] = useState('');
  const [files, setFiles] = useState({});
  const [notes, setNotes] = useState({});
  const [expiry, setExpiry] = useState({});
  const [category, setCategory] = useState('LEGAL');
  const [stage, setStage] = useState('DEPARTURE');
  const [checkpoint, setCheckpoint] = useState('');
  const [references, setReferences] = useState({});
  const load = useCallback(async () => {
    try { const r = await api.get(`/compliance/checklist/${orderId}`); setDocs(r.data.data); setReview(r.data.departureReview || {}); setOrderStatus(r.data.orderStatus); setError(''); }
    catch (e) { setError(e.response?.data?.message || 'Không thể tải yêu cầu giấy tờ.'); }
  }, [orderId]);
  useEffect(() => { load(); const timer = setInterval(load, 30000); return () => clearInterval(timer); }, [load]);
  const act = async (fn) => {
    setBusy(true);
    try { await fn(); message.success('Đã cập nhật giấy tờ.'); await load(); onChanged?.(); }
    catch (e) { message.error(e.response?.data?.message || e.message || 'Không thể cập nhật.'); }
    finally { setBusy(false); }
  };
  const open = async (doc) => {
    try {
      const r = await api.get(`/compliance/${doc._id}/file`, { responseType: 'blob' }); const blobUrl = URL.createObjectURL(r.data);
      const link = document.createElement('a'); link.href = blobUrl; link.download = 'giay-to'; link.click(); setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (e) { message.error(e.message || 'Không thể mở tệp.'); }
  };
  const pendingReview = docs.filter(doc => doc.status === 'PENDING_REVIEW').length;
  const waitingUpload = docs.filter(doc => ['PENDING_UPLOAD', 'REJECTED'].includes(doc.status)).length;
  const expired = docs.filter(doc => (doc.stage || 'DEPARTURE') === 'DEPARTURE' && doc.expiresAt && new Date(doc.expiresAt) < new Date()).length;
  const guidance = review.confirmedAt
    ? 'Đã xác nhận hồ sơ khởi hành. Chỉ bổ sung giấy tờ khi phát sinh yêu cầu mới.'
    : customer ? 'Nộp tệp tại các mục cần bổ sung bên dưới. Chuyên viên sẽ kiểm tra và xác nhận.'
    : expired ? `Có ${expired} giấy tờ khởi hành đã hết hạn. Cần cập nhật trước khi xác nhận.`
    : pendingReview ? `Có ${pendingReview} giấy tờ chờ duyệt. Mở từng mục bên dưới để kiểm tra.`
    : waitingUpload ? `Có ${waitingUpload} giấy tờ cần bổ sung hoặc nộp lại. Kiểm tra các mục bên dưới.`
    : specialist ? 'Kiểm tra hồ sơ. Nếu đã đầy đủ, bấm xác nhận khởi hành; nếu còn thiếu, tạo yêu cầu bổ sung.'
    : 'Chuyên viên đang kiểm tra hồ sơ khởi hành.';
  return (
    <Card
      className="compliance-clarity"
      style={{
        borderRadius: 10,
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}
      title={
        <div>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
            Giấy tờ & điều kiện khởi hành
          </span>
          <div style={{ fontSize: 13, color: '#64748B', fontWeight: 400 }}>
            Kiểm tra giấy tờ trước khi tài xế bắt đầu chuyến
          </div>
        </div>
      }
      extra={
        <Button size="small" onClick={load} style={{ fontSize: 13 }}>
          Làm mới
        </Button>
      }
    >
      {error && <Alert type="error" message={error} style={{ marginBottom: 14 }} />}
    <div className={`compliance-state ${review.confirmedAt ? 'is-complete' : ''}`} role="status"><span className="compliance-state-icon" aria-hidden="true">{review.confirmedAt ? '✓' : '1'}</span><div><strong>{review.confirmedAt ? 'Đã xác nhận hồ sơ khởi hành' : 'Chưa xác nhận hồ sơ khởi hành'}</strong><p>{guidance}</p></div></div>
    <details className="compliance-help"><summary>Giấy tờ khởi hành khác thông quan thế nào?</summary><p>Ở đây, chuyên viên kiểm tra giấy tờ để xe được khởi hành. Khi xe đến cửa khẩu, kết quả xử lý thực tế của từng ngựa được ghi riêng tại mục “Kết quả tại cửa khẩu”.</p></details>
    {specialist && !review.confirmedAt && ['APPROVED', 'DOCS_PROCESSING', 'CLEARED_FOR_TRANSPORT'].includes(orderStatus) && <Button style={{ marginBottom: 20 }} type="primary" loading={busy} disabled={docs.some(d => (d.stage || 'DEPARTURE') === 'DEPARTURE' && (d.status !== 'APPROVED' || (d.expiresAt && new Date(d.expiresAt) < new Date())))} onClick={() => act(() => api.post('/compliance/checklist/' + orderId + '/confirm-departure'))}>Xác nhận hồ sơ đủ điều kiện khởi hành</Button>}
    {specialist && <details className="compliance-help"><summary>Thiếu giấy tờ? Tạo yêu cầu bổ sung</summary><Space direction="vertical" style={{ width: '100%' }}>
      <Select aria-label="Nhóm hồ sơ" value={category} onChange={setCategory} options={[{ value: 'LEGAL', label: 'Giấy tờ pháp lý — vận hành xử lý' }, { value: 'HORSE', label: 'Hồ sơ ngựa — khách hoặc vận hành bổ sung' }]} style={{ width: '100%', minWidth: 0 }} />
      <Select aria-label="Mốc cần hồ sơ" value={stage} onChange={setStage} options={[{ value: 'DEPARTURE', label: 'Trước khởi hành' }, { value: 'BORDER', label: 'Tại cửa khẩu' }, { value: 'DELIVERY', label: 'Khi giao nhận' }]} style={{ width: '100%', minWidth: 0 }} />
      {stage === 'BORDER' && <Input placeholder="Tên cửa khẩu (trùng tên điểm trên vận đơn)" value={checkpoint} onChange={e => setCheckpoint(e.target.value)} />}
      <Input aria-label="Loại giấy tờ cần bổ sung" maxLength={150} placeholder="Loại giấy tờ: ví dụ giấy phép nhập khẩu" value={type} onChange={e => setType(e.target.value)} />
      <Input.TextArea aria-label="Nội dung yêu cầu" maxLength={2000} placeholder="Ghi rõ cần bổ sung gì, cho ngựa nào và lý do" value={reason} onChange={e => setReason(e.target.value)} />
      <Button type="primary" loading={busy} disabled={!type.trim() || !reason.trim() || (stage === 'BORDER' && !checkpoint.trim())} onClick={() => act(async () => { await api.post('/compliance/requests', { orderId, documentType: type, requestReason: reason, category, stage, checkpoint }); setType(''); setReason(''); })}>Thêm mục hồ sơ</Button>
    </Space></details>}
    {!docs.length && !error && <p className="compliance-empty">Không có yêu cầu bổ sung giấy tờ.{review.confirmedAt ? ' Hồ sơ khởi hành đã được xác nhận.' : ' Trạng thái xác nhận khởi hành được hiển thị ở trên.'}</p>}
    {docs.map(doc => <Card key={doc._id} size="small" style={{ marginBottom: 12 }} title={doc.documentType} extra={<Tag>{({ PENDING_UPLOAD: 'Cần bổ sung', PENDING_REVIEW: 'Chờ thẩm định', APPROVED: 'Đã duyệt', REJECTED: 'Cần nộp lại' })[doc.status]}</Tag>}>
      <Tag>{doc.category === 'HORSE' ? 'Hồ sơ ngựa' : 'Giấy tờ pháp lý'}</Tag><Tag>{({ DEPARTURE: 'Trước khởi hành', BORDER: 'Tại cửa khẩu', DELIVERY: 'Khi giao nhận' })[doc.stage || 'DEPARTURE']}</Tag>
      <p>{doc.checkpoint} {doc.referenceNumber && `· Số chứng từ: ${doc.referenceNumber}`}</p>
      <p><strong>{doc.category === 'HORSE' ? 'Khách hàng bổ sung · Chuyên viên thẩm định' : 'Chuyên viên cập nhật và thẩm định'}</strong></p>
      <p>{doc.requestReason || 'Bổ sung giấy tờ cho chuyến vận chuyển.'}</p>
      {doc.rejectionReason && <Alert type="warning" message={`Lý do cần bổ sung lại: ${doc.rejectionReason}`} />}
      {doc.fileUrl && <Button onClick={() => open(doc)}>Tải giấy tờ đã nộp</Button>}
      {(specialist || (customer && doc.category === 'HORSE')) && ['PENDING_UPLOAD', 'REJECTED'].includes(doc.status) && <Space direction="vertical" style={{ display: 'flex', marginTop: 12 }}>
        <Input placeholder="Số chứng từ (nếu có)" value={references[doc._id] || ''} onChange={e => setReferences({ ...references, [doc._id]: e.target.value })} />
        <label>Tệp PDF tối đa 5 MB hoặc ảnh JPG/PNG/WebP dưới 500 KB<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={e => setFiles({ ...files, [doc._id]: e.target.files[0] })} /></label>
        <label>Ngày hết hạn (nếu có) <input type="date" value={expiry[doc._id] || ''} onChange={e => setExpiry({ ...expiry, [doc._id]: e.target.value })} /></label>
        <Button type="primary" loading={busy} disabled={!files[doc._id]} onClick={() => act(async () => { const file = files[doc._id]; if (file.size >= (file.type.startsWith('image/') ? 500 * 1024 : 5 * 1024 * 1024)) throw new Error('Tệp vượt giới hạn dung lượng.'); const r = await horseApi.uploadFile(file); await api.post('/compliance/upload', { documentId: doc._id, fileUrl: r.data.data.url, referenceNumber: references[doc._id], expiresAt: expiry[doc._id] ? `${expiry[doc._id]}T23:59:59+07:00` : null }); })}>Lưu giấy tờ để kiểm tra</Button>
      </Space>}
      {specialist && doc.status === 'PENDING_REVIEW' && <Space direction="vertical" style={{ display: 'flex', marginTop: 12 }}>
        <Input.TextArea placeholder="Kết luận hoặc lý do yêu cầu nộp lại" value={notes[doc._id] || ''} onChange={e => setNotes({ ...notes, [doc._id]: e.target.value })} />
        <Space><Button loading={busy} type="primary" onClick={() => act(() => api.patch(`/compliance/${doc._id}/verify`, { status: 'APPROVED' }))}>Duyệt</Button><Button loading={busy} disabled={!notes[doc._id]?.trim()} onClick={() => act(() => api.patch(`/compliance/${doc._id}/verify`, { status: 'REJECTED', rejectionReason: notes[doc._id] }))}>Yêu cầu nộp lại</Button></Space>
      </Space>}
      {!!doc.history?.length && <details style={{ marginTop: 12 }}><summary>Lịch sử xử lý</summary>{doc.history.map((h, i) => <p key={i}>{new Date(h.at).toLocaleString('vi-VN')} · {({ REQUESTED: 'Yêu cầu bổ sung', SUBMITTED: 'Đã nộp', APPROVED: 'Đã duyệt', REJECTED: 'Yêu cầu nộp lại' })[h.action]} {h.notes && `— ${h.notes}`}</p>)}</details>}
    </Card>)}
    </Card>
  );
}
