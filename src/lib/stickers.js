// Album stickers, drawn in code. Each is a small card, 100 by 128: a white
// edge, a bright background, a picture, a name plate and a number, like
// the football sticker books parents remember. No badges, no real teams.

import { s } from './svg.js';
import { avatarFigure } from './avatar.js';

let count = 0;

const star = (cx, cy, r, inner = 0.45) => {
  const p = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * inner : r;
    const a = (Math.PI * 2 * i) / 10 - Math.PI / 2;
    p.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return p.join(' ');
};

// Kit bag pictures, drawn around the middle of the card (50, 54).
const INK = '#1f2937';
const ITEMS = {
  ball: () => [
    s('circle', { cx: 50, cy: 54, r: 27, fill: '#fff', stroke: INK, 'stroke-width': 3.5 }),
    s('path', { d: 'M50 42 L61.5 50.5 L57 64 L43 64 L38.5 50.5 Z', fill: INK }),
    s('path', { d: 'M50 42 V28 M61.5 50.5 L75 46 M57 64 L65 76 M43 64 L35 76 M38.5 50.5 L25 46', stroke: INK, 'stroke-width': 3.5, 'stroke-linecap': 'round', fill: 'none' }),
  ],
  boots: () => [
    s('path', { d: 'M22 44 Q22 36 30 36 L40 36 Q42 48 56 52 L72 56 Q80 58 80 66 L80 70 L22 70 Z', fill: INK }),
    s('path', { d: 'M42 46 L50 40 M47 50 L55 44 M53 53 L60 48', stroke: '#fff', 'stroke-width': 3, 'stroke-linecap': 'round' }),
    s('path', { d: 'M22 62 H80 V70 H22 Z', fill: '#ffd028' }),
    [28, 40, 52, 64, 74].map((x) => s('rect', { x: x - 2.5, y: 70, width: 5, height: 6, rx: 1.5, fill: INK })),
  ],
  gloves: () => [
    [30, 40, 50, 60].map((x, i) => s('rect', { x, y: [34, 28, 28, 33][i], width: 9, height: 26, rx: 4.5, fill: '#f97316', stroke: INK, 'stroke-width': 2 })),
    s('rect', { x: 62, y: 48, width: 9, height: 20, rx: 4.5, fill: '#f97316', stroke: INK, 'stroke-width': 2, transform: 'rotate(-35 66 66)' }),
    s('rect', { x: 28, y: 48, width: 42, height: 26, rx: 9, fill: '#f97316', stroke: INK, 'stroke-width': 2 }),
    s('rect', { x: 32, y: 72, width: 34, height: 9, rx: 3, fill: '#fff', stroke: INK, 'stroke-width': 2 }),
    s('circle', { cx: 49, cy: 60, r: 6, fill: '#ffd028' }),
  ],
  cone: () => [
    s('rect', { x: 22, y: 72, width: 56, height: 9, rx: 4, fill: '#ea580c', stroke: INK, 'stroke-width': 2 }),
    s('path', { d: 'M44 28 Q50 24 56 28 L70 73 H30 Z', fill: '#f97316', stroke: INK, 'stroke-width': 2, 'stroke-linejoin': 'round' }),
    s('path', { d: 'M39.5 46 H60.5 L63.5 56 H36.5 Z', fill: '#fff' }),
  ],
  whistle: () => [
    s('path', { d: 'M60 30 Q74 20 78 34', stroke: '#2563eb', 'stroke-width': 3.5, fill: 'none', 'stroke-linecap': 'round' }),
    s('rect', { x: 24, y: 42, width: 36, height: 14, rx: 3, fill: '#e5e7eb', stroke: INK, 'stroke-width': 2.5 }),
    s('circle', { cx: 60, cy: 56, r: 18, fill: '#e5e7eb', stroke: INK, 'stroke-width': 2.5 }),
    s('circle', { cx: 60, cy: 56, r: 6.5, fill: INK }),
    s('rect', { x: 55, y: 34, width: 10, height: 8, rx: 2, fill: '#e5e7eb', stroke: INK, 'stroke-width': 2.5 }),
  ],
  bottle: () => [
    s('rect', { x: 43, y: 22, width: 14, height: 10, rx: 3, fill: '#ffd028', stroke: INK, 'stroke-width': 2 }),
    s('path', { d: 'M40 32 H60 L64 42 V78 Q64 84 58 84 H42 Q36 84 36 78 V42 Z', fill: '#2563eb', stroke: INK, 'stroke-width': 2, 'stroke-linejoin': 'round' }),
    s('rect', { x: 36, y: 52, width: 28, height: 14, fill: '#fff' }),
    s('path', { d: 'M41 59 H59', stroke: '#2563eb', 'stroke-width': 3, 'stroke-linecap': 'round' }),
  ],
};

const trophy = () => [
  s('path', { d: 'M33 30 H67 V44 Q67 62 50 64 Q33 62 33 44 Z', fill: '#ffb020', stroke: '#fff', 'stroke-width': 3, 'stroke-linejoin': 'round' }),
  s('path', { d: 'M33 34 H24 Q24 50 36 52 M67 34 H76 Q76 50 64 52', stroke: '#ffb020', 'stroke-width': 4.5, fill: 'none', 'stroke-linecap': 'round' }),
  s('rect', { x: 46, y: 62, width: 8, height: 10, fill: '#ffb020' }),
  s('rect', { x: 36, y: 71, width: 28, height: 9, rx: 3, fill: '#ffb020', stroke: '#fff', 'stroke-width': 2.5 }),
  s('polygon', { points: star(50, 44, 9), fill: '#fff' }),
];

function plate(name, colour) {
  const text = s('text', { x: 50, y: 115.5, 'text-anchor': 'middle', class: 'card-name' }, name.toUpperCase());
  // A long name is squeezed to fit the plate.
  if (name.length > 8) {
    text.setAttribute('textLength', 80);
    text.setAttribute('lengthAdjust', 'spacingAndGlyphs');
  }
  return [s('path', { d: 'M5 97 H95 V117 a6 6 0 0 1 -6 6 H11 a6 6 0 0 1 -6 -6 Z', fill: colour }), text];
}

const number = (no) => [s('circle', { cx: 19, cy: 19, r: 10, class: 'card-num-disc' }), s('text', { x: 19, y: 23.3, 'text-anchor': 'middle', class: 'card-num' }, String(no))];

// One sticker she has. st: a sticker from buildAlbum().
export function stickerCard(st) {
  const svg = s('svg', { viewBox: '0 0 100 128', class: `card card-${st.kind}`, role: 'img', 'aria-label': `Sticker ${st.no}: ${st.name}` });
  svg.append(s('rect', { width: 100, height: 128, rx: 9, fill: '#fff' }));
  if (st.kind === 'shiny') {
    const id = `shine-${++count}`;
    svg.append(
      s(
        'defs',
        {},
        s(
          'linearGradient',
          { id, x1: 0, y1: 0, x2: 1, y2: 1 },
          [
            [0, '#fff2a8'],
            [0.3, '#a8f0ff'],
            [0.55, '#d6c8ff'],
            [0.8, '#fff2a8'],
            [1, '#a8f0ff'],
          ].map(([offset, c]) => s('stop', { offset, 'stop-color': c }))
        )
      ),
      s('rect', { x: 5, y: 5, width: 90, height: 118, rx: 6, fill: `url(#${id})` }),
      s('path', { d: 'M5 40 L60 5 H78 L5 62 Z M40 123 L95 70 V88 L62 123 Z', fill: '#fff', opacity: 0.45 }),
      ...trophy(),
      ...plate(st.name, '#7b4dff'),
      ...number(st.no)
    );
    return svg;
  }
  const bg = st.bg || ['#8fd2ff', '#ffd028'];
  svg.append(s('rect', { x: 5, y: 5, width: 90, height: 118, rx: 6, fill: bg[0] }), s('path', { d: 'M5 66 L95 24 V52 L5 94 Z', fill: bg[1] }));
  if (st.kind === 'item') svg.append(...(ITEMS[st.item] || ITEMS.ball)().flat());
  else svg.append(avatarFigure(st.look, { kit: st.kit, pattern: st.kind === 'coach' ? 'coach' : st.pattern, x: 10, y: 14, width: 80, height: 88 }));
  svg.append(...plate(st.name, '#12305c'), ...number(st.no));
  return svg;
}

// The numbered space for a sticker she has not won yet: a grey outline.
export function emptyCard(st) {
  const svg = s('svg', { viewBox: '0 0 100 128', class: 'card card-empty', role: 'img', 'aria-label': `Space ${st.no}: not won yet` });
  svg.append(s('rect', { x: 3, y: 3, width: 94, height: 122, rx: 8, class: 'slot-edge' }));
  if (st.kind === 'shiny') svg.append(s('polygon', { points: star(50, 50, 26), class: 'slot-line' }));
  else if (st.kind === 'item') svg.append(s('circle', { cx: 50, cy: 52, r: 24, class: 'slot-shape' }));
  else svg.append(s('circle', { cx: 50, cy: 42, r: 17, class: 'slot-shape' }), s('path', { d: 'M22 96 Q22 66 50 66 Q78 66 78 96 Z', class: 'slot-shape' }));
  svg.append(s('text', { x: 50, y: 119, 'text-anchor': 'middle', class: 'slot-num' }, String(st.no)));
  return svg;
}
