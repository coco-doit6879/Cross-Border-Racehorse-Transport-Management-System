const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const User = require('../models/User');
const RefreshTokenSession = require('../models/RefreshTokenSession');
const AuditLog = require('../models/AuditLog');
const { protect, checkPermission } = require('../middlewares/authMiddleware');
const authController = require('../controllers/authController');

async function runPhase2Verification() {
  console.log('----------------------------------------------------');
  console.log('🧪 STARTING PHASE 2 AUTH & RBAC VERIFICATION');
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

  // Mock Request and Response Express objects
  function createMockReqRes({ body = {}, headers = {}, params = {}, ip = '127.0.0.1', user = null } = {}) {
    const req = {
      body,
      headers: { ...headers },
      get: (headerName) => headers[headerName.toLowerCase()] || headers[headerName],
      params,
      ip,
      baseUrl: '/api/v1/auth',
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
    // 1. Connect MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cbrt_db';
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    await mongoose.connection.db.dropDatabase(); // Clean environment

    // Seed test users
    const managerUser = await User.create({
      username: 'manager_john',
      email: 'manager@cbrt.com',
      password: 'password123',
      fullName: 'Manager John',
      phone: '+84900000001',
      role: 'LOGISTICS_MANAGER',
      isActive: true
    });

    const customerUser = await User.create({
      username: 'customer_alice',
      email: 'customer@cbrt.com',
      password: 'password123',
      fullName: 'Customer Alice',
      phone: '+84900000002',
      role: 'CUSTOMER',
      isActive: true
    });

    const inactiveUser = await User.create({
      username: 'inactive_bob',
      email: 'inactive@cbrt.com',
      password: 'password123',
      fullName: 'Inactive Bob',
      phone: '+84900000003',
      role: 'DRIVER',
      isActive: false
    });

    // ----------------------------------------------------
    // AUTHENTICATION TESTS (1-4)
    // ----------------------------------------------------
    console.log('\n--- [1] AUTHENTICATION TESTS ---');

    // 1. Valid Login
    const { req: req1, res: res1 } = createMockReqRes({
      body: { username: 'manager_john', password: 'password123', deviceName: 'MacBook Air' }
    });
    await authController.login(req1, res1, (err) => { throw err; });
    assert(res1.getStatus() === 200 && res1.getData().success === true && !!res1.getData().accessToken && !!res1.getData().refreshToken, '1. Valid login -> PASS (200 with Access + Refresh Token)');

    const validAccessToken = res1.getData().accessToken;
    const validRefreshToken = res1.getData().refreshToken;

    // 2. Wrong Password
    const { req: req2, res: res2 } = createMockReqRes({
      body: { username: 'manager_john', password: 'wrongpassword' }
    });
    await authController.login(req2, res2, (err) => { throw err; });
    assert(res2.getStatus() === 401 && res2.getData().success === false, '2. Wrong password -> FAIL (401 Unauthorized)');

    // 3. Non-existent User
    const { req: req3, res: res3 } = createMockReqRes({
      body: { username: 'non_existent_user', password: 'password123' }
    });
    await authController.login(req3, res3, (err) => { throw err; });
    assert(res3.getStatus() === 401 && res3.getData().success === false, '3. Non-existent user -> FAIL (401 Unauthorized)');

    // 4. Inactive User
    const { req: req4, res: res4 } = createMockReqRes({
      body: { username: 'inactive_bob', password: 'password123' }
    });
    await authController.login(req4, res4, (err) => { throw err; });
    assert(res4.getStatus() === 403 && res4.getData().success === false, '4. Inactive user -> FAIL (403 Forbidden)');


    // ----------------------------------------------------
    // ACCESS TOKEN TESTS (5-7)
    // ----------------------------------------------------
    console.log('\n--- [2] ACCESS TOKEN TESTS ---');

    // 5. Valid Access Token
    const { req: req5, res: res5 } = createMockReqRes({
      headers: { authorization: `Bearer ${validAccessToken}` }
    });
    let protectPassed = false;
    await protect(req5, res5, () => { protectPassed = true; });
    assert(protectPassed && req5.user && req5.user.username === 'manager_john', '5. Valid Access Token -> PASS (User attached to req.user)');

    // 6. Invalid Access Token
    const { req: req6, res: res6 } = createMockReqRes({
      headers: { authorization: `Bearer invalid_token_xyz_123` }
    });
    await protect(req6, res6, () => {});
    assert(res6.getStatus() === 401 && res6.getData().success === false, '6. Invalid Access Token -> FAIL (401 Unauthorized)');

    // 7. Expired Access Token
    const expiredToken = jwt.sign({ id: managerUser._id }, process.env.JWT_SECRET || 'cbrt_super_secret_jwt_key_2026', { expiresIn: '-1s' });
    const { req: req7, res: res7 } = createMockReqRes({
      headers: { authorization: `Bearer ${expiredToken}` }
    });
    await protect(req7, res7, () => {});
    assert(res7.getStatus() === 401 && res7.getData().success === false, '7. Expired Access Token -> FAIL (401 Unauthorized)');


    // ----------------------------------------------------
    // REFRESH SESSION TESTS (8-11)
    // ----------------------------------------------------
    console.log('\n--- [3] REFRESH TOKEN SESSION TESTS ---');

    // 8. Valid Refresh Token
    const { req: req8, res: res8 } = createMockReqRes({
      body: { refreshToken: validRefreshToken }
    });
    await authController.refresh(req8, res8, (err) => { throw err; });
    assert(res8.getStatus() === 200 && res8.getData().success === true && !!res8.getData().accessToken, '8. Valid Refresh Token -> PASS (Issued new Access Token)');

    // 9. Invalid Refresh Token
    const { req: req9, res: res9 } = createMockReqRes({
      body: { refreshToken: 'invalid_refresh_token_string' }
    });
    await authController.refresh(req9, res9, (err) => { throw err; });
    assert(res9.getStatus() === 401 && res9.getData().success === false, '9. Invalid Refresh Token -> FAIL (401 Unauthorized)');

    // 10. Expired Refresh Session
    const expiredRefreshToken = 'expired_refresh_token_raw';
    const expiredHash = crypto.createHash('sha256').update(expiredRefreshToken).digest('hex');
    await RefreshTokenSession.create({
      userId: managerUser._id,
      refreshTokenHash: expiredHash,
      expiresAt: new Date(Date.now() - 1000), // Expired 1s ago
      isRevoked: false
    });
    const { req: req10, res: res10 } = createMockReqRes({
      body: { refreshToken: expiredRefreshToken }
    });
    await authController.refresh(req10, res10, (err) => { throw err; });
    assert(res10.getStatus() === 401 && res10.getData().message.includes('expired'), '10. Expired Refresh Session -> FAIL (401 Unauthorized)');

    // 11. Revoked Refresh Session
    const revokedRefreshToken = 'revoked_refresh_token_raw';
    const revokedHash = crypto.createHash('sha256').update(revokedRefreshToken).digest('hex');
    await RefreshTokenSession.create({
      userId: managerUser._id,
      refreshTokenHash: revokedHash,
      expiresAt: new Date(Date.now() + 86400000),
      isRevoked: true // Revoked
    });
    const { req: req11, res: res11 } = createMockReqRes({
      body: { refreshToken: revokedRefreshToken }
    });
    await authController.refresh(req11, res11, (err) => { throw err; });
    assert(res11.getStatus() === 401 && res11.getData().message.includes('revoked'), '11. Revoked Refresh Session -> FAIL (401 Unauthorized)');


    // ----------------------------------------------------
    // LOGOUT TESTS (12-13)
    // ----------------------------------------------------
    console.log('\n--- [4] LOGOUT TESTS ---');

    // 12. Logout Revokes Session
    const { req: req12, res: res12 } = createMockReqRes({
      body: { refreshToken: validRefreshToken }
    });
    await authController.logout(req12, res12, (err) => { throw err; });
    const targetHash = crypto.createHash('sha256').update(validRefreshToken).digest('hex');
    const dbSession = await RefreshTokenSession.findOne({ refreshTokenHash: targetHash });
    assert(res12.getStatus() === 200 && dbSession && dbSession.isRevoked === true, '12. Logout revokes correct session -> PASS (isRevoked = true)');

    // 13. Revoked Session Cannot Refresh
    const { req: req13, res: res13 } = createMockReqRes({
      body: { refreshToken: validRefreshToken }
    });
    await authController.refresh(req13, res13, (err) => { throw err; });
    assert(res13.getStatus() === 401 && res13.getData().success === false, '13. Revoked session cannot refresh -> FAIL (401 Unauthorized)');


    // ----------------------------------------------------
    // RBAC TESTS (14-16)
    // ----------------------------------------------------
    console.log('\n--- [5] GRANULAR RBAC TESTS ---');

    // 14. Valid Permission Check (LOGISTICS_MANAGER has booking:approve)
    const { req: req14, res: res14 } = createMockReqRes({ user: req5.user }); // Manager req
    let permPassed = false;
    const middleware14 = checkPermission('booking:approve');
    await middleware14(req14, res14, () => { permPassed = true; });
    assert(permPassed, '14. Valid permission (LOGISTICS_MANAGER with booking:approve) -> PASS');

    // 15. Missing Permission Check (CUSTOMER lacks booking:approve)
    const { req: req15_auth, res: res15_auth } = createMockReqRes({
      body: { username: 'customer_alice', password: 'password123' }
    });
    await authController.login(req15_auth, res15_auth, (err) => { throw err; });
    const custToken = res15_auth.getData().accessToken;

    const { req: req15, res: res15 } = createMockReqRes({
      headers: { authorization: `Bearer ${custToken}` }
    });
    await protect(req15, res15, () => {});
    const middleware15 = checkPermission('booking:approve');
    let custPermPassed = false;
    await middleware15(req15, res15, () => { custPermPassed = true; });
    assert(res15.getStatus() === 403 && !custPermPassed && res15.getData().message.includes('Forbidden'), '15. Missing permission (CUSTOMER lacks booking:approve) -> DENIED (403 Forbidden)');

    // 16. Unauthenticated Request
    const { req: req16, res: res16 } = createMockReqRes({ headers: {} });
    await protect(req16, res16, () => {});
    assert(res16.getStatus() === 401 && res16.getData().success === false, '16. Unauthenticated request -> FAIL (401 Unauthorized)');


    // ----------------------------------------------------
    // AUDIT LOG TESTS (17-19)
    // ----------------------------------------------------
    console.log('\n--- [6] AUDIT LOG INTEGRATION TESTS ---');

    // 17. Successful Login Creates SUCCESS Audit
    const successLoginAudit = await AuditLog.findOne({ action: 'USER_LOGIN', result: 'SUCCESS' });
    assert(!!successLoginAudit, '17. Successful authentication creates SUCCESS audit log entry');

    // 18. Failed Login Creates FAILURE Audit
    const failureLoginAudit = await AuditLog.findOne({ action: 'USER_LOGIN', result: 'FAILURE' });
    assert(!!failureLoginAudit, '18. Authentication failure creates FAILURE audit log entry');

    // 19. Authorization Denial Creates DENIED Audit
    const deniedAudit = await AuditLog.findOne({ action: 'AUTHORIZATION_CHECK', result: 'DENIED' });
    assert(!!deniedAudit, '19. Authorization denial creates DENIED audit log entry');

    console.log('\n----------------------------------------------------');
    console.log(`PHASE 2 SUMMARY: ${testsPassed} Passed, ${testsFailed} Failed`);
    console.log('----------------------------------------------------');

    await mongoose.connection.close();
    console.log('🔌 Connection closed successfully.');

  } catch (err) {
    console.error('❌ Verification Script Error:', err);
    process.exit(1);
  }
}

runPhase2Verification();
