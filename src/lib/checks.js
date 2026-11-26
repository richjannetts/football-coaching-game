// The two line-up checks. They are kept apart on purpose:
//   checkRule()  = "The rule says". The FA rule. Right or wrong for everyone.
//   checkShape() = "Our team does". The coach's preference, stored as data.
// Both look only at which spots are filled, never at who is on them,
// because young players should try every position.

import { distance, resolveAt } from './geometry.js';
import { ruleValue } from './rules.js';

const ON_SPOT = 0.75; // yards. How close counts as "on" the centre mark.

// kind: "ours" (we take the centre kick) or "theirs" (they take it).
// players: array of { x, y } in yards. halfway: the y of the halfway line.
// Returns { ok, problems: [{ type, line, players: [index] }] }.
export function checkRule({ kind, players, ruleSet, centre, halfway }) {
  const problems = [];

  if (ruleValue(ruleSet, 'kickoff.ownHalf')) {
    // A player on or over the halfway line is not in our half.
    // The one exception is our kicker, standing on the centre mark.
    const bad = players
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => p.y >= halfway && !(kind === 'ours' && distance(p, centre) <= ON_SPOT))
      .map(({ i }) => i);
    if (bad.length) problems.push({ type: 'ownHalf', line: 'rule.ownHalf', players: bad });
  }

  if (kind === 'ours' && ruleValue(ruleSet, 'kickoff.fromCentreMark')) {
    const onBall = players.some((p) => distance(p, centre) <= ON_SPOT);
    if (!onBall) problems.push({ type: 'onBall', line: 'rule.onBall', players: [] });
  }

  if (kind === 'theirs') {
    const yards = ruleValue(ruleSet, 'kickoff.opponentDistance');
    const tooClose = players
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => distance(p, centre) < yards)
      .map(({ i }) => i);
    if (tooClose.length) problems.push({ type: 'ring', line: 'rule.ring', players: tooClose });
  }

  return { ok: problems.length === 0, problems };
}

// Pair players with shape spots so that as many spots as possible are
// filled, using the smallest total distance to break ties.
// Five players means 120 orderings, which is quick to try in full.
export function matchShape(players, targets, tolerance) {
  let best = { count: -1, total: Infinity, assign: [] };
  const n = targets.length;
  const used = new Array(players.length).fill(false);
  const assign = new Array(n).fill(-1);

  function walk(t, count, total) {
    if (t === n) {
      if (count > best.count || (count === best.count && total < best.total)) {
        best = { count, total, assign: assign.slice() };
      }
      return;
    }
    // Option: leave this spot empty.
    walk(t + 1, count, total);
    for (let i = 0; i < players.length; i++) {
      if (used[i]) continue;
      const d = distance(players[i], targets[t]);
      if (d > tolerance) continue;
      used[i] = true;
      assign[t] = i;
      walk(t + 1, count + 1, total + d);
      used[i] = false;
      assign[t] = -1;
    }
  }
  walk(0, 0, 0);
  return best.assign;
}

// shape: one entry from team.json "shapes". grid: team.json "grid".
// Returns { ok, roles, emptySpots, strayPlayers, problems }.
// roles[i] is the role of shape spot i and which player filled it.
export function checkShape({ players, shape, grid }) {
  const targets = shape.spots.map((s) => ({ ...resolveAt(s.at, grid), role: s.role, hint: s.hint }));
  const assign = matchShape(players, targets, shape.tolerance);
  const filledBy = new Set(assign.filter((i) => i >= 0));
  const emptySpots = targets.map((t, i) => ({ ...t, index: i })).filter((t) => assign[t.index] < 0);
  const strayPlayers = players.map((_, i) => i).filter((i) => !filledBy.has(i));
  const roles = targets.map((t, i) => ({ role: t.role, x: t.x, y: t.y, player: assign[i] }));

  const problems = [];
  const seen = new Set();
  for (const spot of emptySpots) {
    if (seen.has(spot.hint)) continue;
    seen.add(spot.hint);
    problems.push({ type: spot.role, line: spot.hint, players: strayPlayers });
  }
  return { ok: emptySpots.length === 0, roles, emptySpots, strayPlayers, problems };
}
