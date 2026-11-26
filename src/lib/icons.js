// Simple icons drawn in code.
import { s } from './svg.js';

const icon = (...children) => s('svg', { viewBox: '0 0 48 48', class: 'icon', 'aria-hidden': 'true' }, ...children);

export const homeIcon = () => icon(s('path', { d: 'M8 24 L24 9 L40 24 M13 20 V40 H35 V20', class: 'icon-stroke' }), s('rect', { x: 20, y: 28, width: 8, height: 12, class: 'icon-fill' }));

export const speakerIcon = () =>
  icon(
    s('path', { d: 'M8 19 H16 L26 10 V38 L16 29 H8 Z', class: 'icon-fill' }),
    s('path', { d: 'M31 17 Q36 24 31 31 M35 12 Q44 24 35 36', class: 'icon-stroke' })
  );

export const tickIcon = () => icon(s('path', { d: 'M10 25 L20 35 L38 13', class: 'icon-stroke icon-thick' }));

export const ballIcon = (filled = true) =>
  s(
    'svg',
    { viewBox: '0 0 48 48', class: `icon football${filled ? '' : ' is-empty'}`, 'aria-hidden': 'true' },
    s('circle', { cx: 24, cy: 24, r: 20, class: 'football-shape' }),
    s('path', { d: 'M24 15 L32 21 L29 31 L19 31 L16 21 Z', class: 'football-patch' }),
    s('path', { d: 'M24 15 V5 M32 21 L42 17 M29 31 L35 40 M19 31 L13 40 M16 21 L6 17', class: 'football-seam' })
  );

export const nextIcon = () => icon(s('path', { d: 'M12 24 H36 M26 13 L37 24 L26 35', class: 'icon-stroke icon-thick' }));

export const backIcon = () => icon(s('path', { d: 'M36 24 H12 M22 13 L11 24 L22 35', class: 'icon-stroke icon-thick' }));

export const lockIcon = () => icon(s('rect', { x: 12, y: 22, width: 24, height: 18, rx: 3, class: 'icon-fill' }), s('path', { d: 'M17 22 V16 A7 7 0 0 1 31 16 V22', class: 'icon-stroke' }));

export const shareIcon = () => icon(s('path', { d: 'M16 18 H12 V42 H36 V18 H32 M24 6 V30 M16 13 L24 5 L32 13', class: 'icon-stroke' }));

export const plusSquareIcon = () => icon(s('rect', { x: 8, y: 8, width: 32, height: 32, rx: 7, class: 'icon-stroke' }), s('path', { d: 'M24 16 V32 M16 24 H32', class: 'icon-stroke' }));

// A mini pitch picture for the chapter buttons. side: 'ours' or 'theirs'.
export function chapterPicture(side) {
  const svg = s('svg', { viewBox: '0 0 60 80', class: 'chapter-pic', 'aria-hidden': 'true' });
  svg.append(
    s('rect', { x: 2, y: 2, width: 56, height: 76, rx: 4, class: 'mini-grass' }),
    s('line', { x1: 2, y1: 40, x2: 58, y2: 40, class: 'mini-line' }),
    s('circle', { cx: 30, cy: 40, r: 10, class: 'mini-ring' })
  );
  // Only the kicker and the other team: the picture must not give away our shape.
  const them = side === 'ours' ? [[30, 6], [30, 20], [14, 30], [46, 30], [38, 28]] : [[30, 6], [30, 20], [18, 35], [42, 35]];
  them.forEach(([x, y]) => svg.append(s('circle', { cx: x, cy: y, r: 4, class: 'mini-them' })));
  svg.append(s('circle', { cx: 30, cy: 40, r: 4.5, class: side === 'ours' ? 'mini-us' : 'mini-them' }));
  svg.append(s('circle', { cx: 30, cy: 40, r: 2, class: 'mini-ball' }));
  return svg;
}

// A football sticker, the award for finishing a level. Bright, with a
// starburst, a shine and the level number, like a collectable sticker.
const STICKER_COLOURS = [
  { burst: '#facc15', ring: '#1d4ed8', badge: '#1d4ed8' },
  { burst: '#22d3ee', ring: '#f97316', badge: '#f97316' },
  { burst: '#a3e635', ring: '#7c3aed', badge: '#7c3aed' },
];

export function stickerSvg(level, earned = true) {
  const svg = s('svg', { viewBox: '0 0 120 120', class: `sticker${earned ? '' : ' is-empty'}`, 'aria-hidden': 'true' });
  if (!earned) {
    svg.append(s('circle', { cx: 60, cy: 60, r: 50, class: 'sticker-slot' }), s('text', { x: 60, y: 72, 'text-anchor': 'middle', class: 'sticker-slot-text' }, String(level)));
    return svg;
  }
  const c = STICKER_COLOURS[(level - 1) % STICKER_COLOURS.length];
  const points = [];
  for (let i = 0; i < 24; i++) {
    const r = i % 2 ? 44 : 56;
    const a = (Math.PI * 2 * i) / 24 - Math.PI / 2;
    points.push(`${(60 + r * Math.cos(a)).toFixed(1)},${(60 + r * Math.sin(a)).toFixed(1)}`);
  }
  const star = (x, y, r) => {
    const p = [];
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 ? r * 0.45 : r;
      const a = (Math.PI * 2 * i) / 10 - Math.PI / 2;
      p.push(`${(x + rr * Math.cos(a)).toFixed(1)},${(y + rr * Math.sin(a)).toFixed(1)}`);
    }
    return s('polygon', { points: p.join(' '), class: 'sticker-star' });
  };
  svg.append(
    s('polygon', { points: points.join(' '), fill: '#fff', class: 'sticker-edge', transform: 'translate(60 60) scale(1.08) translate(-60 -60)' }),
    s('polygon', { points: points.join(' '), fill: c.burst }),
    s('circle', { cx: 60, cy: 60, r: 34, fill: c.ring }),
    s('circle', { cx: 60, cy: 60, r: 27, fill: '#fff', stroke: '#1f2937', 'stroke-width': 2.5 }),
    s('path', { d: 'M60 48 L71 56 L67 69 L53 69 L49 56 Z', fill: '#1f2937' }),
    s('path', { d: 'M60 48 V34 M71 56 L84 51 M67 69 L75 81 M53 69 L45 81 M49 56 L36 51', stroke: '#1f2937', 'stroke-width': 2.5 }),
    star(22, 24, 9),
    star(99, 98, 8),
    star(101, 26, 6),
    s('path', { d: 'M30 30 Q60 6 92 26 Q62 18 34 40 Z', class: 'sticker-shine' }),
    s('circle', { cx: 96, cy: 90, r: 14, fill: c.badge, stroke: '#fff', 'stroke-width': 3 }),
    s('text', { x: 96, y: 96, 'text-anchor': 'middle', class: 'sticker-num' }, String(level))
  );
  return svg;
}

// A little pitch for a bonus question option. Positions are in yards,
// with our goal at the bottom, the same way round as the big pitch.
export function quizPicture(pic, length = 40, width = 30) {
  const Y = (y) => length - y;
  const svg = s('svg', { viewBox: `-1 -1 ${width + 2} ${length + 2}`, class: 'quiz-pic', 'aria-hidden': 'true' });
  svg.append(
    s('rect', { x: 0, y: 0, width, height: length, rx: 1.5, class: 'quiz-grass' }),
    s('line', { x1: 0, y1: length / 2, x2: width, y2: length / 2, class: 'quiz-line' }),
    s('rect', { x: width / 2 - 2, y: -0.8, width: 4, height: 0.8, class: 'quiz-goal' }),
    s('rect', { x: width / 2 - 2, y: length, width: 4, height: 0.8, class: 'quiz-goal' })
  );
  if (pic.ring) svg.append(s('circle', { cx: pic.ball[0], cy: Y(pic.ball[1]), r: 5, class: 'quiz-ring' }));
  (pic.them || []).forEach(([x, y]) => svg.append(s('circle', { cx: x, cy: Y(y), r: 1.6, class: 'quiz-them' })));
  (pic.us || []).forEach(([x, y]) => svg.append(s('circle', { cx: x, cy: Y(y), r: 1.6, class: 'quiz-us' })));
  if (pic.arrow) {
    const [[x1, y1], [x2, y2]] = pic.arrow;
    const a = Math.atan2(Y(y2) - Y(y1), x2 - x1);
    const head = [0.5, -0.5].map((t) => `${(x2 - 2.6 * Math.cos(a + t)).toFixed(2)},${(Y(y2) - 2.6 * Math.sin(a + t)).toFixed(2)}`);
    svg.append(
      s('line', { x1, y1: Y(y1), x2: x2 - 1.2 * Math.cos(a), y2: Y(y2) - 1.2 * Math.sin(a), class: 'quiz-arrow' }),
      s('polygon', { points: `${x2},${Y(y2)} ${head.join(' ')}`, class: 'quiz-arrow-head' })
    );
  }
  if (pic.ball) svg.append(s('circle', { cx: pic.ball[0], cy: Y(pic.ball[1]), r: 0.9, class: 'quiz-ball' }));
  return svg;
}

// A gold bonus sticker, for getting a level's bonus question right.
export function bonusStickerSvg(level, earned = true) {
  const svg = s('svg', { viewBox: '0 0 120 120', class: `sticker bonus${earned ? '' : ' is-empty'}`, 'aria-hidden': 'true' });
  const star = (cx, cy, r, inner) => {
    const p = [];
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 ? r * inner : r;
      const a = (Math.PI * 2 * i) / 10 - Math.PI / 2;
      p.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
    }
    return p.join(' ');
  };
  if (!earned) {
    svg.append(s('polygon', { points: star(60, 62, 52, 0.5), class: 'sticker-slot' }), s('text', { x: 60, y: 76, 'text-anchor': 'middle', class: 'sticker-slot-text' }, '?'));
    return svg;
  }
  svg.append(
    s('polygon', { points: star(60, 62, 56, 0.52), fill: '#fff', class: 'sticker-edge' }),
    s('polygon', { points: star(60, 62, 50, 0.52), fill: '#f59e0b' }),
    s('polygon', { points: star(60, 62, 38, 0.52), fill: '#fde047' }),
    s('circle', { cx: 60, cy: 64, r: 15, fill: '#7c3aed', stroke: '#fff', 'stroke-width': 3 }),
    s('text', { x: 60, y: 71, 'text-anchor': 'middle', class: 'sticker-num' }, String(level)),
    s('path', { d: 'M38 34 Q60 18 82 34 Q60 28 42 42 Z', class: 'sticker-shine' }),
    s('rect', { x: 26, y: 92, width: 68, height: 20, rx: 6, fill: '#7c3aed', stroke: '#fff', 'stroke-width': 3 }),
    s('text', { x: 60, y: 107, 'text-anchor': 'middle', class: 'sticker-bonus-text' }, 'BONUS')
  );
  return svg;
}
