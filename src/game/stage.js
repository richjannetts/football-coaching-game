// The chapter screen: caption, buttons, pitch and the players on it.
// Chapters use the stage to show things and to wait for taps.

import { h } from '../lib/svg.js';
import { createPitch } from '../lib/pitch.js';
import { createPlacement } from '../lib/placement.js';
import { homeIcon, speakerIcon, tickIcon, ballIcon, nextIcon } from '../lib/icons.js';
import * as narrator from '../lib/narrator.js';
import { team, pitchSize, gridSpots, benchSpots, keeperAt } from './content.js';

export const ABORT = Symbol('left the chapter');

const THEIR_LOOKS = [
  { skin: 's5', hair: 'short', hairColour: 'h1' },
  { skin: 's2', hair: 'bun', hairColour: 'h3' },
  { skin: 's3', hair: 'ponytail', hairColour: 'h2' },
  { skin: 's6', hair: 'curls', hairColour: 'h1' },
  { skin: 's1', hair: 'braids', hairColour: 'h5' },
];

export function createStage({ profile, onHome }) {
  const caption = h('p', { class: 'caption', 'aria-live': 'polite' });
  const homeBtn = h('button', { class: 'icon-btn home-btn', type: 'button', 'aria-label': 'Home' }, homeIcon());
  const againBtn = h('button', { class: 'icon-btn again', type: 'button', 'aria-label': 'Hear it again' }, speakerIcon());
  const readyBtn = h('button', { class: 'ready-btn is-hidden', type: 'button', 'aria-label': 'Ready' }, tickIcon());
  const pitchWrap = h('div', { class: 'pitch-wrap' });
  const endCard = h('div', { class: 'end-card is-hidden', role: 'dialog', 'aria-label': 'Chapter finished' });
  const goalBanner = h('div', { class: 'goal-banner is-hidden', 'aria-hidden': 'true' }, 'GOAL!');

  const el = h(
    'section',
    { class: 'screen chapter' },
    h('header', { class: 'chapter-top' }, homeBtn, caption, againBtn),
    pitchWrap,
    h('footer', { class: 'chapter-bottom' }, readyBtn),
    goalBanner,
    endCard
  );

  const pitch = createPitch(pitchSize);
  pitchWrap.append(pitch.svg);
  pitch.showSpots([...gridSpots, ...benchSpots]);

  const stage = {
    el,
    pitch,
    alive: true,
    players: [],
    them: [],
    placement: null,
    onReady: null,
  };

  // Captions and visual cues follow whatever line is being spoken.
  narrator.onCaption((text, id) => {
    if (!stage.alive) return;
    const add = id.startsWith('hint.') && caption.dataset.keep === '1';
    caption.textContent = add ? `${caption.textContent} ${text}` : text;
    caption.dataset.keep = id.startsWith('rule.') || id.startsWith('shape.') || id.startsWith('c1.pass') ? '1' : add ? '1' : '0';
    caption.classList.remove('is-new');
    void caption.offsetWidth;
    caption.classList.add('is-new');
  });
  narrator.onSpeaking((on) => againBtn.classList.toggle('is-speaking', on));

  homeBtn.addEventListener('click', () => {
    stage.leave();
    onHome();
  });
  againBtn.addEventListener('click', () => {
    if (el.classList.contains('is-busy')) return;
    stage.say(narrator.lastLines(), {}, { remember: false });
  });
  readyBtn.addEventListener('click', () => {
    if (el.classList.contains('is-busy')) return;
    stage.onReady?.();
  });

  // Our five players. The first one is the child's own player.
  stage.players = team.squad.map((look, i) => {
    const t = pitch.addPlayer(look.you ? profile : look, 'us');
    t.dataset.player = i;
    if (look.you) t.classList.add('is-you');
    return { el: t, spotId: benchSpots[i].id };
  });
  stage.placement = createPlacement({
    pitch,
    players: stage.players,
    spots: [...gridSpots, ...benchSpots],
    keeperAt,
    onChange: () => {
      stage.clearWhy();
      stage.afterChange?.();
    },
  });

  stage.addThem = (positions) => {
    stage.them = positions.map(([x, y], i) => {
      const t = pitch.addPlayer(THEIR_LOOKS[i % THEIR_LOOKS.length], 'them');
      pitch.place(t, { x, y });
      return t;
    });
    return stage.them;
  };

  // Speak lines one at a time. Each line's visual cue runs while it is
  // spoken, and the next line waits until both have finished, so pictures
  // and words stay together even if the voice is quick or missing.
  // The first line starts straight away, so call play() from a tap.
  let playId = 0;
  stage.play = async (ids, cues = {}, { remember = true } = {}) => {
    const mine = ++playId;
    if (remember) narrator.remember(ids);
    for (const id of ids) {
      stage.check();
      if (mine !== playId) return; // something newer is being said
      const cue = cues[id];
      await Promise.all([narrator.say([id], { remember: false }), cue ? Promise.resolve().then(cue).catch(() => {}) : null]);
    }
    stage.check();
  };
  // For taps that start speech and do not need to wait for it.
  stage.say = (ids, cues = {}, opts) => {
    stage.play(ids, cues, opts).catch(() => {});
  };

  stage.check = () => {
    if (!stage.alive) throw ABORT;
  };

  // Touch is off while an explainer plays.
  stage.setBusy = (busy) => {
    el.classList.toggle('is-busy', busy);
    if (busy) stage.placement.disable();
  };

  stage.showReady = (show) => readyBtn.classList.toggle('is-hidden', !show);
  stage.glowReady = (on) => readyBtn.classList.toggle('is-glow', on);

  stage.clearWhy = () => {
    pitch.setWhy(null);
    stage.players.forEach((p) => p.el.classList.remove('is-wrong'));
  };

  stage.bounce = (indexes) => {
    indexes.forEach((i) => {
      const t = stage.players[i].el;
      t.classList.remove('is-bouncing');
      void t.getBoundingClientRect();
      t.classList.add('is-bouncing');
      setTimeout(() => t.classList.remove('is-bouncing'), 1600);
    });
  };

  stage.jump = (els) => {
    els.forEach((t) => {
      t.classList.remove('is-jumping');
      void t.getBoundingClientRect();
      t.classList.add('is-jumping');
      setTimeout(() => t.classList.remove('is-jumping'), 1300);
    });
  };

  stage.goalBanner = (show) => goalBanner.classList.toggle('is-hidden', !show);

  // Wait for a tap on one of several glowing places on the pitch.
  // onPick runs inside the tap, so it can start sound straight away.
  stage.pickTarget = (targets, onPick) =>
    new Promise((resolve) => {
      pitch.showTargets(targets);
      pitch.svg.classList.add('is-choosing');
      let last = { t: -Infinity, x: 0, y: 0 };
      const handler = (e) => {
        if (el.classList.contains('is-busy') || !e.isPrimary) return;
        const now = e.timeStamp || performance.now();
        if (now - last.t < 300 && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 40) return;
        last = { t: now, x: e.clientX, y: e.clientY };
        const p = pitch.eventToYards(e);
        if (!p) return;
        const px = pitch.pxPerYard();
        let best = null;
        let bestD = Infinity;
        for (const t of targets) {
          const d = Math.hypot(t.x - p.x, t.y - p.y);
          if (d < bestD) {
            bestD = d;
            best = t;
          }
        }
        if (!best || bestD * px > 75) return;
        pitch.svg.removeEventListener('pointerup', handler);
        pitch.svg.classList.remove('is-choosing');
        pitch.showTargets([]);
        resolve({ target: best, done: onPick(best) });
      };
      pitch.svg.addEventListener('pointerup', handler);
      stage.cancelPick = () => pitch.svg.removeEventListener('pointerup', handler);
    });

  stage.showEnd = ({ footballs, total, nextLabel, onNext }) => {
    endCard.replaceChildren(
      h('div', { class: 'end-ball' }, ballIcon(true)),
      h('div', { class: 'end-tally', 'aria-label': `${footballs} of ${total} footballs` }, Array.from({ length: total }, (_, i) => ballIcon(i < footballs))),
      h(
        'div',
        { class: 'end-buttons' },
        h('button', { class: 'icon-btn big', type: 'button', 'aria-label': 'Home', onclick: () => (stage.leave(), onHome()) }, homeIcon()),
        onNext ? h('button', { class: 'icon-btn big is-glow', type: 'button', 'aria-label': nextLabel || 'Next chapter', onclick: () => (stage.leave(), onNext()) }, nextIcon()) : null
      )
    );
    endCard.classList.remove('is-hidden');
  };

  stage.leave = () => {
    if (!stage.alive) return;
    stage.alive = false;
    narrator.stop();
    stage.cancelPick?.();
    stage.placement.destroy();
    pitch.destroy();
  };

  // Lay out once the screen is in the page.
  requestAnimationFrame(() => pitch.layout());
  return stage;
}

