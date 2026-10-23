import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Form,
  Input,
  Modal,
  Radio,
  Row,
  Select,
  Space,
  Tag,
  TimePicker,
  message
} from 'antd';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  MapPin,
  ShieldCheck,
  Sparkles,
  Truck,
  User
} from 'lucide-react';
import dayjs from 'dayjs';
import { useHorseStore } from '../../store/useHorseStore';
import { useOrderStore } from '../../store/useOrderStore';
import { wdpDemoService } from '../../services/wdpDemoService';

const formatVnd = (val) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val || 0);

export default function CreateOrder() {
  const navigate = useNavigate();
  const { horses } = useHorseStore();
  const { createOrder } = useOrderStore();

  const [step, setStep] = useState(0); // 0: Chuyến đi, 1: Chọn ngựa, 2: Dịch vụ & bảo hiểm, 3: Xác nhận & gửi
  const [submitting, setSubmitting] = useState(false);
  const [createdOrderModal, setCreatedOrderModal] = useState(null);

  // Form State
  const [tripType, setTripType] = useState('DOMESTIC'); // DOMESTIC | INTERNATIONAL
  const [isSenderMe, setIsSenderMe] = useState(true);
  const [senderName, setSenderName] = useState('Tran Le Anh Quan');
  const [senderPhone, setSenderPhone] = useState('0901234567');
  const [pickupAddress, setPickupAddress] = useState('Trang trại Thủ Đức, TP.HCM');

  const [receiverName, setReceiverName] = useState('Nguyễn Văn Nhận');
  const [receiverPhone, setReceiverPhone] = useState('0912345678');
  const [deliveryAddress, setDeliveryAddress] = useState('Trại ngựa Long Thành, Đồng Nai');

  const [departureDate, setDepartureDate] = useState('2026-10-24');
  const [departureTime, setDepartureTime] = useState('06:00');

  // Horse selection (Storm Runner pre-selected)
  const defaultSelected = horses.some((h) => h.name === 'Storm Runner')
    ? [horses.find((h) => h.name === 'Storm Runner')?.id]
    : [horses[0]?.id || 'horse-stormrunner'];
  const [selectedHorseIds, setSelectedHorseIds] = useState(defaultSelected);

  // Services & Add-ons
  const [stallType, setStallType] = useState('VIP'); // STANDARD | VIP
  const [dietAddon, setDietAddon] = useState(true);
  const [insuranceAddon, setInsuranceAddon] = useState(true);
  const [specialNote, setSpecialNote] = useState('Cần duy trì nhiệt độ khoang 22-24°C, bổ sung nước điện giải mỗi 2 giờ.');

  // Pricing Calculation
  const baseRate = tripType === 'INTERNATIONAL' ? 45000000 : 20000000;
  const stallAddonCost = stallType === 'VIP' ? 3000000 : 0;
  const dietCost = dietAddon ? 1500000 : 0;
  const insuranceCost = insuranceAddon ? 1576000 : 0;
  const totalAmount = (baseRate + stallAddonCost + dietCost + insuranceCost) * Math.max(1, selectedHorseIds.length);
  const depositAmount = Math.round(totalAmount * 0.3);

  const selectedHorseObjects = horses.filter((h) => selectedHorseIds.includes(h.id));

  const handleToggleHorse = (id) => {
    setSelectedHorseIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleNextStep = () => {
    if (step === 0) {
      if (!pickupAddress || !deliveryAddress) {
        message.warning('Vui lòng nhập đầy đủ điểm đón và điểm trả.');
        return;
      }
    }
    if (step === 1) {
      if (selectedHorseIds.length === 0) {
        message.warning('Vui lòng chọn ít nhất 1 ngựa vận chuyển.');
        return;
      }
    }
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevStep = () => {
    setStep((s) => Math.max(0, s - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitOrder = async () => {
    setSubmitting(true);
    try {
      const orderPayload = {
        orderCode: 'BK-005',
        bookingCode: 'BK-005',
        customerName: senderName,
        customerPhone: senderPhone,
        origin: pickupAddress,
        destination: deliveryAddress,
        routeLabel: `${pickupAddress.split(',')[0]} → ${deliveryAddress.split(',')[0]} (${tripType === 'INTERNATIONAL' ? 'Quốc tế' : 'Trong nước'})`,
        departureDate: '24/10/2026',
        departureTime,
        horses: selectedHorseObjects.map((h) => h.name),
        horseIds: selectedHorseIds,
        specialRequirements: specialNote,
        pricing: {
          routeBaseUnitPriceVnd: baseRate,
          horseCount: selectedHorseIds.length,
          baseAmountVnd: baseRate * selectedHorseIds.length,
          addOns: [
            ...(stallType === 'VIP' ? [{ id: 'addon-vip', name: 'Khoang VIP mở rộng & đệm khí nén', quantity: 1, amountVnd: 3000000 }] : []),
            ...(dietAddon ? [{ id: 'addon-feed', name: 'Cỏ khô Timothy & nước điện giải', quantity: 1, amountVnd: 1500000 }] : []),
            ...(insuranceAddon ? [{ id: 'addon-ins', name: 'Gói bảo hiểm vận chuyển toàn diện', quantity: 1, amountVnd: 1576000 }] : [])
          ],
          totalAmountVnd: totalAmount
        },
        depositAmountVnd: depositAmount,
        depositRequired: true,
        depositPercent: 30,
        depositStatus: 'UNPAID',
        status: 'PENDING_APPROVAL',
        flowStep: 1,
        flowStepLabel: 'Bước 1/8: Gửi đơn',
        isJustCreated: true
      };

      const newOrder = await createOrder(orderPayload);
      wdpDemoService.createOrderBK005(orderPayload);
      setCreatedOrderModal(newOrder || orderPayload);
    } catch (err) {
      console.error(err);
      message.error('Có lỗi xảy ra khi gửi đơn.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page Heading */}
      <div className="refined-page-heading">
        <button className="refined-back" type="button" onClick={() => navigate('/orders')}>
          <ArrowLeft size={14} /> Đơn của tôi <span>/ Đặt chuyến mới</span>
        </button>
        <h1>Tạo yêu cầu vận chuyển</h1>
        <p>Chọn hành trình phù hợp. Chúng tôi đồng hành cùng bạn và ngựa trong từng chặng.</p>
      </div>

      {/* 4-Step Stepper Bar */}
      <ol className="booking-stepper" aria-label="Các bước đặt chuyến">
        {['Chuyến đi', 'Chọn ngựa', 'Dịch vụ & bảo hiểm', 'Xác nhận & gửi'].map((label, index) => (
          <li
            key={label}
            data-state={index === step ? 'current' : index < step ? 'complete' : 'upcoming'}
            aria-current={index === step ? 'step' : undefined}
          >
            <span className="booking-step-number">
              {index < step ? <Check size={16} /> : index + 1}
            </span>
            <span>{label}</span>
          </li>
        ))}
      </ol>

      <Row gutter={[24, 24]}>
        {/* Left Form Content */}
        <Col xs={24} lg={16}>
          {/* STEP 1: CHUYẾN ĐI */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Loại tuyến vận chuyển */}
              <Card
                title={
                  <Space>
                    <Truck size={17} color="#ea580c" />
                    <span>Loại tuyến vận chuyển</span>
                  </Space>
                }
              >
                <Radio.Group
                  value={tripType}
                  onChange={(e) => setTripType(e.target.value)}
                  style={{ display: 'flex', gap: 20 }}
                >
                  <Radio value="DOMESTIC">
                    <strong>Vận chuyển trong nước</strong>
                    <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
                      Giữa các trang trại, trường đua tại Việt Nam
                    </div>
                  </Radio>
                  <Radio value="INTERNATIONAL">
                    <strong>Vận chuyển quốc tế xuyên biên giới</strong>
                    <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
                      Thủ tục hải quan & kiểm dịch động vật sống xuất/nhập cảnh
                    </div>
                  </Radio>
                </Radio.Group>
              </Card>

              {/* Thông tin người gửi */}
              <Card
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space>
                      <User size={17} color="#ea580c" />
                      <span>Thông tin người gửi (Điểm đón)</span>
                    </Space>
                    <Checkbox
                      checked={isSenderMe}
                      onChange={(e) => {
                        setIsSenderMe(e.target.checked);
                        if (e.target.checked) {
                          setSenderName('Tran Le Anh Quan');
                          setSenderPhone('0901234567');
                          setPickupAddress('Trang trại Thủ Đức, TP.HCM');
                        }
                      }}
                    >
                      Tôi là người gửi
                    </Checkbox>
                  </div>
                }
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="Họ tên người gửi" required>
                      <Input value={senderName} onChange={(e) => setSenderName(e.target.value)} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Số điện thoại liên hệ" required>
                      <Input value={senderPhone} onChange={(e) => setSenderPhone(e.target.value)} />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item label="Địa chỉ đón ngựa (Trang trại / Trường đua)" required>
                      <Input
                        prefix={<MapPin size={15} color="#ea580c" />}
                        value={pickupAddress}
                        onChange={(e) => setPickupAddress(e.target.value)}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>

              {/* Thông tin người nhận */}
              <Card
                title={
                  <Space>
                    <MapPin size={17} color="#ea580c" />
                    <span>Thông tin người nhận (Điểm trả)</span>
                  </Space>
                }
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="Họ tên người nhận" required>
                      <Input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Số điện thoại người nhận" required>
                      <Input value={receiverPhone} onChange={(e) => setReceiverPhone(e.target.value)} />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item label="Địa chỉ giao ngựa đến" required>
                      <Input
                        prefix={<MapPin size={15} color="#ea580c" />}
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>

              {/* Ngày & giờ khởi hành */}
              <Card
                title={
                  <Space>
                    <Calendar size={17} color="#ea580c" />
                    <span>Thời gian khởi hành dự kiến</span>
                  </Space>
                }
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="Ngày khởi hành" required>
                      <Input
                        type="date"
                        value={departureDate}
                        onChange={(e) => setDepartureDate(e.target.value)}
                        style={{ height: 40 }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Giờ khởi hành (Giờ địa phương)" required>
                      <Select
                        value={departureTime}
                        onChange={setDepartureTime}
                        style={{ height: 40 }}
                        options={[
                          { label: '06:00 (Sáng sớm - Thích hợp nhất)', value: '06:00' },
                          { label: '08:00 (Sáng)', value: '08:00' },
                          { label: '14:00 (Chiều mát)', value: '14:00' },
                          { label: '18:00 (Tối)', value: '18:00' }
                        ]}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            </div>
          )}

          {/* STEP 2: CHỌN NGỰA */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <Card
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space>
                      <CheckCircle2 size={17} color="#ea580c" />
                      <span>Chọn ngựa vận chuyển ({selectedHorseIds.length} đã chọn)</span>
                    </Space>
                    <Button type="link" onClick={() => navigate('/horses')} style={{ color: '#ea580c' }}>
                      + Thêm hồ sơ ngựa mới
                    </Button>
                  </div>
                }
              >
                <p style={{ marginTop: 0, color: '#64748b', fontSize: 13 }}>
                  Chỉ những ngựa đã hoàn tất kiểm duyệt sức khỏe và hợp lệ giấy tờ mới đủ điều kiện vận chuyển.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {horses.map((horse) => {
                    const isChecked = selectedHorseIds.includes(horse.id);

                    return (
                      <div
                        key={horse.id}
                        onClick={() => handleToggleHorse(horse.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '16px 20px',
                          border: isChecked ? '1.5px solid #ea580c' : '1px solid #e2e8f0',
                          borderRadius: 10,
                          backgroundColor: isChecked ? '#fff7ed' : '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <Checkbox
                            checked={isChecked}
                            onChange={() => handleToggleHorse(horse.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 8,
                              backgroundColor: '#fed7aa',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 20
                            }}
                          >
                            🏇
                          </div>
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                              {horse.name}
                            </div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>
                              Chip: <span style={{ fontFamily: 'monospace' }}>{horse.microchipId}</span> · Hộ chiếu: {horse.feiPassportNo}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <Tag color="green" style={{ fontWeight: 600 }}>
                            SẴN SÀNG
                          </Tag>
                          <span style={{ fontSize: 13, color: '#64748b' }}>
                            {horse.weight} kg · {horse.age}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: 24 }}>
                  <Form.Item label="Yêu cầu chăm sóc đặc biệt trong chuyến">
                    <Input.TextArea
                      rows={3}
                      value={specialNote}
                      onChange={(e) => setSpecialNote(e.target.value)}
                      placeholder="Ghi chú về thức ăn, nhịp nghỉ, hạ nhiệt khoang hoặc sơ cứu..."
                    />
                  </Form.Item>
                </div>
              </Card>
            </div>
          )}

          {/* STEP 3: DỊCH VỤ & BẢO HIỂM */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Khoang vận chuyển */}
              <Card
                title={
                  <Space>
                    <Truck size={17} color="#ea580c" />
                    <span>Loại khoang xe chuyên dụng</span>
                  </Space>
                }
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div
                    onClick={() => setStallType('VIP')}
                    style={{
                      border: stallType === 'VIP' ? '2px solid #ea580c' : '1px solid #e2e8f0',
                      borderRadius: 10,
                      padding: 18,
                      backgroundColor: stallType === 'VIP' ? '#fff7ed' : '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: 15, color: '#0f172a' }}>Khoang mở rộng VIP</strong>
                      <Tag color="orange">+ 3.000.000 đ</Tag>
                    </div>
                    <p style={{ fontSize: 12, color: '#64748b', margin: '8px 0 0' }}>
                      Đệm khí nén chống sốc êm ái, vách bọc da cách âm, camera hồng ngoại theo dõi 24/7.
                    </p>
                  </div>

                  <div
                    onClick={() => setStallType('STANDARD')}
                    style={{
                      border: stallType === 'STANDARD' ? '2px solid #ea580c' : '1px solid #e2e8f0',
                      borderRadius: 10,
                      padding: 18,
                      backgroundColor: stallType === 'STANDARD' ? '#fff7ed' : '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: 15, color: '#0f172a' }}>Khoang tiêu chuẩn</strong>
                      <Tag color="default">Đã bao gồm</Tag>
                    </div>
                    <p style={{ fontSize: 12, color: '#64748b', margin: '8px 0 0' }}>
                      Đầy đủ thanh chắn an toàn, thảm cao su chống trượt và hệ thống thông gió đối lưu.
                    </p>
                  </div>
                </div>
              </Card>

              {/* Dinh dưỡng & Chăm sóc */}
              <Card
                title={
                  <Space>
                    <Sparkles size={17} color="#ea580c" />
                    <span>Chế độ dinh dưỡng & cấp nước</span>
                  </Space>
                }
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 16,
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    backgroundColor: dietAddon ? '#fff7ed' : '#ffffff'
                  }}
                >
                  <Checkbox checked={dietAddon} onChange={(e) => setDietAddon(e.target.checked)}>
                    <div>
                      <strong>Cỏ khô Timothy thượng hạng & Nước bù điện giải</strong>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        Bổ sung dinh dưỡng và khoáng chất giữ thể lực ngựa thi đấu đỉnh cao.
                      </div>
                    </div>
                  </Checkbox>
                  <strong style={{ color: '#ea580c', fontSize: 14 }}>+ 1.500.000 đ</strong>
                </div>
              </Card>

              {/* Bảo hiểm vận chuyển */}
              <Card
                title={
                  <Space>
                    <ShieldCheck size={17} color="#ea580c" />
                    <span>Gói bảo hiểm vận chuyển ngựa đua</span>
                  </Space>
                }
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 16,
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    backgroundColor: insuranceAddon ? '#fff7ed' : '#ffffff'
                  }}
                >
                  <Checkbox checked={insuranceAddon} onChange={(e) => setInsuranceAddon(e.target.checked)}>
                    <div>
                      <strong>Bảo hiểm toàn diện (Bảo hiểm rủi ro vận chuyển & thú y khẩn cấp)</strong>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        Bảo đảm trách nhiệm lên đến 1.000.000.000 đ cho mỗi cá thể ngựa đua.
                      </div>
                    </div>
                  </Checkbox>
                  <strong style={{ color: '#ea580c', fontSize: 14 }}>+ 1.576.000 đ</strong>
                </div>
              </Card>
            </div>
          )}

          {/* STEP 4: XÁC NHẬN & GỬI */}
          {step === 3 && (
            <Card title="Kiểm tra thông tin trước khi đặt chuyến">
              <p style={{ marginTop: 0, color: '#64748b', fontSize: 13 }}>
                Vui lòng xem lại thông tin hành trình và bảng giá tạm tính. Sau khi gửi, đơn sẽ được quản lý logistics tiếp nhận.
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '140px 1fr',
                  gap: '14px 20px',
                  backgroundColor: '#f8fafc',
                  padding: 20,
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  fontSize: 14
                }}
              >
                <div style={{ color: '#64748b' }}>Hành trình:</div>
                <div>
                  <strong>{pickupAddress}</strong> → <strong>{deliveryAddress}</strong>
                </div>

                <div style={{ color: '#64748b' }}>Khởi hành:</div>
                <div>
                  <strong>{departureTime}</strong> ngày <strong>{departureDate.split('-').reverse().join('/')}</strong>
                </div>

                <div style={{ color: '#64748b' }}>Ngựa vận chuyển:</div>
                <div>
                  <strong style={{ color: '#ea580c' }}>
                    {selectedHorseObjects.map((h) => h.name).join(', ')}
                  </strong>
                </div>

                <div style={{ color: '#64748b' }}>Khoang xe:</div>
                <div>{stallType === 'VIP' ? 'Khoang mở rộng VIP (+3.000.000 đ)' : 'Khoang tiêu chuẩn'}</div>

                <div style={{ color: '#64748b' }}>Dịch vụ thêm:</div>
                <div>
                  {[
                    dietAddon ? 'Cỏ khô Timothy & điện giải' : null,
                    insuranceAddon ? 'Bảo hiểm toàn diện' : null
                  ]
                    .filter(Boolean)
                    .join(', ') || 'Không'}
                </div>

                <div style={{ color: '#64748b' }}>Lưu ý chăm sóc:</div>
                <div>{specialNote || 'Không có yêu cầu riêng'}</div>
              </div>

              <div
                style={{
                  marginTop: 18,
                  padding: '14px 18px',
                  borderRadius: 8,
                  backgroundColor: '#fff7ed',
                  border: '1px solid #fed7aa',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12
                }}
              >
                <ShieldCheck size={20} color="#ea580c" />
                <div style={{ fontSize: 13, color: '#9a3412' }}>
                  <strong>Quy trình tiếp theo: </strong>
                  Quản lý sẽ tiếp nhận đơn, chuyên viên kiểm dịch đối chiếu hồ sơ, và điều phối xe bố trí phương tiện trước khi gửi báo giá chính thức.
                </div>
              </div>
            </Card>
          )}

          {/* Stepper Navigation Buttons */}
          <div className="workflow-step-actions" style={{ marginTop: 20 }}>
            <Button disabled={step === 0 || submitting} onClick={handlePrevStep} style={{ height: 40, borderRadius: 8 }}>
              Quay lại
            </Button>
            <span style={{ fontWeight: 600, color: '#64748b' }}>Bước {step + 1} / 4</span>
            {step < 3 ? (
              <Button
                type="primary"
                onClick={handleNextStep}
                style={{
                  height: 40,
                  borderRadius: 8,
                  backgroundColor: '#ea580c',
                  borderColor: '#ea580c',
                  fontWeight: 600
                }}
              >
                Tiếp tục <ArrowRight size={15} style={{ marginLeft: 4 }} />
              </Button>
            ) : (
              <Button
                type="primary"
                loading={submitting}
                onClick={handleSubmitOrder}
                style={{
                  height: 42,
                  padding: '0 24px',
                  borderRadius: 8,
                  backgroundColor: '#ea580c',
                  borderColor: '#ea580c',
                  fontWeight: 700,
                  fontSize: 15
                }}
              >
                Xác nhận và gửi đơn
              </Button>
            )}
          </div>
        </Col>

        {/* Right Sticky Summary Box */}
        <Col xs={24} lg={8}>
          <div className="booking-summary">
            <Card
              title={
                <Space>
                  <FileText size={17} color="#ea580c" />
                  <span>Tóm tắt chuyến đi</span>
                </Space>
              }
            >
              <div className="summary-route">
                <div>
                  <span className="route-dot" />
                  <small>Điểm đón</small>
                  <strong>{pickupAddress.split(',')[0]}</strong>
                </div>
                <div>
                  <span className="route-dot route-dot--end" />
                  <small>Điểm trả</small>
                  <strong>{deliveryAddress.split(',')[0]}</strong>
                </div>
              </div>

              <dl className="summary-facts">
                <dt>Ngày đi</dt>
                <dd>{departureTime} · {departureDate.split('-').reverse().join('/')}</dd>
                <dt>Số ngựa</dt>
                <dd>{selectedHorseIds.length} ngựa</dd>
                <dt>Ngựa đã chọn</dt>
                <dd>{selectedHorseObjects.map((h) => h.name).join(', ') || 'Chưa chọn'}</dd>
              </dl>

              <div className="summary-pricing">
                <dl className="summary-facts">
                  <dt>Giá vận chuyển</dt>
                  <dd>{formatVnd(baseRate * selectedHorseIds.length)}</dd>
                  {stallType === 'VIP' && (
                    <>
                      <dt>Khoang VIP</dt>
                      <dd>{formatVnd(stallAddonCost * selectedHorseIds.length)}</dd>
                    </>
                  )}
                  {dietAddon && (
                    <>
                      <dt>Dinh dưỡng</dt>
                      <dd>{formatVnd(dietCost * selectedHorseIds.length)}</dd>
                    </>
                  )}
                  {insuranceAddon && (
                    <>
                      <dt>Bảo hiểm toàn diện</dt>
                      <dd>{formatVnd(insuranceCost * selectedHorseIds.length)}</dd>
                    </>
                  )}
                </dl>

                <div className="summary-total">
                  <span>Tổng cộng tạm tính</span>
                  <strong>{formatVnd(totalAmount)}</strong>
                </div>

                <div className="summary-deposit">
                  <span>Đặt cọc 30% (sau khi duyệt giá)</span>
                  <strong>{formatVnd(depositAmount)}</strong>
                </div>
              </div>
            </Card>

            <div className="booking-help">
              <ShieldCheck size={20} />
              <div>
                <strong>Sau khi gửi yêu cầu</strong>
                <p>
                  Quản lý sẽ tiếp nhận đơn trong vòng 15 phút. Bạn sẽ nhận được thông báo để đặt cọc giữ xe sau khi báo giá hoàn tất.
                </p>
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {/* Center Modal: Đã gửi đơn BK-005 */}
      <Modal
        centered
        open={Boolean(createdOrderModal)}
        footer={null}
        closable={false}
        width={500}
        zIndex={100000}
        className="animate-modal-pop"
      >
        <div style={{ textAlign: 'center', padding: '16px 8px 8px' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: '#ecfdf5',
              border: '2px solid #a7f3d0',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px'
            }}
          >
            <CheckCircle2 size={36} />
          </div>

          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a' }}>
            Đã gửi đơn BK-005
          </h2>

          <p style={{ margin: '10px auto 24px', fontSize: 14, color: '#64748b', lineHeight: 1.6, maxWidth: 380 }}>
            Đơn của bạn đã được chuyển tới Điều hành viên để tiếp nhận và điều phối xe. Bạn có thể theo dõi tiến độ xử lý ngay bây giờ.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            <Button
              size="large"
              onClick={() => navigate('/orders/BK-005')}
              style={{ borderRadius: 8, fontWeight: 600 }}
            >
              Xem chi tiết đơn
            </Button>
            <Button
              type="primary"
              size="large"
              onClick={() => navigate('/orders')}
              style={{
                borderRadius: 8,
                fontWeight: 700,
                backgroundColor: '#ea580c',
                borderColor: '#ea580c'
              }}
            >
              Xem đơn vừa đặt
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
