// Speaks every line and shows it as a caption.
// Order of choice for each line:
//   1. a recorded MP3 from the active voice pack (played from a Blob URL),
//   2. the phone's own voice in en-GB,
//   3. the caption on its own, which is always shown anyway.
// iPhone rule: sound must start inside a tap. say() calls play() or speak()
// straight away, with no await before it, so call say() from a tap handler.

import script from '../data/script.json';

const lines = new Map(script.lines.map((l) => [l.id, l]));
const recorded = new Map(); // id -> Blob URL
let audioEl = null;
let unlocked = false;
let vars = { name: '' };
let captionHandler = () => {};
let speakingHandler = () => {};
let run = 0; // bumps on every say() so an old sequence knows to stop
let lastIds = [];
let voice = null;
const whistleUrl = makeWhistleUrl();
const silentUrl = makeSilentUrl();

const synth = typeof speechSynthesis !== 'undefined' ? speechSynthesis : null;

function pickVoice() {
  if (!synth) return;
  const voices = synth.getVoices();
  voice =
    voices.find((v) => v.lang === 'en-GB' && v.localService) ||
    voices.find((v) => v.lang === 'en-GB') ||
    voices.find((v) => v.lang && v.lang.startsWith('en-GB')) ||
    null;
}
if (synth) {
  pickVoice();
  synth.addEventListener?.('voiceschanged', pickVoice);
}

export function setVars(next) {
  vars = { ...vars, ...next };
}
export function onCaption(fn) {
  captionHandler = fn;
}
export function onSpeaking(fn) {
  speakingHandler = fn;
}

export function lineText(id) {
  const line = lines.get(id);
  if (!line) return '';
  return fill(line.text);
}

function fill(text) {
  const name = (vars.name || '').trim();
  if (!name) return text.replace(/,?\s*\{name\}/g, '');
  return text.replace(/\{name\}/g, name);
}

// Load the voice pack list and turn each recorded file into a Blob URL now,
// so a tap can play it at once and Safari never asks for a byte range.
export async function prepare(baseUrl) {
  try {
    const res = await fetch(`${baseUrl}voices/packs.json`);
    const packs = await res.json();
    const pack = packs.packs?.[packs.active];
    if (!pack) return;
    for (const id of pack.recorded || []) {
      try {
        const file = await fetch(`${baseUrl}voices/${packs.active}/${id}.mp3`);
        if (!file.ok) continue;
        recorded.set(id, URL.createObjectURL(await file.blob()));
      } catch {
        /* this line falls back to the phone's voice */
      }
    }
  } catch {
    /* no pack list: every line uses the phone's voice */
  }
}

// Call on the very first tap. Plays a silent sound on our one audio element
// so iPhone lets us use it later, and wakes up the phone's voice.
export function unlock() {
  if (unlocked) return;
  unlocked = true;
  audioEl = audioEl || new Audio();
  audioEl.setAttribute('playsinline', '');
  audioEl.preload = 'auto';
  try {
    audioEl.src = silentUrl;
    const p = audioEl.play();
    p?.catch?.(() => {});
  } catch {
    /* ignore */
  }
  try {
    if (synth) {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      synth.speak(u);
    }
  } catch {
    /* ignore */
  }
}

export function stop() {
  run++;
  try {
    audioEl?.pause();
  } catch {
    /* ignore */
  }
  try {
    if (synth && (synth.speaking || synth.pending)) synth.cancel();
  } catch {
    /* ignore */
  }
  speakingHandler(false);
}

// Speak one or more lines in order. Returns a promise that settles when the
// last line ends, or straight away if a newer say() takes over.
// remember: false for lines that "hear it again" should not repeat.
export function say(ids, { remember = true } = {}) {
  const list = Array.isArray(ids) ? ids : [ids];
  unlock();
  stop();
  const mine = run;
  if (remember) lastIds = list.filter((id) => !id.startsWith('sfx.'));
  speakingHandler(true);
  let chain = playOne(list[0], mine); // starts now, inside the tap
  for (const id of list.slice(1)) {
    chain = chain.then(() => (mine === run ? playOne(id, mine) : null));
  }
  return chain.then(() => {
    if (mine === run) speakingHandler(false);
  });
}

// Set what "hear it again" repeats.
export function remember(ids) {
  lastIds = ids.filter((id) => !id.startsWith('sfx.'));
}

export function lastLines() {
  return lastIds.slice();
}

export function replay() {
  if (lastIds.length) return say(lastIds);
  return Promise.resolve();
}

export function hasLine(id) {
  return lines.has(id);
}

function playOne(id, mine) {
  if (mine !== run) return Promise.resolve();
  if (id === 'sfx.whistle') return playUrl(whistleUrl, mine, 800);
  const text = lineText(id);
  if (!lines.has(id)) console.warn('Missing script line', id);
  captionHandler(text, id);
  const url = recorded.get(id);
  if (url) {
    return playUrl(url, mine, readingTime(text) * 2 + 4000).then((ok) => (ok ? true : speak(text, mine)));
  }
  return speak(text, mine);
}

function readingTime(text) {
  return 1200 + text.length * 65;
}

// Resolves true when the sound ends, false if it could not play.
function playUrl(url, mine, maxMs) {
  return new Promise((resolve) => {
    if (!audioEl) audioEl = new Audio();
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      audioEl.removeEventListener('ended', onEnd);
      audioEl.removeEventListener('error', onErr);
      resolve(ok);
    };
    const onEnd = () => finish(true);
    const onErr = () => finish(false);
    const timer = setTimeout(() => finish(true), maxMs);
    audioEl.addEventListener('ended', onEnd);
    audioEl.addEventListener('error', onErr);
    try {
      audioEl.src = url;
      const p = audioEl.play();
      p?.catch?.(() => finish(false));
    } catch {
      finish(false);
    }
    const watch = setInterval(() => {
      if (mine !== run) {
        clearInterval(watch);
        finish(true);
      }
      if (done) clearInterval(watch);
    }, 100);
  });
}

function speak(text, mine) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      clearInterval(watch);
      resolve(true);
    };
    // If the phone's voice is missing or never reports that it finished,
    // move on after a generous reading time so the child is never stuck.
    const timer = setTimeout(finish, synth ? readingTime(text) * 1.8 + 1500 : readingTime(text));
    const watch = setInterval(() => {
      if (mine !== run) finish();
    }, 100);
    if (!synth) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-GB';
      if (voice) u.voice = voice;
      u.rate = 0.92;
      u.pitch = 1.05;
      u.onend = finish;
      u.onerror = finish;
      synth.speak(u);
    } catch {
      /* the caption is still on screen */
    }
  });
}

// ---- Small sounds made in code, so there are no extra files ----

function wavUrl(samples, rate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buffer);
  const str = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + samples.length * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, samples.length * 2, true);
  samples.forEach((s, i) => v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s)) * 32767, true));
  if (typeof Blob === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) return '';
  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
}

// A soft, friendly two-peep referee whistle.
function makeWhistleUrl() {
  const rate = 22050;
  const out = [];
  const peep = (secs) => {
    const n = Math.floor(rate * secs);
    for (let i = 0; i < n; i++) {
      const t = i / rate;
      const env = Math.min(1, i / 300, (n - i) / 600);
      const trill = 0.75 + 0.25 * Math.sin(2 * Math.PI * 28 * t);
      out.push(0.28 * env * trill * Math.sin(2 * Math.PI * 2650 * t));
    }
  };
  const gap = (secs) => {
    for (let i = 0; i < rate * secs; i++) out.push(0);
  };
  peep(0.16);
  gap(0.07);
  peep(0.3);
  return wavUrl(out, rate);
}

function makeSilentUrl() {
  return wavUrl(new Array(2205).fill(0), 22050);
}
