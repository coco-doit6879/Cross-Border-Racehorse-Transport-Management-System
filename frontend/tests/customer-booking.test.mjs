import test from 'node:test';
import assert from 'node:assert/strict';
import { bookingRoutes, bookingTotal, horseBookingIssue } from '../src/utils/customerBooking.js';
const catalog = {
  countries:[{code:'VN',name:'Việt Nam'},{code:'KH',name:'Campuchia'}],
  stops:[{id:'hcm',countryCode:'VN'},{id:'han',countryCode:'VN'},{id:'pnh',countryCode:'KH'}],
  rules:[{originStopId:'hcm',destinationStopId:'han',active:true},{originStopId:'hcm',destinationStopId:'pnh',active:true},{originStopId:'pnh',destinationStopId:'hcm',active:false}],
};
test('domestic and international choices use only active published routes',()=>{
  assert.equal(bookingRoutes(catalog,'','VN','VN','').rules.length,0);
  assert.deepEqual(bookingRoutes(catalog,'domestic','VN','VN','hcm').destinations.map(s=>s.id),['han']);
  assert.deepEqual(bookingRoutes(catalog,'international','VN','KH','hcm').destinations.map(s=>s.id),['pnh']);
  assert.equal(bookingRoutes(catalog,'international','KH','VN','pnh').origins.length,0);
});
test('route choices reset impossible origin and destination combinations',()=>{
  assert.deepEqual(bookingRoutes(catalog,'international','VN','KH','').origins.map(s=>s.id),['hcm']);
  assert.equal(bookingRoutes(catalog,'international','VN','KH','han').destinations.length,0);
});
test('price includes services per horse or per order and uses server deposit percentage',()=>{
  const cost=bookingTotal({basePriceVnd:9000000},2,[{unitPriceVnd:2000000,pricingMode:'PER_HORSE'},{unitPriceVnd:3000000,pricingMode:'PER_ORDER'}],20);
  assert.deepEqual(cost,{base:18000000,services:7000000,total:25000000,deposit:5000000});
});
test('horse eligibility checks review, pickup location and existing reservations',()=>{
  const horse={id:'h',currentStopId:'hcm',reviewStatus:'APPROVED'};
  assert.equal(horseBookingIssue(horse,'hcm',[]),'');
  assert.ok(horseBookingIssue(horse,'han',[]));
  assert.ok(horseBookingIssue({...horse,reviewStatus:'PENDING_REVIEW'},'hcm',[]));
  const reservation={status:'PENDING_APPROVAL',horseIds:[{_id:'h'}],depositRequired:true,depositStatus:'UNPAID',depositDueAt:'2026-10-23T13:00:00Z'};
  assert.ok(horseBookingIssue(horse,'hcm',[reservation],Date.parse('2026-10-23T12:00:00Z')));
  assert.equal(horseBookingIssue(horse,'hcm',[reservation],Date.parse('2026-10-23T14:00:00Z')),'');
});
