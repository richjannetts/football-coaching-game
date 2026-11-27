// Chapter 8: our corner.
// The rule (FA 5v5): the ball sits still in the corner, one of us takes
// it, and they stand five yards away. In our team: a friend close to the
// near post for a short pass, a friend on the edge of their box for a
// shot, and one friend stays back near halfway. Choose the pass, then
// watch the move. The shot hits the post (the storyboard Rich agreed,
// 27th November 2026), they break, and our friend who stayed back blocks
// it out over our goal line: their corner, for level 9.
// On Difficult, if they scored an extra goal after a mistake, this shot
// goes in off the post instead, so she can still win the match. Then they
// kick off and break, and the story carries on the same way.

import { team } from './content.js';
import { runLineup } from './lineup.js';
import { wait, motion, hold } from '../lib/svg.js';

const BALL = { x: 29.4, y: 39.4 }; // in the right-hand corner, by their goal

export async function chapter8(stage) {
  const { pitch } = stage;
  const them = stage.addThem(team.opponents.ourCorner, team.opponentKeeper.ourCorner);
  const [gk, marker, , middle, far] = them;
  pitch.placeBall({ x: 27, y: 41.4 });
  pitch.setRingAt(BALL);
  pitch.setRing(false);
  stage.setScore(1, 1);

  stage.setBusy(true);
  await stage.play(['c8.intro1', 'c8.intro2', 'c8.intro3'], {
    'c8.intro1': () => pitch.moveBall(BALL, 900, 'ease-out'),
    'c8.intro2': async () => {
      stage.jump([pitch.ball]);
      await wait(hold(2400));
    },
    'c8.intro3': async () => {
      pitch.setRing(true, true);
      await wait(hold(2600));
      pitch.setRing(true, false);
    },
  });
  stage.setBusy(false);

  const solved = await runLineup(stage, {
    kind: 'ourCorner',
    shapeKey: 'ourCorner',
    promptIds: ['c8.place', 'place.how', 'place.ready'],
    ball: BALL,
  });
  await solved.spoken;

  const role = (name) => solved.roles.filter((r) => r.role === name)[0];
  const taker = role('taker');
  const near = role('near');
  const edge = role('edge');
  const stay = role('stay');
  const keeper = role('keeper');

  const targets = [
    { kind: 'friend', x: near.x, y: near.y, role: near },
    { kind: 'friend', x: edge.x, y: edge.y, role: edge },
    { kind: 'them', x: 17, y: 33 },
  ];
  await stage.play(['c8.passAsk']);
  stage.setBusy(false);

  let wrong = 0;
  for (;;) {
    stage.check();
    if (wrong >= 3) {
      stage.setBusy(true);
      stage.callNames({ mate: near.el });
      await Promise.all([stage.play(['sfx.kick', 'c8.passTogether']), passTo(near)]);
      await playOut(near);
      return;
    }
    const choices = wrong >= 2 ? targets.filter((t) => t.kind === 'friend') : targets;
    const pick = await stage.pickTarget(choices, (t) => {
      stage.setBusy(true);
      if (t.kind === 'friend') stage.callNames({ mate: t.role.el });
      if (t.kind === 'friend') return stage.play(['sfx.kick', 'c8.passGood'], { 'c8.passGood': () => passTo(t.role) });
      wrong++;
      const next = wrong >= 3 ? [] : wrong === 2 ? ['c8.passShow'] : ['hint.tryAgain'];
      return stage.play(['sfx.whistle', 'c8.passThem', ...next], {}, { remember: wrong === 2 });
    });
    if (pick.target.kind === 'them') {
      await Promise.all([toThem(), pick.done]);
    } else {
      await pick.done;
      await playOut(pick.target.role);
      return;
    }
    stage.setBusy(false);
  }

  function passTo(friend) {
    return pitch.moveBall({ x: friend.x + 0.4, y: friend.y + 0.6 }, 800);
  }

  // A corner into the middle, where their player was waiting.
  async function toThem() {
    await pitch.moveBall({ x: 17.4, y: 33.6 }, 800, 'ease-out');
    stage.jump([middle]);
    const cross = pitch.showCross({ x: 17.4, y: 33.6 });
    await wait(hold(1600));
    cross.remove();
    await pitch.moveBall(BALL, 800);
  }

  // Whoever got the corner passes to the other friend, who shoots.
  async function playOut(first) {
    const shooter = first === near ? edge : near;
    stage.callNames({ runner: shooter.el, defender: stay.el });
    const from = { x: shooter.x < 18 ? 16 : 19.5, y: shooter.y < 33 ? 31 : 34 };
    const comeback = stage.mode.goals.them > stage.mode.goals.us;
    const middleLines = comeback ? ['sfx.goal', 'c8.postIn', 'c8.kickOff'] : ['c8.post', 'c8.break'];
    await stage.play(['c8.move1', 'sfx.kick', ...middleLines, 'c8.block', 'c8.theirCorner'], {
      'c8.move1': async () => {
        await Promise.all([pitch.moveTo(taker.el, { x: 26, y: 37 }, 900), pitch.moveTo(shooter.el, from, 900)]);
        await pitch.moveBall({ x: from.x + 0.4, y: from.y + 0.6 }, 700);
        await wait(motion(300));
      },
      'sfx.kick': () => Promise.all([pitch.moveBall({ x: 17.9, y: 39.7 }, 600, 'ease-in'), pitch.moveTo(gk, { x: 15.5, y: 38.8 }, 500)]),
      // It bounces back off the post, and their keeper gathers it.
      'c8.post': async () => {
        stage.jump([shooter.el]);
        await pitch.moveBall({ x: 15.8, y: 37.6 }, 600, 'ease-out');
        stage.jump([gk]);
        await wait(hold(900));
      },
      // In off the post! The score is level again.
      'sfx.goal': async () => {
        await pitch.moveBall({ x: 15.6, y: 40.9 }, 400, 'ease-out');
        stage.addGoal('us');
        stage.goalBanner(true);
        stage.netShake();
        stage.confetti(null, 70);
        stage.jump(stage.players.map((p) => p.el));
      },
      'c8.postIn': async () => {
        await wait(hold(1800));
        stage.goalBanner(false);
      },
      // They kick off and race into our half.
      'c8.kickOff': async () => {
        pitch.placeBall({ x: 15, y: 20 });
        await Promise.all([pitch.moveTo(far, { x: 14.5, y: 21 }, 900), pitch.moveTo(gk, { x: 15, y: 39 }, 900)]);
        await Promise.all([
          pitch.moveTo(far, { x: 7, y: 14 }, 1600),
          pitch.moveBall({ x: 7.4, y: 13.4 }, 1600),
          pitch.moveTo(stay.el, { x: 8, y: 11 }, 1600),
          pitch.moveTo(marker, { x: 18, y: 24 }, 1600),
          pitch.moveTo(keeper.el, { x: 13.6, y: 1.6 }, 1000),
        ]);
      },
      // Their keeper throws it out and their player races into our half.
      'c8.break': async () => {
        await Promise.all([pitch.moveBall({ x: 9, y: 27 }, 1000, 'ease-out'), pitch.moveTo(far, { x: 9.5, y: 26 }, 1000)]);
        await Promise.all([
          pitch.moveTo(far, { x: 7, y: 14 }, 1400),
          pitch.moveBall({ x: 7.4, y: 13.4 }, 1400),
          pitch.moveTo(stay.el, { x: 8, y: 11 }, 1400),
          pitch.moveTo(marker, { x: 18, y: 24 }, 1400),
          pitch.moveTo(keeper.el, { x: 13.6, y: 1.6 }, 900),
        ]);
      },
      // She was ready, so she gets in the way and the ball goes behind.
      'c8.block': async () => {
        await pitch.moveBall({ x: 7.6, y: 11.6 }, 300, 'ease-in');
        stage.jump([stay.el]);
        await pitch.moveBall({ x: 4, y: -1.4 }, 1000, 'ease-out');
        await wait(hold(700));
      },
      'c8.theirCorner': () => Promise.all([pitch.moveBall({ x: 0.6, y: 0.6 }, 900), pitch.moveTo(far, { x: 2.5, y: 3 }, 900)]),
    });
  }
}
