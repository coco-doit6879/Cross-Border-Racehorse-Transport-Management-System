import React, { useMemo, useState } from 'react';
import { CalendarClock, CarFront, Plus, RotateCcw, UserCheck, UserRoundCog, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import AssignmentModal from '../../components/manager/AssignmentModal';
import ManagerPageState from '../../components/manager/ManagerPageState';
import { useManagerData } from '../../context/ManagerDataContext';
import { managerDemoService } from '../../services/managerDemoService';
import { formatDateTime, getAssignmentState, isTripEditable } from '../../utils/managerFormat';

const DashboardContent = () => {
  const { data, execute } = useManagerData();
  const [selectedTrip, setSelectedTrip] = useState(null);
  const people = useMemo(() => new Map([...data.drivers, ...data.escorts].map((person) => [person.id, person])), [data]);
  const needsAssignment = data.trips.filter((trip) => !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(trip.status) && getAssignmentState(trip) !== 'FULL');
  const upcoming = data.trips.filter((trip) => !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(trip.status)).sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
  const activePeople = data.drivers.filter((person) => person.status === 'ACTIVE').length + data.escorts.filter((person) => person.status === 'ACTIVE').length;
  const kpis = [
    { label: 'Tổng số chuyến', value: data.trips.length, icon: CarFront, tone: 'navy' },
    { label: 'Chuyến thiếu nhân sự', value: needsAssignment.length, icon: UserRoundCog, tone: 'red' },
    { label: 'Đang vận chuyển', value: data.trips.filter((trip) => trip.status === 'IN_TRANSIT').length, icon: CalendarClock, tone: 'blue' },
    { label: 'Nhân sự hoạt động', value: activePeople, icon: UserCheck, tone: 'green' }
  ];

  const reset = () => {
    if (!window.confirm('Khôi phục toàn bộ dữ liệu Manager về dữ liệu mẫu ban đầu? Các thay đổi demo hiện tại sẽ bị thay thế.')) return;
    execute(() => managerDemoService.reset(), 'Đã khôi phục dữ liệu mẫu.');
  };
  const saveAssignment = (trip, values) => execute(() => managerDemoService.saveAssignment(trip.id, values), 'Đã lưu phân công nhân sự.');

  return (
    <section className="operations-page">
      <header className="page-header">
        <div><span className="eyebrow">Điều hành logistics</span><h1>Tổng quan</h1><p>Theo dõi nguồn lực và các chuyến cần xử lý từ cùng một nguồn dữ liệu.</p></div>
        <button className="button button--secondary" type="button" onClick={reset}><RotateCcw size={16} /> Khôi phục dữ liệu mẫu</button>
      </header>
      <div className="kpi-grid">{kpis.map(({ label, value, icon: Icon, tone }) => <article className="kpi-card" key={label}><div className={`kpi-card__icon kpi-card__icon--${tone}`}><Icon size={21} /></div><div><p>{label}</p><strong>{value}</strong></div></article>)}</div>

      <div className="dashboard-grid manager-dashboard-grid">
        <article className="content-card">
          <div className="content-card__heading"><div><span className="eyebrow">Cần xử lý</span><h2>Chuyến cần phân công</h2></div><Link className="table-link" to="/manager/trips">Xem danh sách</Link></div>
          {needsAssignment.length ? <div className="dashboard-trip-list">{needsAssignment.slice(0, 5).map((trip) => <div className="dashboard-trip" key={trip.id}><div><strong>{trip.code}</strong><p>{trip.origin} → {trip.destination}</p><small>{formatDateTime(trip.startAt)}</small></div><div className="dashboard-trip__actions"><Link to={`/manager/trips/${trip.id}`}>Chi tiết</Link>{isTripEditable(trip) ? <button type="button" onClick={() => setSelectedTrip(trip)}>Phân công</button> : null}</div></div>)}</div> : <p className="muted-text">Tất cả chuyến sắp tới đã đủ nhân sự.</p>}
        </article>
        <article className="content-card quick-actions-card"><div><span className="eyebrow">Lối tắt</span><h2>Quản lý nhân sự</h2></div><Link className="quick-action" to="/manager/drivers?create=1"><span><Plus size={17} /></span><div><strong>Thêm tài xế</strong><small>Tạo hồ sơ tài xế mới</small></div></Link><Link className="quick-action" to="/manager/escorts?create=1"><span><Plus size={17} /></span><div><strong>Thêm phụ xe</strong><small>Tạo hồ sơ phụ xe mới</small></div></Link><div className="quick-action-summary"><UsersRound size={18} /><span>{data.drivers.length} tài xế · {data.escorts.length} phụ xe</span></div></article>
      </div>

      <article className="content-card">
        <div className="content-card__heading"><div><span className="eyebrow">Lịch gần nhất</span><h2>Các chuyến sắp khởi hành</h2></div><Link className="table-link" to="/manager/trips">Xem tất cả</Link></div>
        <div className="upcoming-grid">{upcoming.slice(0, 4).map((trip) => <Link className="upcoming-card" to={`/manager/trips/${trip.id}`} key={trip.id}><span>{formatDateTime(trip.startAt)}</span><strong>{trip.code}</strong><p>{trip.origin} → {trip.destination}</p><small>{people.get(trip.driverId)?.fullName || 'Chưa có tài xế'} · {people.get(trip.escortId)?.fullName || 'Chưa có phụ xe'}</small></Link>)}</div>
      </article>
      {selectedTrip ? <AssignmentModal trip={selectedTrip} drivers={data.drivers} escorts={data.escorts} trips={data.trips} onClose={() => setSelectedTrip(null)} onSave={(values) => saveAssignment(selectedTrip, values)} /> : null}
    </section>
  );
};

const ManagerDashboard = () => <ManagerPageState><DashboardContent /></ManagerPageState>;
export default ManagerDashboard;
