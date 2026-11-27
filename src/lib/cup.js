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

// Every level a round plays, in order.
export const roundLevels = (round) => round.halves.flat();

// The score before a level starts, from this round's story goals in the
// levels played before it. goals: { "1": "us", "6": "them" }.
export function scoreBefore(goals, order, level) {
  const score = { us: 0, them: 0 };
  for (const n of order) {
    if (n === level) break;
    const side = goals[String(n)];
    if (side) score[side] += 1;
  }
  return score;
}

// The final score of a round's story.
export function storyScore(round) {
  return scoreBefore(round.goals || {}, [...roundLevels(round), null], null);
}

// Where a Difficult mistake may give them a goal in this round: only at
// their goal levels that come before the comeback moment (our corner, which
// then goes in), so she can always still win. Without a comeback moment in
// the round, never.
export function goalLevelsFor(round, goalLevels, comeback) {
  const order = roundLevels(round);
  const at = order.indexOf(comeback);
  if (at < 0) return [];
  return goalLevels.filter((n) => order.includes(n) && order.indexOf(n) < at);
}

// Is this round a match that makes sense? Returns a list of problems,
// empty when all is well. story: levels.json "cup.story".
export function roundProblems(round, { allLevels, story }) {
  const problems = [];
  const order = roundLevels(round);
  const goals = round.goals || {};
  const unknown = order.filter((n, i) => !allLevels.includes(n) || order.indexOf(n) !== i);
  if (unknown.length) problems.push(`unknown or repeated levels ${unknown.join(', ')}`);
  for (const [n, before] of Object.entries(story.rightAfter || {})) {
    const i = order.indexOf(Number(n));
    if (i >= 0 && order[i - 1] !== before) problems.push(`level ${n} must come straight after level ${before}`);
  }
  const [first = [], second = []] = round.halves;
  for (const n of story.endFirstHalf || []) if (order.includes(n) && first.at(-1) !== n) problems.push(`level ${n} must end the first half`);
  for (const n of story.startSecondHalf || []) if (order.includes(n) && second[0] !== n) problems.push(`level ${n} must start the second half`);
  for (const n of story.lastOnly || []) if (order.includes(n) && order.at(-1) !== n) problems.push(`level ${n} must be last`);
  for (const [n, side] of Object.entries(story.alwaysScores || {})) {
    if (order.includes(Number(n)) && goals[n] !== side) problems.push(`level ${n} always scores for ${side}`);
  }
  for (const [n, side] of Object.entries(goals)) {
    const allowed = story.alwaysScores?.[n] === side || story.canScore?.[n] === side;
    if (!allowed) problems.push(`level ${n} can't score for ${side}`);
    if (!order.includes(Number(n))) problems.push(`level ${n} scores but is not in the round`);
  }
  // Level 9 either scores or leads to the penalty.
  if (order.includes(9) && goals['9'] !== 'us' && order[order.indexOf(9) + 1] !== 10) problems.push('level 9 must score or lead to the penalty');
  const s = storyScore(round);
  if (s.us <= s.them) problems.push(`we must win, but the story ends ${s.us}-${s.them}`);
  return [...new Set(problems)];
}
