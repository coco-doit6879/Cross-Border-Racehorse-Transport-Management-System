import test from 'node:test';
import assert from 'node:assert/strict';
import { customerOrderState, departureDay, matchesCustomerOrder, depositTimeLeft } from '../src/utils/customerOrders.js';

const order = {
  status: 'PENDING_APPROVAL', orderCode: 'BK-005', origin: 'TP. Hồ Chí Minh', destination: 'Đồng Nai',
  horses: ['Storm Runner'], requestedDepartureDate: '2027-03-23T18:00:00Z', departureTimezone: 'Asia/Ho_Chi_Minh',
};
test('search finds Vietnamese locations without accents and horse names', () => {
  assert.equal(matchesCustomerOrder(order, {query:'ho chi minh'}), true);
  assert.equal(matchesCustomerOrder(order, {query:'dong nai'}), true);
  assert.equal(matchesCustomerOrder(order, {query:'STORM RUNNER'}), true);
  assert.equal(matchesCustomerOrder(order, {query:'BK-001'}), false);
});
test('date boundaries use the departure timezone and include both boundary days', () => {
  assert.equal(departureDay(order), '2027-03-24');
  assert.equal(matchesCustomerOrder(order, {from:'2027-03-24',to:'2027-03-24'}), true);
  assert.equal(matchesCustomerOrder(order, {to:'2027-03-23'}), false);
  assert.equal(matchesCustomerOrder({...order,departureLocalDate:'2027-03-25'}, {from:'2027-03-25'}), true);
  assert.equal(matchesCustomerOrder({...order,requestedDepartureDate:null}, {from:'2027-03-24'}), false);
});
test('search, status and date filters combine without losing matches', () => {
  assert.equal(matchesCustomerOrder(order, {query:'storm',status:'waiting',from:'2027-03-24'}), true);
  assert.equal(matchesCustomerOrder(order, {query:'storm',status:'completed'}), false);
});
test('terminal orders never offer payment even if their deposit remains unpaid', () => {
  for (const status of ['CANCELLED','REJECTED','COMPLETED']) {
    const state = customerOrderState({...order,status,depositRequired:true,depositStatus:'UNPAID'});
    assert.equal(Boolean(state.canPay), false);
    assert.equal(state.group, status === 'COMPLETED' ? 'completed' : 'cancelled');
  }
});
test('deposit and remaining balance follow actual payment state', () => {
  const unpaid = {...order,depositRequired:true,depositStatus:'UNPAID',depositAmountVnd:2000000,pricing:{totalAmountVnd:10000000}};
  assert.equal(customerOrderState(unpaid).group,'payment');
  assert.equal(customerOrderState({...unpaid,depositStatus:'PAID'}).group,'waiting');
  assert.equal(customerOrderState({...unpaid,status:'APPROVED',depositStatus:'PAID',paymentStatus:'PARTIALLY_PAID'}).group,'payment');
  assert.equal(customerOrderState({...unpaid,status:'APPROVED',depositStatus:'PAID',paymentStatus:'PAID'}).group,'preparing');
});
test('customer progress follows deposit, approval, balance, planning, crew and driver completion',()=>{
  const base={...order,depositRequired:true,depositStatus:'UNPAID',depositAmountVnd:3000000,depositPercent:30,pricing:{totalAmountVnd:10000000},paymentStatus:'UNPAID'};
  assert.equal(customerOrderState(base).step,2);
  const deposited={...base,depositStatus:'PAID',paymentStatus:'PARTIALLY_PAID'};
  assert.equal(customerOrderState(deposited).step,3);
  const approved={...deposited,status:'APPROVED'};
  assert.equal(customerOrderState(approved).step,4);
  const paid={...approved,paymentStatus:'PAID'};
  assert.match(customerOrderState(paid).label,/Chờ điều phối/);
  assert.equal(customerOrderState(paid).step,5);
  const planned={...paid,preparation:{confirmedAt:'2026-10-24T00:00:00Z'}};
  assert.match(customerOrderState(planned).label,/Chờ phân công/);
  assert.equal(customerOrderState(planned).step,6);
  assert.equal(customerOrderState({...planned,status:'IN_TRANSIT'}).step,7);
  assert.equal(customerOrderState({...planned,status:'COMPLETED'}).group,'completed');
});
test('history selects only delivered and settled orders', () => {
  assert.equal(matchesCustomerOrder({...order,status:'COMPLETED',settlement:{closedAt:'2026-10-23T12:00:00Z'}}, {status:'completed'}),true);
  assert.equal(matchesCustomerOrder({...order,status:'CANCELLED'}, {status:'completed'}),false);
});
test('deposit deadline uses actual due time and percent, with no invented deadline', () => {
  const now = Date.parse('2026-10-23T12:00:00Z');
  assert.equal(depositTimeLeft({...order,depositPercent:20,depositDueAt:'2026-10-23T12:30:00Z'},now),'Đặt cọc 20% trong 30 phút.');
  assert.match(depositTimeLeft({...order,depositDueAt:'2026-10-23T11:00:00Z'},now),/hết thời hạn/);
  assert.equal(depositTimeLeft(order,now),'');
});

