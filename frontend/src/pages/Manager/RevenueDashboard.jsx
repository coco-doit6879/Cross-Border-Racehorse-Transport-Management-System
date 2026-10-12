import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Button,
  Space,
  Typography,
  Tabs,
  Select,
  Progress,
  Badge,
  Spin,
  Alert,
  Tooltip
} from 'antd';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Wallet,
  Receipt,
  RotateCcw,
  CheckCircle,
  Clock,
  XCircle,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { analyticsApi } from '../../services/analyticsApi';

const { Title, Text, Paragraph } = Typography;

const formatVnd = (value) => {
  return Number(value || 0).toLocaleString('vi-VN') + ' ₫';
};

const formatDateTime = (val) => {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(d);
  } catch {
    return '—';
  }
};

const STATUS_TAGS = {
  PAID: { color: 'success', text: 'Thành công', icon: <CheckCircle size={14} className="inline mr-1" /> },
  PENDING: { color: 'warning', text: 'Chờ thanh toán', icon: <Clock size={14} className="inline mr-1" /> },
  CANCELLED: { color: 'default', text: 'Đã hủy', icon: <XCircle size={14} className="inline mr-1" /> },
  FAILED: { color: 'error', text: 'Thất bại', icon: <XCircle size={14} className="inline mr-1" /> },
  REFUNDED: { color: 'purple', text: 'Đã hoàn tiền', icon: <RotateCcw size={14} className="inline mr-1" /> }
};

const PURPOSE_TAGS = {
  DEPOSIT: { color: 'blue', text: 'Đặt cọc (20%)' },
  BALANCE: { color: 'green', text: 'Thanh toán nốt (80%)' },
  REFUND: { color: 'purple', text: 'Hoàn trả' },
  SURCHARGE: { color: 'orange', text: 'Phụ thu' }
};

export default function RevenueDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    summary: {},
    transactions: [],
    monthlyTrend: [],
    bankBreakdown: [],
    orderFinancials: []
  });

  const [filterStatus, setFilterStatus] = useState('');
  const [filterPurpose, setFilterPurpose] = useState('');
  const [activeTab, setActiveTab] = useState('transactions');

  const fetchRevenue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterPurpose) params.purpose = filterPurpose;

      const res = await analyticsApi.getRevenue(params);
      if (res?.data?.success) {
        setData(res.data.data);
      } else {
        throw new Error(res?.data?.message || 'Không thể tải dữ liệu tài chính');
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPurpose]);

  useEffect(() => {
    fetchRevenue();
  }, [fetchRevenue]);

  const summary = data.summary || {};
  const transactions = data.transactions || [];
  const orderFinancials = data.orderFinancials || [];
  const monthlyTrend = data.monthlyTrend || [];
  const bankBreakdown = data.bankBreakdown || [];

  // Transaction columns
  const transactionColumns = [
    {
      title: 'Mã GD / TxnRef',
      dataIndex: 'txnRef',
      key: 'txnRef',
      render: (txnRef, record) => (
        <div>
          <strong style={{ color: '#0F3E2E' }}>{txnRef}</strong>
          {record.transactionNo && (
            <div style={{ fontSize: 11, color: '#888' }}>VNPAY No: {record.transactionNo}</div>
          )}
        </div>
      )
    },
    {
      title: 'Đơn hàng',
      key: 'order',
      render: (_, record) => {
        const order = record.orderId;
        if (!order) return <Text type="secondary">—</Text>;
        return (
          <div>
            <Tag color="cyan">{order.bookingCode || 'Đơn hàng'}</Tag>
            <div style={{ fontSize: 12, color: '#666' }}>
              {order.origin} → {order.destination}
            </div>
          </div>
        );
      }
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_, record) => {
        const customer = record.customerId;
        if (!customer) return <Text type="secondary">—</Text>;
        return (
          <div>
            <strong>{customer.fullName || 'Khách hàng'}</strong>
            <div style={{ fontSize: 12, color: '#777' }}>{customer.phone || customer.email}</div>
          </div>
        );
      }
    },
    {
      title: 'Mục đích',
      dataIndex: 'purpose',
      key: 'purpose',
      render: (purpose) => {
        const conf = PURPOSE_TAGS[purpose] || { color: 'default', text: purpose };
        return <Tag color={conf.color}>{conf.text}</Tag>;
      }
    },
    {
      title: 'Số tiền',
      dataIndex: 'amountVnd',
      key: 'amountVnd',
      align: 'right',
      render: (amount, record) => (
        <span
          style={{
            fontWeight: 700,
            fontSize: 14,
            color: record.status === 'PAID' ? '#059669' : '#172033'
          }}
        >
          {formatVnd(amount)}
        </span>
      )
    },
    {
      title: 'Cổng / Ngân hàng',
      key: 'bank',
      render: (_, record) => (
        <div>
          <Tag color="blue">{record.bankCode || 'VNPAY'}</Tag>
          {record.cardType && <span style={{ fontSize: 11, color: '#888' }}>({record.cardType})</span>}
        </div>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const conf = STATUS_TAGS[status] || { color: 'default', text: status };
        return <Tag color={conf.color}>{conf.text}</Tag>;
      }
    },
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val, record) => (
        <span style={{ fontSize: 12, color: '#666' }}>{formatDateTime(record.payDate || val)}</span>
      )
    }
  ];

  // Order settlement columns
  const orderColumns = [
    {
      title: 'Mã vận đơn',
      dataIndex: 'bookingCode',
      key: 'bookingCode',
      render: (code) => <Tag color="geekblue" style={{ fontWeight: 600 }}>{code}</Tag>
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_, record) => (
        <div>
          <strong>{record.customerName}</strong>
          <div style={{ fontSize: 12, color: '#888' }}>{record.customerPhone}</div>
        </div>
      )
    },
    {
      title: 'Giá trị hợp đồng',
      dataIndex: 'contractValue',
      key: 'contractValue',
      align: 'right',
      render: (val) => <strong>{formatVnd(val)}</strong>
    },
    {
      title: 'Cọc (20%)',
      key: 'deposit',
      align: 'center',
      render: (_, record) => (
        <div>
          <Badge
            status={record.depositStatus === 'PAID' ? 'success' : 'warning'}
            text={record.depositStatus === 'PAID' ? 'Đã cọc' : 'Chờ cọc'}
          />
        </div>
      )
    },
    {
      title: 'Thực thu (VNPAY)',
      dataIndex: 'totalPaid',
      key: 'totalPaid',
      align: 'right',
      render: (val) => (
        <span style={{ color: '#059669', fontWeight: 600 }}>{formatVnd(val)}</span>
      )
    },
    {
      title: 'Còn thiếu (Công nợ)',
      dataIndex: 'outstanding',
      key: 'outstanding',
      align: 'right',
      render: (val) => (
        <span style={{ color: val > 0 ? '#D97706' : '#666', fontWeight: val > 0 ? 600 : 400 }}>
          {formatVnd(val)}
        </span>
      )
    },
    {
      title: 'Thanh toán',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      render: (status) => {
        if (status === 'PAID') return <Tag color="green">Đã trả đủ</Tag>;
        if (status === 'PARTIALLY_PAID') return <Tag color="gold">Đã cọc 20%</Tag>;
        return <Tag color="red">Chưa trả</Tag>;
      }
    },
    {
      title: 'Vận chuyển',
      dataIndex: 'orderStatus',
      key: 'orderStatus',
      render: (status) => <Tag>{status}</Tag>
    }
  ];

  return (
    <div style={{ padding: '24px 32px', background: '#F3F7F5', minHeight: '100vh' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        <div>
          <div
            style={{
              color: '#0F3E2E',
              fontWeight: 600,
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 4
            }}
          >
            Tài chính & Thanh toán CBRT
          </div>
          <Title level={2} style={{ margin: 0, color: '#103C32', fontWeight: 700 }}>
            Dashboard Doanh Thu & Dòng Tiền
          </Title>
          <Text type="secondary">
            Báo cáo trực quan doanh thu VNPAY Sandbox, đối soát tiền cọc, thanh toán và công nợ đơn hàng.
          </Text>
        </div>

        <Space>
          <Button
            type="primary"
            icon={<RotateCcw size={16} />}
            onClick={fetchRevenue}
            loading={loading}
            style={{ backgroundColor: '#0F3E2E', borderColor: '#0F3E2E' }}
          >
            Làm mới dữ liệu
          </Button>
        </Space>
      </div>

      {error && (
        <Alert
          message="Lỗi tải dữ liệu tài chính"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 20 }}
        />
      )}

      {/* Top 4 Primary KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              borderTop: '4px solid #0F3E2E'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
                  Tổng Doanh Thu Thực Thu
                </Text>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#0F3E2E', marginTop: 4 }}>
                  {formatVnd(summary.totalGrossRevenue)}
                </div>
              </div>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  background: '#EBF5F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0F3E2E'
                }}
              >
                <DollarSign size={24} />
              </div>
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: '#666' }}>
              Đã ghi nhận qua VNPAY & sổ quỹ
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              borderTop: '4px solid #2563EB'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
                  Doanh Thu Đặt Cọc (20%)
                </Text>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#2563EB', marginTop: 4 }}>
                  {formatVnd(summary.depositCollected)}
                </div>
              </div>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  background: '#EFF6FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563EB'
                }}
              >
                <ShieldCheck size={24} />
              </div>
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: '#666' }}>
              {summary.depositedOrdersCount || 0} đơn đã cọc giữ chỗ & duyệt hồ sơ
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              borderTop: '4px solid #059669'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
                  Thanh Toán Đủ (80%)
                </Text>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#059669', marginTop: 4 }}>
                  {formatVnd(summary.balanceCollected)}
                </div>
              </div>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  background: '#ECFDF5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#059669'
                }}
              >
                <Wallet size={24} />
              </div>
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: '#666' }}>
              {summary.paidOrdersCount || 0} đơn đã thanh toán hoàn tất
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              borderTop: '4px solid #D97706'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
                  Công Nợ / Còn Phải Thu
                </Text>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#D97706', marginTop: 4 }}>
                  {formatVnd(summary.totalOutstanding)}
                </div>
              </div>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  background: '#FFFBEB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#D97706'
                }}
              >
                <Clock size={24} />
              </div>
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: '#666' }}>
              Tổng hợp đồng: {formatVnd(summary.totalContractValue)}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Secondary Metrics & Flow explanation */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={16}>
          <Card
            bordered={false}
            style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16
              }}
            >
              <div>
                <strong style={{ fontSize: 16, color: '#103C32' }}>
                  🏦 Phân Bổ Kênh Thu & Cổng Thanh Toán
                </strong>
                <div style={{ fontSize: 12, color: '#888' }}>
                  Tiền khách thanh toán được điều chuyển trực tiếp qua cổng VNPAY Merchant
                </div>
              </div>
              <Tag color="green" style={{ fontSize: 12 }}>
                Cổng VNPAY Sandbox Active
              </Tag>
            </div>

            <Row gutter={[16, 16]}>
              {bankBreakdown.length > 0 ? (
                bankBreakdown.map((b) => (
                  <Col xs={12} sm={8} key={b.bank}>
                    <div
                      style={{
                        padding: '12px 16px',
                        background: '#F8FAF9',
                        borderRadius: 8,
                        border: '1px solid #E2E8F0'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontWeight: 600,
                          color: '#0F3E2E'
                        }}
                      >
                        <Building2 size={16} />
                        <span>{b.bank}</span>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#172033', marginTop: 6 }}>
                        {formatVnd(b.amount)}
                      </div>
                      <div style={{ fontSize: 11, color: '#888' }}>{b.count} giao dịch thành công</div>
                    </div>
                  </Col>
                ))
              ) : (
                <Col span={24}>
                  <Text type="secondary">Chưa có dữ liệu ngân hàng</Text>
                </Col>
              )}
            </Row>

            <div
              style={{
                marginTop: 20,
                padding: '12px 16px',
                background: '#EBF5F0',
                borderRadius: 8,
                fontSize: 13,
                color: '#0F3E2E',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <ShieldCheck size={18} />
              <span>
                <strong>Bảo mật dòng tiền:</strong> Tất cả giao dịch đều có mã xác thực băm SHA512 và IPN
                xác thực ngược từ VNPAY để tránh làm giả hóa đơn hay sửa số tiền.
              </span>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card
            bordered={false}
            style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', height: '100%' }}
          >
            <strong style={{ fontSize: 16, color: '#103C32' }}>
              📊 Tỷ Lệ Thu Hồi Doanh Thu
            </strong>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 20 }}>
              Tiến độ thanh toán trên tổng giá trị đơn
            </div>

            {summary.totalContractValue > 0 ? (
              <div>
                <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Đã thu về:</span>
                  <strong>
                    {Math.round(((summary.totalGrossRevenue || 0) / summary.totalContractValue) * 100)}%
                  </strong>
                </div>
                <Progress
                  percent={Math.min(
                    100,
                    Math.round(((summary.totalGrossRevenue || 0) / summary.totalContractValue) * 100)
                  )}
                  strokeColor="#0F3E2E"
                  status="active"
                />

                <div style={{ marginTop: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                    <Text type="secondary">Giao dịch thành công:</Text>
                    <strong>{summary.paidTransactionsCount || 0} GD</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                    <Text type="secondary">Đơn hoàn tất thanh toán:</Text>
                    <strong>
                      {summary.paidOrdersCount || 0} / {summary.totalOrdersCount || 0} đơn
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                    <Text type="secondary">Phụ thu phát sinh:</Text>
                    <span>{formatVnd(summary.totalSurcharges)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                    <Text type="secondary">Hoàn tiền / Bồi hoàn:</Text>
                    <span>{formatVnd(summary.totalRefunded)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <Text type="secondary">Chưa có đơn hàng nào</Text>
            )}
          </Card>
        </Col>
      </Row>

      {/* Main Content Tabs */}
      <Card
        bordered={false}
        style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 16
          }}
        >
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'transactions',
                label: (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CreditCard size={16} /> Sổ Nhật Ký Giao Dịch VNPAY ({transactions.length})
                  </span>
                )
              },
              {
                key: 'orders',
                label: (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Receipt size={16} /> Đối Soát Quyết Toán Theo Đơn Hàng ({orderFinancials.length})
                  </span>
                )
              }
            ]}
            style={{ marginBottom: 0 }}
          />

          {activeTab === 'transactions' && (
            <Space wrap>
              <Select
                placeholder="Lọc trạng thái"
                style={{ width: 160 }}
                allowClear
                value={filterStatus || undefined}
                onChange={(val) => setFilterStatus(val || '')}
                options={[
                  { label: 'Tất cả trạng thái', value: '' },
                  { label: 'Thành công (PAID)', value: 'PAID' },
                  { label: 'Chờ thanh toán (PENDING)', value: 'PENDING' },
                  { label: 'Đã hủy (CANCELLED)', value: 'CANCELLED' }
                ]}
              />

              <Select
                placeholder="Lọc mục đích"
                style={{ width: 180 }}
                allowClear
                value={filterPurpose || undefined}
                onChange={(val) => setFilterPurpose(val || '')}
                options={[
                  { label: 'Tất cả mục đích', value: '' },
                  { label: 'Đặt cọc 20% (DEPOSIT)', value: 'DEPOSIT' },
                  { label: 'Thanh toán nốt 80% (BALANCE)', value: 'BALANCE' }
                ]}
              />
            </Space>
          )}
        </div>

        {activeTab === 'transactions' ? (
          <Table
            columns={transactionColumns}
            dataSource={transactions}
            rowKey="_id"
            loading={loading}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            scroll={{ x: 900 }}
          />
        ) : (
          <Table
            columns={orderColumns}
            dataSource={orderFinancials}
            rowKey="orderId"
            loading={loading}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            scroll={{ x: 900 }}
          />
        )}
      </Card>
    </div>
  );
}
