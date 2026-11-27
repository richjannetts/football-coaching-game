// The cup run (Rich's choice, 27th November 2026). The matches make a cup:
// Round 1, then the semi-final, then the final. Each round is harder than
// the one before (Easy, Medium, Difficult), and each plays the moments of
// the match in its own order, so every match feels different while still
// covering every rule. Winning the final wins the cup. Then a new cup can
// start, against new teams.
//
// What is saved (store key 'cup'):
//   { round: 1,   the round she is on: being played, or next to play
//     won: 0 }    cups won so far
// The rounds themselves are in src/data/levels.json ("cup").
// No imports, so it is easy to test.

export const emptyCup = () => ({ round: 0, won: 0 });

// Tidy whatever was saved. firstMatchDone: has she finished the first
// time through the match? Players from before the cup existed have, so
// they have already won Round 1 and are on to the next round.
export function readCup(saved, rounds, firstMatchDone = false) {
  const c = saved && typeof saved === 'object' ? saved : null;
  if (!c) return firstMatchDone ? { round: Math.min(1, rounds.length - 1), won: 0 } : emptyCup();
  const round = Number.isInteger(c.round) && c.round >= 0 && c.round < rounds.length ? c.round : 0;
  const won = Number.isInteger(c.won) && c.won > 0 ? c.won : 0;
  return { round, won };
}

// She won a round. Returns the new state, and whether that was the final.
export function winRound(cup, rounds) {
  const last = cup.round >= rounds.length - 1;
  if (last) return { cup: { round: 0, won: cup.won + 1 }, cupWon: true };
  return { cup: { ...cup, round: cup.round + 1 }, cupWon: false };
}

// The rounds for the cup screen and the menu: won, now (the one being
// played or next), or still to come.
export function ladder(rounds, cup) {
  return rounds.map((r, i) => ({ ...r, index: i, state: i < cup.round ? 'won' : i === cup.round ? 'now' : 'next' }));
}

// The score before a level starts, from the story's goals in the levels
// played before it in this order. storyGoals: { "1": "us", "6": "them" }.
export function scoreBefore(storyGoals, order, level) {
  const score = { us: 0, them: 0 };
  for (const n of order) {
    if (n === level) break;
    const side = storyGoals[String(n)];
    if (side) score[side] += 1;
  }
  return score;
}

// Is this order a match that makes sense? The story needs a few moments in
// fixed places (see levels.json "fixed"). Returns a list of problems, empty
// when all is well. allLevels: every level the match must cover.
export function orderProblems(halves, { allLevels, fixed, before = [] }) {
  const problems = [];
  const order = halves.flat();
  const missing = allLevels.filter((n) => !order.includes(n));
  const extra = order.filter((n, i) => !allLevels.includes(n) || order.indexOf(n) !== i);
  if (missing.length) problems.push(`missing levels ${missing.join(', ')}`);
  if (extra.length) problems.push(`unknown or repeated levels ${extra.join(', ')}`);
  halves.forEach((half, h) => {
    const want = fixed[h] || {};
    (want.start || []).forEach((n, k) => {
      if (half[k] !== n) problems.push(`half ${h + 1} must start ${want.start.join(', ')}`);
    });
    const end = want.end || [];
    end.forEach((n, k) => {
      if (half[half.length - end.length + k] !== n) problems.push(`half ${h + 1} must end ${end.join(', ')}`);
    });
  });
  for (const [a, b] of before) {
    if (order.indexOf(a) > order.indexOf(b)) problems.push(`level ${a} must come before level ${b}`);
  }
  return [...new Set(problems)];
}
