// The level path on the menu: a winding trail of levels, grouped into
// matches. Built from levels.json, so more levels and matches can be added
// there and the path simply grows upwards. No imports: easy to test.

export const PATH_WIDTH = 340; // drawing width in CSS pixels
const STEP = 96; // distance up the screen from one level to the next
const TOP = 170; // room above the last level, under the top buttons
const BOTTOM = 150; // room below level one
const XS = [78, 186, 268, 160]; // the trail wiggles across these, in turn

// A smooth line through the points.
export function smooth(pts) {
  if (!pts.length) return '';
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c = (a, b, k) => (a + (b - k) / 5).toFixed(0);
    d += ` C${c(p1[0], p2[0], p0[0])} ${c(p1[1], p2[1], p0[1])} ${(p2[0] - (p3[0] - p1[0]) / 5).toFixed(0)} ${(p2[1] - (p3[1] - p1[1]) / 5).toFixed(0)} ${p2[0]} ${p2[1]}`;
  }
  return d;
}

// Which level she plays next: the first one not finished. Null when every
// level is finished.
export function nextLevel(levels, progress) {
  return levels.find((n) => !progress[`ch${n}`]) ?? null;
}

// data: levels.json. progress: what is saved, e.g. { ch1: true, bonus1: true }.
export function buildPath(data, progress = {}) {
  const levels = data.matches.flatMap((m) => m.levels);
  const next = nextLevel(levels, progress);
  const nodes = [];
  data.matches.forEach((m, mi) => {
    m.levels.forEach((level, li) => {
      const done = !!progress[`ch${level}`];
      nodes.push({
        kind: 'level',
        level,
        state: done ? 'done' : level === next ? 'now' : 'locked',
        bonus: !!progress[`bonus${level}`],
        flag: li === 0 ? m.label : null,
        match: mi,
      });
    });
  });
  // A few locked places after the last level, to show there is more to come.
  for (let i = 0; i < (data.soon || 0); i++) nodes.push({ kind: 'soon', level: null, state: 'soon', bonus: false, flag: i === 0 ? data.soonLabel || null : null, match: -1 });

  const height = TOP + BOTTOM + (nodes.length - 1) * STEP;
  nodes.forEach((n, i) => {
    n.x = XS[i % XS.length];
    n.y = height - BOTTOM - i * STEP;
  });
  // Where she stands: on the level to play next, or on the last level when
  // all are finished.
  const last = levels.length - 1;
  const at = next == null ? last : levels.indexOf(next);
  const pts = nodes.map((n) => [n.x, n.y]);
  // The trail carries on off the top of the screen.
  const tail = nodes.length ? [[XS[nodes.length % XS.length], nodes[nodes.length - 1].y - STEP], [PATH_WIDTH / 2, -40]] : [];
  return {
    nodes,
    at,
    height,
    width: PATH_WIDTH,
    trail: smooth([...pts, ...tail]),
    doneTrail: at > 0 ? smooth(pts.slice(0, at + 1)) : '',
  };
}
