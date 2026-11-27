// Chapter 7: half-time, then their centre kick to start the second half.
// The half-time team talk is told on the pitch (drinks, a kind word to a
// team-mate), then they kick off. Who kicks off the second half is told,
// never tested (not confirmed for 5v5). The puzzle repeats level 2's
// defending shape as a reminder. We win it back, and their defender
// blocks our shot behind: a corner for us, for level 8.

import { team } from './content.js';
import { runLineup } from './lineup.js';
import { wait, motion, hold } from '../lib/svg.js';

export async function chapter7(stage) {
  const { pitch } = stage;
  const them = stage.addThem(team.opponents.theirCentreKick, team.opponentKeeper.theirCentreKick);
  const [kicker, theirL, theirR, theirBack, gk] = them;
  pitch.placeBall(pitch.centre);
  pitch.setRing(true);
  stage.startScore();

  stage.setBusy(true);
  await stage.play(['sfx.whistle', 'c7.intro1', 'c7.intro2', 'c7.intro3'], {
    'c7.intro1': () => stage.jump(stage.players.map((p) => p.el)),
    'c7.intro2': async () => {
      stage.jump(stage.players.map((p) => p.el));
      await wait(hold(1500));
    },
    'c7.intro3': async () => {
      kicker.classList.add('is-glow');
      await wait(hold(2000));
      kicker.classList.remove('is-glow');
    },
  });
  stage.setBusy(false);

  const solved = await runLineup(stage, {
    kind: 'theirs',
    shapeKey: 'theirCentreKick',
    promptIds: ['c7.place', 'place.how', 'place.ready'],
    coachIds: ['coach.c7'],
  });
  await solved.spoken;
  stage.setBusy(true);

  const role = (name) => solved.roles.filter((r) => r.role === name);
  const up = role('up')[0].el;
  const [midL, midR] = role('middle').sort((a, b) => a.x - b.x).map((r) => r.el);
  const back = role('back')[0].el;

  await stage.play(['sfx.whistle', 'sfx.kick', 'c7.kick', 'c7.win', 'c7.attack', 'sfx.kick', 'c7.block', ...stage.linked(8, 'c7.corner')], {
    'c7.kick': async () => {
      await pitch.moveBall({ x: 20.4, y: 22 }, 800);
      await Promise.all([pitch.moveTo(theirR, { x: 21.5, y: 19 }, 1200), pitch.moveBall({ x: 21.6, y: 18.4 }, 1200), pitch.moveTo(up, { x: 18.5, y: 17 }, 1100)]);
    },
    // Our friend on that side was ready, so she nips in and wins it.
    'c7.win': async () => {
      await Promise.all([pitch.moveTo(midR, { x: 22, y: 17.4 }, 600), pitch.moveBall({ x: 22.3, y: 17 }, 600)]);
      stage.jump([midR]);
      await wait(hold(700));
    },
    'c7.attack': async () => {
      await Promise.all([
        pitch.moveTo(midR, { x: 23, y: 25 }, 1400),
        pitch.moveBall({ x: 23.3, y: 25.6 }, 1400),
        pitch.moveTo(up, { x: 16, y: 28 }, 1400),
        pitch.moveTo(midL, { x: 10, y: 27 }, 1400),
        pitch.moveTo(back, { x: 15, y: 15 }, 1400),
        pitch.moveTo(kicker, { x: 17, y: 22 }, 1200),
      ]);
      await Promise.all([pitch.moveBall({ x: 16.3, y: 28.6 }, 700), pitch.moveTo(theirBack, { x: 16, y: 32 }, 800)]);
      await wait(motion(200));
    },
    'sfx.kick': () => pitch.moveBall({ x: 16.2, y: 31.4 }, 300, 'ease-in'),
    'c7.block': async () => {
      stage.jump([theirBack]);
      await Promise.all([pitch.moveBall({ x: 24, y: 41.4 }, 1000, 'ease-out'), pitch.moveTo(gk, { x: 17, y: 38.6 }, 700)]);
      await wait(hold(800));
    },
    'c7.corner': () => Promise.all([pitch.moveBall({ x: 29.4, y: 39.6 }, 900), pitch.moveTo(theirL, { x: 12, y: 30 }, 900)]),
  });
}
