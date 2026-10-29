const express = require('express');
const router = express.Router();
const {protect} = require('../middlewares/authMiddleware');
const Order = require('../models/Order');
const User = require('../models/User');
const Horse = require('../models/Horse');
const Vehicle = require('../models/Vehicle');
const Route = require('../models/TransportRoute');
const {logAudit} = require('../utils/auditLogger');
const {id,resourceIssue,validateSlots} = require('../services/planningValidation');
const {roadRoute} = require('../services/planningRoad');
const {approvalProblem,planningProblem,crewProblem,waypointsFor} = require('../services/bookingWorkflow');
const coordinator = user => ['FLEET_COORDINATOR','ROUTE_COORDINATOR'].includes(user.role);
const manager = user => user.role === 'LOGISTICS_MANAGER';
const point = p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite) && Math.abs(p[0])<=180 && Math.abs(p[1])<=90;
router.use(protect,(req,res,next)=>manager(req.user)||coordinator(req.user)?next():res.status(403).json({message:'Không có quyền điều phối hoặc duyệt giá.'}));
async function resources() {
  const [orders,vehicles,staff,routes] = await Promise.all([
    Order.find({}).populate('customerId','fullName email phone').populate('horseIds','name microchipId reviewStatus breed').lean(),
    Vehicle.find({}).lean(),User.find({role:{$in:['DRIVER','ESCORT','TRANSPORT_SPECIALIST','FLEET_COORDINATOR','ROUTE_COORDINATOR']}}).select('username fullName email phone role isActive operationalStatus').lean(),Route.find({status:{$in:['SCHEDULED','IN_TRANSIT','INCIDENT_HANDLING','DELIVERING']}}).lean()
  ]);return {orders,vehicles,staff,routes};
}
router.get('/',async(req,res,next)=>{try{res.json({success:true,data:await resources()});}catch(e){next(e);}});
router.post('/road',async(req,res,next)=>{
  try {
    const points=req.body.points;
    if(!Array.isArray(points)||points.length<2||points.length>50||points.some(p=>!point(p)))return res.status(400).json({message:'Tọa độ tuyến không hợp lệ.'});
    res.json({success:true,data:await roadRoute(points)});
  }catch(e){res.status(502).json({message:'Không tải được đường bộ từ OSRM. Vui lòng thử lại.'});}
});
router.patch('/:id',async(req,res,next)=>{
  try {
    const data=await resources(), order=data.orders.find(o=>id(o)===req.params.id);
    if(!order)return res.status(404).json({message:'Không tìm thấy đơn.'});
    if(['CANCELLED','REJECTED','COMPLETED'].includes(order.status))return res.status(409).json({message:'Đơn đã dừng hoặc hoàn tất.'});
    if(req.body.version!==(order.operationsVersion||0))return res.status(409).json({message:'Dữ liệu vừa thay đổi, vui lòng tải lại.'});
    const action=req.body.action, preparation={...(order.preparation||{})}, now=new Date();
    if(['ASSIGN_CREW','SAVE_CREW','DECLINE_PLAN'].includes(action)&&preparation.assignedAt)return res.status(409).json({message:'Đơn đã phân công kíp xe.'});
    const note=typeof req.body.note==='string'?req.body.note.trim().slice(0,2000):'';
    if(['RECEIVE','APPROVE_ORDER','ASSIGN_CREW','SAVE_CREW','REJECT'].includes(action)&&!manager(req.user))return res.status(403).json({message:'Chỉ quản lý được thực hiện.'});
    if(['SAVE_PLAN','CONFIRM_PLAN','DECLINE_PLAN','SUPPLEMENT_CUSTOMS'].includes(action)&&!coordinator(req.user))return res.status(403).json({message:'Chỉ điều phối được xác nhận phương án.'});
    const patch={};
    let createdRoute=null;
    if(action==='SUPPLEMENT_CUSTOMS') {
      const route=data.routes.find(r=>id(r.orderId)===id(order));
      if(!route || route.waypoints?.some(w=>w.type==='BORDER_CUSTOMS'))return res.status(409).json({message:'Chỉ bổ sung cửa khẩu cho vận đơn chưa có mốc cửa khẩu.'});
      if(!note)throw new Error('Nhập lý do bổ sung hoặc đổi cửa khẩu.');
      const customs=(req.body.plan?.restStops||[]).filter(s=>s.type==='BORDER_CUSTOMS');
      if(!customs.length||customs.length>10||customs.some(s=>typeof s.name!=='string'||!s.name.trim()||s.name.length>120||!point(s.coordinates)||!['VN','KH','TH','SG','MY','LA'].includes(s.countryCode))||customs.at(-1).countryCode!==order.destination.countryCode||new Set(customs.map(s=>s.name.trim())).size!==customs.length)throw new Error('Chọn cửa khẩu và quốc gia nhập cảnh hợp lệ; cửa khẩu cuối phải thuộc nước đến.');
      preparation.plan={...preparation.plan,restStops:[...(preparation.plan?.restStops||[]).filter(s=>s.type!=='BORDER_CUSTOMS'),...customs.map(s=>({name:s.name.trim(),coordinates:s.coordinates,type:'BORDER_CUSTOMS',countryCode:s.countryCode,minutes:Math.min(120,Math.max(30,Number(s.minutes)||30))}))]};
    } else if(action==='RECEIVE'||action==='APPROVE_ORDER') {
      const problem=approvalProblem(order);if(problem)return res.status(409).json({message:problem});
      patch.status='APPROVED';
      preparation.approvedAt=now;preparation.approvedBy=req.user._id;

      preparation.receivedAt=now;preparation.receivedBy=req.user._id;
    } else if(['SAVE_PLAN','CONFIRM_PLAN'].includes(action)) {
      const problem=planningProblem(order);if(problem)return res.status(409).json({message:problem});

      const plan=req.body.plan;
      const slots=validateSlots(order,plan?.vehicles,data.vehicles,data.orders,data.routes);
      if(slots.length!==1)throw new Error('Mỗi đơn vận chuyển sử dụng một xe đủ khoang cho toàn bộ ngựa.');
      const stops=plan?.restStops||[];
      if(!Array.isArray(stops)||stops.length>48||stops.some(s=>!point(s.coordinates)||typeof s.name!=='string'||!s.name.trim()||s.name.length>120||!Number.isFinite(s.minutes)||s.minutes<30||s.minutes>120))throw new Error('Mỗi trạm nghỉ cần tên, tọa độ và thời gian nghỉ 30–120 phút.');
      const customs = stops.filter(s=>s.type==='BORDER_CUSTOMS');
      if(stops.some(s=>s.type && !['REST_STOP','BORDER_CUSTOMS'].includes(s.type)))throw new Error('Loại điểm dừng không hợp lệ.');
      if(customs.some(s=>!['VN','KH','TH','SG','MY','LA'].includes(s.countryCode)))throw new Error('Chọn quốc gia nhập cảnh cho từng cửa khẩu.');
      if(new Set(customs.map(s=>s.name.trim())).size!==customs.length)throw new Error('Tên cửa khẩu không được trùng trong cùng lộ trình.');
      if(action==='CONFIRM_PLAN' && order.origin.countryCode!==order.destination.countryCode && (!customs.length || customs.at(-1).countryCode!==order.destination.countryCode))throw new Error('Tuyến quốc tế cần cửa khẩu theo thứ tự nhập cảnh; cửa khẩu cuối phải thuộc nước đến.');
      preparation.plan={vehicles:slots,restStops:stops.map(s=>({name:s.name.trim(),coordinates:s.coordinates,minutes:s.minutes,type:s.type==='BORDER_CUSTOMS'?'BORDER_CUSTOMS':'REST_STOP',...(s.type==='BORDER_CUSTOMS'?{countryCode:s.countryCode}:{})})),note};
      preparation.confirmedAt=action==='CONFIRM_PLAN'?now:null;preparation.confirmedBy=action==='CONFIRM_PLAN'?req.user._id:null;
      if(action==='CONFIRM_PLAN') {
        let road;
        try {road=await roadRoute([order.origin.coordinates,...stops.map(s=>s.coordinates),order.destination.coordinates]);}
        catch(error){return res.status(502).json({message:error.message||'Không tính được đường bộ, thử lại trước khi xác nhận.'});}
        if(road.legs.some(leg=>leg.driveHours>4))return res.status(400).json({message:'Có chặng lái liên tục quá 4 giờ. Bổ sung trạm nghỉ trước khi xác nhận.'});
        preparation.plan.road=road;
      }
      preparation.crewReady=false;
    } else if(action==='SAVE_CREW'||action==='ASSIGN_CREW') {
      const problem=crewProblem(order);if(problem)return res.status(409).json({message:problem});
      if(!preparation.confirmedAt||!preparation.plan?.vehicles?.length)return res.status(409).json({message:'Điều phối cần xác nhận xe và lộ trình trước.'});
      const slots=req.body.vehicles;
      const checked=validateSlots(order,slots,data.vehicles,data.orders,data.routes);
      if(JSON.stringify(checked)!==JSON.stringify(preparation.plan.vehicles.map(s=>({vehicleId:id(s.vehicleId),horseIds:s.horseIds.map(id)}))))throw new Error('Xe và ngựa phải khớp phương án điều phối đã xác nhận.');
      const people=[];
      preparation.plan={...preparation.plan,vehicles:slots.map((slot,i)=>{
        for(const kind of ['driver','escort']) {
          const person=data.staff.find(p=>id(p)===id(slot[`${kind}Id`]));
          const issue=resourceIssue(person,kind,order,data.orders,data.routes);if(issue)throw new Error(issue);
          if(people.includes(id(person)))throw new Error('Một người không thể phụ trách hai xe.');people.push(id(person));
        }
        return {...checked[i],driverId:id(slot.driverId),escortId:id(slot.escortId)};
      })};preparation.crewReady=true;
      if(action==='ASSIGN_CREW') {
        if(order.horseIds.some(h=>h.reviewStatus!=='APPROVED'))return res.status(409).json({message:'Hồ sơ ngựa cần được duyệt sức khỏe.'});
        if(preparation.plan.vehicles.length!==1)throw new Error('Phương án cần đúng một xe.');
        if(await Route.findOne({orderId:order._id}))return res.status(409).json({message:'Đơn đã có vận đơn. Không thể phân công hai lần.'});
        const slot=preparation.plan.vehicles[0];
        const vehicle=data.vehicles.find(v=>id(v)===slot.vehicleId);
        try {
          createdRoute=await Route.create({orderId:order._id,vehicleId:slot.vehicleId,vehiclePlateNumber:vehicle.plateNumber,driverId:slot.driverId,escortId:slot.escortId,waypoints:waypointsFor({...order,preparation}),plannedPath:preparation.plan.road?.path,currentLocation:null,status:'SCHEDULED',assignmentNote:preparation.plan.note,assignmentHistory:[{changedBy:req.user._id,reason:'Quản lý phân công sau khi điều phối xác nhận',...slot}]});
        }catch(error){if(error.code===11000)return res.status(409).json({message:'Xe hoặc nhân sự vừa được phân công cho chuyến khác.'});throw error;}
        preparation.assignedAt=now;preparation.assignedBy=req.user._id;preparation.routeId=createdRoute._id;
      }
    } else if(['REJECT','DECLINE_PLAN'].includes(action)) {
      if(!note)throw new Error('Vui lòng nhập lý do.');
      preparation.quotePublishedAt=null;preparation.quoteExpiresAt=null;
      if(action==='DECLINE_PLAN'){const problem=planningProblem(order);if(problem)return res.status(409).json({message:problem});preparation.declinedNote=note;}
      if(action==='REJECT'){if(order.paymentStatus==='PAID'||order.depositStatus==='PAID')return res.status(409).json({message:'Đơn đã thu tiền: dùng quy trình hủy và hoàn tiền trong chi tiết đơn.'});patch.status='REJECTED';patch.rejectionReason=note;}
    }else return res.status(400).json({message:'Thao tác không hợp lệ.'});
    const history=[...(preparation.history||[]),{action,note,by:req.user._id,at:now}];preparation.history=history.slice(-100);
    const versionQuery=order.operationsVersion===undefined?{$or:[{operationsVersion:0},{operationsVersion:{$exists:false}}]}:{operationsVersion:order.operationsVersion};
    const updated=await Order.findOneAndUpdate({_id:order._id,status:order.status,paymentStatus:order.paymentStatus,depositStatus:order.depositStatus,...versionQuery},{$set:{...patch,preparation},$inc:{operationsVersion:1}},{new:true,runValidators:true});
    if(!updated){if(createdRoute)await Route.deleteOne({_id:createdRoute._id});return res.status(409).json({message:'Dữ liệu vừa thay đổi, hãy tải lại.'});}
    await logAudit({actorId:req.user._id,action:`PLANNING_${action}`,resource:'Order',resourceId:order._id,result:'SUCCESS',metadata:{note}});
    const event = { RECEIVE:'APPROVED', APPROVE_ORDER:'APPROVED', CONFIRM_PLAN:'PLAN_CONFIRMED', ASSIGN_CREW:'ASSIGNED', DECLINE_PLAN:'PLAN_DECLINED', SUPPLEMENT_CUSTOMS:'CUSTOMS_PLAN_UPDATED', REJECT:'REJECTED' }[action];
    if(event) await require('../services/notifications').orderEvent(event, order._id, `${order._id}:${updated.operationsVersion}`, {reason:note});
    res.json({success:true,data:updated});
  }catch(e){if(e.name==='ValidationError'||e.name==='CastError')return res.status(400).json({message:e.message});if(e.message&&!e.code)return res.status(400).json({message:e.message});next(e);}
});
module.exports=router;




