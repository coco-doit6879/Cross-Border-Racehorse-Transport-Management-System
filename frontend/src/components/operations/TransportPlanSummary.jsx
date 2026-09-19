import React from 'react';

const valueOrFallback = (value) => value || 'Chưa có dữ liệu';

const TransportPlanSummary = ({ route }) => {
  const order = route?.orderId;
  const driver = route?.driverId;
  const waypoints = Array.isArray(route?.waypoints) ? route.waypoints : [];

  return (
    <article className="plan-card">
      <div className="plan-card__heading">
        <div><span className="eyebrow">Kế hoạch vận chuyển</span><h3>{valueOrFallback(order?.orderCode)}</h3></div>
        <span className="plan-card__vehicle">{valueOrFallback(route?.vehicleId)}</span>
      </div>

      <dl className="detail-grid detail-grid--compact">
        <div><dt>Hành trình</dt><dd>{order?.origin && order?.destination ? `${order.origin} → ${order.destination}` : 'Chưa có dữ liệu'}</dd></div>
        <div><dt>Tài xế</dt><dd>{valueOrFallback(driver?.fullName)}</dd></div>
        <div><dt>Nhân viên hộ tống</dt><dd>Chưa có dữ liệu</dd></div>
        <div><dt>Trạng thái / thời gian dự kiến</dt><dd>Chưa có dữ liệu</dd></div>
      </dl>

      <div className="waypoint-list">
        {waypoints.length ? waypoints.map((waypoint, index) => (
          <div className="waypoint" key={waypoint._id || `${waypoint.locationName}-${index}`}>
            <span className="waypoint__index">{index + 1}</span>
            <div><strong>{valueOrFallback(waypoint.locationName)}</strong><small>{valueOrFallback(waypoint.type)} · {valueOrFallback(waypoint.status)}</small></div>
          </div>
        )) : <p className="muted-text">Chưa có điểm dừng.</p>}
      </div>
    </article>
  );
};

export default TransportPlanSummary;

