// The chapter screen: caption, buttons, pitch and the players on it.
// Chapters use the stage to show things and to wait for taps.

import { h, wait, hold } from '../lib/svg.js';
import { createPitch } from '../lib/pitch.js';
import { createPlacement } from '../lib/placement.js';
import { homeIcon, speakerIcon, tickIcon, stickerSvg, nextIcon, tapHere, bookIcon } from '../lib/icons.js';
import { stickerCard } from '../lib/stickers.js';
import { createQuiz } from './quiz.js';
import * as narrator from '../lib/narrator.js';
import * as sfx from '../lib/sfx.js';
import { pointOnce } from '../lib/firstTap.js';
import { burst, burstFrom } from '../lib/confetti.js';
import { team, pitchSize, benchSpots, keeperAt } from './content.js';
import { buildSpots } from '../lib/geometry.js';
import { myTeam } from '../lib/teamState.js';

export const ABORT = Symbol('left the chapter');

// Confetti in our kit colours, with white and gold for sparkle.

const THEIR_LOOKS = [
  { skin: 's5', hair: 'short', hairColour: 'h1' },
  { skin: 's2', hair: 'bun', hairColour: 'h3' },
  { skin: 's3', hair: 'ponytail', hairColour: 'h2' },
  { skin: 's6', hair: 'curls', hairColour: 'h1' },
  { skin: 's1', hair: 'braids', hairColour: 'h5' },
];

// spots: ids of optional extra spots this level needs (team.json grid.extra).
export function createStage({ profile, onHome, showWords = false, spots: extraSpots = [] }) {
  const gridSpots = buildSpots(team.grid, extraSpots);
  const caption = h('p', { class: 'caption', 'aria-live': 'polite' });
  const homeBtn = h('button', { class: 'icon-btn home-btn', type: 'button', 'aria-label': 'Home' }, homeIcon());
  const againBtn = h('button', { class: 'icon-btn again', type: 'button', 'aria-label': 'Hear it again' }, speakerIcon());
  const readyBtn = h('button', { class: 'ready-btn is-hidden', type: 'button', 'aria-label': 'Ready' }, tickIcon());
  const pitchWrap = h('div', { class: 'pitch-wrap' });
  const endCard = h('div', { class: 'end-card is-hidden', role: 'dialog', 'aria-label': 'Level finished' });
  const goalBanner = h('div', { class: 'goal-banner is-hidden', 'aria-hidden': 'true' }, 'GOAL!');

  // Who is playing: both team names with a dot of each kit colour.
  const mine = myTeam(profile);
  // Confetti in our kit colours, with white and gold for sparkle.
  const CONFETTI = [mine.kit.us.shirt, mine.kit.us.stripe, '#ffffff', '#facc15', mine.kit.keeper.shirt];
  const scoreV = h('span', { class: 'scoreboard-v' }, 'v');
  const scoreboard = h(
    'div',
    { class: 'scoreboard', 'aria-label': `${mine.name} against ${mine.theirName}` },
    h('span', { class: 'scoreboard-side' }, h('span', { class: 'kit-dot', style: { background: mine.kit.us.shirt, borderColor: mine.kit.us.stripe } }), h('span', { class: 'scoreboard-name' }, mine.name)),
    scoreV,
    h('span', { class: 'scoreboard-side' }, h('span', { class: 'scoreboard-name' }, mine.theirName), h('span', { class: 'kit-dot', style: { background: mine.kit.them.shirt, borderColor: mine.kit.them.stripe } }))
  );

  const el = h(
    'section',
    { class: 'screen chapter' },
    h('header', { class: 'chapter-top' }, scoreboard, caption),
    pitchWrap,
    h('footer', { class: 'chapter-bottom' }, homeBtn, readyBtn, againBtn),
    goalBanner,
    endCard
  );

  // Words on screen are off unless a grown-up switches them on, or the
  // phone has no voice to read the lines out.
  const showCaption = (on) => el.classList.toggle('show-words', on);
  showCaption(showWords);
  narrator.onNoVoice(() => showCaption(true));

  const pitch = createPitch(pitchSize);
  pitchWrap.append(pitch.svg);
  pitch.showSpots([...gridSpots, ...benchSpots]);

  const stage = {
    el,
    pitch,
    alive: true,
    players: [],
    them: [],
    spots: gridSpots,
    placement: null,
    onReady: null,
  };

  // Captions and visual cues follow whatever line is being spoken.
  narrator.onCaption((text, id) => {
    if (!stage.alive) return;
    const add = id.startsWith('hint.') && caption.dataset.keep === '1';
    caption.textContent = add ? `${caption.textContent} ${text}` : text;
    caption.dataset.keep = id.startsWith('rule.') || id.startsWith('shape.') || /^c\d+\.pass/.test(id) ? '1' : add ? '1' : '0';
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
  stage.players = mine.squad.map((look, i) => {
    const t = pitch.addPlayer(look, 'us', look.name);
    t.dataset.player = i;
    if (look.you) t.classList.add('is-you');
    return { el: t, spotId: benchSpots[i].id, keeper: !!look.keeper };
  });
  stage.placement = createPlacement({
    pitch,
    players: stage.players,
    spots: [...gridSpots, ...benchSpots],
    keeperAt,
    onPick: () => sfx.play('pick', { haptic: 10 }),
    onDrop: () => sfx.play('drop', { haptic: 15 }),
    onChange: () => {
      stage.clearWhy();
      stage.afterChange?.();
    },
  });

  stage.addThem = (positions, keeperIndex = -1) => {
    stage.them = positions.map(([x, y], i) => {
      const t = pitch.addPlayer(THEIR_LOOKS[i % THEIR_LOOKS.length], 'them');
      if (i === keeperIndex) t.classList.add('is-their-keeper');
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

  // Players' real names in the commentary (Rich asked, 27th November
  // 2026): "Pass across to Ace". who: { mate: el, runner: el, ... } for our
  // players' pitch pieces. Lines use {mate|a friend} and so on.
  stage.nameOf = (pieceEl) => {
    const i = stage.players.findIndex((p) => p.el === pieceEl);
    return i < 0 ? '' : mine.squad[i]?.name || '';
  };
  stage.callNames = (who) => {
    const out = {};
    for (const [key, pieceEl] of Object.entries(who)) out[key] = pieceEl ? stage.nameOf(pieceEl) : '';
    narrator.setVars(out);
  };

  stage.check = () => {
    if (!stage.alive) throw ABORT;
  };

  // Touch is off while an explainer plays.
  stage.setBusy = (busy) => {
    el.classList.toggle('is-busy', busy);
    if (busy) stage.placement.disable();
  };

  stage.showReady = (show) => {
    readyBtn.classList.toggle('is-hidden', !show);
    if (show) pointOnce(readyBtn, 'ready');
  };
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

  // A friendly wobble on the players who need to move. Not a telling off:
  // just "look at me".
  stage.shake = (indexes) => {
    indexes.forEach((i) => {
      const t = stage.players[i].el;
      t.classList.remove('is-shaking');
      void t.getBoundingClientRect();
      t.classList.add('is-shaking');
      setTimeout(() => t.classList.remove('is-shaking'), 700);
    });
  };

  // Confetti for the big moments. Optional: from an element on screen.
  stage.confetti = (fromEl, count) => {
    if (!stage.alive) return;
    if (fromEl) burstFrom(fromEl, { colours: CONFETTI, count });
    else burst({ colours: CONFETTI, count });
  };

  // The score in the middle of the scoreboard. pop: a goal was just scored.
  stage.setScore = (us, them, pop = false) => {
    scoreV.textContent = `${us} – ${them}`;
    scoreV.classList.add('is-score');
    scoreboard.setAttribute('aria-label', `${mine.name} ${us}, ${mine.theirName} ${them}`);
    if (pop) {
      scoreV.classList.remove('is-new');
      void scoreV.offsetWidth;
      scoreV.classList.add('is-new');
    }
  };

  stage.goalBanner = (show) => goalBanner.classList.toggle('is-hidden', !show);
  // The net ripples when the ball goes in.
  stage.netShake = () => {
    pitch.svg.classList.remove('net-shake');
    void pitch.svg.getBoundingClientRect();
    pitch.svg.classList.add('net-shake');
    setTimeout(() => pitch.svg.classList.remove('net-shake'), 900);
  };

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

  // The end of a level: a medal for passing it, then the bonus question.
  // A right answer wins the next album sticker (prize). Finishing a match
  // gives a shiny sticker (shiny). The next button appears once the
  // question is answered.
  stage.showEnd = ({ level, nextLabel, onNext, question, onBonus, firstTime = false, prize = null, shiny = null }) => {
    const award = h('div', { class: 'end-sticker' }, h('div', { class: 'end-rays' }), stickerSvg(level, true));
    if (shiny) award.append(h('div', { class: 'end-prize is-shiny' }, stickerCard(shiny)));
    const nextBtn = onNext
      ? h('button', { class: 'icon-btn big is-glow', type: 'button', 'aria-label': nextLabel || 'Next level', onclick: () => (stage.leave(), onNext()) }, nextIcon())
      : null;
    const homeEnd = h('button', { class: 'icon-btn big', type: 'button', 'aria-label': 'Home', onclick: () => (stage.leave(), onHome()) }, homeIcon());
    const buttons = h('div', { class: 'end-buttons' }, homeEnd, nextBtn);
    // The first time through, a hand points at what to tap next
    // (Rich's daughter didn't know what to press, 26th November 2026).
    const pointLine = firstTime ? (nextBtn ? 'end.tapNext' : 'end.tapHome') : null;
    const point = () => {
      if (!firstTime) return;
      const target = nextBtn || homeEnd;
      target.classList.add('has-pointer');
      target.append(tapHere());
    };
    let quiz = null;
    if (question) {
      nextBtn?.classList.add('is-hidden');
      quiz = createQuiz({
        question,
        play: stage.play,
        say: stage.say,
        onShow: () => endCard.classList.add('has-quiz'),
        thenLines: pointLine ? [pointLine] : [],
        rightLines: prize ? ['end.sticker'] : [],
        rightSounds: prize ? ['sfx.sticker'] : [],
        rightCues: prize ? { 'end.sticker': () => stickerWin(prize) } : {},
        onAnswer: (right) => {
          if (right) {
            if (prize) {
              // The sticker waits in the corner until its big moment is over.
              award.append(h('div', { class: 'end-prize is-waiting' }, stickerCard(prize)));
            } else {
              requestAnimationFrame(() => stage.confetti(award, 24));
            }
            onBonus?.();
          }
          nextBtn?.classList.remove('is-hidden');
          point();
        },
      });
    } else {
      point();
    }
    // A right answer wins a sticker: a big, clear moment that says so
    // (Rich asked, 27th November 2026). The sticker fills the screen with
    // "New sticker!" and a picture of her album, then settles beside the
    // medal. It is only pictures: touch carries on as normal underneath.
    const stickerWin = async (st) => {
      if (!stage.alive) return;
      endCard.querySelector('.sticker-win')?.remove();
      const big = h('div', { class: 'sticker-win-card' }, stickerCard(st));
      const win = h(
        'div',
        { class: 'sticker-win', 'aria-hidden': 'true' },
        h('div', { class: 'sticker-win-rays' }),
        h('div', { class: 'sticker-win-title' }, 'NEW STICKER!'),
        big,
        h('div', { class: 'sticker-win-album' }, h('span', { class: 'sticker-win-book' }, bookIcon()), h('span', {}, 'For your album'))
      );
      endCard.append(win);
      requestAnimationFrame(() => stage.confetti(big, 60));
      await wait(hold(3600));
      win.classList.add('is-leaving');
      await wait(hold(500));
      win.remove();
      const corner = award.querySelector('.end-prize.is-waiting');
      if (corner) {
        corner.classList.remove('is-waiting');
        requestAnimationFrame(() => stage.confetti(corner, 24));
      }
    };
    endCard.replaceChildren(h('div', { class: 'end-main' }, h('div', { class: 'end-award' }, award), quiz ? quiz.el : null), buttons);
    endCard.classList.remove('is-hidden');
    // The medal arrives with a burst of confetti.
    requestAnimationFrame(() => stage.confetti(award, 56));
    return { startQuiz: () => (quiz ? quiz.start() : pointLine ? stage.play([pointLine]) : Promise.resolve()) };
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

