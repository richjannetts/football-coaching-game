// Easy, Medium and Difficult (Rich, 27th November 2026). The settings
// live in src/data/difficulty.json. These small helpers turn them into
// decisions for a line-up. No imports, so they are easy to test.

// Which help a wrong try gets. attempts counts wrong tries, from 1.
// The first wrong try only says "have another look": no reasons, no hints.
export function helpFor(cfg, attempts) {
  return {
    nudgeOnly: attempts < cfg.whyFrom,
    why: attempts >= cfg.whyFrom,
    show: attempts >= cfg.showFrom,
    showNow: attempts === cfg.showFrom,
    together: attempts >= cfg.togetherFrom,
  };
}

// Our restarts: we have the ball. Their restarts: they have it.
export const isOurs = (kind) => kind === 'ours' || kind.startsWith('our');

// What a wrong try costs on Difficult: null (nothing), 'possession' (they
// win the ball), 'save' (they shoot and our keeper saves it) or 'goal'.
// Only ever on the first wrong try of a level, so it happens once a level
// at most. goalsAgainst: extra goals they have already scored this match.
export function consequenceFor({ cfg, rules, enabled, level, kind, attempts, goalsAgainst = 0 }) {
  if (!cfg?.consequences || !enabled || attempts !== 1) return null;
  if ((rules.none || []).includes(level)) return null;
  if (isOurs(kind)) return 'possession';
  if ((rules.goalLevels || []).includes(level) && goalsAgainst < (rules.maxGoals ?? 1)) return 'goal';
  return 'save';
}

// The score in words, for the voice: "It's one each", "We're winning
// two-one" or "They're winning two-one".
const WORDS = ['nil', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const say = (n) => WORDS[n] ?? String(n);
export function scoreWords(us, them) {
  if (us === them) return us === 0 ? "It's nil-nil" : `It's ${say(us)} each`;
  return us > them ? `We're winning ${say(us)}-${say(them)}` : `They're winning ${say(them)}-${say(us)}`;
}
// The final score, at full time.
export function finalWords(us, them) {
  if (us === them) return `It's a draw, ${say(us)} each`;
  return us > them ? `We won ${say(us)}-${say(them)}` : `They won ${say(them)}-${say(us)}`;
}
