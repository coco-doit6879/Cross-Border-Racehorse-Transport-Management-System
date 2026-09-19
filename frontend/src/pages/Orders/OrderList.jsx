import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Input, Tag, Space, Card } from 'antd';
import { Plus, Search, Eye, Truck, Clock } from 'lucide-react';
import { useOrderStore } from '../../store/useOrderStore';
import { useAuthStore } from '../../store/useAuthStore';

const OrderList = () => {
  const navigate = useNavigate();
  const { orders } = useOrderStore();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');

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
      title: 'Thao tác',
      key: 'actions',
      align: 'right',
      render: (_, record) => (
        <Button
          size="small"
          onClick={() => navigate('/')}
          style={{
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 500,
            borderColor: '#0F3E2E',
            color: '#0F3E2E'
          }}
        >
          Xem trên Dashboard
        </Button>
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
    </div>
  );
};

export default OrderList;
