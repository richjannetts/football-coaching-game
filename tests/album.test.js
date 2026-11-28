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

test('album: a new player starts with no stickers', () => {
  assert.equal(album({}).count, 0);
});

test('album: the first sticker she wins is her own player, number 1', () => {
  const got = all(album({ ch1: true, bonus1: true })).filter((x) => x.earned);
  assert.equal(got.length, 1);
  assert.equal(got[0].no, 1);
  assert.equal(got[0].name, 'Star');
});

test('album: passing a level alone wins no sticker', () => {
  assert.equal(album({ ch1: true }).count, 0);
});

test('album: each right bonus answer wins the next sticker in order', () => {
  const one = album({ ch1: true, bonus1: true });
  assert.deepEqual(all(one).filter((x) => x.earned).map((x) => x.no), [1]);
  const two = album({ ch1: true, bonus1: true, ch2: true, bonus2: true });
  assert.deepEqual(all(two).filter((x) => x.earned && x.kind !== 'shiny').map((x) => x.no), [1, 2]);
  // The order does not depend on which level the answer came from.
  const other = album({ ch2: true, bonus2: true });
  assert.deepEqual(all(other).filter((x) => x.earned).map((x) => x.no), [1]);
});

test('album: the next prize is the first sticker not yet won', () => {
  assert.equal(album({}).next.no, 1);
  assert.equal(album({}).next.name, 'Star');
  assert.equal(album({ bonus1: true }).next.no, 2);
  assert.equal(album({ bonus1: true }).next.name, mine.squad[1].name);
});

test('album: finishing every level of a match gives its shiny', () => {
  // Every level of a finished match but the last, then all of them.
  const finished = { ...levels, matches: [{ id: 'm1', label: 'Match 1', levels: [1, 2, 3] }] };
  const albumOf = (progress) => buildAlbum(data, { squad: mine.squad, teamName: mine.name, progress, levels: finished });
  const done = (list) => Object.fromEntries(list.map((n) => [`ch${n}`, true]));
  const before = albumOf(done([1, 2]));
  const after = albumOf(done([1, 2, 3]));
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

test('album: page order is team, club colours, world colours, kit bag, training ground, shinies', () => {
  assert.deepEqual(data.pages.map((p) => p.id), ['team', 'club', 'world', 'kitbag', 'training', 'shiny']);
});

test('album: training stickers come from training, never from bonus answers', () => {
  const progress = Object.fromEntries(levels.matches[0].levels.flatMap((n) => [[`ch${n}`, true], [`bonus${n}`, true]]));
  let a = buildAlbum(data, { squad: mine.squad, teamName: mine.name, progress, levels });
  const training = () => a.pages.find((p) => p.id === 'training').stickers;
  assert.equal(training().filter((x) => x.earned).length, 0);
  a = buildAlbum(data, { squad: mine.squad, teamName: mine.name, progress: { train_pass: true, touches1: true }, levels });
  assert.deepEqual(training().filter((x) => x.earned).map((x) => x.name), ['Pass', 'Touches']);
  // Training stickers never use up the sticker the next bonus answer wins.
  assert.equal(a.next.no, 1);
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
  // Every sticker except the training ones, which training wins.
  const training = a.pages.find((p) => p.id === 'training').stickers.length;
  assert.equal(a.count, a.total - training);
  assert.equal(a.next, null);
});

test('album: a match still being built gives no shiny, even with every level so far done', () => {
  const building = { ...levels, matches: [{ id: 'm1', label: 'Match 1', levels: [1, 2], complete: false }] };
  const a = buildAlbum(data, { squad: mine.squad, teamName: mine.name, progress: { ch1: true, ch2: true }, levels: building });
  assert.equal(all(a).filter((x) => x.kind === 'shiny' && x.earned).length, 0);
});
