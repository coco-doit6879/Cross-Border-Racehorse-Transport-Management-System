import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Checkbox, message, Card } from 'antd';
import { ArrowLeft, Send, Check } from 'lucide-react';
import { useHorseStore } from '../../store/useHorseStore';
import { useOrderStore } from '../../store/useOrderStore';

const { TextArea } = Input;

const CreateOrder = () => {
  const navigate = useNavigate();
  const { horses } = useHorseStore();
  const { createOrder } = useOrderStore();
  const [form] = Form.useForm();

  const [selectedHorses, setSelectedHorses] = useState(['Thunder Bolt', 'Silver Wind']);
  const [origin, setOrigin] = useState('CLB Thảo Điền, TP. Hồ Chí Minh');
  const [destination, setDestination] = useState('CLB Polo, Phnom Penh');
  const [departureDate, setDepartureDate] = useState('17/09/2026');

  const handleSubmit = (values) => {
    if (selectedHorses.length === 0) {
      message.error('Vui lòng chọn ít nhất 01 chú ngựa để vận chuyển!');
      return;
    }

    const newOrder = createOrder({
      origin: values.origin,
      destination: values.destination,
      routeLabel: `${values.origin.split(',')[0]} → ${values.destination.split(',')[0]}`,
      departureDate: values.departureDate,
      departureTime: values.departureTime || '07:00',
      horses: selectedHorses,
      specialRequirements: values.specialRequirements
    });

    message.success(
      `Đã tạo thành công đơn vận chuyển ${newOrder.orderCode}! Đơn đang ở trạng thái 'Chờ phê duyệt'.`
    );
    navigate('/');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: 12,
          padding: '16px 24px'
        }}
      >
        <Button
          icon={<ArrowLeft size={16} />}
          onClick={() => navigate('/')}
          style={{ borderRadius: 6 }}
        />
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>
            Tạo đơn vận chuyển
          </h1>
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
            Thông tin bắt đầu. Mỗi đơn được tự động tạo mã vận chuyển TR-YYYY-XXXX.
          </div>
        </div>
      </div>

      {/* 2-Columns Layout (Exact Figma 02-booking 1) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.5fr 1fr',
          gap: 24,
          alignItems: 'start'
        }}
      >
        {/* Column Left: Booking Details Form */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: 12,
            padding: 28
          }}
        >
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              origin: 'CLB Thảo Điền, TP. Hồ Chí Minh',
              destination: 'CLB Polo, Phnom Penh',
              departureDate: '17/09/2026',
              departureTime: '07:00',
              specialRequirements: 'Xe kính khoang yên tĩnh, nghỉ định kỳ mỗi 2 giờ.'
            }}
            onFinish={handleSubmit}
          >
            {/* 01 / Hành trình */}
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F3E2E', marginBottom: 14 }}>
              01 / Hành trình
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Form.Item
                label={<span style={{ fontWeight: 600, fontSize: 13 }}>Điểm đón *</span>}
                name="origin"
                rules={[{ required: true, message: 'Nhập điểm đón' }]}
              >
                <Input
                  placeholder="CLB Thảo Điền, TP. Hồ Chí Minh"
                  onChange={(e) => setOrigin(e.target.value)}
                />
              </Form.Item>

              <Form.Item
                label={<span style={{ fontWeight: 600, fontSize: 13 }}>Điểm giao *</span>}
                name="destination"
                rules={[{ required: true, message: 'Nhập điểm giao' }]}
              >
                <Input
                  placeholder="CLB Polo, Phnom Penh"
                  onChange={(e) => setDestination(e.target.value)}
                />
              </Form.Item>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Form.Item
                label={<span style={{ fontWeight: 600, fontSize: 13 }}>Ngày đón *</span>}
                name="departureDate"
                rules={[{ required: true, message: 'Nhập ngày khởi hành' }]}
              >
                <Input
                  placeholder="17/09/2026"
                  onChange={(e) => setDepartureDate(e.target.value)}
                />
              </Form.Item>

              <Form.Item
                label={<span style={{ fontWeight: 600, fontSize: 13 }}>Giờ đón mong muốn</span>}
                name="departureTime"
              >
                <Input placeholder="07:00" />
              </Form.Item>
            </div>

            {/* 02 / Chọn ngựa vận chuyển */}
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: '#0F3E2E',
                margin: '20px 0 14px 0'
              }}
            >
              02 / Chọn ngựa vận chuyển *
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {horses.map((horse) => {
                const isChecked = selectedHorses.includes(horse.name);
                return (
                  <div
                    key={horse.id}
                    onClick={() => {
                      if (isChecked) {
                        setSelectedHorses(selectedHorses.filter((n) => n !== horse.name));
                      } else {
                        setSelectedHorses([...selectedHorses, horse.name]);
                      }
                    }}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 8,
                      border: isChecked ? '1px solid #0F3E2E' : '1px solid #E5E7EB',
                      backgroundColor: isChecked ? '#F6FAF8' : '#FAFAFA',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Checkbox
                        checked={isChecked}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (e.target.checked) {
                            setSelectedHorses([...selectedHorses, horse.name]);
                          } else {
                            setSelectedHorses(selectedHorses.filter((n) => n !== horse.name));
                          }
                        }}
                      />
                      <div>
                        <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>
                          {horse.name}
                        </span>
                        <span style={{ fontSize: 12, color: '#6B7280', marginLeft: 8 }}>
                          Chip: {horse.microchipId} • {horse.feiPassportNo || 'Hộ chiếu FEI'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Yêu cầu chăm sóc */}
            <Form.Item
              label={<span style={{ fontWeight: 600, fontSize: 13 }}>Yêu cầu chăm sóc đặc biệt</span>}
              name="specialRequirements"
            >
              <TextArea rows={3} placeholder="Xe kính khoang yên tĩnh, nghỉ định kỳ mỗi 2 giờ..." />
            </Form.Item>

            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <Button onClick={() => navigate('/')} style={{ borderRadius: 6 }}>
                Hủy
              </Button>
            </div>
          </Form>
        </div>

        {/* Column Right: Summary & Submit Card */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: 12,
            padding: 24,
            position: 'sticky',
            top: 84
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 16, color: '#111827', marginBottom: 14 }}>
            Tóm tắt yêu cầu
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: '#4B5563' }}>
            <div>
              <span style={{ color: '#6B7280' }}>Tuyến đường dự kiến:</span>
              <div style={{ fontWeight: 700, color: '#111827', fontSize: 14, marginTop: 2 }}>
                {origin.split(',')[0]} → {destination.split(',')[0]}
              </div>
            </div>

            <div style={{ marginTop: 6 }}>
              <span style={{ color: '#6B7280' }}>Ngày đón:</span> <strong>{departureDate}</strong>
            </div>

            <div>
              <span style={{ color: '#6B7280' }}>Số lượng:</span>{' '}
              <strong>{selectedHorses.length} con ngựa</strong>
            </div>

            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
              Danh sách: <em>{selectedHorses.join(', ') || 'Chưa chọn ngựa'}</em>
            </div>
          </div>

          <div
            style={{
              margin: '20px 0',
              padding: '12px 14px',
              backgroundColor: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: 8,
              fontSize: 12,
              color: '#6B7280',
              lineHeight: 1.5
            }}
          >
            Đơn vận chuyển sẽ kiểm tra yêu cầu và trạng thái giấy tờ đã phê duyệt. Hồ sơ được bổ sung
            tự động từ hồ sơ ngựa.
          </div>

          <Button
            type="primary"
            onClick={() => form.submit()}
            style={{
              backgroundColor: '#0F3E2E',
              borderColor: '#0F3E2E',
              width: '100%',
              height: 42,
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 8
            }}
          >
            Gửi yêu cầu vận chuyển
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateOrder;
