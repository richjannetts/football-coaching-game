// What a wrong try can cost on Difficult (Rich, 27th November 2026), told
// kindly. Only their players and the ball move: ours stay where she put
// them, so she can see what to fix. Then everyone goes back and she tries
// again. Never on Easy or Medium, and a grown-up can switch it off.
//   'possession': at our restart, they nip in and win the ball.
//   'save': at theirs, they get through and shoot, just wide.
//   'goal': at theirs, they score (one goal at most in a match).

import { wait, hold } from '../lib/svg.js';

const LINES = {
  possession: 'lose.possession',
  save: 'lose.wide',
  goal: 'lose.goal',
};

export async function playConsequence(stage, type) {
  const { pitch } = stage;
  const ball = pitch.ball;
  const start = { x: ball._pos.x, y: ball._pos.y };
  const them = stage.them.filter((el) => !el.classList.contains('is-their-keeper'));
  const back = stage.them.map((el) => ({ el, at: { ...el._pos } }));
  if (!them.length) return stage.play(['sfx.whistle', LINES[type]]);
  // Their nearest outfield player gets to the ball.
  const runner = them.reduce((a, b) => (pitch.distance(b._pos, start) < pitch.distance(a._pos, start) ? b : a));
  const towards = (y) => ({ x: start.x + (15 - start.x) * 0.5, y });

  const cues = {
    possession: async () => {
      await pitch.moveTo(runner, { x: start.x, y: start.y + 0.8 }, 700);
      stage.jump([runner]);
      const to = towards(Math.max(4, start.y - 7));
      await Promise.all([pitch.moveTo(runner, { x: to.x, y: to.y + 0.8 }, 1200), pitch.moveBall(to, 1200)]);
      await wait(hold(900));
    },
    save: async () => {
      await run();
      await pitch.moveBall({ x: 19.5, y: -1.5 }, 700, 'ease-in');
      await wait(hold(900));
    },
    goal: async () => {
      await run();
      await pitch.moveBall({ x: 14.2, y: -1.2 }, 600, 'ease-in');
      stage.netShake();
      stage.addGoal('them');
      await wait(hold(1200));
    },
  };
  // Their player runs at our goal with the ball.
  async function run() {
    await pitch.moveTo(runner, { x: start.x, y: start.y + 0.8 }, 600);
    const shotFrom = { x: 15 + (start.x < 15 ? -3 : 3), y: 9 };
    await Promise.all([pitch.moveTo(runner, { x: shotFrom.x, y: shotFrom.y + 0.8 }, 1500), pitch.moveBall(shotFrom, 1500)]);
  }

  stage.setBusy(true);
  stage.showReady(false);
  await stage.play(['sfx.whistle', LINES[type]], { [LINES[type]]: cues[type] });
  // Everyone back to where they were, for another go.
  await Promise.all([...back.map(({ el, at }) => pitch.moveTo(el, at, 700)), pitch.moveBall(start, 700)]);
  await stage.play(['lose.again']);
}
