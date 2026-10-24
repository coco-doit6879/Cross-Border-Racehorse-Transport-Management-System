import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessPage } from '../src/utils/pageAccess.js';

const roles = ['LOGISTICS_MANAGER', 'TRANSPORT_SPECIALIST', 'FLEET_COORDINATOR', 'ROUTE_COORDINATOR', 'CUSTOMER', 'DRIVER', 'ESCORT'];
const matrix = [
  ['/manager', roles.slice(0, 4)],
  ['/manager/intake', ['LOGISTICS_MANAGER']],
  ['/manager/approvals', ['LOGISTICS_MANAGER']],
  ['/fleet/monitor', ['LOGISTICS_MANAGER', 'FLEET_COORDINATOR', 'ROUTE_COORDINATOR']],
  ['/manager/revenue', ['LOGISTICS_MANAGER']],
  ['/revenue', ['LOGISTICS_MANAGER']],
  ['/manager/drivers', ['LOGISTICS_MANAGER']],
  ['/manager/escorts', ['LOGISTICS_MANAGER']],
  ['/manager/trips/123', ['LOGISTICS_MANAGER']],
  ['/manager/schedules', ['FLEET_COORDINATOR']],
  ['/specialist/horses', ['TRANSPORT_SPECIALIST', 'LOGISTICS_MANAGER']],
  ['/specialist/compliance', ['TRANSPORT_SPECIALIST', 'LOGISTICS_MANAGER']],
  ['/fleet/trips', ['FLEET_COORDINATOR', 'ROUTE_COORDINATOR', 'LOGISTICS_MANAGER']],
  ['/fleet/vehicles', ['FLEET_COORDINATOR', 'ROUTE_COORDINATOR', 'LOGISTICS_MANAGER']],
  ['/fleet/staff', ['FLEET_COORDINATOR', 'ROUTE_COORDINATOR', 'LOGISTICS_MANAGER']],
  ['/horses/123', ['LOGISTICS_MANAGER', 'TRANSPORT_SPECIALIST', 'CUSTOMER', 'FLEET_COORDINATOR']],
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
