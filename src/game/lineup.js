// The line-up puzzle used by both chapters.
// The child places all five players, then taps the tick.
// First the rule is checked ("The rule says"), then our shape ("Our team does").
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
  let hintsOn = false;

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
      if (hintsOn) pitch.showHints(checkShape({ players: placement.positions(), shape, grid: team.grid }).emptySpots);
    };
    start();
    stage.play(promptIds, opening).catch(() => {});

    stage.onReady = () => {
      const bench = placement.onBench();
      if (bench.length) {
        stage.say(['place.notAll'], {}, { remember: false });
        stage.bounce(bench);
        return;
      }
      const players = placement.positions();
      const rule = checkRule({ kind, players, ruleSet, centre: pitch.centre, halfway: pitch.halfway });
      const fit = checkShape({ players, shape, grid: team.grid });
      stage.clearWhy();

      if (rule.ok && fit.ok) {
        placement.disable();
        stage.showReady(false);
        pitch.showHints([]);
        stage.onReady = null;
        stage.afterChange = null;
        stage.jump(stage.players.map((p) => p.el));
        const roles = fit.roles.map((r) => ({ ...r, el: stage.players[r.player].el }));
        const spoken = stage.play([attempts ? 'good.lineupEffort' : 'good.lineup']);
        resolve({ roles, attempts, spoken });
        return;
      }

      attempts++;
      // The rule comes first: it is the same for every team.
      const problem = rule.ok ? fit.problems[0] : rule.problems[0];
      problem.players.forEach((i) => stage.players[i].el.classList.add('is-wrong'));
      pitch.setWhy(problem.type);

      const lines = ['sfx.whistle', problem.line];
      if (attempts >= 2 || hintsOn) {
        hintsOn = true;
        pitch.showHints(fit.emptySpots);
        if (attempts === 2) lines.push('hint.show');
      }
      if (attempts >= 3) {
        doOneTogether(fit, rule, lines);
      } else {
        lines.push('hint.tryAgain');
        stage.say(lines);
      }
    };

    // Move one player into place for the child, then hand back.
    async function doOneTogether(fit, rule, lines) {
      stage.setBusy(true);
      const spoken = stage.play([...lines, 'hint.together']).catch(() => {});
      let mover = fit.strayPlayers[0];
      let target = fit.emptySpots[0];
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
      const now = checkShape({ players: rest, shape, grid: team.grid });
      pitch.showHints(now.emptySpots);
      stage.setBusy(false);
      start();
      stage.say(now.ok ? ['place.ready'] : ['hint.yourTurn', 'place.ready']);
    }
  });
}
