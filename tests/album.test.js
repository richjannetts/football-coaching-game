import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAlbum, newShinies } from '../src/lib/album.js';
import { resolveTeam, cleanTeamName } from '../src/lib/myteam.js';
import { readJson } from './helpers.js';

const data = readJson('src/data/stickers.json');
const levels = readJson('src/data/levels.json');
const team = readJson('src/data/team.json');
const looks = readJson('src/data/looks.json');
const mine = resolveTeam(team, looks, null, { name: 'Star', skin: 's3', hair: 'ponytail', hairColour: 'h2' });
const album = (progress) => buildAlbum(data, { squad: mine.squad, teamName: mine.name, progress, levels });
const all = (a) => a.pages.flatMap((p) => p.stickers);

test('album: a new player has just her own sticker, number 1', () => {
  const a = album({});
  assert.equal(a.count, 1);
  const got = all(a).filter((x) => x.earned);
  assert.equal(got[0].no, 1);
  assert.equal(got[0].name, 'Star');
});

test('album: passing a level alone wins no sticker', () => {
  assert.equal(album({ ch1: true }).count, 1);
});

test('album: each right bonus answer wins the next sticker in order', () => {
  const one = album({ ch1: true, bonus1: true });
  assert.deepEqual(all(one).filter((x) => x.earned).map((x) => x.no), [1, 2]);
  // The order does not depend on which level the answer came from.
  const other = album({ ch2: true, bonus2: true });
  assert.deepEqual(all(other).filter((x) => x.earned).map((x) => x.no), [1, 2]);
});

test('album: the next prize is the first sticker not yet won', () => {
  assert.equal(album({}).next.no, 2);
  assert.equal(album({ bonus1: true }).next.no, 3);
  assert.equal(album({}).next.name, mine.squad[1].name);
});

test('album: finishing every level of a match gives its shiny', () => {
  const before = album({ ch1: true });
  const after = album({ ch1: true, ch2: true });
  const shiny = newShinies(before, after);
  assert.equal(shiny.length, 1);
  assert.equal(shiny[0].kind, 'shiny');
  assert.equal(newShinies(after, after).length, 0);
});

test('album: numbers run 1, 2, 3 with none missing', () => {
  const a = album({});
  assert.deepEqual(all(a).map((x) => x.no), all(a).map((_, i) => i + 1));
  assert.equal(a.total, all(a).length);
});

test('album: the first page is our team, with the keeper in her keeper kit and a coach', () => {
  const page = album({}).pages[0];
  assert.equal(page.title, mine.name);
  assert.equal(page.stickers.length, 6);
  assert.equal(page.stickers.find((x) => x.look.keeper).kit, 'keeper');
  assert.equal(page.stickers[5].kind, 'coach');
});

test('album: page order is team, club colours, world colours, kit bag, shinies', () => {
  assert.deepEqual(data.pages.map((p) => p.id), ['team', 'club', 'world', 'kitbag', 'shiny']);
});

test('data: every made-up kit has a short name, four colours and a known pattern', () => {
  const patterns = ['stripes', 'hoops', 'halves', 'sash', 'band', 'plain'];
  for (const st of data.pages.flatMap((p) => p.stickers || [])) {
    if (st.kind !== 'kit') continue;
    assert.equal(cleanTeamName(st.name), st.name, st.name);
    assert.ok(st.name.length <= 12, st.name);
    assert.ok(patterns.includes(st.pattern), st.name);
    for (const k of ['shirt', 'stripe', 'shorts', 'socks']) assert.match(st.kit[k], /^#[0-9a-f]{6}$/);
    assert.ok(st.squad >= 0 && st.squad < team.squad.length);
  }
});

test('album: with more bonus answers than stickers, nothing breaks', () => {
  const lots = { matches: [{ label: 'M', levels: Array.from({ length: 40 }, (_, i) => i + 1) }] };
  const progress = Object.fromEntries(lots.matches[0].levels.flatMap((n) => [[`ch${n}`, true], [`bonus${n}`, true]]));
  const a = buildAlbum(data, { squad: mine.squad, teamName: mine.name, progress, levels: lots });
  assert.equal(a.count, a.total);
  assert.equal(a.next, null);
});
