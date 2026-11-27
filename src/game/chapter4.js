// Chapter 4: their goal kick.
// The rule: we all go back into our own half until the ball is kicked (the
// retreat line). Coach's words: "Back, wait, GO." Line up behind the halfway
// line, wait for their keeper's pass, then close them down together. The
// ball goes off the side, so it is our kick-in (a later level).

import { team } from './content.js';
import { runLineup } from './lineup.js';
import { wait, motion, hold } from '../lib/svg.js';

export async function chapter4(stage) {
  const { pitch } = stage;
  const them = stage.addThem(team.opponents.theirGoalKick, team.opponentKeeper.theirGoalKick);
  const [gk, wideL] = them;
  pitch.placeBall({ x: 15, y: 37.4 });
  pitch.setRing(false);
  stage.setScore(1, 0);

  stage.setBusy(true);
  await stage.play(['c4.intro1', 'c4.intro2', 'c4.intro3'], {
    'c4.intro1': async () => {
      gk.classList.add('is-glow');
      await wait(hold(2200));
      gk.classList.remove('is-glow');
    },
    'c4.intro2': async () => {
      pitch.setRetreat(true);
      await wait(hold(2400));
    },
    'c4.intro3': () => stage.jump(stage.players.map((p) => p.el)),
  });
  stage.setBusy(false);

  // The puzzle. The glowing halfway line stays on as a helper.
  const solved = await runLineup(stage, {
    kind: 'theirGoalKick',
    shapeKey: 'theirGoalKick',
    promptIds: ['c4.place', 'place.how', 'place.ready'],
    coachIds: ['coach.c4'],
  });
  await solved.spoken;
  stage.setBusy(true);

  const role = (name) => solved.roles.filter((r) => r.role === name);
  const up = role('up')[0].el;
  const [midL, midR] = role('middle').sort((a, b) => a.x - b.x).map((r) => r.el);
  const back = role('back')[0].el;

  await stage.play(['sfx.whistle', 'c4.wait', 'c4.go', 'c4.win', 'c4.out'], {
    // Everyone stays behind the line while their keeper passes it out.
    'c4.wait': async () => {
      await wait(motion(500));
      await pitch.moveBall({ x: 4.2, y: 31.6 }, 1100);
      await wait(hold(500));
    },
    'c4.go': async () => {
      pitch.setRetreat(false);
      await Promise.all([
        pitch.moveTo(wideL, { x: 5, y: 27 }, 1600),
        pitch.moveBall({ x: 5.5, y: 26.3 }, 1600),
        pitch.moveTo(up, { x: 8, y: 27.5 }, 1500),
        pitch.moveTo(midL, { x: 5.5, y: 23.5 }, 1500),
        pitch.moveTo(midR, { x: 16, y: 21 }, 1600),
        pitch.moveTo(back, { x: 13, y: 12 }, 1600),
      ]);
    },
    'c4.win': async () => {
      await Promise.all([pitch.moveTo(midL, { x: 5, y: 25.4 }, 600), pitch.moveBall({ x: 5.2, y: 25 }, 600)]);
      stage.jump([midL, up]);
      await wait(hold(1200));
    },
    'c4.out': async () => {
      await pitch.moveTo(wideL, { x: 4.6, y: 25.6 }, 400);
      await pitch.moveBall({ x: -1.6, y: 24.5 }, 900, 'ease-out');
      await wait(hold(1200));
    },
  });
}
