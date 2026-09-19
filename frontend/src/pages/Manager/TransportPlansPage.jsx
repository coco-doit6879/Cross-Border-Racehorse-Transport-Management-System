import React, { useCallback, useEffect, useState } from 'react';
import TransportPlanSummary from '../../components/operations/TransportPlanSummary';
import { EmptyState, ErrorState, LoadingState } from '../../components/operations/PageFeedback';
import { routeApi } from '../../services/routeApi';
import { getApiErrorMessage, getCollection } from '../../utils/apiResponse';

const TransportPlansPage = () => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadRoutes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await routeApi.getRoutes();
      setRoutes(getCollection(response, 'kế hoạch vận chuyển'));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Không thể tải kế hoạch vận chuyển.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRoutes(); }, [loadRoutes]);

  return (
    <section className="operations-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">Theo dõi kế hoạch</span>
          <h1>Kế hoạch vận chuyển</h1>
          <p>Xem hành trình, điểm dừng, phương tiện và tài xế đã được phân công.</p>
        </div>
        <button className="button button--secondary" type="button" onClick={loadRoutes} disabled={loading}>Làm mới</button>
      </header>

      <p className="read-only-note manager-scope-note">
        Trang này chỉ hiển thị kế hoạch. Việc phân công hoặc thay đổi nhân sự không khả dụng tại đây.
      </p>

      {loading ? <LoadingState label="Đang tải kế hoạch vận chuyển…" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={loadRoutes} /> : null}
      {!loading && !error && !routes.length ? (
        <EmptyState title="Chưa có kế hoạch vận chuyển" description="Hiện không có kế hoạch nào để hiển thị." />
      ) : null}
      {!loading && !error && routes.length ? (
        <div className="plan-grid">
          {routes.map((route) => <TransportPlanSummary route={route} key={route._id || route.id} />)}
        </div>
      ) : null}
    </section>
  );
};

export default TransportPlansPage;

