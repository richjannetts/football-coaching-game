import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readTouches, tickToday, earnedKeys, setChart, newChart, isFull, dayKey } from '../src/lib/touches.js';

const start = { touches: 100, days: 4 };

test('touches: starts from the default chart, and ignores bad saved data', () => {
  assert.deepEqual(readTouches(null, start), { touches: 100, days: 4, ticks: [], set: false });
  assert.deepEqual(readTouches({ touches: 'x', days: -1, ticks: 'no' }, start), { touches: 100, days: 4, ticks: [], set: false });
});

test('touches: one ball a day, and none once the chart is full', () => {
  let s = readTouches(null, start);
  let r = tickToday(s, '2026-12-20');
  assert.equal(r.added, true);
  r = tickToday(r.state, '2026-12-20');
  assert.equal(r.added, false);
  s = r.state;
  for (const d of ['2026-12-22', '2026-12-25', '2026-12-26']) s = tickToday(s, d).state;
  assert.equal(isFull(s), true);
  assert.equal(tickToday(s, '2026-12-27').added, false);
});

test('touches: stickers come from the total, not days in a row', () => {
  const s = { ...readTouches(null, start), ticks: ['2026-12-01', '2026-12-09'] };
  assert.deepEqual(earnedKeys(s), ['touches1', 'touchesHalf']);
  assert.deepEqual(earnedKeys({ ...s, ticks: [] }), []);
});

test('touches: changing the dials keeps the balls, a new chart clears them', () => {
  const s = { ...readTouches(null, start), ticks: ['a', 'b', 'c'] };
  assert.deepEqual(setChart(s, { touches: 50, days: 2 }).ticks, ['a', 'b']);
  assert.equal(setChart(s, { touches: 50, days: 2 }).set, true);
  assert.deepEqual(newChart(s).ticks, []);
});

test('touches: a day is the date on the phone', () => {
  assert.equal(dayKey(new Date(2026, 11, 5)), '2026-12-05');
});
