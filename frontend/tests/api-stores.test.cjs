const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
// Exercise the store actions with a controlled API boundary; no database writes.
function loadStore(file, apiName, api) {
  const create = init => { let state; const get = () => state; const set = change => { state = { ...state, ...(typeof change === 'function' ? change(state) : change) }; }; state = init(set, get); return { getState:get }; };
  const source = fs.readFileSync(path.join(__dirname, '../src/store', file), 'utf8').replace(/^import .*;\r?\n/gm, '').replace('export const ', 'const ');
  const name = file.includes('Horse') ? 'useHorseStore' : 'useOrderStore';
  return new Function('create', apiName, source + '\nreturn ' + name)(create, api);
}
test('empty API collections remain empty', async () => {
  for(const [file,apiName,method,fetch,list] of [['useHorseStore.js','horseApi','getHorses','fetchHorses','horses'],['useOrderStore.js','orderApi','getOrders','fetchOrders','orders']]) {
    const store=loadStore(file,apiName,{[method]:async()=>({data:{data:[]}})});
    assert.deepEqual(await store.getState()[fetch](),[]); assert.deepEqual(store.getState()[list],[]);
  }
});
test('failed reads are surfaced instead of replaced by demo data', async () => {
  const error=new Error('offline');
  for(const [file,apiName,method,fetch,list] of [['useHorseStore.js','horseApi','getHorses','fetchHorses','horses'],['useOrderStore.js','orderApi','getOrders','fetchOrders','orders']]) {
    const store=loadStore(file,apiName,{[method]:async()=>{throw error;}});
    await assert.rejects(store.getState()[fetch](), /offline/); assert.deepEqual(store.getState()[list],[]); assert.equal(store.getState().error,'offline');
  }
});
test('failed horse create, edit and review never fabricate success', async () => {
  const fail=async()=>{throw new Error('rejected');};
  const store=loadStore('useHorseStore.js','horseApi',{createHorse:fail,updateHorse:fail,reviewHorse:fail});
  for(const method of ['addHorse','updateHorse','reviewHorse']) await assert.rejects(store.getState()[method]('horse',{}), /rejected/);
  assert.deepEqual(store.getState().horses,[]);
});
test('missing review state is pending, never approved', async () => {
  const store=loadStore('useHorseStore.js','horseApi',{getHorses:async()=>({data:{data:[{_id:'h',name:'Actual horse'}]}})});
  assert.equal((await store.getState().fetchHorses())[0].reviewStatus,'PENDING_REVIEW');
});
test('order creation forwards selected customer and schedule; failures reject', async () => {
  let payload;
  const store=loadStore('useOrderStore.js','orderApi',{createOrder:async p=>{payload=p;return {data:{data:{_id:'o',bookingCode:'REAL',horseIds:[]}}};}});
  await store.getState().createOrder({customerId:'c',departureId:'d',scheduleRevision:3,horseIds:['h']});
  assert.equal(payload.customerId,'c'); assert.equal(payload.scheduleRevision,3); assert.equal(store.getState().orders[0].orderCode,'REAL');
  const failed=loadStore('useOrderStore.js','orderApi',{createOrder:async()=>{throw new Error('invalid');}});
  await assert.rejects(failed.getState().createOrder({}),/invalid/); assert.deepEqual(failed.getState().orders,[]);
});
test('mapping does not invent assignment, GPS coordinates or price', async () => {
  const store=loadStore('useOrderStore.js','orderApi',{getOrders:async()=>({data:{data:[{_id:'o',horseIds:[]}]}})});
  const [order]=await store.getState().fetchOrders(); assert.equal(order.vehiclePlate,null); assert.equal(order.originLocation.coordinates,null); assert.equal(order.pricing,null);
});
test('order store forwards sender and recipient information without flattening it into notes', async () => {
  let payload;
  const contacts = {sender:{fullName:'Test Sender',phone:'0900000000',area:'Area',address:'Farm',identityNumber:'TEST-SENDER'},recipient:{fullName:'Test Recipient',phone:'0900000001',area:'Area',address:'Farm',identityNumber:'TEST-RECIPIENT'}};
  const store=loadStore('useOrderStore.js','orderApi',{createOrder:async p=>{payload=p;return {data:{data:{_id:'o',horseIds:[],contacts:p.contacts}}};}});
  await store.getState().createOrder({departureId:'d',scheduleRevision:1,horseIds:['h'],contacts,specialRequirements:'Care notes'});
  assert.deepEqual(payload.contacts,contacts);
  assert.equal(payload.specialRequirements,'Care notes');
});
