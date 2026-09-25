import React, { useMemo, useState } from 'react';
import { ArrowLeft, UserRoundCog, CheckCircle, XCircle } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { message, Modal, Input } from 'antd';
import AssignmentModal from '../../components/manager/AssignmentModal';
import ManagerPageState from '../../components/manager/ManagerPageState';
import { useManagerData } from '../../context/ManagerDataContext';
import { managerDemoService } from '../../services/managerDemoService';
import { useOrderStore } from '../../store/useOrderStore';
import { useAuthStore } from '../../store/useAuthStore';
import { formatDateTime, isTripEditable, TRIP_STATUS_LABELS } from '../../utils/managerFormat';

const TripDetailContent = () => {
  const { id } = useParams();
  const { data, execute } = useManagerData();
  const { user } = useAuthStore();
  const { approveOrder, rejectOrder } = useOrderStore();
  const [assigning, setAssigning] = useState(false);
  const [rejectingModal, setRejectingModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingStatus, setProcessingStatus] = useState(false);

  const trip = data.trips.find((item) => String(item.id) === String(id) || String(item._id) === String(id) || item.code === id || item.orderCode === id);
  const people = useMemo(() => new Map([...data.drivers, ...data.escorts].map((person) => [person.id, person])), [data]);

  if (!trip) return <section className="operations-page"><div className="page-feedback page-feedback--error"><p className="page-feedback__title">Không tìm thấy chuyến</p><Link className="button button--secondary" to="/manager/trips">Về danh sách chuyến</Link></div></section>;

  const save = (values) => execute(() => managerDemoService.saveAssignment(trip.id, values), 'Đã cập nhật phân công và lịch sử chuyến.');
  const statusLabel = TRIP_STATUS_LABELS[trip.status] || trip.status || 'Khởi tạo';
  const statusClass = (trip.status || 'PENDING_APPROVAL').toLowerCase().replace(/_/g, '-');

  const handleApprove = async () => {
    setProcessingStatus(true);
    try {
      const targetId = trip.orderId || trip._id || trip.id || trip.orderCode;
      await execute(async () => {
        await approveOrder(targetId);
        managerDemoService.updateTripStatus(trip.id, 'APPROVED');
        if (trip._id) managerDemoService.updateTripStatus(trip._id, 'APPROVED');
        if (trip.code) managerDemoService.updateTripStatus(trip.code, 'APPROVED');
        if (trip.orderCode) managerDemoService.updateTripStatus(trip.orderCode, 'APPROVED');
        if (trip.orderId) managerDemoService.updateTripStatus(trip.orderId, 'APPROVED');
      }, 'Đã phê duyệt đơn vận chuyển thành công!');
    } finally {
      setProcessingStatus(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectionReason.trim()) {
      message.error('Vui lòng nhập lý do từ chối đơn vận chuyển.');
      return;
    }
    setProcessingStatus(true);
    try {
      const targetId = trip.orderId || trip._id || trip.id || trip.orderCode;

      managerDemoService.updateTripStatus(trip.id, 'REJECTED', rejectionReason);
      if (trip._id) managerDemoService.updateTripStatus(trip._id, 'REJECTED', rejectionReason);
      if (trip.code) managerDemoService.updateTripStatus(trip.code, 'REJECTED', rejectionReason);
      if (trip.orderCode) managerDemoService.updateTripStatus(trip.orderCode, 'REJECTED', rejectionReason);
      if (trip.orderId) managerDemoService.updateTripStatus(trip.orderId, 'REJECTED', rejectionReason);

      await execute(async () => {
        await rejectOrder(targetId, rejectionReason);
        managerDemoService.updateTripStatus(trip.id, 'REJECTED', rejectionReason);
        if (trip._id) managerDemoService.updateTripStatus(trip._id, 'REJECTED', rejectionReason);
        if (trip.code) managerDemoService.updateTripStatus(trip.code, 'REJECTED', rejectionReason);
        if (trip.orderCode) managerDemoService.updateTripStatus(trip.orderCode, 'REJECTED', rejectionReason);
        if (trip.orderId) managerDemoService.updateTripStatus(trip.orderId, 'REJECTED', rejectionReason);
      }, `Đã từ chối đơn vận chuyển: ${rejectionReason}`);

      setRejectingModal(false);
      setRejectionReason('');
    } finally {
      setProcessingStatus(false);
    }
  };

  return (
    <section className="operations-page">
      <Link className="back-link" to="/manager/trips"><ArrowLeft size={16} /> Danh sách chuyến</Link>
      <header className="page-header page-header--detail">
        <div>
          <span className="eyebrow">{trip.orderCode}</span>
          <h1>{trip.code}</h1>
          <p>{trip.origin} → {trip.destination}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {trip.status === 'PENDING_APPROVAL' && (
            <>
              <button
                className="button button--primary"
                type="button"
                style={{ backgroundColor: '#15803D', borderColor: '#15803D' }}
                onClick={handleApprove}
                disabled={processingStatus || (trip.depositRequired && trip.depositStatus !== 'PAID')}
                title={trip.depositRequired && trip.depositStatus !== 'PAID' ? 'Khách hàng chưa thanh toán tiền cọc' : undefined}
              >
                <CheckCircle size={17} /> Duyệt đơn
              </button>
              <button
                className="button button--secondary"
                type="button"
                style={{ color: '#DC2626', borderColor: '#FCA5A5' }}
                onClick={() => setRejectingModal(true)}
                disabled={processingStatus}
              >
                <XCircle size={17} /> Từ chối
              </button>
            </>
          )}
          {isTripEditable(trip) ? (
            <button className="button button--primary" type="button" onClick={() => setAssigning(true)}>
              <UserRoundCog size={17} /> Phân công / thay đổi
            </button>
          ) : null}
        </div>
      </header>

      <Modal
        title="Từ chối đơn vận chuyển"
        open={rejectingModal}
        onOk={handleRejectConfirm}
        onCancel={() => setRejectingModal(false)}
        okText="Xác nhận từ chối"
        cancelText="Hủy bỏ"
        okButtonProps={{ danger: true, loading: processingStatus }}
      >
        <p style={{ fontSize: 13, color: '#4B5563', marginBottom: 12 }}>
          Vui lòng nhập rõ lý do từ chối đơn vận chuyển <strong>{trip.orderCode}</strong>:
        </p>
        <Input.TextArea
          rows={3}
          placeholder="VD: Không đáp ứng đủ xe chuyên dụng vào thời gian yêu cầu, sai thông tin hải quan..."
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
        />
      </Modal>

      {!isTripEditable(trip) ? <p className="read-only-note manager-scope-note">Chuyến {statusLabel.toLowerCase()} hiển thị phân công ở chế độ chỉ đọc.</p> : null}

      <div className="trip-detail-grid">
        <div className="detail-layout__main">
          <article className="content-card">
            <div className="content-card__heading">
              <h2>Thông tin chuyến và đơn</h2>
              <span className={`status-badge status-badge--${statusClass}`}>{statusLabel}</span>
            </div>
            <dl className="detail-grid">
              <div>
                <dt>Khách hàng</dt>
                <dd>{trip.customer}</dd>
              </div>
              <div>
                <dt>Biển số xe</dt>
                <dd>{trip.vehiclePlate || 'Chưa có'}</dd>
              </div>
              <div>
                <dt>Bắt đầu dự kiến</dt>
                <dd>{formatDateTime(trip.startAt)}</dd>
              </div>
              <div>
                <dt>Kết thúc dự kiến (ETA)</dt>
                <dd>
                  {formatDateTime(trip.endAt)}
                  {trip.estimatedDurationFormatted ? (
                    <span style={{ display: 'block', color: '#059669', fontWeight: 600, fontSize: 12, marginTop: 2 }}>
                      ⏱ {trip.estimatedDurationFormatted} ({trip.estimatedDistanceKm || 240} km)
                    </span>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt>Số ngựa</dt>
                <dd>{trip.horseCount}</dd>
              </div>
              <div>
                <dt>Yêu cầu đặc biệt</dt>
                <dd>{trip.specialRequirements || 'Không có'}</dd>
              </div>
            </dl>
          </article>
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

