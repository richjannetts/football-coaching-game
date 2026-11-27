// The team as it is right now: team.json with the child's own changes on
// top. Screens and drawings ask here, so a change shows up everywhere.

import teamData from '../data/team.json';
import looks from '../data/looks.json';
import * as store from './storage.js';
import { resolveTeam, withPlayer, cleanTeamName, kitColourChoices, kitWords, kitColours } from './myteam.js';

export const ourKitWords = (profile) => kitWords(teamData, myTeam(profile).ourKit);

// Another team's kit, as drawing colours, for a preview of who we play next.
export const previewKit = (kit) => kitColours(teamData, myTeam(null).ourKit, kit).them;

let saved = store.load('team', null);

// During a replay the other team is a new made-up team (src/data/replays.json).
// It is laid over the top only while a level is being played, and is never
// saved over the other team she set up herself.
let match = null;
export const setMatch = (opponent) => {
  match = opponent ? { theirName: opponent.name, theirKit: opponent.kit } : null;
};
const withMatch = () => (match ? { ...(saved || {}), ...match } : saved);

export const myTeam = (profile) => resolveTeam(teamData, looks, withMatch(), profile);

// Kit colours by name: 'us', 'keeper', 'them' or 'theirKeeper'.
export const kitFor = (name) => myTeam(null).kit[name] || teamData.kit.us;

export const kitOptions = { patterns: teamData.kitOptions.patterns, colours: kitColourChoices(teamData) };

function keep(next) {
  saved = next;
  store.save('team', saved);
}
export const savePlayer = (index, look) => keep(withPlayer(saved, index, look));
export const saveTeamName = (name) => keep({ ...(saved || {}), name: cleanTeamName(name).trim() });
export const saveTheirName = (name) => keep({ ...(saved || {}), theirName: cleanTeamName(name).trim() });
// kit: { pattern, shirt, stripe, shorts, socks }, as colour ids.
export const saveTheirKit = (kit) => keep({ ...(saved || {}), theirKit: { ...kit } });
export const saveOurKit = (kit) => keep({ ...(saved || {}), ourKit: { ...kit } });
export const forgetTeam = () => {
  saved = null;
};
