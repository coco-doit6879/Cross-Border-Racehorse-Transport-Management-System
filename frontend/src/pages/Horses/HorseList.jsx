import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Modal, Drawer, Form, Select, Upload, Tabs, Tag, message, Popconfirm } from 'antd';
import {
  Plus,
  Search,
  FileCheck2,
  FileText,
  AlertCircle,
  Edit,
  MapPin,
  Trash2,
  Calendar,
  UploadCloud,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { useHorseStore } from '../../store/useHorseStore';
import { useAuthStore } from '../../store/useAuthStore';
import './HorseList.css';
import HorseIdentity from '../../components/operations/HorseIdentity';
import HorseProfileForm, { canReviewHorse } from './HorseProfileForm';
import { Alert } from 'antd';

export default function HorseList() {
  const navigate = useNavigate();
  const { horses, fetchHorses, addHorse, updateHorse, loading, error } = useHorseStore();
  const user = useAuthStore((state) => state.user);

  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState('ALL'); // ALL | READY | MISSING
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHorse, setEditingHorse] = useState(null);
  const [saving, setSaving] = useState(false);
  const reviewer = canReviewHorse(user);
  useEffect(() => {
    fetchHorses().catch(() => {});
  }, [fetchHorses]);

  const readyHorses = horses.filter((h) => h.reviewStatus === 'APPROVED');
  const missingHorses = horses.filter((h) => h.reviewStatus !== 'APPROVED');

  const filteredHorses = horses.filter((h) => {
    if (filterTab === 'READY' && h.reviewStatus !== 'APPROVED') return false;
    if (filterTab === 'MISSING' && h.reviewStatus === 'APPROVED') return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (h.name && h.name.toLowerCase().includes(q)) ||
      (h.microchipId && h.microchipId.toLowerCase().includes(q)) ||
      (h.feiPassportNo && h.feiPassportNo.toLowerCase().includes(q)) ||
      (h.breed && h.breed.toLowerCase().includes(q))
    );
  });

  const handleOpenAddModal = () => { setEditingHorse(null); setModalOpen(true); };
  const handleOpenEditModal = (horse) => { setEditingHorse(horse); setModalOpen(true); };
  const handleSaveHorse = async (values) => {
    setSaving(true);
    try {
      if (editingHorse) await updateHorse(editingHorse.id, values);
      else await addHorse(values);
      message.success('Đã gửi hồ sơ để kiểm duyệt sức khỏe.');
      setModalOpen(false);
    } catch (err) { message.error(err.response?.data?.message || err.message || 'Không thể lưu hồ sơ.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="equine-profiles heritage-dossiers">
      <nav className="equine-breadcrumb" aria-label="Đường dẫn"><button onClick={() => navigate('/')}>Trang chủ</button><ChevronRight size={13} /><span>Hồ sơ ngựa</span></nav>
      <header className="equine-heading"><div><span className="equine-eyebrow">QUẢN LÝ ĐÀN NGỰA</span><h1>Hồ sơ ngựa</h1><p>Thông tin nhận dạng, giấy tờ và vị trí — sẵn sàng cho hành trình tiếp theo.</p></div>{user?.role === 'CUSTOMER' && <Button type="primary" icon={<Plus size={18} />} onClick={handleOpenAddModal}>Thêm ngựa</Button>}</header>
      {error && <Alert type="error" message={error} action={<Button onClick={() => fetchHorses().catch(() => {})}>Thử lại</Button>} />}
      <section className="equine-stats" aria-label="Thống kê hồ sơ">
        {[{ icon: FileText, count: horses.length, label: 'Tổng hồ sơ', note: 'Ngựa đang được quản lý', tone: 'orange' }, { icon: ShieldCheck, count: readyHorses.length, label: 'Đã duyệt hồ sơ', note: 'Sẵn sàng đặt chuyến', tone: 'green' }, { icon: Clock, count: missingHorses.length, label: 'Cần theo dõi', note: 'Chờ duyệt hoặc cần bổ sung', tone: 'amber' }].map(({ icon: Icon, count, label, note, tone }) => <div className={'equine-stat equine-stat--' + tone} key={label}><span className="equine-stat-icon"><Icon size={23} /></span><div><span>{label}</span><strong>{count}<small>{note}</small></strong></div></div>)}
      </section>
      <section className="equine-toolbar" aria-label="Lọc hồ sơ"><div className="equine-filters">{[['ALL', 'Tất cả', horses.length], ['READY', 'Đã duyệt', readyHorses.length], ['MISSING', 'Cần theo dõi', missingHorses.length]].map(([key, label, count]) => <button key={key} aria-pressed={filterTab === key} className={filterTab === key ? 'is-active' : ''} onClick={() => setFilterTab(key)}>{label}<span>{count}</span></button>)}</div><Input aria-label="Tìm hồ sơ ngựa" prefix={<Search size={17} />} placeholder="Tên ngựa, mã chip hoặc hộ chiếu…" value={search} onChange={e => setSearch(e.target.value)} allowClear /></section>
      <div className="equine-results"><span>{filteredHorses.length} hồ sơ</span><span>Thông tin được cập nhật theo hồ sơ</span></div>
      <section className="equine-grid" aria-label="Danh sách ngựa" aria-busy={loading}>
        {filteredHorses.map((horse, index) => {
          const ready = horse.reviewStatus === 'APPROVED', rejected = horse.reviewStatus === 'REJECTED';
          const present = value => Array.isArray(value) ? value.length > 0 : Boolean(value);
          const docs = [['Ảnh nhận dạng', present(horse.photos)], ['Hộ chiếu', present(horse.passportScanUrl)], ['Sổ tiêm chủng', present(horse.vaccinationRecordUrl)]];
          return <article className="equine-card" key={horse.id}>
            <div className="equine-card-top"><span className="equine-number">HỒ SƠ {String(index + 1).padStart(2, '0')}</span><span className={'equine-status ' + (ready ? 'ready' : rejected ? 'rejected' : 'pending')}>{ready ? <CheckCircle2 size={13} /> : <Clock size={13} />}{ready ? 'Đã duyệt' : rejected ? 'Cần bổ sung' : 'Chờ thẩm định'}</span></div>
            <div className="equine-card-identification"><HorseIdentity horse={horse} photoOnly /><div><h2>{horse.name}</h2><div className="equine-chip">MICROCHIP <span>{horse.microchipId || 'Chưa khai báo'}</span></div></div></div>
            <dl className="equine-identity"><div><dt>Giống ngựa</dt><dd>{horse.breed || 'Chưa khai báo'}</dd></div><div><dt>Giới tính · Tuổi</dt><dd>{({ STALLION: 'Đực', MARE: 'Cái', GELDING: 'Thiến' })[horse.gender] || 'Chưa khai báo'} · {horse.age || '—'}</dd></div><div><dt>Màu lông · Cân nặng</dt><dd>{horse.color || horse.coatColor || '—'} · {horse.weight ? horse.weight + ' kg' : '—'}</dd></div><div><dt>Hộ chiếu</dt><dd className="equine-passport">{horse.feiPassportNo || 'Chưa khai báo'}</dd></div></dl>
            <div className="equine-location"><MapPin size={17} /><div><small>Vị trí hiện tại</small><strong>{horse.currentLocationName || horse.currentStopId || 'Chưa cập nhật vị trí'}</strong></div></div>
            <div className="equine-document-heading"><span><FileCheck2 size={16} /> Giấy tờ đã nộp</span><strong>{docs.filter(([, present]) => present).length}/3</strong></div>
            <div className="equine-documents">{docs.map(([label, present]) => <span className={present ? 'present' : 'missing'} key={label}>{present ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}{label}</span>)}</div>
            <div className="equine-actions">{reviewer ? <Button type="primary" onClick={() => navigate('/horses/' + horse.id)}>Xem & kiểm duyệt</Button> : <Button type="primary" icon={<Edit size={15} />} onClick={() => handleOpenEditModal(horse)}>Chỉnh sửa hồ sơ</Button>}<div><Button icon={<FileText size={14} />} onClick={() => navigate('/horses/' + horse.id)}>Xem chi tiết</Button>{!reviewer && <Button icon={<MapPin size={14} />} onClick={() => handleOpenEditModal(horse)}>Cập nhật vị trí</Button>}</div></div>
          </article>;
        })}
      </section>
      {!filteredHorses.length && <div className="equine-empty"><Search size={30} /><h3>{loading ? 'Đang tải hồ sơ…' : 'Chưa có hồ sơ phù hợp'}</h3><p>Thử tìm theo tên, mã chip hoặc chọn bộ lọc khác.</p><Button onClick={() => { setSearch(''); setFilterTab('ALL'); }}>Xóa bộ lọc</Button></div>}
      <Drawer className="heritage-horse-editor" title={editingHorse ? 'Chỉnh sửa / bổ sung hồ sơ' : 'Đăng ký hồ sơ ngựa'} open={modalOpen} onClose={() => !saving && setModalOpen(false)} footer={null} width="min(1000px, 96vw)" maskClosable={false} destroyOnClose>
        {modalOpen && <HorseProfileForm key={editingHorse?.id || 'new'} horse={editingHorse} onSave={handleSaveHorse} saving={saving} />}
      </Drawer>
    </div>
  );
}
