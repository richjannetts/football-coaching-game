// Chapter 9: their corner.
// The rule (FA 5v5): we stay at least five yards from the ball until the
// corner is kicked (the dotted ring is a helper). In our team: keeper in
// goal, a friend by the near post, two friends in our box between their
// players and our goal, and our front player up near halfway. Our keeper
// catches the cross, puts the ball down, dribbles out and passes up to our
// front player (Rich, 28th November 2026: keep the keeper in the game). Our front player is tripped in
// their box: a penalty to us, for level 10 (the storyboard Rich agreed,
// 27th November 2026). In a cup round where this moment scores instead
// (levels.json), she runs on and scores on the break.

import { team } from './content.js';
import { runLineup } from './lineup.js';
import { wait, hold } from '../lib/svg.js';

const BALL = { x: 0.4, y: 0.4 }; // in the left-hand corner, by our goal

export async function chapter9(stage) {
  const { pitch } = stage;
  const them = stage.addThem(team.opponents.theirCorner, team.opponentKeeper.theirCorner);
  const [gk, taker, attackerL, attackerR, theirBack] = them;
  pitch.placeBall(BALL);
  pitch.setRingAt(BALL);
  pitch.setRing(true);
  stage.startScore();

  stage.setBusy(true);
  await stage.play(['c9.intro1', 'c9.intro2'], {
    'c9.intro1': async () => {
      taker.classList.add('is-glow');
      await wait(hold(2200));
      taker.classList.remove('is-glow');
    },
    'c9.intro2': async () => {
      pitch.setRing(true, true);
      await wait(hold(2800));
      pitch.setRing(true, false);
    },
  });
  stage.setBusy(false);

  const solved = await runLineup(stage, {
    kind: 'theirCorner',
    shapeKey: 'theirCorner',
    promptIds: ['c9.place', 'place.how', 'place.ready'],
    coachIds: ['coach.c9'],
    ball: BALL,
  });
  await solved.spoken;
  stage.setBusy(true);

  const role = (name) => solved.roles.filter((r) => r.role === name);
  const keeper = role('keeper')[0];
  const [guardL, guardR] = role('guard').sort((a, b) => a.x - b.x);
  const up = role('up')[0].el;
  stage.callNames({ keeper: keeper.el, runner: up });

  // In a round where this moment scores (the semi-final), she runs on and
  // scores on the break. Where the penalty comes next (the final), she is
  // tripped: a penalty to us.
  const scores = stage.mode.goal === 'us';
  const ending = scores ? ['c9.shoot', 'sfx.goal', 'c9.goal'] : ['c9.trip', 'sfx.whistle', ...stage.linked(10, 'c9.penalty')];
  await stage.play(['sfx.whistle', 'sfx.kick', 'c9.cross', 'c9.catch', 'c9.roll', 'c9.up', 'c9.race', ...ending], {
    'sfx.kick': () => pitch.setRing(false),
    'c9.cross': () => Promise.all([
      pitch.moveBall({ x: 11, y: 3.6 }, 1300, 'ease-out'),
      pitch.moveTo(attackerL, { x: 12, y: 5 }, 1200),
      pitch.moveTo(attackerR, { x: 16, y: 6 }, 1200),
      pitch.moveTo(keeper.el, { x: 11.4, y: 3 }, 1100),
    ]),
    'c9.catch': async () => {
      stage.jump([keeper.el]);
      await wait(hold(1200));
    },
    // She puts the ball down and dribbles out, away from their players,
    // into the space. A friend moves wide to help.
    'c9.roll': () => Promise.all([
      pitch.moveTo(keeper.el, { x: 18.5, y: 11.5 }, 2200),
      pitch.moveBall({ x: 18.8, y: 12.1 }, 2200),
      pitch.moveTo(attackerR, { x: 16.5, y: 9 }, 2000),
      pitch.moveTo(guardR.el, { x: 25, y: 12 }, 1800),
    ]),
    'c9.up': async () => {
      await pitch.moveTo(up, { x: 20, y: 22 }, 700);
      await pitch.moveBall({ x: 20.4, y: 22.6 }, 1100, 'ease-out');
    },
    'c9.race': () => Promise.all([
      pitch.moveTo(up, { x: 17, y: 34.5 }, 1800),
      pitch.moveBall({ x: 17.3, y: 35.2 }, 1800),
      pitch.moveTo(theirBack, { x: 16, y: 33.6 }, 1800),
      pitch.moveTo(guardL.el, { x: 9, y: 16 }, 1800),
      pitch.moveTo(keeper.el, { x: 15, y: 1.5 }, 1800),
      pitch.moveTo(gk, { x: 15.5, y: 37.5 }, 1200),
    ]),
    'c9.trip': async () => {
      await pitch.moveTo(theirBack, { x: 16.8, y: 34.6 }, 400);
      stage.jump([up]);
      await wait(hold(900));
    },
    'c9.penalty': () => wait(hold(900)),
    'c9.shoot': async () => {
      await Promise.all([pitch.moveTo(up, { x: 15.6, y: 36.4 }, 600), pitch.moveTo(theirBack, { x: 18.5, y: 33 }, 600), pitch.moveBall({ x: 15.8, y: 37 }, 600)]);
      await Promise.all([pitch.moveBall({ x: 13.4, y: 40.9 }, 500, 'ease-in'), pitch.moveTo(gk, { x: 17, y: 38.6 }, 500)]);
    },
    'sfx.goal': () => {
      stage.storyGoal('us');
      stage.goalBanner(true);
      stage.netShake();
      stage.confetti(null, 70);
      stage.jump(stage.players.map((p) => p.el));
    },
    'c9.goal': async () => {
      await wait(hold(2000));
      stage.goalBanner(false);
    },
  });
}
