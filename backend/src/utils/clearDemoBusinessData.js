const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const { EJSON } = require('bson');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Explicit business-data scope. Preserve accounts, sessions, fleet and schedules.
const collections = ['transportroutes', 'incidents', 'healthlogs', 'digitalpods',
  'compliancedocs', 'paymenttransactions', 'orders', 'horses', 'horsefiles',
  'operationalalerts', 'auditlogs'];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cbrt_db', { serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  if (db.databaseName !== 'cbrt_db') throw new Error('Unexpected database; refusing reset.');
  const snapshots = new Map();
  for (const name of collections) snapshots.set(name, await db.collection(name).find({}).toArray());
  if (!process.argv.includes('--apply')) {
    for (const [name, docs] of snapshots) console.log(`${name}: ${docs.length}`);
    return;
  }
  const backup = path.resolve(__dirname, '../../../maintenance-backups', `demo-reset-${new Date().toISOString().replace(/[:.]/g, '-')}`);
  fs.mkdirSync(backup, { recursive: true });
  // Complete and verify every backup before deleting any record. Extended JSON
  // retains ObjectIds, dates and binary uploads for a future restore.
  for (const [name, docs] of snapshots) {
    const file = path.join(backup, `${name}.ejson`);
    const serialized = EJSON.stringify(docs, { relaxed: false });
    fs.writeFileSync(file, serialized, { flag: 'wx' });
    const saved = fs.readFileSync(file, 'utf8');
    if (saved !== serialized || EJSON.parse(saved).length !== docs.length) throw new Error(`Backup verification failed: ${name}`);
  }
  console.log(`Backup: ${backup}`);
  for (const [name, docs] of snapshots) {
    let deleted = 0;
    for (let i = 0; i < docs.length; i += 500) {
      const result = await db.collection(name).deleteMany({ _id: { $in: docs.slice(i, i + 500).map(doc => doc._id) } });
      deleted += result.deletedCount;
    }
    console.log(`${name}: deleted=${deleted}, remaining=${await db.collection(name).countDocuments()}`);
  }
  for (const name of ['users', 'vehicles', 'transportschedules', 'refreshtokensessions']) console.log(`Preserved ${name}: ${await db.collection(name).countDocuments()}`);
}

main().catch(error => { console.error(`Reset failed: ${error.name}`); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
