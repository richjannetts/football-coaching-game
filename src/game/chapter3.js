// Chapter 3: our goal kick.
// Their shot went wide in level 2, so it is our goal kick. The rule: the
// other team goes back into its own half until the ball is kicked (the
// retreat line). In our team: "Spread wide, find a friend." Line up, choose
// the keeper's pass, then watch us play out from the back: a friend passes
// it back, our keeper dribbles out into the space and passes to our front
// player. In Round 1 she scores. Where a round has no goal here, the shot
// goes just wide, so it is their goal kick, for level 4.

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
  stage.startScore();

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
    coachIds: ['coach.c3'],
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

  // Our friend passes it straight back to our keeper, who has stepped
  // out. They are all still back in their half, so there is lots of space:
  // our keeper dribbles out, passes to our front player, and runs back to
  // her goal (Rich, 28th November 2026: keep the keeper in the game).
  // A return pass first, because the kicker may not touch a goal kick
  // twice in a row; whether a keeper may dribble a goal kick straight out
  // is not confirmed for 5v5, so the story never shows it.
  // Where this round's story has a goal here, our front player scores.
  // Otherwise her shot goes just wide, and it is their goal kick (level 4).
  async function playOut(friend) {
    const right = friend.x > 15;
    const flip = right ? (x) => 30 - x : (x) => x;
    const other = friend === wideL ? wideR : wideL;
    const [gk, , , centre, deep] = them;
    const scores = stage.mode.goal === 'us';
    stage.callNames({ mate: friend.el, keeper: keeper.el, shooter: up.el });
    const ending = scores ? ['sfx.goal', 'c3.goal'] : ['c3.wide', ...stage.linked(4, 'c3.theirKick')];
    await stage.play(['c3.back', 'c3.dribble', 'c3.keeperPass', 'c3.keeperBack', 'c3.shot', 'sfx.kick', ...ending], {
      'c3.back': async () => {
        await Promise.all([pitch.moveTo(keeper.el, { x: flip(11.5), y: 6 }, 900), pitch.moveBall({ x: flip(11.8), y: 6.6 }, 1000)]);
        stage.jump([keeper.el]);
      },
      'c3.dribble': () =>
        Promise.all([
          pitch.moveTo(keeper.el, { x: flip(13), y: 11.5 }, 2200),
          pitch.moveBall({ x: flip(13.3), y: 12.1 }, 2200),
          pitch.moveTo(up.el, { x: flip(19), y: 24 }, 2400),
          pitch.moveTo(middle.el, { x: flip(5.5), y: 19 }, 2200),
          pitch.moveTo(friend.el, { x: flip(4), y: 13 }, 2000),
          pitch.moveTo(other.el, { x: flip(25), y: 16 }, 2200),
          pitch.moveTo(centre, { x: flip(14.5), y: 20.5 }, 2400),
        ]),
      'c3.keeperPass': () => Promise.all([pitch.moveBall({ x: flip(19.3), y: 24.6 }, 900), pitch.moveTo(centre, { x: flip(13.6), y: 14.5 }, 900)]),
      'c3.keeperBack': () =>
        Promise.all([
          pitch.moveTo(keeper.el, { x: 15, y: 1.5 }, 2000),
          pitch.moveTo(up.el, { x: flip(17.5), y: 33 }, 2000),
          pitch.moveBall({ x: flip(17.8), y: 33.6 }, 2000),
          pitch.moveTo(deep, { x: flip(13.5), y: 30.5 }, 1900),
          pitch.moveTo(middle.el, { x: flip(9), y: 27 }, 2000),
        ]),
      'c3.shot': () => wait(motion(200)),
      'sfx.kick': () =>
        scores
          ? Promise.all([pitch.moveBall({ x: flip(12.8), y: 40.9 }, 550, 'ease-in'), pitch.moveTo(gk, { x: flip(17), y: 38.6 }, 500)])
          : Promise.all([pitch.moveBall({ x: flip(20.5), y: 41.2 }, 650, 'ease-in'), pitch.moveTo(gk, { x: flip(17), y: 38.6 }, 500)]),
      'sfx.goal': () => {
        stage.storyGoal('us');
        stage.goalBanner(true);
        stage.netShake();
        stage.confetti(null, 70);
        stage.jump(stage.players.map((p) => p.el));
      },
      'c3.goal': async () => {
        await wait(hold(2000));
        stage.goalBanner(false);
      },
      'c3.wide': () => stage.jump([friend.el, middle.el, up.el, other.el]),
      'c3.theirKick': async () => {
        await pitch.moveTo(gk, { x: flip(18.5), y: 39.6 }, 900);
        await pitch.moveBall({ x: 15, y: 37.4 }, 900);
        await pitch.moveTo(gk, { x: 15, y: 38.5 }, 600);
      },
    });
  }
}
