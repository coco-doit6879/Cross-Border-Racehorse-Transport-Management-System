const {test}=require('node:test');
const assert=require('node:assert/strict');
const express=require('express');
const jwt=require('jsonwebtoken');
const Order=require('../src/models/Order'),User=require('../src/models/User'),Vehicle=require('../src/models/Vehicle'),Route=require('../src/models/TransportRoute'),Horse=require('../src/models/Horse'),Audit=require('../src/models/AuditLog');
const oid=n=>n.toString(16).padStart(24,'0'),clone=value=>JSON.parse(JSON.stringify(value));
test('planning API enforces roles, versions, allocations, road welfare and quote gates',async t=>{
 let orders,vehicles,staff,routes,roadHours=1,writes;
 const actorRoles={[oid(1)]:'LOGISTICS_MANAGER',[oid(2)]:'FLEET_COORDINATOR',[oid(3)]:'CUSTOMER'};
 const reset=()=>{
  orders=[{_id:oid(10),bookingCode:'TEST-PLAN',status:'PENDING_APPROVAL',operationsVersion:0,requestedDepartureDate:'2027-01-01T01:00:00Z',origin:{address:'A',coordinates:[106.7,10.77],countryCode:'VN'},destination:{address:'B',coordinates:[106.75,10.8],countryCode:'VN'},horseIds:[{_id:oid(20),name:'Test horse',reviewStatus:'APPROVED'}],pricing:{totalAmountVnd:10000000},paymentStatus:'UNPAID',depositStatus:'PAID'}];
  vehicles=[{_id:oid(30),status:'ACTIVE',plateNumber:'TEST-01',capacityHorses:2,registrationExpiresAt:'2028-01-01',inspectionExpiresAt:'2028-01-01'}];
  staff=[{_id:oid(40),role:'TRANSPORT_SPECIALIST',isActive:true},{_id:oid(2),role:'FLEET_COORDINATOR',isActive:true},{_id:oid(41),role:'DRIVER',isActive:true},{_id:oid(42),role:'ESCORT',isActive:true}];routes=[];roadHours=1;writes=0;
 };
 reset();t.beforeEach(reset);
 const chain=get=>{const q={populate:()=>q,select:()=>q,sort:()=>q,lean:async()=>clone(get())};return q;};
 t.mock.method(Order,'find',()=>chain(()=>orders));t.mock.method(Vehicle,'find',()=>chain(()=>vehicles));t.mock.method(User,'find',()=>chain(()=>staff));t.mock.method(Route,'find',()=>chain(()=>routes));
 t.mock.method(User,'findById',actor=>({select:async()=>({_id:actor,role:actorRoles[actor],isActive:true})}));
 t.mock.method(Order,'findOneAndUpdate',async(query,update)=>{const o=orders.find(o=>o._id===query._id);if(!o||o.operationsVersion!==query.operationsVersion)return null;Object.assign(o,clone(update.$set));o.operationsVersion++;writes++;return clone(o);});
 t.mock.method(Route,'findOne',async(query)=>routes.find(r=>r.orderId===String(query.orderId))||null);
 t.mock.method(Route,'create',async(value)=>{const route={...clone(value),_id:oid(90)};routes.push(route);return route;});
 t.mock.method(Route,'deleteOne',async(q)=>{routes=routes.filter(r=>r._id!==q._id);});
 t.mock.method(Horse,'updateMany',async()=>{orders[0].horseIds.forEach(h=>h.reviewStatus='PENDING_REVIEW');});
 t.mock.method(Audit,'create',async()=>({}));
 const fetchReal=global.fetch;
 t.mock.method(global,'fetch',async(url,options)=>{
  if(String(url).startsWith('https://router.project-osrm.org/'))return {ok:true,json:async()=>({code:'Ok',routes:[{distance:5000,duration:roadHours*3600,geometry:{coordinates:[[106.7,10.77],[106.75,10.8]]},legs:[{distance:5000,duration:roadHours*3600}]}]})};
  return fetchReal(url,options);
 });
 const app=express();app.use(express.json());app.use('/planning',require('../src/routes/planningRoutes'));app.use((err,req,res,next)=>res.status(500).json({message:err.message}));
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base=`http://127.0.0.1:${server.address().port}/planning`;
 const request=async(role,action,extra={})=>{
  const headers={'Content-Type':'application/json'};if(role)headers.Authorization=`Bearer ${jwt.sign({id:oid(role==='manager'?1:role==='coordinator'?2:3)},process.env.JWT_SECRET||'cbrt_super_secret_jwt_key_2026')}`;
  const response=await fetchReal(action?`${base}/${oid(10)}`:base,{method:action?'PATCH':'GET',headers,...(action?{body:JSON.stringify({version:orders[0].operationsVersion,action,...extra})}:{})});return {status:response.status,body:await response.json()};
 };
 const slots=()=>[{vehicleId:oid(30),horseIds:[oid(20)]}];
 const receive=async()=>{const result=await request('manager','RECEIVE');assert.equal(result.status,200,JSON.stringify(result.body));};
 const confirm=async()=>{orders[0].paymentStatus='PAID';const result=await request('coordinator','CONFIRM_PLAN',{plan:{vehicles:slots(),restStops:[]}});assert.equal(result.status,200,JSON.stringify(result.body));};
 const crew=()=>[{...slots()[0],driverId:oid(41),escortId:oid(42)}];
 await t.test('anonymous and customer cannot read planning or perform intake',async()=>{
  assert.equal((await request(null)).status,401);assert.equal((await request('customer')).status,403);assert.equal((await request('coordinator','RECEIVE')).status,403);assert.equal(writes,0);
 });
 await t.test('only deposited, health-approved orders can be approved before balance payment',async()=>{
  orders[0].depositStatus='UNPAID';assert.equal((await request('manager','APPROVE_ORDER')).status,409);
  orders[0].depositStatus='PAID';orders[0].horseIds[0].reviewStatus='PENDING_REVIEW';assert.equal((await request('manager','APPROVE_ORDER')).status,409);
  orders[0].horseIds[0].reviewStatus='APPROVED';await receive();assert.equal(orders[0].status,'APPROVED');assert.equal(orders[0].paymentStatus,'UNPAID');
  assert.equal((await request('coordinator','CONFIRM_PLAN',{plan:{vehicles:slots(),restStops:[]}})).status,409);
  assert.equal((await request('manager','RECEIVE')).status,409);
 });
 await t.test('stale versions cannot overwrite an intake action',async()=>{
  await receive();assert.equal((await request('coordinator','SAVE_PLAN',{version:0,plan:{vehicles:slots()}})).status,409);assert.equal(writes,1);
 });
 await t.test('manager cannot confirm a fleet plan; missing or duplicated horses are rejected',async()=>{
  await receive();orders[0].paymentStatus='PAID';assert.equal((await request('manager','CONFIRM_PLAN',{plan:{vehicles:slots()}})).status,403);
  assert.equal((await request('coordinator','CONFIRM_PLAN',{plan:{vehicles:[{vehicleId:oid(30),horseIds:[]}]}})).status,400);assert.equal(writes,1);
 });
 await t.test('confirmation rejects more than four driving hours between stops',async()=>{
  await receive();orders[0].paymentStatus='PAID';roadHours=5;const result=await request('coordinator','CONFIRM_PLAN',{plan:{vehicles:slots(),restStops:[]}});assert.equal(result.status,400);assert.match(result.body.message,/4 giờ/);assert.equal(orders[0].preparation.confirmedAt,undefined);
 });
 await t.test('valid plan confirmation persists road estimates and one allocation per horse',async()=>{
  await receive();await confirm();assert.ok(orders[0].preparation.confirmedAt);assert.equal(orders[0].preparation.plan.road.source,'OSRM');assert.deepEqual(orders[0].preparation.plan.vehicles,slots());
 });
 await t.test('confirmed plan cannot be confirmed or edited twice, even with the current version',async()=>{
  await receive();await confirm();assert.equal((await request('coordinator','CONFIRM_PLAN',{plan:{vehicles:slots(),restStops:[]}})).status,409);assert.equal((await request('coordinator','SAVE_PLAN',{plan:{vehicles:slots(),restStops:[]}})).status,409);
 });
 await t.test('only manager assigns active distinct crew after full payment and confirmation',async()=>{
  await receive();assert.equal((await request('manager','ASSIGN_CREW',{vehicles:crew()})).status,409);await confirm();
  assert.equal((await request('coordinator','ASSIGN_CREW',{vehicles:crew()})).status,403);
  const invalid=crew();invalid[0].escortId=oid(41);assert.equal((await request('manager','SAVE_CREW',{vehicles:invalid})).status,400);
  staff.find(p=>p.role==='DRIVER').operationalStatus='RETURNING';assert.equal((await request('manager','ASSIGN_CREW',{vehicles:crew()})).status,400);
  staff.find(p=>p.role==='DRIVER').operationalStatus='AVAILABLE';assert.equal((await request('manager','ASSIGN_CREW',{vehicles:crew()})).status,200);
  assert.equal(routes.length,1);assert.equal(routes[0].driverId,oid(41));assert.equal(routes[0].waypoints.at(-1).type,'DELIVERY');assert.ok(orders[0].preparation.assignedAt);
  assert.equal(orders[0].status,'APPROVED');assert.equal((await request('manager','ASSIGN_CREW',{vehicles:crew()})).status,409);assert.equal(routes.length,1);
 });
 await t.test('coordinator decline requests management review without cancelling a paid booking',async()=>{
  await receive();orders[0].paymentStatus='PAID';assert.equal((await request('coordinator','DECLINE_PLAN',{note:'Không đủ xe'})).status,200);assert.equal(orders[0].status,'APPROVED');
 });

});
