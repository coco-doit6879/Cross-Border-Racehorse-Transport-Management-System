import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Radio, RefreshCw } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '../../components/operations/PageFeedback';
import { incidentApi } from '../../services/incidentApi';
import { connectSocket, getSocket } from '../../socket/socketClient';
import { getApiErrorMessage, getCollection } from '../../utils/apiResponse';

const CONNECTION_LABELS = {
  connecting: 'Đang kết nối realtime',
  connected: 'Đã kết nối realtime',
  disconnected: 'Mất kết nối realtime'
};

const SOSAlerts = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liveAlert, setLiveAlert] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  const loadIncidents = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const response = await incidentApi.getIncidents();
      setIncidents(getCollection(response, 'sự cố'));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Không thể tải danh sách sự cố.'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { loadIncidents(); }, [loadIncidents]);

  useEffect(() => {
    const socket = getSocket();
    const handleConnect = () => setConnectionStatus('connected');
    const handleDisconnect = () => setConnectionStatus('disconnected');
    const handleConnectError = () => setConnectionStatus('disconnected');
    const handleAlert = (alert) => {
      setLiveAlert(alert);
      loadIncidents({ silent: true });
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('sos:broadcast_alert', handleAlert);
    setConnectionStatus(socket.connected ? 'connected' : 'connecting');
    connectSocket();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('sos:broadcast_alert', handleAlert);
    };
  }, [loadIncidents]);

  const sortedIncidents = useMemo(
    () => [...incidents].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [incidents]
  );

  return (
    <section className="operations-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">Điều hành khẩn cấp</span>
          <h1>Cảnh báo SOS</h1>
          <p>Theo dõi danh sách sự cố và cảnh báo mới theo thời gian thực.</p>
        </div>
        <div className={`realtime-chip realtime-chip--${connectionStatus}`} role="status">
          <Radio size={16} /> {CONNECTION_LABELS[connectionStatus]}
        </div>
      </header>

      {liveAlert ? (
        <div className="sos-banner" role="alert">
          <AlertTriangle size={24} />
          <div>
            <strong>{liveAlert.message || 'Đã nhận cảnh báo SOS khẩn cấp'}</strong>
            <p>Đơn {liveAlert.orderId || 'chưa xác định'} · {liveAlert.timestamp ? new Date(liveAlert.timestamp).toLocaleString('vi-VN') : 'vừa xong'}</p>
          </div>
          <button type="button" onClick={() => setLiveAlert(null)} aria-label="Đóng cảnh báo">Đóng</button>
        </div>
      ) : null}

      <div className="section-toolbar">
        <p>{loading ? 'Đang tải…' : `${incidents.length} sự cố`}</p>
        <button className="button button--secondary" type="button" onClick={() => loadIncidents()} disabled={loading}>
          <RefreshCw size={16} /> Làm mới
        </button>
      </div>

      {loading ? <LoadingState label="Đang tải sự cố…" /> : null}
      {!loading && error && !incidents.length ? <ErrorState message={error} onRetry={() => loadIncidents()} /> : null}
      {!loading && error && incidents.length ? <p className="inline-alert inline-alert--error">{error}</p> : null}
      {!loading && !error && !sortedIncidents.length ? (
        <EmptyState title="Chưa có sự cố" description="Hiện không có sự cố nào để hiển thị." />
      ) : null}

      {!loading && sortedIncidents.length ? (
        <div className="incident-grid">
          {sortedIncidents.map((incident) => (
            <article className="incident-card" key={incident._id || incident.id}>
              <div className="incident-card__header">
                <span className={`severity severity--${(incident.severity || 'unknown').toLowerCase()}`}>{incident.severity || 'CHƯA RÕ'}</span>
                <span>{incident.status || 'Chưa có dữ liệu'}</span>
              </div>
              <h2>{incident.orderId?.orderCode || 'Chưa có mã đơn'}</h2>
              <p>{incident.description || 'Chưa có mô tả.'}</p>
              <dl className="detail-grid detail-grid--single">
                <div><dt>Tài xế</dt><dd>{incident.driverId?.fullName || 'Chưa có dữ liệu'}</dd></div>
                <div><dt>Thời điểm báo</dt><dd>{incident.createdAt ? new Date(incident.createdAt).toLocaleString('vi-VN') : 'Chưa có dữ liệu'}</dd></div>
                <div><dt>Tọa độ</dt><dd>{Array.isArray(incident.location?.coordinates) ? incident.location.coordinates.join(', ') : 'Chưa có dữ liệu'}</dd></div>
              </dl>
              <p className="read-only-note">Thông tin sự cố đang ở chế độ chỉ đọc.</p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
};

export default SOSAlerts;
