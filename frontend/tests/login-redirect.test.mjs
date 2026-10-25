import test from 'node:test';
import assert from 'node:assert/strict';
import { getLoginRedirect } from '../src/utils/loginRedirect.js';

test('login selects the home page for each web role', () => {
  for (const [role, home] of Object.entries({
    LOGISTICS_MANAGER: '/manager', TRANSPORT_SPECIALIST: '/specialist/horses',
    FLEET_COORDINATOR: '/fleet/trips', ROUTE_COORDINATOR: '/fleet/trips', CUSTOMER: '/dashboard'
  })) assert.equal(getLoginRedirect({ role }), home);
});

test('login restores the requested page including query and fragment', () => {
  assert.equal(getLoginRedirect({ role: 'CUSTOMER' }, '/orders?status=pending#list'), '/orders?status=pending#list');
});

test('login falls back when the requested page is forbidden', () => {
  assert.equal(getLoginRedirect({ role: 'CUSTOMER' }, '/manager/trips'), '/dashboard');
  assert.equal(getLoginRedirect({ role: 'ROUTE_COORDINATOR' }, '/orders/create'), '/fleet/trips');
});

test('login rejects external paths and authentication loops', () => {
  for (const from of ['https://example.com', '//example.com', '/\\example.com', '/login', '/login/?x=1', '/register', '/forbidden', {}, null]) {
    assert.equal(getLoginRedirect({ role: 'CUSTOMER' }, from), '/dashboard');
  }
});
