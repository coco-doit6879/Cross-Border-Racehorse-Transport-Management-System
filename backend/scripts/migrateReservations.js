// Dry-run by default. Stop application writers and back up before --apply.
require('dotenv').config();
const mongoose = require('mongoose');
mongoose.set('autoIndex', false);
const Order = require('../src/models/Order');
const Route = require('../src/models/TransportRoute');
async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cbrt_db');
  const groups = [[Order, ['COMPLETED', 'CANCELLED', 'REJECTED'], ['horseIds']], [Route, ['COMPLETED', 'CANCELLED'], ['vehicleId', 'driverId', 'escortId']]];
  let blocked = false;
  for (const [model, terminal, keys] of groups) {
    const docs = await model.find({ status: { $nin: terminal } }).select(keys.join(' ')).lean();
    for (const key of keys) {
      const seen = new Map();
      for (const doc of docs) for (const resource of Array.isArray(doc[key]) ? doc[key] : [doc[key]]) {
        const value = String(resource || 'MISSING');
        if (value === 'MISSING' || seen.has(value)) { blocked = true; console.log(JSON.stringify({ model: model.modelName, key, resource: value, documents: [seen.get(value), String(doc._id)].filter(Boolean) })); }
        seen.set(value, String(doc._id));
      }
    }
    console.log(`${model.modelName}: ${docs.length} active records checked`);
  }
  if (blocked) throw new Error('Conflicts found. Resolve explicitly before migration; no data was modified.');
  if (!process.argv.includes('--apply')) { console.log('Dry-run passed. No data modified. Stop writers, back up, then use --apply.'); return; }
  for (const [model, terminal] of groups) {
    await model.updateMany({ status: { $nin: terminal } }, { $set: { activeReservation: true } });
    await model.updateMany({ status: { $in: terminal } }, { $set: { activeReservation: false } });
    await model.createIndexes();
  }
  console.log('Reservation migration complete.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
