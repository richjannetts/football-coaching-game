// The gentle nudge on a first wrong try (Rich, 27th November 2026). It
// says "not quite" and points her at one player or one part of the pitch
// to think about, without saying where anyone should go. The full reason,
// the glowing spots and "let's do one together" still come later.
// No imports, so it is easy to test.

// Rule problems: the same for every team.
const RULE = {
  ownHalf: 'nudge.halfway',
  onBall: 'nudge.ball',
  ring: 'nudge.steps',
};

// Shape problems, by the role of the spot that is still empty.
const ROLE = {
  keeper: 'nudge.keeper',
  back: 'nudge.back',
  stay: 'nudge.stay',
  up: 'nudge.up',
  middle: 'nudge.middle',
  wide: 'nudge.wide',
  side: 'nudge.side',
  kicker: 'nudge.ball',
  taker: 'nudge.ball',
  close: 'nudge.friends',
  inside: 'nudge.friends',
  near: 'nudge.friends',
  edge: 'nudge.friends',
  rebound: 'nudge.rebound',
  line: 'nudge.defend',
  guard: 'nudge.defend',
  post: 'nudge.defend',
};

// At their restarts we are defending, so a friend "inside" is marking.
const DEFENDING = { inside: 'nudge.defend' };

// problem: the first problem from checkRule() or checkShape().
// fromRule: true if it came from checkRule(). kind: the restart.
export function nudgeFor(problem, { fromRule = false, kind = '' } = {}) {
  if (!problem) return 'hint.lookAgain';
  if (fromRule) return RULE[problem.type] || 'hint.lookAgain';
  const defending = kind === 'theirs' || kind.startsWith('their');
  return (defending && DEFENDING[problem.type]) || ROLE[problem.type] || 'hint.lookAgain';
}

// Every line nudgeFor() can give, for the tests.
export const NUDGE_LINES = [...new Set(['hint.lookAgain', ...Object.values(RULE), ...Object.values(ROLE), ...Object.values(DEFENDING)])];
