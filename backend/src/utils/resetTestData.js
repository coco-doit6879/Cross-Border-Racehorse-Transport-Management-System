const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: __dirname + '/../../.env' });

const User = require('../models/User');
const Horse = require('../models/Horse');
const Order = require('../models/Order');
const ComplianceDoc = require('../models/ComplianceDoc');
const TransportRoute = require('../models/TransportRoute');
const HealthLog = require('../models/HealthLog');
const Incident = require('../models/Incident');
const DigitalPOD = require('../models/DigitalPOD');
const AuditLog = require('../models/AuditLog');
const RefreshTokenSession = require('../models/RefreshTokenSession');

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cbrt_db';

async function resetTestData() {
  console.log('====================================================');
  console.log('🧹 CBRT DATA CLEANUP SCRIPT');
  console.log('====================================================');

  await mongoose.connect(mongoUri);
  console.log('📡 Connected to MongoDB:', mongoUri);

  // 1. Purge all business data
  console.log('🗑️ Purging business collections...');
  const horseRes = await Horse.deleteMany({});
  const orderRes = await Order.deleteMany({});
  const routeRes = await TransportRoute.deleteMany({});
  const compRes = await ComplianceDoc.deleteMany({});
  const healthRes = await HealthLog.deleteMany({});
  const incidentRes = await Incident.deleteMany({});
  const podRes = await DigitalPOD.deleteMany({});
  const auditRes = await AuditLog.deleteMany({});
  const tokenRes = await RefreshTokenSession.deleteMany({});

  console.log(`   - Deleted Horses: ${horseRes.deletedCount}`);
  console.log(`   - Deleted Orders: ${orderRes.deletedCount}`);
  console.log(`   - Deleted Routes: ${routeRes.deletedCount}`);
  console.log(`   - Deleted Compliance Docs: ${compRes.deletedCount}`);
  console.log(`   - Deleted Health Logs: ${healthRes.deletedCount}`);
  console.log(`   - Deleted Incidents: ${incidentRes.deletedCount}`);
  console.log(`   - Deleted Digital PODs: ${podRes.deletedCount}`);
  console.log(`   - Deleted Audit Logs: ${auditRes.deletedCount}`);
  console.log(`   - Deleted Refresh Sessions: ${tokenRes.deletedCount}`);

  // 2. Ensure system accounts exist and passwords are valid
  console.log('\n🔒 Resetting system accounts with valid passwords...');
  const defaultPasswordHash = bcrypt.hashSync('password123', 10);

  const systemUsers = [
    { username: 'e2e_manager', email: 'e2e_manager@cbrt.com', fullName: 'E2E Logistics Manager', role: 'LOGISTICS_MANAGER', phone: '0901000001' },
    { username: 'e2e_specialist', email: 'e2e_specialist@cbrt.com', fullName: 'E2E Transport Specialist', role: 'TRANSPORT_SPECIALIST', phone: '0901000002' },
    { username: 'e2e_coordinator', email: 'e2e_coordinator@cbrt.com', fullName: 'E2E Fleet Coordinator', role: 'FLEET_COORDINATOR', phone: '0901000003' },
    { username: 'e2e_driver', email: 'e2e_driver@cbrt.com', fullName: 'E2E Transport Driver', role: 'DRIVER', phone: '0901000004' },
    { username: 'e2e_escort', email: 'e2e_escort@cbrt.com', fullName: 'E2E Equine Escort', role: 'ESCORT', phone: '0901000005' },
    { username: 'e2e_customer', email: 'e2e_customer@cbrt.com', fullName: 'E2E Racehorse Customer', role: 'CUSTOMER', phone: '0901000006' },
    { username: 'manager', email: 'manager@cbrt.com', fullName: 'Alex Manager', role: 'LOGISTICS_MANAGER', phone: '0902000001' },
    { username: 'specialist', email: 'specialist@cbrt.com', fullName: 'Sarah Specialist', role: 'TRANSPORT_SPECIALIST', phone: '0902000002' },
    { username: 'coordinator', email: 'coordinator@cbrt.com', fullName: 'Chris Coordinator', role: 'FLEET_COORDINATOR', phone: '0902000003' },
    { username: 'driver', email: 'driver@cbrt.com', fullName: 'David Driver', role: 'DRIVER', phone: '0902000004' },
    { username: 'escort', email: 'escort@cbrt.com', fullName: 'Emma Escort', role: 'ESCORT', phone: '0902000005' },
    { username: 'customer', email: 'customer@cbrt.com', fullName: 'Edward Customer', role: 'CUSTOMER', phone: '0902000006' }
  ];

  for (const u of systemUsers) {
    await User.findOneAndUpdate(
      { email: u.email },
      { ...u, password: defaultPasswordHash, isActive: true },
      { upsert: true, new: true }
    );
    console.log(`   - Verified User: [${u.role}] ${u.email}`);
  }

  // Remove any extra user accounts that are not in the systemUsers list if desired
  const systemEmails = systemUsers.map(u => u.email);
  const extraUserRes = await User.deleteMany({ email: { $nin: systemEmails } });
  if (extraUserRes.deletedCount > 0) {
    console.log(`   - Removed extra temporary users: ${extraUserRes.deletedCount}`);
  }

  console.log('\n====================================================');
  console.log('✨ DATABASE CLEANUP COMPLETED SUCCESSFULLY!');
  console.log('====================================================');

  await mongoose.disconnect();
  process.exit(0);
}

resetTestData().catch(err => {
  console.error('❌ Error cleaning data:', err);
  process.exit(1);
});
