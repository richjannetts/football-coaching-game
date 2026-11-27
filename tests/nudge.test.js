// The gentle nudge on a first wrong try: it names who or where to think
// about, and every line it can say is in the script.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nudgeFor, NUDGE_LINES } from '../src/lib/nudge.js';
import { readJson } from './helpers.js';

const script = readJson('src/data/script.json');
const team = readJson('src/data/team.json');
const ids = new Set(script.lines.map((l) => l.id));

test('nudge: every line it can say is in the script', () => {
  for (const id of NUDGE_LINES) assert.ok(ids.has(id), `missing line ${id}`);
});

test('nudge: every role in every shape has its own nudge', () => {
  for (const [key, shape] of Object.entries(team.shapes)) {
    const kind = key;
    for (const spot of shape.spots) {
      assert.notEqual(nudgeFor({ type: spot.role }, { kind }), 'hint.lookAgain', `${key}: ${spot.role}`);
    }
  }
});

test('nudge: rule problems point at the rule, not the shape', () => {
  assert.equal(nudgeFor({ type: 'ownHalf' }, { fromRule: true }), 'nudge.halfway');
  assert.equal(nudgeFor({ type: 'ring' }, { fromRule: true }), 'nudge.steps');
  assert.equal(nudgeFor({ type: 'onBall' }, { fromRule: true }), 'nudge.ball');
});

test('nudge: a friend inside is a passer at our restarts and a marker at theirs', () => {
  assert.equal(nudgeFor({ type: 'inside' }, { kind: 'ourKickIn' }), 'nudge.friends');
  assert.equal(nudgeFor({ type: 'inside' }, { kind: 'theirKickIn' }), 'nudge.defend');
});

test('nudge: no problem falls back to "have another look"', () => {
  assert.equal(nudgeFor(null), 'hint.lookAgain');
});

test('nudge lines never give the answer away with "glowing" spots', () => {
  for (const id of NUDGE_LINES) {
    const line = script.lines.find((l) => l.id === id);
    assert.doesNotMatch(line.text, /glow/i, id);
  }
});

test('every level gives a coaching tip after a right line-up', () => {
  for (let n = 1; n <= 10; n++) assert.ok(ids.has(`coach.c${n}`), `coach.c${n}`);
});
