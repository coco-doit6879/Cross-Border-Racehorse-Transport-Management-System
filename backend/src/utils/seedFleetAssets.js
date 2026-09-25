const mongoose = require('mongoose');
require('dotenv').config();
const Vehicle = require('../models/Vehicle');

const vehicles = [
  { plateNumber: '51C-987.65', name: 'Isuzu Horsebox 2 chỗ', capacityHorses: 2, countryCode: 'VN', registrationExpiresAt: '2028-12-31', inspectionExpiresAt: '2027-12-31', status: 'ACTIVE', notes: 'Xe vận chuyển ngựa tiêu chuẩn có camera và điều hòa.' },
  { plateNumber: '29H-246.80', name: 'Mercedes Atego Horsebox', capacityHorses: 4, countryCode: 'VN', registrationExpiresAt: '2029-06-30', inspectionExpiresAt: '2027-06-30', status: 'ACTIVE', notes: 'Xe đường dài, sức chứa 4 ngựa.' }
];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cbrt_db');
  for (const vehicle of vehicles) await Vehicle.findOneAndUpdate({ plateNumber: vehicle.plateNumber }, vehicle, { upsert: true, new: true, setDefaultsOnInsert: true });
  console.log(`Seeded ${vehicles.length} fleet vehicles.`);
  await mongoose.disconnect();
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
