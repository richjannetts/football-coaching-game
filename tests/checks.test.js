import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkRule, checkShape, inZone } from '../src/lib/checks.js';
import { resolveRuleSet } from '../src/lib/rules.js';
import { resolveAt, buildSpots } from '../src/lib/geometry.js';
import { readJson } from './helpers.js';

const fa = readJson('src/data/rules/fa-2026-27-5v5.json');
const league = readJson('src/data/rules/shwgl-2026-27-u8.json');
const team = readJson('src/data/team.json');
const ruleSet = resolveRuleSet('shwgl-2026-27-u8', [fa, league]);
const centre = { x: 15, y: 20 };
const halfway = 20;
const grid = team.grid;
// Places named by the first grid's columns and rows, in yards. The game's
// grid has since changed, but these are good test positions.
const OLD = { cols: [4, 9, 15, 21, 26], rows: [1.5, 7.5, 11, 14, 18.5, 26, 33] };
const at = (col, row) => ({ x: OLD.cols[col], y: OLD.rows[row] });

// The coach's shapes, written out as spots, in the order a child might place them.
const ourShape = team.shapes.ourCentreKick.spots.map((s) => resolveAt(s.at, grid));
const theirShape = team.shapes.theirCentreKick.spots.map((s) => resolveAt(s.at, grid));

const ruleOurs = (players) => checkRule({ kind: 'ours', players, ruleSet, centre, halfway });
const ruleTheirs = (players) => checkRule({ kind: 'theirs', players, ruleSet, centre, halfway });

// ---------- The rule says: our centre kick ----------

test('rule, our kick: the coach shape obeys the rule', () => {
  assert.equal(ruleOurs(ourShape).ok, true);
});

test('rule, our kick: any layout in our half with one on the ball is legal', () => {
  const players = [centre, at(0, 0), at(4, 0), at(0, 3), at(4, 3)];
  assert.equal(ruleOurs(players).ok, true);
});

test('rule, our kick: a player in their half breaks the rule', () => {
  const players = [centre, at(1, 4), at(3, 5), at(2, 1), at(2, 0)];
  const result = ruleOurs(players);
  assert.equal(result.ok, false);
  assert.equal(result.problems[0].type, 'ownHalf');
  assert.deepEqual(result.problems[0].players, [2]);
  assert.equal(result.problems[0].line, 'rule.ownHalf');
});

test('rule, our kick: nobody on the ball breaks the rule', () => {
  const players = [at(2, 4), at(1, 4), at(3, 4), at(2, 1), at(2, 0)];
  const result = ruleOurs(players);
  assert.equal(result.ok, false);
  assert.deepEqual(result.problems.map((p) => p.type), ['onBall']);
});

// ---------- The rule says: their centre kick ----------

test('rule, their kick: the coach shape obeys the rule', () => {
  assert.equal(ruleTheirs(theirShape).ok, true);
});

test('rule, their kick: a player inside five yards breaks the rule', () => {
  const players = [at(2, 4), at(1, 4), at(3, 4), at(2, 1), at(2, 0)]; // (15, 18.5) is 1.5 yards away
  const result = ruleTheirs(players);
  assert.equal(result.ok, false);
  assert.deepEqual(result.problems.map((p) => p.type), ['ring']);
  assert.deepEqual(result.problems[0].players, [0]);
});

test('rule, their kick: standing on the centre mark breaks both parts', () => {
  const players = [centre, at(1, 4), at(3, 4), at(2, 1), at(2, 0)];
  const types = ruleTheirs(players).problems.map((p) => p.type);
  assert.deepEqual(types, ['ownHalf', 'ring']);
});

test('rule, their kick: a player in their half breaks the rule', () => {
  const players = [at(2, 3), at(1, 6), at(3, 4), at(2, 1), at(2, 0)];
  const result = ruleTheirs(players);
  assert.equal(result.problems[0].type, 'ownHalf');
  assert.deepEqual(result.problems[0].players, [1]);
});

test('rule, their kick: a legal layout that is not our shape still passes the rule', () => {
  const players = [at(0, 4), at(4, 4), at(0, 0), at(4, 0), at(2, 2)];
  assert.equal(ruleTheirs(players).ok, true);
  assert.equal(checkShape({ players, shape: team.shapes.theirCentreKick, grid }).ok, false);
});

// ---------- Our team does: our centre kick shape ----------

test('shape, our kick: the coach shape passes', () => {
  const result = checkShape({ players: ourShape, shape: team.shapes.ourCentreKick, grid });
  assert.equal(result.ok, true);
  assert.deepEqual(result.emptySpots, []);
});

test('shape, our kick: any player can fill any spot', () => {
  const reversed = [...ourShape].reverse();
  const shuffled = [ourShape[3], ourShape[0], ourShape[4], ourShape[2], ourShape[1]];
  for (const players of [reversed, shuffled]) {
    const result = checkShape({ players, shape: team.shapes.ourCentreKick, grid });
    assert.equal(result.ok, true);
    // The kicker role is filled by whoever stands on the centre mark.
    const kicker = result.roles.find((r) => r.role === 'kicker');
    assert.deepEqual(players[kicker.player], centre);
  }
});

test('shape, our kick: no friend on one side names the friends hint', () => {
  const players = [centre, at(1, 4), at(3, 2), at(2, 1), at(2, 0)];
  const result = checkShape({ players, shape: team.shapes.ourCentreKick, grid });
  assert.equal(result.ok, false);
  assert.deepEqual(result.problems.map((p) => p.line), ['shape.c1.friends']);
  assert.deepEqual(result.strayPlayers, [2]);
});

test('shape, our kick: nobody in goal names the keeper hint', () => {
  const players = [centre, at(1, 4), at(3, 4), at(2, 1), at(2, 2)];
  const result = checkShape({ players, shape: team.shapes.ourCentreKick, grid });
  assert.deepEqual(result.problems.map((p) => p.line), ['shape.keeper']);
});

test('shape, our kick: the same hint is not repeated for two empty spots', () => {
  const players = [centre, at(0, 0), at(4, 0), at(2, 1), at(2, 0)];
  const result = checkShape({ players, shape: team.shapes.ourCentreKick, grid });
  assert.equal(result.emptySpots.length, 2);
  assert.deepEqual(result.problems.map((p) => p.line), ['shape.c1.friends']);
});

// ---------- Our team does: their centre kick shape ----------

test('shape, their kick: the coach shape passes in any order', () => {
  const result = checkShape({ players: [...theirShape].reverse(), shape: team.shapes.theirCentreKick, grid });
  assert.equal(result.ok, true);
});

test('shape, their kick: front player too deep names the front player hint', () => {
  const players = [at(2, 2), at(1, 4), at(3, 4), at(2, 1), at(2, 0)];
  const result = checkShape({ players, shape: team.shapes.theirCentreKick, grid });
  assert.deepEqual(result.problems.map((p) => p.line), ['shape.c2.up']);
});

test('shape, their kick: wide players behind the front player names the wide players hint', () => {
  // The old shape (wide players deeper than the front player) is no longer ours.
  const players = [at(2, 3), at(1, 2), at(3, 2), at(2, 1), at(2, 0)];
  const result = checkShape({ players, shape: team.shapes.theirCentreKick, grid });
  assert.equal(ruleTheirs(players).ok, true);
  assert.deepEqual(result.problems.map((p) => p.line), ['shape.c2.middles']);
});

test('shape, their kick: two players on one spot area cannot both count', () => {
  const players = [at(2, 3), at(2, 3), at(3, 4), at(2, 1), at(2, 0)];
  const result = checkShape({ players, shape: team.shapes.theirCentreKick, grid });
  assert.equal(result.ok, false);
  assert.equal(result.emptySpots.length, 1);
});

test('shape is separate from the rule: our shape for their kick passes the rule too', () => {
  // Data check: if the coach ever moves a spot inside the ring, this fails.
  assert.equal(ruleTheirs(theirShape).ok, true);
  assert.equal(ruleOurs(ourShape).ok, true);
});

test('shapes: our wide players stand ahead of the front player when defending', () => {
  const spots = team.shapes.theirCentreKick.spots.map((s) => ({ ...resolveAt(s.at, grid), role: s.role }));
  const up = spots.find((s) => s.role === 'up');
  spots.filter((s) => s.role === 'middle').forEach((m) => assert.ok(m.y > up.y));
});

test('shapes: at our centre kick the friends stand close to halfway', () => {
  team.shapes.ourCentreKick.spots
    .filter((s) => s.role === 'side')
    .forEach((s) => assert.ok(halfway - resolveAt(s.at, grid).y <= 2));
});

// ---------- Our team does: a marked goalkeeper ----------

test('shape with a marked keeper: she must be the one in goal', () => {
  // Player 4 is the marked keeper. Here she is at the back and player 3 is in goal.
  const players = [centre, at(1, 4), at(3, 4), at(2, 0), at(2, 1)];
  const result = checkShape({ players, shape: team.shapes.ourCentreKick, grid, keepers: [4] });
  assert.equal(result.ok, false);
  assert.ok(result.problems.some((p) => p.line === 'shape.keeper'));
});

test('shape with a marked keeper: everyone else can still fill any spot', () => {
  const players = [at(1, 4), centre, at(2, 1), at(3, 4), at(2, 0)];
  const result = checkShape({ players, shape: team.shapes.ourCentreKick, grid, keepers: [4] });
  assert.equal(result.ok, true);
});

test('the squad marks exactly one keeper', () => {
  assert.equal(team.squad.filter((p) => p.keeper).length, 1);
});

test('shapes: wherever there is a back player, she stands on the penalty box line', () => {
  const box = ruleSet.rules['pitch.penaltyArea'].value;
  for (const shape of Object.values(team.shapes)) {
    const back = shape.spots.find((s) => s.role === 'back');
    if (!back) continue; // our goal kick spreads wide instead
    assert.equal(resolveAt(back.at, grid).y, box.depth);
  }
});

// ---------- The back player: penalty box line or one dot in front ----------
// Both count as right (Rich's choice, 27th November 2026).

for (const key of ['ourCentreKick', 'theirCentreKick']) {
  const base = team.shapes[key].spots.map((s) => resolveAt(s.at, grid));
  const backIndex = team.shapes[key].spots.findIndex((s) => s.role === 'back');

  test(`shape, ${key}: back player on the penalty box line passes`, () => {
    const players = base.map((p) => ({ ...p }));
    players[backIndex] = { x: grid.cols[2], y: grid.rows[2] };
    assert.equal(checkShape({ players, shape: team.shapes[key], grid }).ok, true);
  });

  test(`shape, ${key}: back player one dot in front also passes`, () => {
    const players = base.map((p) => ({ ...p }));
    players[backIndex] = { x: grid.cols[2], y: grid.rows[3] };
    const result = checkShape({ players, shape: team.shapes[key], grid });
    assert.equal(result.ok, true);
    // The story plays out from where she actually stands.
    const back = result.roles.find((r) => r.role === 'back');
    assert.equal(back.y, grid.rows[3]);
  });

}

test('shape, our kick: back player two dots in front does not pass', () => {
  const players = ourShape.map((p) => ({ ...p }));
  const backIndex = team.shapes.ourCentreKick.spots.findIndex((s) => s.role === 'back');
  players[backIndex] = { x: grid.cols[2], y: grid.rows[4] };
  assert.equal(checkShape({ players, shape: team.shapes.ourCentreKick, grid }).ok, false);
});

// ---------- Goal kicks (levels 3 and 4) ----------
// The retreat line: at their goal kick we all go back into our own half.

const shapeOf = (key) => team.shapes[key].spots.map((s) => resolveAt(s.at, grid));
const keeperIndex = (key) => team.shapes[key].spots.findIndex((s) => s.role === 'keeper');

test('rule, their goal kick: the coach shape is all in our own half', () => {
  const r = checkRule({ kind: 'theirGoalKick', players: shapeOf('theirGoalKick'), ruleSet, centre, halfway });
  assert.equal(r.ok, true);
});

test('rule, their goal kick: anyone on or over halfway breaks the rule', () => {
  const players = shapeOf('theirGoalKick');
  players[0] = { x: 15, y: 26 };
  const r = checkRule({ kind: 'theirGoalKick', players, ruleSet, centre, halfway });
  assert.equal(r.ok, false);
  assert.equal(r.problems[0].line, 'rule.retreat');
  assert.deepEqual(r.problems[0].players, [0]);
});

test('rule, their goal kick: unlike a centre kick, there is no ring to keep out of', () => {
  // Standing near the centre mark is fine at a goal kick.
  const players = shapeOf('theirGoalKick');
  players[0] = { x: 15, y: 18.5 };
  assert.equal(checkRule({ kind: 'theirGoalKick', players, ruleSet, centre, halfway }).ok, true);
});

test('rule, our goal kick: the coach shape is all in our own half (club rule)', () => {
  const players = shapeOf('ourGoalKick');
  assert.equal(checkRule({ kind: 'ourGoalKick', players, ruleSet, centre, halfway }).ok, true);
});

test('rule, our goal kick: a player in their half breaks the club rule', () => {
  const players = shapeOf('ourGoalKick');
  players[4] = { x: 15, y: 26 };
  const r = checkRule({ kind: 'ourGoalKick', players, ruleSet, centre, halfway });
  assert.equal(r.ok, false);
  assert.equal(r.problems[0].line, 'rule.goalKickOurs');
});

test('rule, our goal kick: the FA rule alone does not stop us going up', () => {
  const faOnly = resolveRuleSet('fa-2026-27-5v5', [fa]);
  const players = shapeOf('ourGoalKick');
  players[4] = { x: 15, y: 26 };
  assert.equal(checkRule({ kind: 'ourGoalKick', players, ruleSet: faOnly, centre, halfway }).ok, true);
});

test('shape, our goal kick: spread wide with the keeper in goal passes', () => {
  const players = shapeOf('ourGoalKick');
  const fit = checkShape({ players, shape: team.shapes.ourGoalKick, grid, keepers: [keeperIndex('ourGoalKick')] });
  assert.equal(fit.ok, true);
});

test('shape, our goal kick: the wide players can stand a dot further up', () => {
  const players = shapeOf('ourGoalKick');
  players[1] = at(0, 2);
  players[2] = at(4, 2);
  assert.equal(checkShape({ players, shape: team.shapes.ourGoalKick, grid }).ok, true);
});

test('shape, our goal kick: bunched in the middle asks us to spread wide', () => {
  const players = shapeOf('ourGoalKick');
  players[1] = at(2, 1);
  players[2] = at(2, 2);
  const fit = checkShape({ players, shape: team.shapes.ourGoalKick, grid });
  assert.equal(fit.ok, false);
  assert.equal(fit.problems[0].line, 'shape.c3.wide');
});

test('shape, their goal kick: the coach shape passes, and a front player too deep does not', () => {
  const players = shapeOf('theirGoalKick');
  assert.equal(checkShape({ players, shape: team.shapes.theirGoalKick, grid }).ok, true);
  players[0] = at(2, 2);
  players[3] = at(2, 3);
  assert.equal(checkShape({ players, shape: team.shapes.theirGoalKick, grid }).ok, false);
});

test('goal kicks: the other team starts where the story needs them', () => {
  // At their goal kick they wait in their own half; their keeper is in goal.
  const theirs = team.opponents.theirGoalKick;
  assert.equal(theirs.length, 5);
  assert.deepEqual(theirs[team.opponentKeeper.theirGoalKick], [15, 38.5]);
  assert.equal(team.opponents.ourGoalKick.length, 5);
});

// ---------- Kick-ins (levels 5 and 6) ----------
// FA pass-in or dribble-in: the ball sits on the side line where it went
// out, and the other team stands five yards back.

const LEFT = { x: 0.4, y: 24.5 };
const RIGHT = { x: 29.6, y: 14 };
const resolveShape = (key) => team.shapes[key].spots.map((s) => resolveAt(s.at, grid));

test('rule, our kick-in: the coach shape has one of us on the ball', () => {
  const r = checkRule({ kind: 'ourKickIn', players: resolveShape('ourKickIn'), ruleSet, centre, halfway, ball: LEFT });
  assert.equal(r.ok, true);
});

test('rule, our kick-in: nobody on the ball breaks the rule', () => {
  const players = resolveShape('ourKickIn');
  players[0] = at(0, 5);
  const r = checkRule({ kind: 'ourKickIn', players, ruleSet, centre, halfway, ball: LEFT });
  assert.equal(r.ok, false);
  assert.equal(r.problems[0].line, 'rule.kickInOnBall');
});

test('rule, their kick-in: the coach shape keeps five yards from the ball', () => {
  const r = checkRule({ kind: 'theirKickIn', players: resolveShape('theirKickIn'), ruleSet, centre, halfway, ball: RIGHT });
  assert.equal(r.ok, true);
});

test('rule, their kick-in: a player inside five yards breaks the rule, and only she is ringed', () => {
  const players = resolveShape('theirKickIn');
  players[1] = at(4, 3); // 26, 14: under four yards from the ball
  const r = checkRule({ kind: 'theirKickIn', players, ruleSet, centre, halfway, ball: RIGHT });
  assert.equal(r.ok, false);
  assert.equal(r.problems[0].line, 'rule.kickInRing');
  assert.deepEqual(r.problems[0].players, [1]);
});

test('rule, their kick-in: unlike a goal kick, we may stand in their half', () => {
  const players = resolveShape('theirKickIn');
  players[1] = at(3, 5);
  assert.equal(checkRule({ kind: 'theirKickIn', players, ruleSet, centre, halfway, ball: RIGHT }).ok, true);
});

test('shape, kick-ins: the coach shapes pass, and the other team starts five yards away', () => {
  for (const key of ['ourKickIn', 'theirKickIn']) {
    assert.equal(checkShape({ players: resolveShape(key), shape: team.shapes[key], grid }).ok, true, key);
  }
  const keeper = team.opponentKeeper.ourKickIn;
  team.opponents.ourKickIn.forEach(([x, y], i) => {
    if (i !== keeper) assert.ok(Math.hypot(x - LEFT.x, y - LEFT.y) >= 5, `their player ${i} is too close`);
  });
});

test('the kick-in spot on the side line only appears when a level asks for it', () => {
  const plain = buildSpots(grid);
  const withKickIn = buildSpots(grid, ['kick-in-left']);
  assert.equal(plain.some((s) => s.id === 'kick-in-left'), false);
  assert.equal(withKickIn.some((s) => s.id === 'kick-in-left'), true);
  assert.equal(withKickIn.find((s) => s.id === 'kick-in-left').optional, undefined);
});

// ---------- Zones: anywhere in the right area counts ----------

test('zones: a friend one dot wider still counts at our centre kick', () => {
  const players = ourShape.map((p) => ({ ...p }));
  const side = team.shapes.ourCentreKick.spots.findIndex((s) => s.role === 'side');
  players[side] = { x: grid.cols[0], y: grid.rows[5] };
  assert.equal(checkShape({ players, shape: team.shapes.ourCentreKick, grid }).ok, true);
});

test('zones: a back player off to one side of the box line still counts', () => {
  const players = ourShape.map((p) => ({ ...p }));
  const backIndex = team.shapes.ourCentreKick.spots.findIndex((s) => s.role === 'back');
  players[backIndex] = { x: grid.cols[1], y: grid.rows[2] };
  assert.equal(checkShape({ players, shape: team.shapes.ourCentreKick, grid }).ok, true);
});

test('zones: every shape spot sits inside its own zone, on a grid dot', () => {
  for (const [key, shape] of Object.entries(team.shapes)) {
    for (const s of shape.spots) {
      if (!s.zone) continue;
      const p = resolveAt(s.at, grid);
      assert.ok(inZone(p, s.zone), `${key} ${s.role} is outside its zone`);
    }
  }
});

test('grid: the dots are evenly spaced', () => {
  const gaps = (list) => list.slice(1).map((v, i) => +(v - list[i]).toFixed(2));
  assert.equal(new Set(gaps(grid.cols)).size, 1);
  // Up the pitch: even, apart from the keeper's row on the goal line and
  // the step over the halfway line.
  const rows = gaps(grid.rows.slice(1));
  assert.ok(rows.every((g) => g === 3.5 || g === 4), rows.join(', '));
});
