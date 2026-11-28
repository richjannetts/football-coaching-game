// A Training night mini-game (Rich's choice, 28th November 2026): a few
// short puzzles on the match pitch. In each one she moves one player, taps
// the tick, and the move plays out: a pass, an interception or a save.
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

// Which of our squad plays each part: 'you' is her own player, 'mate' the
// first friend who is not the marked keeper.
function cast(squad) {
  const you = squad.findIndex((p) => p.you);
  const mate = squad.findIndex((p) => !p.you && !p.keeper);
  return { you, mate };
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

  const spotAt = (p) => nearestSpot(p, stage.spots).id;
  const indexOf = (part) => parts[part];

  for (const [n, scene] of drill.scenes.entries()) {
    // Set out the puzzle.
    stage.setBusy(true);
    for (const t of stage.them) t.remove();
    stage.addThem(scene.them);
    for (const [part, at] of Object.entries(scene.us)) {
      const i = indexOf(part);
      used.add(i);
      const p = stage.players[i];
      p.el.style.display = '';
      p.locked = part !== scene.move;
      await stage.placement.moveTo(i, spotAt(pt(at)), n === 0 ? 0 : 700);
    }
    stage.placement.refresh();
    const ballAt = drill.kind === 'pass' ? pt(scene.us.you) : pt(scene.them[0]);
    const feet = { x: ballAt.x + 0.7, y: ballAt.y + 0.4 };
    if (n === 0) pitch.placeBall(feet);
    else await pitch.moveBall(feet, 500);

    const mover = stage.players[indexOf(scene.move)];
    stage.callNames({ mate: stage.players[parts.mate]?.el });
    await stage.play([...(n === 0 ? drill.intro : ['tr.next']), ...scene.say], {
      [scene.say[0]]: () => stage.jump([mover.el]),
    });
    await solve(scene, mover, ballAt);
  }
  return { used: [...used] };

  // One puzzle: wait for the tick, check, and help if it isn't right yet.
  async function solve(scene, mover, ballAt) {
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
      const result = checkDrill(drill.kind, scenePositions(drill.kind, scene, mover.el._pos));
      if (result.ok) return playOut(scene, mover, ballAt);
      wrong += 1;
      if (wrong >= 3) {
        // Do it together: she watches her player walk to a good place.
        await stage.play(['sfx.whistle', drill.together], {
          [drill.together]: () => stage.placement.moveTo(indexOf(scene.move), spotAt(pt(scene.ideal)), 1200),
        });
        return playOut(scene, mover, ballAt);
      }
      // The nudge says which player to think about, and that player hops.
      const nudge = drill.nudge[result.why] || Object.values(drill.nudge)[0];
      const hopper = result.why === 'blocked' && result.who != null ? stage.them[result.who] : drill.kind === 'intercept' && result.why === 'offLine' ? null : mover.el;
      const lines = ['sfx.whistle', nudge, ...(wrong === 2 ? [drill.show] : []), 'hint.tryAgain'];
      await stage.play(lines, {
        [nudge]: () => stage.jump(hopper ? [hopper] : stage.them.slice(0, 2)),
        ...(wrong === 2 ? { [drill.show]: () => pitch.flashSpots([pt(scene.ideal)], 2600) } : {}),
      });
    }
  }

  // The move plays out, so she sees why it was right.
  async function playOut(scene, mover, ballAt) {
    const to = mover.el._pos;
    const cues = {};
    if (drill.kind === 'pass') {
      cues[drill.right[0]] = async () => {
        pitch.showArrow(ballAt, to);
        await wait(hold(500));
        await pitch.moveBall({ x: to.x + 0.6, y: to.y + 0.4 }, 900);
        pitch.clear('arrow');
        stage.jump([mover.el]);
      };
    } else if (drill.kind === 'intercept') {
      cues[drill.right[0]] = async () => {
        await pitch.moveBall({ x: to.x, y: to.y + 0.5 }, 1000, 'ease-in');
        stage.jump([mover.el]);
      };
    } else {
      // Their player shoots at the middle of the goal: straight to her.
      cues[drill.right[0]] = async () => {
        await pitch.moveBall({ x: to.x, y: to.y + 0.3 }, 700, 'ease-in');
        stage.jump([mover.el]);
      };
    }
    stage.confetti(mover.el, 24);
    await stage.play(['sfx.cheer', ...drill.right], cues);
    await wait(hold(400));
  }
}

