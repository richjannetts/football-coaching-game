// The team the child has made: names, looks and both teams' kits.
// team.json holds the starting team. Anything she changes is saved on this
// device and laid over the top here. No imports, so it is easy to test.

export const NAME_MAX = 12;
export const TEAM_NAME_MAX = 16;

// Keep only a short first name or nickname: letters, apostrophes and
// hyphens, one word, no more than 12 characters.
export function cleanName(raw) {
  const first = String(raw || '').trim().split(/\s+/)[0] || '';
  return first.replace(/[^\p{L}'-]/gu, '').slice(0, NAME_MAX);
}

// A team name: letters, apostrophes, hyphens and single spaces, no more
// than 16 characters. No numbers or symbols, so it cannot hold a phone
// number, an address or a web link.
export function cleanTeamName(raw) {
  return String(raw || '')
    .replace(/[^\p{L}' -]/gu, '')
    .replace(/\s+/g, ' ')
    .trimStart()
    .slice(0, TEAM_NAME_MAX);
}

const pick = (list, id) => (list.some((x) => x.id === id) ? id : null);

// The colours she can tap for a kit (not the keeper-only ones).
export const kitColourChoices = (team) => team.kitOptions.colours.filter((c) => !c.keeperOnly);

// One team's kit as she chose it: a shirt style and colour ids.
// side: 'us' or 'them'. Earlier versions saved just one colour id for the
// other team ('red', 'pink' and so on), so that is turned into a full kit
// here and nothing she chose is lost.
const OLD_SHORTS = { white: 'black', black: 'black' };
export function kitChoice(team, side, saved) {
  const opts = team.kitOptions;
  const colours = kitColourChoices(team);
  const base = (side === 'us' ? team.ourKit : team.theirKit).default;
  let mine = saved;
  if (typeof mine === 'string') mine = { pattern: 'plain', shirt: mine, stripe: mine === 'white' ? 'black' : 'white', shorts: OLD_SHORTS[mine] || 'white', socks: mine };
  if (!mine || typeof mine !== 'object') mine = {};
  return {
    pattern: pick(opts.patterns, mine.pattern) || base.pattern,
    shirt: pick(colours, mine.shirt) || base.shirt,
    stripe: pick(colours, mine.stripe) || base.stripe,
    shorts: pick(colours, mine.shorts) || base.shorts,
    socks: pick(colours, mine.socks) || base.socks,
  };
}
export const theirKitChoice = (team, saved) => kitChoice(team, 'them', saved);
export const ourKitChoice = (team, saved) => kitChoice(team, 'us', saved);

// The colours a kit shows from a distance: its shirt, and its second
// colour when it has a pattern.
const shirtColours = (k) => (k.pattern === 'plain' ? [k.shirt] : [k.shirt, k.stripe]);

// The two teams never wear the same shirt colour. The screen stops her
// picking the other team's shirt colour, so this only matters for kits
// saved some other way: our kit stays, and theirs moves to the first
// colour that is free.
export function settleKits(team, ours, theirs) {
  if (ours.shirt !== theirs.shirt) return { ours, theirs };
  const free = kitColourChoices(team).find((c) => !shirtColours(ours).includes(c.id));
  const shirt = free ? free.id : theirs.shirt;
  const next = { ...theirs, shirt };
  if (next.pattern !== 'plain' && next.stripe === shirt) next.stripe = shirt === 'white' ? 'black' : 'white';
  return { ours, theirs: next };
}

// The first colour in a list that nobody else is wearing.
const firstFree = (list, used) => list.find((id) => !used.includes(id)) || list[0];

// Colour ids to the colours used for drawing. Each keeper wears a colour
// that stands out from both teams and from the other keeper.
export function kitColours(team, ours, theirs) {
  const c = (id) => team.kitOptions.colours.find((x) => x.id === id);
  const used = [...shirtColours(ours), ...shirtColours(theirs)];
  const ourKeeper = firstFree(team.ourKit.keeper, used);
  const dark = c(theirs.shirt).dark || (theirs.pattern !== 'plain' && c(theirs.stripe).dark);
  const theirKeeper = firstFree(dark ? team.theirKit.keeperIfDark : team.theirKit.keeper, [...used, ourKeeper]);
  const outfield = (k) => ({ pattern: k.pattern, shirt: c(k.shirt).colour, stripe: c(k.stripe).colour, shorts: c(k.shorts).colour, socks: c(k.socks).colour });
  const keeper = (id, k) => ({ shirt: c(id).colour, stripe: c(id).colour, shorts: c(k.shorts).colour, socks: c(id).colour });
  return { us: outfield(ours), keeper: keeper(ourKeeper, ours), them: outfield(theirs), theirKeeper: keeper(theirKeeper, theirs) };
}

// team: team.json. looks: looks.json. saved: what is stored on the device
// (may be null). profile: the child's own player.
// Returns the team to draw: every player has a name and a full look.
export function resolveTeam(team, looks, saved, profile) {
  const s = saved && typeof saved === 'object' ? saved : {};
  const { ours: ourKit, theirs: theirKit } = settleKits(team, ourKitChoice(team, s.ourKit), theirKitChoice(team, s.theirKit));
  const squad = team.squad.map((base, i) => {
    const mine = base.you ? profile || {} : (Array.isArray(s.players) && s.players[i]) || {};
    return {
      you: !!base.you,
      keeper: !!base.keeper,
      name: cleanName(mine.name) || (base.you ? '' : base.name || ''),
      skin: pick(looks.skin, mine.skin) || base.skin || looks.default.skin,
      hair: pick(looks.hair, mine.hair) || base.hair || looks.default.hair,
      hairColour: pick(looks.hairColour, mine.hairColour) || base.hairColour || looks.default.hairColour,
    };
  });
  return {
    name: cleanTeamName(s.name).trim() || team.teamName,
    theirName: cleanTeamName(s.theirName).trim() || team.opponentName,
    ourKit,
    theirKit,
    kit: { ...team.kit, ...kitColours(team, ourKit, theirKit) },
    squad,
  };
}

// Our kit in words, for the voice: "blue and yellow", or just "green".
export function kitWords(team, kit) {
  const label = (id) => (team.kitOptions.colours.find((c) => c.id === id)?.label || '').toLowerCase();
  return kit.pattern === 'plain' || kit.stripe === kit.shirt ? label(kit.shirt) : `${label(kit.shirt)} and ${label(kit.stripe)}`;
}

// The saved record with one player changed. Only the fields we know are kept.
export function withPlayer(saved, index, look) {
  const players = Array.isArray(saved?.players) ? [...saved.players] : [];
  players[index] = { name: cleanName(look.name), skin: look.skin, hair: look.hair, hairColour: look.hairColour };
  return { ...(saved || {}), players };
}
