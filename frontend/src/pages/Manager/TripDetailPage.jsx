import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useManagerData } from '../../context/ManagerDataContext';
import { Alert, Spin } from 'antd';
export default function TripDetailPage() {
  const { id } = useParams(); const { data, loading, error } = useManagerData();
  if (loading) return <Spin />;
  if (error) return <Alert type="error" message={error} />;
  const trip = data.trips.find(t => t.id === id);
  return trip ? <Navigate replace to={'/orders/' + trip.orderId} /> : <Alert type="error" message="Không tìm thấy chuyến." />;
}
