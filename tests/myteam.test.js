import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanName, cleanTeamName, resolveTeam, withPlayer, theirKitChoice, ourKitChoice, settleKits, kitColourChoices, TEAM_NAME_MAX } from '../src/lib/myteam.js';
import { readJson } from './helpers.js';

const team = readJson('src/data/team.json');
const looks = readJson('src/data/looks.json');
const me = { name: 'Star', skin: 's3', hair: 'ponytail', hairColour: 'h2' };

test('team: with nothing saved, the starting team is used', () => {
  const t = resolveTeam(team, looks, null, me);
  assert.equal(t.name, team.teamName);
  assert.equal(t.theirName, team.opponentName);
  assert.deepEqual(t.theirKit, team.theirKit.default);
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

const colour = (id) => team.kitOptions.colours.find((c) => c.id === id).colour;

test('team: saved names and the other kit are used', () => {
  const kit = { pattern: 'hoops', shirt: 'green', stripe: 'white', shorts: 'black', socks: 'sky' };
  const t = resolveTeam(team, looks, { name: 'The Comets', theirName: 'Red Lions', theirKit: kit }, me);
  assert.equal(t.name, 'The Comets');
  assert.equal(t.theirName, 'Red Lions');
  assert.deepEqual(t.theirKit, kit);
  assert.deepEqual(t.kit.them, { pattern: 'hoops', shirt: colour('green'), stripe: colour('white'), shorts: colour('black'), socks: colour('sky') });
});

test('team: a kit colour saved by the old version still works', () => {
  const t = resolveTeam(team, looks, { theirKit: 'pink' }, me);
  assert.equal(t.kit.them.shirt, colour('pink'));
  assert.equal(t.kit.them.socks, colour('pink'));
  assert.equal(t.theirKit.pattern, 'plain');
});

test('team: their keeper stands out from a dark kit and a light one', () => {
  const dark = resolveTeam(team, looks, { theirKit: { ...team.theirKit.default, shirt: 'black' } }, me);
  const light = resolveTeam(team, looks, { theirKit: { ...team.theirKit.default, shirt: 'white' } }, me);
  assert.equal(dark.kit.theirKeeper.shirt, colour(team.theirKit.keeperIfDark[0]));
  assert.equal(light.kit.theirKeeper.shirt, colour(team.theirKit.keeper[0]));
});

test('kits: our kit starts as blue and yellow stripes, as before', () => {
  const t = resolveTeam(team, looks, null, me);
  assert.deepEqual(t.ourKit, team.ourKit.default);
  assert.equal(t.kit.us.shirt, team.kit.us.shirt);
  assert.equal(t.kit.us.stripe, team.kit.us.stripe);
  assert.equal(t.kit.us.pattern, 'stripes');
  assert.equal(t.kit.keeper.shirt, team.kit.keeper.shirt);
});

test('kits: our own kit can be changed', () => {
  const kit = { pattern: 'hoops', shirt: 'green', stripe: 'white', shorts: 'black', socks: 'green' };
  const t = resolveTeam(team, looks, { ourKit: kit }, me);
  assert.deepEqual(t.ourKit, kit);
  assert.equal(t.kit.us.shirt, colour('green'));
  assert.equal(t.kit.us.pattern, 'hoops');
});

test('kits: both teams never wear the same shirt colour', () => {
  const t = resolveTeam(team, looks, { ourKit: { ...team.ourKit.default, shirt: 'red' }, theirKit: { ...team.theirKit.default, shirt: 'red' } }, me);
  assert.equal(t.ourKit.shirt, 'red');
  assert.notEqual(t.theirKit.shirt, 'red');
  for (const a of kitColourChoices(team)) {
    const s = settleKits(team, ourKitChoice(team, { shirt: a.id, pattern: 'plain' }), theirKitChoice(team, { shirt: a.id, pattern: 'plain' }));
    assert.notEqual(s.theirs.shirt, s.ours.shirt, a.id);
  }
});

test('kits: each keeper stands out from both teams and the other keeper', () => {
  for (const a of kitColourChoices(team)) {
    for (const b of kitColourChoices(team)) {
      if (a.id === b.id) continue;
      const t = resolveTeam(team, looks, { ourKit: { pattern: 'plain', shirt: a.id, socks: a.id }, theirKit: { pattern: 'plain', shirt: b.id, socks: b.id } }, me);
      const shirts = [t.kit.us.shirt, t.kit.them.shirt];
      assert.ok(!shirts.includes(t.kit.keeper.shirt), `our keeper, ${a.id} v ${b.id}`);
      assert.ok(!shirts.includes(t.kit.theirKeeper.shirt), `their keeper, ${a.id} v ${b.id}`);
      assert.notEqual(t.kit.keeper.shirt, t.kit.theirKeeper.shirt, `${a.id} v ${b.id}`);
    }
  }
});

test('kits: keeper-only colours are not offered as kit choices', () => {
  assert.ok(kitColourChoices(team).every((c) => !c.keeperOnly));
  assert.ok(kitColourChoices(team).some((c) => c.id === 'blue'));
  assert.ok(kitColourChoices(team).some((c) => c.id === 'yellow'));
});

test('team: unknown parts of a saved kit fall back one by one', () => {
  const k = theirKitChoice(team, { pattern: 'zigzag', shirt: 'purple', stripe: '#123456', shorts: null });
  assert.equal(k.pattern, team.theirKit.default.pattern);
  assert.equal(k.shirt, 'purple');
  assert.equal(k.stripe, team.theirKit.default.stripe);
  assert.equal(k.shorts, team.theirKit.default.shorts);
});

test('team: broken saved data falls back to the starting team', () => {
  const t = resolveTeam(team, looks, { name: '   ', theirKit: 'nope', players: [null, { name: '123', skin: 'zz' }] }, me);
  assert.equal(t.name, team.teamName);
  assert.deepEqual(t.theirKit, team.theirKit.default);
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

test('data: starting names pass the name rule unchanged', () => {
  for (const p of team.squad) if (p.name) assert.equal(cleanName(p.name), p.name);
  assert.equal(cleanTeamName(team.teamName), team.teamName);
  assert.equal(cleanTeamName(team.opponentName), team.opponentName);
});

test('kits: our kit in words for the voice', async () => {
  const { kitWords } = await import('../src/lib/myteam.js');
  assert.equal(kitWords(team, team.ourKit.default), 'blue and yellow');
  assert.equal(kitWords(team, { ...team.ourKit.default, pattern: 'plain', shirt: 'green' }), 'green');
});
