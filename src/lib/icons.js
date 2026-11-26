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
