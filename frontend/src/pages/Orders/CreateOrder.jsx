import React from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import CustomerCreateOrder from './CustomerCreateOrder';
import OperationalCreateOrder from './OperationalCreateOrder';

export default function CreateOrder() {
  const role = useAuthStore((state) => state.user?.role);
  return role === 'CUSTOMER' ? <CustomerCreateOrder /> : <OperationalCreateOrder />;
}
