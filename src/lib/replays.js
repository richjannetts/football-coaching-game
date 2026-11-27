// Playing a match again against a new team, without losing anything she
// has already won (Rich, 27th November 2026). The lessons stay in the same
// order. Each replay brings a new made-up team, may switch some levels to
// the other side of the pitch, and has its own full-time ending.
//
// What is saved (store key 'replays'):
//   { played: 2,                     replays started so far
//     finished: { easy: 1, ... },    whole matches finished on each difficulty
//     current: null or {
//       match: 'm1', number: 2, difficulty: 'medium',
//       opponent: { name, kit },     the team she is playing this time
//       mirror: [5, 9],              levels played on the other side
//       ending: 1,                   which full-time ending
//       done: [1, 2],                levels finished in this replay
//       goals: { us: 0, them: 0 }    extra goals on Difficult (see difficulty.json)
//     } }
// No imports, so it is easy to test.

export const emptyReplays = () => ({ played: 0, finished: {}, current: null });

// Tidy whatever was saved, so an old or broken record never stops the game.
export function readReplays(saved) {
  const r = saved && typeof saved === 'object' ? saved : {};
  const cur = r.current && typeof r.current === 'object' ? r.current : null;
  return {
    played: Number.isInteger(r.played) && r.played > 0 ? r.played : 0,
    finished: r.finished && typeof r.finished === 'object' ? { ...r.finished } : {},
    current: cur && cur.opponent && cur.difficulty
      ? {
          ...cur,
          mirror: Array.isArray(cur.mirror) ? cur.mirror : [],
          done: Array.isArray(cur.done) ? cur.done : [],
          goals: { us: cur.goals?.us || 0, them: cur.goals?.them || 0 },
          ending: Number.isInteger(cur.ending) ? cur.ending : 0,
        }
      : null,
  };
}

// The colours a kit shows from a distance.
const shirtColours = (k) => (k.pattern === 'plain' ? [k.shirt] : [k.shirt, k.stripe]);

// The next team in the list that does not clash with our kit, so each
// replay is against someone new. Skips the team she just played.
export function pickOpponent(opponents, ourKit, played, lastName = null) {
  const ours = shirtColours(ourKit);
  const ok = (o) => !shirtColours(o.kit).some((c) => ours.includes(c)) && o.name !== lastName;
  for (let k = 0; k < opponents.length; k++) {
    const o = opponents[(played + k) % opponents.length];
    if (ok(o)) return o;
  }
  return opponents[played % opponents.length];
}

// Can she choose this difficulty yet? Difficult opens once she has
// finished a whole match on Medium (or on Difficult itself).
export function isUnlocked(state, difficulty, levels) {
  const need = levels[difficulty]?.unlockAfter;
  if (!need) return true;
  const order = Object.keys(levels);
  return order.slice(order.indexOf(need)).some((d) => (state.finished[d] || 0) > 0);
}

// Start a replay. rand: a function giving 0 to 1, so tests can fix it.
export function startReplay(state, { match, difficulty, opponents, ourKit, mirrorable = [], endings = 1, rand = Math.random }) {
  const number = state.played + 1;
  const lastName = state.current?.opponent?.name || null;
  const opponent = pickOpponent(opponents, ourKit, state.played, lastName);
  let mirror = mirrorable.filter(() => rand() < 0.5);
  // Always switch at least one level, so a replay never looks the same.
  if (!mirror.length && mirrorable.length) mirror = [mirrorable[Math.floor(rand() * mirrorable.length) % mirrorable.length]];
  return {
    ...state,
    played: number,
    current: {
      match,
      number,
      difficulty,
      opponent: { name: opponent.name, kit: { ...opponent.kit } },
      mirror,
      // The first time through uses ending 0, so replays go 1, 2, 0, 1...
      ending: number % Math.max(1, endings),
      done: [],
      goals: { us: 0, them: 0 },
    },
  };
}

// She finished a level in the replay. matchLevels: the match's levels in
// order. Returns the new state, whether this was the first time this level
// was finished in the replay, and whether the whole match is now done.
export function finishReplayLevel(state, level, matchLevels) {
  const cur = state.current;
  if (!cur) return { state, firstTime: false, matchDone: false };
  const firstTime = !cur.done.includes(level);
  const done = firstTime ? [...cur.done, level] : cur.done;
  const matchDone = matchLevels.every((n) => done.includes(n));
  if (!matchDone) return { state: { ...state, current: { ...cur, done } }, firstTime, matchDone };
  const finished = { ...state.finished, [cur.difficulty]: (state.finished[cur.difficulty] || 0) + 1 };
  return { state: { ...state, finished, current: null, last: { ...cur, done } }, firstTime, matchDone };
}

// An extra goal on Difficult. side: 'us' or 'them'.
export function addGoal(state, side) {
  const cur = state.current;
  if (!cur) return state;
  return { ...state, current: { ...cur, goals: { ...cur.goals, [side]: cur.goals[side] + 1 } } };
}

// The path during a replay: levels finished in this replay are green and
// the next one glows. Bonus stickers she has won still show.
export function pathProgress(state, progress) {
  if (!state.current) return progress;
  const out = {};
  for (const [k, v] of Object.entries(progress)) if (k.startsWith('bonus')) out[k] = v;
  for (const n of state.current.done) out[`ch${n}`] = true;
  return out;
}
