const {test}=require('node:test');
const assert=require('node:assert/strict');
const Route=require('../src/models/TransportRoute');
const Order=require('../src/models/Order');
const Horse=require('../src/models/Horse');
const Incident=require('../src/models/Incident');
const Doc=require('../src/models/ComplianceDoc');
const Audit=require('../src/models/AuditLog');
const POD=require('../src/models/DigitalPOD');
const controller=require('../src/controllers/routeController');
const {waypointsFor}=require('../src/services/bookingWorkflow');
const oid=n=>String(n).padStart(24,'0');
const call=async(fn,body,user={_id:oid(2),role:'DRIVER',effectivePermissions:['waypoint:checkin','trip:start']})=>{
 const res={code:200,status(code){this.code=code;return this;},json(value){this.body=value;return this;}};
 await fn({params:{id:oid(1)},body,user,get:()=>'',app:{get:()=>null}},res,e=>{throw e;});return res;
};
test('driver arrival sequence updates customer tracking and only completes after every stop and handover',async t=>{
 const order={_id:oid(3),status:'IN_TRANSIT',customerId:oid(4),horseIds:[oid(5)],destinationStopId:'VN-DN',origin:{countryCode:'VN'},destination:{countryCode:'VN',coordinates:[106.8,10.8]},async save(){}};
 const route=new Route({_id:oid(1),orderId:order._id,driverId:oid(2),escortId:oid(6),vehiclePlateNumber:'QA-TEST',status:'IN_TRANSIT',waypoints:[{sequence:1,name:'Đón',type:'PICKUP',location:{coordinates:[106.7,10.7]},estimatedArrival:new Date()},{sequence:2,name:'Trạm nghỉ',type:'REST_STOP',location:{coordinates:[106.75,10.75]},estimatedArrival:new Date()},{sequence:3,name:'Giao',type:'DELIVERY',location:{coordinates:[106.8,10.8]},estimatedArrival:new Date()}],odometerStart:10,horseMovements:[{horseId:oid(5),loadedAt:new Date()}]});
 let saves=0,moved=0;route.save=async()=>{saves++;};
 t.mock.method(Route,'findById',async()=>route);t.mock.method(Order,'findById',async()=>order);
 t.mock.method(Horse,'updateMany',async()=>{moved++;});t.mock.method(Incident,'exists',async()=>null);t.mock.method(Doc,'find',async()=>[]);t.mock.method(Audit,'create',async()=>({}));
 assert.equal((await call(controller.waypointCheckin,{sequence:3})).code,409);assert.equal(saves,0);
 assert.equal((await call(controller.updateTripStatus,{status:'COMPLETED'})).code,409);
 for(const sequence of [1,2,3]){
   assert.equal((await call(controller.waypointCheckin,{sequence})).code,200);
   assert.equal(route.waypoints[sequence-1].status,'ARRIVED');
   assert.equal(route.currentLocation, null);
   assert.ok(route.waypoints[sequence-1].actualArrival);
 }
 const before=saves;assert.equal((await call(controller.waypointCheckin,{sequence:3})).body.isDuplicate,true);assert.equal(saves,before);
 assert.equal((await call(controller.updateTripStatus,{status:'DELIVERING'})).code,200);
 assert.equal(order.status,'DELIVERING');assert.equal((await call(controller.updateTripStatus,{status:'COMPLETED'})).code,409);
 route.odometerEnd=20;route.horseMovements[0].unloadedAt=new Date();
 assert.equal((await call(controller.updateTripStatus,{status:'COMPLETED'},{_id:oid(6),role:'ESCORT'})).code,403);
 t.mock.method(POD,'exists',async()=>null);
 assert.equal((await call(controller.updateTripStatus,{status:'COMPLETED'})).code,409);
 t.mock.method(POD,'exists',async()=>({_id:oid(9)}));
 assert.equal((await call(controller.updateTripStatus,{status:'COMPLETED'})).code,200);
 assert.equal(route.status,'COMPLETED');assert.equal(order.status,'COMPLETED');assert.equal(moved,1);
});
test('assigned rest stops and road legs are copied into the driver route with rest duration',()=>{
 const order={origin:{address:'A',coordinates:[106,10]},destination:{address:'B',coordinates:[107,11]},requestedDepartureDate:'2027-01-01T00:00:00Z',preparation:{plan:{restStops:[{name:'Nghỉ',coordinates:[106.5,10.5],minutes:45}],road:{legs:[{driveHours:2},{driveHours:1}]}}}};
 const points=waypointsFor(order);assert.deepEqual(points.map(p=>p.type),['PICKUP','REST_STOP','DELIVERY']);
 assert.equal(points[2].estimatedArrival.toISOString(),'2027-01-01T03:45:00.000Z');
});
