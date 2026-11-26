// Players drawn in code from layered SVG parts.
// Layer names are fixed (data-layer="..."), and colours come from CSS
// variables (--skin, --hair, --shirt, --stripe, --shorts, --socks), so the
// artwork can be redrawn later without touching the game code.

import looks from '../data/looks.json';
import team from '../data/team.json';
import { s } from './svg.js';

const byId = (list, id, fallback) => list.find((x) => x.id === id) || list.find((x) => x.id === fallback);

export function lookVars(look) {
  const d = looks.default;
  const skin = byId(looks.skin, look?.skin, d.skin).colour;
  const hairStyle = byId(looks.hair, look?.hair, d.hair).id;
  const hair = hairStyle === 'hijab' ? looks.hijabColour : byId(looks.hairColour, look?.hairColour, d.hairColour).colour;
  return { skin, hair, hairStyle };
}

function applyVars(el, look, kitName = 'us') {
  const v = lookVars(look);
  const kit = team.kit[kitName];
  el.style.setProperty('--skin', v.skin);
  el.style.setProperty('--hair', v.hair);
  el.style.setProperty('--shirt', kit.shirt);
  el.style.setProperty('--stripe', kit.stripe);
  el.style.setProperty('--shorts', kit.shorts);
  el.style.setProperty('--socks', kit.socks);
  el.dataset.hair = v.hairStyle;
  return v;
}

const layer = (name, ...children) => s('g', { 'data-layer': name }, ...children);

// Front view, for the setup screen and menu. viewBox 0 0 100 150.
export function avatarSvg(look, { size = 160, kit = 'us', idSuffix = 'a' } = {}) {
  const svg = s('svg', { viewBox: '0 0 100 150', width: size, height: size * 1.5, class: 'avatar', 'aria-hidden': 'true' });
  const v = applyVars(svg, look, kit);
  const clipId = `shirt-clip-${idSuffix}`;
  svg.append(
    s('defs', {}, s('clipPath', { id: clipId }, s('path', { d: 'M28 62 Q50 54 72 62 L78 100 L22 100 Z' }))),
    layer('hair-back', hairBack(v.hairStyle)),
    layer('legs', s('rect', { x: 36, y: 112, width: 11, height: 26, rx: 5, fill: 'var(--skin)' }), s('rect', { x: 53, y: 112, width: 11, height: 26, rx: 5, fill: 'var(--skin)' })),
    layer('socks', s('rect', { x: 35, y: 126, width: 13, height: 16, rx: 4, fill: 'var(--socks)' }), s('rect', { x: 52, y: 126, width: 13, height: 16, rx: 4, fill: 'var(--socks)' })),
    layer('boots', s('ellipse', { cx: 41, cy: 144, rx: 9, ry: 4.5, fill: '#1f2937' }), s('ellipse', { cx: 59, cy: 144, rx: 9, ry: 4.5, fill: '#1f2937' })),
    layer('shorts', s('path', { d: 'M27 98 L73 98 L76 118 L52 118 L50 110 L48 118 L24 118 Z', fill: 'var(--shorts)' })),
    layer('arms', s('rect', { x: 14, y: 64, width: 12, height: 38, rx: 6, fill: 'var(--skin)', transform: 'rotate(10 20 64)' }), s('rect', { x: 74, y: 64, width: 12, height: 38, rx: 6, fill: 'var(--skin)', transform: 'rotate(-10 80 64)' })),
    layer(
      'shirt',
      s('path', { d: 'M28 62 Q50 54 72 62 L78 100 L22 100 Z', fill: 'var(--shirt)' }),
      s('g', { 'clip-path': `url(#${clipId})`, 'data-layer': 'shirt-stripes' }, [30, 42, 54, 66].map((x) => s('rect', { x, y: 50, width: 6, height: 60, fill: 'var(--stripe)' }))),
      s('path', { d: 'M16 66 Q22 60 30 61 L28 76 L17 76 Z M84 66 Q78 60 70 61 L72 76 L83 76 Z', fill: 'var(--shirt)' })
    ),
    layer('neck', s('rect', { x: 45, y: 50, width: 10, height: 10, fill: 'var(--skin)' })),
    layer('head', s('circle', { cx: 50, cy: 35, r: 19, fill: 'var(--skin)' })),
    layer(
      'face',
      s('circle', { cx: 43, cy: 35, r: 2.2, fill: '#1f2937' }),
      s('circle', { cx: 57, cy: 35, r: 2.2, fill: '#1f2937' }),
      s('path', { d: 'M43 43 Q50 49 57 43', stroke: '#1f2937', 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round' })
    ),
    layer('hair-front', hairFront(v.hairStyle)),
    layer('headwear', headwear(v.hairStyle))
  );
  return svg;
}

function hairBack(style) {
  const f = { fill: 'var(--hair)' };
  switch (style) {
    case 'curls':
      return s('circle', { cx: 50, cy: 30, r: 26, ...f });
    case 'braids':
      return [s('rect', { x: 28, y: 30, width: 8, height: 36, rx: 4, ...f }), s('rect', { x: 64, y: 30, width: 8, height: 36, rx: 4, ...f })];
    case 'ponytail':
      return s('path', { d: 'M66 26 Q84 34 76 60 Q70 46 64 38 Z', ...f });
    case 'hijab':
      return s('path', { d: 'M26 36 Q26 10 50 10 Q74 10 74 36 L78 62 Q50 70 22 62 Z', ...f });
    default:
      return null;
  }
}

function hairFront(style) {
  const f = { fill: 'var(--hair)' };
  switch (style) {
    case 'short':
      return s('path', { d: 'M31 33 Q30 14 50 14 Q70 14 69 33 Q62 22 50 23 Q38 22 31 33 Z', ...f });
    case 'curls':
      return s('path', { d: 'M30 32 Q32 12 50 13 Q68 12 70 32 Q64 22 56 24 Q50 19 44 24 Q36 22 30 32 Z', ...f });
    case 'braids':
    case 'ponytail':
      return s('path', { d: 'M31 32 Q31 14 50 14 Q69 14 69 32 Q60 20 50 21 Q40 20 31 32 Z', ...f });
    case 'bun':
      return [s('circle', { cx: 50, cy: 12, r: 8, ...f }), s('path', { d: 'M31 32 Q31 15 50 15 Q69 15 69 32 Q60 21 50 22 Q40 21 31 32 Z', ...f })];
    default:
      return null;
  }
}

function headwear(style) {
  if (style !== 'hijab') return null;
  // Frames the face, drawn over the head.
  return s('path', { d: 'M28 38 Q28 14 50 14 Q72 14 72 38 L72 50 Q66 56 62 56 Q70 46 68 34 Q64 22 50 22 Q36 22 32 34 Q30 46 38 56 Q34 56 28 50 Z', fill: 'var(--hair)' });
}

// Top-down token for the pitch. Drawn around (0, 0), radius about 17 units.
// kit: 'us' or 'them'. The keeper colour is switched on with a class.
export function tokenSvg(look, kit = 'us') {
  const g = s('g', { class: `token token-${kit}` });
  const v = applyVars(g, look, kit);
  g.style.setProperty('--keeper-shirt', team.kit.keeper.shirt);
  g.style.setProperty('--their-keeper-shirt', team.kit.theirKeeper.shirt);
  const body = s('g', { class: 'token-body' });
  body.append(
    layer('token-hit', s('circle', { r: 30, class: 'token-hit' })),
    layer('token-halo', s('circle', { r: 24, class: 'token-halo' })),
    layer('token-wrong', s('circle', { r: 23, class: 'token-wrong' })),
    layer('token-you', s('circle', { r: 22, class: 'token-you-glow' }), s('circle', { r: 19, class: 'token-you-ring' })),
    layer('token-shadow', s('ellipse', { cx: 2, cy: 4, rx: 17, ry: 15, class: 'token-shadow' })),
    layer('token-shirt', s('circle', { r: 16, class: 'token-shirt', fill: kit === 'us' ? 'url(#stripes-us)' : 'var(--shirt)' })),
    layer('token-arms', s('circle', { cx: -15, cy: 0, r: 4.5, fill: 'var(--skin)' }), s('circle', { cx: 15, cy: 0, r: 4.5, fill: 'var(--skin)' })),
    layer('token-head', s('circle', { r: 8.5, fill: 'var(--skin)' })),
    layer('token-hair', tokenHair(v.hairStyle))
  );
  g.append(body);
  // "GK" under a keeper. Kept outside the body so it never turns upside down.
  g.append(s('g', { class: 'token-label', 'data-layer': 'token-label' }, s('rect', { x: -13, y: 20, width: 26, height: 15, rx: 4 }), s('text', { x: 0, y: 31.5, 'text-anchor': 'middle' }, 'GK')));
  return g;
}

// Seen from above, facing up the screen (towards their goal).
function tokenHair(style) {
  const f = { fill: 'var(--hair)' };
  switch (style) {
    case 'short':
      return s('path', { d: 'M-8.5 0 A8.5 8.5 0 0 0 8.5 0 Q0 -3 -8.5 0 Z', ...f });
    case 'curls':
      return s('path', { d: 'M-10 -1 A10 10 0 0 0 10 -1 Q0 -5 -10 -1 Z', ...f });
    case 'braids':
      return [s('path', { d: 'M-8.5 0 A8.5 8.5 0 0 0 8.5 0 Q0 -3 -8.5 0 Z', ...f }), s('rect', { x: -7, y: 6, width: 3.5, height: 9, rx: 1.7, ...f }), s('rect', { x: 3.5, y: 6, width: 3.5, height: 9, rx: 1.7, ...f })];
    case 'bun':
      return [s('path', { d: 'M-8.5 0 A8.5 8.5 0 0 0 8.5 0 Q0 -3 -8.5 0 Z', ...f }), s('circle', { cx: 0, cy: 8, r: 4.5, ...f })];
    case 'ponytail':
      return [s('path', { d: 'M-8.5 0 A8.5 8.5 0 0 0 8.5 0 Q0 -3 -8.5 0 Z', ...f }), s('ellipse', { cx: 0, cy: 11, rx: 3, ry: 6, ...f })];
    case 'hijab':
      return s('path', { d: 'M-9.5 -2 A9.5 9.5 0 1 0 9.5 -2 Q0 -6 -9.5 -2 Z', ...f });
    default:
      return null;
  }
}
