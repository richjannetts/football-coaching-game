// Chapter 6: their kick-in.
// The rule: we stay at least five yards from the ball (the dotted ring is
// a helper). In our team: stand between your player and our goal, with our
// back player in the middle. We defend it well, but just before half-time
// they score a great shot. That goal is part of the story (the storyboard
// Rich agreed, 27th November 2026). It happens whatever she does, so it
// never punishes an answer.

import { team } from './content.js';
import { runLineup } from './lineup.js';
import { wait, motion, hold } from '../lib/svg.js';

const BALL = { x: 29.6, y: 14 }; // on the right side line, in our half

export async function chapter6(stage) {
  const { pitch } = stage;
  const them = stage.addThem(team.opponents.theirKickIn, team.opponentKeeper.theirKickIn);
  const [, taker, downLine, upLine, insider] = them;
  pitch.placeBall(BALL);
  pitch.setRingAt(BALL);
  pitch.setRing(true);
  stage.setScore(1, 0);

  stage.setBusy(true);
  await stage.play(['c6.intro1', 'c6.intro2'], {
    'c6.intro1': async () => {
      taker.classList.add('is-glow');
      await wait(hold(2200));
      taker.classList.remove('is-glow');
    },
    'c6.intro2': async () => {
      pitch.setRing(true, true);
      await wait(hold(2800));
      pitch.setRing(true, false);
    },
  });
  stage.setBusy(false);

  const solved = await runLineup(stage, {
    kind: 'theirKickIn',
    shapeKey: 'theirKickIn',
    promptIds: ['c6.place', 'place.how', 'place.ready'],
    ball: BALL,
  });
  await solved.spoken;
  stage.setBusy(true);

  const role = (name) => solved.roles.filter((r) => r.role === name)[0].el;
  const inside = role('inside');
  const up = role('up');
  const back = role('back');
  const keeper = role('keeper');

  await stage.play(['sfx.whistle', 'c6.kick', 'c6.defend', 'c6.clear', 'c6.shot', 'sfx.kick', 'c6.theirGoal', 'c6.headsUp', 'sfx.whistle', 'c6.halfTime'], {
    'c6.kick': () => Promise.all([pitch.moveBall({ x: 18, y: 17 }, 900), pitch.moveTo(taker, { x: 27, y: 15 }, 900)]),
    // Our friend was standing goal side, so she steps in and wins it.
    'c6.defend': async () => {
      await Promise.all([pitch.moveTo(inside, { x: 17.2, y: 16.2 }, 600), pitch.moveTo(insider, { x: 18.5, y: 18.5 }, 600)]);
      stage.jump([inside]);
      await wait(hold(900));
    },
    'c6.clear': async () => {
      pitch.setRing(false);
      await Promise.all([pitch.moveBall({ x: 11, y: 27 }, 1200, 'ease-out'), pitch.moveTo(up, { x: 18, y: 23 }, 1200), pitch.moveTo(back, { x: 15, y: 11 }, 1200)]);
    },
    // Their player picks it up far out and shoots.
    'c6.shot': () => Promise.all([pitch.moveTo(upLine, { x: 12, y: 26 }, 1000), pitch.moveTo(downLine, { x: 22, y: 14 }, 1200), wait(motion(1000))]),
    'sfx.kick': () => Promise.all([pitch.moveBall({ x: 13.4, y: -0.6 }, 900, 'ease-in'), pitch.moveTo(keeper, { x: 13.6, y: 1.3 }, 700)]),
    'c6.theirGoal': async () => {
      stage.setScore(1, 1, true);
      await wait(hold(1200));
    },
    'c6.headsUp': () => stage.jump(stage.players.map((p) => p.el)),
    'c6.halfTime': () => wait(hold(800)),
  });
}
