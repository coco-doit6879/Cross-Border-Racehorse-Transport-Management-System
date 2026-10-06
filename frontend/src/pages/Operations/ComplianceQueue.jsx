import React, { useEffect, useState } from 'react';
import { Alert, Card, Select, Space } from 'antd';
import { orderApi } from '../../services/orderApi';
import ComplianceDocuments from '../../components/operations/ComplianceDocuments';
export default function ComplianceQueue() {
  const [orders, setOrders] = useState([]);
  const [orderId, setOrderId] = useState();
  const [error, setError] = useState('');
  useEffect(() => { orderApi.getOrders().then(r => setOrders(r.data.data.filter(o => ['APPROVED', 'DOCS_PROCESSING', 'CLEARED_FOR_TRANSPORT'].includes(o.status)))).catch(() => setError('Không thể tải danh sách đơn.')); }, []);
  return <Space direction="vertical" size={20} style={{ width: '100%' }}>
    <Card title="Giấy tờ kiểm dịch & thông quan"><p>Chọn đơn đã duyệt để yêu cầu khách bổ sung giấy tờ hoặc thẩm định tệp đã nộp. Hồ sơ ngựa đã duyệt được sử dụng lại.</p>
      {error && <Alert type="error" message={error} />}
      <Select aria-label="Chọn đơn vận chuyển" placeholder="Chọn đơn vận chuyển" showSearch optionFilterProp="label" style={{ width: '100%' }} value={orderId} onChange={setOrderId} options={orders.map(o => ({ value: o._id, label: `${o.bookingCode} · ${o.customerId?.fullName || ''} · ${o.origin?.address} → ${o.destination?.address}` }))} />
    </Card>
    {orderId && <ComplianceDocuments key={orderId} orderId={orderId} specialist />}
  </Space>;
}
