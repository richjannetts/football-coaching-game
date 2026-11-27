// One football drawing, used everywhere a ball appears: on the pitch, in
// the bonus question pictures, on the title screen and in the kit bag.
// Rich's daughter did not recognise the old ball (a white dot with a small
// grey patch, 27th November 2026), so this is the classic black and white
// ball children know from picture books: a black patch in the middle, black
// patches round the edge and seams joining them. Drawn around (0, 0).

import { s } from './svg.js';

const INK = '#1f2937';
let count = 0;

// Points of a five-sided patch, centred on (cx, cy), pointing at angle a.
function pentagon(cx, cy, r, a) {
  const pts = [];
  for (let i = 0; i < 5; i++) {
    const t = a + (i * 2 * Math.PI) / 5;
    pts.push(`${(cx + r * Math.cos(t)).toFixed(2)},${(cy + r * Math.sin(t)).toFixed(2)}`);
  }
  return pts.join(' ');
}

// r: the ball's radius in the drawing's own units.
// Returns a group, so it can be placed with a transform.
export function footballSvg(r, { cls = 'football-ball', shadow = false } = {}) {
  const id = `ball-clip-${++count}`;
  const k = (n) => +(n * r).toFixed(2);
  const up = -Math.PI / 2;
  const g = s('g', { class: cls });
  if (shadow) g.append(s('ellipse', { cx: k(0.15), cy: k(0.95), rx: k(0.95), ry: k(0.32), fill: 'rgba(0, 0, 0, 0.25)', class: 'ball-shadow' }));
  g.append(s('defs', {}, s('clipPath', { id }, s('circle', { r }))));
  g.append(s('circle', { r, fill: '#fff', class: 'ball-shape' }));
  const inside = s('g', { 'clip-path': `url(#${id})` });
  // Seams from each corner of the middle patch out to the edge.
  const seams = [];
  for (let i = 0; i < 5; i++) {
    const t = up + (i * 2 * Math.PI) / 5;
    seams.push(`M${k(0.38 * Math.cos(t))} ${k(0.38 * Math.sin(t))} L${k(0.72 * Math.cos(t))} ${k(0.72 * Math.sin(t))}`);
    // From there, out to the two edge patches either side.
    for (const side of [-1, 1]) {
      const e = t + (side * Math.PI) / 5;
      seams.push(`M${k(0.72 * Math.cos(t))} ${k(0.72 * Math.sin(t))} L${k(0.82 * Math.cos(e))} ${k(0.82 * Math.sin(e))}`);
    }
  }
  inside.append(s('path', { d: seams.join(' '), stroke: INK, 'stroke-width': k(0.07), 'stroke-linecap': 'round', fill: 'none' }));
  // The middle patch, and five patches round the edge, half hidden.
  inside.append(s('polygon', { points: pentagon(0, 0, k(0.4), up), fill: INK }));
  for (let i = 0; i < 5; i++) {
    const t = up + Math.PI / 5 + (i * 2 * Math.PI) / 5;
    inside.append(s('polygon', { points: pentagon(k(1.02 * Math.cos(t)), k(1.02 * Math.sin(t)), k(0.36), t + Math.PI), fill: INK }));
  }
  // A little shine, so it looks round.
  inside.append(s('ellipse', { cx: k(-0.42), cy: k(-0.5), rx: k(0.22), ry: k(0.13), fill: '#fff', opacity: 0.8, transform: `rotate(-35 ${k(-0.42)} ${k(-0.5)})` }));
  g.append(inside);
  g.append(s('circle', { r: r - k(0.04), fill: 'none', stroke: INK, 'stroke-width': k(0.09), class: 'ball-edge' }));
  return g;
}
