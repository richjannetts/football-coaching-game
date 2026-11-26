import { test } from 'node:test';
import assert from 'node:assert/strict';

// A tiny stand-in for the browser's localStorage.
function fakeStorage() {
  const map = new Map();
  return {
    get length() { return map.size; },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

globalThis.localStorage = fakeStorage();
const { load, save, deleteEverything } = await import('../src/lib/storage.js');

test('saves and loads values', () => {
  save('profile', { name: 'Sam' });
  assert.deepEqual(load('profile'), { name: 'Sam' });
  assert.equal(load('missing', 'x'), 'x');
});

test('delete everything removes only the game data', () => {
  localStorage.setItem('other-site', 'keep');
  save('progress', { ch1: true });
  deleteEverything();
  assert.equal(load('progress'), null);
  assert.equal(load('profile'), null);
  assert.equal(localStorage.getItem('other-site'), 'keep');
});

test('bad saved data falls back safely', () => {
  localStorage.setItem('fcg.broken', '{not json');
  assert.equal(load('broken', 'fallback'), 'fallback');
});
