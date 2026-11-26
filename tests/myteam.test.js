import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanName, cleanTeamName, resolveTeam, withPlayer, TEAM_NAME_MAX } from '../src/lib/myteam.js';
import { readJson } from './helpers.js';

const team = readJson('src/data/team.json');
const looks = readJson('src/data/looks.json');
const me = { name: 'Star', skin: 's3', hair: 'ponytail', hairColour: 'h2' };

test('team: with nothing saved, the starting team is used', () => {
  const t = resolveTeam(team, looks, null, me);
  assert.equal(t.name, team.teamName);
  assert.equal(t.theirName, team.opponentName);
  assert.equal(t.theirKit, team.defaultTheirKit);
  assert.equal(t.squad.length, 5);
  assert.equal(t.squad[0].name, 'Star');
  assert.ok(t.squad.every((p) => p.name && p.skin && p.hair && p.hairColour));
});

test('team: exactly one keeper, and she is not the child by default', () => {
  const t = resolveTeam(team, looks, null, me);
  assert.equal(t.squad.filter((p) => p.keeper).length, 1);
  assert.equal(t.squad[0].keeper, false);
});

test('team: a changed team-mate keeps her new name and look', () => {
  const saved = withPlayer(null, 2, { name: 'Zed', skin: 's6', hair: 'curls', hairColour: 'h3', extra: 'no' });
  const p = resolveTeam(team, looks, saved, me).squad[2];
  assert.deepEqual({ name: p.name, skin: p.skin, hair: p.hair, hairColour: p.hairColour }, { name: 'Zed', skin: 's6', hair: 'curls', hairColour: 'h3' });
  assert.equal(saved.players[2].extra, undefined);
});

test('team: saved names and the other kit are used', () => {
  const t = resolveTeam(team, looks, { name: 'The Comets', theirName: 'Red Lions', theirKit: 'pink' }, me);
  assert.equal(t.name, 'The Comets');
  assert.equal(t.theirName, 'Red Lions');
  assert.equal(t.kit.them.shirt, team.theirKits.find((k) => k.id === 'pink').them.shirt);
});

test('team: broken saved data falls back to the starting team', () => {
  const t = resolveTeam(team, looks, { name: '   ', theirKit: 'nope', players: [null, { name: '123', skin: 'zz' }] }, me);
  assert.equal(t.name, team.teamName);
  assert.equal(t.theirKit, team.defaultTheirKit);
  assert.equal(t.squad[1].name, team.squad[1].name);
  assert.equal(t.squad[1].skin, team.squad[1].skin);
});

test('team: no player yet still gives a full team', () => {
  const t = resolveTeam(team, looks, null, null);
  assert.equal(t.squad[0].name, '');
  assert.ok(t.squad[0].skin);
});

test('names: a player name is one short word of letters', () => {
  assert.equal(cleanName('  Mia Jones '), 'Mia');
  assert.equal(cleanName('M1a!'), 'Ma');
  assert.equal(cleanName('Abcdefghijklmnop').length, 12);
});

test('names: a team name is letters and single spaces, kept short', () => {
  assert.equal(cleanTeamName('The  Comets 07!'), 'The Comets ');
  assert.equal(cleanTeamName('www.site.com/9'), 'wwwsitecom');
  assert.equal(cleanTeamName('x'.repeat(40)).length, TEAM_NAME_MAX);
});

test('kits: every kit for the other team differs from ours and our keeper', () => {
  const ours = [team.kit.us.shirt, team.kit.keeper.shirt];
  for (const k of team.theirKits) {
    assert.ok(!ours.includes(k.them.shirt), k.id);
    assert.notEqual(k.them.shirt, k.theirKeeper.shirt, k.id);
  }
});

test('data: starting names pass the name rule unchanged', () => {
  for (const p of team.squad) if (p.name) assert.equal(cleanName(p.name), p.name);
  assert.equal(cleanTeamName(team.teamName), team.teamName);
  assert.equal(cleanTeamName(team.opponentName), team.opponentName);
});
