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

// team: team.json. looks: looks.json. saved: what is stored on the device
// (may be null). profile: the child's own player.
// Returns the team to draw: every player has a name and a full look.
export function resolveTeam(team, looks, saved, profile) {
  const s = saved && typeof saved === 'object' ? saved : {};
  const theirKit = team.theirKits.find((k) => k.id === s.theirKit) || team.theirKits.find((k) => k.id === team.defaultTheirKit) || team.theirKits[0];
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
    theirKit: theirKit.id,
    kit: { ...team.kit, them: theirKit.them, theirKeeper: theirKit.theirKeeper },
    squad,
  };
}

// The saved record with one player changed. Only the fields we know are kept.
export function withPlayer(saved, index, look) {
  const players = Array.isArray(saved?.players) ? [...saved.players] : [];
  players[index] = { name: cleanName(look.name), skin: look.skin, hair: look.hair, hairColour: look.hairColour };
  return { ...(saved || {}), players };
}
