// The chapter screen: caption, buttons, pitch and the players on it.
// Chapters use the stage to show things and to wait for taps.

import { h, wait, hold, motion } from '../lib/svg.js';
import { createPitch } from '../lib/pitch.js';
import { createPlacement } from '../lib/placement.js';
import { homeIcon, speakerIcon, tickIcon, stickerSvg, nextIcon, tapHere, bookIcon } from '../lib/icons.js';
import { stickerCard, emptyCard } from '../lib/stickers.js';
import { createQuiz } from './quiz.js';
import * as narrator from '../lib/narrator.js';
import * as sfx from '../lib/sfx.js';
import { pointOnce } from '../lib/firstTap.js';
import { burst, burstFrom } from '../lib/confetti.js';
import { team, pitchSize, benchSpots, keeperAt } from './content.js';
import { buildSpots, freeSpots } from '../lib/geometry.js';
import { myTeam } from '../lib/teamState.js';
import { scoreWords, finalWords } from '../lib/difficulty.js';
import { miniClock } from '../lib/icons.js';
import difficulty from '../data/difficulty.json';
import { playConsequence } from './consequence.js';

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
// mode: how this level is played (see modeFor in main.js): the difficulty,
// whether the pitch is the other way round, extra goals so far on
// Difficult, and which full-time ending. Missing means Easy, as before.
// before: the score as the level starts. next: the level after this one in
// this match's order (undefined means any). minute: the match clock.
export const defaultMode = () => ({ level: 0, difficulty: 'easy', mirror: false, goals: { us: 0, them: 0 }, consequences: false, ending: 0, before: { us: 0, them: 0 }, next: undefined, minute: null, onGoal: () => {} });
export function createStage({ profile, onHome, showWords = false, spots: extraSpots = [], mode: given = {} }) {
  const mode = { ...defaultMode(), ...given, goals: { ...defaultMode().goals, ...(given.goals || {}) }, before: { ...defaultMode().before, ...(given.before || {}) } };
  mode.cfg = difficulty.levels[mode.difficulty] || difficulty.levels.easy;
  // No dots on Difficult: players can go anywhere (an unseen one-yard grid).
  const gridSpots = mode.cfg.dots ? buildSpots(team.grid, extraSpots) : freeSpots(team.grid, extraSpots, pitchSize);
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

  // The match clock: which minute of the match this moment is.
  if (mode.minute != null) scoreboard.append(h('span', { class: 'scoreboard-minute', 'aria-label': `${mode.minute} minutes` }, miniClock(mode.minute), `${mode.minute}'`));

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

  const pitch = createPitch({ ...pitchSize, mirror: !!mode.mirror });
  pitchWrap.append(pitch.svg);
  pitch.showSpots(mode.cfg.dots ? [...gridSpots, ...benchSpots] : benchSpots);
  pitch.svg.classList.toggle('no-dots', !mode.cfg.dots);

  const stage = {
    el,
    mode,
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
  // us and them are the story's score. Extra goals on Difficult are added
  // on top, and the voice says the real score ({score} and {final}).
  let base = null;
  stage.setScore = (storyUs, storyThem, pop = false) => {
    base = [storyUs, storyThem];
    const us = storyUs + mode.goals.us;
    const them = storyThem + mode.goals.them;
    narrator.setVars({ score: scoreWords(us, them), final: finalWords(us, them) });
    scoreV.textContent = `${us} – ${them}`;
    scoreV.classList.add('is-score');
    scoreboard.setAttribute('aria-label', `${mine.name} ${us}, ${mine.theirName} ${them}`);
    if (pop) {
      scoreV.classList.remove('is-new');
      void scoreV.offsetWidth;
      scoreV.classList.add('is-new');
    }
  };

  // The score as this level starts, from the story's goals in the levels
  // played before it in this match's order (see the cup in levels.json).
  stage.startScore = () => stage.setScore(mode.before.us, mode.before.them);
  // One of the story's own goals, scored now.
  stage.storyGoal = (side) => {
    const [us, them] = base || [mode.before.us, mode.before.them];
    stage.setScore(us + (side === 'us' ? 1 : 0), them + (side === 'them' ? 1 : 0), true);
  };

  // The lines at the end of a level that lead into the next one ("so now
  // it's their goal kick, that's the next level") are only said when that
  // level really is next in this match's order.
  stage.linked = (level, ...ids) => (mode.next == null || mode.next === level ? ids : []);

  // An extra goal, outside the story's own goals: theirs after a mistake
  // on Difficult, or ours when the corner at level 8 goes in.
  stage.addGoal = (side) => {
    mode.goals[side] += 1;
    mode.onGoal(side);
    if (base) stage.setScore(base[0], base[1], true);
  };
  // What a wrong try costs on Difficult (see lineup.js).
  stage.consequence = (type) => playConsequence(stage, type);

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
  // prizePage: the album page the prize goes on, so it can be seen landing.
  stage.showEnd = ({ level, nextLabel, onNext, question, onBonus, firstTime = false, prize = null, prizePage = null, shiny = null }) => {
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
    // "New sticker!", then her album page appears and the sticker flies
    // into its numbered space (Rich asked again after a play-test, the same
    // day). Then it settles beside the medal. It is only pictures: touch
    // carries on as normal underneath.
    const stickerWin = async (st) => {
      if (!stage.alive) return;
      endCard.querySelector('.sticker-win')?.remove();
      const big = h('div', { class: 'sticker-win-card' }, stickerCard(st));
      const page = prizePage ? albumPage(prizePage, st) : null;
      const win = h(
        'div',
        { class: 'sticker-win', 'aria-hidden': 'true' },
        h('div', { class: 'sticker-win-rays' }),
        h('div', { class: 'sticker-win-title' }, 'NEW STICKER!'),
        big,
        h('div', { class: 'sticker-win-album' }, h('span', { class: 'sticker-win-book' }, bookIcon()), h('span', {}, 'For your album')),
        page ? page.el : null
      );
      endCard.append(win);
      requestAnimationFrame(() => stage.confetti(big, 60));
      await wait(hold(page ? 1900 : 3600));
      if (page && stage.alive) {
        win.classList.add('is-sticking');
        await wait(hold(450));
        const from = big.getBoundingClientRect();
        const to = page.target.getBoundingClientRect();
        const dx = to.left + to.width / 2 - (from.left + from.width / 2);
        const dy = to.top + to.height / 2 - (from.top + from.height / 2);
        const sc = from.width ? to.width / from.width : 1;
        const fly = big.animate([{ transform: 'none' }, { transform: `translate(${dx}px, ${dy}px) scale(${sc})` }], {
          duration: motion(850),
          easing: 'cubic-bezier(0.5, 0, 0.3, 1)',
          fill: 'forwards',
        });
        await fly.finished.catch(() => {});
        big.style.visibility = 'hidden';
        page.target.classList.remove('is-target');
        page.target.classList.add('got', 'just-got');
        page.target.replaceChildren(stickerCard(st));
        requestAnimationFrame(() => stage.confetti(page.target, 30));
        await wait(hold(1900));
      }
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

  // A small copy of one album page, with the new sticker's space waiting.
  function albumPage(pg, st) {
    let target = null;
    const slots = pg.stickers.map((x, j) => {
      const mine = x.no === st.no;
      const slot = h('span', { class: mine ? `slot r${j % 3} is-target` : x.earned ? `slot got r${j % 3}` : 'slot' }, x.earned && !mine ? stickerCard(x) : emptyCard(x));
      if (mine) target = slot;
      return slot;
    });
    const el = h(
      'article',
      { class: 'paper sticker-win-page' },
      h('div', { class: 'paper-band', style: { background: pg.colour } }, h('span', { class: 'paper-title' }, pg.title), h('span', { class: 'paper-page' }, `page ${pg.index + 1}`)),
      h('div', { class: 'paper-grid' }, slots)
    );
    return target ? { el, target } : null;
  }

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

