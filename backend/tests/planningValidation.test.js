const {test}=require('node:test');
const assert=require('node:assert/strict');
const {resourceIssue,validateSlots}=require('../src/services/planningValidation');
const order={_id:'o',requestedDepartureDate:'2027-01-01T00:00:00Z',horseIds:[{_id:'h1'},{_id:'h2'}]};
const vehicle={_id:'v',status:'ACTIVE',capacityHorses:2,registrationExpiresAt:'2028-01-01',inspectionExpiresAt:'2028-01-01'};
test('vehicle blocks maintenance, expired or missing paperwork and active trips',()=>{
 assert.equal(resourceIssue(vehicle,'vehicle',order),'');
 assert.match(resourceIssue({...vehicle,status:'MAINTENANCE'},'vehicle',order),/bảo dưỡng/);
 assert.match(resourceIssue({...vehicle,inspectionExpiresAt:'2026-01-01'},'vehicle',order),/đăng kiểm/);
 assert.match(resourceIssue({...vehicle,registrationExpiresAt:null},'vehicle',order),/đăng ký/);
 assert.match(resourceIssue(vehicle,'vehicle',order,[],[{orderId:'other',status:'IN_TRANSIT',vehicleId:'v'}]),/chuyến khác/);
 assert.equal(resourceIssue(vehicle,'vehicle',order,[],[{orderId:'o',status:'SCHEDULED',vehicleId:'v'}]),'');
});
test('personnel blocks inactive, wrong role, returning and overlapping confirmed plans',()=>{
 const driver={_id:'d',role:'DRIVER',isActive:true};
 assert.equal(resourceIssue(driver,'driver',order),'');
 assert.ok(resourceIssue({...driver,isActive:false},'driver',order));
 assert.ok(resourceIssue(driver,'escort',order));
 assert.match(resourceIssue({...driver,operationalStatus:'RETURNING'},'driver',order),/trở về/);
 assert.match(resourceIssue(driver,'driver',order,[{_id:'other',requestedDepartureDate:'2027-01-02',preparation:{confirmedAt:'2026-10-24',plan:{vehicles:[{driverId:'d'}]}}}]),/Trùng phương án/);
});
test('allocation must cover every horse exactly once, respect capacity and unique vehicles',()=>{
 assert.deepEqual(validateSlots(order,[{vehicleId:'v',horseIds:['h1','h2']}],[vehicle],[],[]),[{vehicleId:'v',horseIds:['h1','h2']}]);
 assert.throws(()=>validateSlots(order,[{vehicleId:'v',horseIds:['h1']}],[vehicle],[],[]),/đủ mỗi ngựa/);
 assert.throws(()=>validateSlots(order,[{vehicleId:'v',horseIds:['h1','h1']}],[vehicle],[],[]),/đủ mỗi ngựa/);
 assert.throws(()=>validateSlots(order,[{vehicleId:'v',horseIds:['h1','h2']}],[{...vehicle,capacityHorses:1}],[],[]),/vượt tải/);
 assert.throws(()=>validateSlots(order,[{vehicleId:'v',horseIds:['h1']},{vehicleId:'v',horseIds:['h2']}],[vehicle],[],[]),/hai lần/);
});
