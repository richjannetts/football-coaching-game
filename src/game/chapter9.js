// Chapter 9: their corner.
// The rule (FA 5v5): we stay at least five yards from the ball until the
// corner is kicked (the dotted ring is a helper). In our team: keeper in
// goal, a friend by the near post, two friends in our box between their
// players and our goal, and our front player up near halfway. Our keeper
// catches the cross and starts a break. Our front player is tripped in
// their box: a penalty to us, for level 10 (the storyboard Rich agreed,
// 27th November 2026).

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
  stage.setScore(1, 1);

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
  stage.callNames({ mate: guardR.el, runner: up });

  await stage.play(['sfx.whistle', 'sfx.kick', 'c9.cross', 'c9.catch', 'c9.roll', 'c9.up', 'c9.race', 'c9.trip', 'sfx.whistle', 'c9.penalty'], {
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
    // She rolls it out to the friend on the far side, away from their players.
    'c9.roll': () => Promise.all([pitch.moveTo(guardR.el, { x: 25, y: 9 }, 900), pitch.moveBall({ x: 24.6, y: 9.6 }, 1200)]),
    'c9.up': async () => {
      await pitch.moveTo(up, { x: 20, y: 22 }, 700);
      await pitch.moveBall({ x: 20.4, y: 22.6 }, 1100, 'ease-out');
    },
    'c9.race': () => Promise.all([
      pitch.moveTo(up, { x: 17, y: 34.5 }, 1800),
      pitch.moveBall({ x: 17.3, y: 35.2 }, 1800),
      pitch.moveTo(theirBack, { x: 16, y: 33.6 }, 1800),
      pitch.moveTo(guardL.el, { x: 9, y: 16 }, 1800),
      pitch.moveTo(gk, { x: 15.5, y: 37.5 }, 1200),
    ]),
    'c9.trip': async () => {
      await pitch.moveTo(theirBack, { x: 16.8, y: 34.6 }, 400);
      stage.jump([up]);
      await wait(hold(900));
    },
    'c9.penalty': () => wait(hold(900)),
  });
}
