import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkRule } from '../src/lib/checks.js';
import { resolveRuleSet } from '../src/lib/rules.js';
import { quizFor, checkAnswer, askLines } from '../src/lib/quiz.js';
import { readJson } from './helpers.js';

const quiz = readJson('src/data/quiz.json');
const script = readJson('src/data/script.json');
const ruleSet = resolveRuleSet('shwgl-2026-27-u8', [readJson('src/data/rules/fa-2026-27-5v5.json'), readJson('src/data/rules/shwgl-2026-27-u8.json')]);
const centre = { x: 15, y: 20 };
const ids = new Set(script.lines.map((l) => l.id));
const toPlayers = (pic) => pic.us.map(([x, y]) => ({ x, y }));

test('quiz: there is a bonus question for each level', () => {
  assert.ok(quizFor(quiz, 1));
  assert.ok(quizFor(quiz, 2));
  assert.ok(quizFor(quiz, 3));
  assert.ok(quizFor(quiz, 4));
  assert.equal(quizFor(quiz, 99), null);
});

test('quiz: every spoken line is in the script', () => {
  for (const q of Object.values(quiz.levels)) {
    for (const id of [...askLines(q), q.right, q.reveal]) assert.ok(ids.has(id), `missing line ${id}`);
  }
});

test('quiz: each question has three options, words on screen and one right answer', () => {
  for (const q of Object.values(quiz.levels)) {
    assert.equal(q.options.length, 3);
    assert.ok(q.question.length > 0);
    q.options.forEach((o) => assert.ok(o.label.length > 0));
    assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 3);
  }
});

test('quiz: the right answer earns the bonus, any other does not', () => {
  const q = quizFor(quiz, 1);
  assert.deepEqual(checkAnswer(q, q.answer), { right: true, answer: q.answer });
  for (const i of [0, 1, 2].filter((i) => i !== q.answer)) assert.equal(checkAnswer(q, i).right, false);
});

test('quiz, level 1: the right picture passes across, not back and not long', () => {
  const q = quizFor(quiz, 1);
  q.options.forEach((o, i) => {
    const [[, y1], [x2, y2]] = o.picture.arrow;
    const sideways = Math.abs(x2 - 15) >= 3 && y2 - y1 > -2 && y2 - y1 < 5;
    assert.equal(sideways, i === q.answer, `option ${i} (${o.pass})`);
  });
});

test('quiz, level 2: only the right picture obeys the rule', () => {
  const q = quizFor(quiz, 2);
  q.options.forEach((o, i) => {
    const result = checkRule({ kind: 'theirs', players: toPlayers(o.picture), ruleSet, centre, halfway: 20 });
    assert.equal(result.ok, i === q.answer, `option ${i}: ${o.label}`);
  });
});

test('quiz: every picture keeps its players on the pitch', () => {
  for (const q of Object.values(quiz.levels)) {
    for (const o of q.options) {
      for (const [x, y] of [...o.picture.us, ...(o.picture.them || [])]) assert.ok(x >= 0 && x <= 30 && y >= 0 && y <= 40);
    }
  }
});

test('quiz, level 3: only the right picture spreads out wide', () => {
  const q = quizFor(quiz, 3);
  q.options.forEach((o, i) => {
    const xs = o.picture.us.map(([x]) => x);
    const ourHalf = o.picture.us.filter(([, y]) => y < 20).length;
    const wide = Math.min(...xs) <= 6 && Math.max(...xs) >= 24;
    assert.equal(wide && ourHalf >= 3, i === q.answer, `option ${i}: ${o.label}`);
  });
});

test('quiz, level 4: only the right picture obeys the retreat line', () => {
  const q = quizFor(quiz, 4);
  q.options.forEach((o, i) => {
    const result = checkRule({ kind: 'theirGoalKick', players: toPlayers(o.picture), ruleSet, centre, halfway: 20 });
    assert.equal(result.ok, i === q.answer, `option ${i}: ${o.label}`);
  });
});

test('every level on the path has a bonus question and an end line', () => {
  const levels = readJson('src/data/levels.json');
  for (const n of levels.matches.flatMap((m) => m.levels)) {
    assert.ok(quizFor(quiz, n), `level ${n} has no bonus question`);
    assert.ok(ids.has(`c${n}.end`), `level ${n} has no end line`);
  }
});

test('quiz, level 5: only the right picture spreads out with a friend in reach', () => {
  const q = quizFor(quiz, 5);
  q.options.forEach((o, i) => {
    const [bx, by] = o.picture.ball;
    const friends = o.picture.us.slice(1, -1).map(([x, y]) => Math.hypot(x - bx, y - by));
    const spread = friends.every((d) => d > 3.5) && friends.some((d) => d <= 11);
    assert.equal(spread, i === q.answer, `option ${i}: ${o.label}`);
  });
});

test('quiz, level 6: only the right picture keeps five yards from the ball', () => {
  const q = quizFor(quiz, 6);
  q.options.forEach((o, i) => {
    const [x, y] = o.picture.ball;
    const result = checkRule({ kind: 'theirKickIn', players: toPlayers(o.picture), ruleSet, centre, halfway: 20, ball: { x, y } });
    assert.equal(result.ok, i === q.answer, `option ${i}: ${o.label}`);
  });
});

test('quiz, level 7: only the right picture has our front player just outside the ring, in the middle', () => {
  const q = quizFor(quiz, 7);
  q.options.forEach((o, i) => {
    const [x, y] = o.picture.us[0];
    const d = Math.hypot(x - 15, y - 20);
    const legal = checkRule({ kind: 'theirs', players: toPlayers(o.picture), ruleSet, centre, halfway: 20 }).ok;
    assert.equal(legal && d < 7 && x === 15, i === q.answer, `option ${i}: ${o.label}`);
  });
});

test('quiz, level 8: only the right picture keeps exactly one friend back near halfway', () => {
  const q = quizFor(quiz, 8);
  q.options.forEach((o, i) => {
    const outfield = o.picture.us.slice(0, -1);
    const back = outfield.filter(([, y]) => y <= 22);
    const one = back.length === 1 && back[0][1] >= 14;
    assert.equal(one, i === q.answer, `option ${i}: ${o.label}`);
  });
});

test('quiz, level 9: only the right picture keeps five yards from the corner', () => {
  const q = quizFor(quiz, 9);
  q.options.forEach((o, i) => {
    const [x, y] = o.picture.ball;
    const result = checkRule({ kind: 'theirCorner', players: toPlayers(o.picture), ruleSet, centre, halfway: 20, ball: { x, y } });
    assert.equal(result.ok, i === q.answer, `option ${i}: ${o.label}`);
  });
});

test('quiz, level 10: only the right picture keeps our friends outside the box and the ring', () => {
  const q = quizFor(quiz, 10);
  const area = { x: [7, 23], y: [32.5, 40] };
  q.options.forEach((o, i) => {
    const [x, y] = o.picture.ball;
    const result = checkRule({ kind: 'ourPenalty', players: toPlayers(o.picture), ruleSet, centre, halfway: 20, ball: { x, y }, area });
    assert.equal(result.ok, i === q.answer, `option ${i}: ${o.label}`);
  });
});
