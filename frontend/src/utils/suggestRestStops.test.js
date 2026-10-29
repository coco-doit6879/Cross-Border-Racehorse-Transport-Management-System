import assert from 'node:assert/strict';
import test from 'node:test';
import { suggestRestStops } from './suggestRestStops.js';

const getRoad = async points => ({
  path: points,
  legs: points.slice(1).map((p, i) => ({ driveHours: Math.abs(p[0] - points[i][0]) })),
});

test('short routes preserve chosen stops and report no additions', async () => {
  const stops = [{ name: 'Cửa khẩu', type: 'BORDER_CUSTOMS', coordinates: [1, 0], countryCode: 'KH', minutes: 45 }];
  const result = await suggestRestStops([0, 0], [3, 0], stops, getRoad);
  assert.equal(result.added, 0);
  assert.deepEqual(result.stops, stops);
});

test('long routes retain customs and insert rest stops in travel order with verified durations', async () => {
  const border = { name: 'Cửa khẩu', type: 'BORDER_CUSTOMS', coordinates: [9, 0], countryCode: 'KH', minutes: 45 };
  const result = await suggestRestStops([0, 0], [15, 0], [border], getRoad);
  assert.equal(result.added, 4);
  assert.deepEqual(result.stops.find(s => s.type === 'BORDER_CUSTOMS'), border);
  const verified = await getRoad([[0, 0], ...result.stops.map(s => s.coordinates), [15, 0]]);
  assert.ok(verified.legs.every(leg => leg.driveHours <= 4));
  assert.ok(result.stops.filter(s => s.type === 'REST_STOP').every(s => s.minutes === 45));
});

test('service failure does not mutate existing stops', async () => {
  const stops = [{ name: 'Trạm cũ', coordinates: [1, 0], minutes: 45 }];
  const before = structuredClone(stops);
  await assert.rejects(suggestRestStops([0, 0], [9, 0], stops, async () => { throw new Error('OSRM unavailable'); }), /OSRM unavailable/);
  assert.deepEqual(stops, before);
});
