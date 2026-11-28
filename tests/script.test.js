import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { readJson } from './helpers.js';

const ids = new Set(readJson('src/data/script.json').lines.map((l) => l.id));

// Every line id a level speaks, such as 'c3.dribble', must be in the
// script, or the narrator would have nothing to say.
test('script: every line a level speaks is in script.json', () => {
  const dir = new URL('../src/game/', import.meta.url);
  for (const file of readdirSync(dir).filter((f) => /^chapter\d+\.js$/.test(f))) {
    const code = readFileSync(new URL(file, dir), 'utf8');
    for (const [, id] of code.matchAll(/'(c\d+\.[A-Za-z0-9]+)'/g)) assert.ok(ids.has(id), `${file} speaks ${id}, which is not in the script`);
  }
});

test('script: our keeper dribbles out and passes at our goal kick', () => {
  for (const id of ['c3.back', 'c3.dribble', 'c3.keeperPass', 'c3.keeperBack', 'c3.goal']) assert.ok(ids.has(id), id);
});
