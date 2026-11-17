import React, { useCallback, useEffect, useState } from 'react';
import { Button, Image, Skeleton } from 'antd';
import api from '../../services/apiClient';
import { connectSocket } from '../../socket/socketClient';
import './health-timeline.css';

const FOOD = { NORMAL: 'Ăn bình thường', REDUCED: 'Ăn ít', REFUSED: 'Bỏ ăn' };
const CONDITION = { STABLE: 'Ổn định', STRESSED: 'Căng thẳng', UNSTABLE: 'Không ổn định' };
const ALERT = { FEVER: 'Sốt', INJURED: 'Bị thương', DEHYDRATION: 'Mất nước' };
const formatTime = value => new Date(value).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });

// Photos require the bearer token, so they are fetched as blobs instead of plain <img src>.
function HealthPhoto({ path, alt }) {
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let url, active = true;
    api.get(path, { responseType: 'blob' })
      .then(res => { if (!active) return; url = URL.createObjectURL(res.data); setSrc(url); })
      .catch(() => active && setFailed(true));
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [path]);
  if (failed) return <p className="health-photo-missing">Không tải được ảnh.</p>;
  if (!src) return <div className="health-photo-loading" aria-label="Đang tải ảnh" />;
  return <Image src={src} alt={alt} className="health-photo" width={220} />;
}

const HealthTimeline = ({ orderId }) => {
  const [tripId, setTripId] = useState(null);
  const [logs, setLogs] = useState(null);
  const [error, setError] = useState('');
  const [fresh, setFresh] = useState(null);

  const load = useCallback(async (highlight) => {
    try {
      let trip = tripId;
      if (!trip) {
        const ops = await api.get(`/orders/${orderId}/operations`);
        trip = ops.data.data?.route?._id || null;
        setTripId(trip);
      }
      if (!trip) { setLogs([]); return; }
      const res = await api.get('/health-logs', { params: { tripId: trip } });
      setLogs(res.data.data);
      setError('');
      if (highlight) setFresh(highlight);
    } catch (err) {
      setError(err.response?.data?.message || 'Không tải được nhật ký sức khỏe.');
      setLogs(current => current || []);
    }
  }, [orderId, tripId]);

  useEffect(() => { load(); const timer = setInterval(() => load(), 30000); return () => clearInterval(timer); }, [load]);

  useEffect(() => {
    if (!tripId) return undefined;
    const socket = connectSocket();
    const join = () => socket.emit('join_trip', { tripId });
    const onLog = payload => { if (String(payload?.tripId) === String(tripId)) load(payload.logId); };
    join();
    socket.on('connect', join);
    socket.on('health:log_created', onLog);
    return () => { socket.off('connect', join); socket.off('health:log_created', onLog); socket.emit('leave_trip', { tripId }); };
  }, [tripId, load]);

  return <section className="health-timeline" aria-labelledby="health-timeline-title">
    <div className="health-timeline-head">
      <div><h2 id="health-timeline-title">Nhật ký sức khỏe ngựa</h2><p>Phụ xe ghi thân nhiệt, lượng nước và ảnh thể trạng trong suốt hành trình. Bản ghi mới hiện ngay tại đây.</p></div>
      <Button onClick={() => load()}>Tải lại</Button>
    </div>
    {error && <p className="health-error" role="alert">{error}</p>}
    {logs === null ? <Skeleton active /> : !logs.length ? <p className="health-empty">{tripId ? 'Chưa có nhật ký sức khỏe. Phụ xe sẽ ghi sau khi chuyến khởi hành.' : 'Chuyến chưa được lập. Nhật ký sức khỏe sẽ có khi chuyến bắt đầu.'}</p> :
      <ol className="health-list">{logs.map(log => {
        const alarm = log.condition === 'UNSTABLE' || log.alertType !== 'NONE';
        const horse = log.horseId?.name || 'Ngựa';
        return <li key={log._id} className={`health-item${alarm ? ' is-alarm' : ''}${fresh === log._id ? ' is-fresh' : ''}`}>
          <div className="health-item-head"><strong>{horse}</strong><time dateTime={log.recordedAt}>{formatTime(log.recordedAt)}</time></div>
          <dl className="health-metrics">
            <div><dt>Thân nhiệt</dt><dd>{log.temperatureCelsius} °C</dd></div>
            <div><dt>Nước uống</dt><dd>{log.waterIntakeLiters} lít</dd></div>
            <div><dt>Ăn uống</dt><dd>{FOOD[log.foodIntakeStatus] || log.foodIntakeStatus}</dd></div>
            <div><dt>Thể trạng</dt><dd className={alarm ? 'is-alarm-text' : 'is-ok-text'}>{CONDITION[log.condition]}{ALERT[log.alertType] ? ` · ${ALERT[log.alertType]}` : ''}</dd></div>
          </dl>
          {log.notes && <p className="health-notes">{log.notes}</p>}
          {log.photoPath && <HealthPhoto path={log.photoPath} alt={`Ảnh thể trạng ${horse} lúc ${formatTime(log.recordedAt)}`} />}
          <small className="health-by">Ghi bởi {log.recordedBy?.fullName || 'phụ xe'}</small>
        </li>;
      })}</ol>}
  </section>;
};

export default HealthTimeline;
