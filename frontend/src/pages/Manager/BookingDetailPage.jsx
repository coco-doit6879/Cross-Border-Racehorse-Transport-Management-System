import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import BookingApprovalActions from '../../components/operations/BookingApprovalActions';
import BookingStatusBadge from '../../components/operations/BookingStatusBadge';
import { ErrorState, LoadingState } from '../../components/operations/PageFeedback';
import { orderApi } from '../../services/orderApi';
import { useAuthStore } from '../../store/useAuthStore';
import { getApiErrorMessage, getResource } from '../../utils/apiResponse';

const BookingDetailPage = () => {
  const { id } = useParams();
  const user = useAuthStore((state) => state.user);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const requestOrder = useCallback(async () => {
    const response = await orderApi.getOrderById(id);
    return getResource(response, 'đơn vận chuyển');
  }, [id]);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setOrder(await requestOrder());
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Không thể tải chi tiết đơn.'));
    } finally {
      setLoading(false);
    }
  }, [requestOrder]);

  const refreshAfterApproval = useCallback(async () => {
    const refreshedOrder = await requestOrder();
    setOrder(refreshedOrder);
    return refreshedOrder;
  }, [requestOrder]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  if (loading) return <LoadingState label="Đang tải chi tiết đơn…" />;
  if (error) return <ErrorState message={error} onRetry={loadOrder} />;

  const customer = order?.customerId;
  const horses = Array.isArray(order?.horses) ? order.horses : [];

  return (
    <section className="operations-page">
      <Link className="back-link" to="/manager/approvals"><ArrowLeft size={17} /> Quay lại danh sách phê duyệt</Link>

      <header className="page-header page-header--detail">
        <div>
          <span className="eyebrow">Chi tiết đơn vận chuyển</span>
          <h1>{order?.orderCode || 'Chưa có mã đơn'}</h1>
          <p>Tạo lúc {order?.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : 'chưa có dữ liệu'}</p>
        </div>
        <BookingStatusBadge status={order?.status} />
      </header>

      <div className="detail-layout">
        <div className="detail-layout__main">
          <article className="content-card">
            <h2>Khách hàng và hành trình</h2>
            <dl className="detail-grid">
              <div><dt>Khách hàng</dt><dd>{customer?.fullName || 'Chưa có dữ liệu'}</dd></div>
              <div><dt>Email</dt><dd>{customer?.email || 'Chưa có dữ liệu'}</dd></div>
              <div><dt>Số điện thoại</dt><dd>{customer?.phone || 'Chưa có dữ liệu'}</dd></div>
              <div><dt>Ngày vận chuyển</dt><dd>Chưa có dữ liệu</dd></div>
              <div><dt>Điểm đi</dt><dd>{order?.origin || 'Chưa có dữ liệu'}</dd></div>
              <div><dt>Điểm đến</dt><dd>{order?.destination || 'Chưa có dữ liệu'}</dd></div>
            </dl>
          </article>

          <article className="content-card">
            <div className="content-card__heading"><h2>Ngựa vận chuyển</h2><span>{horses.length} hồ sơ</span></div>
            {horses.length ? (
              <div className="horse-list">
                {horses.map((horse, index) => (
                  <div className="horse-row" key={horse._id || horse.id || index}>
                    <div className="horse-row__avatar">{horse.name?.charAt(0) || 'N'}</div>
                    <div><strong>{horse.name || 'Chưa có dữ liệu'}</strong><small>{horse.breed || 'Chưa có giống ngựa'}</small></div>
                    <dl>
                      <div><dt>Mã vi mạch</dt><dd>{horse.microchipId || 'Chưa có dữ liệu'}</dd></div>
                      <div><dt>Hộ chiếu FEI</dt><dd>{horse.feiPassportNo || 'Chưa có dữ liệu'}</dd></div>
                    </dl>
                  </div>
                ))}
              </div>
            ) : <p className="muted-text">Chưa có dữ liệu ngựa.</p>}
          </article>

          <article className="content-card">
            <h2>Yêu cầu đặc biệt</h2>
            <p className="muted-text">Chưa có dữ liệu cho nội dung này.</p>
          </article>
        </div>

        <aside className="detail-layout__aside">
          <article className="content-card content-card--sticky">
            <h2>Quyết định</h2>
            <BookingApprovalActions order={order} user={user} onUpdatedOrder={setOrder} onRefresh={refreshAfterApproval} />
          </article>
        </aside>
      </div>
    </section>
  );
};

export default BookingDetailPage;
