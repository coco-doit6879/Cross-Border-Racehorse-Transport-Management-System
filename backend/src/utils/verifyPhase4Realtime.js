// Verify the active realtime workflow: trip check-ins, access control and SOS.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const result = spawnSync(process.execPath, ['--test', 'tests/driverJourney.test.js', 'tests/driverAccess.test.js', 'tests/notifications.integration.test.js', 'tests/recovery.integration.test.js'], { cwd: root, stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
