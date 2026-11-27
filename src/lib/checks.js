// The two line-up checks. They are kept apart on purpose:
//   checkRule()  = "The rule says". The FA rule. Right or wrong for everyone.
//   checkShape() = "In our team". The coach's preference, stored as data.
// Both look only at which spots are filled, never at who is on them,
// because young players should try every position.

import { distance, resolveAt } from './geometry.js';
import { ruleValue } from './rules.js';

const ON_SPOT = 0.75; // yards. How close counts as "on" the centre mark.

// kind: "ours" (we take the centre kick), "theirs" (they take it),
// "ourGoalKick", "theirGoalKick", "ourKickIn", "theirKickIn", "ourCorner"
// "theirCorner" or "ourPenalty".
// ball: where a kick-in, corner or penalty is taken.
// players: array of { x, y } in yards. halfway: the y of the halfway line.
// Returns { ok, problems: [{ type, line, players: [index] }] }.
export function checkRule({ kind, players, ruleSet, centre, halfway, ball, area }) {
  const problems = [];

  // Kick-ins (FA pass-in or dribble-in): the ball sits still on the side
  // line where it went out. One of us takes it at our kick-in; at theirs
  // we stay at least five yards from the ball.
  // Corners work the same way, from the corner of the pitch.
  if (kind === 'ourKickIn' || kind === 'ourCorner') {
    const line = kind === 'ourKickIn' ? 'rule.kickInOnBall' : 'rule.cornerOnBall';
    if (!players.some((p) => distance(p, ball) <= ON_SPOT)) problems.push({ type: 'onBall', line, players: [] });
    return { ok: problems.length === 0, problems };
  }
  if (kind === 'theirKickIn' || kind === 'theirCorner') {
    const corner = kind === 'theirCorner';
    const yards = ruleValue(ruleSet, corner ? 'corner.opponentDistance' : 'kickIn.opponentDistance');
    const tooClose = players
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => distance(p, ball) < yards)
      .map(({ i }) => i);
    if (tooClose.length) problems.push({ type: 'ring', line: corner ? 'rule.cornerRing' : 'rule.kickInRing', players: tooClose });
    return { ok: problems.length === 0, problems };
  }

  // Our penalty (FA Law 14): one of us on the penalty mark. Everyone else,
  // apart from the keepers, stays outside the penalty area and at least
  // five yards from the mark until it is kicked. Our own keeper is far away
  // in our goal, so she is always fine. area: their penalty box in yards.
  if (kind === 'ourPenalty') {
    const kicker = players.findIndex((p) => distance(p, ball) <= ON_SPOT);
    if (kicker < 0) return { ok: false, problems: [{ type: 'onBall', line: 'rule.penaltyOnBall', players: [] }] };
    const yards = ruleValue(ruleSet, 'penalty.othersDistance');
    const inArea = (p) => area && p.x >= area.x[0] && p.x <= area.x[1] && p.y >= area.y[0] && p.y <= area.y[1];
    const bad = players
      .map((p, i) => ({ p, i }))
      .filter(({ p, i }) => i !== kicker && (inArea(p) || distance(p, ball) < yards))
      .map(({ i }) => i);
    if (bad.length) problems.push({ type: 'ring', line: 'rule.penaltyOutside', players: bad });
    return { ok: problems.length === 0, problems };
  }

  // Goal kicks: the retreat line. At their goal kick we all go back into
  // our own half until the ball is in play. Rich's club also keeps both
  // teams in their own half at our goal kick (27th November 2026).
  if (kind === 'ourGoalKick') {
    // A local rule, so it may be missing from a rule set: missing means no.
    if (ruleSet.rules['goalKick.bothTeamsOwnHalf']?.value === true) {
      const bad = players
        .map((p, i) => ({ p, i }))
        .filter(({ p }) => p.y >= halfway)
        .map(({ i }) => i);
      if (bad.length) problems.push({ type: 'ownHalf', line: 'rule.goalKickOurs', players: bad });
    }
    return { ok: problems.length === 0, problems };
  }
  if (kind === 'theirGoalKick') {
    if (ruleValue(ruleSet, 'goalKick.retreatLine') === 'halfway') {
      const bad = players
        .map((p, i) => ({ p, i }))
        .filter(({ p }) => p.y >= halfway)
        .map(({ i }) => i);
      if (bad.length) problems.push({ type: 'ownHalf', line: 'rule.retreat', players: bad });
    }
    return { ok: problems.length === 0, problems };
  }

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

// How far a player is from a shape spot. Some spots can be filled in more
// than one place (the back player can stand on the penalty box line or one
// dot in front of it, Rich's choice, 27th November 2026), so take the
// nearest of them.
export function spotDistance(p, target) {
  const places = [target, ...(target.also || [])];
  return Math.min(...places.map((q) => distance(p, q)));
}
// A shape spot can have a zone: a box on the pitch where anywhere counts
// (Rich asked for "the right area is fine", 27th November 2026). The spot
// itself is still the ideal place, used for hints and to break ties.
const EDGE = 0.01; // yards of slack, so a dot on the zone's edge counts
export function inZone(p, zone) {
  return p.x >= zone.x[0] - EDGE && p.x <= zone.x[1] + EDGE && p.y >= zone.y[0] - EDGE && p.y <= zone.y[1] + EDGE;
}
// A shape spot can have a job instead (kick-ins, Rich's choice, 27th
// November 2026): anywhere that does the job counts. A job lists one or
// more tests, and all of them must pass:
//   near + yards: within [min, max] yards of a point ("near" is a point
//     in yards, { x, y })
//   box: a box in yards, like a zone
//   mark + yards: between that player of theirs and our goal, and no more
//     than "yards" from her ("goal side")
const OUR_GOAL = { x: 15, y: 0 };
export function doesJob(p, job) {
  if (job.near) {
    const d = distance(p, job.near);
    if (d < job.yards[0] - EDGE || d > job.yards[1] + EDGE) return false;
  }
  if (job.box && !inZone(p, job.box)) return false;
  if (job.mark) {
    const them = { x: job.mark[0], y: job.mark[1] };
    if (distance(p, them) > job.markYards + EDGE) return false;
    if (distance(p, OUR_GOAL) >= distance(them, OUR_GOAL)) return false;
  }
  return true;
}
const fitsTarget = (p, t, tolerance) => (t.job ? doesJob(p, t.job) : t.zone ? inZone(p, t.zone) : spotDistance(p, t) <= tolerance);

const nearestPlace = (p, target) => [target, ...(target.also || [])].reduce((a, b) => (distance(p, b) < distance(p, a) ? b : a));

// Pair players with shape spots so that as many spots as possible are
// filled, using the smallest total distance to break ties.
// Five players means 120 orderings, which is quick to try in full.
export function matchShape(players, targets, tolerance, fits = () => true) {
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
      if (used[i] || !fits(i, targets[t])) continue;
      const d = spotDistance(players[i], targets[t]);
      if (!fitsTarget(players[i], targets[t], tolerance)) continue;
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

// A job's "near" can name a spot, like "kick-in-left", or a grid place.
function resolveJob(job, grid) {
  if (!job.near || (typeof job.near === 'object' && !Array.isArray(job.near))) return job;
  return { ...job, near: resolveAt(job.near, grid) };
}

// shape: one entry from team.json "shapes". grid: team.json "grid".
// keepers: indexes of players marked as our goalkeeper (Rich's choice,
// 26th November 2026). A marked keeper fills the keeper spot and only that
// spot. Everyone else can still fill any other spot. With no marked
// keeper, any player can go in goal.
// Returns { ok, roles, emptySpots, strayPlayers, problems }.
// roles[i] is the role of shape spot i and which player filled it.
export function checkShape({ players, shape, grid, keepers = [] }) {
  const targets = shape.spots.map((s) => ({ ...resolveAt(s.at, grid), also: (s.also || []).map((a) => resolveAt(a, grid)), role: s.role, hint: s.hint, zone: s.zone || null, job: s.job ? resolveJob(s.job, grid) : null }));
  const isKeeper = (i) => keepers.includes(i);
  const fits = (i, t) => !keepers.length || isKeeper(i) === (t.role === 'keeper');
  const assign = matchShape(players, targets, shape.tolerance, fits);
  const filledBy = new Set(assign.filter((i) => i >= 0));
  const emptySpots = targets.map((t, i) => ({ ...t, index: i })).filter((t) => assign[t.index] < 0);
  const strayPlayers = players.map((_, i) => i).filter((i) => !filledBy.has(i));
  // A filled spot reports where the player actually stands (the nearest
  // of its places), so the story plays out from there.
  const roles = targets.map((t, i) => {
    // In a zone, the player's own position is the place.
    const at = assign[i] < 0 ? t : t.zone || t.job ? players[assign[i]] : nearestPlace(players[assign[i]], t);
    return { role: t.role, x: at.x, y: at.y, player: assign[i] };
  });

  const problems = [];
  const seen = new Set();
  for (const spot of emptySpots) {
    if (seen.has(spot.hint)) continue;
    seen.add(spot.hint);
    problems.push({ type: spot.role, line: spot.hint, players: strayPlayers });
  }
  return { ok: emptySpots.length === 0, roles, emptySpots, strayPlayers, problems };
}
