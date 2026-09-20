import React, { useRef, useState } from 'react';
import { orderApi } from '../../services/orderApi';
import { getApiErrorMessage, getResource } from '../../utils/apiResponse';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';

const BookingApprovalActions = ({ order, user, onUpdatedOrder, onRefresh }) => {
  const actionLock = useRef(false);
  const [isApproving, setIsApproving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const canApprove = hasPermission(user, PERMISSIONS.BOOKING_APPROVE);
  const isPending = order?.status === 'PENDING_APPROVAL';

  if (!isPending) {
    return (
      <div className="approval-actions">
        <div className="approval-note">Chỉ có thể xử lý đơn đang ở trạng thái chờ phê duyệt.</div>
        {feedback ? <p className={`inline-alert inline-alert--${feedback.type}`} role="status">{feedback.message}</p> : null}
      </div>
    );
  }

  if (!canApprove) {
    return <div className="approval-note approval-note--warning">Tài khoản hiện tại không được phép phê duyệt đơn.</div>;
  }

  const approve = async () => {
    if (actionLock.current) return;
    actionLock.current = true;
    setIsApproving(true);
    setFeedback(null);

    try {
      const response = await orderApi.updateStatus(order._id || order.id, 'APPROVED');
      const updatedOrder = getResource(response, 'đơn đã cập nhật');
      onUpdatedOrder({
        ...order,
        status: updatedOrder.status || 'APPROVED',
        updatedAt: updatedOrder.updatedAt || order.updatedAt
      });
      setFeedback({ type: 'success', message: 'Đơn đã được phê duyệt.' });

      try {
        await onRefresh();
        setFeedback({ type: 'success', message: 'Đơn đã được phê duyệt và dữ liệu mới nhất đã được tải lại.' });
      } catch (refreshError) {
        setFeedback({
          type: 'warning',
          message: `Đơn đã được phê duyệt nhưng chưa thể tải lại dữ liệu: ${getApiErrorMessage(refreshError, 'Vui lòng thử làm mới trang.')}`
        });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: getApiErrorMessage(error, 'Không thể phê duyệt đơn.') });
    } finally {
      actionLock.current = false;
      setIsApproving(false);
    }
  };

  return (
    <div className="approval-actions">
      <div className="approval-actions__buttons">
        <button className="button button--primary" type="button" disabled={isApproving} onClick={approve}>
          {isApproving ? 'Đang phê duyệt…' : 'Phê duyệt đơn'}
        </button>
        <button className="button button--danger-outline" type="button" disabled
          title="Backend chưa hỗ trợ lưu lý do từ chối">
          Từ chối đơn — chưa khả dụng
        </button>
      </div>

      <p className="approval-note approval-note--warning">
        Chức năng từ chối chưa khả dụng vì hệ thống chưa hỗ trợ lưu lý do từ chối.
      </p>

      {feedback ? <p className={`inline-alert inline-alert--${feedback.type}`} role="status">{feedback.message}</p> : null}
    </div>
  );
};

export default BookingApprovalActions;
