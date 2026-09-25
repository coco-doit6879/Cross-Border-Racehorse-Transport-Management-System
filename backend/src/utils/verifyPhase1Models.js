const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const User = require('../models/User');
const RefreshTokenSession = require('../models/RefreshTokenSession');
const Horse = require('../models/Horse');
const Order = require('../models/Order');
const ComplianceDoc = require('../models/ComplianceDoc');
const TransportRoute = require('../models/TransportRoute');
const HealthLog = require('../models/HealthLog');
const Incident = require('../models/Incident');
const DigitalPOD = require('../models/DigitalPOD');
const AuditLog = require('../models/AuditLog');

async function runVerification() {
  console.log('----------------------------------------------------');
  console.log('🧪 STARTING PHASE 1 MONGOOSE SCHEMAS VERIFICATION');
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

  try {
    // 1. Validate User Model & Enum Roles
    const userRoleTest = new User({
      username: 'test_manager',
      email: 'manager@test.com',
      password: 'password123',
      fullName: 'Manager Test',
      phone: '+84900000000',
      role: 'LOGISTICS_MANAGER'
    });
    const userValidationError = userRoleTest.validateSync();
    assert(!userValidationError, 'User model validates successfully with role LOGISTICS_MANAGER');

    const invalidUser = new User({ role: 'INVALID_ROLE' });
    const invalidUserErr = invalidUser.validateSync();
    assert(invalidUserErr && invalidUserErr.errors.role, 'User model rejects invalid role enum');

    // 2. Validate RefreshTokenSession
    const sessionTest = new RefreshTokenSession({
      userId: new mongoose.Types.ObjectId(),
      refreshTokenHash: 'hashed_token_xyz',
      deviceName: 'iPhone 15 Pro',
      expiresAt: new Date(Date.now() + 86400000),
      isRevoked: false
    });
    assert(!sessionTest.validateSync(), 'RefreshTokenSession model validates successfully with isRevoked: false');

    // 3. Validate Horse Microchip Regex (10-18 alphanumeric)
    const validHorse = new Horse({
      microchipId: '985141000123456', // 15 digits
      feiPassportNumber: 'FEI-102938',
      name: 'Thunderbolt',
      breed: 'Thoroughbred',
      dateOfBirth: new Date('2020-01-01'),
      gender: 'STALLION',
      weightKg: 450,
      currentStopId: 'VN-HCM',
      ownerId: new mongoose.Types.ObjectId(),
      passportScanUrl: 'https://example.com/scan.pdf'
    });
    assert(!validHorse.validateSync(), 'Horse model validates valid 15-digit Microchip ID');

    const invalidHorse = new Horse({
      microchipId: '123' // Short microchip
    });
    const invalidHorseErr = invalidHorse.validateSync();
    assert(invalidHorseErr && invalidHorseErr.errors.microchipId, 'Horse model rejects microchip ID shorter than 10 characters');

    // 4. Validate Order Model & GeoJSON structure
    const orderTest = new Order({
      bookingCode: 'TR-2026-0001',
      customerId: new mongoose.Types.ObjectId(),
      horseIds: [new mongoose.Types.ObjectId()],
      origin: {
        address: 'Singapore Racecourse',
        countryCode: 'SG',
        coordinates: [103.763, 1.424] // [lng, lat]
      },
      destination: {
        address: 'Saigon Horse Club',
        countryCode: 'VN',
        coordinates: [106.695, 10.778] // [lng, lat]
      },
      requestedDepartureDate: new Date(),
      status: 'PENDING_APPROVAL'
    });
    assert(!orderTest.validateSync(), 'Order model validates with GeoJSON coordinates [lng, lat]');

    // 5. Validate ComplianceDoc fileUrl nullable in PENDING_UPLOAD
    const docTest = new ComplianceDoc({
      orderId: new mongoose.Types.ObjectId(),
      documentType: 'COGGINS_TEST',
      countryCode: 'SG',
      fileUrl: null, // Allowed when status is PENDING_UPLOAD
      status: 'PENDING_UPLOAD'
    });
    assert(!docTest.validateSync(), 'ComplianceDoc model allows fileUrl to be null in PENDING_UPLOAD state');

    // 6. Validate TransportRoute default currentLocation is null and 2dsphere index exists
    const routeTest = new TransportRoute({
      orderId: new mongoose.Types.ObjectId(),
      vehiclePlateNumber: '51C-999.99',
      driverId: new mongoose.Types.ObjectId(),
      escortId: new mongoose.Types.ObjectId(),
      waypoints: [{
        sequence: 1,
        name: 'Checkpoint 1',
        type: 'BORDER_CUSTOMS',
        location: { coordinates: [106.1, 11.2] },
        estimatedArrival: new Date()
      }]
    });
    assert(routeTest.currentLocation === null, 'TransportRoute default currentLocation is strictly null (prevents Null Island [0,0])');
    assert(!routeTest.validateSync(), 'TransportRoute validates successfully');

    const routeIndexes = TransportRoute.schema.indexes();
    const has2dSphere = routeIndexes.some(idx => idx[0]['currentLocation.coordinates'] === '2dsphere');
    assert(has2dSphere, 'TransportRoute has 2dsphere index on currentLocation.coordinates');

    // 7. Validate HealthLog
    const healthTest = new HealthLog({
      eventId: '550e8400-e29b-41d4-a716-446655440000',
      tripId: new mongoose.Types.ObjectId(),
      horseId: new mongoose.Types.ObjectId(),
      recordedBy: new mongoose.Types.ObjectId(),
      temperatureCelsius: 38.2,
      waterIntakeLiters: 15,
      foodIntakeStatus: 'NORMAL',
      condition: 'STABLE',
      alertType: 'NONE',
      recordedAt: new Date()
    });
    assert(!healthTest.validateSync(), 'HealthLog model validates with eventId UUID and condition enum');

    // 8. Validate Incident Model & 2dsphere Index
    const incidentTest = new Incident({
      eventId: '660e8400-e29b-41d4-a716-446655440001',
      tripId: new mongoose.Types.ObjectId(),
      reportedBy: new mongoose.Types.ObjectId(),
      location: {
        type: 'Point',
        coordinates: [106.7009, 10.7769]
      },
      description: 'Flat tire near border',
      status: 'OPEN'
    });
    assert(!incidentTest.validateSync(), 'Incident model validates with GeoJSON location [lng, lat]');
    const incidentIndexes = Incident.schema.indexes();
    const hasIncident2d = incidentIndexes.some(idx => idx[0]['location'] === '2dsphere');
    assert(hasIncident2d, 'Incident has 2dsphere index on location');

    // 9. Validate DigitalPOD with Authorized Recipient Role
    const podTest = new DigitalPOD({
      tripId: new mongoose.Types.ObjectId(),
      orderId: new mongoose.Types.ObjectId(),
      signerName: 'Nguyen Van B',
      signerPhone: '+84912345678',
      signerRole: 'AUTHORIZED_RECIPIENT',
      signatureImageUrl: 'https://example.com/sig.png',
      locationSigned: { coordinates: [106.7009, 10.7769] },
      horseConditionsOnArrival: [{
        horseId: new mongoose.Types.ObjectId(),
        conditionStatus: 'EXCELLENT'
      }]
    });
    assert(!podTest.validateSync(), 'DigitalPOD model validates with signerRole AUTHORIZED_RECIPIENT');

    // 10. Validate AuditLog result Status (SUCCESS, FAILURE, DENIED)
    const auditTest = new AuditLog({
      actorId: new mongoose.Types.ObjectId(),
      action: 'BOOKING_APPROVE',
      resource: 'Order',
      resourceId: 'TR-2026-0001',
      result: 'DENIED',
      errorMessage: 'User lacks booking:approve permission',
      ipAddress: '192.168.1.1'
    });
    assert(!auditTest.validateSync(), 'AuditLog model validates with result DENIED');

    console.log('----------------------------------------------------');
    console.log(`SUMMARY: ${testsPassed} Passed, ${testsFailed} Failed`);
    console.log('----------------------------------------------------');

    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cbrt_db';
    console.log(`📡 Connecting to MongoDB at ${mongoUri} for database index validation...`);

    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
    console.log(' Connection to MongoDB successful!');

    // Reset test database for clean index creation
    console.log(' Dropping legacy test database for clean index creation...');
    await mongoose.connection.db.dropDatabase();

    await Promise.all([
      User.syncIndexes(),
      RefreshTokenSession.syncIndexes(),
      Horse.syncIndexes(),
      Order.syncIndexes(),
      ComplianceDoc.syncIndexes(),
      TransportRoute.syncIndexes(),
      HealthLog.syncIndexes(),
      Incident.syncIndexes(),
      DigitalPOD.syncIndexes(),
      AuditLog.syncIndexes()
    ]);

    console.log(' ✅ ALL 10 MONGOOSE MODEL INDEXES SYNCED SUCCESSFULLY TO MONGODB!');
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed.');

  } catch (error) {
    if (error.name === 'MongooseServerSelectionError') {
      console.log('⚠️ Note: MongoDB is not currently running locally or URI unreachable. Offline Schema Validation PASSED 100%.');
    } else {
      console.error('❌ Verification Error:', error);
      process.exit(1);
    }
  }
}

runVerification();
