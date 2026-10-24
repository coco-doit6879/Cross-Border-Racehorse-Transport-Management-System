const {test} = require('node:test');
const assert = require('node:assert/strict');
const {normalizeBookingContacts} = require('../src/utils/bookingContacts');
const Order = require('../src/models/Order');
const Horse = require('../src/models/Horse');
const AuditLog = require('../src/models/AuditLog');
const schedule = require('../src/services/transportScheduleService');
const controller = require('../src/controllers/orderController');
const contact = () => ({fullName:' Test Sender ',phone:'+84 900 000 000',area:'Test area',address:'Test farm',identityNumber:'TEST-ID-001',role:'ADMIN'});
const contacts = () => ({sender:contact(),recipient:{...contact(),fullName:'Test Recipient'}});
test('existing clients can omit contacts; new contacts are trimmed and whitelisted',()=>{
  assert.equal(normalizeBookingContacts(undefined),undefined);
  const result=normalizeBookingContacts(contacts());
  assert.equal(result.sender.fullName,'Test Sender');
  assert.equal(result.sender.role,undefined);
  assert.equal(new Order({contacts:result}).contacts.recipient.address,'Test farm');
});
test('reject incomplete, oversized or malformed contact information',()=>{
  for(const value of [null,[],{}, {sender:contact()}, {sender:{...contact(),phone:'abc'},recipient:contact()}, {sender:{...contact(),address:'x'.repeat(301)},recipient:contact()}]) {
    assert.throws(()=>normalizeBookingContacts(value),error=>error.status===400);
  }
});
const request=body=>({body,user:{_id:'111111111111111111111111'},ip:'127.0.0.1',get:()=> 'test'});
const response=()=>({statusCode:200,status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;}});
test('booking controller persists contacts alongside the canonical scheduled route',async t=>{
  const departure={id:'test-departure',originStopId:'VN-HCM',destinationStopId:'VN-HAN',origin:{address:'TP. Hồ Chí Minh',countryCode:'VN',coordinates:[106.7,10.77]},destination:{address:'Hà Nội',countryCode:'VN',coordinates:[105.83,21.02]},requestedDepartureDate:'2026-11-10T01:00:00Z',basePriceVnd:10000000};
  t.mock.method(schedule,'resolveDeparture',async()=>departure);
  t.mock.method(Horse,'find',async()=>[{_id:'222222222222222222222222',reviewStatus:'APPROVED',currentStopId:'VN-HCM'}]);
  t.mock.method(Order,'findOne',async()=>null);
  t.mock.method(Order,'countDocuments',async()=>0);
  t.mock.method(Order,'create',async data=>new Order(data));
  t.mock.method(AuditLog,'create',async()=>({}));
  const res=response();
  await controller.createOrder(request({horseIds:['222222222222222222222222'],departureId:departure.id,scheduleRevision:1,contacts:contacts()}),res,error=>{throw error;});
  assert.equal(res.statusCode,201);
  assert.equal(res.body.data.contacts.sender.fullName,'Test Sender');
  assert.equal(res.body.data.contacts.recipient.identityNumber,'TEST-ID-001');
  assert.equal(res.body.data.origin.countryCode,'VN');
  assert.equal(res.body.data.pricing.totalAmountVnd,10000000);
});
test('invalid contact form returns 400 before any booking is created',async t=>{
  let writes=0;
  t.mock.method(Order,'create',async()=>{writes++;});
  const res=response();
  await controller.createOrder(request({contacts:{}}),res,error=>{throw error;});
  assert.equal(res.statusCode,400);assert.equal(writes,0);
});
