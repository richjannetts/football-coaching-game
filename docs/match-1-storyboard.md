# Match 1 storyboard

Agreed with Rich on 27th November 2026. The visual version is a published page for Rich; this is the plain list the code follows. Rules marked "to check" wait for Rich's club rule set.

| Level | Moment | Score after | Status |
| --- | --- | --- | --- |
| 1 | Our centre kick | 1-0 | Built |
| 2 | Their centre kick | 1-0 | Built |
| 3 | Our goal kick (spread wide, find a friend) | 1-0 | Built |
| 4 | Their goal kick (back, wait, GO) | 1-0 | Built |
| 5 | Our kick-in (FA pass-in or dribble-in) | 1-0 | Built |
| 6 | Their kick-in. They score a great shot before half-time, told not tested | 1-1 | Built |
| - | Half-time: drinks and a team talk, told at the start of level 7 | 1-1 | Built |
| 7 | Second-half centre kick (who kicks off is told, never tested) | 1-1 | Built |
| 8 | Our corner (FA 5v5: five yards). Hits the post | 1-1 | Built |
| 9 | Their corner (FA 5v5: five yards). Our keeper catches it and starts a break, and our front player is tripped: a penalty | 1-1 | Built |
| 10 | Our penalty in the last minute (spot 6 yards out, a guess Rich agreed). She picks a corner and scores | 2-1 | Built |
| - | Full time: handshakes and Coach praises the effort, told at the end of level 10. Match shiny | 2-1 | Built |

Replays and difficulty levels were added on 27th November 2026: see "Replays and difficulty" in CLAUDE.md. They score before half-time in every mode. On Difficult, if a mistake gives them an extra goal, our corner at level 8 goes in off the post, so the match ends 3-2 to us.

## The cup (27th November 2026)

The match is now played three times as a cup run: Round 1 (Easy), the semi-final (Medium) and the final (Difficult). The table above is the Round 1 order. The other rounds play the same ten levels in a different order, kept in `src/data/levels.json`:

| Round | First half | Second half |
| --- | --- | --- |
| Round 1 | 1, 2, 3, 4, 5, 6 | 7, 8, 9, 10 |
| Semi-final | 1, 2, 5, 3, 6 | 7, 4, 8, 9, 10 |
| Final | 1, 2, 4, 5, 6 | 7, 3, 8, 9, 10 |

Fixed in every round: our kick-off and their restart first (1, 2), their goal just before half-time (6), the second-half kick-off (7), and their corner leading to the last-minute penalty (9, 10). The tests check this for every round. On the match clock, the first half's moments run from kick-off to 16 minutes and the second half's from 20 minutes to the last minute.
