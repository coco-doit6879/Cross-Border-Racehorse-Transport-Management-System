const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isAtLeastOneYearOld } = require('../src/utils/horseAge');
test('horse must reach its first birthday in Vietnam time', () => {
  assert.equal(isAtLeastOneYearOld('2025-10-28', new Date('2026-10-27T16:59:59Z')), false);
  assert.equal(isAtLeastOneYearOld('2025-10-28', new Date('2026-10-27T17:00:00Z')), true);
  assert.equal(isAtLeastOneYearOld('2024-02-29', new Date('2025-02-28T05:00:00Z')), false);
  assert.equal(isAtLeastOneYearOld('2024-02-29', new Date('2025-03-01T05:00:00Z')), true);
  assert.equal(isAtLeastOneYearOld(null), false);
});
