import test from 'node:test';
import assert from 'node:assert/strict';
import {formatPaymentDate} from '../src/utils/managerFormat.js';
test('payment timestamps accept VNPAY and ISO without crashing the finance table',()=>{
 assert.equal(formatPaymentDate('20261024012700'),formatPaymentDate('2026-10-23T18:27:00Z'));
 assert.equal(formatPaymentDate('invalid'),'—');
 assert.equal(formatPaymentDate(null),'—');
});
