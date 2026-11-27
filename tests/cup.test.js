import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readCup, winRound, ladder, scoreBefore, orderProblems, emptyCup } from '../src/lib/cup.js';
import { readJson } from './helpers.js';

const levels = readJson('src/data/levels.json');
const cup = levels.cup;
const rounds = cup.rounds;
const allLevels = levels.matches.find((m) => m.id === cup.match).levels;

test('cup: three rounds, each harder than the one before', () => {
  assert.deepEqual(rounds.map((r) => r.difficulty), ['easy', 'medium', 'difficult']);
  assert.equal(rounds.at(-1).label, 'Final');
  const difficulty = readJson('src/data/difficulty.json');
  for (const r of rounds) assert.ok(difficulty.levels[r.difficulty], `${r.id} has a difficulty`);
});

test('cup: every round covers every level once, with the story in the right places', () => {
  for (const r of rounds) assert.deepEqual(orderProblems(r.halves, { allLevels, fixed: cup.fixed, before: cup.before }), [], r.id);
});

test('cup: each round plays the moments in its own order', () => {
  const orders = rounds.map((r) => r.halves.flat().join(','));
  assert.equal(new Set(orders).size, rounds.length);
});

test('cup: the order checker spots a broken order', () => {
  const opts = { allLevels, fixed: cup.fixed, before: cup.before };
  assert.ok(orderProblems([[1, 2, 3, 4, 5], [7, 8, 9, 10]], opts).some((p) => p.includes('missing')));
  assert.ok(orderProblems([[2, 1, 3, 4, 5, 6], [7, 8, 9, 10]], opts).length > 0);
  assert.ok(orderProblems([[1, 2, 3, 4, 5, 6], [7, 8, 10, 9]], opts).length > 0);
  // Their Difficult extra goal at level 4 must come before our corner.
  assert.ok(orderProblems([[1, 2, 3, 5, 6], [7, 8, 4, 9, 10]], opts).some((p) => p.includes('before')));
});

test('cup: the score follows the order of the story goals', () => {
  const order = rounds[0].halves.flat();
  assert.deepEqual(scoreBefore(cup.storyGoals, order, 1), { us: 0, them: 0 });
  assert.deepEqual(scoreBefore(cup.storyGoals, order, 2), { us: 1, them: 0 });
  assert.deepEqual(scoreBefore(cup.storyGoals, order, 7), { us: 1, them: 1 });
  assert.deepEqual(scoreBefore(cup.storyGoals, order, 10), { us: 1, them: 1 });
  // In the semi-final, their goal kick (4) comes after half-time.
  assert.deepEqual(scoreBefore(cup.storyGoals, rounds[1].halves.flat(), 4), { us: 1, them: 1 });
});

test('cup: winning rounds moves her on, and winning the final wins the cup', () => {
  let c = emptyCup();
  let r = winRound(c, rounds);
  assert.deepEqual(r, { cup: { round: 1, won: 0 }, cupWon: false });
  r = winRound(r.cup, rounds);
  assert.equal(r.cup.round, 2);
  r = winRound(r.cup, rounds);
  assert.equal(r.cupWon, true);
  // A new cup starts from Round 1.
  assert.deepEqual(r.cup, { round: 0, won: 1 });
});

test('cup: the ladder shows won, now and still to come', () => {
  assert.deepEqual(ladder(rounds, { round: 1 }).map((r) => r.state), ['won', 'now', 'next']);
});

test('cup: a player from before the cup, who has played the match, is through to the next round', () => {
  assert.deepEqual(readCup(null, rounds, true), { round: 1, won: 0 });
  assert.deepEqual(readCup(null, rounds, false), { round: 0, won: 0 });
  assert.deepEqual(readCup({ round: 9, won: -1 }, rounds), { round: 0, won: 0 });
  assert.deepEqual(readCup({ round: 2, won: 1 }, rounds), { round: 2, won: 1 });
});

test('cup: every round has a spoken name and its own voice line', () => {
  const ids = new Set(readJson('src/data/script.json').lines.map((l) => l.id));
  for (const r of rounds) {
    assert.ok(r.spoken, `${r.id} has a spoken name`);
    assert.ok(ids.has(`cup.${r.id}`), `cup.${r.id} is in the script`);
  }
});
