// The checks for the Training night mini-games (Rich's choice, 28th
// November 2026). Three of them ask the same question: is a player on the
// line between two points, or clear of it?
//   - Pass: move a friend so the line from the ball to her is clear of
//     their players, and the pass is a short one.
//   - Intercept: stand on the line of their pass, between the two players.
//   - Get in line: the keeper stands on the line from the ball to the
//     middle of our goal, a step or two off her goal line.
// Anywhere that does the job counts. All distances are in yards, on the
// same pitch as the match (30 wide, 40 long, our goal along y = 0).
// No imports, so it is easy to test.

// How far point p is from the straight line between a and b (only the
// part between them), and how far along it the nearest point is: t = 0 at
// a, t = 1 at b.
export function toSegment(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const raw = len2 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2 : 0;
  const t = Math.max(0, Math.min(1, raw));
  const nx = a.x + t * dx;
  const ny = a.y + t * dy;
  return { d: Math.hypot(p.x - nx, p.y - ny), t: raw };
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// The numbers behind "anywhere that does the job". Kept here, in one
// place, so they are easy to change after Rich has tried them.
export const LIMITS = {
  pass: { min: 4, max: 15, clear: 2.5 }, // a short pass, with their players at least 2.5 yards from its line
  intercept: { near: 1.6, from: 0.15, to: 0.85 }, // on their pass line, between the two of them
  keeper: { near: 1.6, minY: 1, maxY: 6, maxOut: 7 }, // in line with the ball, a step or two off the line
};

export const GOAL_CENTRE = { x: 15, y: 0 };

// Pass. ball: where the ball is. mate: where she moved her friend to.
// them: their players. Returns { ok, why, who }: why says what to nudge
// about ('blocked', 'far' or 'near'), who is the index of the player in
// the way.
export function checkPass({ ball, mate, them }, L = LIMITS.pass) {
  const d = dist(ball, mate);
  if (d > L.max) return { ok: false, why: 'far' };
  if (d < L.min) return { ok: false, why: 'near' };
  const inWay = them.findIndex((t) => toSegment(t, ball, mate).d < L.clear);
  if (inWay >= 0) return { ok: false, why: 'blocked', who: inWay };
  return { ok: true };
}

// Intercept. me: where she moved our player. from: their player with the
// ball. to: the one they want to pass to.
export function checkIntercept({ me, from, to }, L = LIMITS.intercept) {
  const { d, t } = toSegment(me, from, to);
  if (d <= L.near && t >= L.from && t <= L.to) return { ok: true };
  return { ok: false, why: 'offLine' };
}

// Get in line. keeper: where she moved our keeper. ball: where their
// player has the ball.
export function checkKeeper({ keeper, ball }, L = LIMITS.keeper) {
  if (keeper.y < L.minY) return { ok: false, why: 'back' };
  if (keeper.y > L.maxY || dist(keeper, GOAL_CENTRE) > L.maxOut) return { ok: false, why: 'far' };
  const { d } = toSegment(keeper, GOAL_CENTRE, ball);
  if (d > L.near) return { ok: false, why: 'offLine' };
  return { ok: true };
}

// One check for any mini-game, by its kind. pos: where the players are now.
export function checkDrill(kind, pos) {
  if (kind === 'pass') return checkPass(pos);
  if (kind === 'intercept') return checkIntercept(pos);
  if (kind === 'keeper') return checkKeeper(pos);
  throw new Error(`No check for ${kind}`);
}

// What the check needs for one puzzle, from the puzzle's data
// (training.json) and where she moved her player to (moved: { x, y }).
export function scenePositions(kind, scene, moved) {
  const pt = ([x, y]) => ({ x, y });
  const them = scene.them.map(pt);
  if (kind === 'pass') return { ball: pt(scene.us.you), mate: moved, them };
  if (kind === 'intercept') return { me: moved, from: them[0], to: them[1] };
  if (kind === 'keeper') return { keeper: moved, ball: them[0] };
  throw new Error(`No positions for ${kind}`);
}
