// The team as it is right now: team.json with the child's own changes on
// top. Screens and drawings ask here, so a change shows up everywhere.

import teamData from '../data/team.json';
import looks from '../data/looks.json';
import * as store from './storage.js';
import { resolveTeam, withPlayer, cleanTeamName, kitColourChoices, kitWords } from './myteam.js';

export const ourKitWords = (profile) => kitWords(teamData, myTeam(profile).ourKit);

let saved = store.load('team', null);

export const myTeam = (profile) => resolveTeam(teamData, looks, saved, profile);

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
