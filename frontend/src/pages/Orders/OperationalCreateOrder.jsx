import { isHorseAtLeastOneYearOld } from '../../utils/customerBooking';
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Checkbox,
  Col,
  Divider,
  Empty,
  Form,
  Input,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  message
} from 'antd';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Globe,
  Info,
  MapPin,
  PackageCheck,
  RotateCcw,
  Shield,
  Sparkles,
  Truck
} from 'lucide-react';
import { useHorseStore } from '../../store/useHorseStore';
import { useOrderStore } from '../../store/useOrderStore';
import { transportScheduleApi } from '../../services/transportScheduleApi';
import { useAuthStore } from '../../store/useAuthStore';
import { hasPermission } from '../../utils/permissions';
import api from '../../services/apiClient';
import './create-order.css';

const dateLabel = (date) =>
  new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(`${date}T00:00:00Z`));

const formatVnd = (value) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(value || 0);

export default function CreateOrder() {
  const navigate = useNavigate();
  const { horses: ownedHorses, fetchHorses } = useHorseStore();
  const user = useAuthStore((s) => s.user);
  const assisting = hasPermission(user, 'booking:approve');

  const [assistance, setAssistance] = useState({ customers: [], horses: [] });
  const [customerId, setCustomerId] = useState();
  const horses = assisting
    ? assistance.horses.filter((h) => String(h.ownerId) === customerId).map((h) => ({ ...h, id: h._id }))
    : ownedHorses;

  const { orders, fetchOrders, createOrder } = useOrderStore();
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form selections
  const [tripType, setTripType] = useState('DOMESTIC'); // 'DOMESTIC' | 'INTERNATIONAL'
  const [originCountry, setOriginCountry] = useState('VN');
  const [destinationCountry, setDestinationCountry] = useState();
  const [originStopId, setOriginStopId] = useState();
  const [destinationStopId, setDestinationStopId] = useState();
  const [departureId, setDepartureId] = useState();
  const [horseIds, setHorseIds] = useState([]);
  const [addOnIds, setAddOnIds] = useState([]);
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setDepartureId(undefined);
    try {
      const [response, support] = await Promise.all([
        transportScheduleApi.getCatalog(),
        assisting ? api.get('/orders/assistance/customers') : fetchHorses(),
        fetchOrders()
      ]);
      if (assisting) setAssistance(support.data.data);
      setCatalog(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải lịch vận chuyển. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [fetchHorses, fetchOrders, assisting]);

  useEffect(() => {
    load();
  }, [load]);

  const stops = catalog?.stops || [];
  const activeRules = (catalog?.rules || []).filter((rule) => rule.active);
  const publishedOriginIds = new Set(activeRules.map((rule) => rule.originStopId));
  const origin = stops.find((stop) => stop.id === originStopId);
  const destination = stops.find((stop) => stop.id === destinationStopId);

  const departures = (catalog?.departures || []).filter(
    (item) => item.originStopId === originStopId && item.destinationStopId === destinationStopId
  );
  const departure = departures.find((item) => item.id === departureId);

  // Identify busy horses
  const busyIds = new Set(
    orders
      .filter((order) => {
        const depositExpired =
          order.depositRequired &&
          order.depositStatus === 'UNPAID' &&
          order.depositDueAt &&
          new Date(order.depositDueAt) <= new Date();
        return (
          !depositExpired &&
          [
            'PENDING_APPROVAL',
            'APPROVED',
            'DOCS_PROCESSING',
            'CLEARED_FOR_TRANSPORT',
            'IN_TRANSIT',
            'DELIVERING'
          ].includes(order.status)
        );
      })
      .flatMap((order) =>
        (order.horseIds || []).map((h) => String(typeof h === 'object' ? h._id || h.id : h))
      )
  );

  const eligible = (horse) =>
    Boolean(originStopId) &&
    isHorseAtLeastOneYearOld(horse.dateOfBirth) &&
    horse.currentStopId === originStopId &&
    horse.reviewStatus === 'APPROVED' &&
    horse.status !== 'IN_TRANSIT' &&
    !busyIds.has(String(horse.id));

  const ineligibleReason = (horse) => {
    if (!originStopId) return 'Chọn điểm đón trước';
    if (!isHorseAtLeastOneYearOld(horse.dateOfBirth)) return 'Ngựa chưa đủ 1 năm tuổi hoặc thiếu ngày sinh';
    if (!horse.currentStopId) return 'Chưa khai báo địa điểm hiện tại';
    if (horse.currentStopId !== originStopId)
      return `Đang ở ${stops.find((stop) => stop.id === horse.currentStopId)?.name || horse.currentStopId}`;
    if (horse.reviewStatus !== 'APPROVED') return 'Chưa được duyệt sức khỏe';
    return 'Đang có đơn vận chuyển';
  };

  const selectedHorses = horses.filter((horse) => horseIds.includes(horse.id));
  const addOns = catalog?.addOns || [];
  const selectedAddOns = addOns.filter((item) => addOnIds.includes(item.id));

  // Calculations
  const baseAmountVnd = (departure?.basePriceVnd || 0) * horseIds.length;
  const addOnsAmountVnd =
    departure && horseIds.length > 0
      ? selectedAddOns.reduce(
          (total, item) =>
            total + item.unitPriceVnd * (item.pricingMode === 'PER_HORSE' ? horseIds.length : 1),
          0
        )
      : 0;
  const totalAmountVnd = baseAmountVnd + addOnsAmountVnd;
  const depositPercent = catalog?.depositPolicy?.percent || 20;
  const depositAmountVnd = Math.min(
    totalAmountVnd,
    Math.ceil(((totalAmountVnd * depositPercent) / 100) / 1000) * 1000
  );

  const ready = Boolean(
    departure?.basePriceVnd &&
      horseIds.length &&
      totalAmountVnd > 0 &&
      selectedHorses.length === horseIds.length &&
      selectedHorses.every(eligible) &&
      !loading &&
      !error
  );

  const submit = async () => {
    if (!ready) return;
    setSubmitting(true);
    try {
      const order = await createOrder({
        horseIds,
        departureId,
        scheduleRevision: catalog.revision,
        addOnIds,
        specialRequirements: notes,
        ...(assisting ? { customerId } : {})
      });
      message.success(
        assisting
          ? 'Đã tạo đơn hỗ trợ. Khách hàng cần kiểm tra và xác nhận thông tin.'
          : `Đã tạo đơn ${order.bookingCode || ''}. Vui lòng đặt cọc để gửi duyệt.`
      );
      navigate(`/orders/${order.id || order._id}`);
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể tạo đơn vận chuyển.');
      if (err.response?.status === 409) await load();
    } finally {
      setSubmitting(false);
    }
  };

  // Options calculations
  const originCountryOptions = (catalog?.countries || [])
    .filter((country) =>
      stops.some((stop) => stop.countryCode === country.code && publishedOriginIds.has(stop.id))
    )
    .map((country) => ({ value: country.code, label: country.name }));

  const originStopOptions = stops
    .filter((stop) => stop.countryCode === originCountry && publishedOriginIds.has(stop.id))
    .map((stop) => ({ value: stop.id, label: stop.name }));

  const publishedDestinationIds = new Set(
    activeRules
      .filter((rule) => rule.originStopId === originStopId)
      .map((rule) => rule.destinationStopId)
  );

  const destinationCountryOptions = (catalog?.countries || [])
    .filter((country) => {
      const hasRoute = stops.some(
        (stop) => stop.countryCode === country.code && publishedDestinationIds.has(stop.id)
      );
      if (!hasRoute) return false;
      if (tripType === 'DOMESTIC') return country.code === originCountry;
      return country.code !== originCountry;
    })
    .map((country) => ({ value: country.code, label: country.name }));

  const destinationStopOptions = stops
    .filter(
      (stop) => stop.countryCode === destinationCountry && publishedDestinationIds.has(stop.id)
    )
    .map((stop) => ({ value: stop.id, label: stop.name }));

  // Auto-update trip type if countries change
  const handleTypeToggle = (type) => {
    setTripType(type);
    setDestinationCountry(undefined);
    setDestinationStopId(undefined);
    setDepartureId(undefined);
  };

  return (
    <div className="create-order-page">
      {/* Breadcrumb with animation */}
      <nav className="cbrt-breadcrumb " aria-label="Đường dẫn">
        <Link to="/dashboard">Trang chủ</Link>
        <ChevronRight size={14} />
        <Link to="/orders">Đơn vận chuyển</Link>
        <ChevronRight size={14} />
        <span className="cbrt-breadcrumb-active">Đặt chuyến mới</span>
      </nav>

      {/* Header Banner */}
      <header className="cbrt-page-header cbrt-anim-header">
        <button
          type="button"
          className="cbrt-back-btn"
          onClick={() => navigate('/orders')}
          aria-label="Quay lại danh sách đơn"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="cbrt-header-title">Đặt chuyến vận chuyển ngựa</h1>
          <p className="cbrt-header-subtitle">
            Thiết lập tuyến đường và ngày khởi hành theo lịch trình xe chuyên dụng có sẵn.
          </p>
        </div>
      </header>

      {/* Stepper with Sequential Stagger */}
      <div className="cbrt-stepper ">
        <div className={`cbrt-step-item ${originStopId && destinationStopId ? 'cbrt-step-item--active' : 'cbrt-step-item--active'}`}>
          <div className="cbrt-step-circle">1</div>
          <span>Chuyến đi</span>
        </div>
        <div className="cbrt-step-divider" />
        <div className={`cbrt-step-item ${departureId ? 'cbrt-step-item--active' : ''}`}>
          <div className="cbrt-step-circle">2</div>
          <span>Lịch trình</span>
        </div>
        <div className="cbrt-step-divider" />
        <div className={`cbrt-step-item ${horseIds.length > 0 ? 'cbrt-step-item--active' : ''}`}>
          <div className="cbrt-step-circle">3</div>
          <span>Chọn ngựa</span>
        </div>
        <div className="cbrt-step-divider" />
        <div className={`cbrt-step-item ${ready ? 'cbrt-step-item--active' : ''}`}>
          <div className="cbrt-step-circle">4</div>
          <span>Xác nhận & Cọc</span>
        </div>
      </div>

      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          action={<Button onClick={load}>Thử lại</Button>}
          style={{ marginBottom: 20, borderRadius: 10 }}
        />
      )}

      {assisting && (
        <div className="cbrt-section-card " style={{ borderLeft: '4px solid #243c32' }}>
          <div className="cbrt-card-header">
            <h2 className="cbrt-card-title">
              <Sparkles size={18} color="#243c32" /> Nhập đơn hỗ trợ khách hàng
            </h2>
          </div>
          <p style={{ color: '#64748b', fontSize: 14, marginBottom: 12 }}>
            Chọn khách hàng đã có tài khoản. Khách sẽ xem lại tuyến, ngựa và thanh toán đặt cọc trước khi đơn được tiếp nhận.
          </p>
          <Select
            showSearch
            optionFilterProp="label"
            style={{ width: '100%' }}
            placeholder="Tìm theo tên, email hoặc số điện thoại khách hàng"
            value={customerId}
            onChange={(value) => {
              setCustomerId(value);
              setHorseIds([]);
            }}
            options={assistance.customers.map((c) => ({
              value: c._id,
              label: `${c.fullName} · ${c.email} · ${c.phone}`
            }))}
          />
        </div>
      )}

      <Spin spinning={loading} tip="Đang tải mạng lưới chuyến xe CBRT...">
        <Row gutter={[24, 24]}>
          {/* LEFT COLUMN: 4 Step Cards */}
          <Col xs={24} lg={16}>
            {/* CARD 01: Tuyến đường & Điểm đón / Điểm đến */}
            <section className="cbrt-section-card ">
              <div className="cbrt-card-header">
                <h2 className="cbrt-card-title">
                  <span className="cbrt-num-badge">01</span>
                  <MapPin size={18} color="#243c32" />
                  Tuyến đường & Điểm đón / Điểm đến
                </h2>
              </div>

              {/* Trip type selector matching blueprint (Trong nước vs Quốc tế) */}
              <div className="cbrt-type-toggle-container">
                <button
                  type="button"
                  className={`cbrt-type-toggle-btn ${tripType === 'DOMESTIC' ? 'cbrt-type-toggle-btn--active' : ''}`}
                  onClick={() => handleTypeToggle('DOMESTIC')}
                >
                  <div className="type-btn-icon">
                    <Truck size={20} />
                  </div>
                  <div>
                    <div className="type-btn-title">Trong nước</div>
                    <div className="type-btn-desc">Việt Nam ➔ Việt Nam</div>
                  </div>
                </button>

                <button
                  type="button"
                  className={`cbrt-type-toggle-btn ${tripType === 'INTERNATIONAL' ? 'cbrt-type-toggle-btn--active' : ''}`}
                  onClick={() => handleTypeToggle('INTERNATIONAL')}
                >
                  <div className="type-btn-icon">
                    <Globe size={20} />
                  </div>
                  <div>
                    <div className="type-btn-title">Quốc tế</div>
                    <div className="type-btn-desc">Việt Nam ➔ Campuchia / Thái Lan</div>
                  </div>
                </button>
              </div>

              <Form layout="vertical">
                <Row gutter={18}>
                  {/* Origin */}
                  <Col xs={24} sm={12}>
                    <Form.Item label={<strong style={{ fontSize: 14 }}>Quốc gia đón</strong>}>
                      <Select
                        aria-label="Quốc gia đón"
                        value={originCountry}
                        options={originCountryOptions}
                        size="large"
                        onChange={(value) => {
                          setOriginCountry(value);
                          setOriginStopId(undefined);
                          setDestinationCountry(undefined);
                          setDestinationStopId(undefined);
                          setDepartureId(undefined);
                        }}
                      />
                    </Form.Item>

                    <Form.Item
                      label={<strong style={{ fontSize: 14, color: '#0f172a' }}>Điểm đón *</strong>}
                      required
                    >
                      <Select
                        aria-label="Điểm đón"
                        value={originStopId}
                        options={originStopOptions}
                        placeholder="Chọn điểm đón đã công bố"
                        size="large"
                        onChange={(value) => {
                          setOriginStopId(value);
                          setHorseIds([]);
                          setAddOnIds([]);
                          setDestinationCountry(undefined);
                          setDestinationStopId(undefined);
                          setDepartureId(undefined);
                        }}
                      />
                    </Form.Item>
                  </Col>

                  {/* Destination */}
                  <Col xs={24} sm={12}>
                    <Form.Item label={<strong style={{ fontSize: 14 }}>Quốc gia trả</strong>}>
                      <Select
                        aria-label="Quốc gia trả"
                        value={destinationCountry}
                        options={destinationCountryOptions}
                        disabled={!originStopId}
                        placeholder="Chọn quốc gia có tuyến"
                        size="large"
                        onChange={(value) => {
                          setDestinationCountry(value);
                          setDestinationStopId(undefined);
                          setDepartureId(undefined);
                        }}
                      />
                    </Form.Item>

                    <Form.Item
                      label={<strong style={{ fontSize: 14, color: '#0f172a' }}>Điểm trả *</strong>}
                      required
                    >
                      <Select
                        aria-label="Điểm trả"
                        value={destinationStopId}
                        options={destinationStopOptions}
                        disabled={!destinationCountry}
                        placeholder="Chọn điểm trả đã công bố"
                        size="large"
                        onChange={(value) => {
                          setDestinationStopId(value);
                          setDepartureId(undefined);
                        }}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Form>

              {/* Informative Route Info Banner */}
              <div className="cbrt-info-banner">
                <Info size={18} className="cbrt-info-banner-icon" />
                <div className="cbrt-info-banner-content">
                  <strong>
                    {origin && destination
                      ? `Tuyến vận chuyển đường bộ: ${origin.name} → ${destination.name}`
                      : 'Tuyến vận chuyển theo lịch đã công bố'}
                  </strong>
                  <br />
                  Điểm đón, điểm giao, ngày đi và chi phí được lấy từ lịch vận chuyển đang mở. Phương tiện và lộ trình được điều phối xác nhận sau khi đơn đã thanh toán đủ.
                </div>
              </div>
            </section>

            {/* CARD 02: Lịch khởi hành & Lộ trình */}
            <section className="cbrt-section-card ">
              <div className="cbrt-card-header">
                <h2 className="cbrt-card-title">
                  <span className="cbrt-num-badge">02</span>
                  <CalendarDays size={18} color="#243c32" />
                  Lịch khởi hành & Lộ trình
                </h2>
                <Button
                  icon={<RotateCcw size={14} />}
                  loading={loading}
                  onClick={load}
                  size="small"
                  style={{ borderRadius: 6, fontSize: 13 }}
                >
                  Tải lại lịch
                </Button>
              </div>

              <p style={{ marginTop: 0, color: '#64748b', fontSize: 14 }}>
                Chọn khung giờ và ngày khởi hành (tối thiểu trước {catalog?.minNoticeHours || 24}h để làm thủ tục hải quan và kiểm dịch).
              </p>

              {!origin || !destination ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Chọn điểm đón và điểm trả ở bước 01 để xem lịch chuyến có sẵn."
                />
              ) : departures.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Chưa có chuyến mở đặt cho tuyến này. Hãy chọn tuyến khác hoặc kiểm tra lại sau."
                />
              ) : (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <Tag color="orange" style={{ borderRadius: 4, fontWeight: 600 }}>
                      Giờ địa phương tại {origin.name} · UTC{origin.utcOffset}
                    </Tag>
                  </div>

                  <div className="departure-card-list">
                    {departures.map((item) => {
                      const isSelected = departureId === item.id;
                      return (
                        <div
                          key={item.id}
                          className={`departure-card-item ${isSelected ? 'departure-card-item--selected' : ''}`}
                          onClick={() => setDepartureId(item.id)}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="departure-card-left">
                            <div className="departure-radio-indicator">
                              {isSelected && <div className="departure-radio-dot" />}
                            </div>
                            <div className="departure-time-date">
                              <strong>{item.departureLocalTime}</strong>
                              <span>· {dateLabel(item.departureLocalDate)}</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Tag color={isSelected ? 'orange' : 'default'} style={{ borderRadius: 4, margin: 0 }}>
                              Xe chuyên dụng
                            </Tag>
                            <Tag color="green" style={{ borderRadius: 4, margin: 0, fontWeight: 700 }}>
                              {formatVnd(item.basePriceVnd)} / ngựa
                            </Tag>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </section>

            {/* CARD 03: Chọn ngựa vận chuyển */}
            <section className="cbrt-section-card ">
              <div className="cbrt-card-header">
                <h2 className="cbrt-card-title">
                  <span className="cbrt-num-badge">03</span>
                  <PackageCheck size={18} color="#243c32" />
                  Chọn ngựa vận chuyển
                </h2>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>
                  {horseIds.length}/{horses.length} con ngựa đã chọn
                </span>
              </div>

              <p style={{ marginTop: 0, color: '#64748b', fontSize: 14 }}>
                Chỉ những ngựa đã hoàn tất hồ sơ kiểm dịch và đang ở cùng điểm đón mới đủ điều kiện xuất phát.
              </p>

              {!horses.length ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <span>
                      Bạn chưa có hồ sơ ngựa nào.{' '}
                      <Link to="/horses" style={{ color: '#243c32', fontWeight: 600 }}>
                        Đăng ký hồ sơ ngựa tại đây
                      </Link>
                    </span>
                  }
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {horses.map((horse) => {
                    const isEligible = eligible(horse);
                    const isSelected = horseIds.includes(horse.id);

                    return (
                      <div
                        key={horse.id}
                        className={`horse-item-card ${isSelected ? 'horse-item-card--selected' : ''} ${!isEligible ? 'horse-item-card--disabled' : ''}`}
                        onClick={() => {
                          if (!isEligible) return;
                          setHorseIds((ids) =>
                            isSelected ? ids.filter((id) => id !== horse.id) : [...ids, horse.id]
                          );
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <Checkbox
                            checked={isSelected}
                            disabled={!isEligible}
                            onChange={(e) => {
                              e.stopPropagation();
                              setHorseIds((ids) =>
                                e.target.checked
                                  ? [...ids, horse.id]
                                  : ids.filter((id) => id !== horse.id)
                              );
                            }}
                          />
                          <div>
                            <strong style={{ fontSize: 16, color: '#0f172a' }}>{horse.name}</strong>
                            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                              Microchip: <strong>{horse.microchipId || 'Chưa gắn chip'}</strong>
                              {horse.breed ? ` · Giống: ${horse.breed}` : ''}
                            </div>
                          </div>
                        </div>

                        <div>
                          {isEligible ? (
                            <Tag color="success" style={{ borderRadius: 6, fontWeight: 600, margin: 0 }}>
                              <CheckCircle2 size={12} style={{ display: 'inline', marginRight: 4 }} />
                              Đã kiểm dịch · Sẵn sàng
                            </Tag>
                          ) : (
                            <Tag color="warning" style={{ borderRadius: 6, margin: 0 }}>
                              {ineligibleReason(horse)}
                            </Tag>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Special care notes */}
              <Form layout="vertical" style={{ marginTop: 20 }}>
                <Form.Item label={<strong style={{ fontSize: 14 }}>Yêu cầu chăm sóc đặc biệt</strong>}>
                  <Input.TextArea
                    aria-label="Yêu cầu chăm sóc đặc biệt"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={3}
                    maxLength={2000}
                    placeholder="Ghi chú về chế độ ăn, thói quen sinh hoạt, nhu cầu theo dõi riêng của ngựa trong suốt hành trình…"
                    style={{ borderRadius: 8 }}
                  />
                </Form.Item>
              </Form>
            </section>

            {/* CARD 04: Dịch vụ cộng thêm */}
            <section className="cbrt-section-card ">
              <div className="cbrt-card-header">
                <h2 className="cbrt-card-title">
                  <span className="cbrt-num-badge">04</span>
                  <CreditCard size={18} color="#243c32" />
                  Dịch vụ cộng thêm
                </h2>
              </div>

              <p style={{ marginTop: 0, color: '#64748b', fontSize: 14 }}>
                Giá cước đã bao gồm chăm sóc cơ bản. Bạn có thể chọn thêm các gói phục vụ cao cấp:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {addOns.map((item) => {
                  const isSelected = addOnIds.includes(item.id);
                  const disabled = !departure || horseIds.length === 0;
                  const multiplier = item.pricingMode === 'PER_HORSE' ? Math.max(horseIds.length, 1) : 1;

                  return (
                    <div
                      key={item.id}
                      className={`addon-item-card ${isSelected ? 'addon-item-card--selected' : ''} ${disabled ? 'addon-item-card--disabled' : ''}`}
                      onClick={() => {
                        if (disabled) return;
                        setAddOnIds((ids) =>
                          isSelected ? ids.filter((id) => id !== item.id) : [...ids, item.id]
                        );
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Checkbox
                            checked={isSelected}
                            disabled={disabled}
                            onChange={(e) => {
                              e.stopPropagation();
                              setAddOnIds((ids) =>
                                e.target.checked
                                  ? [...ids, item.id]
                                  : ids.filter((id) => id !== item.id)
                              );
                            }}
                          />
                          <strong style={{ fontSize: 15, color: '#0f172a' }}>{item.name}</strong>
                        </div>
                        <Tag color="blue" style={{ borderRadius: 6, fontWeight: 600, margin: 0 }}>
                          {formatVnd(item.unitPriceVnd)} {item.pricingMode === 'PER_HORSE' ? '/ ngựa' : '/ đơn'}
                        </Tag>
                      </div>

                      <div style={{ color: '#64748b', fontSize: 14, margin: '8px 0 0 28px' }}>
                        {item.description}
                        {horseIds.length > 1 && item.pricingMode === 'PER_HORSE' && isSelected ? (
                          <span style={{ color: '#243c32', fontWeight: 600 }}>
                            {' '}· Thành tiền ({horseIds.length} ngựa): {formatVnd(item.unitPriceVnd * multiplier)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </Col>

          {/* RIGHT COLUMN: Sticky Summary Sidebar with Smooth Animation */}
          <Col xs={24} lg={8}>
            <aside className="cbrt-summary-card ">
              <div className="cbrt-summary-header">
                <Truck size={18} color="#243c32" />
                <span>Chuyến vận chuyển của bạn</span>
              </div>

              {/* Route Summary */}
              <div className="summary-route-row">
                <div className="summary-field-label">Điểm đón</div>
                <div className="summary-field-value">{origin?.name || 'Chưa chọn điểm đón'}</div>
              </div>

              <div className="summary-route-row">
                <div className="summary-field-label">Điểm trả</div>
                <div className="summary-field-value">{destination?.name || 'Chưa chọn điểm trả'}</div>
              </div>

              {/* Schedule Box */}
              <div className={`summary-schedule-box ${!departure ? 'summary-schedule-box--empty' : ''}`}>
                <div className="summary-field-label" style={{ color: departure ? '#15803d' : '#64748b' }}>
                  Khởi hành theo lịch
                </div>
                <div style={{ fontWeight: 700, marginTop: 4, fontSize: 15, color: departure ? '#166534' : '#64748b' }}>
                  {departure
                    ? `${departure.departureLocalTime} · ${dateLabel(departure.departureLocalDate)}`
                    : 'Chưa chọn chuyến khởi hành'}
                </div>
                {departure && origin && (
                  <div style={{ fontSize: 12, color: '#15803d', marginTop: 2 }}>
                    Giờ tại {origin.name} (UTC{origin.utcOffset})
                  </div>
                )}
              </div>

              {/* Selected Horses */}
              <div style={{ margin: '14px 0' }}>
                <div className="summary-field-label">Chiến mã vận chuyển</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                  {horseIds.length > 0 ? (
                    <span>
                      {horseIds.length} con ngựa:{' '}
                      <span style={{ fontWeight: 500, color: '#475569' }}>
                        {selectedHorses.map((h) => h.name).join(', ')}
                      </span>
                    </span>
                  ) : (
                    <span style={{ color: '#94a3b8', fontWeight: 500 }}>Chưa chọn ngựa nào</span>
                  )}
                </div>
              </div>

              <Divider style={{ margin: '14px 0' }} />

              {/* Price Breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>
                    Giá tuyến ({horseIds.length} ngựa):
                    {departure && (
                      <small style={{ display: 'block', color: '#94a3b8' }}>
                        {formatVnd(departure.basePriceVnd)} / con
                      </small>
                    )}
                  </span>
                  <strong>{departure ? formatVnd(baseAmountVnd) : '0 ₫'}</strong>
                </div>

                {departure && horseIds.length > 0 && selectedAddOns.map((item) => (
                  <div
                    key={item.id}
                    style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', fontSize: 13 }}
                  >
                    <span>+ {item.name}</span>
                    <span>{formatVnd(item.unitPriceVnd * (item.pricingMode === 'PER_HORSE' ? horseIds.length : 1))}</span>
                  </div>
                ))}
              </div>

              {/* Total Box */}
              <div className="summary-total-box">
                <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Tổng cộng</span>
                <strong style={{ fontSize: 19, color: '#0f172a' }}>{formatVnd(totalAmountVnd)}</strong>
              </div>

              {/* Deposit Box */}
              <div className="summary-deposit-box">
                <div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#c2410c' }}>
                    Đặt cọc {depositPercent}%
                  </span>
                  <div style={{ fontSize: 12, color: '#243c32' }}>Thanh toán giữ chỗ</div>
                </div>
                <strong style={{ fontSize: 19, color: '#c2410c' }}>{formatVnd(depositAmountVnd)}</strong>
              </div>

              {/* Policy note */}
              <p style={{ color: '#64748b', fontSize: 13, margin: '14px 0 0', lineHeight: 1.5 }}>
                Sau khi tạo đơn, bạn có <strong>{catalog?.depositPolicy?.windowMinutes || 30} phút</strong> để đặt cọc. Đơn chỉ được chuyển trạng thái thẩm định khi đã hoàn tất đặt cọc.
              </p>

              {/* Submit CTA */}
              <Button
                type="primary"
                className="cbrt-submit-btn"
                loading={submitting}
                disabled={!ready}
                onClick={submit}
              >
                {ready
                  ? `Tạo đơn và đặt cọc · ${formatVnd(depositAmountVnd)}`
                  : 'Hoàn tất các bước để tạo đơn'}
              </Button>
            </aside>
          </Col>
        </Row>
      </Spin>
    </div>
  );
}
