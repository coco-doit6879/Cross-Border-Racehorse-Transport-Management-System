import React, { useMemo, useState } from 'react';
import Modal from './Modal';
import { formatDate, PERSON_STATUS_LABELS } from '../../utils/managerFormat';

const emptyValues = {
  code: '', fullName: '', phone: '', email: '', licenseNumber: '', licenseClass: '', licenseExpiry: '', experience: '', status: 'ACTIVE', notes: ''
};

const PersonnelModal = ({ role, mode, person, onClose, onSave }) => {
  const isDriver = role === 'driver';
  const roleLabel = isDriver ? 'tài xế' : 'phụ xe';
  const initialValues = useMemo(() => ({
    ...emptyValues,
    ...person,
    licenseExpiry: person?.licenseExpiry?.slice(0, 10) || ''
  }), [person]);
  const [values, setValues] = useState(initialValues);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isView = mode === 'view';

  const update = (event) => setValues((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFormError('');
    try {
      onSave({ ...values, id: person?.id, licenseExpiry: values.licenseExpiry ? new Date(`${values.licenseExpiry}T00:00:00`).toISOString() : '' });
      onClose();
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (isView) {
    return (
      <Modal title={`Chi tiết ${roleLabel}`} subtitle={person.code} onClose={onClose}>
        <dl className="manager-detail-list">
          <div><dt>Mã {roleLabel}</dt><dd>{person.code}</dd></div>
          <div><dt>Họ tên</dt><dd>{person.fullName}</dd></div>
          <div><dt>Số điện thoại</dt><dd>{person.phone}</dd></div>
          <div><dt>Email</dt><dd>{person.email || 'Không có'}</dd></div>
          {isDriver ? <><div><dt>Số giấy phép</dt><dd>{person.licenseNumber}</dd></div><div><dt>Hạng / hết hạn</dt><dd>{person.licenseClass} · {formatDate(person.licenseExpiry)}</dd></div></> : <div><dt>Kinh nghiệm chăm sóc ngựa</dt><dd>{person.experience || 'Không có'}</dd></div>}
          <div><dt>Trạng thái</dt><dd>{PERSON_STATUS_LABELS[person.status]}</dd></div>
          <div><dt>Ghi chú</dt><dd>{person.notes || 'Không có'}</dd></div>
        </dl>
        <div className="modal-actions"><button className="button button--secondary" type="button" onClick={onClose}>Đóng</button></div>
      </Modal>
    );
  }

  return (
    <Modal title={mode === 'edit' ? `Sửa hồ sơ ${roleLabel}` : `Thêm ${roleLabel}`} subtitle="Đây là hồ sơ nhân sự, không tạo tài khoản đăng nhập." onClose={onClose} wide>
      <form className="manager-form" onSubmit={submit} noValidate>
        <div className="form-grid">
          <label><span>Mã {roleLabel} *</span><input name="code" value={values.code} onChange={update} required /></label>
          <label><span>Họ tên *</span><input name="fullName" value={values.fullName} onChange={update} required /></label>
          <label><span>Số điện thoại *</span><input name="phone" value={values.phone} onChange={update} inputMode="tel" required /></label>
          <label><span>Email</span><input name="email" type="email" value={values.email} onChange={update} /></label>
          {isDriver ? (
            <>
              <label><span>Số giấy phép lái xe *</span><input name="licenseNumber" value={values.licenseNumber} onChange={update} required /></label>
              <label><span>Hạng giấy phép *</span><input name="licenseClass" value={values.licenseClass} onChange={update} required /></label>
              <label><span>Ngày hết hạn *</span><input name="licenseExpiry" type="date" value={values.licenseExpiry} onChange={update} required /></label>
            </>
          ) : (
            <label className="form-field--full"><span>Kinh nghiệm / lưu ý chăm sóc ngựa</span><textarea name="experience" value={values.experience} onChange={update} rows="3" /></label>
          )}
          <label><span>Trạng thái</span><select name="status" value={values.status} onChange={update}><option value="ACTIVE">Đang hoạt động</option><option value="INACTIVE">Ngừng hoạt động</option></select></label>
          <label className="form-field--full"><span>Ghi chú</span><textarea name="notes" value={values.notes} onChange={update} rows="3" /></label>
        </div>
        {formError ? <p className="inline-alert inline-alert--error" role="alert">{formError}</p> : null}
        <div className="modal-actions">
          <button className="button button--secondary" type="button" onClick={onClose}>Hủy</button>
          <button className="button button--primary" type="submit" disabled={submitting}>{submitting ? 'Đang lưu…' : 'Lưu hồ sơ'}</button>
        </div>
      </form>
    </Modal>
  );
};

export default PersonnelModal;

