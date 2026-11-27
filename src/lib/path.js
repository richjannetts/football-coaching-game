// The cup path on the menu (Rich's choice, 27th November 2026, after the
// match clock did not work for him). One winding trail up the screen:
// Round 1's moments, then the semi-final's, then the final's, and the cup
// at the top. A flag marks the start of each round. Moments in rounds she
// has won are green, the round she is in shows what she has done and what
// is next, and later rounds are white and locked.
// No imports: easy to test.

export const PATH_WIDTH = 340; // drawing width in CSS pixels
const STEP = 96; // distance up the screen from one moment to the next
const GAP = 40; // extra room between rounds, for the round's flag
const TOP = 70; // room above the cup
const BOTTOM = 70; // room below the first moment
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

// rounds: from ladder() in cup.js (each has label, halves and state: won,
// now or next). clock: from buildClock() for the round she is in, which
// says which of its moments are done, next or locked.
export function buildCupPath(rounds, clock, cupsWon = 0) {
  const nodes = [];
  rounds.forEach((r, ri) => {
    const order = r.halves.flat();
    order.forEach((level, k) => {
      const mark = r.state === 'now' ? clock.markers[k] : null;
      nodes.push({
        kind: 'moment',
        level,
        round: ri,
        number: k + 1, // the moment's place in its round
        playable: r.state === 'now',
        state: r.state === 'won' ? 'done' : r.state === 'next' ? 'locked' : mark.state,
        bonus: mark ? mark.bonus : false,
        flag: k === 0 ? r.label : null,
      });
    });
  });
  nodes.push({ kind: 'cup', level: null, round: rounds.length, number: null, playable: false, state: cupsWon > 0 ? 'won' : 'locked', bonus: false, flag: null });

  // Place them from the bottom up, with a little more room where a new
  // round starts.
  const rises = nodes.map((n, i) => (i === 0 ? 0 : STEP + (n.flag ? GAP : 0)));
  const total = rises.reduce((a, b) => a + b, 0);
  const height = TOP + BOTTOM + total;
  let y = height - BOTTOM;
  nodes.forEach((n, i) => {
    y -= rises[i];
    n.x = i === nodes.length - 1 ? PATH_WIDTH / 2 : XS[i % XS.length];
    n.y = y;
  });

  // Where she stands: on the moment to play next, or after the last moment
  // she finished, or (between rounds) at the start of the next round.
  const mine = nodes.filter((n) => n.playable);
  const done = mine.filter((n) => n.state === 'done');
  const here = mine.find((n) => n.state === 'now') || done[done.length - 1] || mine[0] || nodes[0];
  const at = nodes.indexOf(here);
  const pts = nodes.map((n) => [n.x, n.y]);
  return {
    nodes,
    at,
    height,
    width: PATH_WIDTH,
    trail: smooth(pts),
    doneTrail: at > 0 ? smooth(pts.slice(0, at + 1)) : '',
  };
}
