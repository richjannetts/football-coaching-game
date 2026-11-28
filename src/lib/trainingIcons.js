// Small pictures for the Training night tiles, drawn in code like the
// rest of the game. Each is drawn in a 60 by 60 box.

import { s } from './svg.js';
import { footballSvg } from './ball.js';

const NAVY = '#12305c';
const BLUE = '#2463eb';
const RED = '#e5372e';
const YELLOW = '#ffd028';
const ORANGE = '#f97316';

const dot = (cx, cy, fill, r = 7) => s('circle', { cx, cy, r, fill, stroke: '#fff', 'stroke-width': 2.5 });
const dash = (d, colour = YELLOW) => s('path', { d, fill: 'none', stroke: colour, 'stroke-width': 4, 'stroke-dasharray': '5 4', 'stroke-linecap': 'round' });
const ball = (x, y, r = 6) => {
  const b = footballSvg(r);
  b.setAttribute('transform', `translate(${x} ${y})`);
  return b;
};
const goal = (x, y, w = 30) => s('path', { d: `M${x} ${y + 10} V${y} H${x + w} V${y + 10}`, fill: 'none', stroke: NAVY, 'stroke-width': 3.5, 'stroke-linejoin': 'round' });
const cone = (x, y) => s('path', { d: `M${x - 5} ${y} L${x} ${y - 11} L${x + 5} ${y} Z`, fill: ORANGE });

const PICS = {
  ball: () => [ball(30, 30, 18)],
  shield: () => [s('path', { d: 'M30 8 L48 14 V30 Q48 46 30 54 Q12 46 12 30 V14 Z', fill: BLUE, stroke: NAVY, 'stroke-width': 3 }), s('path', { d: 'M30 8 V54', stroke: YELLOW, 'stroke-width': 5 })],
  gloves: () => [
    s('rect', { x: 16, y: 24, width: 28, height: 24, rx: 8, fill: ORANGE, stroke: NAVY, 'stroke-width': 2.5 }),
    [18, 25, 32, 39].map((x, i) => s('rect', { x, y: [14, 10, 10, 13][i], width: 6, height: 18, rx: 3, fill: ORANGE, stroke: NAVY, 'stroke-width': 2 })),
    s('rect', { x: 18, y: 46, width: 24, height: 7, rx: 2, fill: '#fff', stroke: NAVY, 'stroke-width': 2 }),
  ],
  dribble: () => [cone(18, 44), cone(42, 30), dash('M10 54 Q30 46 26 34 Q22 22 44 16'), dot(10, 52, BLUE), ball(46, 14, 5)],
  pass: () => [dot(14, 46, BLUE), dash('M20 42 L42 20'), dot(46, 16, BLUE), ball(21, 50, 5)],
  shoot: () => [goal(15, 8), dash('M30 50 L26 20'), dot(30, 52, BLUE, 6), ball(25, 18, 5)],
  tackle: () => [dot(18, 22, RED), ball(30, 32, 6), dot(42, 42, BLUE), s('path', { d: 'M38 36 L32 32', stroke: NAVY, 'stroke-width': 4, 'stroke-linecap': 'round' })],
  press: () => [dot(16, 16, RED), ball(24, 22, 5), dot(42, 46, BLUE), s('path', { d: 'M38 40 L28 28 M28 36 V28 H36', fill: 'none', stroke: YELLOW, 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })],
  intercept: () => [dot(12, 16, RED), dash('M16 20 L46 46', RED), dot(48, 48, RED), dot(30, 32, BLUE, 8)],
  line: () => [goal(15, 46, 30), dash('M30 48 L42 12'), s('circle', { cx: 34, cy: 38, r: 7, fill: ORANGE, stroke: '#fff', 'stroke-width': 2.5 }), dot(44, 10, RED, 6)],
  save: () => [goal(10, 40, 40), s('circle', { cx: 30, cy: 34, r: 8, fill: ORANGE, stroke: '#fff', 'stroke-width': 2.5 }), ball(30, 18, 6)],
  playout: () => [goal(15, 46, 30), s('circle', { cx: 30, cy: 42, r: 7, fill: ORANGE, stroke: '#fff', 'stroke-width': 2.5 }), dash('M34 38 L48 18'), dot(50, 14, BLUE, 6)],
};

export function trainingPic(name, size = 44) {
  return s('svg', { viewBox: '0 0 60 60', width: size, height: size, class: 'tile-pic', 'aria-hidden': 'true' }, ...(PICS[name] || PICS.ball)().flat());
}

// The two doors on the opening screen.
export function matchDayDoor() {
  return s(
    'svg',
    { viewBox: '0 0 300 150', class: 'door-art', 'aria-hidden': 'true', preserveAspectRatio: 'xMidYMax slice' },
    s('rect', { y: 98, width: 300, height: 52, fill: '#35b05c' }),
    s('rect', { y: 98, width: 300, height: 5, fill: '#2ea252' }),
    s('circle', { cx: 252, cy: 34, r: 20, fill: YELLOW }),
    s('rect', { x: 58, y: 22, width: 120, height: 40, rx: 9, fill: NAVY }),
    s('text', { x: 118, y: 50, 'text-anchor': 'middle', class: 'door-score' }, '1 – 0'),
    s('path', { d: 'M104 102 V70 H192 V102', fill: 'none', stroke: '#fff', 'stroke-width': 5, 'stroke-linejoin': 'round' }),
    ball(226, 106, 11)
  );
}

export function trainingDoor() {
  return s(
    'svg',
    { viewBox: '0 0 300 150', class: 'door-art', 'aria-hidden': 'true', preserveAspectRatio: 'xMidYMax slice' },
    s('rect', { y: 98, width: 300, height: 52, fill: '#2a8f49' }),
    s('rect', { y: 98, width: 300, height: 5, fill: '#237a3e' }),
    s('circle', { cx: 52, cy: 36, r: 18, fill: '#fdf3c4' }),
    s('circle', { cx: 61, cy: 31, r: 17, fill: '#323c86' }),
    [
      [130, 22],
      [180, 46],
      [228, 20],
      [104, 60],
    ].map(([cx, cy]) => s('circle', { cx, cy, r: 2, fill: '#fff', opacity: 0.8 })),
    s('rect', { x: 182, y: 30, width: 6, height: 70, fill: '#cfd8e3' }),
    s('ellipse', { cx: 185, cy: 30, rx: 16, ry: 8, fill: '#fff8c4' }),
    [214, 244].map((x) => s('path', { d: `M${x - 7} 112 L${x} 94 L${x + 7} 112 Z`, fill: ORANGE })),
    ball(276, 106, 10)
  );
}
