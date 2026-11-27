// Replays against new teams, and Easy / Medium / Difficult.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { readJson } from './helpers.js';
import { emptyReplays, readReplays, pickOpponent, startReplay, finishReplayLevel, addGoal, isUnlocked, pathProgress } from '../src/lib/replays.js';
import { helpFor, consequenceFor, scoreWords, finalWords, isOurs } from '../src/lib/difficulty.js';
import { freeSpots, buildSpots } from '../src/lib/geometry.js';
import { checkShape } from '../src/lib/checks.js';

const replayData = readJson('src/data/replays.json');
const difficulty = readJson('src/data/difficulty.json');
const team = readJson('src/data/team.json');
const levels = readJson('src/data/levels.json');
const M1 = levels.matches[0].levels;
const ourKit = team.ourKit.default;
const fixed = (v) => () => v;

test('replays: every new team has a made-up name, real kit colours and no clash with our kit', () => {
  const colours = new Set(team.kitOptions.colours.filter((c) => !c.keeperOnly).map((c) => c.id));
  const patterns = new Set(team.kitOptions.patterns.map((p) => p.id));
  const names = new Set();
  for (const o of replayData.opponents) {
    assert.match(o.name, /^[A-Za-z ]{1,16}$/, `${o.name}: letters and spaces, 16 at most, like her own team names`);
    assert.ok(!names.has(o.name), `${o.name} is listed twice`);
    names.add(o.name);
    assert.ok(patterns.has(o.kit.pattern), `${o.name} pattern`);
    for (const part of ['shirt', 'stripe', 'shorts', 'socks']) assert.ok(colours.has(o.kit[part]), `${o.name} ${part}`);
  }
  assert.ok(replayData.opponents.length >= 4, 'enough teams to keep things fresh');
});

test('replays: each replay is against someone new, never our own colours', () => {
  let state = emptyReplays();
  const seen = [];
  for (let i = 0; i < 4; i++) {
    state = startReplay(state, { match: 'm1', difficulty: 'easy', opponents: replayData.opponents, ourKit, mirrorable: replayData.mirrorable, endings: 3, rand: fixed(0.9) });
    const o = state.current.opponent;
    const shows = o.kit.pattern === 'plain' ? [o.kit.shirt] : [o.kit.shirt, o.kit.stripe];
    assert.ok(!shows.some((c) => [ourKit.shirt, ourKit.stripe].includes(c)), `${o.name} clashes with our kit`);
    seen.push(o.name);
  }
  assert.equal(new Set(seen).size, 4);
  // A team that would clash is skipped.
  const clash = [{ name: 'Clash', kit: { pattern: 'plain', shirt: 'blue', stripe: 'white', shorts: 'white', socks: 'blue' } }, { name: 'Fine', kit: { pattern: 'plain', shirt: 'red', stripe: 'white', shorts: 'white', socks: 'red' } }];
  assert.equal(pickOpponent(clash, ourKit, 0).name, 'Fine');
});

test('replays: some levels switch sides, at least one, and only levels that can', () => {
  const none = startReplay(emptyReplays(), { match: 'm1', difficulty: 'easy', opponents: replayData.opponents, ourKit, mirrorable: replayData.mirrorable, endings: 3, rand: fixed(0.9) });
  assert.equal(none.current.mirror.length, 1, 'never zero');
  const all = startReplay(emptyReplays(), { match: 'm1', difficulty: 'easy', opponents: replayData.opponents, ourKit, mirrorable: replayData.mirrorable, endings: 3, rand: fixed(0.1) });
  assert.deepEqual(all.current.mirror, replayData.mirrorable);
  for (const n of replayData.mirrorable) assert.ok(M1.includes(n));
  assert.ok(!replayData.mirrorable.includes(1) && !replayData.mirrorable.includes(10), 'centre kicks and the penalty look the same either way');
});

test('replays: endings take turns, and the first match keeps ending 0', () => {
  let state = emptyReplays();
  const endings = [];
  for (let i = 0; i < 3; i++) {
    state = startReplay(state, { match: 'm1', difficulty: 'easy', opponents: replayData.opponents, ourKit, endings: 3, rand: fixed(0.5) });
    endings.push(state.current.ending);
  }
  assert.deepEqual(endings, [1, 2, 0]);
});

test('replays: levels finish in order, the path shows this replay, and stickers stay', () => {
  let state = startReplay(emptyReplays(), { match: 'm1', difficulty: 'medium', opponents: replayData.opponents, ourKit, endings: 3 });
  const progress = Object.fromEntries(M1.flatMap((n) => [[`ch${n}`, true], [`bonus${n}`, true]]));
  let path = pathProgress(state, progress);
  assert.equal(path.ch1, undefined, 'the replay starts at level 1');
  assert.equal(path.bonus1, true, 'bonus stickers still show');
  let r = finishReplayLevel(state, 1, M1);
  assert.equal(r.firstTime, true);
  r = finishReplayLevel(r.state, 1, M1);
  assert.equal(r.firstTime, false, 'playing a level again in the replay does not move her up twice');
  state = r.state;
  path = pathProgress(state, progress);
  assert.equal(path.ch1, true);
  assert.equal(path.ch2, undefined);
  for (const n of M1.slice(1)) r = finishReplayLevel(r.state, n, M1);
  assert.equal(r.matchDone, true);
  assert.equal(r.state.current, null, 'the replay is over');
  assert.equal(r.state.finished.medium, 1);
  assert.deepEqual(pathProgress(r.state, progress), progress, 'back to her own progress');
});

test('replays: Difficult opens after a whole match on Medium', () => {
  const lv = difficulty.levels;
  assert.equal(isUnlocked(emptyReplays(), 'easy', lv), true);
  assert.equal(isUnlocked(emptyReplays(), 'medium', lv), true);
  assert.equal(isUnlocked(emptyReplays(), 'difficult', lv), false);
  assert.equal(isUnlocked({ ...emptyReplays(), finished: { easy: 3 } }, 'difficult', lv), false);
  assert.equal(isUnlocked({ ...emptyReplays(), finished: { medium: 1 } }, 'difficult', lv), true);
});

test('replays: extra goals are counted, and a broken saved record is tidied', () => {
  let state = startReplay(emptyReplays(), { match: 'm1', difficulty: 'difficult', opponents: replayData.opponents, ourKit, endings: 3 });
  state = addGoal(state, 'them');
  assert.deepEqual(state.current.goals, { us: 0, them: 1 });
  assert.deepEqual(readReplays(null), emptyReplays());
  assert.deepEqual(readReplays({ played: 'x', current: { nonsense: 1 } }), emptyReplays());
  const back = readReplays(JSON.parse(JSON.stringify(state)));
  assert.equal(back.current.opponent.name, state.current.opponent.name);
});

test('difficulty: the first wrong try never gives reasons or hints, on any level', () => {
  for (const id of difficulty.order) {
    const cfg = difficulty.levels[id];
    const first = helpFor(cfg, 1);
    assert.equal(first.nudgeOnly, true, id);
    assert.equal(first.show, false, id);
    assert.equal(first.together, false, id);
    assert.equal(helpFor(cfg, 2).why, true, `${id}: the reason comes on the second wrong try`);
    // Never stuck: everyone gets the glowing spots and help in the end.
    assert.ok(cfg.togetherFrom <= 6, `${id}: we always do one together in the end`);
  }
});

test('difficulty: Easy helps soonest, Medium less, and only Difficult hides the dots', () => {
  const { easy, medium, difficult } = difficulty.levels;
  assert.ok(easy.showFrom < medium.showFrom);
  assert.ok(easy.togetherFrom < medium.togetherFrom);
  assert.ok(difficult.showFrom >= medium.showFrom);
  assert.equal(easy.dots, true);
  assert.equal(medium.dots, true);
  assert.equal(difficult.dots, false);
  assert.deepEqual(difficulty.order.map((d) => difficulty.levels[d].balls), [1, 2, 3]);
});

test('difficulty: consequences only on Difficult, only on the first wrong try, and kind to the score', () => {
  const rules = difficulty.consequences;
  const at = (id, extra) => consequenceFor({ cfg: difficulty.levels[id], rules, enabled: true, attempts: 1, goalsAgainst: 0, ...extra });
  assert.equal(at('easy', { level: 2, kind: 'theirs' }), null);
  assert.equal(at('medium', { level: 2, kind: 'theirs' }), null);
  assert.equal(at('difficult', { level: 2, kind: 'theirs' }), 'goal');
  assert.equal(at('difficult', { level: 2, kind: 'theirs', enabled: false }), null, 'a grown-up can switch it off');
  assert.equal(at('difficult', { level: 2, kind: 'theirs', attempts: 2 }), null, 'once a level');
  assert.equal(at('difficult', { level: 2, kind: 'theirs', goalsAgainst: 1 }), 'save', 'one goal at most in a match');
  assert.equal(at('difficult', { level: 1, kind: 'ours' }), 'possession');
  assert.equal(at('difficult', { level: 9, kind: 'theirCorner' }), 'save');
  assert.equal(at('difficult', { level: 10, kind: 'ourPenalty' }), null, 'nothing at the last kick');
  // Any goal they score must come before our corner at level 8, which goes
  // in to level things up, so she can still win.
  for (const n of rules.goalLevels) assert.ok(n < 8, `level ${n}`);
  assert.equal(isOurs('ourKickIn'), true);
  assert.equal(isOurs('theirKickIn'), false);
});

test('difficulty: the score in words', () => {
  assert.equal(scoreWords(1, 1), "It's one each");
  assert.equal(scoreWords(2, 1), "We're winning two-one");
  assert.equal(scoreWords(1, 2), "They're winning two-one");
  assert.equal(scoreWords(0, 0), "It's nil-nil");
  assert.equal(finalWords(3, 2), 'We won three-two');
  assert.equal(finalWords(2, 1), 'We won two-one');
});

test('difficult: with no dots a player can stand almost anywhere, and the areas still count', () => {
  const size = { width: 30, length: 40 };
  const spots = freeSpots(team.grid, ['kick-in-left'], size);
  assert.ok(spots.length > 1000, 'about one place per yard');
  for (const sp of buildSpots(team.grid, ['kick-in-left'])) assert.ok(spots.some((f) => f.id === sp.id), `keeps ${sp.id}`);
  assert.ok(spots.every((sp) => sp.x >= 0 && sp.x <= 30 && sp.y >= 0 && sp.y <= 40), 'all on the pitch');
  // A line-up that misses every dot but sits in the right areas still passes.
  const shape = team.shapes.theirCentreKick;
  const players = shape.spots.map((sp) => {
    const z = sp.zone;
    return { x: (z.x[0] + z.x[1]) / 2 + 0.3, y: (z.y[0] + z.y[1]) / 2 + 0.3 };
  });
  const keepers = team.squad.map((p, i) => (p.keeper ? i : -1)).filter((i) => i >= 0);
  // Put the marked keeper on the keeper's area.
  const order = shape.spots.map((_, i) => i);
  const keeperSpot = shape.spots.findIndex((sp) => sp.role === 'keeper');
  [order[keepers[0]], order[keeperSpot]] = [order[keeperSpot], order[keepers[0]]];
  const placed = order.map((i) => players[i]);
  assert.equal(checkShape({ players: placed, shape, grid: team.grid, keepers }).ok, true);
});

test('every new spoken line the game asks for is in the script', () => {
  const script = readJson('src/data/script.json');
  const ids = new Set(script.lines.map((l) => l.id));
  const dir = new URL('../src/', import.meta.url);
  const files = ['game', 'lib'].flatMap((d) => readdirSync(new URL(`${d}/`, dir)).map((f) => new URL(`${d}/${f}`, dir)));
  files.push(new URL('main.js', dir), new URL('screens.js', dir));
  const used = new Set();
  for (const f of files) {
    for (const m of readFileSync(f, 'utf8').matchAll(/'((?:hint|lose|match|menu|c8|c10)\.[A-Za-z0-9]+)'/g)) used.add(m[1]);
  }
  for (const id of ['hint.lookAgain', 'lose.possession', 'lose.wide', 'lose.goal', 'lose.again', 'menu.newMatch', 'menu.replay', 'match.new', 'match.pick', 'match.locked', 'match.go', 'c8.postIn', 'c8.kickOff']) used.add(id);
  for (const d of difficulty.order) used.add(`match.${d}`);
  for (const e of ['', '2', '3']) used.add(`c10.handshake${e}`).add(`c10.coach${e}`);
  for (const id of used) assert.ok(ids.has(id), `missing line ${id}`);
});
