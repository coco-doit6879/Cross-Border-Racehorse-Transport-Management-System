import React from 'react';
import { ConfigProvider } from 'antd';
import './operations-ui.css';

const labels = {
  PENDING_APPROVAL: 'Chờ duyệt đơn', APPROVED: 'Đã duyệt', DOCS_PROCESSING: 'Đang xử lý hồ sơ',
  CLEARED_FOR_TRANSPORT: 'Đủ điều kiện vận chuyển', SCHEDULED: 'Đã phân công', IN_TRANSIT: 'Đang vận chuyển',
  INCIDENT_HANDLING: 'Đang xử lý sự cố', DELIVERING: 'Đang bàn giao', COMPLETED: 'Hoàn thành', CANCELLED: 'Đã hủy',
  PENDING_REVIEW: 'Chờ thẩm định', PENDING_UPLOAD: 'Cần bổ sung', REJECTED: 'Cần xem lại',
  ACTIVE: 'Hoạt động', INACTIVE: 'Ngừng hoạt động', MAINTENANCE: 'Bảo dưỡng',
  PAID: 'Đã thanh toán đủ', PARTIALLY_PAID: 'Đã đặt cọc', UNPAID: 'Chưa thanh toán'
};

export function StatusPill({ value, label }) {
  const tone = ['APPROVED', 'CLEARED_FOR_TRANSPORT', 'COMPLETED', 'PAID', 'ACTIVE'].includes(value)
    ? 'positive' : ['INCIDENT_HANDLING', 'REJECTED', 'INACTIVE'].includes(value) ? 'critical' : 'neutral';
  return <span className={`ops-status ops-status--${tone}`}>{label || labels[value] || value || 'Chưa cập nhật'}</span>;
}

export function Workspace({ eyebrow, title, description, actions, children }) {
  return <ConfigProvider theme={{ token: { colorPrimary: '#0F3E2E', colorText: '#202824', colorTextSecondary: '#66716b', colorBorder: '#dce2dd', borderRadius: 8, controlHeight: 40 }, components: { Table: { headerBg: '#f5f7f5', headerColor: '#536057', cellPaddingBlock: 16 }, Card: { headerFontSize: 16 } } }}>
    <section className="ops-workspace">
      <header className="ops-heading">
        <div><div className="ops-eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>
        {actions && <div className="ops-actions">{actions}</div>}
      </header>
      {children}
    </section>
  </ConfigProvider>;
}

export function Metrics({ items }) {
  return <div className="ops-metrics">{items.map(item => <div className="ops-metric" key={item.label}>
    <span>{item.label}</span><strong>{item.value ?? '—'}</strong>{item.detail && <small>{item.detail}</small>}
  </div>)}</div>;
}

export function DataPanel({ title, description, extra, children }) {
  return <section className="ops-panel">
    <header className="ops-panel-heading"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{extra && <div className="ops-actions">{extra}</div>}</header>
    <div className="ops-panel-body">{children}</div>
  </section>;
}
