// A Training night mini-game (Rich's choice, 28th November 2026): a few
// short puzzles on the match pitch. In each one she moves one player, taps
// the tick, and the move plays out: a pass, a shot, an interception or a
// save.
// The puzzles are data, in src/data/training.json. The checks are in
// src/lib/drillChecks.js: anywhere that does the job counts.
//
// Help steps up, like the match levels: a first wrong try gives a gentle
// nudge (which player to think about), the second also flashes a good
// place, and the third time we do it together. No timer, no score.

import { wait, hold } from '../lib/svg.js';
import { nearestSpot } from '../lib/geometry.js';
import { checkDrill, scenePositions } from '../lib/drillChecks.js';

const pt = ([x, y]) => ({ x, y });
const OUR_BALL = new Set(['pass', 'shoot', 'dribble', 'cover']);
const CARRY = new Set(['shoot', 'dribble']); // she moves with the ball

// Which of our squad plays each part: 'you' is her own player, 'mate',
// 'mate2' and 'mate3' her friends who are not the marked keeper.
function cast(squad) {
  const you = squad.findIndex((p) => p.you);
  const friends = squad.map((p, i) => (!p.you && !p.keeper ? i : -1)).filter((i) => i >= 0);
  return { you, mate: friends[0], mate2: friends[1], mate3: friends[2] };
}

export async function runDrill(stage, drill, squad) {
  const { pitch } = stage;
  const parts = cast(squad);
  const used = new Set();
  // Everyone else sits this one out: hidden, and can't be picked up.
  stage.players.forEach((p) => {
    p.locked = true;
    p.el.style.display = 'none';
  });
  // In goalkeeping, every girl gets a turn in goal (the FA advice):
  // tonight it is her own player, in the keeper top.
  if (drill.keeper) stage.players.forEach((p, i) => (p.keeper = i === parts[drill.keeper]));
  pitch.showSpots([]);
  pitch.setRing(false); // no helper ring: this is not a kick-off

  const spotAt = (p) => nearestSpot(p, stage.spots).id;
  const indexOf = (part) => parts[part];

  for (const [n, scene] of drill.scenes.entries()) {
    // A puzzle can be a different kind from the rest of its mini-game
    // (Play it out has passes, then covering the goal), with its own lines.
    const d = { ...drill, kind: scene.kind || drill.kind };
    for (const key of ['show', 'together', 'right']) if (scene[key]) d[key] = scene[key];
    // Set out the puzzle.
    stage.setBusy(true);
    for (const t of stage.them) t.remove();
    stage.addThem(scene.them, scene.theirKeeper ?? -1);
    // Usually she moves one player. In Press she can move any of them,
    // and has to choose the right one.
    const movable = scene.movable || [scene.move];
    for (const [part, at] of Object.entries(scene.us)) {
      const i = indexOf(part);
      used.add(i);
      const p = stage.players[i];
      p.el.style.display = '';
      p.locked = !movable.includes(part);
      await stage.placement.moveTo(i, spotAt(pt(at)), n === 0 ? 0 : 700);
    }
    stage.placement.refresh();
    const start = posOf(movable);
    // The ball starts with her player when we have it, otherwise with
    // their first player.
    // In Tackle each of their players has a ball, and the real one is the
    // ball that has got away from her feet.
    const ballAt = OUR_BALL.has(d.kind) ? pt(scene.us.you) : pt(scene.them[0]);
    const feet = scene.balls ? pt(scene.balls[scene.loose]) : { x: ballAt.x + 0.7, y: ballAt.y + 0.4 };
    if (n === 0) pitch.placeBall(feet);
    else await pitch.moveBall(feet, 500);
    // Save it: an arrow shows where their shot is going.
    if (scene.target) pitch.showArrow(ballAt, pt(scene.target));
    if (scene.balls) pitch.showExtraBalls(scene.balls.filter((_, i) => i !== scene.loose).map(pt));

    const mover = stage.players[indexOf(scene.move)];
    stage.callNames({ mate: stage.players[parts.mate]?.el });
    await stage.play([...(n === 0 ? drill.intro : ['tr.next']), ...scene.say], {
      [scene.say[0]]: () => stage.jump([mover.el]),
    });
    // Shoot: the ball stays at her feet wherever she moves.
    const carrying = CARRY.has(d.kind) && scene.move === 'you';
    if (carrying) stage.afterChange = () => pitch.moveBall({ x: mover.el._pos.x + 0.7, y: mover.el._pos.y + 0.4 }, 300);
    await solve(d, scene, mover, ballAt, start);
    stage.afterChange = null;
    pitch.clear('arrow');
  }
  return { used: [...used] };

  // Where some of our players are now, by part.
  function posOf(list) {
    return Object.fromEntries(list.map((part) => [part, { ...stage.players[indexOf(part)].el._pos }]));
  }

  // One puzzle: wait for the tick, check, and help if it isn't right yet.
  async function solve(d, scene, mover, ballAt, start) {
    let wrong = 0;
    for (;;) {
      stage.check();
      stage.setBusy(false);
      stage.placement.enable();
      stage.showReady(true);
      stage.glowReady(true);
      await new Promise((resolve) => (stage.onReady = resolve));
      stage.onReady = null;
      stage.setBusy(true);
      stage.showReady(false);
      const live = { start, now: posOf(Object.keys(start)) };
      const result = checkDrill(d.kind, scenePositions(d.kind, scene, mover.el._pos, live));
      if (result.ok) return playOut(d, scene, mover, ballAt, start);
      wrong += 1;
      if (wrong >= 3) {
        // Do it together: she watches her player walk to a good place.
        await stage.play(['sfx.whistle', d.together], {
          [d.together]: () => stage.placement.moveTo(indexOf(scene.move), spotAt(pt(scene.ideal)), 1200),
        });
        return playOut(d, scene, mover, ballAt, start);
      }
      // The nudge says which player to think about, and that player hops.
      const nudge = d.nudge[result.why] || Object.values(d.nudge)[0];
      const hopper = result.who != null ? stage.them[result.who] : d.kind === 'intercept' && result.why === 'offLine' ? null : mover.el;
      const lines = ['sfx.whistle', nudge, ...(wrong === 2 ? [d.show] : []), 'hint.tryAgain'];
      await stage.play(lines, {
        [nudge]: () => stage.jump(hopper ? [hopper] : stage.them.slice(0, 2)),
        ...(wrong === 2 ? { [d.show]: () => pitch.flashSpots([pt(scene.ideal)], 2600) } : {}),
      });
    }
  }

  // The move plays out, so she sees why it was right.
  async function playOut(d, scene, mover, ballAt, start) {
    const to = mover.el._pos;
    const cues = {};
    if (d.kind === 'pass') {
      cues[d.right[0]] = async () => {
        pitch.showArrow(ballAt, to);
        await wait(hold(500));
        await pitch.moveBall({ x: to.x + 0.6, y: to.y + 0.4 }, 900);
        pitch.clear('arrow');
        stage.jump([mover.el]);
      };
    } else if (d.kind === 'shoot') {
      // She dribbles to her place, then shoots past their keeper, into the
      // side of the goal away from their keeper.
      cues[d.right[0]] = async () => {
        await pitch.moveBall({ x: to.x + 0.6, y: to.y + 0.4 }, 700);
        const keeper = scene.theirKeeper != null ? scene.them[scene.theirKeeper][0] : 15;
        await pitch.moveBall({ x: keeper >= 15 ? 13.8 : 16.2, y: 40.3 }, 700, 'ease-in');
        stage.netShake();
        stage.jump([mover.el]);
      };
    } else if (d.kind === 'dribble') {
      // The path she dribbled, from where she started.
      cues[d.right[0]] = async () => {
        pitch.showArrow(start[scene.move], to);
        await wait(hold(900));
        pitch.clear('arrow');
        stage.jump([mover.el]);
      };
    } else if (d.kind === 'press') {
      // She gets there quickly, so their player loses the ball to her.
      cues[d.right[0]] = async () => {
        await pitch.moveBall({ x: to.x + 0.6, y: to.y + 0.4 }, 700);
        stage.jump([mover.el]);
      };
    } else if (d.kind === 'tackle') {
      // She steps in and takes the ball while it is away from her feet.
      cues[d.right[0]] = async () => {
        await pitch.moveBall({ x: to.x + 0.6, y: to.y + 0.4 }, 600);
        stage.jump([mover.el]);
      };
    } else if (d.kind === 'cover') {
      // Our keeper is out with the ball, and our goal is safe behind her.
      cues[d.right[0]] = async () => {
        stage.jump([mover.el, stage.players[indexOf('you')].el]);
      };
    } else if (d.kind === 'intercept') {
      cues[d.right[0]] = async () => {
        await pitch.moveBall({ x: to.x, y: to.y + 0.5 }, 1000, 'ease-in');
        stage.jump([mover.el]);
      };
    } else {
      // Get in line and Save it: she is in the way, so the shot comes
      // straight to her.
      cues[d.right[0]] = async () => {
        await pitch.moveBall({ x: to.x, y: to.y + 0.3 }, 700, 'ease-in');
        stage.jump([mover.el]);
      };
    }
    stage.confetti(mover.el, 24);
    await stage.play(['sfx.cheer', ...d.right], cues);
    await wait(hold(400));
  }
}

