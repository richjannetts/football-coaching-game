// The team the child has made: names, looks and the other team's kit.
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

// The other team's kit as she chose it: a shirt style and colour ids.
// Earlier versions saved just one colour id ('red', 'pink' and so on), so
// that is turned into a full kit here and nothing she chose is lost.
const OLD_SHORTS = { white: 'black', black: 'black' };
export function theirKitChoice(team, saved) {
  const opts = team.theirKit;
  const base = opts.default;
  let mine = saved;
  if (typeof mine === 'string') mine = { pattern: 'plain', shirt: mine, stripe: mine === 'white' ? 'black' : 'white', shorts: OLD_SHORTS[mine] || 'white', socks: mine };
  if (!mine || typeof mine !== 'object') mine = {};
  return {
    pattern: pick(opts.patterns, mine.pattern) || base.pattern,
    shirt: pick(opts.colours, mine.shirt) || base.shirt,
    stripe: pick(opts.colours, mine.stripe) || base.stripe,
    shorts: pick(opts.colours, mine.shorts) || base.shorts,
    socks: pick(opts.colours, mine.socks) || base.socks,
  };
}

// Colour ids to the colours used for drawing. Their keeper wears a colour
// that stands out from the rest of the team.
export function theirKitColours(team, choice) {
  const opts = team.theirKit;
  const c = (id) => opts.colours.find((x) => x.id === id);
  const dark = c(choice.shirt).dark || (choice.pattern !== 'plain' && c(choice.stripe).dark);
  const keeper = dark ? opts.keeper.ifDark : opts.keeper.usual;
  return {
    them: { pattern: choice.pattern, shirt: c(choice.shirt).colour, stripe: c(choice.stripe).colour, shorts: c(choice.shorts).colour, socks: c(choice.socks).colour },
    theirKeeper: { shirt: keeper, stripe: keeper, shorts: c(choice.shorts).colour, socks: keeper },
  };
}

// team: team.json. looks: looks.json. saved: what is stored on the device
// (may be null). profile: the child's own player.
// Returns the team to draw: every player has a name and a full look.
export function resolveTeam(team, looks, saved, profile) {
  const s = saved && typeof saved === 'object' ? saved : {};
  const theirKit = theirKitChoice(team, s.theirKit);
  const theirColours = theirKitColours(team, theirKit);
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
    theirKit,
    kit: { ...team.kit, ...theirColours },
    squad,
  };
}

// The saved record with one player changed. Only the fields we know are kept.
export function withPlayer(saved, index, look) {
  const players = Array.isArray(saved?.players) ? [...saved.players] : [];
  players[index] = { name: cleanName(look.name), skin: look.skin, hair: look.hair, hairColour: look.hairColour };
  return { ...(saved || {}), players };
}
