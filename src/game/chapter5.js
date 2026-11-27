// Chapter 5: our kick-in.
// The rule (FA pass-in or dribble-in): the ball sits still on the side line
// where it went out, one of us takes it, and they stand five yards away. In
// our team: a friend close for a short pass and a friend inside, with our
// back player staying back. Choose the pass, then watch the move. Their
// keeper saves, they break, our back player tackles and it goes off the
// side: their kick-in, for level 6.

import { team } from './content.js';
import { runLineup } from './lineup.js';
import { wait, motion, hold } from '../lib/svg.js';

const BALL = { x: 0.4, y: 24.5 }; // on the left side line, where it went out

export async function chapter5(stage) {
  const { pitch } = stage;
  const them = stage.addThem(team.opponents.ourKickIn, team.opponentKeeper.ourKickIn);
  const [gk, marker, , , far] = them;
  pitch.placeBall({ x: -1.6, y: 24.5 });
  pitch.setRingAt(BALL);
  pitch.setRing(false);
  stage.setScore(1, 0);

  stage.setBusy(true);
  await stage.play(['c5.intro1', 'c5.intro2', 'c5.intro3'], {
    'c5.intro1': () => pitch.moveBall(BALL, 900, 'ease-out'),
    'c5.intro2': async () => {
      stage.jump([pitch.ball]);
      await wait(hold(2400));
    },
    'c5.intro3': async () => {
      pitch.setRing(true, true);
      await wait(hold(2600));
      pitch.setRing(true, false);
    },
  });
  stage.setBusy(false);

  const solved = await runLineup(stage, {
    kind: 'ourKickIn',
    shapeKey: 'ourKickIn',
    promptIds: ['c5.place', 'place.how', 'place.ready'],
    ball: BALL,
  });
  await solved.spoken;

  const role = (name) => solved.roles.filter((r) => r.role === name)[0];
  const taker = role('taker');
  const close = role('close');
  const inside = role('inside');
  const back = role('back');
  const keeper = role('keeper');

  const targets = [
    { kind: 'friend', x: close.x, y: close.y, role: close },
    { kind: 'friend', x: inside.x, y: inside.y, role: inside },
    { kind: 'them', x: 5, y: 27.5 },
  ];
  await stage.play(['c5.passAsk']);
  stage.setBusy(false);

  let wrong = 0;
  for (;;) {
    stage.check();
    if (wrong >= 3) {
      stage.setBusy(true);
      stage.callNames({ mate: close.el });
      await Promise.all([stage.play(['sfx.kick', 'c5.passTogether']), passTo(close)]);
      await playOut(close);
      return;
    }
    const choices = wrong >= 2 ? targets.filter((t) => t.kind === 'friend') : targets;
    const pick = await stage.pickTarget(choices, (t) => {
      stage.setBusy(true);
      if (t.kind === 'friend') stage.callNames({ mate: t.role.el });
      if (t.kind === 'friend') return stage.play(['sfx.kick', 'c5.passGood'], { 'c5.passGood': () => passTo(t.role) });
      wrong++;
      const next = wrong >= 3 ? [] : wrong === 2 ? ['c5.passShow'] : ['hint.tryAgain'];
      return stage.play(['sfx.whistle', 'c5.passThem', ...next], {}, { remember: wrong === 2 });
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

  // A pass straight to their player, who was waiting five steps away.
  async function toThem() {
    await pitch.moveBall({ x: 4.6, y: 27 }, 700, 'ease-out');
    stage.jump([marker]);
    const cross = pitch.showCross({ x: 4.6, y: 27 });
    await wait(hold(1600));
    cross.remove();
    await pitch.moveBall(BALL, 700);
  }

  async function playOut(first) {
    const other = first === close ? inside : close;
    stage.callNames({ runner: other.el, defender: back.el });
    await stage.play(['c5.move1', 'c5.shot', 'sfx.kick', 'c5.save', 'c5.break', 'c5.tackle', 'c5.theirKick'], {
      'c5.move1': async () => {
        await Promise.all([pitch.moveTo(taker.el, { x: 5, y: 26 }, 900), pitch.moveTo(other.el, { x: 14, y: 29 }, 900)]);
        await pitch.moveBall({ x: 14.4, y: 29.6 }, 700);
        await Promise.all([
          pitch.moveTo(other.el, { x: 16, y: 32 }, 1100),
          pitch.moveBall({ x: 16.3, y: 32.8 }, 1100),
          pitch.moveTo(first.el, { x: 11, y: 30 }, 1100),
          pitch.moveTo(back.el, { x: 15, y: 17 }, 1200),
        ]);
      },
      'c5.shot': () => wait(motion(300)),
      'sfx.kick': () => Promise.all([pitch.moveBall({ x: 16.4, y: 38.2 }, 600, 'ease-in'), pitch.moveTo(gk, { x: 16.4, y: 38.8 }, 500)]),
      'c5.save': () => stage.jump([gk]),
      // Their keeper kicks it long and their player races down our right.
      'c5.break': async () => {
        await pitch.moveBall({ x: 24, y: 22 }, 1000, 'ease-out');
        await Promise.all([pitch.moveTo(far, { x: 26, y: 15.5 }, 1300), pitch.moveBall({ x: 26.4, y: 14.8 }, 1300), pitch.moveTo(back.el, { x: 24, y: 13 }, 1300), pitch.moveTo(keeper.el, { x: 17, y: 1.6 }, 900)]);
      },
      'c5.tackle': async () => {
        await Promise.all([pitch.moveTo(back.el, { x: 26.6, y: 13.6 }, 400), pitch.moveBall({ x: 30.8, y: 14 }, 800, 'ease-out')]);
        stage.jump([back.el]);
        await wait(hold(900));
      },
      'c5.theirKick': () => pitch.moveBall({ x: 29.6, y: 14 }, 700),
    });
  }
}
