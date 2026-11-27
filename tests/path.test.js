import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPath, nextLevel, PATH_WIDTH } from '../src/lib/path.js';
import { readJson } from './helpers.js';

const data = readJson('src/data/levels.json');
const many = { matches: [{ label: 'Match 1', levels: [1, 2, 3] }, { label: 'Match 2', levels: [4, 5, 6, 7] }, { label: 'Match 3', levels: [8, 9, 10, 11, 12] }], soon: 2, soonLabel: 'More soon' };

test('path: a new player stands on level one, which is the one to play', () => {
  const p = buildPath(data, {});
  assert.equal(p.at, 0);
  assert.equal(p.nodes[0].state, 'now');
  assert.equal(p.nodes[1].state, 'locked');
});

test('path: passing a level moves her up one place', () => {
  const p = buildPath(data, { ch1: true });
  assert.equal(p.at, 1);
  assert.equal(p.nodes[0].state, 'done');
  assert.equal(p.nodes[1].state, 'now');
});

test('path: with every level finished she stays on the last one', () => {
  const all = data.matches.flatMap((m) => m.levels);
  const progress = Object.fromEntries(all.map((n) => [`ch${n}`, true]));
  const p = buildPath(data, progress);
  assert.equal(p.at, all.length - 1);
  assert.ok(p.nodes.filter((n) => n.kind === 'level').every((n) => n.state === 'done'));
  assert.equal(nextLevel(all, progress), null);
});

test('path: places for levels still to come are locked and have no level', () => {
  const p = buildPath(data, {});
  const soon = p.nodes.filter((n) => n.kind === 'soon');
  assert.equal(soon.length, data.soon);
  assert.ok(soon.every((n) => n.level === null && n.state === 'soon'));
});

test('path: every match starts with its flag', () => {
  const p = buildPath(many, {});
  const flags = p.nodes.filter((n) => n.flag).map((n) => n.flag);
  assert.deepEqual(flags, ['Match 1', 'Match 2', 'Match 3', 'More soon']);
  assert.equal(p.nodes[3].flag, 'Match 2');
});

test('path: lots of levels make a taller path, with level one at the bottom', () => {
  const small = buildPath(data, {});
  const big = buildPath(many, {});
  assert.ok(big.height > small.height);
  assert.equal(big.nodes.length, 14);
  for (let i = 1; i < big.nodes.length; i++) assert.ok(big.nodes[i].y < big.nodes[i - 1].y);
  assert.ok(big.nodes.every((n) => n.x > 40 && n.x < PATH_WIDTH - 40 && n.y > 0 && n.y < big.height));
});

test('path: bonus stickers are remembered on their level', () => {
  const p = buildPath(data, { ch1: true, bonus1: true });
  assert.equal(p.nodes[0].bonus, true);
  assert.equal(p.nodes[1].bonus, false);
});

test('data: every level on the path appears once', () => {
  const levels = data.matches.flatMap((m) => m.levels);
  assert.equal(new Set(levels).size, levels.length);
  assert.ok(data.matches.every((m) => m.label && m.levels.length));
});
