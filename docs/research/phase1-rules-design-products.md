# Football rules game: Phase 1 research (context file)

Researched 25th November 2026. Covers rules, child design evidence and existing products.
Full report with all sources: https://claude.ai/artifact/FQdvv6cZ9gpWHktMGT8kPY
Phase 2 (artwork, voice, privacy, technical pitfalls) is not yet done.

## Project context

- Learning game for 6 to 9 year olds. Offline progressive web app for phones and tablets. No accounts, nothing leaves the device.
- Built by Rich, coach of an under-7 girls team that plays up in an under-8 league (Sheffield & Hallamshire Women and Girls League).
- The team plays 5v5 under FA under-8 rules. Playing up is allowed under FA Standard Code Rule 18(C).
- A parent will probably help with first setup. The child then plays alone.
- Status: research only. Nothing has been built.

## Open decisions (not yet agreed by Rich)

1. Mark placements by legal zones, not exact spots. Recommended.
2. Reframe lesson 1 as "Match Day": which way are we shooting, our kick-off, a short attack and goal, their kick-off. Recommended.
3. Make the goal kick retreat line lesson 2. Recommended.
4. Use "where should you be right now?" language, not fixed positions. Recommended.
5. Ask the league who kicks off after a goal and whether the kicker may touch the ball twice.

## Rules: 5v5 kick-off (FA, under-8 and under-9, season 2026/27)

Confirmed in the FA Mini-Soccer Handbook for 2025 and 2026 (Law 8):

- Taken from the centre mark on the halfway line.
- Starts the game and restarts play after a goal.
- Opponents must be in their own half and at least five yards from the ball.
- No centre circle is described for mini-soccer. Only a centre mark.
- The ball may be kicked in any direction. It does not have to go forward.
- A goal cannot be scored directly from a kick-off.

Not stated in the mini-soccer handbook (do not test the child on these yet):

- Which team kicks off after a goal. Adult Laws (IFAB Law 8) say the team that conceded.
- Whether the kicker may touch the ball twice. Adult Laws say no.

Related rule, separate lesson: the retreat line. At a goal kick, the team without the ball drops back into its own half until the ball is in play. The 2026 handbook applies it from under-7 to under-11.

Warning: FA 5v5 laws from 2013/14 said the ball must go forward. Those old PDFs are still online and are wrong now.

## Kick-off by format (2026/27)

| Format | Ages | Kick-off | Opponents | Goal direct? | Centre circle |
| --- | --- | --- | --- | --- | --- |
| 3v3 | U7 | None. Rock, paper, scissors to start. Goal line restart after a goal | 3 m back | Shooter must be in opponent's half | None |
| 5v5 | U8, U9 | Centre mark, any direction | Own half, 5 yards | No | Not mentioned |
| 7v7 | U10, U11 | Centre mark, any direction | Own half, 5 yards | No | Not mentioned |
| 9v9 | U12, U13 | Centre mark, any direction | Own half, 7 yards (June 2025 guidance) | Follows adult Laws | Not stated |
| 11v11 | U14 up | Centre mark, any direction | Own half, 9.15 m | Yes | 9.15 m radius |

Local rules: the league follows the FA handbook for mini-soccer with no kick-off variation. Pitch size is the local variable: 30 x 20 yards minimum, 40 x 30 yards maximum for 5v5.

## Rule data structure (suggested)

One file per rule set. A rule set can extend a parent so local files only list differences. Every rule carries source, confidence and last-verified date. Season is part of the id because rules change yearly.

```json
{
  "id": "fa-2026-27-5v5",
  "extends": "ifab-2026-27-11v11",
  "body": "The FA",
  "season": "2026/27",
  "format": "5v5",
  "ageGroups": ["U8", "U9"],
  "rules": {
    "kickoff.opponentDistance": {
      "value": 5, "unit": "yards",
      "source": "FA Mini-Soccer Handbook 2026/27, Law 8",
      "confidence": "confirmed", "lastVerified": "2026-11-25"
    },
    "kickoff.centreCircle": { "value": false, "confidence": "confirmed", "lastVerified": "2026-11-25" },
    "kickoff.direction": { "value": "any", "confidence": "confirmed", "lastVerified": "2026-11-25" },
    "kickoff.canScoreDirect": { "value": false, "confidence": "confirmed", "lastVerified": "2026-11-25" }
  }
}
```

A league file such as `shwgl-2026-27-u8` extends `fa-2026-27-5v5` and holds only pitch size.

## Design principles

1. Voice and pictures first, text optional. Every instruction is spoken and shown, with a replay button and a visual cue if sound is off. About 1 in 5 Year 1 pupils do not meet the phonics standard.
2. Short, touch-free explainers. Animation and sound match the story. No tappable extras. Touch is disabled while the explainer plays.
3. Every placement causes a visible result. The child's choice plays out on the pitch in a short animation. That is the main reward.
4. Legal zones, not exact spots. Any layout that obeys the rule is right.
5. Wrong answers show why in pictures, then hint in steps: nudge, show, do it together. Retry at once.
6. Praise effort, never cleverness.
7. No pressure. The timer only paces or triggers a hint. No streaks, no daily rewards, nothing lost for stopping. Footballs record progress only.
8. Short rounds and a clear end. Rounds of 1 to 3 minutes, a lesson of 5 to 10 minutes (estimate, not a research figure).
9. Forgiving touch. Tokens of 2 cm or more, snapping drop zones, support both drag and tap-then-tap, a dropped drag never loses the player, extra touches ignored, no controls at the bottom edge.
10. Private, inclusive, not pink by default. No public scores. Capable girl players. Wide skin tone, hair, headwear and kit choices in the main menus, all looking good by default. The child picks the colours.

Also: unlock the next lesson at about 4 in 5 correct, and bring earlier lessons back as short warm-ups.

## Kick-off pitch drawing

- Draw the halfway line and centre mark.
- Show a dashed five-yard ring as a "stay back" helper. The voice should say it is a helper, because real 5v5 pitches have no circle.
- Our kick-off: one player on the ball at the centre mark, everyone else anywhere in our half.
- Their kick-off: our players anywhere in our half and outside the ring.
- Goalkeeper in goal is sensible but not required by the rule.

## Existing products (summary)

- Nothing found teaches English small-sided rules to young children through interactive play.
- Rules apps (IFAB Football Rules, Soccer Laws Dojo, Soccer 101) are text-heavy, adult and 11-a-side.
- Children's football apps (Family F.C., TopTekkers, Techne) teach ball skills, not rules.
- Best model for a child-safe sport app: ECB Dynamos Cricket (free, no purchases, no personal data).
- Tactics board apps show drag-the-players works on tablets.

Risks to the idea:

- The FA advises against fixing young children in positions. Teach "where should you be in this moment", not fixed roles.
- Distribution is hard without a store listing or FA backing.
- Rules change each season and need a yearly check.
- Whether children want to learn rules on a screen is untested. Test with the team early.

Reuse: no FA page gives a reuse licence. Write rules in your own words and draw your own diagrams.

## Could not confirm

- Who kicks off after a goal in 5v5, and the double-touch rule.
- What the league's "under-8 Development" division is.
- The official 2026/27 handbook file on England Football (blocked). A club-hosted copy marked "Version updated August 2026" was read, and it matches the 2025 edition on thefa.com.
- Any County FA local variation (none found).
- Current 7v7 and 9v9 detail for 2026/27.
- A direct drag versus tap-to-place study for ages 6 to 9.
- Whether naming the avatar helps learning (no evidence either way).

## Key sources

- FA Mini-Soccer Handbook 2026/27: https://irp.cdn-website.com/4417c202/files/uploaded/FA+Mini+Soccer+Handbook+2026+27.pdf
- FA Mini-Soccer Handbook 2025: https://www.thefa.com/-/media/cfa/westridingfa/files/clubs/mini-soccer-handbook-2025.ashx
- FA Know Your Format guide: https://harpn.s3-eu-west-2.amazonaws.com/fa/futurefit/Know%20Your%20Format.pdf
- FutureFit hub: https://futurefit.englandfootball.com/
- SHWGL Youth Football Rules 2026/27: https://www.shgcl.co.uk/shgcldocumentcollective/52d5e8bc6f7f3c5f45bc6292b577fc65.pdf
- IFAB Law 8: https://www.theifab.com/laws/latest/the-start-and-restart-of-play/
- England Football 5v5 guide: https://learn.englandfootball.com/articles-and-resources/coaching/resources/2025/How-to-play-and-manage-5v5-games
- Takacs et al. 2015 (narrated animation): https://pmc.ncbi.nlm.nih.gov/articles/PMC4647204
- NN/g children's physical development: https://www.nngroup.com/articles/children-ux-physical-development/
- Anthony 2019 (children's touch): https://init.cise.ufl.edu/wp-content/uploads/sites/378/2019/03/anthony-et-al-IJHCS2019-MTAGIC-final-preprint.pdf
- Girls Active primary report 2020: https://www.youthsporttrust.org/media/ed3br5js/girls-active-primary.pdf
- Women in Sport 2023: https://womeninsport.org/wp-content/uploads/2023/03/2023-Sport-Stereotypes-and-Stolen-Dreams.pdf
