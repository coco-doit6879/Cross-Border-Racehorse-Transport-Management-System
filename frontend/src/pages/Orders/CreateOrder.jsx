import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Checkbox, Col, Divider, Empty, Form, Input, Radio, Row, Select, Space, Spin, Tag, message } from 'antd';
import { ArrowLeft, CalendarDays, CreditCard, MapPin } from 'lucide-react';
import { useHorseStore } from '../../store/useHorseStore';
import { useOrderStore } from '../../store/useOrderStore';
import { transportScheduleApi } from '../../services/transportScheduleApi';

const dateLabel = (date) => new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
const formatVnd = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value || 0);

export default function CreateOrder() {
  const navigate = useNavigate();
  const { horses, fetchHorses } = useHorseStore();
  const { orders, fetchOrders, createOrder } = useOrderStore();
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [originCountry, setOriginCountry] = useState('VN');
  const [destinationCountry, setDestinationCountry] = useState();
  const [originStopId, setOriginStopId] = useState();
  const [destinationStopId, setDestinationStopId] = useState();
  const [departureId, setDepartureId] = useState();
  const [horseIds, setHorseIds] = useState([]);
  const [addOnIds, setAddOnIds] = useState([]);
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError(''); setDepartureId(undefined);
    try {
      const [response] = await Promise.all([transportScheduleApi.getCatalog(), fetchHorses(), fetchOrders()]);
      setCatalog(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải lịch vận chuyển. Vui lòng thử lại.');
    } finally { setLoading(false); }
  }, [fetchHorses, fetchOrders]);
  useEffect(() => { load(); }, [load]);

  const stops = catalog?.stops || [];
  const activeRules = (catalog?.rules || []).filter((rule) => rule.active);
  const publishedOriginIds = new Set(activeRules.map((rule) => rule.originStopId));
  const origin = stops.find((stop) => stop.id === originStopId);
  const destination = stops.find((stop) => stop.id === destinationStopId);
  const departures = (catalog?.departures || []).filter((item) => item.originStopId === originStopId && item.destinationStopId === destinationStopId);
  const departure = departures.find((item) => item.id === departureId);
  const busyIds = new Set(orders.filter((order) => ['PENDING_APPROVAL', 'APPROVED', 'DOCS_PROCESSING', 'CLEARED_FOR_TRANSPORT', 'IN_TRANSIT', 'DELIVERING'].includes(order.status)).flatMap((order) => (order.horseIds || []).map((h) => String(typeof h === 'object' ? h._id || h.id : h))));
  const eligible = (horse) => Boolean(originStopId) && horse.currentStopId === originStopId && horse.reviewStatus === 'APPROVED' && horse.status !== 'IN_TRANSIT' && !busyIds.has(String(horse.id));
  const ineligibleReason = (horse) => {
    if (!originStopId) return 'Chọn điểm đón trước';
    if (!horse.currentStopId) return 'Chưa khai báo địa điểm hiện tại';
    if (horse.currentStopId !== originStopId) return `Đang ở ${stops.find((stop) => stop.id === horse.currentStopId)?.name || horse.currentStopId}`;
    if (horse.reviewStatus !== 'APPROVED') return 'Chưa được duyệt sức khỏe';
    return 'Đang có đơn vận chuyển';
  };
  const selectedHorses = horses.filter((horse) => horseIds.includes(horse.id));
  const addOns = catalog?.addOns || [];
  const selectedAddOns = addOns.filter((item) => addOnIds.includes(item.id));
  const baseAmountVnd = (departure?.basePriceVnd || 0) * horseIds.length;
  const addOnsAmountVnd = departure && horseIds.length > 0 ? selectedAddOns.reduce((total, item) => total + item.unitPriceVnd * (item.pricingMode === 'PER_HORSE' ? horseIds.length : 1), 0) : 0;
  const totalAmountVnd = baseAmountVnd + addOnsAmountVnd;
  const ready = Boolean(departure?.basePriceVnd && horseIds.length && totalAmountVnd > 0 && selectedHorses.length === horseIds.length && selectedHorses.every(eligible) && !loading && !error);

  const submit = async () => {
    if (!ready) return;
    setSubmitting(true);
    try {
      const order = await createOrder({ horseIds, departureId, scheduleRevision: catalog.revision, addOnIds, specialRequirements: notes });
      message.success(`Đã gửi đơn ${order.bookingCode || ''} theo lịch chuyến đã chọn.`);
      navigate('/orders');
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể tạo đơn vận chuyển.');
      if (err.response?.status === 409) await load();
    } finally { setSubmitting(false); }
  };
  const originCountryOptions = (catalog?.countries || []).filter((country) => stops.some((stop) => stop.countryCode === country.code && publishedOriginIds.has(stop.id))).map((country) => ({ value: country.code, label: country.name }));
  const originStopOptions = stops.filter((stop) => stop.countryCode === originCountry && publishedOriginIds.has(stop.id)).map((stop) => ({ value: stop.id, label: stop.name }));
  const publishedDestinationIds = new Set(activeRules.filter((rule) => rule.originStopId === originStopId).map((rule) => rule.destinationStopId));
  const destinationCountryOptions = (catalog?.countries || []).filter((country) => stops.some((stop) => stop.countryCode === country.code && publishedDestinationIds.has(stop.id))).map((country) => ({ value: country.code, label: country.name }));
  const destinationStopOptions = stops.filter((stop) => stop.countryCode === destinationCountry && publishedDestinationIds.has(stop.id)).map((stop) => ({ value: stop.id, label: stop.name }));

  return <Space direction="vertical" size={20} style={{ width: '100%' }}>
    <Card>
      <Space align="start"><Button aria-label="Quay lại đơn vận chuyển" icon={<ArrowLeft size={16} />} onClick={() => navigate('/orders')} /><div>
        <h1 style={{ margin: 0, fontSize: 24 }}>Đặt chuyến vận chuyển ngựa</h1>
        <p style={{ color: '#64748b', marginBottom: 0 }}>Chọn điểm đón, điểm trả và một chuyến trong lịch khởi hành có sẵn.</p>
      </div></Space>
    </Card>
    {error && <Alert type="error" showIcon message={error} action={<Button onClick={load}>Thử lại</Button>} />}
    <Spin spinning={loading}>
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card title={<Space><MapPin size={18} /> 01 / Điểm đón và điểm trả cố định</Space>}>
            <Form layout="vertical">
              <Row gutter={20}>
                <Col xs={24} sm={12}>
                  <Form.Item label="Quốc gia đón"><Select aria-label="Quốc gia đón" value={originCountry} options={originCountryOptions} onChange={(value) => { setOriginCountry(value); setOriginStopId(undefined); setDestinationCountry(undefined); setDestinationStopId(undefined); setDepartureId(undefined); }} /></Form.Item>
                  <Form.Item label="Điểm đón" required><Select aria-label="Điểm đón" value={originStopId} options={originStopOptions} placeholder="Chọn điểm đón đã công bố" onChange={(value) => { setOriginStopId(value); setHorseIds([]); setAddOnIds([]); setDestinationCountry(undefined); setDestinationStopId(undefined); setDepartureId(undefined); }} /></Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Quốc gia trả"><Select aria-label="Quốc gia trả" value={destinationCountry} options={destinationCountryOptions} disabled={!originStopId} placeholder="Chọn quốc gia có tuyến" onChange={(value) => { setDestinationCountry(value); setDestinationStopId(undefined); setDepartureId(undefined); }} /></Form.Item>
                  <Form.Item label="Điểm trả" required><Select aria-label="Điểm trả" value={destinationStopId} options={destinationStopOptions} disabled={!destinationCountry} placeholder="Chọn điểm trả đã công bố" onChange={(value) => { setDestinationStopId(value); setDepartureId(undefined); }} /></Form.Item>
                </Col>
              </Row>
            </Form>
            <Alert type="info" showIcon message={`Đang hiển thị ${activeRules.length} tuyến một chiều do Điều phối viên Đội xe & Lộ trình công bố.`} description="Khách hàng chỉ có thể chọn điểm đón, điểm trả và lịch chạy đang mở." />
          </Card>
          <Card title={<Space><CalendarDays size={18} /> 02 / Chọn chuyến khởi hành</Space>} style={{ marginTop: 20 }} extra={<Button loading={loading} onClick={load}>Tải lại lịch</Button>}>
            <p style={{ marginTop: 0, color: '#64748b' }}>Lịch mở trong {catalog?.bookingWindowDays || 28} ngày tới. Đóng nhận đơn trước giờ khởi hành {catalog?.minNoticeHours || 24} giờ.</p>
            {!origin || !destination ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chọn điểm đón và điểm trả để xem lịch chuyến." /> : departures.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có chuyến mở đặt cho tuyến này. Hãy chọn tuyến khác hoặc kiểm tra lại sau." /> : <>
              <Tag color="blue">Giờ địa phương tại {origin.name} · UTC{origin.utcOffset}</Tag>
              <Radio.Group value={departureId} onChange={(event) => setDepartureId(event.target.value)} style={{ display: 'block', maxHeight: 340, overflowY: 'auto', marginTop: 16 }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {departures.map((item) => <Radio key={item.id} value={item.id} style={{ width: '100%', padding: '12px 8px', margin: 0, border: `1px solid ${departureId === item.id ? '#0f3e2e' : '#e2e8f0'}`, borderRadius: 8, background: departureId === item.id ? '#f0fdf4' : '#fff' }}>
                    <strong>{item.departureLocalTime}</strong> · {dateLabel(item.departureLocalDate)} <Tag color="green" style={{ marginLeft: 8 }}>{formatVnd(item.basePriceVnd)} / ngựa</Tag>
                  </Radio>)}
                </Space>
              </Radio.Group>
            </>}
          </Card>
          <Card title="03 / Chọn ngựa vận chuyển" style={{ marginTop: 20 }}>
            {!horses.length ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Bạn chưa có hồ sơ ngựa." /> : <Space direction="vertical" size={12} style={{ width: '100%' }}>
              {horses.map((horse) => <div key={horse.id} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, padding: 12, border: '1px solid #e2e8f0', borderRadius: 8 }}>
                <Checkbox checked={horseIds.includes(horse.id)} disabled={!eligible(horse)} onChange={(event) => setHorseIds((ids) => event.target.checked ? [...ids, horse.id] : ids.filter((id) => id !== horse.id))}>
                  <strong>{horse.name}</strong> <span style={{ color: '#64748b' }}>· {horse.microchipId}</span>
                </Checkbox>
                {!eligible(horse) && <Tag color="warning">{ineligibleReason(horse)}</Tag>}
              </div>)}
            </Space>}
            <Form layout="vertical" style={{ marginTop: 20 }}><Form.Item label="Yêu cầu chăm sóc đặc biệt"><Input.TextArea aria-label="Yêu cầu chăm sóc đặc biệt" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} maxLength={2000} placeholder="Ghi chú chăm sóc ngựa trong chuyến đi…" /></Form.Item></Form>
          </Card>
          <Card title={<Space><CreditCard size={18} /> 04 / Dịch vụ cộng thêm</Space>} style={{ marginTop: 20 }}>
            <p style={{ marginTop: 0, color: '#64748b' }}>Giá tuyến đã cố định. Chỉ chọn thêm dịch vụ khi bạn có nhu cầu.</p>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              {addOns.map((item) => {
                const multiplier = item.pricingMode === 'PER_HORSE' ? Math.max(horseIds.length, 1) : 1;
                return <div key={item.id} style={{ padding: 14, border: `1px solid ${addOnIds.includes(item.id) ? '#0f3e2e' : '#e2e8f0'}`, borderRadius: 8, background: addOnIds.includes(item.id) ? '#f0fdf4' : '#fff' }}>
                  <Checkbox checked={addOnIds.includes(item.id)} disabled={!departure || horseIds.length === 0} onChange={(event) => setAddOnIds((ids) => event.target.checked ? [...ids, item.id] : ids.filter((id) => id !== item.id))}>
                    <strong>{item.name}</strong> · {formatVnd(item.unitPriceVnd)} {item.pricingMode === 'PER_HORSE' ? '/ ngựa' : '/ đơn'}
                  </Checkbox>
                  <div style={{ color: '#64748b', fontSize: 13, margin: '6px 0 0 24px' }}>{item.description}{horseIds.length > 1 && item.pricingMode === 'PER_HORSE' ? ` · Thành tiền ${formatVnd(item.unitPriceVnd * multiplier)}` : ''}</div>
                </div>;
              })}
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Chuyến vận chuyển của bạn" style={{ position: 'sticky', top: 90 }}>
            <Space direction="vertical" size={18} style={{ width: '100%' }}>
              <div><small style={{ color: '#64748b' }}>ĐIỂM ĐÓN</small><div><strong>{origin?.name || 'Chưa chọn'}</strong></div></div>
              <div><small style={{ color: '#64748b' }}>ĐIỂM TRẢ</small><div><strong>{destination?.name || 'Chưa chọn'}</strong></div></div>
              <div style={{ padding: 14, background: '#f0fdf4', borderRadius: 8 }}><small>KHỞI HÀNH THEO LỊCH</small><div style={{ fontWeight: 700, marginTop: 6 }}>{departure ? `${departure.departureLocalTime} · ${dateLabel(departure.departureLocalDate)}` : 'Chưa chọn chuyến'}</div>{departure && <small>Giờ tại {origin.name} (UTC{origin.utcOffset})</small>}</div>
              <div><strong>{horseIds.length} con ngựa</strong><div>{selectedHorses.map((horse) => horse.name).join(', ') || 'Chưa chọn ngựa'}</div></div>
              <Divider style={{ margin: 0 }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Giá tuyến ({horseIds.length} ngựa){departure ? <small style={{ display: 'block', color: '#64748b' }}>{formatVnd(departure.basePriceVnd)} / ngựa</small> : null}</span><strong>{departure ? formatVnd(baseAmountVnd) : 'Chưa chọn tuyến'}</strong></div>
              {departure && horseIds.length > 0 && selectedAddOns.map((item) => <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: '#475569' }}><span>{item.name}</span><span>{formatVnd(item.unitPriceVnd * (item.pricingMode === 'PER_HORSE' ? horseIds.length : 1))}</span></div>)}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 14, background: '#f0fdf4', borderRadius: 8, fontSize: 17 }}><strong>Tổng cộng</strong><strong style={{ color: '#0f3e2e' }}>{formatVnd(totalAmountVnd)}</strong></div>
              <p style={{ color: '#64748b', margin: 0 }}>Đơn được gửi để phê duyệt. Bạn thanh toán theo tổng tiền đã chốt sau khi đơn được duyệt.</p>
              <Button type="primary" block size="large" loading={submitting} disabled={!ready} onClick={submit}>Gửi yêu cầu · {formatVnd(totalAmountVnd)}</Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </Spin>
  </Space>;
}
