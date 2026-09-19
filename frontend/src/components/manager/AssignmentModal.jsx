import React, { useMemo, useState } from 'react';
import Modal from './Modal';
import { formatDateTime } from '../../utils/managerFormat';

const overlaps = (tripA, tripB) => new Date(tripA.startAt) < new Date(tripB.endAt) && new Date(tripA.endAt) > new Date(tripB.startAt);

const AssignmentModal = ({ trip, drivers, escorts, trips, onClose, onSave }) => {
  const [values, setValues] = useState({ driverId: trip.driverId || '', escortId: trip.escortId || '', note: trip.assignmentNote || '', reason: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const changingExisting = Boolean((trip.driverId && trip.driverId !== values.driverId) || (trip.escortId && trip.escortId !== values.escortId));

  const conflicts = useMemo(() => {
    const map = new Map();
    [...drivers, ...escorts].forEach((person) => {
      const conflict = trips.find((item) => item.id !== trip.id && !['COMPLETED', 'CANCELLED'].includes(item.status) && (item.driverId === person.id || item.escortId === person.id) && overlaps(trip, item));
      if (conflict) map.set(person.id, conflict.code);
    });
    return map;
  }, [drivers, escorts, trip, trips]);

  const submit = (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      onSave(values);
      onClose();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const personName = (id, collection) => collection.find((person) => person.id === id)?.fullName || 'Chưa phân công';
  return (
    <Modal title="Phân công nhân sự" subtitle={`${trip.code} · ${trip.origin} → ${trip.destination}`} onClose={onClose} wide>
      <div className="assignment-summary"><div><span>Thời gian nhiệm vụ</span><strong>{formatDateTime(trip.startAt)} — {formatDateTime(trip.endAt)}</strong></div><div><span>Hiện tại</span><strong>{personName(trip.driverId, drivers)} · {personName(trip.escortId, escorts)}</strong></div></div>
      <form className="manager-form" onSubmit={submit}>
        <div className="form-grid">
          <label><span>Tài xế *</span><select value={values.driverId} onChange={(event) => setValues({ ...values, driverId: event.target.value })} required><option value="">Chọn tài xế</option>{drivers.filter((person) => person.status === 'ACTIVE').map((person) => <option key={person.id} value={person.id} disabled={conflicts.has(person.id)}>{person.code} · {person.fullName}{conflicts.has(person.id) ? ` — trùng ${conflicts.get(person.id)}` : ''}</option>)}</select></label>
          <label><span>Phụ xe *</span><select value={values.escortId} onChange={(event) => setValues({ ...values, escortId: event.target.value })} required><option value="">Chọn phụ xe</option>{escorts.filter((person) => person.status === 'ACTIVE').map((person) => <option key={person.id} value={person.id} disabled={conflicts.has(person.id)}>{person.code} · {person.fullName}{conflicts.has(person.id) ? ` — trùng ${conflicts.get(person.id)}` : ''}</option>)}</select></label>
          {changingExisting ? <label className="form-field--full"><span>Lý do thay đổi *</span><textarea value={values.reason} onChange={(event) => setValues({ ...values, reason: event.target.value })} rows="3" required placeholder="Nêu rõ lý do thay nhân sự hiện tại" /></label> : null}
          <label className="form-field--full"><span>Ghi chú phân công</span><textarea value={values.note} onChange={(event) => setValues({ ...values, note: event.target.value })} rows="3" /></label>
        </div>
        <p className="form-hint">Nhân sự bị trùng toàn bộ hoặc một phần thời gian nhiệm vụ sẽ không thể chọn.</p>
        {error ? <p className="inline-alert inline-alert--error" role="alert">{error}</p> : null}
        <div className="modal-actions"><button className="button button--secondary" type="button" onClick={onClose}>Hủy</button><button className="button button--primary" type="submit" disabled={submitting}>{submitting ? 'Đang lưu…' : 'Lưu phân công'}</button></div>
      </form>
    </Modal>
  );
};

export default AssignmentModal;

