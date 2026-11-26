import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveRuleSet, ruleValue } from '../src/lib/rules.js';
import { readJson } from './helpers.js';

const fa = readJson('src/data/rules/fa-2026-27-5v5.json');
const league = readJson('src/data/rules/shwgl-2026-27-u8.json');

test('league rule set extends the FA set', () => {
  const set = resolveRuleSet('shwgl-2026-27-u8', [fa, league]);
  assert.deepEqual(set.chain, ['fa-2026-27-5v5', 'shwgl-2026-27-u8']);
  assert.equal(ruleValue(set, 'kickoff.opponentDistance'), 5);
  assert.equal(ruleValue(set, 'kickoff.canScoreDirect'), false);
});

test('a local set can override a parent rule', () => {
  const local = { id: 'local', extends: 'fa-2026-27-5v5', rules: { 'pitch.length': { value: 30 } } };
  const set = resolveRuleSet('local', [fa, local]);
  assert.equal(ruleValue(set, 'pitch.length'), 30);
  assert.equal(ruleValue(set, 'pitch.width'), 30);
});

test('every rule has a value, source and last-checked date', () => {
  for (const [key, rule] of Object.entries(fa.rules)) {
    assert.ok('value' in rule, `${key} value`);
    assert.ok(rule.source, `${key} source`);
    assert.match(rule.lastChecked, /^\d{4}-\d{2}-\d{2}$/, `${key} lastChecked`);
  }
});

test('unconfirmed rules are marked so the game never tests them', () => {
  assert.equal(fa.rules['kickoff.afterGoalWhichTeam'].confidence, 'unconfirmed');
  assert.equal(fa.rules['kickoff.kickerTouchTwice'].confidence, 'unconfirmed');
});

test('missing rules and parents fail loudly', () => {
  const set = resolveRuleSet('fa-2026-27-5v5', [fa]);
  assert.throws(() => ruleValue(set, 'kickoff.madeUp'));
  assert.throws(() => resolveRuleSet('orphan', [{ id: 'orphan', extends: 'nope', rules: {} }]));
});
