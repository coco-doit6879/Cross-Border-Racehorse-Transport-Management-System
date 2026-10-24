import React from 'react';
import { ConfigProvider } from 'antd';
import { heritageTheme } from '../../styles/heritageTheme';
import './operations-ui.css';
import './workflow.css';

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
    ? 'positive' : ['INCIDENT_HANDLING', 'REJECTED', 'INACTIVE'].includes(value) ? 'critical' : ['PENDING_APPROVAL','PENDING_REVIEW','PENDING_UPLOAD','PENDING','UNPAID','PARTIALLY_PAID','DOCS_PROCESSING'].includes(value) ? 'pending' : 'neutral';
  return <span className={`ops-status ops-status--${tone}`}>{label || labels[value] || value || 'Chưa cập nhật'}</span>;
}

export function Workspace({ eyebrow, title, description, actions, children, className = '', inheritTheme = false }) {
  const blocks = React.Children.toArray(children);
  const metrics = blocks.find(child => React.isValidElement(child) && child.type === Metrics);
  const workbench = metrics && !blocks.some(child => child.props?.className?.includes('ops-split'));
  return <ConfigProvider theme={heritageTheme}>
    <section className={`ops-workspace ${className}`}>
      <header className="ops-heading">
        <div><div className="ops-eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>
        {actions && <div className="ops-actions">{actions}</div>}
      </header>
      {workbench ? <div className="ops-workbench"><aside>{metrics}</aside><div className="ops-workbench-content">{blocks.filter(child => child !== metrics)}</div></div> : children}
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
