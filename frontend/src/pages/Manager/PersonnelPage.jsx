import React, { useMemo, useState } from 'react';
import { Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import ManagerPageState from '../../components/manager/ManagerPageState';
import PersonnelModal from '../../components/manager/PersonnelModal';
import { useManagerData } from '../../context/ManagerDataContext';
import { managerDemoService } from '../../services/managerDemoService';
import { formatDate, PERSON_STATUS_LABELS } from '../../utils/managerFormat';

const PersonnelContent = ({ role }) => {
  const { data, execute } = useManagerData();
  const isDriver = role === 'driver';
  const roleLabel = isDriver ? 'tài xế' : 'phụ xe';
  const collection = isDriver ? data.drivers : data.escorts;
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [modal, setModal] = useState(() => searchParams.get('create') === '1' ? { mode: 'create', person: null } : null);

  const closeModal = () => {
    setModal(null);
    if (searchParams.has('create')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('create');
      setSearchParams(nextParams, { replace: true });
    }
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return collection.filter((person) => {
      const text = [person.code, person.fullName, person.phone].join(' ').toLowerCase();
      return (!query || text.includes(query)) && (!status || person.status === status);
    });
  }, [collection, search, status]);

  const save = (values) => execute(
    () => managerDemoService.savePersonnel(role, values),
    values.id ? `Đã cập nhật hồ sơ ${roleLabel}.` : `Đã thêm ${roleLabel} mới.`
  );

  const remove = (person) => {
    if (!window.confirm(`Xóa hồ sơ ${person.code} - ${person.fullName}?`)) return;
    try {
      execute(() => managerDemoService.deletePersonnel(role, person.id), `Đã xóa hồ sơ ${roleLabel}.`);
    } catch {
      // The shared notification presents the business-rule error.
    }
  };

  return (
    <section className="operations-page">
      <header className="page-header">
        <div><span className="eyebrow">Quản lý nhân sự</span><h1>{isDriver ? 'Tài xế' : 'Phụ xe'}</h1><p>Quản lý hồ sơ, trạng thái hoạt động và thông tin liên hệ của {roleLabel}.</p></div>
        <button className="button button--primary" type="button" onClick={() => setModal({ mode: 'create', person: null })}><Plus size={17} /> Thêm {roleLabel}</button>
      </header>

      <div className="filter-bar">
        <label className="search-field"><Search size={18} /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Tìm theo mã, tên hoặc số điện thoại`} aria-label={`Tìm ${roleLabel}`} /></label>
        <label className="select-field"><span>Trạng thái</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Tất cả</option><option value="ACTIVE">Đang hoạt động</option><option value="INACTIVE">Ngừng hoạt động</option></select></label>
      </div>

      <div className="table-card">
        <table className="data-table manager-personnel-table">
          <thead><tr><th>Mã</th><th>Họ tên</th><th>Liên hệ</th><th>{isDriver ? 'Giấy phép' : 'Kinh nghiệm chăm sóc'}</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
          <tbody>
            {filtered.map((person) => (
              <tr key={person.id}>
                <td><strong>{person.code}</strong></td>
                <td>{person.fullName}</td>
                <td><span>{person.phone}</span><small>{person.email || 'Không có email'}</small></td>
                <td>{isDriver ? <><span>{person.licenseClass} · {person.licenseNumber}</span><small>Hết hạn {formatDate(person.licenseExpiry)}</small></> : <span className="table-clamp">{person.experience || 'Chưa có thông tin'}</span>}</td>
                <td><span className={`status-badge status-badge--${person.status.toLowerCase()}`}>{PERSON_STATUS_LABELS[person.status]}</span></td>
                <td><div className="table-actions">
                  <button type="button" onClick={() => setModal({ mode: 'view', person })} title="Xem chi tiết"><Eye size={16} /></button>
                  <button type="button" onClick={() => setModal({ mode: 'edit', person })} title="Sửa hồ sơ"><Pencil size={16} /></button>
                  <button className="is-danger" type="button" onClick={() => remove(person)} title="Xóa hồ sơ"><Trash2 size={16} /></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length ? <div className="table-empty">Không có {roleLabel} phù hợp với bộ lọc.</div> : null}
      </div>

      {modal ? <PersonnelModal role={role} mode={modal.mode} person={modal.person} onClose={closeModal} onSave={save} /> : null}
    </section>
  );
};

const PersonnelPage = ({ role }) => <ManagerPageState><PersonnelContent role={role} /></ManagerPageState>;

export default PersonnelPage;
