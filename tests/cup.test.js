import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readCup, winRound, ladder, scoreBefore, roundProblems, storyScore, goalLevelsFor, roundLevels, emptyCup } from '../src/lib/cup.js';
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

test('cup: every round is a match that makes sense, and we always win', () => {
  for (const r of rounds) assert.deepEqual(roundProblems(r, { allLevels, story: cup.story }), [], r.id);
});

test('cup: each match is short, and the skills are spread across the rounds', () => {
  for (const r of rounds) assert.ok(roundLevels(r).length <= 5, `${r.id} has ${roundLevels(r).length} moments`);
  // Round 1: kick-offs and goal kicks. Semi-final: kick-ins and corners.
  assert.deepEqual([...roundLevels(rounds[0])].sort((a, b) => a - b), [1, 2, 3, 4]);
  assert.deepEqual([...roundLevels(rounds[1])].sort((a, b) => a - b), [5, 6, 8, 9]);
  // The final ends with the penalty, to win the cup.
  assert.equal(roundLevels(rounds.at(-1)).at(-1), 10);
  // Across the cup, every level is played.
  const played = new Set(rounds.flatMap(roundLevels));
  assert.deepEqual(allLevels.filter((n) => !played.has(n)), []);
});

test('cup: the round checker spots a broken story', () => {
  const opts = { allLevels, story: cup.story };
  // Their restart (2) without our goal just before it.
  assert.ok(roundProblems({ halves: [[2, 1], [3, 4]], goals: { 1: 'us' } }, opts).length > 0);
  // The penalty not last.
  assert.ok(roundProblems({ halves: [[1, 6], [9, 10, 7]], goals: { 1: 'us', 6: 'them', 10: 'us' } }, opts).length > 0);
  // A draw is not allowed.
  assert.ok(roundProblems({ halves: [[5, 6], [8, 9]], goals: { 6: 'them', 8: 'us' } }, opts).some((p) => p.includes('win') || p.includes('penalty')));
  // Level 6 always has their goal.
  assert.ok(roundProblems({ halves: [[1, 6], [3, 4]], goals: { 1: 'us' } }, opts).some((p) => p.includes('always scores')));
});

test('cup: the score follows each round story', () => {
  const semi = rounds[1];
  const order = roundLevels(semi);
  assert.deepEqual(scoreBefore(semi.goals, order, 5), { us: 0, them: 0 });
  assert.deepEqual(scoreBefore(semi.goals, order, 8), { us: 0, them: 1 });
  assert.deepEqual(scoreBefore(semi.goals, order, 9), { us: 1, them: 1 });
  assert.deepEqual(storyScore(rounds[0]), { us: 1, them: 0 });
  assert.deepEqual(storyScore(semi), { us: 2, them: 1 });
  assert.deepEqual(storyScore(rounds[2]), { us: 2, them: 1 });
});

test('cup: a Difficult mistake only costs a goal when a comeback can follow', () => {
  const goalLevels = readJson('src/data/difficulty.json').consequences.goalLevels;
  for (const r of rounds) {
    const levels = goalLevelsFor(r, goalLevels, cup.comeback);
    const order = roundLevels(r);
    for (const n of levels) assert.ok(order.indexOf(n) < order.indexOf(cup.comeback), r.id);
  }
  assert.deepEqual(goalLevelsFor({ halves: [[1, 6], [7, 9, 10]] }, goalLevels, 8), []);
  assert.deepEqual(goalLevelsFor({ halves: [[1, 2], [7, 8]] }, goalLevels, 8), [2, 7]);
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
