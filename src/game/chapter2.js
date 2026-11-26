// Chapter 2: their centre kick.
// Line up to defend: everyone in our half, five yards from the ball, in our
// defending shape. Then watch their kick, our front player closing down and
// us defending as a team. Their shot goes wide: our goal kick, for chapter 3.

import { team } from './content.js';
import { runLineup } from './lineup.js';
import { wait, motion, hold } from '../lib/svg.js';

export async function chapter2(stage) {
  const { pitch } = stage;
  const them = stage.addThem(team.opponents.theirCentreKick);
  const [kicker, theirL, theirR] = them;
  pitch.placeBall(pitch.centre);
  pitch.setRing(true);

  stage.setBusy(true);
  await stage.play(['c2.intro1', 'c2.intro2', 'ring.helper'], {
    'c2.intro1': () => stage.jump(them),
    'c2.intro2': async () => {
      kicker.classList.add('is-glow');
      await wait(hold(2500));
      kicker.classList.remove('is-glow');
    },
    'ring.helper': async () => {
      pitch.setRing(true, true);
      await wait(hold(3000));
      pitch.setRing(true, false);
    },
  });
  stage.setBusy(false);

  const solved = await runLineup(stage, {
    kind: 'theirs',
    shapeKey: 'theirCentreKick',
    promptIds: ['c2.place', 'place.how', 'place.ready'],
  });
  await solved.spoken;
  stage.setBusy(true);

  const role = (name) => solved.roles.filter((r) => r.role === name);
  const up = role('up')[0].el;
  const [midL, midR] = role('middle').sort((a, b) => a.x - b.x).map((r) => r.el);
  const back = role('back')[0].el;
  const keeper = role('keeper')[0].el;

  await stage.play(['sfx.whistle', 'c2.kick', 'c2.close', 'c2.defend', 'c2.out', 'c2.goalKick'], {
    'c2.kick': () =>
      Promise.all([pitch.moveBall({ x: 9.4, y: 22 }, 800), pitch.moveTo(theirR, { x: 23, y: 18 }, 2200), pitch.moveTo(kicker, { x: 14, y: 22 }, 1500)]),
    'c2.close': async () => {
      const run = pitch.moveTo(up, { x: 11, y: 20 }, 1100);
      await wait(motion(500));
      // Our front player is closing in, so they have to pass it away.
      await pitch.moveBall({ x: 22.6, y: 17.2 }, 800);
      await run;
    },
    'c2.defend': () =>
      Promise.all([
        pitch.moveTo(theirR, { x: 25, y: 8 }, 1700),
        pitch.moveBall({ x: 24.8, y: 7.2 }, 1700),
        pitch.moveTo(midR, { x: 23.2, y: 8.6 }, 1500),
        pitch.moveTo(back, { x: 18.5, y: 5.5 }, 1500),
        pitch.moveTo(midL, { x: 13, y: 9 }, 1500),
        pitch.moveTo(up, { x: 16, y: 13 }, 1700),
        pitch.moveTo(keeper, { x: 16.4, y: 1.4 }, 1200),
        pitch.moveTo(theirL, { x: 15, y: 15 }, 1700),
      ]),
    'c2.out': async () => {
      await pitch.moveBall({ x: 23, y: -1.6 }, 800, 'ease-out');
      pitch.svg.classList.add('flash-goal-line');
      await wait(hold(1500));
      pitch.svg.classList.remove('flash-goal-line');
    },
    'c2.goalKick': () => Promise.all([pitch.moveTo(keeper, { x: 21.5, y: -0.4 }, 1200), pitch.moveTo(theirR, { x: 23, y: 14 }, 1400)]),
  });
}
