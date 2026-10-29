import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Input, Skeleton, Tabs } from 'antd';
import { useSearchParams } from 'react-router-dom';
import { orderApi } from '../../services/orderApi';
import CustomsClearance from '../../components/operations/CustomsClearance';
import ComplianceDocuments from '../../components/operations/ComplianceDocuments';
import { Workspace, Metrics, DataPanel, StatusPill } from '../../components/operations/OperationsUI';

export default function ComplianceQueue() {
  const [params, setParams] = useSearchParams();
  const orderId = params.get('orderId');
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  useEffect(() => { setSearch(params.get('q') || ''); }, [params]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setOrders((await orderApi.getOrders()).data.data.filter(o => ['APPROVED', 'DOCS_PROCESSING', 'CLEARED_FOR_TRANSPORT', 'IN_TRANSIT', 'INCIDENT_HANDLING', 'DELIVERING'].includes(o.status))); }
    catch (err) { setError(err.response?.data?.message || 'Không thể tải danh sách đơn vận chuyển.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const selected = orders.find(o => o._id === orderId);
  const filtered = orders.filter(o => `${o.bookingCode} ${o.customerId?.fullName || ''} ${o.origin?.address || ''} ${o.destination?.address || ''}`.toLowerCase().includes(search.toLowerCase()));
  return <Workspace inheritTheme eyebrow="Thủ tục & kiểm dịch" title="Thẩm định chứng từ" description="Chọn đơn vận chuyển, kiểm tra hồ sơ và lưu kết quả xét duyệt theo từng mốc hành trình." actions={<Button loading={loading} onClick={load}>Làm mới danh sách</Button>}>
    <Metrics items={[
      { label: 'Đơn trong hàng đợi', value: orders.length, detail: 'Đã duyệt hoặc đang xử lý hồ sơ' },
      { label: 'Đang xử lý hồ sơ', value: orders.filter(o => o.status === 'DOCS_PROCESSING').length },
      { label: 'Đã đủ điều kiện', value: orders.filter(o => o.status === 'CLEARED_FOR_TRANSPORT').length }
    ]} />
    {error && <Alert type="error" message={error} action={<Button onClick={load}>Thử lại</Button>} />}
    <div className="ops-split">
      <DataPanel title="Đơn vận chuyển" description={`${filtered.length} đơn trong danh sách`}>
        <div className="ops-toolbar"><Input aria-label="Tìm đơn vận chuyển" value={search} onChange={e => setSearch(e.target.value)} placeholder="Mã đơn, khách hàng, tuyến…" allowClear /></div>
        {loading ? <Skeleton active /> : <div className="ops-order-list">{filtered.map(o => <button key={o._id} type="button" className="ops-order-choice" aria-pressed={o._id === orderId} onClick={() => setParams({ orderId: o._id })}>
          <strong>{o.bookingCode}</strong><span className="ops-secondary">{o.customerId?.fullName || 'Chưa cập nhật khách hàng'}</span><span className="ops-secondary">{o.origin?.address || 'Chưa cập nhật'} — {o.destination?.address || 'Chưa cập nhật'}</span><StatusPill value={o.status} />
        </button>)}{!filtered.length && <p className="ops-empty">Không có đơn phù hợp.</p>}</div>}
      </DataPanel>
      <div style={{ minWidth: 0, display: 'grid', gap: 20 }}>
        {selected ? <>
          <DataPanel title={selected.bookingCode} extra={<StatusPill value={selected.status} />}>
            <dl className="ops-facts"><div><dt>Chủ hàng</dt><dd>{selected.customerId?.fullName || 'Chưa cập nhật'}</dd></div><div><dt>Ngựa vận chuyển</dt><dd>{selected.horseIds?.map(h => h.name).join(', ') || 'Chưa cập nhật'}</dd></div><div><dt>Điểm đón</dt><dd>{selected.origin?.address || 'Chưa cập nhật'}</dd></div><div><dt>Điểm giao</dt><dd>{selected.destination?.address || 'Chưa cập nhật'}</dd></div></dl>
          </DataPanel>
          <Tabs key={selected._id} defaultActiveKey={['IN_TRANSIT','INCIDENT_HANDLING','DELIVERING'].includes(selected.status)?'border':'departure'} items={[
            {key:'departure',label:'1. Giấy tờ & khởi hành',children:<ComplianceDocuments orderId={selected._id} specialist onChanged={load} />},
            {key:'border',label:'2. Kết quả tại cửa khẩu',children:<CustomsClearance orderId={selected._id} />},
          ]} />
        </> : <DataPanel title="Không gian thẩm định"><p className="ops-empty">{orderId && !loading ? 'Đơn này không còn trong hàng đợi. Chọn một đơn khác để tiếp tục.' : 'Chọn đơn ở danh sách để xem và xử lý chứng từ.'}</p></DataPanel>}
      </div>
    </div>
  </Workspace>;
}
