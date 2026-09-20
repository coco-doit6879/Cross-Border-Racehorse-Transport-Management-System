import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Checkbox, Select, Tag, message, Card, Empty } from 'antd';
import { ArrowLeft, Send, Check, AlertCircle } from 'lucide-react';
import { useHorseStore } from '../../store/useHorseStore';
import { useOrderStore } from '../../store/useOrderStore';

const { TextArea } = Input;
const { Option } = Select;

const COUNTRY_OPTIONS = [
  { code: 'VN', name: 'Việt Nam (VN)' },
  { code: 'KH', name: 'Campuchia (KH)' },
  { code: 'SG', name: 'Singapore (SG)' },
  { code: 'TH', name: 'Thái Lan (TH)' },
  { code: 'MY', name: 'Malaysia (MY)' }
];

const TIME_SLOTS = [
  '05:00', '05:30', '06:00', '06:30', '07:00', '07:30', '08:00', '08:30',
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
  '21:00', '21:30', '22:00'
];

const CreateOrder = () => {
  const navigate = useNavigate();
  const { horses, fetchHorses } = useHorseStore();
  const { orders, fetchOrders, createOrder } = useOrderStore();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchHorses().catch(() => {});
    fetchOrders().catch(() => {});
  }, [fetchHorses, fetchOrders]);

  const [selectedHorses, setSelectedHorses] = useState([]);
  const [originAddress, setOriginAddress] = useState('');
  const [originCountry, setOriginCountry] = useState('VN');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [destinationCountry, setDestinationCountry] = useState('KH');
  const [departureDate, setDepartureDate] = useState('');

  // Collect set of horse IDs that are currently in active/pending transport orders
  const busyHorseIds = new Set();
  orders.forEach((o) => {
    if (['PENDING_APPROVAL', 'APPROVED', 'IN_TRANSIT', 'DELIVERING'].includes(o.status)) {
      if (Array.isArray(o.horseIds)) {
        o.horseIds.forEach((h) => {
          const id = typeof h === 'object' ? h._id || h.id : h;
          if (id) busyHorseIds.add(id.toString());
        });
      }
      if (Array.isArray(o.horses)) {
        o.horses.forEach((horseName) => {
          const matched = horses.find((h) => h.name === horseName);
          if (matched) busyHorseIds.add((matched._id || matched.id).toString());
        });
      }
    }
  });

  // Filter available horses
  const availableHorses = horses.filter((h) => {
    const horseIdStr = (h._id || h.id || '').toString();
    return !busyHorseIds.has(horseIdStr) && h.status !== 'IN_TRANSIT';
  });

  // Auto select first available horse
  useEffect(() => {
    if (availableHorses.length > 0 && selectedHorses.length === 0) {
      setSelectedHorses([availableHorses[0].name]);
    }
  }, [availableHorses, selectedHorses]);

  const handleSubmit = async (values) => {
    if (selectedHorses.length === 0) {
      message.error('Vui lòng chọn ít nhất 01 chú ngựa sẵn sàng để vận chuyển!');
      return;
    }

    setSubmitting(true);
    try {
      const selectedHorseObjects = horses.filter(
        (h) => selectedHorses.includes(h.name) || selectedHorses.includes(h.id) || selectedHorses.includes(h._id)
      );
      const horseIds = selectedHorseObjects.map((h) => h._id || h.id);

      const fullOrigin = `${values.originAddress.trim()}, ${COUNTRY_OPTIONS.find((c) => c.code === values.originCountry)?.name.split(' ')[0] || ''}`;
      const fullDestination = `${values.destinationAddress.trim()}, ${COUNTRY_OPTIONS.find((c) => c.code === values.destinationCountry)?.name.split(' ')[0] || ''}`;

      const newOrder = await createOrder({
        horseIds: horseIds.length > 0 ? horseIds : undefined,
        origin: {
          address: values.originAddress.trim(),
          countryCode: values.originCountry
        },
        destination: {
          address: values.destinationAddress.trim(),
          countryCode: values.destinationCountry
        },
        routeLabel: `${values.originAddress.split(',')[0]} → ${values.destinationAddress.split(',')[0]}`,
        requestedDepartureDate: values.departureDate || new Date().toISOString(),
        departureTime: values.departureTime || '07:00',
        horses: selectedHorses,
        specialRequirements: values.specialRequirements
      });

      message.success(
        `Đã tạo thành công đơn vận chuyển ${newOrder?.orderCode || newOrder?.bookingCode || ''}! Đơn đang chờ phê duyệt.`
      );
      navigate('/orders');
    } catch (err) {
      message.error(err?.response?.data?.message || err.message || 'Không thể tạo đơn vận chuyển');
    } finally {
      setSubmitting(false);
    }
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
          onClick={() => navigate('/orders')}
          style={{ borderRadius: 6 }}
        />
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>
            Tạo đơn vận chuyển mới
          </h1>
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
            Nhập chi tiết địa điểm đón/giao, chọn quốc gia và đăng ký ngựa vận chuyển.
          </div>
        </div>
      </div>

      {/* 2-Columns Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.5fr 1fr',
          gap: 24,
          alignItems: 'start'
        }}
      >
        {/* Column Left: Form */}
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
              originCountry: 'VN',
              destinationCountry: 'KH',
              departureTime: '07:00',
              specialRequirements: 'Xe khoang yên tĩnh, nghỉ định kỳ 2 giờ/lần.'
            }}
            onFinish={handleSubmit}
          >
            {/* 01 / Điểm đón */}
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F3E2E', marginBottom: 14 }}>
              01 / Điểm đón (Origin Location)
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
              <Form.Item
                label={<span style={{ fontWeight: 600, fontSize: 13 }}>Địa chỉ chi tiết điểm đón *</span>}
                name="originAddress"
                rules={[{ required: true, message: 'Vui lòng nhập địa chỉ chi tiết điểm đón' }]}
              >
                <Input
                  placeholder="VD: CLB Thảo Điền, 128 Nguyễn Văn Hưởng, P. Thảo Điền, TP. Thủ Đức"
                  onChange={(e) => setOriginAddress(e.target.value)}
                />
              </Form.Item>

              <Form.Item
                label={<span style={{ fontWeight: 600, fontSize: 13 }}>Quốc gia đón *</span>}
                name="originCountry"
                rules={[{ required: true, message: 'Chọn quốc gia' }]}
              >
                <Select onChange={(val) => setOriginCountry(val)}>
                  {COUNTRY_OPTIONS.map((c) => (
                    <Option key={c.code} value={c.code}>
                      {c.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </div>

            {/* 02 / Điểm giao */}
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F3E2E', margin: '20px 0 14px 0' }}>
              02 / Điểm giao (Destination Location)
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
              <Form.Item
                label={<span style={{ fontWeight: 600, fontSize: 13 }}>Địa chỉ chi tiết điểm giao *</span>}
                name="destinationAddress"
                rules={[{ required: true, message: 'Vui lòng nhập địa chỉ chi tiết điểm giao' }]}
              >
                <Input
                  placeholder="VD: CLB Polo Phnom Penh, Chbar Ampov, Phnom Penh"
                  onChange={(e) => setDestinationAddress(e.target.value)}
                />
              </Form.Item>

              <Form.Item
                label={<span style={{ fontWeight: 600, fontSize: 13 }}>Quốc gia giao *</span>}
                name="destinationCountry"
                rules={[{ required: true, message: 'Chọn quốc gia' }]}
              >
                <Select onChange={(val) => setDestinationCountry(val)}>
                  {COUNTRY_OPTIONS.map((c) => (
                    <Option key={c.code} value={c.code}>
                      {c.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </div>

            {/* Thời gian */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 10 }}>
              <Form.Item
                label={<span style={{ fontWeight: 600, fontSize: 13 }}>Ngày đón dự kiến *</span>}
                name="departureDate"
                rules={[{ required: true, message: 'Vui lòng chọn ngày khởi hành' }]}
              >
                <Input
                  type="date"
                  onChange={(e) => setDepartureDate(e.target.value)}
                />
              </Form.Item>

              <Form.Item
                label={<span style={{ fontWeight: 600, fontSize: 13 }}>Giờ đón mong muốn *</span>}
                name="departureTime"
                rules={[{ required: true, message: 'Vui lòng chọn khung giờ đón' }]}
              >
                <Select placeholder="Chọn khung giờ đón">
                  {TIME_SLOTS.map((time) => {
                    const hour = parseInt(time.split(':')[0], 10);
                    const period = hour < 12 ? 'Sáng' : hour < 18 ? 'Chiều' : 'Tối';
                    return (
                      <Option key={time} value={time}>
                        {time} - {period}
                      </Option>
                    );
                  })}
                </Select>
              </Form.Item>
            </div>

            {/* 03 / Chọn ngựa vận chuyển */}
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: '#0F3E2E',
                margin: '20px 0 14px 0'
              }}
            >
              03 / Chọn ngựa vận chuyển *
            </div>

            {horses.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Bạn chưa đăng ký chú ngựa nào. Hãy thêm hồ sơ ngựa trước khi tạo đơn."
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {horses.map((horse) => {
                  const horseIdStr = (horse._id || horse.id || '').toString();
                  const isBusy = busyHorseIds.has(horseIdStr) || horse.status === 'IN_TRANSIT';
                  const isChecked = selectedHorses.includes(horse.name);

                  return (
                    <div
                      key={horse.id}
                      onClick={() => {
                        if (isBusy) return;
                        if (isChecked) {
                          setSelectedHorses(selectedHorses.filter((n) => n !== horse.name));
                        } else {
                          setSelectedHorses([...selectedHorses, horse.name]);
                        }
                      }}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 8,
                        border: isBusy
                          ? '1px solid #E5E7EB'
                          : isChecked
                          ? '1px solid #0F3E2E'
                          : '1px solid #E5E7EB',
                        backgroundColor: isBusy
                          ? '#F3F4F6'
                          : isChecked
                          ? '#F6FAF8'
                          : '#FAFAFA',
                        opacity: isBusy ? 0.65 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: isBusy ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Checkbox
                          checked={isChecked}
                          disabled={isBusy}
                          onChange={(e) => {
                            e.stopPropagation();
                            if (isBusy) return;
                            if (e.target.checked) {
                              setSelectedHorses([...selectedHorses, horse.name]);
                            } else {
                              setSelectedHorses(selectedHorses.filter((n) => n !== horse.name));
                            }
                          }}
                        />
                        <div>
                          <span style={{ fontWeight: 700, fontSize: 14, color: isBusy ? '#6B7280' : '#111827' }}>
                            {horse.name}
                          </span>
                          <span style={{ fontSize: 12, color: '#6B7280', marginLeft: 8 }}>
                            Mã chip: {horse.microchipId} • {horse.feiPassportNo || 'Hộ chiếu FEI'}
                          </span>
                        </div>
                      </div>

                      {isBusy && (
                        <Tag color="warning" style={{ fontSize: 11, borderRadius: 6 }}>
                          Đã có đơn vận chuyển
                        </Tag>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Yêu cầu chăm sóc */}
            <Form.Item
              label={<span style={{ fontWeight: 600, fontSize: 13 }}>Yêu cầu chăm sóc đặc biệt</span>}
              name="specialRequirements"
            >
              <TextArea rows={3} placeholder="Xe kính khoang yên tĩnh, nghỉ định kỳ mỗi 2 giờ..." />
            </Form.Item>

            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <Button onClick={() => navigate('/orders')} style={{ borderRadius: 6 }}>
                Hủy bỏ
              </Button>
            </div>
          </Form>
        </div>

        {/* Column Right: Summary */}
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: '#4B5563' }}>
            <div>
              <span style={{ color: '#6B7280' }}>Điểm đón (Origin):</span>
              <div style={{ fontWeight: 700, color: '#111827', fontSize: 13, marginTop: 2 }}>
                {originAddress || 'Chưa nhập địa chỉ đón'} ({originCountry})
              </div>
            </div>

            <div>
              <span style={{ color: '#6B7280' }}>Điểm giao (Destination):</span>
              <div style={{ fontWeight: 700, color: '#111827', fontSize: 13, marginTop: 2 }}>
                {destinationAddress || 'Chưa nhập địa chỉ giao'} ({destinationCountry})
              </div>
            </div>

            <div style={{ marginTop: 4 }}>
              <span style={{ color: '#6B7280' }}>Ngày đón:</span> <strong>{departureDate || 'Chưa chọn'}</strong>
            </div>

            <div>
              <span style={{ color: '#6B7280' }}>Số lượng ngựa chọn:</span>{' '}
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
            Đơn vận chuyển sau khi tạo sẽ được gửi tới Quản lý vận tải để phê duyệt và phân công xe & tài xế.
          </div>

          <Button
            type="primary"
            onClick={() => form.submit()}
            loading={submitting}
            disabled={submitting || selectedHorses.length === 0}
            style={{
              backgroundColor: selectedHorses.length > 0 ? '#0F3E2E' : '#9CA3AF',
              borderColor: selectedHorses.length > 0 ? '#0F3E2E' : '#9CA3AF',
              width: '100%',
              height: 42,
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 8
            }}
          >
            {submitting ? 'Đang gửi yêu cầu…' : 'Gửi yêu cầu vận chuyển'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateOrder;
