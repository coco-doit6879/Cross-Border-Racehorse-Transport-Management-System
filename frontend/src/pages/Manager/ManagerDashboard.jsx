import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Empty, Input, Table } from 'antd';
import { ArrowRight, ArrowUpRight, Search, RefreshCw } from 'lucide-react';
import usePlanning from '../Backoffice/usePlanning';
import OrderReviewModal from '../Backoffice/OrderReviewModal';
import { date, idOf, readyForQuote, routeLabel } from '../Backoffice/planningUtils';
const phase = o => ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(o.status) ? 'closed' : ['IN_TRANSIT', 'DELIVERING'].includes(o.status) ? 'transit' : o.preparation?.assignedAt ? 'assigned' : o.status === 'PENDING_APPROVAL' ? o.depositStatus === 'PAID' ? 'intake' : 'deposit' : o.paymentStatus !== 'PAID' ? 'balance' : o.preparation?.confirmedAt ? 'crew' : 'plan';
const labels = {
  deposit: 'Chờ đặt cọc',
  intake: 'Chờ tiếp nhận',
  balance: 'Chờ thanh toán đủ',
  plan: 'Chờ xe & lộ trình',
  crew: 'Chờ phân công kíp xe',
  assigned: 'Đã phân công',
  transit: 'Đang vận chuyển',
  closed: 'Đã kết thúc'
};
export default function ManagerDashboard() {
  const {
      data,
      loading,
      error,
      load
    } = usePlanning(),
    [query, setQuery] = useState(''),
    [filter, setFilter] = useState('all'),
    [selectedId, setSelectedId] = useState(null);
  const active = data.orders.filter(o => phase(o) !== 'closed'),
    intake = active.filter(o => phase(o) === 'intake'),
    crew = active.filter(readyForQuote);
  const rows = data.orders.filter(o => (filter === 'all' || phase(o) === filter) && `${o.bookingCode} ${o.customerId?.fullName || ''} ${routeLabel(o)}`.toLowerCase().includes(query.toLowerCase()));
  const upcoming = active.filter(o => new Date(o.requestedDepartureDate) >= new Date()).sort((a, b) => new Date(a.requestedDepartureDate) - new Date(b.requestedDepartureDate)).slice(0, 5),
    selected = data.orders.find(o => idOf(o) === selectedId);
  return <section className="bo-page management-desk"><header className="desk-heading"><div><span className="h-kicker">Bàn điều hành / Logistics</span><h1>Tổng quan vận hành</h1><p>Quyết định đúng lúc. Hành trình tiếp nối.</p></div><Button onClick={load} loading={loading} icon={<RefreshCw size={15} />}>Làm mới</Button></header>{error && <Alert type="error" message={error} action={<Button onClick={load}>Thử lại</Button>} />}
 <div className="desk-grid"><main><section className="desk-priorities"><div className="desk-section-title"><h2>Cần quản lý xử lý</h2><span>{intake.length + crew.length} đơn</span></div><Link to="/manager/intake"><span className="desk-priority-number">{intake.length}</span><div><strong>Tiếp nhận đơn đã đặt cọc</strong><p>Kiểm tra yêu cầu trước khi phê duyệt.</p></div><ArrowUpRight size={20} /></Link><Link to="/manager/approvals"><span className="desk-priority-number">{crew.length}</span><div><strong>Phân công tài xế & hộ tống</strong><p>Phương án đã xác nhận, sẵn sàng chọn kíp xe.</p></div><ArrowUpRight size={20} /></Link></section><div className="desk-register-heading"><h2>Sổ vận chuyển</h2><Input prefix={<Search size={16} />} aria-label="Tìm đơn vận chuyển" placeholder="Mã đơn, khách hàng, tuyến…" value={query} onChange={e => setQuery(e.target.value)} allowClear /></div><div className="desk-filters" aria-label="Lọc giai đoạn">{[['all', 'Tất cả'], ...Object.entries(labels)].map(([key, label]) => <button key={key} onClick={() => setFilter(key)} aria-pressed={filter === key}>{label}<span>{key === 'all' ? data.orders.length : data.orders.filter(o => phase(o) === key).length}</span></button>)}</div><div className="bo-table-panel"><Table rowKey={idOf} loading={loading} dataSource={rows} pagination={{
            pageSize: 8,
            hideOnSinglePage: true
          }} scroll={{
            x: 600
          }} columns={[{
            title: 'Đơn / Khách hàng',
            render: (_, o) => <><strong>{o.bookingCode}</strong><div className="bo-secondary">{o.customerId?.fullName || 'Chưa cập nhật'}</div></>
          }, {
            title: 'Hành trình',
            render: (_, o) => <><span>{routeLabel(o)}</span><div className="bo-secondary">{date(o.requestedDepartureDate)} · {o.horseIds?.length || 0} ngựa</div></>
          }, {
            title: 'Giai đoạn',
            render: (_, o) => <span className={`bo-pill ${['intake', 'crew'].includes(phase(o)) ? 'bo-pill-orange' : ''}`}>{labels[phase(o)]}</span>
          }, {
            title: '',
            render: (_, o) => <button className="bo-button" onClick={() => setSelectedId(idOf(o))}>Xem đơn<ArrowRight size={14} /></button>
          }]} /></div></main><aside className="desk-agenda"><span className="h-kicker">Sắp khởi hành</span><h2>Lịch trình phía trước</h2>{upcoming.length ? upcoming.map(o => <button key={idOf(o)} onClick={() => setSelectedId(idOf(o))}><span>{date(o.requestedDepartureDate)}</span><strong>{o.bookingCode}</strong><p>{routeLabel(o)}</p><small>{labels[phase(o)]}</small></button>) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có chuyến sắp khởi hành." />}<Link to="/manager/trips">Xem chuyến vận chuyển<ArrowRight size={15} /></Link><div className="desk-agenda-note"><span>Phân quyền rõ ràng</span><p>Điều phối xác nhận xe và lộ trình. Quản lý phân công kíp xe sau khi phương án hoàn tất.</p></div></aside></div>
 {selected && <OrderReviewModal order={selected} data={data} mode={readyForQuote(selected) ? 'quote' : 'intake'} onClose={() => setSelectedId(null)} onSaved={load} />}
 </section>;
}
