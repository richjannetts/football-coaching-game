import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toSegment, checkPass, checkIntercept, checkKeeper, checkDrill, scenePositions } from '../src/lib/drillChecks.js';
import { readJson } from './helpers.js';

const training = readJson('src/data/training.json');
const script = new Set(readJson('src/data/script.json').lines.map((l) => l.id));
const pt = ([x, y]) => ({ x, y });

test('toSegment: distance from a point to the line between two others', () => {
  const r = toSegment({ x: 5, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 });
  assert.equal(r.d, 3);
  assert.equal(r.t, 0.5);
  // Past the end, the distance is to the end point.
  assert.equal(toSegment({ x: 13, y: 4 }, { x: 0, y: 0 }, { x: 10, y: 0 }).d, 5);
});

test('pass: blocked, too far, too near and clear', () => {
  const ball = { x: 15, y: 12 };
  const them = [{ x: 15, y: 19 }];
  assert.deepEqual(checkPass({ ball, mate: { x: 15, y: 25 }, them }), { ok: false, why: 'blocked', who: 0 });
  assert.equal(checkPass({ ball, mate: { x: 15, y: 39 }, them: [] }).why, 'far');
  assert.equal(checkPass({ ball, mate: { x: 16, y: 13 }, them: [] }).why, 'near');
  assert.equal(checkPass({ ball, mate: { x: 22, y: 19 }, them }).ok, true);
});

test('intercept: on the pass line and between them', () => {
  const from = { x: 8, y: 24 };
  const to = { x: 22, y: 16 };
  assert.equal(checkIntercept({ me: { x: 15, y: 20 }, from, to }).ok, true);
  assert.equal(checkIntercept({ me: { x: 15, y: 10 }, from, to }).ok, false);
  // Standing right next to their player with the ball is not between them.
  assert.equal(checkIntercept({ me: { x: 8.5, y: 23.5 }, from, to }).ok, false);
});

test('keeper: in line with the ball, a step off her line', () => {
  const ball = { x: 15, y: 15 };
  assert.equal(checkKeeper({ keeper: { x: 15, y: 3 }, ball }).ok, true);
  assert.equal(checkKeeper({ keeper: { x: 15, y: 0.5 }, ball }).why, 'back');
  assert.equal(checkKeeper({ keeper: { x: 15, y: 9 }, ball }).why, 'far');
  assert.equal(checkKeeper({ keeper: { x: 11, y: 3 }, ball }).why, 'offLine');
});

// Every puzzle must start wrong (or there is nothing to do), and its good
// answer, used by the hints, must be right.
for (const [id, drill] of Object.entries(training.drills)) {
  test(`training ${id}: each puzzle starts wrong and its good answer is right`, () => {
    for (const [i, scene] of drill.scenes.entries()) {
      const start = pt(scene.us[scene.move]);
      assert.equal(checkDrill(drill.kind, scenePositions(drill.kind, scene, start)).ok, false, `${id} puzzle ${i + 1} starts right`);
      assert.equal(checkDrill(drill.kind, scenePositions(drill.kind, scene, pt(scene.ideal))).ok, true, `${id} puzzle ${i + 1}: the good answer is wrong`);
      for (const [x, y] of [scene.ideal, ...Object.values(scene.us), ...scene.them]) {
        assert.ok(x > 0 && x < 30 && y > 0 && y < 40, `${id} puzzle ${i + 1}: a player is off the pitch`);
      }
    }
  });
  test(`training ${id}: every line it speaks is in the script`, () => {
    const lines = [...drill.intro, ...drill.right, ...Object.values(drill.nudge), drill.show, drill.together, drill.tip, ...drill.scenes.flatMap((s) => s.say)];
    for (const line of lines) assert.ok(script.has(line), `${line} is not in script.json`);
  });
}

test('training: every built tile has a mini-game', () => {
  for (const sec of training.sections) for (const tile of sec.tiles) if (tile.built) assert.ok(training.drills[tile.id], `${tile.id} is built but has no drill`);
});
