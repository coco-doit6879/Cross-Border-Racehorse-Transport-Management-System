import React, { useState } from 'react';
import { Alert, Button, Card, Form, Input, InputNumber, Select, Space, Table, Tag, Modal } from 'antd';

const labels = {
  REFUND: 'Hoàn tiền',
  COMPENSATION: 'Bồi thường',
  DESTINATION_CHANGE: 'Đổi điểm giao'
};

export default function ExceptionRequests({ order, manager, busy, act, recover, destinationOptions = [] }) {
  const [kind, setKind] = useState('REFUND');
  const [reasons, setReasons] = useState({});
  const [showCreateForm, setShowCreateForm] = useState(false);

  const confirmExecution = (item) =>
    Modal.confirm({
      title: item.kind === 'DESTINATION_CHANGE' ? 'Áp dụng điểm giao đã duyệt?' : 'Xác nhận kiểm tra chứng từ và chuyển tiền thực tế?',
      content: 'Thao tác sẽ được lưu vào nhật ký kiểm toán hệ thống.',
      onOk: () =>
        item.kind === 'DESTINATION_CHANGE'
          ? recover('APPLY_DESTINATION', { itemId: item._id, reason: reasons[`exec-${item._id}`] })
          : act('EXECUTE_EXCEPTION', { itemId: item._id, reference: reasons[`exec-${item._id}`], confirmTransferred: true })
    });

  const requests = order.exceptionRequests || [];

  return (
    <Card
      style={{
        borderRadius: 10,
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        marginBottom: 16
      }}
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
              Yêu cầu ngoại lệ & khiếu nại ({requests.length})
            </span>
            <div style={{ fontSize: 13, color: '#64748B', fontWeight: 400 }}>
              Hỗ trợ xử lý hoàn tiền, bồi thường hoặc thay đổi điểm giao nhận
            </div>
          </div>
          {!manager && !showCreateForm && (
            <Button
              size="small"
              onClick={() => setShowCreateForm(true)}
              style={{ fontSize: 13 }}
            >
              Tạo yêu cầu mới
            </Button>
          )}
        </div>
      }
    >
      {requests.length > 0 ? (
        <Table
          style={{ marginBottom: showCreateForm || manager ? 16 : 0 }}
          size="small"
          rowKey="_id"
          pagination={false}
          dataSource={requests}
          columns={[
            {
              title: 'Loại yêu cầu',
              render: (_, x) => (
                <div>
                  <strong style={{ color: '#0F172A' }}>{labels[x.kind]}</strong>
                  <div style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>{x.reason}</div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>Chứng từ: {x.evidence}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0F3E2E', marginTop: 2 }}>
                    {x.kind === 'DESTINATION_CHANGE' ? x.proposedDestination : `${x.amountVnd?.toLocaleString('vi-VN')} VND`}
                  </div>
                </div>
              )
            },
            {
              title: 'Trạng thái',
              render: (_, x) => (
                <div>
                  <Tag
                    style={{
                      background: x.status === 'APPROVED' || x.status === 'EXECUTED' ? '#F0FDF4' : '#F1F5F9',
                      color: x.status === 'APPROVED' || x.status === 'EXECUTED' ? '#166534' : '#475569',
                      border: `1px solid ${x.status === 'APPROVED' || x.status === 'EXECUTED' ? '#BBF7D0' : '#E2E8F0'}`
                    }}
                  >
                    {({
                      PENDING: 'Chờ duyệt',
                      APPROVED: 'Đã duyệt — chờ thực hiện',
                      REJECTED: 'Từ chối',
                      EXECUTED: 'Đã thực hiện'
                    })[x.status] || x.status}
                  </Tag>
                  {x.decisionReason && <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{x.decisionReason}</div>}
                  {x.executionReference && <div style={{ fontSize: 12, color: '#64748B' }}>{x.executionReference}</div>}

                  {manager && x.status === 'APPROVED' && (
                    <Space direction="vertical" style={{ marginTop: 6 }}>
                      <Input
                        placeholder="Mã chứng từ / lý do thực hiện"
                        size="small"
                        value={reasons[`exec-${x._id}`]}
                        onChange={(e) => setReasons({ ...reasons, [`exec-${x._id}`]: e.target.value })}
                      />
                      <Button
                        size="small"
                        type="primary"
                        disabled={busy || !reasons[`exec-${x._id}`]?.trim()}
                        onClick={() => confirmExecution(x)}
                        style={{ background: '#0F3E2E', borderColor: '#0F3E2E' }}
                      >
                        {x.kind === 'DESTINATION_CHANGE' ? 'Áp dụng điểm giao' : 'Ghi nhận chi tiền'}
                      </Button>
                    </Space>
                  )}
                </div>
              )
            },
            {
              title: 'Quản lý xử lý',
              render: (_, x) =>
                manager &&
                x.status === 'PENDING' && (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Input.TextArea
                      placeholder="Lý do quyết định (bắt buộc)"
                      maxLength={2000}
                      rows={2}
                      value={reasons[x._id]}
                      onChange={(e) => setReasons({ ...reasons, [x._id]: e.target.value })}
                    />
                    <Space>
                      <Button
                        size="small"
                        type="primary"
                        disabled={busy || !reasons[x._id]?.trim()}
                        onClick={() => act('REVIEW_EXCEPTION', { itemId: x._id, status: 'APPROVED', reason: reasons[x._id] })}
                        style={{ background: '#0F3E2E', borderColor: '#0F3E2E' }}
                      >
                        Duyệt
                      </Button>
                      <Button
                        size="small"
                        danger
                        disabled={busy || !reasons[x._id]?.trim()}
                        onClick={() => act('REVIEW_EXCEPTION', { itemId: x._id, status: 'REJECTED', reason: reasons[x._id] })}
                      >
                        Từ chối
                      </Button>
                    </Space>
                  </Space>
                )
            }
          ]}
        />
      ) : (
        !showCreateForm && (
          <div style={{ color: '#64748B', fontSize: 14, padding: '4px 0' }}>
            Không có yêu cầu ngoại lệ hoặc khiếu nại cho đơn hàng này.
          </div>
        )
      )}

      {(showCreateForm || manager) && (
        <div style={{ marginTop: requests.length > 0 ? 16 : 0, background: '#F8FAFC', padding: 14, borderRadius: 8, border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>
              Tạo yêu cầu ngoại lệ mới
            </span>
            {!manager && (
              <Button size="small" type="text" onClick={() => setShowCreateForm(false)} style={{ fontSize: 13 }}>
                Đóng form
              </Button>
            )}
          </div>

          <Form
            layout="vertical"
            initialValues={{ kind: 'REFUND' }}
            onFinish={(values) => {
              act('REQUEST_EXCEPTION', values);
              setShowCreateForm(false);
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <Form.Item name="kind" label={<span style={{ fontSize: 13 }}>Loại yêu cầu</span>} rules={[{ required: true }]}>
                <Select onChange={setKind} options={Object.entries(labels).map(([value, label]) => ({ value, label }))} />
              </Form.Item>

              {kind === 'DESTINATION_CHANGE' ? (
                <Form.Item name="proposedStopId" label={<span style={{ fontSize: 13 }}>Điểm giao đề xuất</span>} rules={[{ required: true }]}>
                  <Select
                    options={destinationOptions
                      .filter((s) => s.id !== order.destinationStopId)
                      .map((s) => ({ value: s.id, label: s.name }))}
                  />
                </Form.Item>
              ) : (
                <Form.Item name="amountVnd" label={<span style={{ fontSize: 13 }}>Số tiền đề nghị (VND)</span>} rules={[{ required: true }]}>
                  <InputNumber style={{ width: '100%' }} min={1} max={Number.MAX_SAFE_INTEGER} precision={0} placeholder="Ví dụ: 2000000" />
                </Form.Item>
              )}
            </div>

            <Form.Item name="reason" label={<span style={{ fontSize: 13 }}>Lý do yêu cầu</span>} rules={[{ required: true, whitespace: true }]}>
              <Input.TextArea rows={2} maxLength={2000} placeholder="Mô tả chi tiết lý do..." />
            </Form.Item>

            <Form.Item name="evidence" label={<span style={{ fontSize: 13 }}>Mã chứng từ / bằng chứng đối chiếu</span>} rules={[{ required: true, whitespace: true }]}>
              <Input maxLength={2000} placeholder="Số hóa đơn, ảnh hiện trường hoặc biên bản liên quan" />
            </Form.Item>

            <Button type="primary" htmlType="submit" loading={busy} style={{ background: '#0F3E2E', borderColor: '#0F3E2E' }}>
              Gửi yêu cầu xem xét
            </Button>
          </Form>
        </div>
      )}
    </Card>
  );
}
