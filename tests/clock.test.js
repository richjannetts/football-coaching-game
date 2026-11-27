import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildClock, momentsFor, nextLevel, levelAfter, minuteOf, angleFor, pointAt, orderOf, MATCH_MINUTES } from '../src/lib/clock.js';
import { readJson } from './helpers.js';

const cup = readJson('src/data/levels.json').cup;
const round1 = cup.rounds[0].halves;
const semi = cup.rounds[1].halves;

test('clock: a 40-minute match, kick-off at 0 and the last moment in the last minute', () => {
  const m = momentsFor(round1);
  assert.equal(m[0].shown, 0);
  assert.equal(m.at(-1).shown, MATCH_MINUTES - 1);
  // The second half starts at 20 minutes.
  const second = m.find((x) => x.half === 1);
  assert.equal(second.shown, 20);
  // The first half ends before half-time.
  assert.ok(m.filter((x) => x.half === 0).every((x) => x.minute < 20));
  // Time only goes forward.
  for (let i = 1; i < m.length; i++) assert.ok(m[i].minute > m[i - 1].minute);
});

test('clock: a new player has the first moment to play, and the hand at kick-off', () => {
  const c = buildClock(round1, {});
  assert.equal(c.at, 0);
  assert.equal(c.markers[0].state, 'now');
  assert.ok(c.markers.slice(1).every((x) => x.state === 'locked'));
  assert.equal(c.handAngle, angleFor(0));
  assert.equal(c.played, '');
});

test('clock: passing a moment moves the hand on, and the green part grows', () => {
  const c = buildClock(round1, { ch1: true });
  assert.equal(c.at, 1);
  assert.equal(c.markers[0].state, 'done');
  assert.equal(c.markers[1].state, 'now');
  assert.ok(c.handAngle > angleFor(0));
  assert.notEqual(c.played, '');
});

test('clock: markers show their place in this match, not the level number', () => {
  const c = buildClock(semi, {});
  assert.deepEqual(c.markers.map((m) => m.number), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(c.markers.map((m) => m.level), orderOf(semi));
});

test('clock: the next moment follows the round order', () => {
  const order = orderOf(semi);
  assert.equal(nextLevel(order, { ch1: true, ch2: true }), order[2]);
  assert.equal(levelAfter(order, 2), order[2]);
  assert.equal(levelAfter(order, 10), null);
  assert.equal(minuteOf(semi, 1), 0);
});

test('clock: with every moment finished the hand points at full time', () => {
  const progress = Object.fromEntries(orderOf(round1).map((n) => [`ch${n}`, true]));
  const c = buildClock(round1, progress);
  assert.equal(c.allDone, true);
  assert.ok(c.markers.every((m) => m.state === 'done'));
  assert.equal(nextLevel(orderOf(round1), progress), null);
});

test('clock: markers never sit on top of each other', () => {
  for (const r of cup.rounds) {
    const c = buildClock(r.halves, {});
    for (let i = 0; i < c.markers.length; i++) {
      for (let j = i + 1; j < c.markers.length; j++) {
        const a = c.markers[i];
        const b = c.markers[j];
        // Markers are 15% of the clock wide.
        assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > 15, `${r.id}: moments ${a.number} and ${b.number} overlap`);
      }
    }
    // And every marker stays inside the clock.
    for (const m of c.markers) assert.ok(m.x > 7 && m.x < 93 && m.y > 7 && m.y < 93);
  }
});

test('clock: kick-off is near the top and half-time at the bottom', () => {
  const ko = pointAt(0);
  const ht = pointAt(20);
  assert.ok(ko.y < 20 && ko.x > 50);
  assert.ok(Math.abs(ht.x - 50) < 0.01 && ht.y > 80);
});
