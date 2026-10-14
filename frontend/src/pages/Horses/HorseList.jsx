import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Input, Modal, Select, Table, message } from 'antd';
import { useHorseStore } from '../../store/useHorseStore';
import { useAuthStore } from '../../store/useAuthStore';
import { DataPanel, Metrics, StatusPill, Workspace } from '../../components/operations/OperationsUI';
import HorseProfileForm, { canReviewHorse, reviewLabels } from './HorseProfileForm';

export default function HorseList() {
  const navigate = useNavigate();
  const { horses, fetchHorses, addHorse, loading, error } = useHorseStore();
  const user = useAuthStore((state) => state.user);
  const reviewer = canReviewHorse(user);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(reviewer ? 'PENDING_REVIEW' : 'ALL');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => { fetchHorses().catch(() => {}); }, [fetchHorses]);
  const create = async (values) => {
    setSaving(true);
    try {
      await addHorse(values);
      message.success('Đã gửi hồ sơ ngựa. Vui lòng chờ kiểm duyệt sức khỏe.');
      setOpen(false);
    } catch (err) { message.error(err.response?.data?.message || 'Không thể tạo hồ sơ.'); }
    finally { setSaving(false); }
  };
  const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const query = normalize(search.trim());
  const filtered = horses.filter((horse) => (status === 'ALL' || horse.reviewStatus === status)
    && normalize([horse.name, horse.microchipId, horse.feiPassportNo, horse.ownerName].join(' ')).includes(query));
  const countByStatus = (value) => horses.filter((horse) => horse.reviewStatus === value).length;
  const columns = [
    { title: 'Tên ngựa / Chủ sở hữu', dataIndex: 'name', width: 210, render: (name, horse) => <div><strong>{name}</strong><div className="ops-secondary">{horse.ownerName || 'Chưa có thông tin chủ sở hữu'}</div></div> },
    { title: 'Mã vi chip', dataIndex: 'microchipId', width: 160 },
    { title: 'Số hộ chiếu', dataIndex: 'feiPassportNo', width: 150 },
    { title: 'Giống ngựa', dataIndex: 'breed', width: 140 },
    { title: 'Địa điểm hiện tại', dataIndex: 'currentStopId', width: 170, render: (value) => value || <StatusPill value="PENDING" label="Chưa khai báo" /> },
    { title: 'Tuổi / Cân nặng', width: 150, render: (_, horse) => `${horse.age} tuổi / ${horse.weight || '—'} kg` },
    { title: 'Kiểm duyệt sức khỏe', dataIndex: 'reviewStatus', width: 210, render: (value) => <StatusPill value={value} label={reviewLabels[value] || value} /> },
    { title: 'Thao tác', width: 180, render: (_, horse) => <Button onClick={() => navigate(`/horses/${horse.id}`)}>{reviewer ? 'Xem & kiểm duyệt' : 'Hồ sơ & giấy tờ'}</Button> }
  ];
  return <Workspace
    eyebrow={reviewer ? 'Thủ tục & kiểm dịch' : 'Quản lý hồ sơ'}
    title={reviewer ? 'Kiểm duyệt sức khỏe ngựa' : 'Hồ sơ đàn ngựa'}
    description={reviewer ? 'Đối chiếu nhận dạng, hộ chiếu và hồ sơ tiêm chủng trước khi duyệt sức khỏe.' : 'Khai báo thông tin và gửi hồ sơ cho chuyên viên thủ tục & kiểm dịch.'}
    actions={user?.role === 'CUSTOMER' && <Button type="primary" onClick={() => setOpen(true)}>Thêm ngựa mới</Button>}
  >
    <Metrics items={[
      { label: 'Tổng hồ sơ', value: horses.length, detail: 'Trong phạm vi quản lý của bạn' },
      { label: 'Chờ duyệt', value: countByStatus('PENDING_REVIEW'), detail: 'Chờ đối chiếu sức khỏe' },
      { label: 'Đã duyệt', value: countByStatus('APPROVED'), detail: 'Đã hoàn tất kiểm duyệt' },
      { label: 'Cần xử lý', value: countByStatus('REJECTED'), detail: 'Cần bổ sung hoặc không đạt' }
    ]} />
    {error && <Alert type="error" message={error} />}
    <DataPanel title="Danh sách hồ sơ" description="Tìm theo tên ngựa, chủ sở hữu, mã vi chip hoặc số hộ chiếu." extra={<span className="ops-secondary" aria-live="polite">{filtered.length} / {horses.length} hồ sơ</span>}>
      <div className="ops-toolbar" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <Input aria-label="Tìm hồ sơ ngựa" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tên ngựa, chủ sở hữu, mã chip, hộ chiếu" style={{ flex: '1 1 280px', minWidth: 0 }} allowClear />
        <Select aria-label="Lọc trạng thái kiểm duyệt" value={status} onChange={setStatus} style={{ flex: '0 1 240px', minWidth: 0, width: '100%' }} options={[{ value: 'ALL', label: 'Tất cả trạng thái' }, ...Object.entries(reviewLabels).map(([value, label]) => ({ value, label }))]} />
        <Button loading={loading} onClick={() => fetchHorses().catch(() => {})}>Tải lại</Button>
      </div>
      <Table columns={columns} dataSource={filtered} rowKey="id" loading={loading} scroll={{ x: 1370 }} pagination={{ pageSize: 8 }} locale={{ emptyText: 'Không có hồ sơ phù hợp.' }} />
    </DataPanel>
    <Modal title="Đăng ký hồ sơ ngựa mới" open={open} onCancel={() => !saving && setOpen(false)} footer={null} width={1000} maskClosable={false}>
      {open && <HorseProfileForm onSave={create} saving={saving} />}
    </Modal>
  </Workspace>;
}
