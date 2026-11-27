// Chapter 1: our centre kick.
// Line up in our shape, choose the first pass, then watch a passing move
// that ends in our goal. The message is "we were ready", not "stand here and score".

import { team } from './content.js';
import { runLineup } from './lineup.js';
import { wait, motion, hold } from '../lib/svg.js';

export async function chapter1(stage) {
  const { pitch } = stage;
  const them = stage.addThem(team.opponents.ourCentreKick, team.opponentKeeper.ourCentreKick);
  pitch.placeBall({ x: 15, y: 30 });
  pitch.ball.classList.add('is-hidden');
  pitch.setRing(true);
  stage.setScore(0, 0);

  // Intro explainer. Touch is off while it plays.
  stage.setBusy(true);
  await stage.play(['c1.intro1', 'c1.intro2', 'c1.intro3', 'ring.helper'], {
    'c1.intro1': () => stage.jump(stage.players.map((p) => p.el)),
    'c1.intro2': async () => {
      pitch.showArrow({ x: 15, y: 6 }, { x: 15, y: 34 });
      await wait(hold(2600));
      pitch.clear('arrow');
    },
    'c1.intro3': async () => {
      pitch.ball.classList.remove('is-hidden');
      await pitch.moveBall(pitch.centre, 900, 'cubic-bezier(.3,1.5,.6,1)');
    },
    'ring.helper': async () => {
      pitch.setRing(true, true);
      await wait(hold(3000));
      pitch.setRing(true, false);
    },
  });
  stage.setBusy(false);

  // The puzzle: line up for our centre kick.
  const solved = await runLineup(stage, {
    kind: 'ours',
    shapeKey: 'ourCentreKick',
    promptIds: ['c1.place', 'place.how', 'place.ready'],
  });
  await solved.spoken;

  const role = (name) => solved.roles.filter((r) => r.role === name);
  const kicker = role('kicker')[0];
  const [sideL, sideR] = role('side').sort((a, b) => a.x - b.x);
  const ourBack = role('back')[0];

  // Choose the first pass.
  const targets = [
    { kind: 'friend', x: sideL.x, y: sideL.y, role: sideL },
    { kind: 'friend', x: sideR.x, y: sideR.y, role: sideR },
    { kind: 'back', x: ourBack.x, y: ourBack.y, role: ourBack },
    { kind: 'long', x: 15, y: 34, drawR: 30 },
    { kind: 'shot', x: 15, y: 40.6, drawR: 30 },
  ];
  await stage.play(['c1.passAsk']);
  stage.setBusy(false);

  // Hints step up here too: after two wrong picks only the friends glow,
  // and after three we make the short pass together.
  let wrong = 0;
  for (;;) {
    stage.check();
    if (wrong >= 3) {
      stage.setBusy(true);
      await Promise.all([stage.play(['c1.passTogether']), passAcross(sideL)]);
      await passingMove(sideL, sideR);
      return;
    }
    const choices = wrong >= 2 ? targets.filter((t) => t.kind === 'friend') : targets;
    const pick = await stage.pickTarget(choices, (t) => {
      // Inside the tap: start the sound now.
      stage.setBusy(true);
      if (t.kind === 'friend') return stage.play(['sfx.kick', 'c1.passShort'], { 'c1.passShort': () => passAcross(t.role) });
      wrong++;
      const next = wrong >= 3 ? [] : wrong === 2 ? ['c1.passShow'] : ['hint.tryAgain'];
      const why = { long: 'c1.passLong', shot: 'c1.passShot', back: 'c1.passBack' }[t.kind];
      return stage.play(['sfx.whistle', why, ...next], {}, { remember: wrong === 2 });
    });
    const t = pick.target;
    if (t.kind === 'long') {
      await Promise.all([longKick(), pick.done]);
    } else if (t.kind === 'shot') {
      await Promise.all([shot(), pick.done]);
    } else if (t.kind === 'back') {
      await Promise.all([passBack(), pick.done]);
    } else {
      await pick.done;
      await passingMove(t.role, t.role === sideL ? sideR : sideL);
      return;
    }
    stage.setBusy(false);
  }

  // The friend steps on to the ball as it comes, so the pass goes across
  // or slightly forward, never backwards.
  function passAcross(friend) {
    const meet = { x: friend.x + (friend.x < 15 ? 0.6 : -0.6), y: 21 };
    return Promise.all([pitch.moveTo(friend.el, { x: meet.x, y: meet.y - 0.9 }, 700), pitch.moveBall(meet, 700)]);
  }

  async function passBack() {
    await pitch.moveBall({ x: ourBack.x, y: ourBack.y + 1.2 }, 1000, 'ease-out');
    const cross = pitch.showCross({ x: ourBack.x, y: ourBack.y + 1.2 });
    await wait(hold(1800));
    cross.remove();
    await pitch.moveBall(pitch.centre, 700);
  }

  async function longKick() {
    const theirBack = them[1];
    await pitch.moveBall({ x: 15, y: 30.8 }, 900, 'ease-out');
    await pitch.moveTo(theirBack, { x: 15, y: 31.5 }, 300);
    stage.jump([theirBack]);
    await wait(hold(1200));
    await Promise.all([pitch.moveBall(pitch.centre, 700), pitch.moveTo(theirBack, { x: 15, y: 30 }, 700)]);
  }

  async function shot() {
    await pitch.moveBall({ x: 15, y: 40.6 }, 1000, 'ease-out');
    const cross = pitch.showCross({ x: 15, y: 40.6 });
    await wait(hold(1800));
    cross.remove();
    await pitch.moveBall(pitch.centre, 700);
  }

  // The friend takes it forward, passes across, and her friend scores.
  async function passingMove(friend, other) {
    const flip = friend.x > 15 ? (x) => 30 - x : (x) => x; // mirror when passing right
    const [gk, back, wideA, wideB] = them;
    const nearWide = friend.x > 15 ? wideB : wideA;
    // The shot, a kick sound, then the goal fanfare and confetti before the
    // voice says "Goal!", so the celebration never talks over the words.
    await stage.play(['c1.move1', 'c1.move2', 'sfx.kick', 'sfx.goal', 'c1.goal'], {
      'c1.move1': () =>
        Promise.all([
          pitch.moveTo(friend.el, { x: flip(9), y: 28.5 }, 1800),
          pitch.moveBall({ x: flip(9.4), y: 29.4 }, 1800),
          pitch.moveTo(other.el, { x: flip(19), y: 32.5 }, 2000),
          pitch.moveTo(kicker.el, { x: 15, y: 27 }, 1800),
          pitch.moveTo(back, { x: flip(11), y: 30.5 }, 1700),
          pitch.moveTo(nearWide, { x: flip(6), y: 27 }, 1500),
        ]),
      'c1.move2': () =>
        Promise.all([pitch.moveBall({ x: flip(19), y: 33.2 }, 700), pitch.moveTo(gk, { x: flip(16.5), y: 38.6 }, 800)]),
      'sfx.kick': () => pitch.moveBall({ x: flip(13.6), y: 40.9 }, 500, 'ease-in'),
      'sfx.goal': () => {
        stage.setScore(1, 0, true);
        stage.goalBanner(true);
        stage.netShake();
        stage.confetti(null, 70);
        stage.jump(stage.players.map((p) => p.el));
      },
      'c1.goal': async () => {
        await wait(hold(2200));
        stage.goalBanner(false);
      },
    });
  }
}
