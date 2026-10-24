import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Select, Table } from 'antd';
import { RefreshCw } from 'lucide-react';
import { formatPaymentDate } from '../../utils/managerFormat';
import { analyticsApi } from '../../services/analyticsApi';
import RevenueBarChart from '../../components/analytics/RevenueBarChart';
import { StatusPill } from '../../components/operations/OperationsUI';
const money = n => `${Number(n || 0).toLocaleString('vi-VN')} ₫`;
const purposes = {
  DEPOSIT: 'Đặt cọc',
  BALANCE: 'Phần còn lại',
  REFUND: 'Hoàn tiền',
  SURCHARGE: 'Phụ thu'
};
const statuses = {
  PAID: 'Thành công',
  PENDING: 'Chờ thanh toán',
  FAILED: 'Thất bại',
  CANCELLED: 'Đã hủy',
  REFUNDED: 'Đã hoàn tiền'
};
const locationText = l => typeof l === 'string' ? l : l?.address || '—';
const datetime = formatPaymentDate;
export default function RevenueDashboard() {
  const [data, setData] = useState({}),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [status, setStatus] = useState(''),
    [purpose, setPurpose] = useState(''),
    [tab, setTab] = useState('transactions');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await analyticsApi.getRevenue({
        ...(status ? {
          status
        } : {}),
        ...(purpose ? {
          purpose
        } : {})
      });
      if (!r.data.success) throw new Error(r.data.message);
      setData(r.data.data);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Không tải được báo cáo.');
    } finally {
      setLoading(false);
    }
  }, [status, purpose]);
  useEffect(() => {
    load();
  }, [load]);
  const s = data.summary || {},
    transactions = data.transactions || [],
    orders = data.orderFinancials || [];
  const columns = tab === 'transactions' ? [{
    title: 'Giao dịch / Thời gian',
    dataIndex: 'txnRef',
    render: (v, r) => <><strong>{v}</strong><div className="bo-secondary">{datetime(r.payDate || r.createdAt)}</div>{r.transactionNo && <div className="bo-secondary">VNPAY: {r.transactionNo}</div>}</>
  }, {
    title: 'Đơn / Khách hàng',
    render: (_, r) => <><strong>{r.orderId?.bookingCode || '—'}</strong><div className="bo-secondary">{r.customerId?.fullName || '—'}</div>{r.orderId && <div className="bo-secondary">{locationText(r.orderId.origin)} → {locationText(r.orderId.destination)}</div>}</>
  }, {
    title: 'Mục đích',
    dataIndex: 'purpose',
    render: v => purposes[v] || v
  }, {
    title: 'Số tiền',
    dataIndex: 'amountVnd',
    align: 'right',
    render: money
  }, {
    title: 'Ngân hàng',
    render: (_, r) => <>{r.bankCode || 'VNPAY'}<div className="bo-secondary">{r.cardType}</div></>
  }, {
    title: 'Trạng thái',
    dataIndex: 'status',
    render: v => <StatusPill value={v} label={statuses[v] || v} />
  }] : [{
    title: 'Đơn / Khách hàng',
    render: (_, r) => <><strong>{r.bookingCode}</strong><div className="bo-secondary">{r.customerName}</div><div className="bo-secondary">{r.customerPhone}</div></>
  }, {
    title: 'Giá trị đơn',
    dataIndex: 'contractValue',
    align: 'right',
    render: money
  }, {
    title: 'Đặt cọc',
    dataIndex: 'depositStatus',
    render: v => <StatusPill value={v === 'PAID' ? 'APPROVED' : 'PENDING'} label={v === 'PAID' ? 'Đã cọc' : 'Chưa cọc'} />
  }, {
    title: 'Đã thu',
    dataIndex: 'totalPaid',
    align: 'right',
    render: money
  }, {
    title: 'Còn phải thu',
    dataIndex: 'outstanding',
    align: 'right',
    render: v => <span style={{
      color: v > 0 ? '#8b5a14' : undefined
    }}>{money(v)}</span>
  }, {
    title: 'Thanh toán',
    dataIndex: 'paymentStatus',
    render: v => <StatusPill value={v} />
  }, {
    title: 'Vận chuyển',
    dataIndex: 'orderStatus',
    render: v => <StatusPill value={v} />
  }];
  return <section className="bo-page heritage-revenue"><header className="desk-heading"><div><span className="h-kicker">Tài chính / Báo cáo</span><h1>Doanh thu & dòng tiền</h1><p>Tiền đã thu, nghĩa vụ còn lại và lịch sử từng giao dịch.</p></div><Button onClick={load} loading={loading} icon={<RefreshCw size={15} />}>Làm mới</Button></header>{error && <Alert type="error" showIcon message={error} action={<Button onClick={load}>Thử lại</Button>} />}
 <div className="finance-summary">{[['Thực thu', s.totalGrossRevenue], ['Tiền đặt cọc', s.depositCollected], ['Phần còn lại đã thu', s.balanceCollected], ['Còn phải thu', s.totalOutstanding]].map(([label, n]) => <div key={label}><span>{label}</span><strong>{loading && !data.summary ? '—' : money(n)}</strong></div>)}</div>
 <div className="finance-overview"><RevenueBarChart monthlyData={data.monthlyTrend || []} orderData={orders} /><aside className="finance-ledger"><span className="h-kicker">Đối chiếu dòng tiền</span><dl>{[['Giá trị hợp đồng', s.totalContractValue], ['Phụ thu', s.totalSurcharges], ['Hoàn trả', s.totalRefunded], ['Bồi thường', s.totalCompensated], ['Doanh thu ròng', s.netRevenue]].map(([label, n]) => <div key={label}><dt>{label}</dt><dd>{money(n)}</dd></div>)}</dl><h2>Kênh thu tiền</h2>{(data.bankBreakdown || []).map(b => <div className="finance-bank" key={b.bank}><strong>{b.bank}</strong><span>{money(b.amount)}</span><small>{b.count} giao dịch thành công</small></div>)}{!data.bankBreakdown?.length && <p className="bo-muted">Chưa có dữ liệu ngân hàng.</p>}</aside></div>
 <div className="finance-register"><div className="bo-tabs">{[['transactions', 'Giao dịch', transactions.length], ['orders', 'Đối soát theo đơn', orders.length]].map(([key, label, count]) => <button key={key} className={tab === key ? 'is-active' : ''} onClick={() => setTab(key)}>{label}<b>{count}</b></button>)}</div>{tab === 'transactions' && <div className="finance-filters"><Select aria-label="Trạng thái giao dịch" value={status} onChange={setStatus} options={[{
          value: '',
          label: 'Tất cả trạng thái'
        }, ...Object.entries(statuses).map(([value, label]) => ({
          value,
          label
        }))]} /><Select aria-label="Mục đích giao dịch" value={purpose} onChange={setPurpose} options={[{
          value: '',
          label: 'Tất cả mục đích'
        }, ...Object.entries(purposes).map(([value, label]) => ({
          value,
          label
        }))]} /></div>}<Table loading={loading} columns={columns} dataSource={tab === 'transactions' ? transactions : orders} rowKey={tab === 'transactions' ? '_id' : 'orderId'} scroll={{
        x: 850
      }} pagination={{
        pageSize: 10,
        showSizeChanger: true
      }} /></div>
 </section>;
}
