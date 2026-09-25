import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Input, Modal, Select, Space, Table, Tag, message } from 'antd';
import { useHorseStore } from '../../store/useHorseStore';
import { useAuthStore } from '../../store/useAuthStore';
import HorseProfileForm, { canReviewHorse, reviewColors, reviewLabels } from './HorseProfileForm';

export default function HorseList() {
  const navigate = useNavigate();
  const { horses, fetchHorses, addHorse, loading, error } = useHorseStore();
  const user = useAuthStore((state) => state.user);
  const reviewer = canReviewHorse(user);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
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
  const filtered = horses.filter((h) => (status === 'ALL' || h.reviewStatus === status) && `${h.name} ${h.microchipId} ${h.feiPassportNo}`.toLowerCase().includes(search.toLowerCase()));
  const columns = [
    { title: 'Tên ngựa', dataIndex: 'name', render: (name, h) => <div><strong>{name}</strong><div>{h.ownerName}</div></div> },
    { title: 'Mã vi chip', dataIndex: 'microchipId' },
    { title: 'Số hộ chiếu', dataIndex: 'feiPassportNo' },
    { title: 'Giống ngựa', dataIndex: 'breed' },
    { title: 'Địa điểm hiện tại', dataIndex: 'currentStopId', render: (value) => value || <Tag color="red">Chưa khai báo</Tag> },
    { title: 'Tuổi / Cân nặng', render: (_, h) => `${h.age} • ${h.weight || '—'} kg` },
    { title: 'Kiểm duyệt sức khỏe', dataIndex: 'reviewStatus', render: (value) => <Tag color={reviewColors[value]}>{reviewLabels[value]}</Tag> },
    { title: 'Thao tác', render: (_, h) => <Button onClick={() => navigate(`/horses/${h.id}`)}>{reviewer ? 'Xem & kiểm duyệt' : 'Hồ sơ & giấy tờ'}</Button> }
  ];
  return <Space direction="vertical" size={20} style={{ width: '100%' }}>
    <Card title={reviewer ? 'Kiểm duyệt hồ sơ & sức khỏe ngựa' : 'Hồ sơ đàn ngựa'} extra={user?.role === 'CUSTOMER' && <Button type="primary" onClick={() => setOpen(true)}>Thêm ngựa mới</Button>}>
      <p>{reviewer ? 'Đối chiếu nhận dạng, hộ chiếu và hồ sơ tiêm chủng trước khi duyệt sức khỏe.' : 'Khai báo thông tin và gửi hồ sơ cho Chuyên viên Thủ tục & Kiểm dịch.'}</p>
      <Space wrap>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm tên ngựa, mã chip, số hộ chiếu" style={{ width: 320 }} allowClear />
        <Select value={status} onChange={setStatus} style={{ width: 220 }} options={[{ value: 'ALL', label: 'Tất cả trạng thái' }, ...Object.entries(reviewLabels).map(([value, label]) => ({ value, label }))]} />
        <Button onClick={() => fetchHorses().catch(() => {})}>Tải lại</Button>
      </Space>
    </Card>
    {error && <Alert type="error" showIcon message={error} />}
    <Table columns={columns} dataSource={filtered} rowKey="id" loading={loading} scroll={{ x: 950 }} pagination={{ pageSize: 8 }} />
    <Modal title="Đăng ký hồ sơ ngựa mới" open={open} onCancel={() => !saving && setOpen(false)} footer={null} width={1000} maskClosable={false}>
      {open && <HorseProfileForm onSave={create} saving={saving} />}
    </Modal>
  </Space>;
}
