import { test } from 'node:test';
import assert from 'node:assert/strict';
import { missingStep } from '../src/lib/profile.js';

test('setup: nothing chosen asks for the name first', () => {
  assert.equal(missingStep({ name: '', skin: null, hairColour: null, hair: null }), 'name');
});

test('setup: steps go name, skin colour, hair colour, hair style', () => {
  assert.equal(missingStep({ name: 'Mia', skin: null, hairColour: null, hair: null }), 'skin');
  assert.equal(missingStep({ name: 'Mia', skin: 's1', hairColour: null, hair: null }), 'hairColour');
  assert.equal(missingStep({ name: 'Mia', skin: 's1', hairColour: 'h1', hair: null }), 'hair');
});

test('setup: a name of only spaces does not count', () => {
  assert.equal(missingStep({ name: '   ', skin: 's1', hairColour: 'h1', hair: 'bun' }), 'name');
});

test('setup: a later choice does not skip an earlier one', () => {
  assert.equal(missingStep({ name: 'Mia', skin: null, hairColour: 'h1', hair: 'bun' }), 'skin');
});

test('setup: everything chosen means ready', () => {
  assert.equal(missingStep({ name: 'Mia', skin: 's1', hairColour: 'h1', hair: 'bun' }), null);
});
