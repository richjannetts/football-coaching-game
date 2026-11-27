// The pitch: one inline SVG with a fixed viewBox.
// All game positions are in yards (see team.json). Drawing units are
// 10 per yard, with our goal at the bottom in portrait. In landscape the
// whole drawing turns a quarter so we attack from left to right.

import team from '../data/team.json';
import { s, motion } from './svg.js';
import { tokenSvg } from './avatar.js';
import { distance } from './geometry.js';
import { footballSvg } from './ball.js';

const U = 10; // drawing units per yard

export function createPitch({ length, width, goalWidth, ringYards, penaltyArea }) {
  const toView = (p) => ({ x: p.x * U, y: (length - p.y) * U });
  const toYards = (v) => ({ x: v.x / U, y: length - v.y / U });
  const halfway = length / 2;
  const centre = { x: width / 2, y: halfway };

  const svg = s('svg', { class: 'pitch', role: 'img', 'aria-label': 'Football pitch', preserveAspectRatio: 'xMidYMid meet' });
  const kit = team.kit.us;
  svg.append(
    s(
      'defs',
      {},
      s(
        'pattern',
        { id: 'stripes-us', width: 10, height: 10, patternUnits: 'userSpaceOnUse' },
        s('rect', { width: 10, height: 10, fill: kit.shirt }),
        s('rect', { x: 0, width: 4.5, height: 10, fill: kit.stripe })
      ),
      s('marker', { id: 'arrow-head', viewBox: '0 0 10 10', refX: 5, refY: 5, markerWidth: 4, markerHeight: 4, orient: 'auto-start-reverse' }, s('path', { d: 'M0 0 L10 5 L0 10 Z', fill: '#fff' }))
    )
  );
  const root = s('g', { class: 'pitch-root' });
  svg.append(root);

  const W = width * U;
  const L = length * U;
  const gw = goalWidth * U;
  const layers = {};
  const mk = (name) => {
    const g = s('g', { 'data-layer': name, class: `layer-${name}` });
    layers[name] = g;
    root.append(g);
    return g;
  };

  // --- Grass and lines ---
  const grass = mk('grass');
  // The dark green surround, with rounded corners. It matches the drawing's
  // edges in portrait and in landscape.
  grass.append(s('rect', { x: -22, y: -40, width: W + 44, height: L + 122, rx: 20, class: 'grass-edge' }));
  for (let i = 0; i < 8; i++) grass.append(s('rect', { x: 0, y: (i * L) / 8, width: W, height: L / 8, class: i % 2 ? 'grass-a' : 'grass-b' }));

  const why = mk('why'); // pictures of why an answer was wrong
  const theirHalf = s('rect', { x: 0, y: 0, width: W, height: L / 2, class: 'why-half' });
  why.append(theirHalf);

  const lines = mk('lines');
  lines.append(
    s('rect', { x: 0, y: 0, width: W, height: L, class: 'line' }),
    s('line', { x1: 0, y1: L / 2, x2: W, y2: L / 2, class: 'line' }),
    s('circle', { cx: W / 2, cy: L / 2, r: 4, class: 'centre-mark' })
  );
  // The goals are drawn a little bigger than true size (Rich asked, 27th
  // November 2026), so they look right next to the mini players. The
  // game's rules still use the real 4 yard goal.
  const GOAL_DRAW = 1.5; // times the real width
  const gdw = gw * GOAL_DRAW;
  const gd = 26; // depth of the net, in drawing units
  const goal = (side) => {
    const sign = side === 'theirs' ? -1 : 1;
    const y0 = side === 'theirs' ? -gd : L;
    const x0 = W / 2 - gdw / 2;
    const g = s('g', { class: `goal goal-${side}` });
    g.append(s('rect', { x: x0, y: y0, width: gdw, height: gd, class: 'goal-net' }));
    const mesh = [];
    for (let x = x0 + 7.5; x < x0 + gdw - 2; x += 7.5) mesh.push(`M${x} ${y0} V${y0 + gd}`);
    for (let y = y0 + 6.5; y < y0 + gd - 1; y += 6.5) mesh.push(`M${x0} ${y} H${x0 + gdw}`);
    g.append(s('path', { d: mesh.join(' '), class: 'goal-mesh' }));
    // Posts and crossbar: open on the goal line side.
    const line = side === 'theirs' ? 0 : L;
    const back = line + sign * gd;
    g.append(s('path', { d: `M${x0} ${line} V${back} H${x0 + gdw} V${line}`, class: 'goal-frame' }));
    g.append(s('path', { d: `M${x0 - 2} ${line} H${x0 + gdw + 2}`, class: 'goal-line-posts' }));
    return g;
  };
  const theirGoal = goal('theirs');
  const ourGoal = goal('ours');
  lines.append(theirGoal, ourGoal);
  if (penaltyArea) {
    const pw = penaltyArea.width * U;
    const pd = penaltyArea.depth * U;
    lines.append(
      s('rect', { x: W / 2 - pw / 2, y: 0, width: pw, height: pd, class: 'line' }),
      s('rect', { x: W / 2 - pw / 2, y: L - pd, width: pw, height: pd, class: 'line' })
    );
  }

  // The retreat line for goal kicks. In 5v5 it is the halfway line, so this
  // is a thick glow drawn over it, shown while the rule is explained.
  const retreat = s('line', { x1: 0, y1: L / 2, x2: W, y2: L / 2, class: 'retreat-line is-hidden' });
  lines.append(retreat);

  const ringLayer = mk('ring');
  const ring = s('circle', { cx: W / 2, cy: L / 2, r: ringYards * U, class: 'helper-ring' });
  ringLayer.append(ring);

  const spotsLayer = mk('spots');
  const hintsLayer = mk('hints');
  const targetsLayer = mk('targets');
  const arrowLayer = mk('arrow');
  const themLayer = mk('them');
  const usLayer = mk('us');
  const ballLayer = mk('ball');
  // The ball, big enough to read as a football at a glance.
  const ball = footballSvg(10, { cls: 'ball', shadow: true });
  ballLayer.append(ball);
  const marks = mk('marks'); // crosses and other overlays

  // --- Fit the drawing to its box, turning it in landscape ---
  let landscape = false;
  function layout() {
    const box = svg.getBoundingClientRect();
    const wantLandscape = box.width > box.height * 1.05;
    landscape = wantLandscape;
    svg.classList.toggle('is-landscape', landscape);
    const pad = 22;
    if (landscape) {
      root.setAttribute('transform', 'rotate(90)');
      svg.setAttribute('viewBox', `${-(L + 82)} ${-pad} ${L + 82 + 40} ${W + pad * 2}`);
    } else {
      root.removeAttribute('transform');
      svg.setAttribute('viewBox', `${-pad} -40 ${W + pad * 2} ${L + 122}`);
    }
  }
  svg.setAttribute('viewBox', `-22 -40 ${W + 44} ${L + 122}`);
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(layout) : null;
  ro?.observe(svg);
  // iPhone can report the old size while the phone is still turning, so
  // check again once the turn has settled.
  const relayout = () => [0, 150, 500].forEach((ms) => setTimeout(layout, ms));
  window.addEventListener('resize', relayout);
  window.addEventListener('orientationchange', relayout);

  // Pointer position to yards, whichever way the pitch is turned.
  function eventToYards(e) {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const m = root.getScreenCTM();
    if (!m) return null;
    return toYards(pt.matrixTransform(m.inverse()));
  }
  // Screen pixels per yard, used to turn finger distances into yards.
  function pxPerYard() {
    const m = root.getScreenCTM();
    return m ? Math.hypot(m.a, m.b) * U : 10;
  }

  // --- Tokens, ball, positions ---
  function place(el, p) {
    const v = toView(p);
    el.style.transform = `translate(${v.x}px, ${v.y}px)`;
    el._pos = { x: p.x, y: p.y };
  }

  function moveTo(el, p, ms = 600, easing = 'ease-in-out') {
    const from = el._pos ? toView(el._pos) : toView(p);
    const to = toView(p);
    const dur = motion(ms);
    el._pos = { x: p.x, y: p.y };
    el.style.transform = `translate(${to.x}px, ${to.y}px)`;
    if (dur <= 1 || typeof el.animate !== 'function') return Promise.resolve();
    const anim = el.animate([{ transform: `translate(${from.x}px, ${from.y}px)` }, { transform: `translate(${to.x}px, ${to.y}px)` }], { duration: dur, easing });
    return anim.finished.catch(() => {});
  }

  function addPlayer(look, kitName = 'us', name = '') {
    const t = tokenSvg(look, kitName, name);
    (kitName === 'us' ? usLayer : themLayer).append(t);
    return t;
  }

  function placeBall(p) {
    place(ball, p);
  }
  function moveBall(p, ms = 500, easing = 'ease-out') {
    return moveTo(ball, p, ms, easing);
  }

  function clear(layer) {
    layers[layer].replaceChildren();
  }

  function showSpots(spots) {
    spotsLayer.replaceChildren(
      ...spots.map((sp) => {
        const v = toView(sp);
        return s('circle', { cx: v.x, cy: v.y, r: 4, class: `spot${sp.bench ? ' spot-bench' : ''}`, 'data-spot': sp.id });
      })
    );
  }

  function showHints(points) {
    hintsLayer.replaceChildren(
      ...points.map((p) => {
        const v = toView(p);
        return s('circle', { cx: v.x, cy: v.y, r: 20, class: 'hint-spot' });
      })
    );
  }

  function showArrow(from, to) {
    const a = toView(from);
    const b = toView(to);
    arrowLayer.replaceChildren(s('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: 'big-arrow', 'marker-end': 'url(#arrow-head)' }));
  }

  function showTargets(targets) {
    targetsLayer.replaceChildren(
      ...targets.map((t) => {
        const v = toView(t);
        const g = s('g', { class: `target target-${t.kind}`, transform: `translate(${v.x} ${v.y})` });
        g.append(s('circle', { r: t.drawR ?? 26, class: 'target-glow' }));
        if (t.kind === 'long') g.append(s('path', { d: 'M0 -16 L14 4 L5 4 L5 16 L-5 16 L-5 4 L-14 4 Z', class: 'target-icon' }));
        return g;
      })
    );
  }

  function showCross(p) {
    const v = toView(p);
    const g = s('g', { class: 'cross', transform: `translate(${v.x} ${v.y})` }, s('path', { d: 'M-22 -22 L22 22 M22 -22 L-22 22' }));
    marks.append(g);
    return g;
  }

  function setWhy(kind) {
    svg.classList.toggle('why-half-on', kind === 'ownHalf');
    svg.classList.toggle('why-ring-on', kind === 'ring');
    svg.classList.toggle('why-ball-on', kind === 'onBall' || kind === 'kicker');
    svg.classList.toggle('why-goal-on', kind === 'keeper');
  }

  function setRetreat(visible) {
    retreat.classList.toggle('is-hidden', !visible);
  }

  // Move the helper ring to a ball that is not on the centre mark.
  function setRingAt(p) {
    const v = toView(p);
    ring.setAttribute('cx', v.x);
    ring.setAttribute('cy', v.y);
  }

  function setRing(visible, glow = false) {
    ring.classList.toggle('is-hidden', !visible);
    ring.classList.toggle('is-glow', glow);
  }

  function destroy() {
    ro?.disconnect();
    window.removeEventListener('resize', relayout);
    window.removeEventListener('orientationchange', relayout);
  }

  return {
    svg,
    root,
    layers,
    ball,
    centre,
    halfway,
    length,
    width,
    toView,
    eventToYards,
    pxPerYard,
    place,
    moveTo,
    addPlayer,
    placeBall,
    moveBall,
    clear,
    showSpots,
    showHints,
    showArrow,
    showTargets,
    showCross,
    setWhy,
    setRetreat,
    setRingAt,
    setRing,
    layout,
    destroy,
    distance,
  };
}
