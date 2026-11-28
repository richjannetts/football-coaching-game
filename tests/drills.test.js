import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toSegment, checkPass, checkIntercept, checkKeeper, checkShoot, checkSave, checkDribble, checkPress, checkTackle, checkCover, checkDrill, scenePositions } from '../src/lib/drillChecks.js';
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

test('shoot: not too far out, not too close, not too wide, and a clear shot', () => {
  assert.equal(checkShoot({ me: { x: 15, y: 22 }, them: [] }).why, 'far');
  assert.equal(checkShoot({ me: { x: 14, y: 37 }, them: [] }).why, 'near');
  assert.equal(checkShoot({ me: { x: 26, y: 34 }, them: [] }).why, 'wide');
  assert.deepEqual(checkShoot({ me: { x: 15, y: 31 }, them: [{ x: 15, y: 35, at: 2 }] }), { ok: false, why: 'blocked', who: 2 });
  assert.equal(checkShoot({ me: { x: 15, y: 31 }, them: [{ x: 10, y: 28, at: 1 }] }).ok, true);
});

test('shoot: their keeper never counts as in the way', () => {
  const scene = { us: { you: [15, 22] }, them: [[15, 39]], theirKeeper: 0 };
  assert.equal(checkDrill('shoot', scenePositions('shoot', scene, { x: 15, y: 31 })).ok, true);
});

test('save: on the line of the shot, near her goal', () => {
  const shooter = { x: 15, y: 12 };
  const target = { x: 16.5, y: 0 };
  assert.equal(checkSave({ keeper: { x: 16.5, y: 3.5 }, shooter, target }).ok, true);
  assert.equal(checkSave({ keeper: { x: 11.5, y: 2.5 }, shooter, target }).why, 'offLine');
  assert.equal(checkSave({ keeper: { x: 15.5, y: 8 }, shooter, target }).why, 'far');
});

test('dribble: forward, into space, and not through their players', () => {
  const start = { x: 15, y: 12 };
  const them = [{ x: 15, y: 18 }, { x: 9, y: 20 }];
  assert.equal(checkDribble({ start, me: start, them }).why, 'back');
  assert.equal(checkDribble({ start, me: { x: 15, y: 30 }, them: [] }).why, 'far');
  assert.deepEqual(checkDribble({ start, me: { x: 16, y: 19 }, them }), { ok: false, why: 'tight', who: 0 });
  assert.deepEqual(checkDribble({ start, me: { x: 15, y: 22 }, them: [{ x: 15, y: 17 }] }), { ok: false, why: 'blocked', who: 0 });
  assert.equal(checkDribble({ start, me: { x: 21.5, y: 18.5 }, them }).ok, true);
});

test('press: only the nearest goes, close and goal side', () => {
  const ball = { x: 15, y: 24 };
  const start = { you: { x: 15, y: 16 }, mate: { x: 6, y: 12 } };
  assert.equal(checkPress({ ball, start, now: start }).why, 'none');
  assert.equal(checkPress({ ball, start, now: { ...start, mate: { x: 13, y: 22 } } }).why, 'who');
  assert.equal(checkPress({ ball, start, now: { ...start, you: { x: 15, y: 19 } } }).why, 'far');
  assert.equal(checkPress({ ball, start, now: { ...start, you: { x: 15, y: 26 } } }).why, 'side');
  assert.equal(checkPress({ ball, start, now: { ...start, you: { x: 15.5, y: 21.5 } } }).ok, true);
});

test('tackle: win the ball that is away from its player, not one at her feet', () => {
  const balls = [{ x: 10.7, y: 19.4 }, { x: 20, y: 18.5 }];
  assert.equal(checkTackle({ me: { x: 20.5, y: 17.5 }, balls, loose: 1 }).ok, true);
  assert.deepEqual(checkTackle({ me: { x: 10.5, y: 18.5 }, balls, loose: 1 }), { ok: false, why: 'close', who: 0 });
  assert.equal(checkTackle({ me: { x: 15, y: 12 }, balls, loose: 1 }).why, 'far');
});

test('play it out: a friend stays close to our goal', () => {
  assert.equal(checkCover({ mate: { x: 15.5, y: 2.5 } }).ok, true);
  assert.equal(checkCover({ mate: { x: 23, y: 15 } }).why, 'cover');
});

// Every puzzle must start wrong (or there is nothing to do), and its good
// answer, used by the hints, must be right.
for (const [id, drill] of Object.entries(training.drills)) {
  test(`training ${id}: each puzzle starts wrong and its good answer is right`, () => {
    for (const [i, scene] of drill.scenes.entries()) {
      const start = pt(scene.us[scene.move]);
      const kind = scene.kind || drill.kind;
      assert.equal(checkDrill(kind, scenePositions(kind, scene, start)).ok, false, `${id} puzzle ${i + 1} starts right`);
      assert.equal(checkDrill(kind, scenePositions(kind, scene, pt(scene.ideal))).ok, true, `${id} puzzle ${i + 1}: the good answer is wrong`);
      for (const [x, y] of [scene.ideal, ...Object.values(scene.us), ...scene.them, ...(scene.balls || [])]) {
        assert.ok(x > 0 && x < 30 && y > 0 && y < 40, `${id} puzzle ${i + 1}: a player is off the pitch`);
      }
    }
  });
  test(`training ${id}: every line it speaks is in the script`, () => {
    const lines = [...drill.intro, ...drill.right, ...Object.values(drill.nudge), drill.show, drill.together, drill.tip, ...drill.scenes.flatMap((s) => [...s.say, ...(s.right || []), s.show, s.together].filter(Boolean))];
    for (const line of lines) assert.ok(script.has(line), `${line} is not in script.json`);
  });
}

test('training: every built tile has a mini-game', () => {
  for (const sec of training.sections) for (const tile of sec.tiles) if (tile.built) assert.ok(training.drills[tile.id], `${tile.id} is built but has no drill`);
});
