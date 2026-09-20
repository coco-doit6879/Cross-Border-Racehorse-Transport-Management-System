import React, { useMemo, useState } from 'react';
import { ArrowLeft, UserRoundCog } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import AssignmentModal from '../../components/manager/AssignmentModal';
import ManagerPageState from '../../components/manager/ManagerPageState';
import { useManagerData } from '../../context/ManagerDataContext';
import { managerDemoService } from '../../services/managerDemoService';
import { formatDateTime, isTripEditable, TRIP_STATUS_LABELS } from '../../utils/managerFormat';

const TripDetailContent = () => {
  const { id } = useParams();
  const { data, execute } = useManagerData();
  const [assigning, setAssigning] = useState(false);
  const trip = data.trips.find((item) => String(item.id) === String(id) || String(item._id) === String(id) || item.code === id || item.orderCode === id);
  const people = useMemo(() => new Map([...data.drivers, ...data.escorts].map((person) => [person.id, person])), [data]);

  if (!trip) return <section className="operations-page"><div className="page-feedback page-feedback--error"><p className="page-feedback__title">Không tìm thấy chuyến</p><Link className="button button--secondary" to="/manager/trips">Về danh sách chuyến</Link></div></section>;

  const save = (values) => execute(() => managerDemoService.saveAssignment(trip.id, values), 'Đã cập nhật phân công và lịch sử chuyến.');
  const statusLabel = TRIP_STATUS_LABELS[trip.status] || trip.status || 'Khởi tạo';
  const statusClass = (trip.status || 'PENDING_APPROVAL').toLowerCase().replace(/_/g, '-');

  return (
    <section className="operations-page">
      <Link className="back-link" to="/manager/trips"><ArrowLeft size={16} /> Danh sách chuyến</Link>
      <header className="page-header page-header--detail"><div><span className="eyebrow">{trip.orderCode}</span><h1>{trip.code}</h1><p>{trip.origin} → {trip.destination}</p></div>{isTripEditable(trip) ? <button className="button button--primary" type="button" onClick={() => setAssigning(true)}><UserRoundCog size={17} /> Phân công / thay đổi</button> : null}</header>
      {!isTripEditable(trip) ? <p className="read-only-note manager-scope-note">Chuyến {statusLabel.toLowerCase()} hiển thị phân công ở chế độ chỉ đọc.</p> : null}

      <div className="trip-detail-grid">
        <div className="detail-layout__main">
          <article className="content-card"><div className="content-card__heading"><h2>Thông tin chuyến và đơn</h2><span className={`status-badge status-badge--${statusClass}`}>{statusLabel}</span></div><dl className="detail-grid"><div><dt>Khách hàng</dt><dd>{trip.customer}</dd></div><div><dt>Biển số xe</dt><dd>{trip.vehiclePlate || 'Chưa có'}</dd></div><div><dt>Bắt đầu dự kiến</dt><dd>{formatDateTime(trip.startAt)}</dd></div><div><dt>Kết thúc dự kiến</dt><dd>{formatDateTime(trip.endAt)}</dd></div><div><dt>Số ngựa</dt><dd>{trip.horseCount}</dd></div><div><dt>Yêu cầu đặc biệt</dt><dd>{trip.specialRequirements || 'Không có'}</dd></div></dl></article>
          <article className="content-card">
            <h2>Danh sách ngựa</h2>
            <div className="horse-list">
              {(Array.isArray(trip.horses) ? trip.horses : []).map((horse, idx) => {
                const hName = typeof horse === 'object' ? horse.name || horse.id || 'Ngựa' : String(horse);
                const hPass = typeof horse === 'object' ? horse.feiPassportNo || horse.passport || 'Hộ chiếu FEI' : 'Hộ chiếu FEI';
                return (
                  <div className="manager-horse-row" key={typeof horse === 'object' ? horse.id || idx : idx}>
                    <span>{hName.slice(0, 1)}</span>
                    <div>
                      <strong>{hName}</strong>
                      <small>Hộ chiếu: {hPass}</small>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
          <article className="content-card">
            <h2>Lịch sử phân công / thay đổi</h2>
            {Array.isArray(trip.assignmentHistory) && trip.assignmentHistory.length > 0 ? (
              <div className="history-list">
                {trip.assignmentHistory.map((entry, idx) => (
                  <div className="history-item" key={entry.id || idx}>
                    <span className="history-item__dot" />
                    <div>
                      <strong>
                        {entry.role === 'DRIVER' ? 'Tài xế' : 'Phụ xe'}:{' '}
                        {people.get(entry.oldPersonId)?.fullName || 'Chưa phân công'} →{' '}
                        {people.get(entry.newPersonId)?.fullName || 'Chưa phân công'}
                      </strong>
                      <p>{entry.reason}</p>
                      <small>{formatDateTime(entry.changedAt)}</small>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted-text">Chưa có thay đổi phân công được ghi nhận.</p>
            )}
          </article>
        </div>
        <aside className="content-card assignment-card"><h2>Nhân sự được phân công</h2><div className="assigned-person"><span>Tài xế</span><strong>{people.get(trip.driverId)?.fullName || 'Chưa phân công'}</strong><small>{people.get(trip.driverId)?.code || '—'}</small></div><div className="assigned-person"><span>Phụ xe</span><strong>{people.get(trip.escortId)?.fullName || 'Chưa phân công'}</strong><small>{people.get(trip.escortId)?.code || '—'}</small></div>{trip.assignmentNote ? <div className="assignment-note"><span>Ghi chú</span><p>{trip.assignmentNote}</p></div> : null}</aside>
      </div>
      {assigning ? <AssignmentModal trip={trip} drivers={data.drivers} escorts={data.escorts} trips={data.trips} onClose={() => setAssigning(false)} onSave={save} /> : null}
    </section>
  );
};

const TripDetailPage = () => <ManagerPageState><TripDetailContent /></ManagerPageState>;
export default TripDetailPage;

