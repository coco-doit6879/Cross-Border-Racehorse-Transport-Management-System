const {test}=require('node:test');
const assert=require('node:assert/strict');
const Route=require('../src/models/TransportRoute');const Order=require('../src/models/Order');const POD=require('../src/models/DigitalPOD');const Doc=require('../src/models/ComplianceDoc');const Incident=require('../src/models/Incident');const Audit=require('../src/models/AuditLog');
const {deliveryProblem}=require('../src/services/operationsWorkflow');const controller=require('../src/controllers/podController');
const oid=n=>String(n).padStart(24,'0');
function fixture(){return {route:{_id:oid(1),orderId:oid(2),status:'DELIVERING',waypoints:[{type:'DELIVERY',status:'ARRIVED',actualArrival:new Date()}],odometerStart:10,odometerEnd:20,horseMovements:[{horseId:oid(4),unloadedAt:new Date()}]},order:{_id:oid(2),customerId:oid(3),horseIds:[oid(4)],origin:{countryCode:'VN'},destination:{countryCode:'VN'}}};}
test('delivery requires destination check-in, not device GPS',async t=>{t.mock.method(Doc,'find',async()=>[]);t.mock.method(Incident,'exists',async()=>null);const {route,order}=fixture();assert.equal(await deliveryProblem(route,order),null);route.waypoints[0].status='PENDING';assert.match(await deliveryProblem(route,order),/check-in/);});
test('customer signs POD without coordinates after driver check-in and unload',async t=>{
 const {route,order}=fixture();let created;
 t.mock.method(Route,'findById',async()=>route);t.mock.method(Order,'findById',async()=>order);t.mock.method(POD,'findOne',async()=>null);t.mock.method(POD,'create',async p=>{created=p;return {_id:oid(5),...p};});t.mock.method(Doc,'find',async()=>[]);t.mock.method(Incident,'exists',async()=>null);t.mock.method(Audit,'create',async()=>({}));
 const req={user:{_id:oid(3)},body:{tripId:oid(1),orderId:oid(2),signerName:'Customer',signerPhone:'0901234567',signerRole:'CUSTOMER',signatureImageUrl:'data:image/png;base64,AAAA',horseConditionsOnArrival:[{horseId:oid(4),conditionStatus:'GOOD'}]},get:()=>''};
 const res={code:200,status(c){this.code=c;return this;},json(b){this.body=b;return this;}};
 await controller.signPOD(req,res,e=>{throw e;});assert.equal(res.code,201);assert.equal(created.confirmationMethod,'DRIVER_CHECKIN');assert.equal(created.locationSigned,undefined);
 route.horseMovements=[];created=null;await controller.signPOD(req,res,e=>{throw e;});assert.equal(res.code,409);assert.equal(created,null);
});
