// The match clock on the menu (Rich's choice, 27th November 2026). A
// match is 40 minutes: two halves of 20. Each level is a moment in the
// match, placed round a clock face from kick-off at the top, through
// half-time at the bottom, to full time back at the top. The hand points
// at the moment to play next, and the green part shows the time played.
// No imports: easy to test.

export const MATCH_MINUTES = 40;
export const HALF_MINUTES = 20;
// The dial leaves a small gap at the top, so the kick-off and the last
// minute never sit on top of each other. Angles are in degrees, clockwise
// from the top.
const GAP = 15;
export const angleFor = (minute) => GAP + (minute / MATCH_MINUTES) * (360 - 2 * GAP);
// Ring radius and marker size, as a percent of the clock's width.
export const RING = 37;
export const MARKER = 15;

// The minute of each moment. The first half's moments are spread from
// kick-off to 16 minutes (so there is room for half-time), the second half's from 20 to 39, so the last
// one is always "the last minute". halves: [[1, 2, ...], [7, 8, ...]].
// Returns [{ level, half, minute }] in the order they are played. minute
// is exact (for drawing); shown is the whole minute to say or show.
// minutes: { level: minute } to place some moments by hand.
export function momentsFor(halves, minutes = {}) {
  const out = [];
  halves.forEach((levels, h) => {
    const start = h * HALF_MINUTES;
    const end = h === halves.length - 1 ? MATCH_MINUTES - 1 : start + HALF_MINUTES - 4;
    levels.forEach((level, k) => {
      const even = levels.length === 1 ? start : start + ((end - start) * k) / (levels.length - 1);
      const minute = minutes[level] ?? even;
      out.push({ level, half: h, minute, shown: Math.round(minute) });
    });
  });
  return out;
}

// Where a minute sits on the clock, as percent of the clock's width.
export function pointAt(minute, radius = RING) {
  const a = (angleFor(minute) * Math.PI) / 180;
  return { x: 50 + radius * Math.sin(a), y: 50 - radius * Math.cos(a) };
}

// An SVG arc along the ring, in a 0 to 100 viewBox, from one minute to
// another. Empty when there is nothing to draw.
export function arcPath(fromMinute, toMinute, radius = RING) {
  if (toMinute <= fromMinute) return '';
  const a = pointAt(fromMinute, radius);
  const b = pointAt(toMinute, radius);
  const large = angleFor(toMinute) - angleFor(fromMinute) > 180 ? 1 : 0;
  return `M${a.x.toFixed(2)} ${a.y.toFixed(2)} A${radius} ${radius} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

// The order the levels are played in, from the halves.
export const orderOf = (halves) => halves.flat();

// Which level she plays next: the first one in the order not finished.
// Null when every level is finished.
export function nextLevel(order, progress) {
  return order.find((n) => !progress[`ch${n}`]) ?? null;
}

// The level after this one in the order, or null at the end.
export function levelAfter(order, level) {
  const i = order.indexOf(level);
  return i < 0 || i === order.length - 1 ? null : order[i + 1];
}

// The whole clock for the menu. halves: the round's levels, half by half.
// progress: what is saved, e.g. { ch1: true, bonus1: true }.
export function buildClock(halves, progress = {}, minutes = {}) {
  const order = orderOf(halves);
  const next = nextLevel(order, progress);
  const moments = momentsFor(halves, minutes);
  const markers = moments.map((m, i) => {
    const done = !!progress[`ch${m.level}`];
    return {
      ...m,
      number: i + 1, // the moment's place in this match: what the marker shows
      ...pointAt(m.minute),
      state: done ? 'done' : m.level === next ? 'now' : 'locked',
      bonus: !!progress[`bonus${m.level}`],
    };
  });
  // The hand points at the moment to play next, or at full time.
  const at = next == null ? markers.length - 1 : order.indexOf(next);
  const handMinute = next == null ? MATCH_MINUTES : markers[at].minute;
  return {
    markers,
    at,
    allDone: next == null,
    handMinute,
    handAngle: next == null ? 360 : angleFor(handMinute),
    // The green part: time played so far.
    played: arcPath(0, Math.min(handMinute, MATCH_MINUTES), RING),
    halfTime: pointAt(HALF_MINUTES, RING),
  };
}

// The minute of a level in this order, for the scoreboard.
export function minuteOf(halves, level, minutes = {}) {
  return momentsFor(halves, minutes).find((m) => m.level === level)?.shown ?? null;
}
