import React, { useMemo, useState } from 'react';
import { ArrowLeftRight, Search, UserRoundCog } from 'lucide-react';
import { Link } from 'react-router-dom';
import AssignmentModal from '../../components/manager/AssignmentModal';
import ManagerPageState from '../../components/manager/ManagerPageState';
import { useManagerData } from '../../context/ManagerDataContext';
import { managerDemoService } from '../../services/managerDemoService';
import { ASSIGNMENT_LABELS, formatDateTime, getAssignmentState, isTripEditable, TRIP_STATUS_LABELS } from '../../utils/managerFormat';

const getPersonnelAction = (trip) => {
  if (!trip.driverId && !trip.escortId) return { label: 'Phân công', variant: 'primary' };
  if (!trip.driverId || !trip.escortId) return { label: 'Bổ sung', variant: 'primary' };
  return { label: 'Đổi nhân sự', variant: 'outline' };
};

const TripsContent = () => {
  const { data, execute } = useManagerData();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [period, setPeriod] = useState('');
  const [assignment, setAssignment] = useState('');
  const [selectedTrip, setSelectedTrip] = useState(null);
  const people = useMemo(() => new Map([...data.drivers, ...data.escorts].map((person) => [person.id, person])), [data]);

  const filteredTrips = useMemo(() => {
    const query = search.trim().toLowerCase();
    const now = new Date();
    return data.trips.filter((trip) => {
      const text = [trip.code, trip.orderCode, trip.customer, trip.origin, trip.destination, trip.vehiclePlate].join(' ').toLowerCase();
      const periodMatches = !period || (period === 'UPCOMING' ? new Date(trip.startAt) >= now : new Date(trip.endAt) < now);
      return (!query || text.includes(query)) && (!status || trip.status === status) && periodMatches && (!assignment || getAssignmentState(trip) === assignment);
    }).sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
  }, [assignment, data.trips, period, search, status]);

  const saveAssignment = (trip, values) => execute(
    () => managerDemoService.saveAssignment(trip.id, values),
    trip.driverId || trip.escortId ? 'Đã cập nhật phân công và lưu lịch sử.' : 'Đã phân công nhân sự cho chuyến.'
  );

  return (
    <section className="operations-page operations-page--wide">
      <header className="page-header"><div><span className="eyebrow">Điều phối vận chuyển</span><h1>Chuyến vận chuyển</h1><p>Theo dõi đơn liên quan, lịch trình và phân công tài xế, phụ xe.</p></div></header>
      <p className="read-only-note manager-scope-note">Giả định demo: một đơn tương ứng một chuyến đường bộ. Giả định này chưa thay đổi model backend.</p>
      <div className="filter-bar manager-filter-grid">
        <label className="search-field"><Search size={18} /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã chuyến, đơn, khách hàng hoặc hành trình" aria-label="Tìm chuyến" /></label>
        <label className="select-field"><span>Trạng thái</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Tất cả</option>{Object.entries(TRIP_STATUS_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label className="select-field"><span>Thời gian</span><select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="">Tất cả</option><option value="UPCOMING">Sắp tới</option><option value="PAST">Đã qua</option></select></label>
        <label className="select-field"><span>Phân công</span><select value={assignment} onChange={(event) => setAssignment(event.target.value)}><option value="">Tất cả</option>{Object.entries(ASSIGNMENT_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      </div>

      <div className="table-card">
        <table className="data-table trips-table">
          <thead><tr><th>Chuyến / đơn</th><th>Khách hàng & hành trình</th><th>Thời gian</th><th>Ngựa / xe</th><th>Nhân sự</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
          <tbody>{filteredTrips.map((trip) => {
            const state = getAssignmentState(trip);
            const canEditAssignment = isTripEditable(trip);
            const personnelAction = canEditAssignment ? getPersonnelAction(trip) : null;
            return <tr key={trip.id}>
              <td><strong>{trip.code}</strong><small>{trip.orderCode}</small></td>
              <td><span>{trip.customer}</span><small>{trip.origin} → {trip.destination}</small></td>
              <td><span>{formatDateTime(trip.startAt)}</span><small>đến {formatDateTime(trip.endAt)}</small></td>
              <td><span>{trip.horseCount} ngựa</span><small>{trip.vehiclePlate || 'Chưa có biển số'}</small></td>
              <td><span>{people.get(trip.driverId)?.fullName || 'Chưa có tài xế'}</span><small>{people.get(trip.escortId)?.fullName || 'Chưa có phụ xe'}</small><span className={`assignment-badge assignment-badge--${state.toLowerCase()}`}>{ASSIGNMENT_LABELS[state]}</span></td>
              <td><span className={`status-badge status-badge--${trip.status.toLowerCase().replace('_', '-')}`}>{TRIP_STATUS_LABELS[trip.status]}</span></td>
              <td><div className={`trip-actions ${personnelAction ? '' : 'trip-actions--view-only'}`}>
                {personnelAction ? (
                  <button
                    className={`trip-action-button trip-action-button--${personnelAction.variant}`}
                    type="button"
                    onClick={(event) => { event.stopPropagation(); setSelectedTrip(trip); }}
                  >
                    {personnelAction.variant === 'outline'
                      ? <ArrowLeftRight size={16} aria-hidden="true" />
                      : <UserRoundCog size={16} aria-hidden="true" />}
                    {personnelAction.label}
                  </button>
                ) : null}
                <Link className="trip-detail-link" to={`/manager/trips/${trip.id}`} onClick={(event) => event.stopPropagation()}>Xem chi tiết</Link>
              </div></td>
            </tr>;
          })}</tbody>
        </table>
        {!filteredTrips.length ? <div className="table-empty">Không có chuyến phù hợp với bộ lọc.</div> : null}
      </div>
      {selectedTrip ? <AssignmentModal trip={selectedTrip} drivers={data.drivers} escorts={data.escorts} trips={data.trips} onClose={() => setSelectedTrip(null)} onSave={(values) => saveAssignment(selectedTrip, values)} /> : null}
    </section>
  );
};

const TripsPage = () => <ManagerPageState><TripsContent /></ManagerPageState>;
export default TripsPage;
