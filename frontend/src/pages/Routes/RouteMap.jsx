import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Empty, Row, Select, Space, Spin, Steps, Tag, message } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, CompassOutlined, ReloadOutlined } from '@ant-design/icons';
import { CircleMarker, MapContainer, Popup, Polyline, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { routeApi } from '../../services/routeApi';
import { connectSocket } from '../../socket/socketClient';

function FitRoutes({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 10 });
    }
  }, [map, points]);
  return null;
}

export default function RouteMap() {
  const [routes, setRoutes] = useState([]);
  const [selected, setSelected] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [error, setError] = useState('');

  const loadRoutes = async () => {
    try {
      const response = await routeApi.getRoutes();
      const list = response.data.data || [];
      setRoutes(list);
      if (selected === 'ALL' && list.length > 0) {
        setSelected(list[0]._id);
      }
      return list;
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải vị trí đội xe.');
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    let socket;

    loadRoutes().then((list) => {
      if (!active) return;
      socket = connectSocket();
      list.forEach((route) => socket.emit('join_trip', { tripId: route._id }));
      socket.on('route:location_changed', (update) => {
        setRoutes((current) =>
          current.map((route) => {
            if (route._id !== update.tripId) return route;
            const updatedWaypoints = (route.waypoints || []).map((w) => {
              if (
                w.location?.coordinates &&
                Math.abs(w.location.coordinates[0] - update.longitude) < 0.001 &&
                Math.abs(w.location.coordinates[1] - update.latitude) < 0.001
              ) {
                return { ...w, status: 'ARRIVED', actualArrival: update.timestamp };
              }
              return w;
            });
            return {
              ...route,
              waypoints: updatedWaypoints,
              currentLocation: {
                type: 'Point',
                coordinates: [update.longitude, update.latitude],
                speedKmh: update.speedKmh,
                updatedAt: update.timestamp
              }
            };
          })
        );
      });
    });

    return () => {
      active = false;
      if (socket) socket.off('route:location_changed');
    };
  }, []);

  const handleQuickCheckin = async (routeId, waypoint) => {
    setCheckingIn(true);
    try {
      await routeApi.waypointCheckin(routeId, {
        waypointId: waypoint._id,
        sequence: waypoint.sequence,
        status: 'ARRIVED'
      });
      message.success(`Đã check-in thành công tại: ${waypoint.name}`);
      await loadRoutes();
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể check-in mốc này.');
    } finally {
      setCheckingIn(false);
    }
  };

  const visible = selected === 'ALL' ? routes : routes.filter((route) => route._id === selected);
  const activeRoute = selected !== 'ALL' ? routes.find((r) => r._id === selected) : routes[0];

  const points = useMemo(
    () =>
      visible.flatMap((route) => [
        route.orderId?.origin?.coordinates,
        route.orderId?.destination?.coordinates,
        route.currentLocation?.coordinates,
        ...(route.waypoints || []).map((w) => w.location?.coordinates)
      ].filter(Array.isArray).map(([lng, lat]) => [lat, lng])),
    [visible]
  );

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '60px auto' }} />;

  return (
    <Space direction="vertical" size={18} style={{ width: '100%' }}>
      <Card
        title={
          <Space>
            <CompassOutlined style={{ color: '#0F3E2E', fontSize: 20 }} />
            <span>Theo dõi Lộ trình & Mốc hành trình Real-time</span>
          </Space>
        }
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadRoutes} loading={loading}>
              Làm mới
            </Button>
            <Select
              value={selected}
              onChange={setSelected}
              style={{ width: 280 }}
              options={[
                { value: 'ALL', label: '🌐 Tất cả các chuyến' },
                ...routes.map((route) => ({
                  value: route._id,
                  label: `🚛 ${route.vehiclePlateNumber || 'Xe'} - ${route.orderId?.bookingCode || route._id}`
                }))
              ]}
            />
          </Space>
        }
      >
        <p style={{ margin: 0, color: '#6B7280' }}>
          Hệ thống kết hợp giám sát tọa độ thời gian thực (Socket.io) và cơ chế Check-in theo mốc (Milestone Tracking).
          Khi tài xế check-in tại mốc trạm, vị trí xe trên bản đồ sẽ tự động cập nhật ngay lập tức.
        </p>
      </Card>

      {error && <Alert type="error" showIcon message={error} />}
      {visible.some(route => route.demoSimulation) && <Alert type="warning" showIcon message="DEMO — Có chuyến sử dụng vị trí và trạm nghỉ mô phỏng, không phải GPS thực tế." />}

      {!routes.length ? (
        <Empty description="Chưa có chuyến vận chuyển nào được điều phối" />
      ) : (
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={activeRoute ? 15 : 24}>
            <div style={{ height: 620, borderRadius: 12, overflow: 'hidden', border: '1px solid #E5E7EB' }}>
              <MapContainer center={[11.5, 105.5]} zoom={6} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <FitRoutes points={points} />
                {visible.map((route) => {
                  const origin = route.orderId?.origin?.coordinates;
                  const destination = route.orderId?.destination?.coordinates;
                  const current = route.currentLocation?.coordinates;
                  const waypoints = route.waypoints || [];

                  // Line connecting origin -> waypoints -> destination
                  const linePoints = [
                    origin,
                    ...waypoints.map((w) => w.location?.coordinates),
                    destination
                  ].filter(Array.isArray).map(([lng, lat]) => [lat, lng]);

                  return (
                    <React.Fragment key={route._id}>
                      {linePoints.length > 1 && (
                        <Polyline positions={linePoints} pathOptions={{ color: '#0F3E2E', weight: 4, opacity: 0.8 }} />
                      )}

                      {/* Origin Marker */}
                      {origin && (
                        <CircleMarker center={[origin[1], origin[0]]} radius={9} pathOptions={{ color: '#16A34A', fillColor: '#22C55E', fillOpacity: 0.9 }}>
                          <Popup>
                            <strong>📍 Điểm đón (Xuất phát)</strong><br />
                            {route.orderId?.origin?.address || 'Điểm đón'}<br />
                            Mã đơn: <strong>{route.orderId?.bookingCode}</strong>
                          </Popup>
                        </CircleMarker>
                      )}

                      {/* Intermediate Waypoints */}
                      {waypoints.map((w) => {
                        const coords = w.location?.coordinates;
                        if (!coords) return null;
                        const isArrived = w.status === 'ARRIVED';
                        return (
                          <CircleMarker
                            key={w._id || w.sequence}
                            center={[coords[1], coords[0]]}
                            radius={isArrived ? 8 : 6}
                            pathOptions={{
                              color: isArrived ? '#16A34A' : '#9CA3AF',
                              fillColor: isArrived ? '#4ADE80' : '#E5E7EB',
                              fillOpacity: 0.9,
                              weight: 2
                            }}
                          >
                            <Popup>
                              <strong>Mốc {w.sequence}: {w.name}</strong><br />
                              Loại: <Tag color="blue">{w.type}</Tag><br />
                              Trạng thái: {isArrived ? <Tag color="green">✓ Đã đến</Tag> : <Tag>Chưa đến</Tag>}<br />
                              {w.actualArrival && (
                                <small>Đến lúc: {new Date(w.actualArrival).toLocaleString('vi-VN')}</small>
                              )}
                            </Popup>
                          </CircleMarker>
                        );
                      })}

                      {/* Destination Marker */}
                      {destination && (
                        <CircleMarker center={[destination[1], destination[0]]} radius={9} pathOptions={{ color: '#DC2626', fillColor: '#EF4444', fillOpacity: 0.9 }}>
                          <Popup>
                            <strong>🏁 Điểm giao (Đích)</strong><br />
                            {route.orderId?.destination?.address || 'Điểm giao'}
                          </Popup>
                        </CircleMarker>
                      )}

                      {/* Vehicle Current Location Marker */}
                      {current && (
                        <CircleMarker
                          center={[current[1], current[0]]}
                          radius={13}
                          pathOptions={{ color: '#D97706', fillColor: '#F59E0B', fillOpacity: 1, weight: 3 }}
                        >
                          <Popup>
                            <div style={{ minWidth: 160 }}>
                              <strong style={{ fontSize: 14 }}>🚛 {route.vehiclePlateNumber}</strong><br />
                              Tài xế: <strong>{route.driverId?.fullName || 'Chưa gán'}</strong><br />
                              Trạng thái: <Tag color="orange">{route.status}</Tag><br />
                              {route.currentLocation?.speedKmh ? `${Math.round(route.currentLocation.speedKmh)} km/h` : 'Đang đỗ tại mốc'}<br />
                              <small style={{ color: '#6B7280' }}>
                                Cập nhật: {new Date(route.currentLocation.updatedAt).toLocaleTimeString('vi-VN')}
                              </small>
                            </div>
                          </Popup>
                        </CircleMarker>
                      )}
                    </React.Fragment>
                  );
                })}
              </MapContainer>
            </div>
          </Col>

          {/* Right Panel: Milestones & Progress */}
          {activeRoute && (
            <Col xs={24} lg={9}>
              <Card
                title={
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <span>Tiến độ Hành trình</span>
                    <Tag color={activeRoute.status === 'COMPLETED' ? 'green' : activeRoute.status === 'IN_TRANSIT' ? 'blue' : 'orange'}>
                      {activeRoute.status}
                    </Tag>
                  </Space>
                }
                style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                bodyStyle={{ flex: 1, overflowY: 'auto' }}
              >
                <div style={{ backgroundColor: '#F9FAFB', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                  <div style={{ fontSize: 13, color: '#6B7280' }}>Mã vận đơn</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
                    {activeRoute.orderId?.bookingCode || '—'}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 13 }}>
                    <span>Xe: <strong>{activeRoute.vehiclePlateNumber || '—'}</strong></span>
                    <span>Tài xế: <strong>{activeRoute.driverId?.fullName || '—'}</strong></span>
                  </div>
                </div>

                <div style={{ fontWeight: 600, marginBottom: 12, color: '#374151' }}>
                  Danh sách Mốc kiểm soát ({activeRoute.waypoints?.filter((w) => w.status === 'ARRIVED').length || 0}/
                  {activeRoute.waypoints?.length || 0} mốc hoàn tất)
                </div>

                <Steps
                  direction="vertical"
                  size="small"
                  current={
                    (activeRoute.waypoints || []).findIndex((w) => w.status === 'PENDING') !== -1
                      ? (activeRoute.waypoints || []).findIndex((w) => w.status === 'PENDING')
                      : (activeRoute.waypoints || []).length
                  }
                  items={[
                    {
                      title: <span style={{ fontWeight: 600 }}>Điểm đón (Xuất phát)</span>,
                      description: (
                        <div style={{ fontSize: 12, color: '#6B7280' }}>
                          {activeRoute.orderId?.origin?.address}
                        </div>
                      ),
                      status: 'finish',
                      icon: <CheckCircleOutlined style={{ color: '#16A34A' }} />
                    },
                    ...(activeRoute.waypoints || []).map((w, index) => {
                      const isArrived = w.status === 'ARRIVED';
                      const isNextPending =
                        !isArrived &&
                        (index === 0 || activeRoute.waypoints[index - 1]?.status === 'ARRIVED');

                      return {
                        title: (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600 }}>{w.name}</span>
                            {isArrived ? (
                              <Tag color="green" style={{ margin: 0 }}>✓ Đã đến</Tag>
                            ) : (
                              <Tag style={{ margin: 0 }}>Chưa đến</Tag>
                            )}
                          </div>
                        ),
                        description: (
                          <div style={{ marginTop: 4 }}>
                            <div style={{ fontSize: 12, color: '#6B7280' }}>
                              Loại: <Tag color="blue" style={{ fontSize: 11, padding: '0 4px' }}>{w.type}</Tag>
                            </div>
                            {w.actualArrival ? (
                              <div style={{ fontSize: 12, color: '#16A34A', marginTop: 2 }}>
                                Giờ đến: {new Date(w.actualArrival).toLocaleTimeString('vi-VN')}
                              </div>
                            ) : (
                              <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                                Dự kiến: {new Date(w.estimatedArrival).toLocaleTimeString('vi-VN')}
                              </div>
                            )}

                            {/* Demo Quick Check-in Button */}
                            {isNextPending && ['IN_TRANSIT', 'DELIVERING'].includes(activeRoute.status) && (
                              <Button
                                type="primary"
                                size="small"
                                loading={checkingIn}
                                style={{ marginTop: 6, fontSize: 12, backgroundColor: '#0F3E2E' }}
                                onClick={() => handleQuickCheckin(activeRoute._id, w)}
                              >
                                🎯 Demo Check-in mốc này
                              </Button>
                            )}
                          </div>
                        ),
                        status: isArrived ? 'finish' : isNextPending ? 'process' : 'wait',
                        icon: isArrived ? (
                          <CheckCircleOutlined style={{ color: '#16A34A' }} />
                        ) : (
                          <ClockCircleOutlined />
                        )
                      };
                    }),
                    {
                      title: <span style={{ fontWeight: 600 }}>Điểm giao (Đích)</span>,
                      description: (
                        <div style={{ fontSize: 12, color: '#6B7280' }}>
                          {activeRoute.orderId?.destination?.address}
                        </div>
                      ),
                      status: activeRoute.status === 'COMPLETED' ? 'finish' : 'wait'
                    }
                  ]}
                />
              </Card>
            </Col>
          )}
        </Row>
      )}
    </Space>
  );
}
