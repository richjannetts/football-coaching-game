// Chapter 10: our penalty in the last minute, then full time.
// The rule (FA Law 14): the ball goes on the penalty spot and one of us
// takes it. Everyone else, apart from the keepers, waits outside the
// penalty box and at least five yards from the spot. The handbook gives no
// spot distance for 5v5, so the spot is a guess Rich agreed (6 yards,
// 27th November 2026). It is drawn for her, never tested. In our team:
// two friends on the edge of the box, ready for a rebound, and one friend
// back near halfway. She chooses which corner to shoot at, and we score: 2-1
// (3-2 on Difficult if there was an extra goal each). Then
// the final whistle, handshakes, and Coach praises the effort.

import { team, ruleSet, pitchSize } from './content.js';
import { runLineup } from './lineup.js';
import { ruleValue } from '../lib/rules.js';
import { wait, hold } from '../lib/svg.js';

export async function chapter10(stage) {
  const { pitch } = stage;
  const SPOT = { x: 15, y: pitchSize.length - ruleValue(ruleSet, 'penalty.markDistance') };
  const box = pitchSize.penaltyArea;
  const AREA = { x: [15 - box.width / 2, 15 + box.width / 2], y: [pitchSize.length - box.depth, pitchSize.length] };
  const them = stage.addThem(team.opponents.ourPenalty, team.opponentKeeper.ourPenalty);
  const [gk] = them;
  pitch.placeBall({ x: 17.3, y: 35.2 }); // where she was tripped at the end of level 9
  pitch.setRingAt(SPOT);
  pitch.setRing(false);
  stage.setScore(1, 1);

  stage.setBusy(true);
  await stage.play(['c10.intro1', 'c10.intro2', 'c10.intro3'], {
    'c10.intro1': () => wait(hold(1200)),
    'c10.intro2': async () => {
      await pitch.moveBall(SPOT, 800);
      stage.jump([pitch.ball]);
      await wait(hold(1600));
    },
    'c10.intro3': async () => {
      pitch.setRing(true, true);
      await wait(hold(2800));
      pitch.setRing(true, false);
    },
  });
  stage.setBusy(false);

  const solved = await runLineup(stage, {
    kind: 'ourPenalty',
    shapeKey: 'ourPenalty',
    promptIds: ['c10.place', 'place.how', 'place.ready'],
    ball: SPOT,
    area: AREA,
  });
  await solved.spoken;

  const role = (name) => solved.roles.filter((r) => r.role === name);
  const taker = role('taker')[0];
  const rebounds = role('rebound');
  stage.callNames({ runner: taker.el });

  // Where to shoot: either corner of the goal. The goal is small on a
  // phone, so the two choices sit just outside each post, well apart for
  // small fingers, and both score. Nothing to get wrong at the last kick.
  const targets = [
    { kind: 'corner', x: 11, y: 39, side: -1 },
    { kind: 'corner', x: 19, y: 39, side: 1 },
  ];
  await stage.play(['c10.shootAsk']);
  stage.setBusy(false);
  stage.check();
  const pick = await stage.pickTarget(targets, () => {
    stage.setBusy(true);
    return Promise.resolve();
  });
  await pick.done;
  await score(pick.target);
  await fullTime();

  async function score(target) {
    await stage.play(['sfx.kick', 'sfx.goal', 'c10.goal'], {
      'sfx.kick': () =>
        Promise.all([
          pitch.moveBall({ x: 15 + target.side * 2.2, y: 40.9 }, 600, 'ease-in'),
          pitch.moveTo(gk, { x: 15 - target.side * 1.8, y: 39.4 }, 500),
        ]),
      'sfx.goal': () => {
        stage.setScore(2, 1, true);
        stage.goalBanner(true);
        stage.netShake();
        stage.confetti(null, 70);
      },
      'c10.goal': async () => {
        await Promise.all([
          pitch.moveTo(rebounds[0].el, { x: 13.4, y: 33 }, 900),
          pitch.moveTo(rebounds[1].el, { x: 16.6, y: 33 }, 900),
          pitch.moveTo(taker.el, { x: 15, y: 34.6 }, 600),
        ]);
        stage.jump(stage.players.map((p) => p.el));
        await wait(hold(1600));
        stage.goalBanner(false);
      },
    });
  }

  // The final whistle. Both teams line up and shake hands, and Coach
  // praises how hard everyone worked, not who scored.
  async function fullTime() {
    const ours = stage.players.map((p) => p.el);
    // Each replay has its own ending (src/data/replays.json): what happens
    // after the whistle, and what Coach says. The pictures are the same.
    const end = ['', '2', '3'][stage.mode.ending % 3];
    const shake = `c10.handshake${end}`;
    const coach = `c10.coach${end}`;
    await stage.play(['sfx.whistle', 'c10.fullTime', shake, coach], {
      'c10.fullTime': async () => {
        pitch.setRing(false);
        stage.jump(ours);
        await wait(hold(1200));
      },
      [shake]: async () => {
        await Promise.all([
          ...ours.map((el, i) => pitch.moveTo(el, { x: 7 + i * 4, y: 17.4 }, 1600)),
          ...them.map((el, i) => pitch.moveTo(el, { x: 9 + i * 4, y: 22.6 }, 1600)),
          pitch.moveBall({ x: 15, y: 20 }, 1200),
        ]);
        stage.jump([...ours, ...them]);
        await wait(hold(1400));
      },
      [coach]: async () => {
        stage.jump(ours);
        await wait(hold(1600));
      },
    });
  }
}
