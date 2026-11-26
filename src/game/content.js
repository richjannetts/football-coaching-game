// Brings the content files together in one place.
import fa from '../data/rules/fa-2026-27-5v5.json';
import league from '../data/rules/shwgl-2026-27-u8.json';
import team from '../data/team.json';
import { resolveRuleSet, ruleValue } from '../lib/rules.js';
import { buildSpots, resolveAt } from '../lib/geometry.js';

export const ACTIVE_RULE_SET = 'shwgl-2026-27-u8';
export const ruleSet = resolveRuleSet(ACTIVE_RULE_SET, [fa, league]);

export const pitchSize = {
  length: ruleValue(ruleSet, 'pitch.length'),
  width: ruleValue(ruleSet, 'pitch.width'),
  goalWidth: ruleValue(ruleSet, 'goal.width'),
  ringYards: ruleValue(ruleSet, 'kickoff.opponentDistance'),
  penaltyArea: ruleValue(ruleSet, 'pitch.penaltyArea'),
};

export const gridSpots = buildSpots(team.grid);

// Where our players wait before they are placed: just off the pitch,
// behind our goal line.
export const benchSpots = [5, 10, 15, 20, 25].map((x, i) => ({ id: `bench${i}`, x, y: -4, bench: true }));

export const keeperAt = resolveAt([team.keeperSpot.col, team.keeperSpot.row], team.grid);

export { team };
