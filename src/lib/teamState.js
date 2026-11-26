// The team as it is right now: team.json with the child's own changes on
// top. Screens and drawings ask here, so a change shows up everywhere.

import teamData from '../data/team.json';
import looks from '../data/looks.json';
import * as store from './storage.js';
import { resolveTeam, withPlayer, cleanTeamName } from './myteam.js';

let saved = store.load('team', null);

export const myTeam = (profile) => resolveTeam(teamData, looks, saved, profile);

// Kit colours by name: 'us', 'keeper', 'them' or 'theirKeeper'.
export const kitFor = (name) => myTeam(null).kit[name] || teamData.kit.us;

export const theirKits = teamData.theirKits;

function keep(next) {
  saved = next;
  store.save('team', saved);
}
export const savePlayer = (index, look) => keep(withPlayer(saved, index, look));
export const saveTeamName = (name) => keep({ ...(saved || {}), name: cleanTeamName(name).trim() });
export const saveTheirName = (name) => keep({ ...(saved || {}), theirName: cleanTeamName(name).trim() });
export const saveTheirKit = (id) => keep({ ...(saved || {}), theirKit: id });
export const forgetTeam = () => {
  saved = null;
};
