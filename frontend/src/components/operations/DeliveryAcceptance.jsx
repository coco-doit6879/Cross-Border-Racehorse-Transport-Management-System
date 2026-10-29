import React, { useRef, useState, useEffect } from 'react';
import { Alert, Button, Card, Form, Input, Select, Space, Radio, Tag, Typography, message } from 'antd';
import { Check, MapPin, PenTool, RotateCcw } from 'lucide-react';
import api from '../../services/apiClient';

const { Text, Title } = Typography;

export default function DeliveryAcceptance({ order, route, onChanged }) {
  const [form] = Form.useForm();
  const canvas = useRef(null);
  const drawing = useRef(false);
  const signed = useRef(false);
  const [busy, setBusy] = useState(false);

  const defaultRole = 'AUTHORIZED_RECIPIENT';

  const PRESETS = {
    AUTHORIZED_RECIPIENT: {
      label: 'Người nhận ủy quyền tại đích',
      name: 'Sokha Kem',
      phone: '0912 888 999',
      desc: 'Đại diện tiếp nhận tại chuồng đích (Cơ sở tiếp nhận)'
    },
    STABLE_MANAGER: {
      label: 'Quản lý chuồng trại đích',
      name: 'Chhorn Vandy',
      phone: '0987 654 321',
      desc: 'Quản lý cơ sở tiếp nhận và bố trí chuồng nuôi'
    },
    CUSTOMER: {
      label: 'Chủ sở hữu có mặt nhận trực tiếp',
      name: order.customerId?.fullName || 'Edward Customer',
      phone: order.customerId?.phone || '0901 234 567',
      desc: 'Chủ ngựa (người đặt vận đơn) trực tiếp tiếp nhận tại đích'
    },
    VETERINARIAN: {
      label: 'Bác sĩ thú y tiếp nhận',
      name: 'Dr. Samnang',
      phone: '0933 111 222',
      desc: 'Bác sĩ chuyên trách kiểm tra dịch tễ tại trạm đích'
    }
  };

  useEffect(() => {
    const initialConditions = {};
    (order.horseIds || []).forEach((h) => {
      initialConditions[h._id] = 'EXCELLENT';
    });
    form.setFieldsValue({
      signerRole: defaultRole,
      name: PRESETS[defaultRole].name,
      phone: PRESETS[defaultRole].phone,
      conditions: initialConditions
    });
  }, [order]);

  const handleRoleChange = (role) => {
    const preset = PRESETS[role];
    if (preset) {
      form.setFieldsValue({
        name: preset.name,
        phone: preset.phone
      });
    }
  };

  const point = (event) => {
    const box = canvas.current.getBoundingClientRect();
    return [
      ((event.clientX - box.left) * canvas.current.width) / box.width,
      ((event.clientY - box.top) * canvas.current.height) / box.height
    ];
  };

  const handleAutoSign = () => {
    const cvs = canvas.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.strokeStyle = '#0F3E2E';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(80, 100);
    ctx.bezierCurveTo(120, 30, 160, 130, 200, 70);
    ctx.bezierCurveTo(240, 20, 270, 110, 310, 60);
    ctx.bezierCurveTo(340, 30, 360, 90, 400, 50);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(70, 115);
    ctx.quadraticCurveTo(250, 135, 430, 105);
    ctx.stroke();

    signed.current = true;
    message.success('Đã điền chữ ký mẫu thành công.');
  };

  const handleClearSignature = () => {
    const cvs = canvas.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    signed.current = false;
  };

  const submit = async (values) => {
    if (!signed.current) return message.error('Vui lòng ký xác nhận trước khi hoàn tất.');
    setBusy(true);
    try {
      await api.post('/pod/sign', {
        tripId: route._id,
        orderId: order._id,
        signerName: values.name,
        signerPhone: values.phone,
        signerRole: values.signerRole || defaultRole,
        signatureImageUrl: canvas.current.toDataURL('image/png'),
        horseConditionsOnArrival: order.horseIds.map((h) => ({
          horseId: h._id,
          conditionStatus: values.conditions?.[h._id] || 'EXCELLENT',
          notes: values.notes?.[h._id] || ''
        }))
      });
      message.success('Đã ký biên bản giao nhận điện tử (POD) và hoàn tất đơn hàng.');
      onChanged();
    } catch (error) {
      message.error(error.response?.data?.message || error.message || 'Không thể xác nhận giao nhận.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      style={{
        borderRadius: 10,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        border: '1px solid #E2E8F0',
        marginBottom: 20
      }}
      title={
        <div style={{ padding: '4px 0' }}>
          <Title level={5} style={{ margin: 0, color: '#0F172A', fontSize: 17, fontWeight: 700 }}>
            Biên bản bàn giao & nghiệm thu tại điểm đến (POD)
          </Title>
          <Text type="secondary" style={{ fontSize: 14, color: '#64748B' }}>
            Biên bản kiểm tra thể trạng ngựa và ký nhận bàn giao tại chuồng nuôi đích
          </Text>
        </div>
      }
    >
      {/* Route & Shipment Meta */}
      <div
        style={{
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: 8,
          padding: 14,
          marginBottom: 16
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <div>
            <Text type="secondary" style={{ fontSize: 13, display: 'block', color: '#64748B' }}>
              Người gửi (Chủ ngựa):
            </Text>
            <Text strong style={{ fontSize: 15, color: '#0F172A' }}>
              {order.customerId?.fullName || 'Edward Customer'}
            </Text>
            <div style={{ fontSize: 13, color: '#64748B' }}>
              {order.origin?.address || 'TP. Hồ Chí Minh, Việt Nam'}
            </div>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 13, display: 'block', color: '#64748B' }}>
              Điểm đến bàn giao:
            </Text>
            <Text strong style={{ fontSize: 15, color: '#0F172A' }}>
              {order.destination?.address || 'Trường đua Quốc tế / Điểm giao đích'}
            </Text>
            <div style={{ fontSize: 13, color: '#166534', fontWeight: 600 }}>
              Xe đã đỗ tại chuồng đích · Ngựa đã xuống xe
            </div>
          </div>
        </div>
      </div>

      <Alert type="info" showIcon message="Ký nhận theo check-in giao hàng" description="Tài xế phải check-in điểm giao, xác nhận từng ngựa xuống xe và ghi km cuối chuyến. Bạn kiểm tra tình trạng ngựa và ký xác nhận bên dưới; không cần bật vị trí thiết bị." style={{marginBottom:16}} />
      <Form form={form} layout="vertical" onFinish={submit}>
        {/* Recipient role */}
        <Form.Item
          name="signerRole"
          label={<span style={{ fontWeight: 600, fontSize: 14, color: '#0F172A' }}>Bên tiếp nhận và ký biên bản tại điểm giao:</span>}
          rules={[{ required: true }]}
        >
          <Radio.Group onChange={(e) => handleRoleChange(e.target.value)} style={{ width: '100%' }}>
            <Space direction="vertical" style={{ width: '100%', gap: 8 }}>
              {Object.entries(PRESETS).map(([key, item]) => (
                <Radio key={key} value={key} style={{ padding: '6px 0' }}>
                  <Text strong style={{ color: '#0F172A' }}>{item.label}</Text>
                  <span style={{ fontSize: 13, color: '#64748B', marginLeft: 8 }}>
                    — {item.desc}
                  </span>
                </Radio>
              ))}
            </Space>
          </Radio.Group>
        </Form.Item>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <Form.Item
            name="name"
            label={<span style={{ fontSize: 14, fontWeight: 500 }}>Họ tên người nhận tại đích</span>}
            rules={[{ required: true, whitespace: true, message: 'Nhập họ tên người nhận' }]}
          >
            <Input maxLength={120} placeholder="Ví dụ: Sokha Kem" style={{ height: 40 }} />
          </Form.Item>

          <Form.Item
            name="phone"
            label={<span style={{ fontSize: 14, fontWeight: 500 }}>Số điện thoại người nhận</span>}
            rules={[
              { required: true, message: 'Nhập số điện thoại' },
              { pattern: /^[+\d\s()-]{8,25}$/, message: 'Số điện thoại không hợp lệ' }
            ]}
          >
            <Input maxLength={25} placeholder="Ví dụ: 0912 888 999" style={{ height: 40 }} />
          </Form.Item>
        </div>

        {/* Horse conditions */}
        <div style={{ marginTop: 4, marginBottom: 16 }}>
          <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 8, color: '#0F172A' }}>
            Kiểm tra thể trạng ngựa khi bàn giao:
          </Text>
          {order.horseIds.map((h) => (
            <div
              key={h._id}
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                padding: '12px 14px',
                marginBottom: 10
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text strong style={{ color: '#0F172A' }}>
                  {h.name} · Mã chip: {h.microchipId || 'Chưa gắn'}
                </Text>
                <Tag style={{ background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0', fontWeight: 500 }}>
                  Đã xuống xe an toàn
                </Tag>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <Form.Item
                  name={['conditions', h._id]}
                  label={<span style={{ fontSize: 13, color: '#475569' }}>Hiện trạng</span>}
                  rules={[{ required: true }]}
                  style={{ margin: 0 }}
                >
                  <Select
                    options={[
                      { value: 'EXCELLENT', label: 'Rất tốt — Thể trạng ổn định' },
                      { value: 'GOOD', label: 'Tốt — Bình thường' },
                      { value: 'MINOR_STRESS', label: 'Căng thẳng nhẹ — Cần nghỉ ngơi' }
                    ]}
                  />
                </Form.Item>

                <Form.Item
                  name={['notes', h._id]}
                  label={<span style={{ fontSize: 13, color: '#475569' }}>Ghi chú kiểm tra</span>}
                  style={{ margin: 0 }}
                >
                  <Input placeholder="Không có dấu hiệu bất thường" maxLength={200} />
                </Form.Item>
              </div>
            </div>
          ))}
        </div>

        {/* Signature Canvas */}
        <div style={{ marginTop: 8, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: '#0F172A' }}>
              Chữ ký điện tử của người nhận:
            </span>
            <Space>
              <Button size="small" onClick={handleAutoSign} style={{ fontSize: 13 }}>
                Ký mẫu tự động
              </Button>
              <Button size="small" onClick={handleClearSignature} style={{ fontSize: 13 }}>
                Xóa chữ ký
              </Button>
            </Space>
          </div>

          <canvas
            ref={canvas}
            width={640}
            height={150}
            style={{
              width: '100%',
              maxWidth: 640,
              height: 150,
              border: '1px solid #CBD5E1',
              borderRadius: 8,
              background: '#ffffff',
              touchAction: 'none',
              cursor: 'crosshair',
              display: 'block'
            }}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              drawing.current = true;
              const ctx = canvas.current.getContext('2d');
              ctx.strokeStyle = '#0F172A';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(...point(event));
            }}
            onPointerMove={(event) => {
              if (!drawing.current) return;
              const ctx = canvas.current.getContext('2d');
              ctx.lineTo(...point(event));
              ctx.stroke();
              signed.current = true;
            }}
            onPointerUp={() => {
              drawing.current = false;
            }}
            onPointerCancel={() => {
              drawing.current = false;
            }}
          />
          <Text type="secondary" style={{ fontSize: 13, marginTop: 4, display: 'block', color: '#64748B' }}>
            Ký tay trực tiếp trên khung hoặc bấm "Ký mẫu tự động".
          </Text>
        </div>

        {/* Action Button */}
        <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={busy}
            icon={<Check size={16} />}
            style={{
              background: '#0F3E2E',
              borderColor: '#0F3E2E',
              height: 42,
              paddingLeft: 22,
              paddingRight: 22,
              fontSize: 15,
              fontWeight: 600,
              borderRadius: 6,
              width: '100%',
              maxWidth: 320
            }}
          >
            Xác nhận bàn giao & Ký POD
          </Button>
        </div>
      </Form>
    </Card>
  );
}
