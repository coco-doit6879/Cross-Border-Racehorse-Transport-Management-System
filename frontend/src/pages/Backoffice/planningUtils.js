export const idOf=value=>String(value?._id||value?.id||value||'');
export const date=value=>value?new Intl.DateTimeFormat('vi-VN',{dateStyle:'short',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(value)):'—';
export const datetime=value=>value?new Date(value).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour12:false}):'—';
export const money=value=>Number.isFinite(value)?`${value.toLocaleString('vi-VN')} ₫`:'Chưa có báo giá';
export const routeLabel=order=>`${order.origin?.address||'—'} → ${order.destination?.address||'—'}`;
export function issue(resource,kind,order,orders=[],routes=[]){
 if(!resource)return 'Chưa chọn';
 const date=Math.max(Date.now(),new Date(order.requestedDepartureDate).getTime()||0);
 if(kind==='vehicle'){
  if(resource.status!=='ACTIVE')return resource.status==='MAINTENANCE'?'Xe đang bảo dưỡng':'Xe chưa sẵn sàng';
  if(!resource.registrationExpiresAt||new Date(resource.registrationExpiresAt).getTime()<date)return 'Thiếu hoặc hết hạn đăng ký';
  if(!resource.inspectionExpiresAt||new Date(resource.inspectionExpiresAt).getTime()<date)return 'Thiếu hoặc hết hạn đăng kiểm';
 }else if(!resource.isActive)return 'Tài khoản ngừng hoạt động';
 if(kind!=='vehicle'&&['RETURNING','ON_DUTY'].includes(resource.operationalStatus))return resource.operationalStatus==='RETURNING'?'Đang trở về trụ sở':'Đang làm nhiệm vụ';
 if(routes.some(r=>['SCHEDULED','IN_TRANSIT','INCIDENT_HANDLING','DELIVERING'].includes(r.status)&&idOf(r.orderId)!==idOf(order)&&idOf(r[`${kind}Id`])===idOf(resource)))return 'Đang được phân công chuyến khác';
 if(orders.some(o=>idOf(o)!==idOf(order)&&!['CANCELLED','REJECTED','COMPLETED'].includes(o.status)&&o.preparation?.confirmedAt&&Math.abs(new Date(o.requestedDepartureDate)-new Date(order.requestedDepartureDate))<=72*3600000&&(o.preparation.plan?.vehicles||[]).some(slot=>idOf(slot[`${kind}Id`])===idOf(resource))))return 'Trùng lịch phương án đã xác nhận';
 return '';
}
export function intakeStage(order){return order.preparation?.receivedAt?'review':'waiting';}
export function readyForQuote(order){return Boolean(['APPROVED','DOCS_PROCESSING','CLEARED_FOR_TRANSPORT'].includes(order.status)&&order.paymentStatus==='PAID'&&order.preparation?.confirmedAt&&!order.preparation?.assignedAt);}

