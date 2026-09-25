import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Card, Empty, Select, Space, Spin, Tag } from 'antd';
import { CircleMarker, MapContainer, Popup, Polyline, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { routeApi } from '../../services/routeApi';
import { connectSocket } from '../../socket/socketClient';

function FitRoutes({ points }) {
  const map = useMap();
  useEffect(() => { if (points.length) map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 10 }); }, [map, points]);
  return null;
}

export default function RouteMap() {
  const [routes, setRoutes] = useState([]); const [selected, setSelected] = useState('ALL'); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  useEffect(() => {
    let active = true; let socket;
    routeApi.getRoutes().then((response) => {
      if (!active) return;
      setRoutes(response.data.data); setLoading(false); socket = connectSocket();
      response.data.data.forEach((route) => socket.emit('join_trip', { tripId: route._id }));
      socket.on('route:location_changed', (update) => setRoutes((current) => current.map((route) => route._id === update.tripId ? { ...route, currentLocation: { type: 'Point', coordinates: [update.longitude, update.latitude], speedKmh: update.speedKmh, updatedAt: update.timestamp } } : route)));
    }).catch((err) => { if (active) { setError(err.response?.data?.message || 'Không thể tải vị trí đội xe.'); setLoading(false); } });
    return () => { active = false; if (socket) socket.off('route:location_changed'); };
  }, []);
  const visible = selected === 'ALL' ? routes : routes.filter((route) => route._id === selected);
  const points = useMemo(() => visible.flatMap((route) => [route.orderId?.origin?.coordinates, route.orderId?.destination?.coordinates, route.currentLocation?.coordinates].filter(Array.isArray).map(([lng, lat]) => [lat, lng])), [visible]);
  if (loading) return <Spin />;
  return <Space direction="vertical" size={18} style={{ width: '100%' }}><Card title="Theo dõi đội xe trực tiếp" extra={<Select value={selected} onChange={setSelected} style={{ width: 260 }} options={[{ value: 'ALL', label: 'Tất cả chuyến' }, ...routes.map((route) => ({ value: route._id, label: route.orderId?.bookingCode || route._id }))]} />}><p>Vị trí xuất hiện sau khi tài xế bắt đầu chuyến và ứng dụng gửi GPS.</p></Card>{error && <Alert type="error" message={error} />}{!routes.length ? <Empty description="Chưa có chuyến được phân công" /> : <div style={{ height: 600, borderRadius: 14, overflow: 'hidden' }}><MapContainer center={[10.7769, 106.7009]} zoom={6} style={{ height: '100%', width: '100%' }}><TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><FitRoutes points={points} />{visible.map((route) => {
    const origin = route.orderId?.origin?.coordinates; const destination = route.orderId?.destination?.coordinates; const current = route.currentLocation?.coordinates;
    const line = [origin, current, destination].filter(Array.isArray).map(([lng, lat]) => [lat, lng]);
    return <React.Fragment key={route._id}>{line.length > 1 && <Polyline positions={line} pathOptions={{ color: '#2563EB', weight: 4 }} />}{origin && <CircleMarker center={[origin[1], origin[0]]} radius={7} pathOptions={{ color: '#16A34A' }}><Popup>Điểm đón: {route.orderId.origin.address}</Popup></CircleMarker>}{destination && <CircleMarker center={[destination[1], destination[0]]} radius={7} pathOptions={{ color: '#DC2626' }}><Popup>Điểm giao: {route.orderId.destination.address}</Popup></CircleMarker>}{current && <CircleMarker center={[current[1], current[0]]} radius={10} pathOptions={{ color: '#F97316', fillOpacity: 1 }}><Popup><strong>{route.vehiclePlateNumber}</strong><br />{route.driverId?.fullName}<br /><Tag color="blue">{route.status}</Tag><br />Cập nhật: {new Date(route.currentLocation.updatedAt).toLocaleString('vi-VN')}</Popup></CircleMarker>}</React.Fragment>;
  })}</MapContainer></div>}</Space>;
}
