// The line-up puzzle used by both chapters.
// The child places all five players, then taps the tick.
// First the rule is checked ("The rule says"), then our shape ("In our team").
// A wrong answer gets a friendly whistle, a picture of why, a hint and another
// go straight away. Hints step up: nudge, then show, then do one together.

import { checkRule, checkShape } from '../lib/checks.js';
import { nearestSpot } from '../lib/geometry.js';
import { ruleSet, team, gridSpots } from './content.js';
import { wait, motion } from '../lib/svg.js';

export function runLineup(stage, { kind, shapeKey, promptIds }) {
  const { pitch, placement } = stage;
  const shape = team.shapes[shapeKey];
  let attempts = 0;
  // Our marked goalkeeper (from team.json), who must be the one in goal.
  const keepers = team.squad.map((p, i) => (p.keeper ? i : -1)).filter((i) => i >= 0);
  let hintsOn = false;
  let changed = true; // has a player moved since the last check?
  let lastTick = -Infinity;
  let lastFeedback = null;

  return new Promise((resolve) => {
    const start = () => {
      placement.enable();
      stage.showReady(true);
    };

    // The opening instruction. Not started from a tap, so it relies on
    // sound having been unlocked by the tap that opened the chapter.
    const opening = {
      'c1.place': () => stage.bounce(placement.onBench()),
      'c2.place': () => stage.bounce(placement.onBench()),
      'place.ready': () => {
        stage.glowReady(true);
        setTimeout(() => stage.glowReady(false), 2500);
      },
    };
    stage.afterChange = () => {
      changed = true;
      if (hintsOn) pitch.showHints(checkShape({ players: placement.positions(), shape, grid: team.grid, keepers }).emptySpots);
    };
    start();
    stage.play(promptIds, opening).catch(() => {});

    stage.onReady = () => {
      const now = performance.now();
      if (now - lastTick < 300) return; // a double tap counts once
      lastTick = now;
      // Nothing moved since the last try: say the same help again, without
      // stepping the hints up. Hints only step up after a real new attempt.
      if (!changed && lastFeedback) {
        stage.say(lastFeedback);
        return;
      }
      const bench = placement.onBench();
      if (bench.length) {
        stage.say(['place.notAll'], {}, { remember: false });
        stage.bounce(bench);
        return;
      }
      const players = placement.positions();
      const rule = checkRule({ kind, players, ruleSet, centre: pitch.centre, halfway: pitch.halfway });
      const fit = checkShape({ players, shape, grid: team.grid, keepers });
      stage.clearWhy();

      if (rule.ok && fit.ok) {
        placement.disable();
        stage.showReady(false);
        pitch.showHints([]);
        stage.onReady = null;
        stage.setBusy(true);
        stage.afterChange = null;
        stage.jump(stage.players.map((p) => p.el));
        stage.confetti(pitch.svg, 40);
        const roles = fit.roles.map((r) => ({ ...r, el: stage.players[r.player].el }));
        const spoken = stage.play(['sfx.cheer', attempts ? 'good.lineupEffort' : 'good.lineup']);
        resolve({ roles, attempts, spoken });
        return;
      }

      attempts++;
      changed = false;
      // The rule comes first: it is the same for every team.
      const problem = rule.ok ? fit.problems[0] : rule.problems[0];
      problem.players.forEach((i) => stage.players[i].el.classList.add('is-wrong'));
      stage.shake(problem.players);
      pitch.setWhy(problem.type);

      const lines = ['sfx.whistle', problem.line];
      if (attempts >= 2 || hintsOn) {
        hintsOn = true;
        pitch.showHints(fit.emptySpots);
        if (attempts === 2) lines.push('hint.show');
      }
      if (attempts >= 3) {
        lastFeedback = lines.filter((id) => id !== 'sfx.whistle');
        doOneTogether(fit, rule, lines);
      } else {
        lines.push('hint.tryAgain');
        lastFeedback = lines.filter((id) => id !== 'sfx.whistle');
        stage.say(lines);
      }
    };

    // Move one player into place for the child, then hand back.
    async function doOneTogether(fit, rule, lines) {
      stage.setBusy(true);
      const spoken = stage.play([...lines, 'hint.together']).catch(() => {});
      // Pick a player and an empty spot that belong together: the keeper
      // goes in goal, anyone else goes to any other spot.
      let target = fit.emptySpots[0];
      const fitsSpot = (i, t) => !keepers.length || keepers.includes(i) === (t.role === 'keeper');
      let mover = fit.strayPlayers.find((i) => target && fitsSpot(i, target));
      if (mover === undefined) {
        for (const t of fit.emptySpots) {
          const i = fit.strayPlayers.find((k) => fitsSpot(k, t));
          if (i !== undefined) {
            mover = i;
            target = t;
            break;
          }
        }
      }
      if (mover === undefined) mover = fit.strayPlayers[0];
      if (mover === undefined || !target) {
        // Shape is right but the rule is not: only possible if data changes.
        mover = rule.problems[0]?.players[0] ?? 0;
        target = pitch.centre;
      }
      await spoken;
      if (!stage.alive) return;
      const spot = nearestSpot(target, gridSpots);
      stage.clearWhy();
      await placement.moveTo(mover, spot.id);
      await wait(motion(400));
      if (!stage.alive) return;
      const rest = placement.positions();
      const now = checkShape({ players: rest, shape, grid: team.grid, keepers });
      pitch.showHints(now.emptySpots);
      stage.setBusy(false);
      changed = true;
      start();
      stage.say(now.ok ? ['place.ready'] : ['hint.yourTurn', 'place.ready']);
    }
  });
}
