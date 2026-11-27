import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCupPath, smooth } from '../src/lib/path.js';
import { buildClock } from '../src/lib/clock.js';
import { ladder } from '../src/lib/cup.js';
import levels from '../src/data/levels.json' with { type: 'json' };

const ROUNDS = levels.cup.rounds;
const total = ROUNDS.reduce((n, r) => n + r.halves.flat().length, 0);
const pathFor = (round, progress = {}, won = 0) => buildCupPath(ladder(ROUNDS, { round }), buildClock(ROUNDS[round].halves, progress), won);

test('path: every round of the cup, then the cup at the top', () => {
  const p = pathFor(0);
  assert.equal(p.nodes.length, total + 1);
  assert.equal(p.nodes.at(-1).kind, 'cup');
  // Each round starts with a flag naming it.
  assert.deepEqual(p.nodes.filter((n) => n.flag).map((n) => n.flag), ROUNDS.map((r) => r.label));
  // It climbs: each one is higher up the screen than the one before.
  for (let i = 1; i < p.nodes.length; i++) assert.ok(p.nodes[i].y < p.nodes[i - 1].y);
  assert.ok(p.nodes.every((n) => n.y > 0 && n.y < p.height && n.x > 30 && n.x < p.width - 30));
});

test('path: numbers count the moments in each round', () => {
  const p = pathFor(0);
  ROUNDS.forEach((r, ri) => {
    assert.deepEqual(p.nodes.filter((n) => n.round === ri).map((n) => n.number), r.halves.flat().map((_, k) => k + 1));
  });
});

test('path: a new player stands at the first moment, and later rounds are locked', () => {
  const p = pathFor(0);
  assert.equal(p.at, 0);
  assert.equal(p.nodes[0].state, 'now');
  assert.ok(p.nodes.filter((n) => n.round > 0 && n.kind === 'moment').every((n) => n.state === 'locked' && !n.playable));
  assert.equal(p.doneTrail, '');
});

test('path: in the semi-final, Round 1 is done and she stands on the next moment', () => {
  const order = ROUNDS[1].halves.flat();
  const p = pathFor(1, { [`ch${order[0]}`]: true });
  const r1 = p.nodes.filter((n) => n.round === 0);
  assert.ok(r1.every((n) => n.state === 'done' && !n.playable));
  const here = p.nodes[p.at];
  assert.equal(here.round, 1);
  assert.equal(here.level, order[1]);
  assert.equal(here.state, 'now');
  assert.notEqual(p.doneTrail, '');
});

test('path: the cup turns gold once a cup is won', () => {
  assert.equal(pathFor(0).nodes.at(-1).state, 'locked');
  assert.equal(pathFor(0, {}, 1).nodes.at(-1).state, 'won');
});

test('path: smooth line through points', () => {
  assert.equal(smooth([]), '');
  assert.match(smooth([[0, 0], [10, 10], [20, 0]]), /^M0 0 C/);
});
