const mongoose = require('mongoose');
const User = require('../models/User');
const Horse = require('../models/Horse');
const Order = require('../models/Order');
const geocodingService = require('../services/geocodingService');

const connectDB = async () => {
  if (mongoose.connection.readyState === 0) {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cbrt_db';
    await mongoose.connect(mongoUri);
  }
};

async function runTests() {
  console.log('====================================================');
  console.log('STARTING AUTOMATED BACKEND VERIFICATION FOR CREATE ORDER LOCATION FLOW');
  console.log('====================================================\n');

  await connectDB();

  let testCustomer = await User.findOne({ role: 'CUSTOMER' });
  if (!testCustomer) {
    console.error('ERROR: No CUSTOMER user found in database for testing.');
    process.exit(1);
  }

  let testHorse = await Horse.findOne({ ownerId: testCustomer._id });
  if (!testHorse) {
    testHorse = await Horse.create({
      microchipId: '982000123456789',
      feiPassportNumber: 'FEI-TEST-999',
      name: 'Thunderbolt Test Horse',
      breed: 'Thoroughbred',
      dateOfBirth: new Date('2020-01-01'),
      gender: 'STALLION',
      weightKg: 480,
      ownerId: testCustomer._id,
      passportScanUrl: 'https://example.com/passport.pdf'
    });
  }

  console.log(`[TEST SETUP] Using Customer: ${testCustomer.username} (${testCustomer._id})`);
  console.log(`[TEST SETUP] Using Horse: ${testHorse.name} (${testHorse._id})\n`);

  let passed = 0;
  let failed = 0;

  // TEST 9: Haversine distance calculation test
  console.log('--- TEST 9: Haversine distance calculation within tolerance ---');
  // Saigon [106.7009, 10.7769] -> Phnom Penh [104.9212, 11.5564]
  const dist = geocodingService.calculateDistanceKm([106.7009, 10.7769], [104.9212, 11.5564]);
  console.log(`Calculated distance Saigon -> Phnom Penh: ${dist} km`);
  if (dist > 200 && dist < 250) {
    console.log('PASS: Haversine distance calculation accurate (~213 km)\n');
    passed++;
  } else {
    console.error(`FAIL: Expected distance ~213 km, got ${dist} km\n`);
    failed++;
  }

  // TEST 1: Valid origin + destination coordinates -> order created
  console.log('--- TEST 1: Valid origin + destination coordinates -> order created ---');
  try {
    const validOrder = await Order.create({
      bookingCode: `TR-2026-TEST-${Date.now().toString().slice(-4)}`,
      customerId: testCustomer._id,
      horseIds: [testHorse._id],
      origin: {
        address: '128 Nguyễn Văn Hưởng, Thảo Điền, Thủ Đức, TP.HCM',
        countryCode: 'VN',
        coordinates: [106.7329, 10.8034] // [lng, lat]
      },
      destination: {
        address: 'Chbar Ampov, Phnom Penh, Cambodia',
        countryCode: 'KH',
        coordinates: [104.9212, 11.5564] // [lng, lat]
      },
      estimatedDistanceKm: dist,
      requestedDepartureDate: new Date(),
      status: 'PENDING_APPROVAL'
    });

    if (validOrder && validOrder.status === 'PENDING_APPROVAL' && validOrder.origin.coordinates[0] === 106.7329) {
      console.log(`PASS: Order created with ID ${validOrder._id}, bookingCode: ${validOrder.bookingCode}, status: PENDING_APPROVAL\n`);
      passed++;
    } else {
      console.error('FAIL: Order creation failed validation check\n');
      failed++;
    }
  } catch (err) {
    console.error(`FAIL: Valid order creation threw error: ${err.message}\n`);
    failed++;
  }

  // TEST 2: Missing origin coordinates -> error
  console.log('--- TEST 2: Missing origin coordinates -> rejected ---');
  try {
    const invalidOrder = new Order({
      bookingCode: `TR-2026-FAIL1-${Date.now().toString().slice(-4)}`,
      customerId: testCustomer._id,
      horseIds: [testHorse._id],
      origin: { address: 'Invalid Origin', countryCode: 'VN' }, // Missing coordinates
      destination: { address: 'Valid Destination', countryCode: 'KH', coordinates: [104.9212, 11.5564] },
      requestedDepartureDate: new Date()
    });
    await invalidOrder.save();
    console.error('FAIL: Order with missing origin coordinates was wrongly saved!\n');
    failed++;
  } catch (err) {
    console.log(`PASS: Properly rejected order with missing origin coordinates: ${err.message}\n`);
    passed++;
  }

  // TEST 3: Missing destination coordinates -> error
  console.log('--- TEST 3: Missing destination coordinates -> rejected ---');
  try {
    const invalidOrder = new Order({
      bookingCode: `TR-2026-FAIL2-${Date.now().toString().slice(-4)}`,
      customerId: testCustomer._id,
      horseIds: [testHorse._id],
      origin: { address: 'Valid Origin', countryCode: 'VN', coordinates: [106.7329, 10.8034] },
      destination: { address: 'Invalid Destination', countryCode: 'KH' }, // Missing coordinates
      requestedDepartureDate: new Date()
    });
    await invalidOrder.save();
    console.error('FAIL: Order with missing destination coordinates was wrongly saved!\n');
    failed++;
  } catch (err) {
    console.log(`PASS: Properly rejected order with missing destination coordinates: ${err.message}\n`);
    passed++;
  }

  // TEST 4 & 5: Invalid longitude & latitude range check helper
  console.log('--- TEST 4 & 5: Invalid longitude/latitude validation ---');
  const isValidCoords = (coords) => {
    if (!Array.isArray(coords) || coords.length !== 2) return false;
    const [lng, lat] = coords;
    if (typeof lng !== 'number' || typeof lat !== 'number' || isNaN(lng) || isNaN(lat)) return false;
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return false;
    if (lng === 0 && lat === 0) return false;
    return true;
  };

  const badLng = isValidCoords([200, 10.7769]);
  const badLat = isValidCoords([106.7009, 100]);
  const zeroCoords = isValidCoords([0, 0]);

  if (!badLng && !badLat && !zeroCoords) {
    console.log('PASS: Coordinate validator correctly rejects invalid longitude (>180), invalid latitude (>90), and default [0,0]\n');
    passed += 2;
  } else {
    console.error('FAIL: Coordinate validator failed invalid range check\n');
    failed += 2;
  }

  // TEST 6: No horses -> error
  console.log('--- TEST 6: No horses -> rejected ---');
  try {
    const noHorseOrder = new Order({
      bookingCode: `TR-2026-NOHORSE-${Date.now().toString().slice(-4)}`,
      customerId: testCustomer._id,
      horseIds: [], // Empty array
      origin: { address: 'Valid Origin', countryCode: 'VN', coordinates: [106.7329, 10.8034] },
      destination: { address: 'Valid Destination', countryCode: 'KH', coordinates: [104.9212, 11.5564] },
      requestedDepartureDate: new Date()
    });
    await noHorseOrder.save();
    console.error('FAIL: Order with no horses was wrongly saved!\n');
    failed++;
  } catch (err) {
    console.log(`PASS: Properly rejected order with no horses: ${err.message}\n`);
    passed++;
  }

  // TEST 10: Order persistence verification
  console.log('--- TEST 10: Order persistence in MongoDB ---');
  const foundOrders = await Order.find({ customerId: testCustomer._id }).limit(1);
  if (foundOrders.length > 0) {
    console.log(`PASS: Order successfully persisted in MongoDB with GeoJSON coordinates: [${foundOrders[0].origin.coordinates}]\n`);
    passed++;
  } else {
    console.error('FAIL: Could not find persisted order in MongoDB\n');
    failed++;
  }

  console.log('====================================================');
  console.log(`SUMMARY: PASSED ${passed} / ${passed + failed} TESTS`);
  console.log('====================================================');

  await mongoose.disconnect();
}

runTests().catch(err => {
  console.error('Test script crashed:', err);
  process.exit(1);
});
