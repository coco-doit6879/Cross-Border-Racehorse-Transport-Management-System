import React,{useEffect,useState} from 'react';
import {Alert,Modal,Drawer,message,Button,Card,Descriptions,Spin,Tag} from 'antd';
import {Link} from 'react-router-dom';
import {ClipboardList,FileText,Route,ShieldCheck,Truck,UserRound,Users,ExternalLink} from 'lucide-react';
import {date,datetime,idOf,money,readyForQuote,routeLabel} from './planningUtils';
import {planningApi} from '../../services/planningApi';
import {horseApi} from '../../services/horseApi';
import {HorsePhotoGallery,reviewColors,reviewLabels} from '../Horses/HorseProfileForm';
import PlanningResourcePicker from './PlanningResourcePicker';
import PlanningMap from './PlanningMap';
const tabs=[['customer','Khách hàng',UserRound],['horses','Hồ sơ ngựa',FileText],['order','Thông tin đơn',ClipboardList],['route','Xe và lộ trình',Route],['crew','Tài xế, hộ tống',Users],['price','Báo giá',FileText]];
function Contact({title,contact,location}){return <section className="bo-card"><h2>{title}</h2><div className="bo-contact-grid"><div><small>HỌ TÊN</small>{contact?.fullName||'Chưa khai báo'}</div><div><small>SỐ ĐIỆN THOẠI</small>{contact?.phone||'—'}</div><div><small>CCCD / MST / HỘ CHIẾU</small>{contact?.identityNumber||'—'}</div><div style={{gridColumn:'1 / -1'}}><small>ĐỊA CHỈ</small>{[contact?.address,contact?.area,location?.address].filter(Boolean).join(', ')||'—'}</div></div></section>;}

function HorseDetailModal({horseId,open,onClose}){
 const [horse,setHorse]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{
  if(!open||!horseId){setHorse(null);return;}
  let active=true;setLoading(true);setError('');
  horseApi.getHorseById(horseId)
   .then(res=>{if(active)setHorse(res.data?.data||res.data);})
   .catch(err=>{if(active)setError(err.response?.data?.message||'Không thể tải hồ sơ ngựa.');})
   .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[open,horseId]);
 return <Modal open={open} onCancel={onClose} width={880} centered destroyOnClose title={<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingRight:24}}><span>{horse?`Hồ sơ ngựa: ${horse.name}`:'Chi tiết hồ sơ ngựa'}</span>{horseId&&<a href={`/horses/${horseId}`} target="_blank" rel="noreferrer" style={{fontSize:13,fontWeight:'normal',display:'inline-flex',alignItems:'center',gap:4}}><ExternalLink size={13}/> Mở tab riêng</a>}</div>} footer={<Button onClick={onClose}>Đóng</Button>}>
  {loading?<div style={{textAlign:'center',padding:'50px 0'}}><Spin size="large"/></div>:error?<Alert type="error" message={error}/>:horse?<div style={{display:'flex',flexDirection:'column',gap:16}}>
   <Card size="small" title="Trạng thái kiểm duyệt">
    <Tag color={reviewColors[horse.reviewStatus]||'default'}>{reviewLabels[horse.reviewStatus]||horse.reviewStatus}</Tag>
    {horse.reviewNotes&&<Alert style={{marginTop:10}} type={horse.reviewStatus==='REJECTED'?'error':'success'} message={horse.reviewNotes} description={`Người duyệt: ${horse.reviewedBy?.fullName||horse.reviewedBy||'—'} · ${datetime(horse.reviewedAt)}`}/>}
   </Card>
   <Card size="small" title="Thông tin nhận dạng">
    <Descriptions bordered size="small" column={{xs:1,sm:2}} items={[
     ['Chủ sở hữu',horse.ownerName||horse.ownerId?.fullName||'Chưa khai báo'],
     ['Mã vi chip',horse.microchipId||'Chưa khai báo'],
     ['Số hộ chiếu FEI',horse.feiPassportNumber||horse.feiPassportNo||'Chưa khai báo'],
     ['Địa điểm hiện tại',horse.currentLocationName||horse.currentStopId||'Chưa khai báo'],
     ['Giống ngựa',horse.breed||'Chưa khai báo'],
     ['Ngày sinh',horse.dateOfBirth?.slice(0,10)||'Chưa khai báo'],
     ['Giới tính',({STALLION:'Đực',MARE:'Cái',GELDING:'Thiến'})[horse.gender]||horse.gender||'Chưa khai báo'],
     ['Cân nặng',`${horse.weightKg||horse.weight||'—'} kg`],
     ['Màu lông',horse.color||horse.coatColor||'Chưa khai báo'],
     ['Đặc điểm nhận dạng',horse.identifyingMarks||'Không khai báo'],
     ['Tiêm phòng cúm gần nhất',horse.lastVaccinationDate?.slice(0,10)||'Chưa khai báo'],
     ['Tiền sử y tế',horse.medicalHistoryNotes||'Không khai báo']
    ].map(([label,children])=>({key:label,label,children}))}/>
   </Card>
   {(horse.photos?.length>0||horse.passportScanUrl||horse.vaccinationRecordUrl)&&<Card size="small" title="Hình ảnh & Hồ sơ đính kèm">
    {horse.photos?.length>0&&<div style={{marginBottom:16}}><h4>Ảnh nhận dạng ({horse.photos.length} ảnh):</h4><HorsePhotoGallery value={horse.photos} disabled/></div>}
    {horse.passportScanUrl&&<div style={{marginBottom:16}}><h4>Bản quét Hộ chiếu:</h4><HorsePhotoGallery value={horse.passportScanUrl} allowPdf disabled/></div>}
    {horse.vaccinationRecordUrl&&<div><h4>Sổ tiêm chủng / Chứng nhận kiểm dịch:</h4><HorsePhotoGallery value={horse.vaccinationRecordUrl} allowPdf disabled/></div>}
   </Card>}
  </div>:null}
 </Modal>;
}

export default function OrderReviewModal({order,data,mode='quote',onClose,onSaved}){
 const [tab,setTab]=useState('customer'),[slots,setSlots]=useState([]),[picker,setPicker]=useState(null),[saving,setSaving]=useState(false),[error,setError]=useState(''),[returnAction,setReturnAction]=useState(null),[reason,setReason]=useState(''),[viewingHorseId,setViewingHorseId]=useState(null);
 useEffect(()=>{setSlots((order?.preparation?.plan?.vehicles||[]).map(s=>({...s})));setError('');},[order?._id,order?.operationsVersion]);
 useEffect(()=>{setTab('customer');},[order?._id]);
 if(!order)return null;
 const save=async(action,extra={})=>{if(saving)return;setSaving(true);setError('');try{await planningApi.update(order,action,{vehicles:slots,...extra});message.success(action==='APPROVE_ORDER'?'Đã duyệt đơn. Khách hàng có thể thanh toán phần còn lại.':action==='ASSIGN_CREW'?'Đã phát hành vận đơn cho tài xế và phụ xe.':'Đã lưu cập nhật.');setReturnAction(null);setReason('');await onSaved();if(['APPROVE_ORDER','ASSIGN_CREW'].includes(action))onClose();}catch(e){setError(e.response?.data?.message||'Không thể cập nhật.');}finally{setSaving(false);}};
 const crewComplete=slots.length>0&&slots.every(s=>s.driverId&&s.escortId);
 const readOnly=Boolean(order.preparation?.assignedAt);
 return <><Drawer open={true} width="min(1100px, 96vw)" onClose={()=>!saving&&onClose()} className="bo-quote-modal heritage-review-drawer" title={<div>{mode==='intake'?'Duyệt đơn vận chuyển':'Phân công tài xế, phụ xe'} {order.bookingCode}<div className="bo-secondary">{order.customerId?.fullName||'Chưa cập nhật'} · khởi hành {date(order.requestedDepartureDate)}</div></div>} footer={<div className="bo-actions" style={{justifyContent:'flex-end'}}><button className="bo-button" disabled={saving} onClick={onClose}>Đóng</button>{mode==='intake'?<button className="bo-button bo-button-primary" disabled={saving||order.status!=='PENDING_APPROVAL'||order.depositStatus!=='PAID'} onClick={()=>save('APPROVE_ORDER')}>{order.status!=='PENDING_APPROVAL'?'Đã duyệt đơn':'Duyệt đơn vận chuyển'}</button>:<><button className="bo-button bo-button-primary" disabled={saving||readOnly||!readyForQuote(order)||!crewComplete} onClick={()=>save('ASSIGN_CREW')}>{saving?'Đang lưu…':readOnly?'Đã phân công':'Phát hành vận đơn'}</button></>}</div>}>
 <div className="bo-quote-body"><nav className="bo-quote-nav" aria-label="Nội dung duyệt đơn">{tabs.map(([key,label,Icon])=><button key={key} className={tab===key?'is-active':''} onClick={()=>setTab(key)}><Icon size={14}/>{label}{key==='crew'&&crewComplete&&<ShieldCheck size={13} color="#169b7e"/>}</button>)}</nav><div className="bo-quote-content">{error&&<Alert type="error" showIcon message={error}/>}{order.preparation?.declinedNote&&<Alert type="warning" showIcon message={`Điều phối từ chối phương án: ${order.preparation.declinedNote}`}/>}
 {tab==='customer'&&<><section className="bo-card"><h2>Khách đặt đơn</h2><div className="bo-contact-grid"><div><small>TÀI KHOẢN</small>{order.customerId?.fullName||'Chưa cập nhật'}</div><div><small>GỬI ĐƠN LÚC</small>{datetime(order.createdAt)}</div></div></section><Contact title="Người gửi" contact={order.contacts?.sender} location={order.origin}/><Contact title="Người nhận" contact={order.contacts?.recipient} location={order.destination}/></>}
 {tab==='horses'&&<>{order.horseIds.map(h=><section className="bo-card" key={idOf(h)}><div className="bo-card-heading"><h2>{h.name||'Chưa có tên'}</h2><span className={`bo-pill ${h.reviewStatus==='APPROVED'?'bo-pill-green':'bo-pill-orange'}`}>{h.reviewStatus==='APPROVED'?'Đã duyệt sức khỏe':'Chờ kiểm dịch viên'}</span></div><p className="bo-muted">Chip: {h.microchipId||'—'} · Giống: {h.breed||'—'}</p><button type="button" className="bo-button" onClick={()=>setViewingHorseId(idOf(h))}>Xem hồ sơ ngựa</button></section>)}{order.preparation?.returnHealthNote&&<p className="bo-alert">Yêu cầu kiểm tra lại: {order.preparation.returnHealthNote}</p>}<HorseDetailModal horseId={viewingHorseId} open={Boolean(viewingHorseId)} onClose={()=>setViewingHorseId(null)}/></>}
 {tab==='order'&&<section className="bo-card"><h2>Thông tin đơn</h2><div className="bo-contact-grid"><div><small>MÃ ĐƠN</small>{order.bookingCode}</div><div><small>KHỞI HÀNH</small>{datetime(order.requestedDepartureDate)}</div><div><small>SỐ NGỰA</small>{order.horseIds.length}</div><div style={{gridColumn:'1 / -1'}}><small>HÀNH TRÌNH</small>{routeLabel(order)}</div><div style={{gridColumn:'1 / -1'}}><small>YÊU CẦU CHĂM SÓC</small>{order.specialRequirements||'Không có ghi chú'}</div></div></section>}
 {tab==='route'&&<>{slots.map((slot,index)=>{const vehicle=data.vehicles.find(v=>idOf(v)===slot.vehicleId);return <section className="bo-card" key={index}><h2>Xe {index+1} · {vehicle?.plateNumber||'Chưa chọn xe'} ({vehicle?.capacityHorses||'—'} ngăn)</h2><p className="bo-muted">Ngựa: {order.horseIds.filter(h=>slot.horseIds.includes(idOf(h))).map(h=>h.name).join(', ')}</p></section>;})}{!slots.length?<p className="bo-alert">Chưa có phương án xe từ điều phối.</p>:<PlanningMap order={order} stops={order.preparation?.plan?.restStops||[]} editable={false}/>}</>}
 {tab==='crew'&&<><h2>Chọn tài xế và nhân viên hộ tống</h2><p className="bo-muted">Điều phối viên đã chọn {slots.length} xe. Mỗi xe cần đúng 1 tài xế và 1 nhân viên hộ tống. Người đang đi chuyến hoặc trùng lịch phương án bị khóa.</p>{slots.length===0&&<p className="bo-alert">Điều phối cần xác nhận xe và lộ trình trước khi chọn kíp xe.</p>}{slots.map((slot,index)=>{const vehicle=data.vehicles.find(v=>idOf(v)===slot.vehicleId);return <section className="bo-vehicle-slot" key={index}><h3>Xe {index+1} · {vehicle?.plateNumber||'Chưa chọn'} ({vehicle?.capacityHorses||'—'} ngăn) · {slot.horseIds.length} ngựa: {order.horseIds.filter(h=>slot.horseIds.includes(idOf(h))).map(h=>h.name).join(', ')}</h3><div className="bo-crew-grid">{[['driver','Tài xế'],['escort','Nhân viên hộ tống']].map(([kind,label])=>{const person=data.staff.find(s=>idOf(s)===slot[`${kind}Id`]);return <div key={kind}><small>{label}</small><div className="bo-choice"><strong>{kind==='driver'?'▣':'♞'} {person?.username||person?.fullName||'Chưa chọn'}</strong><button className="bo-button" disabled={readOnly||!readyForQuote(order)} onClick={()=>setPicker({index,kind})}>{person?'Đổi':'Chọn'}</button></div></div>;})}</div></section>;})}{slots.length>0&&!readOnly&&readyForQuote(order)&&<button className="bo-button" style={{marginTop:15}} disabled={saving||!crewComplete} onClick={()=>save('SAVE_CREW')}>Lưu tài xế, hộ tống</button>}</>}
 {tab==='price'&&<section className="bo-card"><h2>Báo giá chính thức</h2><p className="bo-muted">Giá được xác lập từ tuyến và dịch vụ đã chọn. Duyệt giá không thay đổi chi phí khách đã xác nhận.</p><div className="bo-choice"><span>Cước vận chuyển</span><strong>{money(order.pricing?.baseAmountVnd)}</strong></div>{order.pricing?.addOns?.map(item=><div className="bo-choice" key={item.id}><span>{item.name} × {item.quantity}</span><strong>{money(item.amountVnd)}</strong></div>)}<div className="bo-choice"><strong>Tổng giá trị đơn</strong><strong style={{color:'#d36c2e'}}>{money(order.pricing?.totalAmountVnd)}</strong></div><div className="bo-choice"><span>Đặt cọc {order.depositPercent||'—'}%</span><strong>{money(order.depositAmountVnd)}</strong></div><p className="bo-alert">Khách đặt cọc 30%, quản lý duyệt đơn, khách trả phần còn lại, điều phối xác nhận xe và lộ trình, quản lý phân công kíp xe.</p>{readOnly&&<p className="bo-muted">Đã công bố: {datetime(order.preparation.quotePublishedAt)} · Hiệu lực đến {datetime(order.preparation.quoteExpiresAt)}</p>}</section>}
 </div></div></Drawer>{picker&&<PlanningResourcePicker open={true} onClose={()=>setPicker(null)} kind={picker.kind} order={order} data={data} value={slots[picker.index]?.[`${picker.kind}Id`]} excluded={slots.flatMap((slot,index)=>index===picker.index?[slot[picker.kind==='driver'?'escortId':'driverId']]:[slot.driverId,slot.escortId]).filter(Boolean)} onChange={value=>setSlots(slots.map((s,i)=>i===picker.index?{...s,[`${picker.kind}Id`]:value}:s))}/>}
 <Modal title={returnAction==='RETURN_HEALTH'?'Trả lại Kiểm dịch viên':'Trả lại Điều phối viên'} open={Boolean(returnAction)} onCancel={()=>setReturnAction(null)} onOk={()=>save(returnAction,{note:reason})} okButtonProps={{disabled:!reason.trim(),loading:saving}} okText="Gửi yêu cầu kiểm tra lại" cancelText="Đóng"><textarea className="bo-note" aria-label="Lý do trả lại" maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Nêu rõ nội dung cần kiểm tra hoặc bổ sung…"/></Modal></>;
}

