// Rule sets live in src/data/rules/, one file per set.
// A local set (for example a league) can "extend" a parent and list only
// what is different. resolveRuleSet() merges them into one flat set.

export function resolveRuleSet(id, allSets) {
  const byId = new Map(allSets.map((s) => [s.id, s]));
  const chain = [];
  let current = byId.get(id);
  if (!current) throw new Error(`Unknown rule set: ${id}`);
  while (current) {
    if (chain.includes(current)) throw new Error(`Rule set loop at ${current.id}`);
    chain.unshift(current);
    current = current.extends ? byId.get(current.extends) : null;
    if (chain[0].extends && !current) throw new Error(`Missing parent rule set: ${chain[0].extends}`);
  }
  const rules = {};
  for (const set of chain) Object.assign(rules, set.rules || {});
  const top = chain[chain.length - 1];
  return { id: top.id, body: top.body, season: top.season, format: top.format, ageGroups: top.ageGroups, chain: chain.map((s) => s.id), rules };
}

// Read one rule's value, failing loudly if it is missing so a typo never
// silently changes what the game teaches.
export function ruleValue(ruleSet, key) {
  const rule = ruleSet.rules[key];
  if (!rule) throw new Error(`Rule not found: ${key}`);
  return rule.value;
}
