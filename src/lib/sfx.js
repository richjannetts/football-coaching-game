// Little game sounds: taps, pick-ups and put-downs, and a tiny buzz on
// Android phones. Bigger moments (cheers, the goal fanfare, stickers) are
// played by the narrator in between spoken lines instead, so they never talk
// over the voice.
//
// Rules this follows:
//  - Its own audio element, separate from the voice. It is unlocked by the
//    first tap anywhere, so later sounds are allowed to play (iPhone rule 2).
//  - It stays quiet while the voice is speaking. The picture still moves, so
//    nothing is lost, and the voice is never drowned out.
//  - A grown-up can switch the sounds off. The whistle stays, because it is
//    part of how the game says "have another go".

import { makers, toUrl, RATE } from './tones.js';

const urls = {};
const lengths = {};
for (const [name, make] of Object.entries(makers)) {
  const samples = make();
  urls[name] = toUrl(samples);
  lengths[name] = Math.round((samples.length / RATE) * 1000);
}

let enabled = true;
let speaking = false;
let el = null;
let unlocked = false;

export function setEnabled(on) {
  enabled = !!on;
}
export function isEnabled() {
  return enabled;
}
// The narrator tells us when it is talking.
export function setSpeaking(on) {
  speaking = !!on;
}

// For the narrator, which plays the bigger sounds on its own element.
export function url(name) {
  return urls[name] || '';
}
export function lengthMs(name) {
  return lengths[name] || 0;
}

function element() {
  if (!el && typeof Audio !== 'undefined') {
    el = new Audio();
    el.setAttribute('playsinline', '');
    el.preload = 'auto';
  }
  return el;
}

function start(u) {
  const a = element();
  if (!a || !u) return;
  try {
    if (a.src !== u) a.src = u;
    else a.currentTime = 0;
    a.play()?.catch?.(() => {});
  } catch {
    /* a missing sound never stops the game */
  }
}

// A short buzz on phones that have one (Android). iPhone ignores it.
function buzz(ms) {
  try {
    if (ms && typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(ms);
  } catch {
    /* ignore */
  }
}

// Play a small sound now, unless the voice is talking or sounds are off.
export function play(name, { haptic = 0 } = {}) {
  if (!enabled) return;
  buzz(haptic);
  if (speaking) return;
  start(urls[name]);
}

// The first tap anywhere wakes our audio element up, so iPhone lets it play
// later. Every button also gives a tiny tick when tapped.
function onFirstTouch() {
  if (unlocked) return;
  unlocked = true;
  start(urls.silent);
}
function onClick(e) {
  const b = e.target?.closest?.('button');
  if (b && !b.disabled) play('tap', { haptic: 8 });
  else onFirstTouch();
}
if (typeof document !== 'undefined') {
  document.addEventListener('touchend', onFirstTouch, { capture: true, passive: true });
  document.addEventListener('click', onClick, { capture: true });
}
