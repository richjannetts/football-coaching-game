// Small sounds made in code, so there are no extra sound files to download
// or store. Each maker returns a list of samples between -1 and 1. wavBytes()
// wraps them as a WAV file, and toUrl() turns that into a Blob URL that the
// ordinary audio element can play.
//
// All of this is plain arithmetic, so it can be tested in Node.

export const RATE = 22050; // samples per second: plenty for short game sounds

// A WAV file: a 44 byte header, then 16-bit samples.
export function wavBytes(samples, rate = RATE) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buffer);
  const str = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + samples.length * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // plain PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, samples.length * 2, true);
  samples.forEach((s, i) => v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s)) * 32767, true));
  return buffer;
}

export function toUrl(samples, rate = RATE) {
  if (typeof Blob === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) return '';
  return URL.createObjectURL(new Blob([wavBytes(samples, rate)], { type: 'audio/wav' }));
}

// ---- Building blocks ----

const TAU = 2 * Math.PI;

// One note. The pitch can slide (glide), and the sound fades away, like a
// bell or a plucked string. "soft" adds a gentle overtone so it is rounder
// than a pure beep.
function note(freq, secs, { vol = 0.2, glide = freq, attack = 0.004, soft = true } = {}) {
  const n = Math.floor(RATE * secs);
  const out = new Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const f = freq + (glide - freq) * t;
    phase += (TAU * f) / RATE;
    const rise = Math.min(1, i / (RATE * attack));
    const fall = Math.pow(1 - t, 2.2);
    const wave = soft ? Math.sin(phase) + 0.25 * Math.sin(2 * phase) : Math.sin(phase);
    out[i] = vol * rise * fall * wave * (soft ? 0.8 : 1);
  }
  return out;
}

// Lay several sounds on top of each other, each starting at its own time.
function mix(parts, totalSecs) {
  const out = new Array(Math.floor(RATE * totalSecs)).fill(0);
  for (const [startSecs, samples] of parts) {
    const o = Math.floor(RATE * startSecs);
    for (let i = 0; i < samples.length && o + i < out.length; i++) out[o + i] += samples[i];
  }
  return out;
}

// The same "random" hiss every time, so tests are repeatable.
function noise(n, seed = 7) {
  let x = seed;
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    x = (x * 16807) % 2147483647;
    out[i] = (x / 2147483647) * 2 - 1;
  }
  return out;
}

// ---- The game's sounds ----

// A soft, friendly two-peep referee whistle.
export function whistle() {
  const out = [];
  const peep = (secs) => {
    const n = Math.floor(RATE * secs);
    for (let i = 0; i < n; i++) {
      const t = i / RATE;
      const env = Math.min(1, i / 300, (n - i) / 600);
      const trill = 0.75 + 0.25 * Math.sin(TAU * 28 * t);
      out.push(0.28 * env * trill * Math.sin(TAU * 2650 * t));
    }
  };
  const gap = (secs) => {
    for (let i = 0; i < RATE * secs; i++) out.push(0);
  };
  peep(0.16);
  gap(0.07);
  peep(0.3);
  return out;
}

export function silent() {
  return new Array(Math.floor(RATE * 0.1)).fill(0);
}

// Picking up a player: a little rising "pop".
export function pick() {
  return note(520, 0.09, { glide: 900, vol: 0.2 });
}

// Putting a player down on a spot: a soft, low "tock".
export function drop() {
  return mix([[0, note(330, 0.11, { glide: 200, vol: 0.26 })], [0, note(660, 0.05, { glide: 500, vol: 0.06 })]], 0.12);
}

// Any button: a tiny, quiet tick.
export function tap() {
  return note(1400, 0.035, { glide: 1100, vol: 0.1, soft: false });
}

// The ball being kicked: a short thump with a little scuff of grass.
export function kick() {
  const n = Math.floor(RATE * 0.13);
  const hiss = noise(n);
  let low = 0;
  const thud = note(140, 0.13, { glide: 70, vol: 0.45, soft: false });
  return thud.map((s, i) => {
    low += 0.25 * (hiss[i] - low); // smooth the hiss so it is a scuff, not a crackle
    return s + 0.18 * low * Math.pow(1 - i / n, 4);
  });
}

// A good line-up: two happy rising notes.
export function cheer() {
  return mix(
    [
      [0, note(784, 0.28, { vol: 0.2 })], // G
      [0.12, note(1047, 0.42, { vol: 0.22 })], // high C
    ],
    0.56
  );
}

// A goal: a short, bright fanfare going up.
export function goal() {
  const notes = [523, 659, 784, 1047]; // C E G C
  const parts = notes.map((f, i) => [i * 0.11, note(f, i === 3 ? 0.7 : 0.26, { vol: 0.2 })]);
  parts.push([0.33, note(1319, 0.6, { vol: 0.08 })]); // a sparkle on top of the last note
  return mix(parts, 1.05);
}

// A football sticker: quick twinkly notes going up.
export function sticker() {
  const notes = [1175, 1319, 1568, 1760, 2093, 2349];
  return mix(
    notes.map((f, i) => [i * 0.06, note(f, 0.3, { vol: 0.11 })]),
    0.72
  );
}

// The bonus question answered right: a warm two-note bell.
export function chime() {
  return mix(
    [
      [0, note(1319, 0.5, { vol: 0.16 })],
      [0.09, note(1568, 0.6, { vol: 0.16 })],
    ],
    0.7
  );
}

// Every sound the game can make, by name.
export const makers = { whistle, silent, pick, drop, tap, kick, cheer, goal, sticker, chime };
