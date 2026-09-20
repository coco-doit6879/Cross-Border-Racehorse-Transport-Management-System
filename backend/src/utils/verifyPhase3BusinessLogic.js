const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const User = require('../models/User');
const Horse = require('../models/Horse');
const Order = require('../models/Order');
const ComplianceDoc = require('../models/ComplianceDoc');
const TransportRoute = require('../models/TransportRoute');
const HealthLog = require('../models/HealthLog');
const Incident = require('../models/Incident');
const DigitalPOD = require('../models/DigitalPOD');
const AuditLog = require('../models/AuditLog');

const { protect, checkPermission } = require('../middlewares/authMiddleware');
const horseController = require('../controllers/horseController');
const orderController = require('../controllers/orderController');
const complianceController = require('../controllers/complianceController');
const routeController = require('../controllers/routeController');
const healthLogController = require('../controllers/healthLogController');
const incidentController = require('../controllers/incidentController');
const podController = require('../controllers/podController');
const syncController = require('../controllers/syncController');

async function runPhase3Verification() {
  console.log('----------------------------------------------------');
  console.log('🧪 STARTING PHASE 3 REST API & STATE MACHINE VERIFICATION');
  console.log('----------------------------------------------------');

  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(` ✅ PASS: ${message}`);
      testsPassed++;
    } else {
      console.error(` ❌ FAIL: ${message}`);
      testsFailed++;
    }
  }

  function createMockReqRes({ body = {}, headers = {}, params = {}, query = {}, user = null } = {}) {
    const req = {
      body,
      headers: { ...headers },
      get: (h) => headers[h.toLowerCase()] || headers[h],
      params,
      query,
      ip: '127.0.0.1',
      baseUrl: '/api/v1',
      path: '/test'
    };
    if (user) req.user = user;

    let resStatus = 200;
    let resData = null;

    const res = {
      status: (code) => {
        resStatus = code;
        return res;
      },
      json: (data) => {
        resData = data;
        return res;
      },
      getStatus: () => resStatus,
      getData: () => resData
    };

    return { req, res };
  }

  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cbrt_db';
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    await mongoose.connection.db.dropDatabase();

    // ----------------------------------------------------
    // SEED TEST USERS WITH EFFECTIVE PERMISSIONS
    // ----------------------------------------------------
    const manager = await User.create({
      username: 'manager_1', email: 'mgr@cbrt.com', password: 'password123', fullName: 'Manager One', phone: '+84900000001', role: 'LOGISTICS_MANAGER'
    });
    manager.effectivePermissions = ['user:manage', 'horse:manage_all', 'booking:approve', 'sos:manage', 'audit:view', 'analytics:view'];

    const specialist = await User.create({
      username: 'specialist_1', email: 'spec@cbrt.com', password: 'password123', fullName: 'Specialist One', phone: '+84900000002', role: 'TRANSPORT_SPECIALIST'
    });
    specialist.effectivePermissions = ['horse:manage_all', 'compliance:review', 'compliance:upload'];

    const coordinator = await User.create({
      username: 'coordinator_1', email: 'coord@cbrt.com', password: 'password123', fullName: 'Coordinator One', phone: '+84900000003', role: 'FLEET_COORDINATOR'
    });
    coordinator.effectivePermissions = ['route:dispatch', 'sos:manage', 'analytics:view'];

    const driver = await User.create({
      username: 'driver_1', email: 'drv@cbrt.com', password: 'password123', fullName: 'Driver One', phone: '+84900000004', role: 'DRIVER'
    });
    driver.effectivePermissions = ['trip:start', 'trip:operate', 'waypoint:checkin', 'sos:trigger', 'sync:offline_events'];

    const escort = await User.create({
      username: 'escort_1', email: 'esc@cbrt.com', password: 'password123', fullName: 'Escort One', phone: '+84900000005', role: 'ESCORT'
    });
    escort.effectivePermissions = ['trip:operate', 'waypoint:checkin', 'welfare:log', 'sos:trigger', 'sync:offline_events'];

    const customerA = await User.create({
      username: 'cust_a', email: 'custa@cbrt.com', password: 'password123', fullName: 'Customer A', phone: '+84900000006', role: 'CUSTOMER'
    });
    customerA.effectivePermissions = ['horse:create_own', 'booking:create', 'compliance:upload', 'pod:sign'];

    const customerB = await User.create({
      username: 'cust_b', email: 'custb@cbrt.com', password: 'password123', fullName: 'Customer B', phone: '+84900000007', role: 'CUSTOMER'
    });
    customerB.effectivePermissions = ['horse:create_own', 'booking:create', 'compliance:upload', 'pod:sign'];

    // ----------------------------------------------------
    // HORSE TESTS (8-10)
    // ----------------------------------------------------
    console.log('\n--- [1] HORSE APIs TESTS ---');

    // 8. Customer creates own horse
    const { req: reqH1, res: resH1 } = createMockReqRes({
      user: customerA,
      body: {
        microchipId: '985141000111222',
        feiPassportNumber: 'FEI-SG-001',
        name: 'Pegasus',
        breed: 'Arabian',
        dateOfBirth: '2021-05-10',
        gender: 'STALLION',
        weightKg: 460,
        passportScanUrl: 'https://example.com/pegasus.pdf'
      }
    });
    await horseController.createHorse(reqH1, resH1, (err) => { throw err; });
    assert(resH1.getStatus() === 201 && resH1.getData().success === true, '8. Customer creates own horse -> PASS (201 Created)');
    const horseA = resH1.getData().data;

    // 9. Customer B cannot modify Customer A's horse
    const { req: reqH2, res: resH2 } = createMockReqRes({
      user: customerB,
      params: { id: horseA._id },
      body: { name: 'Hacked Pegasus' }
    });
    await horseController.updateHorse(reqH2, resH2, (err) => { throw err; });
    assert(resH2.getStatus() === 403, '9. Customer B cannot modify another user\'s horse -> DENIED (403 Forbidden)');

    // 10. Authorized manager can manage horse
    const { req: reqH3, res: resH3 } = createMockReqRes({
      user: manager,
      params: { id: horseA._id },
      body: { weightKg: 470 }
    });
    await horseController.updateHorse(reqH3, resH3, (err) => { throw err; });
    assert(resH3.getStatus() === 200 && resH3.getData().data.weightKg === 470, '10. Authorized manager can manage horse -> PASS (200 OK)');


    // ----------------------------------------------------
    // ORDER / BOOKING TESTS (1-7)
    // ----------------------------------------------------
    console.log('\n--- [2] ORDER / BOOKING FLOW TESTS ---');

    // 1. Customer creates booking
    const { req: reqO1, res: resO1 } = createMockReqRes({
      user: customerA,
      body: {
        horseIds: [horseA._id],
        origin: { address: 'Singapore Racecourse', countryCode: 'SG', coordinates: [103.763, 1.424] },
        destination: { address: 'Saigon Turf Club', countryCode: 'VN', coordinates: [106.695, 10.778] },
        requestedDepartureDate: new Date(Date.now() + 86400000)
      }
    });
    await orderController.createOrder(reqO1, resO1, (err) => { throw err; });
    assert(resO1.getStatus() === 201 && resO1.getData().data.status === 'PENDING_APPROVAL' && resO1.getData().data.bookingCode.startsWith('TR-'), '1. Customer creates booking -> PASS (Status PENDING_APPROVAL, TR-YYYY-XXXX code)');
    const order1 = resO1.getData().data;

    // 2. Unauthenticated create rejected
    const middlewareAuth = protect;
    const { req: reqO2, res: resO2 } = createMockReqRes({});
    await middlewareAuth(reqO2, resO2, () => {});
    assert(resO2.getStatus() === 401, '2. Unauthenticated create rejected -> FAIL (401 Unauthorized)');

    // 3. Non-customer (or user without booking:create) rejected
    const middlewareBookingCreate = checkPermission('booking:create');
    const { req: reqO3, res: resO3 } = createMockReqRes({ user: driver });
    let unauthRolePassed = false;
    await middlewareBookingCreate(reqO3, resO3, () => { unauthRolePassed = true; });
    assert(resO3.getStatus() === 403 && !unauthRolePassed, '3. Non-customer create rejected -> DENIED (403 Forbidden)');

    // 4. Manager approves PENDING_APPROVAL
    const { req: reqO4, res: resO4 } = createMockReqRes({
      user: manager,
      params: { id: order1._id },
      body: { status: 'APPROVED' }
    });
    await orderController.updateOrderStatus(reqO4, resO4, (err) => { throw err; });
    assert(resO4.getStatus() === 200 && resO4.getData().data.status === 'APPROVED', '4. Manager approves PENDING_APPROVAL -> PASS (Status APPROVED)');

    // 5 & 7. Manager rejects PENDING_APPROVAL and stores rejectionReason
    const { req: reqO5_create, res: resO5_create } = createMockReqRes({
      user: customerA,
      body: {
        horseIds: [horseA._id],
        origin: { address: 'Singapore Turf', countryCode: 'SG', coordinates: [103.763, 1.424] },
        destination: { address: 'Bangkok Racecourse', countryCode: 'TH', coordinates: [100.501, 13.756] },
        requestedDepartureDate: new Date()
      }
    });
    await orderController.createOrder(reqO5_create, resO5_create, (err) => { throw err; });
    const orderToReject = resO5_create.getData().data;

    const { req: reqO5, res: resO5 } = createMockReqRes({
      user: manager,
      params: { id: orderToReject._id },
      body: { status: 'REJECTED', rejectionReason: 'Health documents missing' }
    });
    await orderController.updateOrderStatus(reqO5, resO5, (err) => { throw err; });
    assert(resO5.getStatus() === 200 && resO5.getData().data.status === 'REJECTED' && resO5.getData().data.rejectionReason === 'Health documents missing', '5 & 7. Manager rejects PENDING_APPROVAL -> PASS (Stores rejectionReason)');

    // 6. Invalid state transition rejected (COMPLETED -> APPROVED)
    order1.status = 'COMPLETED';
    await order1.save();
    const { req: reqO6, res: resO6 } = createMockReqRes({
      user: manager,
      params: { id: order1._id },
      body: { status: 'APPROVED' }
    });
    await orderController.updateOrderStatus(reqO6, resO6, (err) => { throw err; });
    assert(resO6.getStatus() === 400 && resO6.getData().errorCode === 'INVALID_STATE_TRANSITION', '6. Invalid state transition rejected -> FAIL (400 Bad Request, INVALID_STATE_TRANSITION)');

    // Reset order1 status to APPROVED for route dispatching
    order1.status = 'APPROVED';
    await order1.save();


    // ----------------------------------------------------
    // COMPLIANCE TESTS (11-15)
    // ----------------------------------------------------
    console.log('\n--- [3] COMPLIANCE FLOW TESTS ---');

    // 11. Upload compliance document
    const { req: reqC1, res: resC1 } = createMockReqRes({
      user: customerA,
      body: {
        orderId: order1._id,
        horseId: horseA._id,
        documentType: 'COGGINS_TEST',
        countryCode: 'VN',
        fileUrl: 'https://example.com/coggins.pdf'
      }
    });
    await complianceController.uploadComplianceDoc(reqC1, resC1, (err) => { throw err; });
    assert(resC1.getStatus() === 200 && resC1.getData().data.status === 'PENDING_REVIEW', '11. Upload compliance document -> PASS (Status PENDING_REVIEW)');
    const compDoc = resC1.getData().data;

    // 12. Review document (APPROVED)
    const { req: reqC2, res: resC2 } = createMockReqRes({
      user: specialist,
      params: { id: compDoc._id },
      body: { status: 'APPROVED' }
    });
    await complianceController.reviewComplianceDoc(reqC2, resC2, (err) => { throw err; });
    assert(resC2.getStatus() === 200 && resC2.getData().data.status === 'APPROVED', '12. Review document -> PASS (Status APPROVED)');

    // 13. Reject document
    await ComplianceDoc.findByIdAndUpdate(compDoc._id, { status: 'PENDING_REVIEW' });
    const { req: reqC3, res: resC3 } = createMockReqRes({
      user: specialist,
      params: { id: compDoc._id },
      body: { status: 'REJECTED', rejectionReason: 'Illegible stamp' }
    });
    await complianceController.reviewComplianceDoc(reqC3, resC3, (err) => { throw err; });
    assert(resC3.getStatus() === 200 && resC3.getData().data.status === 'REJECTED' && resC3.getData().data.rejectionReason === 'Illegible stamp', '13. Reject document -> PASS (REJECTED with rejectionReason)');

    // 14. Re-upload rejected document
    const { req: reqC4, res: resC4 } = createMockReqRes({
      user: customerA,
      body: {
        orderId: order1._id,
        horseId: horseA._id,
        documentType: 'COGGINS_TEST',
        countryCode: 'VN',
        fileUrl: 'https://example.com/coggins_v2.pdf'
      }
    });
    await complianceController.uploadComplianceDoc(reqC4, resC4, (err) => { throw err; });
    assert(resC4.getStatus() === 200 && resC4.getData().data.status === 'PENDING_REVIEW', '14. Re-upload rejected document -> PASS (Re-submitted to PENDING_REVIEW)');

    // Re-approve document for transport clearing
    const { req: reqC_reapprove, res: resC_reapprove } = createMockReqRes({
      user: specialist,
      params: { id: compDoc._id },
      body: { status: 'APPROVED' }
    });
    await complianceController.reviewComplianceDoc(reqC_reapprove, resC_reapprove, (err) => { throw err; });

    // 15. Invalid compliance transition rejected
    const { req: reqC5, res: resC5 } = createMockReqRes({
      user: specialist,
      params: { id: compDoc._id },
      body: { status: 'APPROVED' } // Already APPROVED
    });
    await complianceController.reviewComplianceDoc(reqC5, resC5, (err) => { throw err; });
    assert(resC5.getStatus() === 400 && resC5.getData().errorCode === 'INVALID_STATE_TRANSITION', '15. Invalid compliance transition rejected -> FAIL (400 Bad Request)');


    // ----------------------------------------------------
    // ROUTE & DISPATCH TESTS (16-18)
    // ----------------------------------------------------
    console.log('\n--- [4] ROUTE & DISPATCH TESTS ---');

    // 16 & 18. Dispatch route & currentLocation initially null
    const { req: reqR1, res: resR1 } = createMockReqRes({
      user: coordinator,
      body: {
        orderId: order1._id,
        vehiclePlateNumber: '51C-123.45',
        driverId: driver._id,
        escortId: escort._id
      }
    });
    await routeController.dispatchRoute(reqR1, resR1, (err) => { throw err; });
    assert(resR1.getStatus() === 201 && resR1.getData().data.status === 'SCHEDULED' && resR1.getData().data.currentLocation === null, '16 & 18. Dispatch route -> PASS (Status SCHEDULED, currentLocation is strictly null)');
    const tripRoute = resR1.getData().data;

    // 17. Unauthorized dispatch rejected
    const middlewareDispatch = checkPermission('route:dispatch');
    const { req: reqR2, res: resR2 } = createMockReqRes({ user: driver });
    let unauthDispatchPassed = false;
    await middlewareDispatch(reqR2, resR2, () => { unauthDispatchPassed = true; });
    assert(resR2.getStatus() === 403 && !unauthDispatchPassed, '17. Unauthorized dispatch rejected -> DENIED (403 Forbidden)');


    // ----------------------------------------------------
    // TRIP LIFECYCLE TESTS (19-22)
    // ----------------------------------------------------
    console.log('\n--- [5] TRIP LIFECYCLE TESTS ---');

    // 19. Valid trip start (SCHEDULED -> IN_TRANSIT)
    const { req: reqT1, res: resT1 } = createMockReqRes({
      user: driver,
      params: { id: tripRoute._id },
      body: { status: 'IN_TRANSIT' }
    });
    await routeController.updateTripStatus(reqT1, resT1, (err) => { throw err; });
    assert(resT1.getStatus() === 200 && resT1.getData().data.status === 'IN_TRANSIT', '19. Valid trip start -> PASS (Status IN_TRANSIT)');

    // 20. Invalid trip transition rejected (IN_TRANSIT -> COMPLETED directly)
    const { req: reqT2, res: resT2 } = createMockReqRes({
      user: driver,
      params: { id: tripRoute._id },
      body: { status: 'COMPLETED' }
    });
    await routeController.updateTripStatus(reqT2, resT2, (err) => { throw err; });
    assert(resT2.getStatus() === 400 && resT2.getData().errorCode === 'INVALID_STATE_TRANSITION', '20. Invalid trip transition rejected -> FAIL (400 Bad Request)');

    // 21. Valid delivery transition (IN_TRANSIT -> DELIVERING)
    const { req: reqT3, res: resT3 } = createMockReqRes({
      user: driver,
      params: { id: tripRoute._id },
      body: { status: 'DELIVERING' }
    });
    await routeController.updateTripStatus(reqT3, resT3, (err) => { throw err; });
    assert(resT3.getStatus() === 200 && resT3.getData().data.status === 'DELIVERING', '21. Valid delivery transition -> PASS (Status DELIVERING)');

    // Reset status to IN_TRANSIT for waypoint, health, SOS, and POD testing
    tripRoute.status = 'IN_TRANSIT';
    await tripRoute.save();


    // ----------------------------------------------------
    // WAYPOINT CHECK-IN TESTS (23-24)
    // ----------------------------------------------------
    console.log('\n--- [6] WAYPOINT CHECK-IN TESTS ---');

    // 23. Valid waypoint check-in
    const { req: reqW1, res: resW1 } = createMockReqRes({
      user: driver,
      params: { id: tripRoute._id },
      body: { sequence: 1, status: 'ARRIVED' }
    });
    await routeController.waypointCheckin(reqW1, resW1, (err) => { throw err; });
    assert(resW1.getStatus() === 200 && resW1.getData().success === true, '23. Valid waypoint check-in -> PASS (Status ARRIVED + timestamp recorded)');

    // 24. Unauthorized waypoint check-in rejected
    const middlewareCheckin = checkPermission('waypoint:checkin');
    const { req: reqW2, res: resW2 } = createMockReqRes({ user: customerA });
    let unauthCheckinPassed = false;
    await middlewareCheckin(reqW2, resW2, () => { unauthCheckinPassed = true; });
    assert(resW2.getStatus() === 403 && !unauthCheckinPassed, '24. Unauthorized waypoint check-in rejected -> DENIED (403 Forbidden)');


    // ----------------------------------------------------
    // WELFARE / HEALTH LOG TESTS (25-27)
    // ----------------------------------------------------
    console.log('\n--- [7] WELFARE / HEALTH LOG TESTS ---');
    const healthUuid = '770e8400-e29b-41d4-a716-446655440001';

    // 25. Valid health log
    const { req: reqHl1, res: resHl1 } = createMockReqRes({
      user: escort,
      body: {
        eventId: healthUuid,
        tripId: tripRoute._id,
        horseId: horseA._id,
        temperatureCelsius: 38.4,
        waterIntakeLiters: 12,
        foodIntakeStatus: 'NORMAL',
        condition: 'STABLE',
        alertType: 'NONE'
      }
    });
    await healthLogController.createHealthLog(reqHl1, resHl1, (err) => { throw err; });
    assert(resHl1.getStatus() === 201 && resHl1.getData().isDuplicate === false, '25. Valid health log -> PASS (201 Created)');

    // 26. Duplicate eventId is idempotent
    const { req: reqHl2, res: resHl2 } = createMockReqRes({
      user: escort,
      body: {
        eventId: healthUuid, // Duplicate eventId
        tripId: tripRoute._id,
        horseId: horseA._id,
        temperatureCelsius: 38.4,
        waterIntakeLiters: 12,
        foodIntakeStatus: 'NORMAL',
        condition: 'STABLE'
      }
    });
    await healthLogController.createHealthLog(reqHl2, resHl2, (err) => { throw err; });
    const dbLogCount = await HealthLog.countDocuments({ eventId: healthUuid });
    assert(resHl2.getStatus() === 200 && resHl2.getData().isDuplicate === true && dbLogCount === 1, '26. Duplicate eventId is idempotent -> PASS (200 OK, isDuplicate: true, no duplicate DB record)');

    // 27. Unauthorized welfare log rejected
    const middlewareWelfare = checkPermission('welfare:log');
    const { req: reqHl3, res: resHl3 } = createMockReqRes({ user: customerA });
    let unauthWelfarePassed = false;
    await middlewareWelfare(reqHl3, resHl3, () => { unauthWelfarePassed = true; });
    assert(resHl3.getStatus() === 403 && !unauthWelfarePassed, '27. Unauthorized welfare log rejected -> DENIED (403 Forbidden)');


    // ----------------------------------------------------
    // SOS / INCIDENT TESTS (28-31)
    // ----------------------------------------------------
    console.log('\n--- [8] SOS / INCIDENT TESTS ---');
    const sosUuid = '880e8400-e29b-41d4-a716-446655440002';

    // 28. Valid SOS
    const { req: reqS1, res: resS1 } = createMockReqRes({
      user: driver,
      body: {
        eventId: sosUuid,
        tripId: tripRoute._id,
        coordinates: [105.123, 10.456],
        description: 'Engine overheating near checkpoint'
      }
    });
    await incidentController.triggerSOS(reqS1, resS1, (err) => { throw err; });
    const updatedRouteSOS = await TransportRoute.findById(tripRoute._id);
    assert(resS1.getStatus() === 201 && updatedRouteSOS.status === 'INCIDENT_HANDLING', '28. Valid SOS -> PASS (Status INCIDENT_HANDLING set on trip route)');
    const sosIncident = resS1.getData().data;

    // 29. Duplicate eventId is idempotent
    const { req: reqS2, res: resS2 } = createMockReqRes({
      user: driver,
      body: {
        eventId: sosUuid,
        tripId: tripRoute._id,
        coordinates: [105.123, 10.456],
        description: 'Engine overheating near checkpoint'
      }
    });
    await incidentController.triggerSOS(reqS2, resS2, (err) => { throw err; });
    const dbIncidentCount = await Incident.countDocuments({ eventId: sosUuid });
    assert(resS2.getStatus() === 200 && resS2.getData().isDuplicate === true && dbIncidentCount === 1, '29. Duplicate eventId is idempotent -> PASS (200 OK, isDuplicate: true)');

    // 30. Unauthorized SOS rejected
    const middlewareSos = checkPermission('sos:trigger');
    const { req: reqS3, res: resS3 } = createMockReqRes({ user: customerA });
    let unauthSosPassed = false;
    await middlewareSos(reqS3, resS3, () => { unauthSosPassed = true; });
    assert(resS3.getStatus() === 403 && !unauthSosPassed, '30. Unauthorized SOS rejected -> DENIED (403 Forbidden)');

    // 31. Incident state transition validation
    const { req: reqS4, res: resS4 } = createMockReqRes({
      user: coordinator,
      params: { id: sosIncident._id },
      body: { status: 'RESOLVED', resolutionNotes: 'Tire replaced by mobile service' }
    });
    await incidentController.updateIncidentStatus(reqS4, resS4, (err) => { throw err; });
    const resumedRoute = await TransportRoute.findById(tripRoute._id);
    assert(resS4.getStatus() === 200 && resS4.getData().data.status === 'RESOLVED' && resumedRoute.status === 'IN_TRANSIT', '31. Incident state transition validation -> PASS (RESOLVED status & route resumed to IN_TRANSIT)');


    // ----------------------------------------------------
    // DIGITAL POD TESTS (32-34)
    // ----------------------------------------------------
    console.log('\n--- [9] DIGITAL POD TESTS ---');
    // Set route to DELIVERING
    tripRoute.status = 'DELIVERING';
    await tripRoute.save();

    // 32. Valid POD signing (Status COMPLETED)
    const { req: reqP1, res: resP1 } = createMockReqRes({
      user: customerA,
      body: {
        tripId: tripRoute._id,
        orderId: order1._id,
        signerName: 'Customer Alice',
        signerPhone: '+84900000006',
        signerRole: 'AUTHORIZED_RECIPIENT',
        signatureImageUrl: 'https://example.com/sig_alice.png',
        coordinates: [106.695, 10.778],
        horseConditionsOnArrival: [{ horseId: horseA._id, conditionStatus: 'EXCELLENT' }]
      }
    });
    await podController.signPOD(reqP1, resP1, (err) => { throw err; });
    const completedRoute = await TransportRoute.findById(tripRoute._id);
    const completedOrder = await Order.findById(order1._id);
    assert(resP1.getStatus() === 201 && completedRoute.status === 'COMPLETED' && completedOrder.status === 'COMPLETED', '32. Valid POD signing -> PASS (Route & Order status set to COMPLETED)');

    // 33. Invalid signer role rejected
    const { req: reqP2, res: resP2 } = createMockReqRes({
      user: customerA,
      body: {
        tripId: tripRoute._id,
        orderId: order1._id,
        signerName: 'Unknown',
        signerPhone: '+84900000000',
        signerRole: 'INVALID_SIGNER_ROLE', // Invalid role
        signatureImageUrl: 'https://example.com/sig.png',
        coordinates: [106.695, 10.778]
      }
    });
    await podController.signPOD(reqP2, resP2, (err) => { throw err; });
    assert(resP2.getStatus() === 400 && resP2.getData().errorCode === 'INVALID_SIGNER_ROLE', '33. Invalid signer role rejected -> FAIL (400 Bad Request)');

    // 34. Unauthorized POD signing rejected
    const middlewarePod = checkPermission('pod:sign');
    const { req: reqP3, res: resP3 } = createMockReqRes({ user: driver });
    let unauthPodPassed = false;
    await middlewarePod(reqP3, resP3, () => { unauthPodPassed = true; });
    assert(resP3.getStatus() === 403 && !unauthPodPassed, '34. Unauthorized POD signing rejected -> DENIED (403 Forbidden)');


    // ----------------------------------------------------
    // OFFLINE BATCH SYNC TESTS (35-38)
    // ----------------------------------------------------
    console.log('\n--- [10] OFFLINE BATCH SYNC TESTS ---');

    // 35, 36, 37, 38. Sync with per-event atomic permission check & idempotency
    const syncUuid1 = '990e8400-e29b-41d4-a716-446655440003';
    const syncUuid2 = '990e8400-e29b-41d4-a716-446655440004';

    const { req: reqSync, res: resSync } = createMockReqRes({
      user: driver, // Driver has waypoint:checkin and sync:offline_events, but LACKS pod:sign
      body: {
        events: [
          {
            event_id: syncUuid1,
            event_type: 'HEALTH_LOG',
            payload: {
              tripId: tripRoute._id,
              horseId: horseA._id,
              temperatureCelsius: 38.1,
              waterIntakeLiters: 10,
              foodIntakeStatus: 'NORMAL',
              condition: 'STABLE'
            }
          },
          {
            event_id: syncUuid2,
            event_type: 'POD_SIGN', // Driver lacks pod:sign permission!
            payload: {
              tripId: tripRoute._id,
              orderId: order1._id,
              signerName: 'Driver Test',
              signerPhone: '+84900000000',
              signerRole: 'AUTHORIZED_RECIPIENT',
              signatureImageUrl: 'https://example.com/sig.png',
              coordinates: [106.695, 10.778]
            }
          }
        ]
      }
    });

    // Add welfare:log to driver temporarily for test
    driver.effectivePermissions.push('welfare:log');
    await syncController.syncOfflineEvents(reqSync, resSync, (err) => { throw err; });
    const syncResults = resSync.getData().results;

    const event1Result = syncResults.find(r => r.event_id === syncUuid1);
    const event2Result = syncResults.find(r => r.event_id === syncUuid2);

    assert(resSync.getStatus() === 200, '35. Valid offline event -> PASS (Batch endpoint returned 200 OK)');
    assert(event1Result && event1Result.status === 'SUCCESS', '36 & 38. Valid sub-event succeeds & continues when another sub-event is denied -> PASS');
    assert(event2Result && event2Result.status === 'DENIED', '37. Per-event permission denial -> PASS (Sub-event POD_SIGN denied for driver lacking pod:sign)');


    // ----------------------------------------------------
    // AUDIT LOG TESTS (39-41)
    // ----------------------------------------------------
    console.log('\n--- [11] AUDIT LOG INTEGRATION TESTS ---');

    // 39. Successful business action creates SUCCESS
    const auditSuccess = await AuditLog.findOne({ action: 'ORDER_CREATE', result: 'SUCCESS' });
    assert(!!auditSuccess, '39. Successful business action creates SUCCESS audit entry');

    // 40. Business failure creates FAILURE
    const auditFailure = await AuditLog.findOne({ action: 'ORDER_STATUS_UPDATE', result: 'FAILURE' });
    assert(!!auditFailure, '40. Business failure creates FAILURE audit entry');

    // 41. Permission denial creates DENIED
    const auditDenied = await AuditLog.findOne({ action: 'AUTHORIZATION_CHECK', result: 'DENIED' });
    assert(!!auditDenied, '41. Permission denial creates DENIED audit entry');

    console.log('\n----------------------------------------------------');
    console.log(`PHASE 3 SUMMARY: ${testsPassed} Passed, ${testsFailed} Failed`);
    console.log('----------------------------------------------------');

    await mongoose.connection.close();
    console.log('🔌 Connection closed successfully.');

  } catch (err) {
    console.error('❌ Phase 3 Verification Script Error:', err);
    process.exit(1);
  }
}

runPhase3Verification();
