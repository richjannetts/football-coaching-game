// Chapter 3: our goal kick.
// Their shot went wide in level 2, so it is our goal kick. The rule: the
// other team goes back into its own half until the ball is kicked (the
// retreat line). In our team: "Spread wide, find a friend." Line up, choose
// the keeper's pass, then watch us play out from the back. Our shot goes
// just wide, so it is their goal kick, for level 4.

import { team } from './content.js';
import { runLineup } from './lineup.js';
import { wait, motion, hold } from '../lib/svg.js';

// Where the other team goes once it has gone back over the halfway line.
const RETREAT = [
  [15, 38.5],
  [9, 23],
  [21, 23],
  [19, 28.5],
  [11, 31],
];
const BALL = { x: 15, y: 2.8 }; // the goal kick, just in front of our keeper

export async function chapter3(stage) {
  const { pitch } = stage;
  const them = stage.addThem(team.opponents.ourGoalKick, team.opponentKeeper.ourGoalKick);
  pitch.placeBall(BALL);
  pitch.setRing(false);
  stage.setScore(1, 0);

  // Intro explainer. Touch is off while it plays.
  stage.setBusy(true);
  await stage.play(['c3.intro1', 'c3.intro2'], {
    'c3.intro1': async () => {
      pitch.svg.classList.add('flash-goal-line');
      await wait(hold(1800));
      pitch.svg.classList.remove('flash-goal-line');
    },
    'c3.intro2': async () => {
      pitch.setRetreat(true);
      await Promise.all(them.map((t, i) => pitch.moveTo(t, { x: RETREAT[i][0], y: RETREAT[i][1] }, 1800 + i * 150)));
      await wait(hold(800));
      pitch.setRetreat(false);
    },
  });
  stage.setBusy(false);

  // The puzzle: line up for our goal kick.
  const solved = await runLineup(stage, {
    kind: 'ourGoalKick',
    shapeKey: 'ourGoalKick',
    promptIds: ['c3.place', 'place.how', 'place.ready'],
  });
  await solved.spoken;

  const role = (name) => solved.roles.filter((r) => r.role === name);
  const [wideL, wideR] = role('wide').sort((a, b) => a.x - b.x);
  const middle = role('middle')[0];
  const up = role('up')[0];
  const keeper = role('keeper')[0];

  // Choose the keeper's pass: a friend out wide, or a long kick.
  const targets = [
    { kind: 'friend', x: wideL.x, y: wideL.y, role: wideL },
    { kind: 'friend', x: wideR.x, y: wideR.y, role: wideR },
    { kind: 'long', x: 15, y: 35, drawR: 30 },
  ];
  await stage.play(['c3.passAsk']);
  stage.setBusy(false);

  // Hints step up: after two long kicks only the friends glow, and after
  // three we make the pass together.
  let wrong = 0;
  for (;;) {
    stage.check();
    if (wrong >= 3) {
      stage.setBusy(true);
      stage.callNames({ mate: wideL.el });
      await Promise.all([stage.play(['sfx.kick', 'c3.passTogether']), passWide(wideL)]);
      await playOut(wideL);
      return;
    }
    const choices = wrong >= 2 ? targets.filter((t) => t.kind === 'friend') : targets;
    const pick = await stage.pickTarget(choices, (t) => {
      // Inside the tap: start the sound now.
      stage.setBusy(true);
      if (t.kind === 'friend') stage.callNames({ mate: t.role.el });
      if (t.kind === 'friend') return stage.play(['sfx.kick', 'c3.passWide'], { 'c3.passWide': () => passWide(t.role) });
      wrong++;
      const next = wrong >= 3 ? [] : wrong === 2 ? ['c3.passShow'] : ['hint.tryAgain'];
      return stage.play(['sfx.whistle', 'c3.passLong', ...next], {}, { remember: wrong === 2 });
    });
    if (pick.target.kind === 'long') {
      await Promise.all([longKick(), pick.done]);
    } else {
      await pick.done;
      await playOut(pick.target.role);
      return;
    }
    stage.setBusy(false);
  }

  function passWide(friend) {
    const meet = { x: friend.x + (friend.x < 15 ? 0.4 : -0.4), y: friend.y + 0.6 };
    return Promise.all([pitch.moveTo(keeper.el, { x: 15, y: 1.5 }, 300), pitch.moveBall(meet, 800)]);
  }

  // A long kick sails over everyone and their keeper catches it.
  async function longKick() {
    const catcher = them[0];
    await pitch.moveBall({ x: 15, y: 36.6 }, 1100, 'ease-out');
    await pitch.moveTo(catcher, { x: 15, y: 37.2 }, 300);
    stage.jump([catcher]);
    const cross = pitch.showCross({ x: 15, y: 36.6 });
    await wait(hold(1600));
    cross.remove();
    await Promise.all([pitch.moveBall(BALL, 700), pitch.moveTo(catcher, { x: RETREAT[0][0], y: RETREAT[0][1] }, 700)]);
  }

  // Our friend takes it up the side, passes inside, and our front player
  // shoots. Just wide: their goal kick.
  async function playOut(friend) {
    const right = friend.x > 15;
    const flip = right ? (x) => 30 - x : (x) => x;
    const other = friend === wideL ? wideR : wideL;
    const [gk, , , centre, deep] = them;
    const near = right ? them[2] : them[1];
    stage.callNames({ runner: friend.el, mate: middle.el, shooter: up.el });
    await stage.play(['c3.move1', 'c3.move2', 'c3.shot', 'sfx.kick', 'c3.wide', 'c3.theirKick'], {
      'c3.move1': () =>
        Promise.all([
          pitch.moveTo(friend.el, { x: flip(4.5), y: 17.5 }, 2000),
          pitch.moveBall({ x: flip(5), y: 18.4 }, 2000),
          pitch.moveTo(middle.el, { x: flip(12), y: 21 }, 2000),
          pitch.moveTo(up.el, { x: flip(17), y: 29 }, 2200),
          pitch.moveTo(other.el, { x: flip(24), y: 15 }, 2000),
          pitch.moveTo(near, { x: flip(7), y: 21 }, 1800),
          pitch.moveTo(centre, { x: flip(14), y: 25 }, 1800),
        ]),
      'c3.move2': async () => {
        await pitch.moveBall({ x: flip(12.4), y: 21.8 }, 700);
        await wait(motion(250));
        await Promise.all([pitch.moveBall({ x: flip(17), y: 29.8 }, 800), pitch.moveTo(deep, { x: flip(16), y: 33 }, 900)]);
      },
      'c3.shot': () => Promise.all([pitch.moveTo(up.el, { x: flip(18), y: 32 }, 900), pitch.moveBall({ x: flip(18.4), y: 32.8 }, 900)]),
      'sfx.kick': () => Promise.all([pitch.moveBall({ x: flip(20.5), y: 41.2 }, 650, 'ease-in'), pitch.moveTo(gk, { x: flip(17), y: 38.6 }, 500)]),
      'c3.wide': () => stage.jump([friend.el, middle.el, up.el, other.el]),
      'c3.theirKick': async () => {
        await pitch.moveTo(gk, { x: flip(18.5), y: 39.6 }, 900);
        await pitch.moveBall({ x: 15, y: 37.4 }, 900);
        await pitch.moveTo(gk, { x: 15, y: 38.5 }, 600);
      },
    });
  }
}
