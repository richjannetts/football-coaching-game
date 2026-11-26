// Game sounds and confetti. These check the arithmetic: that every sound is
// a proper WAV file, short, never too loud, and that every sound the game
// asks for exists.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { makers, wavBytes, RATE } from '../src/lib/tones.js';
import { pieces } from '../src/lib/confetti.js';
import { readJson } from './helpers.js';

test('every sound is short, quiet enough and not silent (except "silent")', () => {
  for (const [name, make] of Object.entries(makers)) {
    const samples = make();
    const secs = samples.length / RATE;
    assert.ok(secs > 0.02 && secs <= 1.2, `${name} lasts ${secs.toFixed(2)}s`);
    const peak = Math.max(...samples.map(Math.abs));
    assert.ok(peak <= 0.6, `${name} peaks at ${peak.toFixed(2)}, which would be too loud next to the voice`);
    if (name !== 'silent') assert.ok(peak > 0.03, `${name} is too quiet to hear`);
    assert.ok(samples.every(Number.isFinite), `${name} has a broken sample`);
  }
});

test('little tap sounds are much shorter than the celebrations', () => {
  const ms = (name) => (makers[name]().length / RATE) * 1000;
  for (const name of ['tap', 'pick', 'drop', 'kick']) assert.ok(ms(name) <= 150, `${name} is ${ms(name)} ms`);
});

test('sounds come out the same every time', () => {
  assert.deepEqual(makers.kick(), makers.kick());
});

test('wavBytes makes a proper mono 16-bit WAV file', () => {
  const buf = wavBytes([0, 0.5, -0.5, 2], RATE);
  const v = new DataView(buf);
  const text = (o, n) => String.fromCharCode(...new Uint8Array(buf, o, n));
  assert.equal(text(0, 4), 'RIFF');
  assert.equal(text(8, 4), 'WAVE');
  assert.equal(v.getUint16(22, true), 1, 'mono');
  assert.equal(v.getUint32(24, true), RATE);
  assert.equal(v.getUint16(34, true), 16, '16-bit');
  assert.equal(v.getUint32(40, true), 8, 'four samples of two bytes');
  assert.equal(buf.byteLength, 44 + 8);
  assert.equal(v.getInt16(50, true), 32767, 'a sample that is too loud is clipped, not wrapped round');
});

test('every sfx line the game plays has a sound and a script entry', () => {
  const script = readJson('src/data/script.json');
  const ids = new Set(script.lines.map((l) => l.id));
  const dir = new URL('../src/', import.meta.url);
  const files = ['game', 'lib'].flatMap((d) => readdirSync(new URL(`${d}/`, dir)).map((f) => new URL(`${d}/${f}`, dir)));
  files.push(new URL('main.js', dir));
  const used = new Set();
  for (const f of files) {
    for (const m of readFileSync(f, 'utf8').matchAll(/'sfx\.([a-z]+)'/g)) used.add(m[1]);
  }
  assert.ok(used.size >= 5, 'found the game sounds in the code');
  for (const name of used) {
    assert.ok(makers[name], `sfx.${name} has a sound`);
    assert.ok(ids.has(`sfx.${name}`), `sfx.${name} is in script.json`);
  }
});

test('confetti flies mostly upwards, in the colours given', () => {
  let seed = 1;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const colours = ['#1d4ed8', '#facc15'];
  const list = pieces(40, colours, rand);
  assert.equal(list.length, 40);
  assert.ok(list.every((p) => colours.includes(p.colour)));
  assert.ok(list.filter((p) => p.dy < 0).length >= 36, 'nearly all pieces start by going up');
  assert.ok(list.every((p) => p.ms + p.delay < 3000), 'every piece is gone within three seconds');
});
