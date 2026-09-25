import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Card, Checkbox, Col, Descriptions, Input, Row, Space, Spin, Tag, message } from 'antd';
import { useHorseStore } from '../../store/useHorseStore';
import { useAuthStore } from '../../store/useAuthStore';
import HorseProfileForm, { ProfileFile, canReviewHorse, reviewColors, reviewLabels } from './HorseProfileForm';

export default function PassportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchHorse, updateHorse, reviewHorse } = useHorseStore();
  const user = useAuthStore((state) => state.user);
  const [horse, setHorse] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState('');
  const [checks, setChecks] = useState([]);
  useEffect(() => {
    let active = true;
    setLoading(true); setHorse(null); setError(''); setEditing(false); setNotes(''); setChecks([]);
    fetchHorse(id).then((h) => { if (active) setHorse(h); }).catch((err) => { if (active) setError(err.response?.data?.message || 'Không thể tải hồ sơ.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, fetchHorse]);
  if (loading) return <Spin />;
  if (error || !horse) return <Alert type="error" message={error || 'Không tìm thấy hồ sơ.'} action={<Button onClick={() => navigate('/horses')}>Quay lại</Button>} />;
  const owned = String(horse.ownerId?._id || horse.ownerId) === String(user?._id || user?.id);
  const reviewer = canReviewHorse(user) && !owned;
  const save = async (values) => {
    setSaving(true);
    try { setHorse(await updateHorse(id, values)); setEditing(false); message.success('Đã gửi lại hồ sơ để duyệt sức khỏe.'); }
    catch (err) { message.error(err.response?.data?.message || 'Không thể lưu hồ sơ.'); }
    finally { setSaving(false); }
  };
  const review = async (decision) => {
    if (!notes.trim()) { message.error('Vui lòng nhập kết luận sức khỏe hoặc lý do từ chối.'); return; }
    setSaving(true);
    try {
      setHorse(await reviewHorse(id, { decision, notes, profileVersion: horse.__v }));
      setNotes(''); setChecks([]); message.success('Đã lưu kết quả kiểm duyệt.');
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể lưu kiểm duyệt.');
      if (err.response?.status === 409) {
        setChecks([]); setNotes('');
        try { setHorse(await fetchHorse(id)); } catch { setError('Không thể tải lại hồ sơ.'); }
      }
    } finally { setSaving(false); }
  };
  return <Space direction="vertical" size={20} style={{ width: '100%' }}>
    <Card title={horse.name} extra={<Button onClick={() => navigate('/horses')}>Quay lại danh sách</Button>}>
      <Tag color={reviewColors[horse.reviewStatus]}>{reviewLabels[horse.reviewStatus]}</Tag>
      {horse.reviewNotes && <Alert style={{ marginTop: 16 }} type={horse.reviewStatus === 'REJECTED' ? 'error' : 'success'} message={horse.reviewNotes} description={`Người duyệt: ${horse.reviewedBy?.fullName || horse.reviewedBy || '—'} • ${horse.reviewedAt ? new Date(horse.reviewedAt).toLocaleString('vi-VN') : ''}`} />}
      {owned && <Button style={{ marginTop: 16 }} disabled={saving} onClick={() => setEditing(!editing)}>{editing ? 'Hủy chỉnh sửa' : 'Chỉnh sửa / Bổ sung hồ sơ'}</Button>}
    </Card>
    {editing ? <HorseProfileForm horse={horse} onSave={save} saving={saving} /> : <>
      <Card title="Thông tin nhận dạng">
        <Descriptions bordered column={{ xs: 1, sm: 2 }} items={[
          ['Chủ sở hữu', horse.ownerName], ['Mã vi chip', horse.microchipId], ['Số hộ chiếu', horse.feiPassportNumber], ['Địa điểm hiện tại', horse.currentStopId], ['Giống', horse.breed], ['Ngày sinh', horse.dateOfBirth?.slice(0, 10)], ['Giới tính', { STALLION: 'Đực', MARE: 'Cái', GELDING: 'Thiến' }[horse.gender]], ['Cân nặng', `${horse.weightKg} kg`], ['Màu lông', horse.color], ['Đặc điểm nhận dạng', horse.identifyingMarks || 'Không khai báo'], ['Tiêm phòng cúm ngựa gần nhất', horse.lastVaccinationDate?.slice(0, 10)], ['Tiền sử y tế', horse.medicalHistoryNotes || 'Không khai báo']
        ].map(([label, children]) => ({ key: label, label, children: children || 'Chưa khai báo' }))} />
      </Card>
      <Row gutter={[20, 20]}>
        {[['Ảnh toàn thân', horse.photos?.[0], true], ['Ảnh khuôn mặt', horse.photos?.[1], true], ['Hộ chiếu ngựa', horse.passportScanUrl, false], ['Sổ tiêm chủng / Chứng nhận kiểm dịch', horse.vaccinationRecordUrl, false]].map(([title, value, imageOnly]) => <Col xs={24} md={12} key={title}><Card title={title}><ProfileFile value={value} imageOnly={imageOnly} disabled /></Card></Col>)}
      </Row>
    </>}
    {reviewer && horse.reviewStatus === 'PENDING_REVIEW' && <Card title="Kết luận kiểm duyệt sức khỏe">
      <p>Kiểm tra trực tiếp ảnh, hộ chiếu và hồ sơ thú y. Hồ sơ tiêm phòng cúm ngựa cần trong vòng 6 tháng theo yêu cầu khai báo.</p>
      <Checkbox.Group value={checks} onChange={setChecks} options={[{ value: 'identity', label: 'Ảnh và mã chip khớp hộ chiếu' }, { value: 'documents', label: 'Giấy tờ thú y hợp lệ' }, { value: 'health', label: 'Đủ điều kiện sức khỏe' }]} />
      <Input.TextArea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={4000} style={{ margin: '16px 0' }} placeholder="Kết luận sức khỏe hoặc lý do từ chối / yêu cầu bổ sung (bắt buộc)" />
      <Space wrap><Button type="primary" loading={saving} disabled={checks.length !== 3 || !notes.trim()} onClick={() => review('APPROVED')}>Duyệt hồ sơ sức khỏe</Button><Button danger loading={saving} disabled={!notes.trim()} onClick={() => review('REJECTED')}>Từ chối / Yêu cầu bổ sung</Button></Space>
    </Card>}
    {horse.reviewHistory?.length > 0 && <Card title="Lịch sử kiểm duyệt">{horse.reviewHistory.map((entry, i) => <p key={entry._id || i}><Tag color={reviewColors[entry.decision]}>{reviewLabels[entry.decision]}</Tag> {new Date(entry.reviewedAt).toLocaleString('vi-VN')} · {entry.notes}</p>)}</Card>}
  </Space>;
}
