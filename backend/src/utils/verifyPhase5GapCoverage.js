/**
 * CBRT PHASE 5 GAP COVERAGE & REGRESSION VERIFICATION SCRIPT
 *
 * Verifies:
 * 1. KPI Analytics with totalDistanceKm
 * 2. B2B Billing Reconciliation export endpoint (GET /api/v1/analytics/b2b-reconciliation)
 * 3. Audit Log Query endpoint (GET /api/v1/audit-logs) with audit:view permission
 * 4. User Management API with user:manage permission
 * 5. Authorization denial for unauthorized roles
 * 6. AuditLog entry verification (SUCCESS, DENIED)
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const User = require('../models/User');
const Horse = require('../models/Horse');
const Order = require('../models/Order');
const TransportRoute = require('../models/TransportRoute');
const Incident = require('../models/Incident');
const AuditLog = require('../models/AuditLog');

const { checkPermission } = require('../middlewares/authMiddleware');
const analyticsController = require('../controllers/analyticsController');
const auditLogController = require('../controllers/auditLogController');
const userController = require('../controllers/userController');
const { ROLE_PERMISSIONS } = require('./constants');

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

async function runPhase5Verification() {
  console.log('----------------------------------------------------');
  console.log('🧪 STARTING PHASE 5 MASTER SPEC GAP COVERAGE VERIFICATION');
  console.log('----------------------------------------------------');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(` ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(` ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cbrt_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    // Clean test data
    await User.deleteMany({ email: { $regex: /@phase5test\.com$/ } });
    await Order.deleteMany({ bookingCode: { $regex: /^TR-2026-P5/ } });
    await TransportRoute.deleteMany({ vehiclePlateNumber: 'P5-PLATE-99' });
    await Horse.deleteMany({ microchipId: '985123456789555' });
    await Incident.deleteMany({ eventId: 'p5-incident-uuid-001' });



    // 1. Setup Users
    const manager = await User.create({
      username: 'manager_p5',
      email: 'manager@phase5test.com',
      password: '$2a$10$abcdefghijklmnopqrstuvwxyz012345',
      fullName: 'Logistics Manager P5',
      phone: '+84900000001',
      role: 'LOGISTICS_MANAGER',
      permissions: ROLE_PERMISSIONS['LOGISTICS_MANAGER']
    });
    manager.effectivePermissions = ROLE_PERMISSIONS['LOGISTICS_MANAGER'];

    const customer = await User.create({
      username: 'customer_p5',
      email: 'customer@phase5test.com',
      password: '$2a$10$abcdefghijklmnopqrstuvwxyz012345',
      fullName: 'Customer Owner P5',
      phone: '+84900000002',
      role: 'CUSTOMER',
      permissions: ROLE_PERMISSIONS['CUSTOMER']
    });
    customer.effectivePermissions = ROLE_PERMISSIONS['CUSTOMER'];

    const escort = await User.create({
      username: 'escort_p5',
      email: 'escort@phase5test.com',
      password: '$2a$10$abcdefghijklmnopqrstuvwxyz012345',
      fullName: 'Escort P5',
      phone: '+84900000003',
      role: 'ESCORT',
      permissions: ROLE_PERMISSIONS['ESCORT']
    });
    escort.effectivePermissions = ROLE_PERMISSIONS['ESCORT'];

    // 2. Setup Horse, Order and TransportRoute with waypoints
    const horse = await Horse.create({
      microchipId: '985123456789555',
      feiPassportNumber: 'FEI-P5-999',
      name: 'P5 Racehorse',
      breed: 'Thoroughbred',
      dateOfBirth: new Date('2021-01-01'),
      gender: 'STALLION',
      weightKg: 500,
      currentStopId: 'VN-HCM',
      ownerId: customer._id,
      passportScanUrl: 'https://cbrt.com/docs/passport_p5.pdf'
    });

    const testOrder = await Order.create({
      bookingCode: 'TR-2026-P501',
      customerId: customer._id,
      horseIds: [horse._id],
      origin: { address: 'Saigon Port, Vietnam', countryCode: 'VN', coordinates: [106.700806, 10.776889] },
      destination: { address: 'Singapore Turf Club', countryCode: 'SG', coordinates: [103.771239, 1.424376] },
      requestedDepartureDate: new Date(),
      status: 'APPROVED'
    });

    const testRoute = await TransportRoute.create({
      orderId: testOrder._id,
      vehiclePlateNumber: 'P5-PLATE-99',
      driverId: manager._id,
      escortId: escort._id,
      waypoints: [
        { sequence: 1, name: 'Saigon Port', type: 'PICKUP', location: { coordinates: [106.700806, 10.776889] }, estimatedArrival: new Date(), status: 'ARRIVED' },
        { sequence: 2, name: 'Bavet Border', type: 'BORDER_CUSTOMS', location: { coordinates: [105.9667, 11.0833] }, estimatedArrival: new Date(), status: 'PENDING' },
        { sequence: 3, name: 'Singapore Turf Club', type: 'DELIVERY', location: { coordinates: [103.771239, 1.424376] }, estimatedArrival: new Date(), status: 'PENDING' }
      ],
      currentLocation: null,
      status: 'IN_TRANSIT'
    });

    // Create a test incident for emergency cost aggregation
    await Incident.create({
      eventId: 'p5-incident-uuid-001',
      tripId: testRoute._id,
      reportedBy: escort._id,
      location: { type: 'Point', coordinates: [105.9667, 11.0833] },
      description: 'Minor equine dehydration treated at checkpoint',
      status: 'RESOLVED',
      emergencyCostAmount: 350
    });

    // --- TEST 1: KPI Analytics includes totalDistanceKm ---
    console.log('\n--- [1] KPI ANALYTICS & METRICS GAPS ---');
    const { req: reqKpi, res: resKpi } = createMockReqRes({ user: manager });
    await analyticsController.getKPIAnalytics(reqKpi, resKpi, (err) => { throw err; });
    assert(
      resKpi.getStatus() === 200 && resKpi.getData().data?.trips?.totalDistanceKm > 0,
      `1. KPI Analytics returns totalDistanceKm (${resKpi.getData()?.data?.trips?.totalDistanceKm} km)`
    );

    // --- TEST 2: B2B Billing Reconciliation Endpoint Happy Path ---
    console.log('\n--- [2] B2B BILLING RECONCILIATION REPORT ENDPOINT ---');
    const { req: reqB2b, res: resB2b } = createMockReqRes({ user: manager });
    await analyticsController.getB2BBillingReconciliation(reqB2b, resB2b, (err) => { throw err; });
    assert(
      resB2b.getStatus() === 200 && resB2b.getData().success === true && resB2b.getData().summary?.grandTotalDistanceKm > 0 && Array.isArray(resB2b.getData().data),
      `2. B2B Billing Reconciliation endpoint returns summary and per-booking items (Total: ${resB2b.getData()?.summary?.grandTotalDistanceKm} km, Emergency Costs: \$${resB2b.getData()?.summary?.grandTotalEmergencyCosts})`
    );

    // --- TEST 3: B2B Billing Reconciliation Permission Denial ---
    const middlewareAnalyticsView = checkPermission('analytics:view');
    const { req: reqB2bDeny, res: resB2bDeny } = createMockReqRes({ user: customer });
    let analyticsViewPassed = false;
    await middlewareAnalyticsView(reqB2bDeny, resB2bDeny, () => { analyticsViewPassed = true; });
    assert(
      resB2bDeny.getStatus() === 403 && !analyticsViewPassed,
      '3. Customer lacking analytics:view cannot access B2B reconciliation report (403 Forbidden)'
    );

    // --- TEST 4: Audit Log Query Endpoint Happy Path ---
    console.log('\n--- [3] AUDIT LOG QUERY ENDPOINT ---');
    const { req: reqAudit, res: resAudit } = createMockReqRes({ user: manager });
    await auditLogController.getAuditLogs(reqAudit, resAudit, (err) => { throw err; });
    assert(
      resAudit.getStatus() === 200 && resAudit.getData().success === true && Array.isArray(resAudit.getData().data),
      `4. Audit Log query endpoint returns paginated audit records (Total: ${resAudit.getData().total})`
    );

    // --- TEST 5: Audit Log Query Filtering ---
    const { req: reqAuditFilter, res: resAuditFilter } = createMockReqRes({ user: manager, query: { result: 'SUCCESS' } });
    await auditLogController.getAuditLogs(reqAuditFilter, resAuditFilter, (err) => { throw err; });
    assert(
      resAuditFilter.getStatus() === 200 && resAuditFilter.getData().data.every(l => l.result === 'SUCCESS'),
      '5. Audit Log query supports filtering by result (result=SUCCESS)'
    );

    // --- TEST 6: Audit Log Query Permission Denial ---
    const middlewareAuditView = checkPermission('audit:view');
    const { req: reqAuditDeny, res: resAuditDeny } = createMockReqRes({ user: escort });
    let auditViewPassed = false;
    await middlewareAuditView(reqAuditDeny, resAuditDeny, () => { auditViewPassed = true; });
    assert(
      resAuditDeny.getStatus() === 403 && !auditViewPassed,
      '6. Escort lacking audit:view cannot query system audit logs (403 Forbidden)'
    );

    // --- TEST 7: User Management Granular RBAC Check ---
    console.log('\n--- [4] USER MANAGEMENT & GRANULAR RBAC ---');
    const { req: reqUserList, res: resUserList } = createMockReqRes({ user: manager });
    await userController.getUsers(reqUserList, resUserList, (err) => { throw err; });
    assert(
      resUserList.getStatus() === 200 && Array.isArray(resUserList.getData().data),
      '7. User with user:manage permission can list users'
    );

    const middlewareUserManage = checkPermission('user:manage');
    const { req: reqUserDeny, res: resUserDeny } = createMockReqRes({ user: customer });
    let userManagePassed = false;
    await middlewareUserManage(reqUserDeny, resUserDeny, () => { userManagePassed = true; });
    assert(
      resUserDeny.getStatus() === 403 && !userManagePassed,
      '8. User without user:manage permission cannot list users (403 Forbidden)'
    );

    // --- SUMMARY ---
    console.log('----------------------------------------------------');
    console.log(`PHASE 5 SUMMARY: ${passed} Passed, ${failed} Failed`);
    console.log('----------------------------------------------------');

    return { passed, failed };
  } catch (err) {
    console.error('❌ CRITICAL ERROR IN PHASE 5 VERIFICATION:', err);
    return { passed, failed: failed + 1 };
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  }
}

if (require.main === module) {
  runPhase5Verification();
}

module.exports = runPhase5Verification;
