import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Button, Empty, Modal, Spin, message } from 'antd';
import { ArrowLeft, ArrowRight, ArrowRightLeft, CalendarDays, Check, CheckCircle2, ClipboardList, Globe2, Home, MapPin, Route, ShieldCheck, Truck, UserRound } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useHorseStore } from '../../store/useHorseStore';
import { useOrderStore } from '../../store/useOrderStore';
import { transportScheduleApi } from '../../services/transportScheduleApi';
import { BOOKING_STEPS, bookingRoutes, bookingTotal, emptyContact, horseBookingIssue } from '../../utils/customerBooking';
import './customer-orders.css';
import './customer-booking.css';

const money = value => `${new Intl.NumberFormat('vi-VN').format(value)} ₫`;
const dateText = value => value ? value.split('-').reverse().join('/') : '—';
const flag = code => ({VN:'🇻🇳',KH:'🇰🇭',TH:'🇹🇭',SG:'🇸🇬',LA:'🇱🇦'})[code] || '🌐';
function CountryFlag({ code }) {
  return ['VN','KH','LA'].includes(code)
    ? <img className="booking-country-flag" src={`/images/landing/flag-${code.toLowerCase()}.png`} alt="" />
    : <span aria-hidden="true">{flag(code)}</span>;
}
function Panel({ icon: Icon, title, aside, children, className = '' }) {
  return <section className={`booking-panel ${className}`}><div className="booking-panel-heading"><h2><Icon size={18} />{title}</h2>{aside}</div>{children}</section>;
}
function Field({ label, required = true, className = '', children }) {
  return <label className={`booking-field ${className}`}><span>{label}{required && <b> *</b>}</span>{children}</label>;
}
function ContactPanel({ side, contact, setContact, countryName, stops, stopId, onStopChange, user }) {
  const sender = side === 'sender';
  const title = sender ? 'Người gửi & Điểm đón ngựa' : 'Người nhận & Điểm giao ngựa';
  const update = (key, value) => setContact(current => ({...current, [key]: value}));
  return <Panel icon={sender ? Home : MapPin} title={<>{title} <small>({countryName})</small></>} aside={sender && <button className="booking-self" type="button" onClick={() => setContact(current => ({...current,fullName:user?.fullName || '',phone:user?.phone || ''}))}><UserRound size={13} />Tôi là người gửi</button>}>
    <div className="booking-fields-grid">
      <Field label={sender ? 'Họ tên người gửi / Tên đơn vị' : 'Họ tên người nhận / Tên trại đích'}><input aria-label={sender ? 'Họ tên người gửi' : 'Họ tên người nhận'} value={contact.fullName} onChange={event => update('fullName',event.target.value)} required maxLength={120} placeholder={sender ? 'Họ tên hoặc tên đơn vị gửi ngựa' : 'Ví dụ: Trần Văn B hoặc CLB Cưỡi ngựa…'} autoComplete={sender ? 'name' : 'off'} /></Field>
      <Field label={sender ? 'Số điện thoại người gửi' : 'Số điện thoại người nhận'}><input aria-label={sender ? 'Số điện thoại người gửi' : 'Số điện thoại người nhận'} type="tel" value={contact.phone} onChange={event => update('phone',event.target.value)} required minLength={6} maxLength={30} pattern="\+?[0-9 \(\)\-]{6,30}" placeholder="Ví dụ: 0901 234 567" /></Field>
      <Field label={<>Tỉnh / Thành phố <small>({countryName})</small></>}><select aria-label={sender ? 'Tỉnh thành điểm đón' : 'Tỉnh thành điểm giao'} required value={stopId} onChange={event => onStopChange(event.target.value)} disabled={!stops.length}><option value="">-- Chọn Tỉnh / Thành phố --</option>{stops.map(stop => <option key={stop.id} value={stop.id}>{stop.name}</option>)}</select></Field>
      <Field label="Xã / Phường / Khu vực"><input aria-label={sender ? 'Khu vực điểm đón' : 'Khu vực điểm giao'} required maxLength={100} value={contact.area} onChange={event => update('area',event.target.value)} placeholder={stopId ? 'Nhập xã, phường hoặc khu vực' : '-- Vui lòng chọn Tỉnh/Thành trước --'} disabled={!stopId} /></Field>
      <Field label="Tên trang trại / Địa chỉ cụ thể" className="booking-field-full"><input aria-label={sender ? 'Địa chỉ cụ thể điểm đón' : 'Địa chỉ cụ thể điểm giao'} required maxLength={300} value={contact.address} onChange={event => update('address',event.target.value)} placeholder="Số nhà, tên trang trại, thôn/ấp, tên đường đón/trả ngựa…" /></Field>
      <Field label="CCCD / MST / Hộ chiếu" className="booking-identity"><input aria-label={sender ? 'Giấy tờ người gửi' : 'Giấy tờ người nhận'} required maxLength={50} value={contact.identityNumber} onChange={event => update('identityNumber',event.target.value)} placeholder={`Số CCCD / MST / Hộ chiếu người ${sender ? 'gửi' : 'nhận'}`} autoComplete="off" /></Field>
    </div>
    <p className="booking-field-help">Tỉnh/thành được chọn theo các điểm phục vụ đang có tuyến trong mạng lưới.</p>
  </Panel>;
}

export default function CustomerCreateOrder() {
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  const {horses, fetchHorses} = useHorseStore();
  const {orders, fetchOrders, createOrder} = useOrderStore();
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(0);
  const [type, setType] = useState('');
  const [originCountry, setOriginCountry] = useState('VN');
  const [destinationCountry, setDestinationCountry] = useState('');
  const [originStopId, setOriginStopId] = useState('');
  const [destinationStopId, setDestinationStopId] = useState('');
  const [day, setDay] = useState('');
  const [departureId, setDepartureId] = useState('');
  const [sender, setSender] = useState(() => ({...emptyContact(),fullName:user?.fullName || '',phone:user?.phone || ''}));
  const [recipient, setRecipient] = useState(emptyContact);
  const [horseIds, setHorseIds] = useState([]);
  const [addOnIds, setAddOnIds] = useState([]);
  const [notes, setNotes] = useState('');
  const [accepted, setAccepted] = useState(false);
  const formRef = useRef(null);
  const headingRef = useRef(null);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [response] = await Promise.all([transportScheduleApi.getCatalog(),fetchHorses(),fetchOrders()]);
      setCatalog(response.data.data);
    } catch (err) { setError(err.response?.data?.message || 'Không thể tải lịch vận chuyển và hồ sơ ngựa. Vui lòng thử lại.'); }
    finally { setLoading(false); }
  }, [fetchHorses,fetchOrders]);
  useEffect(() => { load(); }, [load]);
  const routes = bookingRoutes(catalog,type,originCountry,destinationCountry,originStopId);
  const origin = catalog?.stops.find(stop => stop.id === originStopId);
  const destination = catalog?.stops.find(stop => stop.id === destinationStopId);
  const countryName = code => catalog?.countries.find(country => country.code === code)?.name || 'Chọn quốc gia';
  const allowedDepartures = (catalog?.departures || []).filter(item => routes.rules.some(rule => rule.originStopId === item.originStopId && rule.destinationStopId === item.destinationStopId) && (!originCountry || catalog.stops.find(stop => stop.id === item.originStopId)?.countryCode === originCountry) && (!destinationCountry || catalog.stops.find(stop => stop.id === item.destinationStopId)?.countryCode === destinationCountry) && (!originStopId || item.originStopId === originStopId) && (!destinationStopId || item.destinationStopId === destinationStopId));
  const dates = [...new Set(allowedDepartures.map(item => item.departureLocalDate))].sort();
  const departures = allowedDepartures.filter(item => originStopId && destinationStopId && item.departureLocalDate === day);
  const departure = departures.find(item => item.id === departureId);
  const departureKey = departures.map(item => item.id).join(',');
  useEffect(() => {
    const ids = departureKey ? departureKey.split(',') : [];
    if (ids.length === 1) setDepartureId(ids[0]);
    else if (!ids.includes(departureId)) setDepartureId('');
  }, [departureKey,departureId]);
  const selectedHorses = horses.filter(horse => horseIds.includes(horse.id));
  const selectedAddOns = (catalog?.addOns || []).filter(item => addOnIds.includes(item.id));
  const depositPercent = catalog?.depositPolicy?.percent || 30;
  const costs = bookingTotal(departure,horseIds.length,selectedAddOns,depositPercent);
  const tripReady = Boolean(type && origin && destination && departure && day && !loading && !error);
  const horsesReady = selectedHorses.length > 0 && selectedHorses.length === horseIds.length && selectedHorses.every(horse => !horseBookingIssue(horse,originStopId,orders));
  const ready = tripReady && horsesReady && costs.total > 0;
  const resetRoute = () => { setSender(current=>({...current,area:'',address:''}));setRecipient(current=>({...current,area:'',address:''}));setOriginStopId('');setDestinationStopId('');setDepartureId('');setDay('');setHorseIds([]);setAccepted(false); };
  const chooseType = next => { if (next === type) return;setType(next);setOriginCountry('VN');setDestinationCountry(next === 'domestic' ? 'VN' : '');resetRoute(); };
  const changeOrigin = value => { setSender(current=>({...current,area:'',address:''}));setRecipient(current=>({...current,area:'',address:''}));setOriginStopId(value);setDestinationStopId('');setDepartureId('');setHorseIds([]);setAccepted(false); };
  const changeDestination = value => { setRecipient(current=>({...current,area:'',address:''}));setDestinationStopId(value);setDepartureId('');setAccepted(false); };
  const goStep = next => {setStep(next);setSubmitError('');headingRef.current?.scrollIntoView({behavior:'smooth',block:'start'});};
  const nextStep = () => {
    if (!formRef.current?.reportValidity()) return;
    if (step === 0 && !tripReady) {setSubmitError('Vui lòng chọn đầy đủ tuyến, ngày và chuyến khởi hành đang mở.');return;}
    if (step === 1 && !horsesReady) {setSubmitError('Chọn ít nhất một ngựa đủ điều kiện tại điểm đón.');return;}
    goStep(step + 1);
  };
  const cancel = () => {
    if (!type) {navigate('/orders');return;}
    Modal.confirm({title:'Hủy yêu cầu đang nhập?',content:'Thông tin chưa gửi sẽ không được lưu.',okText:'Hủy yêu cầu',cancelText:'Tiếp tục nhập',okButtonProps:{danger:true},onOk:()=>navigate('/orders')});
  };
  const submit = async () => {
    if (!ready || !accepted || submitting) return;
    setSubmitting(true);setSubmitError('');
    try {
      const order = await createOrder({departureId,scheduleRevision:catalog.revision,horseIds,addOnIds,specialRequirements:notes,contacts:{sender,recipient}});
      message.success(`Đã tạo đơn ${order.bookingCode || order.orderCode}. Vui lòng hoàn tất đặt cọc.`);
      navigate('/orders',{state:{createdOrderId:order.id || order._id}});
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Không thể gửi yêu cầu vận chuyển. Vui lòng thử lại.');
      if (err.response?.status === 409 && err.response?.data?.errorCode !== 'ACTIVE_UNPAID_DEPOSIT') {setStep(0);setAccepted(false);await load();}
    } finally {setSubmitting(false);}
  };
  return <div className="booking-page">
    <div className="booking-intro" ref={headingRef}><nav aria-label="Đường dẫn" className="booking-breadcrumb"><Link to="/dashboard">Trang chủ</Link><span>/</span><span>Đặt chuyến mới</span><span>/</span><strong>{BOOKING_STEPS[step]}</strong></nav><h1>Tạo yêu cầu vận chuyển</h1><p>Thiết lập tuyến đường, ngày đi và thông tin giao nhận ngựa theo mô hình 2 cấp (Tỉnh/Thành → Xã/Phường).</p></div>
    <ol className="booking-stepper" aria-label="Các bước đặt chuyến">{BOOKING_STEPS.map((label,index)=><li key={label} className={index===step?'is-active':index<step?'is-done':''} aria-current={index===step?'step':undefined}><span>{index<step?<Check size={16}/>:index+1}</span><strong>{label}</strong></li>)}</ol>
    {error && <Alert type="error" showIcon message={error} action={<Button onClick={load}>Thử lại</Button>}/>}
    <Spin spinning={loading}>
      <div className="booking-columns"><form ref={formRef} className="booking-main" onSubmit={event=>event.preventDefault()}>
        {step===0 && <>
          <Panel icon={Route} title="Loại chuyến"><div className="booking-trip-types">{[['domestic',Truck,'Trong nước','Việt Nam → Việt Nam'],['international',Globe2,'Quốc tế','Việt Nam ↔ Các nước trong mạng lưới']].map(([value,Icon,title,subtitle])=><button key={value} className={type===value?'is-selected':''} type="button" aria-pressed={type===value} onClick={()=>chooseType(value)} disabled={loading}><Icon size={21}/><span><strong>{title}</strong><small>{subtitle}</small></span>{type===value&&<Check size={16}/>}</button>)}</div></Panel>
          {type && <Panel icon={Route} title="Hành trình & ngày đi">
            {type==='international'&&<><div className="booking-country-selects"><Field label="Nước khởi hành"><select aria-label="Nước khởi hành" value={originCountry} onChange={event=>{setOriginCountry(event.target.value);setDestinationCountry('');resetRoute();}} required><option value="">Chọn quốc gia khởi hành</option>{routes.originCountries.map(country=><option key={country.code} value={country.code}>{flag(country.code)} {country.name}</option>)}</select></Field><button type="button" className="booking-swap" aria-label="Đổi chiều tuyến" disabled={!destinationCountry} onClick={()=>{const previous=originCountry;setOriginCountry(destinationCountry);setDestinationCountry(previous);resetRoute();}}><ArrowRightLeft size={16}/></button><Field label="Nước đến"><select aria-label="Nước đến" required value={destinationCountry} onChange={event=>{setDestinationCountry(event.target.value);resetRoute();}}><option value="">Chọn quốc gia đến</option>{routes.destinationCountries.map(country=><option key={country.code} value={country.code}>{flag(country.code)} {country.name}</option>)}</select></Field></div><div className="booking-route-banner"><div><CountryFlag code={originCountry}/><p><small>KHỞI HÀNH</small><strong>{countryName(originCountry)}</strong></p></div><span className="booking-route-line"/><ArrowRight size={18}/><span className="booking-route-line"/><div><CountryFlag code={destinationCountry}/><p><small>ĐIỂM ĐẾN</small><strong>{destinationCountry?countryName(destinationCountry):'Chọn quốc gia'}</strong></p></div></div></>}
            <div className="booking-departure-label"><strong><CalendarDays size={17}/>Ngày khởi hành</strong><small>{dates.length?`Sớm nhất ${dateText(dates[0])}`:'Chưa có lịch mở cho tuyến này'}</small></div><div className="booking-departure-fields"><label className="booking-date"><CalendarDays size={18}/><input type="date" aria-label="Ngày khởi hành" required value={day} min={dates[0]} max={dates[dates.length-1]} disabled={!dates.length} onInput={event=>{setDay(event.currentTarget.value);setDepartureId('');}} onChange={event=>{setDay(event.target.value);setDepartureId('');}} /></label>{origin&&destination&&day&&<Field label="Giờ khởi hành"><select aria-label="Giờ khởi hành" required value={departureId} onChange={event=>setDepartureId(event.target.value)}><option value="">Chọn chuyến theo lịch</option>{departures.map(item=><option key={item.id} value={item.id}>{item.departureLocalTime} · {money(item.basePriceVnd)} / ngựa</option>)}</select></Field>}</div>
            {day&&!dates.includes(day)&&<p className="booking-inline-warning">Ngày này không có chuyến đang mở trên tuyến đã chọn.</p>}
            {departure&&<p className="booking-field-help">Giờ khởi hành tại {origin.name} ({departure.timeZone}).</p>}
          </Panel>}
          {type && (type==='domestic'||destinationCountry) && <><ContactPanel side="sender" contact={sender} setContact={setSender} countryName={countryName(originCountry)} stops={routes.origins} stopId={originStopId} onStopChange={changeOrigin} user={user}/><ContactPanel side="recipient" contact={recipient} setContact={setRecipient} countryName={countryName(destinationCountry)} stops={routes.destinations} stopId={destinationStopId} onStopChange={changeDestination}/></>}
        </>}
        {step===1&&<Panel icon={Truck} title="Chọn ngựa vận chuyển"><p className="booking-panel-description">Chọn ngựa có hồ sơ đã duyệt và đang ở {origin?.name}. Các ngựa chưa đủ điều kiện được ghi rõ bên dưới.</p><div className="booking-horse-list">{horses.length?horses.map(horse=>{const issue=horseBookingIssue(horse,originStopId,orders);return <label key={horse.id} className={`booking-horse ${horseIds.includes(horse.id)?'is-selected':''} ${issue?'is-disabled':''}`}><input type="checkbox" checked={horseIds.includes(horse.id)} disabled={Boolean(issue)} onChange={event=>{setHorseIds(current=>event.target.checked?[...current,horse.id]:current.filter(id=>id!==horse.id));setAccepted(false);}}/><span><strong>{horse.name}</strong><small>Mã chip: {horse.microchipId || 'Chưa cập nhật'}{horse.breed?` · ${horse.breed}`:''}</small>{issue&&<em>{issue}</em>}</span>{!issue&&<small className="booking-ready"><CheckCircle2 size={14}/>Đủ điều kiện</small>}</label>;}):<><Empty description="Bạn chưa có hồ sơ ngựa."/><Link className="booking-button booking-button-secondary" to="/horses">Đến hồ sơ ngựa</Link></>}</div><Field label="Yêu cầu chăm sóc đặc biệt" required={false}><textarea aria-label="Yêu cầu chăm sóc đặc biệt" rows={4} maxLength={2000} value={notes} onChange={event=>setNotes(event.target.value)} placeholder="Ghi chú sức khỏe, thói quen hoặc yêu cầu chăm sóc ngựa…"/></Field></Panel>}
        {step===2&&<Panel icon={ShieldCheck} title="Dịch vụ & bảo hiểm"><p className="booking-panel-description">Chọn dịch vụ bổ sung phù hợp với chuyến đi. Giá được tính theo số ngựa hoặc theo đơn.</p><div className="booking-addon-list">{(catalog?.addOns||[]).map(item=><label key={item.id} className={`booking-addon ${addOnIds.includes(item.id)?'is-selected':''}`}><input type="checkbox" checked={addOnIds.includes(item.id)} onChange={event=>{setAddOnIds(current=>event.target.checked?[...current,item.id]:current.filter(id=>id!==item.id));setAccepted(false);}}/><span><strong>{item.name}</strong><small>{item.description}</small></span><strong>{money(item.unitPriceVnd)}<small>{item.pricingMode==='PER_HORSE'?'/ ngựa':'/ đơn'}</small></strong></label>)}{!catalog?.addOns.length&&<p>Hiện chưa có dịch vụ bổ sung. Bạn có thể tiếp tục với gói vận chuyển cơ bản.</p>}</div></Panel>}
        {step===3&&<><Panel icon={ClipboardList} title="Xác nhận thông tin chuyến đi" aside={<button className="booking-edit" type="button" onClick={()=>goStep(0)}>Chỉnh sửa</button>}><dl className="booking-review"><dt>Loại chuyến</dt><dd>{type==='domestic'?'Trong nước':'Quốc tế'}</dd><dt>Hành trình</dt><dd>{origin?.name} → {destination?.name}</dd><dt>Khởi hành</dt><dd>{departure?.departureLocalTime} · {dateText(day)}</dd><dt>Người gửi</dt><dd>{sender.fullName} · {sender.phone}<small>{sender.address}, {sender.area}, {origin?.name}</small></dd><dt>Người nhận</dt><dd>{recipient.fullName} · {recipient.phone}<small>{recipient.address}, {recipient.area}, {destination?.name}</small></dd><dt>Ngựa vận chuyển</dt><dd>{selectedHorses.map(horse=>horse.name).join(', ')}</dd><dt>Dịch vụ bổ sung</dt><dd>{selectedAddOns.map(item=>item.name).join(', ')||'Không chọn thêm'}</dd>{notes&&<><dt>Yêu cầu chăm sóc</dt><dd>{notes}</dd></>}</dl></Panel><Panel icon={ShieldCheck} title="Kiểm tra trước khi gửi"><p className="booking-panel-description">Sau khi tạo đơn, đặt cọc {depositPercent}% trong {catalog?.depositPolicy?.windowMinutes||30} phút để gửi đơn duyệt. Phần còn lại phải thanh toán trước khi phân công vận chuyển.</p><label className="booking-confirm"><input type="checkbox" checked={accepted} onChange={event=>setAccepted(event.target.checked)}/><span>Tôi đã kiểm tra thông tin giao nhận, ngựa, lịch khởi hành và chi phí của yêu cầu này.</span></label></Panel></>}
        {submitError&&<Alert type="error" showIcon message={submitError}/>}
        <div className="booking-form-actions"><button className="booking-button booking-button-secondary" type="button" disabled={submitting} onClick={step?()=>goStep(step-1):cancel}>{step?<><ArrowLeft size={15}/>Quay lại</>:'Hủy'}</button>{step<3?<button className="booking-button" type="button" disabled={!type||loading||Boolean(error)} onClick={nextStep}>Tiếp tục: {BOOKING_STEPS[step+1]}<ArrowRight size={16}/></button>:<button className="booking-button" type="button" disabled={!ready||!accepted||submitting} onClick={submit}>{submitting?'Đang gửi yêu cầu…':'Gửi yêu cầu & đặt cọc'}<ArrowRight size={16}/></button>}</div>
      </form><aside className="booking-sidebar"><Panel icon={ClipboardList} title="Tóm tắt đơn"><dl className="booking-summary"><dt>Loại chuyến</dt><dd>{type?type==='domestic'?'Trong nước':'Quốc tế':'Chưa chọn'}</dd><dt>Điểm đón</dt><dd>{origin?.name||'—'}</dd><dt>Điểm giao</dt><dd>{destination?.name||'—'}</dd><dt>Ngày khởi hành</dt><dd>{dateText(day)}{departure&&<small>{departure.departureLocalTime}</small>}</dd><dt>Số ngựa</dt><dd>{horseIds.length||'—'}</dd></dl>{!type&&<p className="booking-summary-hint">Chọn loại chuyến để bắt đầu.</p>}{departure&&horseIds.length>0&&<div className="booking-costs"><div><span>Cước vận chuyển</span><strong>{money(costs.base)}</strong></div>{selectedAddOns.map(item=><div key={item.id}><span>{item.name}</span><strong>{money(item.unitPriceVnd*(item.pricingMode==='PER_HORSE'?horseIds.length:1))}</strong></div>)}<div className="booking-cost-total"><span>Tổng cộng</span><strong>{money(costs.total)}</strong></div><div className="booking-cost-deposit"><span>Đặt cọc {depositPercent}%</span><strong>{money(costs.deposit)}</strong></div></div>}</Panel><div className="booking-after-send"><ShieldCheck size={17}/><div><h3>Sau khi gửi đơn</h3><ul><li>Đặt cọc {depositPercent}% trong {catalog?.depositPolicy?.windowMinutes||30} phút để đơn được gửi duyệt.</li><li>Quản lý tiếp nhận, Kiểm dịch viên và Điều phối viên thẩm định theo quy trình.</li><li>Theo dõi giấy tờ, thanh toán và hành trình trong mục Đơn của tôi.</li></ul></div></div></aside></div>
    </Spin>
    <p className="booking-bottom-note">Chọn lịch đang mở trong {catalog?.bookingWindowDays||28} ngày tới. Đặt trước giờ khởi hành tối thiểu {catalog?.minNoticeHours||24} giờ.</p><footer className="booking-footer">© 2026 Vận chuyển Ngựa đua · Việt Nam · Các tuyến quốc tế</footer>
  </div>;
}



