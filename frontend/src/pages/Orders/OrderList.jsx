import React from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import CustomerOrderList from './CustomerOrderList';
import OperationalOrderList from './OperationalOrderList';

export default function OrderList() {
  const role = useAuthStore((state) => state.user?.role);
  return role === 'CUSTOMER' ? <CustomerOrderList /> : <OperationalOrderList />;
}
