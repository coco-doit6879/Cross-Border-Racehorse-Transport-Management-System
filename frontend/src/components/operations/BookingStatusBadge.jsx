import React from 'react';
import { ORDER_STATUS_LABELS } from '../../utils/constants';

const BookingStatusBadge = ({ status }) => {
  const normalizedStatus = status || 'UNKNOWN';
  const cssStatus = normalizedStatus.toLowerCase().replaceAll('_', '-');

  return (
    <span className={`status-badge status-badge--${cssStatus}`}>
      {ORDER_STATUS_LABELS[normalizedStatus] || normalizedStatus.replaceAll('_', ' ')}
    </span>
  );
};

export default BookingStatusBadge;
