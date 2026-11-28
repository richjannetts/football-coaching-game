// The sticker album, worked out from what is saved. Nothing extra is
// stored: the stickers she has follow from her progress.
//   - Each bonus question answered right wins the next sticker, in order.
//     The first one is her own player (Rich's choice, 27th November 2026).
//   - Finishing every level of a match gives that match's shiny.
//   - Training night stickers name what wins them (earnedBy), such as
//     finishing a mini-game for the first time.
// No imports, so it is easy to test.

// data: stickers.json. levels: levels.json. squad: the team's players
// (from resolveTeam). progress: e.g. { ch1: true, bonus1: true }.
export function buildAlbum(data, { squad, teamName, progress = {}, levels }) {
  const allLevels = levels.matches.flatMap((m) => m.levels);
  const wins = allLevels.filter((n) => progress[`bonus${n}`]).length;
  let no = 0;
  let wonSoFar = 0;
  let next = null;
  const pages = data.pages.map((page) => {
    const list = page.perMatch ? levels.matches.map((m, i) => ({ kind: 'shiny', name: m.label, match: i })) : page.stickers;
    const stickers = list.map((st) => {
      no += 1;
      const player = st.squad != null ? squad[st.squad] : null;
      const out = { no, kind: st.kind, page: page.id, name: st.name || '', look: st.look || null, kit: st.kit || 'us', pattern: st.pattern || 'stripes', item: st.item || null, bg: st.bg || null, earned: false };
      if (player) out.look = player;
      if (st.kind === 'player') {
        out.name = player.name;
        out.kit = player.keeper ? 'keeper' : 'us';
        out.pattern = null; // our own kit's shirt style, whatever she chose
      }
      // A Training night sticker: her own player, practising a skill.
      if (st.kind === 'skill') {
        out.kit = st.kit || 'us';
        out.pattern = null;
      }
      if (st.earnedBy) {
        // Training night stickers are won by finishing a mini-game, or by
        // balls on the 100 touches chart, not by bonus answers.
        out.earned = !!progress[st.earnedBy];
      } else if (st.kind === 'shiny') {
        // A match still being built (complete: false) gives no shiny yet:
        // its last level so far is not full time.
        const m = levels.matches[st.match];
        out.earned = m.complete !== false && m.levels.every((n) => progress[`ch${n}`]);
      } else {
        out.earned = wonSoFar < wins;
        wonSoFar += 1;
        if (!out.earned && !next) next = out;
      }
      return out;
    });
    return { id: page.id, title: page.title.replace('{team}', teamName), colour: page.colour, stickers, got: stickers.filter((x) => x.earned).length };
  });
  const all = pages.flatMap((p) => p.stickers);
  return {
    pages,
    count: all.filter((x) => x.earned).length,
    total: all.length,
    // The sticker the next right bonus answer wins. Null when all are won.
    next,
  };
}

// The shinies she has now that she did not have before.
export function newShinies(before, after) {
  const had = new Set(before.pages.flatMap((p) => p.stickers).filter((x) => x.kind === 'shiny' && x.earned).map((x) => x.no));
  return after.pages.flatMap((p) => p.stickers).filter((x) => x.kind === 'shiny' && x.earned && !had.has(x.no));
}
