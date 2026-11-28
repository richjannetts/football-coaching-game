// 100 touches a day (Rich's winter chart, 28th November 2026). A grown-up
// sets how many touches and how many days. She taps once a day after her
// practice, and a ball fills the next space on the chart. Stickers come
// from the total, never from days in a row, so a missed day costs nothing:
// the first ball, half the chart, and a full chart.
// No imports, so it is easy to test.

// saved: what was stored (or null). start: { touches, days } to begin with.
export function readTouches(saved, start) {
  const s = saved && typeof saved === 'object' ? saved : {};
  return {
    touches: Number.isInteger(s.touches) && s.touches > 0 ? s.touches : start.touches,
    days: Number.isInteger(s.days) && s.days > 0 ? s.days : start.days,
    ticks: Array.isArray(s.ticks) ? s.ticks.filter((d) => typeof d === 'string') : [],
    set: !!s.set,
  };
}

// Today's date on this phone, as 2026-12-20.
export function dayKey(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

// One ball for today. added is false if today already has its ball, or the
// chart is full.
export function tickToday(state, today) {
  if (state.ticks.includes(today) || state.ticks.length >= state.days) return { state, added: false };
  return { state: { ...state, ticks: [...state.ticks, today] }, added: true };
}

export const isFull = (state) => state.ticks.length >= state.days;

// The sticker keys this chart has earned: saved in progress once won, so a
// new chart never takes a sticker away.
export function earnedKeys(state) {
  const n = state.ticks.length;
  const keys = [];
  if (n >= 1) keys.push('touches1');
  if (n >= Math.ceil(state.days / 2)) keys.push('touchesHalf');
  if (n >= state.days) keys.push('touchesAll');
  return keys;
}

// A grown-up changes the dials. Balls already on the chart stay, but never
// more than the new number of days.
export function setChart(state, { touches, days }) {
  return { ...state, touches, days, ticks: state.ticks.slice(0, days), set: true };
}

export const newChart = (state) => ({ ...state, ticks: [] });
