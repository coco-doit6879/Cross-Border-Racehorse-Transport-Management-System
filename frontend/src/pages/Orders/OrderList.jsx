import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Input, Tag, Space, Card, Popconfirm, message } from 'antd';
import { Plus, Search, Eye, Truck, Clock, XCircle } from 'lucide-react';
import { useOrderStore } from '../../store/useOrderStore';
import { useAuthStore } from '../../store/useAuthStore';
const formatVnd = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value || 0);

const OrderList = () => {
  const navigate = useNavigate();
  const { orders, fetchOrders, cancelOrder, approveOrder, rejectOrder } = useOrderStore();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectingRecord, setRejectingRecord] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const isManager = user?.role === 'LOGISTICS_MANAGER' || (user?.effectivePermissions || []).includes('booking:approve');

  useEffect(() => {
    fetchOrders().catch(() => {});
  }, [fetchOrders]);

  const handleApproveOrder = async (orderId, orderCode) => {
    try {
      await approveOrder(orderId);
      message.success(`Đã phê duyệt thành công đơn vận chuyển ${orderCode}!`);
      fetchOrders().catch(() => {});
    } catch (err) {
      message.error(err?.response?.data?.message || err.message || 'Không thể phê duyệt đơn');
    }
  };

  const handleRejectOrder = async () => {
    if (!rejectReason.trim()) {
      message.error('Vui lòng nhập lý do từ chối.');
      return;
    }
    try {
      await rejectOrder(rejectingRecord.id || rejectingRecord._id, rejectReason);
      message.success(`Đã từ chối đơn vận chuyển ${rejectingRecord.orderCode}.`);
      setRejectingRecord(null);
      setRejectReason('');
      fetchOrders().catch(() => {});
    } catch (err) {
      message.error(err?.response?.data?.message || err.message || 'Không thể từ chối đơn');
    }
  };

  const handleCancelOrder = async (orderId, orderCode) => {
    try {
      await cancelOrder(orderId, 'Khách hàng chủ động hủy đơn');
      message.success(`Đã hủy thành công đơn vận chuyển ${orderCode}! Ngựa đua đã được mở khóa khả dụng.`);
    } catch (err) {
      message.error(err?.response?.data?.message || err.message || 'Không thể hủy đơn vận chuyển');
    }
  };

  const filteredOrders = orders.filter(
    (o) =>
      o.orderCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.routeLabel.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderStatus = (status) => {
    switch (status) {
      case 'IN_TRANSIT':
        return (
          <span
            style={{
              backgroundColor: '#ECFDF5',
              color: '#059669',
              border: '1px solid #A7F3D0',
              fontSize: 12,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 6
            }}
          >
            Đang vận chuyển
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span
            style={{
              backgroundColor: '#FEF08A',
              color: '#92400E',
              border: '1px solid #FDE047',
              fontSize: 12,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 6
            }}
          >
            Chờ phê duyệt
          </span>
        );
      case 'APPROVED':
        return (
          <span
            style={{
              backgroundColor: '#EFF6FF',
              color: '#2563EB',
              border: '1px solid #BFDBFE',
              fontSize: 12,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 6
            }}
          >
            Đã duyệt
          </span>
        );
      case 'CANCELLED':
        return (
          <span
            style={{
              backgroundColor: '#F3F4F6',
              color: '#6B7280',
              border: '1px solid #E5E7EB',
              fontSize: 12,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 6
            }}
          >
            Đã hủy
          </span>
        );
      case 'REJECTED':
        return (
          <span
            style={{
              backgroundColor: '#FEF2F2',
              color: '#DC2626',
              border: '1px solid #FECACA',
              fontSize: 12,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 6
            }}
          >
            Bị từ chối
          </span>
        );
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const columns = [
    {
      title: 'Mã đơn vận chuyển',
      dataIndex: 'orderCode',
      key: 'orderCode',
      render: (text) => (
        <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{text}</span>
      )
    },
    {
      title: 'Khách hàng',
      dataIndex: 'customerName',
      key: 'customerName'
    },
    {
      title: 'Hành trình',
      dataIndex: 'routeLabel',
      key: 'routeLabel',
      render: (text) => <span style={{ fontWeight: 600, color: '#0F3E2E' }}>{text}</span>
    },
    {
      title: 'Ngày khởi hành',
      dataIndex: 'departureDate',
      key: 'departureDate',
      render: (text, record) => (
        <span>
          {text} {record.departureTime && `(${record.departureTime})`}
          {record.departureId && <div style={{ color: '#64748b', fontSize: 11 }}>Giờ điểm đón · {record.departureTimezone}</div>}
        </span>
      )
    },
    {
      title: 'Ngựa vận chuyển',
      dataIndex: 'horses',
      key: 'horses',
      render: (horses) => (
        <span>{Array.isArray(horses) ? horses.join(', ') : horses}</span>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => renderStatus(status)
    },
    {
      title: 'Thanh toán',
      key: 'payment',
      render: (_, record) => record.pricing?.totalAmountVnd ? <div><strong>{formatVnd(record.pricing.totalAmountVnd)}</strong><div><Tag color={record.paymentStatus === 'PAID' ? 'green' : record.paymentStatus === 'PARTIALLY_PAID' ? 'blue' : 'orange'}>{record.paymentStatus === 'PAID' ? 'Đã thanh toán đủ' : record.paymentStatus === 'PARTIALLY_PAID' ? `Đã cọc ${formatVnd(record.depositAmountVnd)}` : record.depositRequired ? `Chờ cọc ${formatVnd(record.depositAmountVnd)}` : 'Chưa thanh toán'}</Tag></div></div> : <span style={{ color: '#94a3b8' }}>Chưa có giá</span>
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'right',
      render: (_, record) => (
        <Space>
          {record.status === 'PENDING_APPROVAL' && isManager && (!record.depositRequired || record.depositStatus === 'PAID') && (
            <>
              <Button
                size="small"
                type="primary"
                style={{ backgroundColor: '#15803D', borderColor: '#15803D', borderRadius: 6, fontWeight: 600 }}
                onClick={() => handleApproveOrder(record.id || record._id, record.orderCode)}
              >
                ✓ Duyệt đơn
              </Button>
              <Button
                size="small"
                danger
                style={{ borderRadius: 6, fontWeight: 600 }}
                onClick={() => setRejectingRecord(record)}
              >
                ✕ Từ chối
              </Button>
            </>
          )}

          {record.status === 'PENDING_APPROVAL' && !isManager && (
            <Popconfirm
              title="Xác nhận hủy đơn?"
              description={`Bạn có chắc chắn muốn hủy đơn vận chuyển ${record.orderCode}?`}
              onConfirm={() => handleCancelOrder(record.id || record._id, record.orderCode)}
              okText="Hủy đơn"
              cancelText="Quay lại"
              okButtonProps={{ danger: true }}
            >
              <Button size="small" danger icon={<XCircle size={13} />} style={{ borderRadius: 6 }}>
                Hủy đơn
              </Button>
            </Popconfirm>
          )}

          <Button
            size="small"
            onClick={() => navigate(`/orders/${record.id || record._id}`)}
            style={{
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              borderColor: '#0F3E2E',
              color: '#0F3E2E'
            }}
          >
            Chi tiết
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: 12,
          padding: '20px 24px'
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>
            Danh sách Đơn vận chuyển
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#6B7280' }}>
            Quản lý vòng đời đơn vận chuyển xuyên biên giới từ lúc đặt đơn đến khi nghiệm thu POD.
          </p>
        </div>

        {!isManager && (
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => navigate('/orders/create')}
            style={{
              backgroundColor: '#0F3E2E',
              borderColor: '#0F3E2E',
              height: 40,
              padding: '0 20px',
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 8
            }}
          >
            Tạo đơn mới
          </Button>
        )}
      </div>

      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: 10,
          padding: '14px 20px'
        }}
      >
        <Input
          prefix={<Search size={15} color="#9CA3AF" />}
          placeholder="Tìm kiếm mã đơn, khách hàng hoặc tuyến đường..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ maxWidth: 420 }}
          allowClear
        />
      </div>

      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: 12,
          overflow: 'hidden'
        }}
      >
        <Table
          columns={columns}
          dataSource={filteredOrders}
          rowKey="id"
          pagination={{ pageSize: 8 }}
        />
      </div>

      {rejectingRecord && (
        <Modal
          title="Từ chối đơn vận chuyển"
          open={!!rejectingRecord}
          onOk={handleRejectOrder}
          onCancel={() => { setRejectingRecord(null); setRejectReason(''); }}
          okText="Xác nhận từ chối"
          cancelText="Hủy bỏ"
          okButtonProps={{ danger: true }}
        >
          <p style={{ fontSize: 13, color: '#4B5563', marginBottom: 12 }}>
            Nhập lý do từ chối đơn vận chuyển <strong>{rejectingRecord.orderCode}</strong>:
          </p>
          <Input.TextArea
            rows={3}
            placeholder="VD: Không có phương tiện chuyên dụng phù hợp, sai giấy phép hải quan..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </Modal>
      )}
    </div>
  );
};

export default OrderList;
