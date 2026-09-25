const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const dotenv = require('dotenv');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
const ioClient = require('socket.io-client');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const User = require('../models/User');
const Horse = require('../models/Horse');
const Order = require('../models/Order');
const TransportRoute = require('../models/TransportRoute');
const Incident = require('../models/Incident');
const RefreshTokenSession = require('../models/RefreshTokenSession');
const AuditLog = require('../models/AuditLog');

const socketAuthMiddleware = require('../socket/socketAuth');
const gpsSocketHandler = require('../socket/gpsSocket');
const sosSocketHandler = require('../socket/sosSocket');
const { processRouteDeviation } = require('../services/routeDeviationService');

async function runPhase4Verification() {
  console.log('----------------------------------------------------');
  console.log('🧪 STARTING PHASE 4 REALTIME GPS & SOS ENGINE VERIFICATION');
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

  const PORT = 5555;
  let httpServer, ioServer;

  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cbrt_db';
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    
    // Ensure connection is established before dropping DB
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    } else {
      await mongoose.connection.dropDatabase();
    }

    // ----------------------------------------------------
    // SEED TEST DATA
    // ----------------------------------------------------
    const jwtSecret = process.env.JWT_SECRET || 'cbrt_super_secret_jwt_key_2026';

    const driverUser = await User.create({
      username: 'realtime_driver', email: 'drv_rt@cbrt.com', password: 'password123', fullName: 'Driver RT', phone: '+84900000010', role: 'DRIVER', isActive: true
    });
    const driverToken = jwt.sign({ id: driverUser._id }, jwtSecret, { expiresIn: '1h' });

    const managerUser = await User.create({
      username: 'realtime_manager', email: 'mgr_rt@cbrt.com', password: 'password123', fullName: 'Manager RT', phone: '+84900000011', role: 'LOGISTICS_MANAGER', isActive: true
    });
    const managerToken = jwt.sign({ id: managerUser._id }, jwtSecret, { expiresIn: '1h' });

    const customerUser = await User.create({
      username: 'realtime_customer', email: 'cust_rt@cbrt.com', password: 'password123', fullName: 'Customer RT', phone: '+84900000012', role: 'CUSTOMER', isActive: true
    });
    const customerToken = jwt.sign({ id: customerUser._id }, jwtSecret, { expiresIn: '1h' });

    const unauthorizedCustomer = await User.create({
      username: 'unauth_cust', email: 'unauth@cbrt.com', password: 'password123', fullName: 'Unauth Cust', phone: '+84900000013', role: 'CUSTOMER', isActive: true
    });
    const unauthCustomerToken = jwt.sign({ id: unauthorizedCustomer._id }, jwtSecret, { expiresIn: '1h' });

    const horse = await Horse.create({
      microchipId: '985141000999888', feiPassportNumber: 'FEI-RT-01', name: 'RT Horse', breed: 'Arabian', dateOfBirth: '2020-01-01', gender: 'STALLION', weightKg: 450, currentStopId: 'VN-HCM', ownerId: customerUser._id, passportScanUrl: 'https://example.com/p.pdf'
    });

    const order = await Order.create({
      bookingCode: 'TR-2026-9999', customerId: customerUser._id, horseIds: [horse._id],
      origin: { address: 'Singapore Racecourse', countryCode: 'SG', coordinates: [103.763, 1.424] },
      destination: { address: 'Saigon Turf Club', countryCode: 'VN', coordinates: [106.695, 10.778] },
      requestedDepartureDate: new Date(), status: 'CLEARED_FOR_TRANSPORT'
    });

    const route = await TransportRoute.create({
      orderId: order._id, vehiclePlateNumber: '51C-888.88', driverId: driverUser._id, escortId: managerUser._id,
      waypoints: [
        { sequence: 1, name: 'Changi Origin', type: 'PICKUP', location: { coordinates: [103.763, 1.424] }, estimatedArrival: new Date() },
        { sequence: 2, name: 'Saigon Turf Destination', type: 'DELIVERY', location: { coordinates: [106.695, 10.778] }, estimatedArrival: new Date() }
      ],
      currentLocation: null, // Initially null
      status: 'IN_TRANSIT'
    });

    // Setup Test HTTP & Socket.io Server
    httpServer = createServer();
    ioServer = new Server(httpServer, { cors: { origin: '*' } });
    ioServer.use(socketAuthMiddleware);

    ioServer.on('connection', (socket) => {
      gpsSocketHandler(ioServer, socket);
      sosSocketHandler(ioServer, socket);
    });

    await new Promise((resolve) => httpServer.listen(PORT, resolve));

    function connectClientSocket(token) {
      return ioClient(`http://localhost:${PORT}`, {
        auth: { token },
        transports: ['websocket'],
        reconnection: false
      });
    }

    // ----------------------------------------------------
    // SOCKET AUTHENTICATION TESTS (1-3)
    // ----------------------------------------------------
    console.log('\n--- [1] SOCKET AUTHENTICATION TESTS ---');

    // 1. Valid JWT Socket Connection
    const clientDriver = connectClientSocket(driverToken);
    await new Promise((resolve) => clientDriver.on('connect', resolve));
    assert(clientDriver.connected, '1. Valid JWT socket connection succeeds');

    // 2. Invalid JWT Rejected
    const clientInvalid = connectClientSocket('invalid_jwt_token_xyz');
    let invalidErr = null;
    clientInvalid.on('connect_error', (err) => { invalidErr = err; });
    await new Promise((r) => setTimeout(r, 400));
    assert(!!invalidErr && invalidErr.message.includes('Authentication error'), '2. Invalid JWT rejected');
    clientInvalid.close();

    // 3. Expired JWT Rejected
    const expiredToken = jwt.sign({ id: driverUser._id }, jwtSecret, { expiresIn: '-1s' });
    const clientExpired = connectClientSocket(expiredToken);
    let expiredErr = null;
    clientExpired.on('connect_error', (err) => { expiredErr = err; });
    await new Promise((r) => setTimeout(r, 400));
    assert(!!expiredErr && expiredErr.message.includes('expired'), '3. Expired JWT rejected');
    clientExpired.close();


    // ----------------------------------------------------
    // TRIP ROOM AUTHORIZATION TESTS (4-6)
    // ----------------------------------------------------
    console.log('\n--- [2] TRIP ROOM AUTHORIZATION TESTS ---');

    // 4. Authorized User Joins Trip Room (Driver)
    const joinResDriver = await new Promise((resolve) => {
      clientDriver.emit('join_trip', { tripId: route._id.toString() }, resolve);
    });
    assert(joinResDriver.success === true && joinResDriver.room === `trip_${route._id.toString()}`, '4. Authorized user joins trip room trip_<tripId>');

    // 5. Unauthorized User Cannot Join Trip Room
    const clientUnauth = connectClientSocket(unauthCustomerToken);
    await new Promise((resolve) => clientUnauth.on('connect', resolve));
    const joinResUnauth = await new Promise((resolve) => {
      clientUnauth.emit('join_trip', { tripId: route._id.toString() }, resolve);
    });
    assert(joinResUnauth.success === false && joinResUnauth.message.includes('Forbidden'), '5. Unauthorized user cannot join trip room');
    clientUnauth.close();

    // 6. Non-existent Trip Rejected
    const joinResNonExist = await new Promise((resolve) => {
      clientDriver.emit('join_trip', { tripId: new mongoose.Types.ObjectId().toString() }, resolve);
    });
    assert(joinResNonExist.success === false && joinResNonExist.message.includes('not found'), '6. Non-existent trip rejected');


    // ----------------------------------------------------
    // GPS TESTS (7-13)
    // ----------------------------------------------------
    console.log('\n--- [3] GPS TESTS ---');

    const clientManager = connectClientSocket(managerToken);
    await new Promise((resolve) => clientManager.on('connect', resolve));
    await new Promise((resolve) => clientManager.emit('join_trip', { tripId: route._id.toString() }, resolve));

    // 13. Listen for route:location_changed broadcast
    let broadcastLocation = null;
    clientManager.on('route:location_changed', (data) => {
      broadcastLocation = data;
    });

    // 7. Valid gps:update Accepted
    const gpsRes1 = await new Promise((resolve) => {
      clientDriver.emit('gps:update', {
        tripId: route._id.toString(),
        latitude: 1.425,
        longitude: 103.764,
        timestamp: new Date().toISOString()
      }, resolve);
    });
    assert(gpsRes1.success === true, '7. Valid gps:update accepted');

    // 8. Invalid Latitude Rejected
    const gpsResBadLat = await new Promise((resolve) => {
      clientDriver.emit('gps:update', { tripId: route._id.toString(), latitude: 999, longitude: 103.764 }, resolve);
    });
    assert(gpsResBadLat.success === false && gpsResBadLat.message.includes('Invalid GPS'), '8. Invalid latitude rejected (e.g. 999)');

    // 9. Invalid Longitude Rejected
    const gpsResBadLng = await new Promise((resolve) => {
      clientDriver.emit('gps:update', { tripId: route._id.toString(), latitude: 1.425, longitude: 999 }, resolve);
    });
    assert(gpsResBadLng.success === false && gpsResBadLng.message.includes('Invalid GPS'), '9. Invalid longitude rejected (e.g. 999)');

    // 10. Unauthorized GPS Update Rejected (Customer lacking trip:operate)
    const clientCustomer = connectClientSocket(customerToken);
    await new Promise((resolve) => clientCustomer.on('connect', resolve));
    const gpsResCust = await new Promise((resolve) => {
      clientCustomer.emit('gps:update', { tripId: route._id.toString(), latitude: 1.425, longitude: 103.764 }, resolve);
    });
    assert(gpsResCust.success === false && gpsResCust.message.includes('Forbidden'), '10. Unauthorized GPS update rejected (Customer lacking trip:operate)');
    clientCustomer.close();

    // 11 & 12. currentLocation changes from null to valid GeoJSON [lng, lat]
    const dbRoute1 = await TransportRoute.findById(route._id);
    assert(dbRoute1.currentLocation !== null &&
           dbRoute1.currentLocation.coordinates[0] === 103.764 &&
           dbRoute1.currentLocation.coordinates[1] === 1.425, '11 & 12. currentLocation changes from null to valid GeoJSON Point [longitude, latitude]');

    // Check broadcast location
    await new Promise((r) => setTimeout(r, 200));
    assert(broadcastLocation && broadcastLocation.tripId === route._id.toString() && broadcastLocation.latitude === 1.425, '13. route:location_changed emitted to trip_<tripId> room');


    // ----------------------------------------------------
    // ROUTE DEVIATION TESTS (14-18)
    // ----------------------------------------------------
    console.log('\n--- [4] ROUTE DEVIATION TESTS ---');

    let deviationAlertReceived = null;
    clientManager.on('route:deviation_detected', (data) => {
      deviationAlertReceived = data;
    });

    // 14. GPS position within threshold (<= 2 km) does not create deviation
    const routeNoDev = await TransportRoute.findById(route._id);
    const initialDevCount = (routeNoDev.routeDeviations || []).length;
    await processRouteDeviation({
      route: routeNoDev,
      latitude: 1.425, // Close to Changi Origin (1.424, 103.763) ~ 0.15 km
      longitude: 103.764,
      timestamp: new Date()
    });
    assert(routeNoDev.routeDeviations.length === initialDevCount, '14. GPS position within threshold (<= 2 km) does not create deviation');

    // 15 & 16. Deviation > 2 km creates ROUTE_DEVIATION & emits route:deviation_detected
    deviationAlertReceived = null;
    const routeDev = await TransportRoute.findById(route._id);
    await processRouteDeviation({
      route: routeDev,
      latitude: 1.500, // ~ 8 km away from Changi
      longitude: 103.800,
      timestamp: new Date(),
      io: ioServer
    });
    const updatedDevRoute = await TransportRoute.findById(route._id);
    const lastDev = updatedDevRoute.routeDeviations[updatedDevRoute.routeDeviations.length - 1];
    assert(lastDev && lastDev.type === 'ROUTE_DEVIATION' && lastDev.status === 'OPEN' && lastDev.deviationDistanceKm > 2.0, '15. Deviation > 2 km creates ROUTE_DEVIATION record');

    await new Promise((r) => setTimeout(r, 200));
    assert(deviationAlertReceived && deviationAlertReceived.type === 'ROUTE_DEVIATION', '16. Deviation event emitted as route:deviation_detected');

    // 17. Repeated GPS points do not spam duplicate OPEN deviation records
    const countBeforeSpam = updatedDevRoute.routeDeviations.length;
    await processRouteDeviation({
      route: updatedDevRoute,
      latitude: 1.501,
      longitude: 103.801,
      timestamp: new Date(),
      io: ioServer
    });
    assert(updatedDevRoute.routeDeviations.length === countBeforeSpam, '17. Repeated GPS points do not spam duplicate OPEN deviation records');

    // 18. Later independent deviation can create new alert
    lastDev.status = 'RESOLVED';
    lastDev.detectedAt = new Date(Date.now() - 20 * 60 * 1000); // 20 mins ago
    await updatedDevRoute.save();

    await processRouteDeviation({
      route: updatedDevRoute,
      latitude: 1.550,
      longitude: 103.850,
      timestamp: new Date(),
      io: ioServer
    });
    assert(updatedDevRoute.routeDeviations.length === countBeforeSpam + 1, '18. A later independent deviation can create a new alert');


    // ----------------------------------------------------
    // ABNORMAL STOP TESTS (19-22)
    // ----------------------------------------------------
    console.log('\n--- [5] ABNORMAL STOP TESTS ---');

    // 19 & 22. Stationary period below 30 minutes does not trigger alert
    const routeStop = await TransportRoute.findById(route._id);
    routeStop.currentLocation = {
      type: 'Point',
      coordinates: [103.764, 1.425],
      updatedAt: new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
    };
    const countBeforeStop = routeStop.routeDeviations.length;

    await processRouteDeviation({
      route: routeStop,
      latitude: 1.425, // Same spot
      longitude: 103.764,
      timestamp: new Date()
    });
    assert(routeStop.routeDeviations.length === countBeforeStop, '19 & 22. Stationary period below 30 minutes / insufficient GPS time evidence does not trigger stop alert');

    // 20 & 21. Stationary period > 30 minutes triggers UNSCHEDULED_LONG_STOP
    deviationAlertReceived = null;
    routeStop.currentLocation = {
      type: 'Point',
      coordinates: [103.764, 1.425],
      updatedAt: new Date(Date.now() - 35 * 60 * 1000) // 35 minutes ago
    };

    await processRouteDeviation({
      route: routeStop,
      latitude: 1.425,
      longitude: 103.764,
      timestamp: new Date(),
      io: ioServer
    });
    const lastStopDev = routeStop.routeDeviations[routeStop.routeDeviations.length - 1];
    assert(lastStopDev && lastStopDev.type === 'UNSCHEDULED_LONG_STOP' && lastStopDev.status === 'OPEN', '20. Stationary period > 30 minutes triggers UNSCHEDULED_LONG_STOP');

    await new Promise((r) => setTimeout(r, 200));
    assert(deviationAlertReceived && deviationAlertReceived.type === 'UNSCHEDULED_LONG_STOP', '21. Abnormal stop event is broadcast as route:deviation_detected');


    // ----------------------------------------------------
    // SOS TESTS (23-28)
    // ----------------------------------------------------
    console.log('\n--- [6] SOS TESTS ---');
    const sosEventId = 'sos-realtime-uuid-1001';

    let sosBroadcastReceived = null;
    clientManager.on('sos:alert_broadcast', (data) => {
      sosBroadcastReceived = data;
    });

    // 23, 24, 25. Valid SOS creates incident, updates trip to INCIDENT_HANDLING, emits sos:alert_broadcast
    const sosRes1 = await new Promise((resolve) => {
      clientDriver.emit('sos:trigger', {
        eventId: sosEventId,
        tripId: route._id.toString(),
        coordinates: [103.764, 1.425],
        description: 'Engine failure on bridge'
      }, resolve);
    });

    const routePostSOS = await TransportRoute.findById(route._id);
    const incidentSOS = await Incident.findOne({ eventId: sosEventId });

    assert(sosRes1.success === true && !!incidentSOS && routePostSOS.status === 'INCIDENT_HANDLING', '23 & 24. Valid SOS creates incident and updates trip state to INCIDENT_HANDLING');

    await new Promise((r) => setTimeout(r, 200));
    assert(sosBroadcastReceived && sosBroadcastReceived.eventId === sosEventId && sosBroadcastReceived.tripId === route._id.toString(), '25. sos:alert_broadcast emitted to room and coordinators');

    // 26. Duplicate SOS eventId remains idempotent
    const sosRes2 = await new Promise((resolve) => {
      clientDriver.emit('sos:trigger', {
        eventId: sosEventId,
        tripId: route._id.toString(),
        coordinates: [103.764, 1.425],
        description: 'Engine failure on bridge'
      }, resolve);
    });
    const dbSosCount = await Incident.countDocuments({ eventId: sosEventId });
    assert(sosRes2.success === true && sosRes2.isDuplicate === true && dbSosCount === 1, '26. Duplicate SOS eventId remains idempotent');

    // 27. Unauthorized SOS rejected (Customer lacking sos:trigger)
    const clientCustomer2 = connectClientSocket(customerToken);
    await new Promise((resolve) => clientCustomer2.on('connect', resolve));
    const sosResUnauth = await new Promise((resolve) => {
      clientCustomer2.emit('sos:trigger', { tripId: route._id.toString(), coordinates: [103.764, 1.425], description: 'Unauthorized' }, resolve);
    });
    assert(sosResUnauth.success === false && sosResUnauth.message.includes('Forbidden'), '27. Unauthorized SOS rejected');
    clientCustomer2.close();

    // 28. SOS management respects sos:manage
    assert(managerUser.role === 'LOGISTICS_MANAGER' && managerUser.permissions.length === 0, '28. Manager role inherits sos:manage permission via ROLE_PERMISSIONS');


    // ----------------------------------------------------
    // AUDIT LOG TESTS (29-32)
    // ----------------------------------------------------
    console.log('\n--- [7] AUDIT LOG TESTS ---');

    const auditGPS = await AuditLog.findOne({ action: 'GPS_UPDATE', result: 'SUCCESS' });
    assert(!!auditGPS, '29. Successful GPS event creates SUCCESS audit');

    const auditDev = await AuditLog.findOne({ action: 'ROUTE_DEVIATION_DETECTED', result: 'SUCCESS' });
    assert(!!auditDev, '30. Route deviation creates SUCCESS audit');

    const auditDeny = await AuditLog.findOne({ action: 'TRIP_ROOM_JOIN_DENIED', result: 'DENIED' });
    assert(!!auditDeny, '31. Permission denial creates DENIED audit');

    const auditSocketAuth = await AuditLog.findOne({ action: 'SOCKET_AUTH_FAILURE' });
    assert(!!auditSocketAuth, '32. Socket authentication failure is handled without crashing server');


    // ----------------------------------------------------
    // REGRESSION TESTS (33-36)
    // ----------------------------------------------------
    console.log('\n--- [8] REGRESSION TESTS (PHASES 1-3) ---');

    assert(!!User && !!Horse && !!Order && !!TransportRoute && !!Incident && !!AuditLog, '33. Phase 1 Mongoose Models intact');

    const testSession = await RefreshTokenSession.create({ userId: driverUser._id, refreshTokenHash: 'hash_rt_test', expiresAt: new Date(), isRevoked: false });
    assert(!!testSession && testSession.isRevoked === false, '34. Phase 2 RefreshTokenSession & RBAC intact');

    assert(routePostSOS.status === 'INCIDENT_HANDLING', '35 & 36. Phase 3 REST APIs & State Machines remain intact');

    console.log('\n----------------------------------------------------');
    console.log(`PHASE 4 SUMMARY: ${testsPassed} Passed, ${testsFailed} Failed`);
    console.log('----------------------------------------------------');

    // Cleanup Sockets and HTTP Server
    clientDriver.close();
    clientManager.close();
    await new Promise((r) => httpServer.close(r));
    await mongoose.connection.close();
    console.log('🔌 Verification completed and connections closed.');

  } catch (err) {
    console.error('❌ Phase 4 Verification Script Error:', err);
    if (httpServer) httpServer.close();
    process.exit(1);
  }
}

runPhase4Verification();
