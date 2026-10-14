import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessPage } from '../src/utils/pageAccess.js';

const roles = ['LOGISTICS_MANAGER', 'TRANSPORT_SPECIALIST', 'FLEET_COORDINATOR', 'ROUTE_COORDINATOR', 'CUSTOMER', 'DRIVER', 'ESCORT'];
const matrix = [
  ['/manager', roles.slice(0, 4)],
  ['/manager/revenue', ['LOGISTICS_MANAGER']],
  ['/revenue', ['LOGISTICS_MANAGER']],
  ['/manager/drivers', ['LOGISTICS_MANAGER']],
  ['/manager/escorts', ['LOGISTICS_MANAGER']],
  ['/manager/trips/123', ['LOGISTICS_MANAGER']],
  ['/manager/schedules', ['FLEET_COORDINATOR']],
  ['/specialist/horses', ['TRANSPORT_SPECIALIST']],
  ['/specialist/compliance', ['TRANSPORT_SPECIALIST']],
  ['/fleet/trips', ['FLEET_COORDINATOR', 'ROUTE_COORDINATOR']],
  ['/fleet/vehicles', ['FLEET_COORDINATOR', 'ROUTE_COORDINATOR']],
  ['/fleet/staff', ['FLEET_COORDINATOR', 'ROUTE_COORDINATOR']],
  ['/horses/123', ['LOGISTICS_MANAGER', 'TRANSPORT_SPECIALIST', 'CUSTOMER']],
  ['/orders', roles.slice(0, 5)],
  ['/orders/create', ['CUSTOMER', 'LOGISTICS_MANAGER', 'TRANSPORT_SPECIALIST', 'FLEET_COORDINATOR']],
  ['/routes/tracking', ['CUSTOMER', 'LOGISTICS_MANAGER', 'FLEET_COORDINATOR', 'ROUTE_COORDINATOR']],
  ['/incidents/sos', ['LOGISTICS_MANAGER', 'FLEET_COORDINATOR', 'ROUTE_COORDINATOR']]
];
for (const [path, allowed] of matrix) {
  test(`page access matches role policy: ${path}`, () => {
    for (const role of roles) assert.equal(canAccessPage({ role, effectivePermissions: ['analytics:view', 'schedule:manage'] }, path), allowed.includes(role), role);
  });
}
