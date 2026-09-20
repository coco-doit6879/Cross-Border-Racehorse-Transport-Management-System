import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import BookingStatusBadge from '../../components/operations/BookingStatusBadge';
import { EmptyState, ErrorState, LoadingState } from '../../components/operations/PageFeedback';
import { orderApi } from '../../services/orderApi';
import { getApiErrorMessage, getCollection } from '../../utils/apiResponse';

const PAGE_SIZE = 8;

const BookingApprovalPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('PENDING_APPROVAL');
  const [page, setPage] = useState(1);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await orderApi.getOrders();
      setOrders(getCollection(response, 'đơn vận chuyển'));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Không thể tải danh sách đơn vận chuyển.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return orders.filter((order) => {
      const searchableText = [order.orderCode, order.customerId?.fullName, order.customerId?.email, order.origin, order.destination]
        .filter(Boolean).join(' ').toLowerCase();
      return (!status || order.status === status) && (!normalizedSearch || searchableText.includes(normalizedSearch));
    });
  }, [orders, search, status]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleOrders = filteredOrders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const updateFilters = (setter) => (event) => { setter(event.target.value); setPage(1); };

  return (
    <section className="operations-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">Quản lý logistics</span>
          <h1>Danh sách phê duyệt đơn</h1>
          <p>Tìm kiếm, lọc và mở chi tiết các yêu cầu vận chuyển cần xử lý.</p>
        </div>
        <button className="button button--secondary" type="button" onClick={loadOrders} disabled={loading}>Làm mới</button>
      </header>

      <div className="filter-bar">
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <input type="search" value={search} onChange={updateFilters(setSearch)}
            placeholder="Tìm mã đơn, khách hàng hoặc hành trình" aria-label="Tìm đơn vận chuyển" />
        </label>
        <label className="select-field">
          <span>Trạng thái</span>
          <select value={status} onChange={updateFilters(setStatus)}>
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING_APPROVAL">Chờ phê duyệt</option>
            <option value="APPROVED">Đã phê duyệt</option>
            <option value="REJECTED">Đã từ chối</option>
            <option value="DOCS_PROCESSING">Đang xử lý hồ sơ</option>
            <option value="CLEARED_FOR_TRANSPORT">Đủ điều kiện vận chuyển</option>
            <option value="IN_TRANSIT">Đang vận chuyển</option>
            <option value="INCIDENT_HANDLING">Đang xử lý sự cố</option>
            <option value="DELIVERING">Đang bàn giao</option>
            <option value="COMPLETED">Hoàn tất</option>
          </select>
        </label>
      </div>

      {loading ? <LoadingState label="Đang tải danh sách đơn…" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={loadOrders} /> : null}
      {!loading && !error && !visibleOrders.length ? (
        <EmptyState title="Không tìm thấy đơn" description="Hãy thử từ khóa hoặc bộ lọc trạng thái khác." />
      ) : null}

      {!loading && !error && visibleOrders.length ? (
        <>
          <div className="table-card">
            <table className="data-table">
              <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Hành trình</th><th>Ngày vận chuyển</th><th>Số ngựa</th><th>Trạng thái</th><th><span className="sr-only">Thao tác</span></th></tr></thead>
              <tbody>
                {visibleOrders.map((order) => (
                  <tr key={order._id || order.id}>
                    <td><strong>{order.orderCode || 'Chưa có dữ liệu'}</strong></td>
                    <td><span>{order.customerId?.fullName || 'Chưa có dữ liệu'}</span><small>{order.customerId?.email || ''}</small></td>
                    <td><span>{order.origin || 'Chưa có dữ liệu'}</span><small>đến {order.destination || 'Chưa có dữ liệu'}</small></td>
                    <td>Chưa có dữ liệu</td>
                    <td>{Array.isArray(order.horses) ? order.horses.length : 'Chưa có dữ liệu'}</td>
                    <td><BookingStatusBadge status={order.status} /></td>
                    <td><Link className="table-link" to={`/manager/approvals/${order._id || order.id}`}>Xem chi tiết</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <p>{filteredOrders.length} đơn phù hợp</p>
            <div>
              <button type="button" aria-label="Trang trước" disabled={currentPage === 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={18} /></button>
              <span>Trang {currentPage} / {totalPages}</span>
              <button type="button" aria-label="Trang sau" disabled={currentPage === totalPages}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}><ChevronRight size={18} /></button>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
};

export default BookingApprovalPage;
