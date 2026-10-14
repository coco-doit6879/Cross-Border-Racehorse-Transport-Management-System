import React, { useEffect, useState } from 'react';
import { Alert, Button, Skeleton, Table } from 'antd';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { horseApi } from '../../services/horseApi';
import { orderApi } from '../../services/orderApi';
import { routeApi } from '../../services/routeApi';
import { operationsApi } from '../../services/operationsApi';
import { canAccessPage } from '../../utils/pageAccess';
import { Workspace, Metrics, DataPanel, StatusPill } from '../../components/operations/OperationsUI';

const idOf = value => String(value?._id || value || '');
export default function OperationsDashboard() {
  const user = useAuthStore(state => state.user);
  const specialist = user?.role === 'TRANSPORT_SPECIALIST';
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setError(''); setData(null);
    const requests = specialist
      ? [horseApi.getHorses(), operationsApi.getComplianceDocuments(), orderApi.getOrders()]
      : [routeApi.getRoutes(), operationsApi.getVehicles(), operationsApi.getOperationalStaff(), orderApi.getOrders()];
    Promise.all(requests).then(responses => { if (active) setData(responses.map(r => r?.data?.data || [])); })
      .catch(err => { if (active) setError(err.response?.data?.message || 'Không thể tải dữ liệu tổng quan.'); });
    return () => { active = false; };
  }, [specialist, revision]);
  const actions = <><Button onClick={() => setRevision(n => n + 1)}>Làm mới</Button><Button type="primary" href={specialist ? '/specialist/horses' : '/fleet/trips'}>{specialist ? 'Mở hàng đợi kiểm duyệt' : 'Phân công chuyến'}</Button></>;
  const heading = { eyebrow: specialist ? 'Thủ tục & kiểm dịch' : 'Đội xe & hành trình', title: specialist ? 'Bàn làm việc chuyên viên' : 'Trung tâm điều phối', actions };
  if (!data) return <Workspace {...heading}>{error ? <Alert type="error" message={error} action={<Button onClick={() => setRevision(n => n + 1)}>Thử lại</Button>} /> : <Skeleton active paragraph={{ rows: 7 }} />}</Workspace>;
  if (specialist) {
    const [horses, documents, orders] = data;
    const pending = horses.filter(h => h.reviewStatus === 'PENDING_REVIEW');
    const pendingDocs = documents.filter(d => d.status === 'PENDING_REVIEW');
    return <Workspace {...heading} description="Ưu tiên hồ sơ cần thẩm định, đối chiếu chứng từ và theo dõi điều kiện vận chuyển.">
      <Metrics items={[
        { label: 'Ngựa chờ kiểm duyệt', value: pending.length, detail: 'Hồ sơ sức khỏe cần xem xét' },
        { label: 'Chứng từ chờ thẩm định', value: pendingDocs.length, detail: 'Tệp đã nộp, chờ kết quả' },
        { label: 'Đơn đang làm hồ sơ', value: orders.filter(o => o.status === 'DOCS_PROCESSING').length, detail: 'Theo trạng thái đơn vận chuyển' },
        { label: 'Hồ sơ ngựa đã duyệt', value: horses.filter(h => h.reviewStatus === 'APPROVED').length, detail: 'Kết quả kiểm duyệt đã ghi nhận' }
      ]} />
      <DataPanel title="Hồ sơ ngựa cần xử lý" description="Đối chiếu nhận dạng, hộ chiếu và chứng nhận tiêm chủng." extra={<Link to="/specialist/horses">Xem tất cả ({pending.length})</Link>}>
        <Table rowKey="_id" pagination={false} scroll={{ x: 680 }} locale={{ emptyText: 'Không có hồ sơ ngựa đang chờ kiểm duyệt.' }} dataSource={pending.slice(0, 6)} columns={[
          { title: 'Ngựa / giống', render: (_, h) => <><strong>{h.name}</strong><div className="ops-secondary">{h.breed || 'Chưa khai báo giống'}</div></> },
          { title: 'Mã vi chip', dataIndex: 'microchipId', render: v => v || 'Chưa khai báo' },
          { title: 'Địa điểm hiện tại', dataIndex: 'currentStopId', render: v => v || 'Chưa khai báo' },
          { title: 'Thao tác', align: 'right', render: (_, h) => <Link to={`/horses/${h._id}`}>Thẩm định hồ sơ</Link> }
        ]} />
      </DataPanel>
      <DataPanel title="Chứng từ chờ thẩm định" description="Mở đúng đơn vận chuyển để kiểm tra tệp và ghi nhận kết quả." extra={<Link to="/specialist/compliance">Quản lý chứng từ</Link>}>
        <Table rowKey="_id" pagination={false} scroll={{ x: 650 }} locale={{ emptyText: 'Không có chứng từ đang chờ thẩm định.' }} dataSource={pendingDocs.slice(0, 6)} columns={[
          { title: 'Đơn vận chuyển', render: (_, d) => d.orderId?.bookingCode || 'Chưa cập nhật' },
          { title: 'Loại chứng từ', dataIndex: 'documentType' },
          { title: 'Ngựa liên quan', render: (_, d) => d.horseId?.name || 'Toàn chuyến' },
          { title: 'Cửa khẩu', dataIndex: 'checkpoint', render: v => v || 'Chưa khai báo' },
          { title: 'Thao tác', align: 'right', render: (_, d) => <Link to={`/specialist/compliance?orderId=${encodeURIComponent(idOf(d.orderId))}`}>Mở thẩm định</Link> }
        ]} />
      </DataPanel>
    </Workspace>;
  }
  const [routes, vehicles, staff, orders] = data;
  const assigned = new Set(routes.map(r => idOf(r.orderId)));
  const waiting = orders.filter(o => ['APPROVED', 'DOCS_PROCESSING', 'CLEARED_FOR_TRANSPORT'].includes(o.status) && !assigned.has(idOf(o)));
  const dispatchable = waiting.filter(o => o.paymentStatus === 'PAID');
  const active = routes.filter(r => ['IN_TRANSIT', 'INCIDENT_HANDLING', 'DELIVERING'].includes(r.status));
  const busyStaff = new Set(routes.filter(r => ['SCHEDULED', 'IN_TRANSIT', 'INCIDENT_HANDLING', 'DELIVERING'].includes(r.status)).flatMap(r => [idOf(r.driverId), idOf(r.escortId)]));
  return <Workspace {...heading} description="Nắm tình trạng chuyến, nguồn lực sẵn sàng và các đơn cần phân công trong một màn hình.">
    <Metrics items={[
      { label: 'Đơn sẵn sàng phân công', value: dispatchable.length, detail: `${waiting.length - dispatchable.length} đơn khác chưa thanh toán đủ` },
      { label: 'Chuyến đang vận hành', value: active.length, detail: `${routes.filter(r => r.status === 'INCIDENT_HANDLING').length} chuyến đang xử lý sự cố` },
      { label: 'Xe chưa phân công', value: vehicles.filter(v => v.status === 'ACTIVE' && !v.activeAssignment).length, detail: `${vehicles.length} phương tiện trong đội xe` },
      { label: 'Nhân sự chưa phân công', value: staff.filter(s => s.isActive && !busyStaff.has(idOf(s))).length, detail: 'Tài khoản hoạt động, chưa có chuyến đang mở' }
    ]} />
    {dispatchable.length > 0 && <Alert message={`${dispatchable.length} đơn đã thanh toán đủ đang chờ phân công xe và tổ vận chuyển.`} action={<Link to="/fleet/trips">Mở bảng phân công</Link>} />}
    <DataPanel title="Chuyến vận chuyển" description="Ưu tiên các chuyến đang xử lý sự cố và đang vận hành." extra={<Link to="/fleet/trips">Quản lý tất cả chuyến</Link>}>
      <Table rowKey="_id" pagination={false} scroll={{ x: 800 }} locale={{ emptyText: 'Chưa có chuyến vận chuyển.' }} dataSource={[...routes].sort((a, b) => {
        const rank = s => s === 'INCIDENT_HANDLING' ? 0 : ['IN_TRANSIT', 'DELIVERING'].includes(s) ? 1 : 2;
        return rank(a.status) - rank(b.status) || new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }).slice(0, 8)} columns={[
        { title: 'Đơn vận chuyển', render: (_, r) => <Link to={`/orders/${idOf(r.orderId)}`}>{r.orderId?.bookingCode || 'Xem đơn'}</Link> },
        { title: 'Hành trình', render: (_, r) => <><strong>{r.orderId?.origin?.address || 'Chưa cập nhật'}</strong><div className="ops-secondary">Đến {r.orderId?.destination?.address || 'Chưa cập nhật'}</div></> },
        { title: 'Xe / tài xế', render: (_, r) => <>{r.vehiclePlateNumber || 'Chưa phân công'}<div className="ops-secondary">{r.driverId?.fullName || 'Chưa phân tài xế'}</div></> },
        { title: 'Trạng thái', dataIndex: 'status', render: v => <StatusPill value={v} /> }
      ]} />
    </DataPanel>
    <DataPanel title="Nguồn lực & lịch vận chuyển" description="Kiểm tra phương tiện, nhân sự và lịch công bố trước khi phân công.">
      <div className="ops-actions"><Link to="/fleet/vehicles">Quản lý đội xe</Link><Link to="/fleet/staff">Nhân sự vận hành</Link>{canAccessPage(user, '/manager/schedules') && <Link to="/manager/schedules">Lịch & giá cố định</Link>}<Link to="/routes/tracking">Theo dõi hành trình</Link></div>
    </DataPanel>
  </Workspace>;
}
