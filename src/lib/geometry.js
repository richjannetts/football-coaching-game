// Pitch positions are in yards.
// x: across the pitch from the left touchline. y: up the pitch from our goal line.

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Every spot a player can snap to, built from the grid in team.json.
// An extra spot marked "optional" (a spot on the side line for a kick-in)
// only appears in the levels that ask for it by id.
export function buildSpots(grid, include = []) {
  const spots = [];
  grid.rows.forEach((y, row) => {
    grid.cols.forEach((x, col) => {
      spots.push({ id: `c${col}r${row}`, col, row, x, y });
    });
  });
  for (const extra of grid.extra || []) {
    if (extra.optional && !include.includes(extra.id)) continue;
    const { optional, ...spot } = extra;
    spots.push(spot);
  }
  return spots;
}

// Turn a shape spot reference ([col, row] or an extra spot id) into x and y.
export function resolveAt(at, grid) {
  if (Array.isArray(at)) {
    const [col, row] = at;
    if (grid.cols[col] === undefined || grid.rows[row] === undefined) throw new Error(`Bad grid spot ${at}`);
    return { x: grid.cols[col], y: grid.rows[row] };
  }
  const extra = (grid.extra || []).find((e) => e.id === at);
  if (!extra) throw new Error(`Unknown spot: ${at}`);
  return { x: extra.x, y: extra.y };
}

export function nearestSpot(point, spots) {
  let best = null;
  let bestD = Infinity;
  for (const s of spots) {
    const d = distance(point, s);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

// On Difficult there are no dots: she can put a player anywhere (Rich,
// 27th November 2026). Underneath, players still snap, but to a fine grid
// one yard apart that she never sees, plus every ordinary spot, so the
// centre mark and the kick-in spot still work exactly.
export function freeSpots(grid, include, { width, length, step = 1 }) {
  const spots = buildSpots(grid, include);
  const near = (x, y) => spots.some((s) => Math.abs(s.x - x) < step / 2 && Math.abs(s.y - y) < step / 2);
  const fine = [];
  for (let y = step / 2; y < length; y += step) {
    for (let x = step / 2; x < width; x += step) {
      if (!near(x, y)) fine.push({ id: `f${x}_${y}`, x, y, free: true });
    }
  }
  return [...spots, ...fine];
}
