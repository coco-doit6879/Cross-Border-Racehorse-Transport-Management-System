import React, { useEffect, useState } from 'react';
import { Button, Card, Result, Spin } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { orderApi } from '../../services/orderApi';

const terminalStatuses = ['PAID', 'FAILED', 'CANCELLED', 'EXPIRED'];

const VnpayResult = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const txnRef = params.get('txnRef');
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!txnRef) {
      setError('Thiếu mã giao dịch VNPAY.');
      return undefined;
    }
    let stopped = false;
    let attempts = 0;
    const poll = async () => {
      try {
        const response = await orderApi.getPayment(txnRef);
        if (stopped) return;
        const value = response?.data?.data || response?.data;
        setPayment(value);
        attempts += 1;
        if (!terminalStatuses.includes(value.status) && attempts < 10) window.setTimeout(poll, 1500);
      } catch (err) {
        if (!stopped) setError(err.response?.data?.message || 'Không thể kiểm tra trạng thái giao dịch.');
      }
    };
    poll();
    return () => { stopped = true; };
  }, [txnRef]);

  if (error) return <Card><Result status="error" title="Không thể xác nhận thanh toán" subTitle={error} extra={<Button onClick={() => navigate('/orders')}>Về danh sách đơn</Button>} /></Card>;
  if (!payment || payment.status === 'PENDING') return <Card><Result icon={<Spin size="large" />} title="Đang chờ VNPAY xác nhận" subTitle="Vui lòng giữ trang này trong giây lát. Không cần thanh toán lại." extra={<Button onClick={() => navigate('/orders')}>Về danh sách đơn</Button>} /></Card>;
  if (payment.status === 'PAID') return <Card><Result status="success" title="Thanh toán thành công" subTitle={`Mã giao dịch: ${payment.transactionNo || payment.txnRef}`} extra={<Button type="primary" onClick={() => navigate(`/orders/${payment.orderId}`)}>Xem đơn vận chuyển</Button>} /></Card>;
  return <Card><Result status="error" title="Thanh toán chưa thành công" subTitle={payment.failureMessage || 'Bạn có thể quay lại đơn và thử thanh toán lại.'} extra={<Button type="primary" onClick={() => navigate(`/orders/${payment.orderId}`)}>Quay lại đơn</Button>} /></Card>;
};

export default VnpayResult;
