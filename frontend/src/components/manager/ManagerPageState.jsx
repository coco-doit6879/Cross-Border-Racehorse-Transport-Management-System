import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { ErrorState, LoadingState } from '../operations/PageFeedback';
import { useManagerData } from '../../context/ManagerDataContext';

const ManagerPageState = ({ children }) => {
  const { loading, error, notice, setNotice } = useManagerData();

  if (loading) return <section className="operations-page"><LoadingState label="Đang tải dữ liệu quản lý…" /></section>;
  if (error) return <section className="operations-page"><ErrorState title="Chưa thể tải dữ liệu" message={error} /></section>;

  return (
    <>
      {notice ? (
        <div className={`manager-toast manager-toast--${notice.tone}`} role="status">
          {notice.tone === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{notice.message}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Đóng thông báo">×</button>
        </div>
      ) : null}
      {children}
    </>
  );
};

export default ManagerPageState;

