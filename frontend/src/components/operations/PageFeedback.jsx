import React from 'react';

export const LoadingState = ({ label = 'Đang tải dữ liệu…' }) => (
  <div className="page-feedback" role="status">
    <span className="page-spinner" aria-hidden="true" />
    <p>{label}</p>
  </div>
);

export const EmptyState = ({ title = 'Chưa có dữ liệu', description }) => (
  <div className="page-feedback page-feedback--empty">
    <p className="page-feedback__title">{title}</p>
    {description ? <p>{description}</p> : null}
  </div>
);

export const ErrorState = ({ title = 'Không thể tải dữ liệu', message, onRetry }) => (
  <div className="page-feedback page-feedback--error" role="alert">
    <p className="page-feedback__title">{title}</p>
    <p>{message}</p>
    {onRetry ? (
      <button className="button button--secondary" type="button" onClick={onRetry}>
        Thử lại
      </button>
    ) : null}
  </div>
);
