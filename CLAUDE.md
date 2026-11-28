# Football coaching puzzle game

A story-led puzzle game that teaches 6 to 9 year old footballers where to stand and what to do at restarts. Built by Rich, a grassroots coach in England, for his under-8 girls team. Version one is for Rich and his daughter on one iPhone, and should also install on other iPhones and Android phones. Rich is learning to build with Claude Code, so explain choices in plain language.

Background research is in `docs/research/`. The coaching content is in `docs/coaching-shape.md`. Read both before changing game content.

## What the game is

- An offline progressive web app, installed to the iPhone Home Screen.
- A match-day story told in short chapters. Each chapter is a puzzle. Solving it plays out the next bit of the match.
- The child places all five of our players. Any outfield player can go on any outfield spot. The game checks which spots are filled, not who is on them, because the FA advises rotating young players through every position. One squad player is marked as goalkeeper in `team.json` and wears the keeper top from the start; she is the one who goes in goal (Rich's choice, 26th November 2026). Change who is marked to rotate keepers.
- Two kinds of right answer, kept separate in code and in wording:
  - "The rule says": the FA 5v5 rule. Objective.
  - "In our team": the coach's shape. A preference, stored as data. (Rich found "Our team does" unclear, 26th November 2026.)

## Stack

- Plain HTML, CSS and JavaScript. No framework.
- Vite, with vite-plugin-pwa in generateSW mode so every file, including audio, is precached.
- Pitch: one inline SVG with a fixed viewBox. Convert pointer positions to viewBox units.
- Input: Pointer Events. Tap a player then tap a spot is the main input. Drag is an extra. No drag library. No HTML5 drag and drop API.
- Animation: CSS and the Web Animations API. No Lottie, Rive or video. Respect prefers-reduced-motion.
- Audio: HTMLAudioElement, one MP3 per script line. Device speech as fallback. On iPhone, never call `speechSynthesis.cancel()` and then `speak()` straight away: `src/lib/narrator.js` waits a moment after a cancel, lets a button tick finish first, and picks a line up again from its last word if it goes quiet.
- Game sounds (taps, cheers, goal fanfare): made in code as tiny WAV files (`src/lib/tones.js`), no sound files. Small taps play on their own audio element (`src/lib/sfx.js`) and stay quiet while the voice speaks. Big moments are `sfx.*` lines in the narrator's chain, between spoken lines. A grown-ups switch turns them off; the whistle always plays.
- Confetti: plain squares moved with the Web Animations API (`src/lib/confetti.js`). None when the phone asks for reduced motion.
- Storage: localStorage behind one small wrapper module.
- Hosting: GitHub Pages. Set the Vite `base` to the repository name.

## Look

The "Saturday morning" look (Rich's choice, 26th November 2026). Colours and fonts are set once, at the top of `src/style.css`.

- Blue sky background, navy words, white panels.
- Yellow always means "tap me next". Purple only ever means the bonus.
- Buttons are chunky: a thick bottom edge, and they sink when pressed.
- Two fonts, kept in `src/fonts/` with their licences: Titan One for the logo and banners, Fredoka for everything she reads. Fredoka's a and g are the shapes children learn at school.
- One football drawing (`src/lib/ball.js`) is used everywhere: pitch, bonus pictures, title and stickers. A classic black and white ball, because Rich's daughter did not recognise a plain dot.
- Goals are drawn half as wide again as true scale, so they look right next to the players. The rules still use the real goal size.
- Players on the pitch are mini copies of the full player, drawn by the same code in `src/lib/avatar.js`, so any look carries across. They stay upright in landscape. A keeper has a round GK badge by her shoulder.
- Each of our players has her name on a small plate under her feet. Long names are cut short there. In landscape, names on the bench wait until a player is picked up, because the bench is a column.
- A small scoreboard above the pitch shows both team names with a dot of each kit colour.
- The menu is the cup path (`src/lib/path.js`, drawn in `src/screens.js`, Rich's choice, 27th November 2026, after the match clock did not work for him): one winding trail up the screen through the whole cup. Round 1's moments, a flag and the semi-final's, a flag and the final's, then the cup at the top (gold once she has won a cup). Each moment shows its place in its round (1 to 4 or 5). Finished moments are green, the one to play next is yellow and glows, the rest are white and locked. Her player stands beside the next moment and hops up when she passes one. Only the round she is in can be played from the path. The match's minutes still come from `src/lib/clock.js` for the scoreboard. Who she is playing sits under the top buttons.
- The sticker album (`src/lib/album.js`, `src/lib/stickers.js`) has cream paper pages with numbered spaces, opened from the book button or the sticker count on the path screen. Page order (Rich's choice, 26th November 2026): our team with the coach, club colours, world colours, kit bag, training ground (added 28th November 2026), shinies. Club and world colours are made-up kits with made-up names: colours and patterns only. Never a badge, a sponsor, a real club or a country name.

## Commands

- `npm install`
- `npm run dev`
- `npm run build`
- `npm test` (Node's own test runner, no extra library)
- `npm run preview`: serve the built game locally, to try it offline

Keep these four working. Add a line here if a new command is introduced.

## iPhone rules

These come from the research. Each has caused real failures in other web apps.

1. The first screen asks the grown-up to add the game to the Home Screen. Safari deletes site data after 7 days without use. Installed web apps are exempt. Progress lives only in the installed app.
2. Sound must start directly inside a tap handler, with no `await` before `play()`. Unlock one audio element on the first tap and reuse it.
3. Play cached audio from a Blob URL, so Safari never asks the service worker for a byte range.
4. Narration uses the ordinary audio element, not Web Audio, so the silent switch does not mute it.
5. iPhone cannot lock orientation. Support portrait and landscape.
6. Use `100dvh` with a `100vh` fallback, `viewport-fit=cover` and the safe-area insets.
7. Service worker: versioned cache, old caches deleted on activate, fixed `sw.js` name. Offer an update only between chapters.
8. Always show a "hear it again" button. Never leave the child stuck if sound fails.

## Android and Chrome

Added at Rich's request, 26th November 2026, so others can play on their own phones.

- The install screen picks its steps from the phone and browser (`src/lib/platform.js`): iPhone Safari, iPhone Chrome (Share, then Add to Home Screen), Android Chrome (menu, then Install app) and Samsung Internet.
- On Android Chrome, keep the `beforeinstallprompt` event and offer a one-tap "Install Spots!" button.
- The manifest must keep a name, 192 and 512 px icons, `start_url`, `display: standalone` and the service worker, or Chrome stops offering "Install app".
- Voice: only voices on the device. Google's female British voices on Android are named `en-gb-x-gba`, `gbc` and `gbg`.

## Touch rules for small hands

- Touch area for each player about 110 to 130 CSS pixels, bigger than the drawing.
- Track one finger. Ignore other touches during a move. Ignore a touch within about 300 ms and 40 px of the last one.
- `touch-action: none` and `user-select: none` on the pitch only.
- A cancelled or dropped move puts the player back. A player is never lost.
- Snap to the nearest spot. Keep players and buttons away from the outer 24 px of the screen.

## How it should feel

- A new player's first run (Rich's choice, 27th November 2026): a short story (three picture pages), then she makes her player, meets her team-mates, sets up the other team, and one last story page takes her to the cup path. All of it can be changed later on the "My team" screen.

- Every setup step (story pages, her player, team-mates, the other team) has a back button (Rich, 27th November 2026).
- The first time she meets each kind of button, a yellow "Tap here!" pointer shows it (`src/lib/firstTap.js`): Play, the story arrow, the setup tick, the team ticks, the first moment on the path, the cup screen's tick and the Ready tick. Once tapped, that pointer never comes back.
- Passing moves name the real players: script lines use `{mate|a friend}` style words, filled by `stage.callNames`.
- The last story page before the path shows her sticker book and explains that each right bonus answer wins a sticker. A right bonus answer gets a full-screen "New sticker!" moment, then her album page appears and the sticker flies into its numbered space, before it settles beside the medal. The first time she has a sticker, a pointer shows the book on the path screen (Rich, 27th November 2026).
- Every instruction is spoken and shown in pictures. Words on screen are off by default (Rich's choice, 26th November 2026), switch on in the grown-ups area, and come on by themselves if the phone has no voice. Many 6 year olds cannot read fluently. The one exception is the bonus question: its question and answer labels are always shown, big and bold, as well as spoken (Rich's choice, 26th November 2026).
- A wrong answer gets a friendly whistle and another go straight away. The first wrong try gives only a gentle nudge: "not quite", plus which player or part of the pitch to think about, and those players hop (`src/lib/nudge.js`). No reasons, no glowing spots (Rich, 27th November 2026). On Easy only, yellow circles also flash for a moment on the places still to fill, after every wrong try until the glowing spots take over, never before her first try (Rich, 27th November 2026; `flash` in `difficulty.json`). Then help steps up: a picture of why, the glowing spots, then do one together. How soon each step comes is set per difficulty in `src/data/difficulty.json`.
- A wrong answer never loses the match. On Easy and Medium it never concedes anything. On Difficult only, a first wrong try at a line-up can let them win the ball, or have a shot that goes wide, or score once (only at levels 2, 4 and 7, and only in a round where our corner at level 8 comes later and goes in off the post, so she can always still win; the current final has no such goal), told kindly. A grown-ups switch turns this off (`src/game/consequence.js`).
- After a right line-up, a short coaching tip says what to do next in the game, such as "be first to their pass, or tackle if they dribble it in" (`coach.c1` to `coach.c10`). Bonus answers end with one too.
- The dotted ring is never on a real pitch. Words always give the distance as "five big steps" and call the ring a helper that shows how far (Rich, 27th November 2026).
- Praise effort, not cleverness.
- No timer pressure, no streaks, no daily rewards. Stickers collected are a record of progress. Passing a level moves her up the path, and winning a match moves her on in the cup. The first sticker she wins is her own player (sticker 1, Rich's choice, 27th November 2026), and finishing every level of a match gives a shiny sticker.
- Each level ends with one bonus question on what it taught, with three picture answers. Right wins the next sticker in the album, once for each level. Wrong is never called wrong: the right picture glows and the voice explains it. She can try again next time she plays the level.
- A correct line-up starts the play. Goals come from a passing move, so the message is "we were ready", not "stand here and score".
- Explainer animations have no tappable extras. Touch is off while one plays.
- Capable girl players. Not pink by default.

## Privacy rules

- First name or nickname only, short. The name box keeps only one word of letters. Rich removed the "not a full name" sentence and the "stays on this phone" note from the setup screens (27th November 2026); the welcome screen still tells grown-ups the game saves on this device only. This goes for every player. The only other free text is the two team names: letters and spaces only, 16 characters at most, with a prompt to make them up (Rich asked for team names, 26th November 2026).
- Avatar from preset options. No photos.
- No camera, microphone, location or notification permissions.
- No requests to any other website. Fonts, images and audio all sit inside the app. No analytics.
- A grown-ups area behind a simple gate holds "Delete everything" and the privacy note.
- This repository is public. Never commit a real child's name, a photo, or anything from the coaching folder. No club crest or FA branding.

## Content as data

Keep content out of the code so it can be swapped later.

- `src/data/rules/`: one file per rule set (body, season, format, age groups). Each rule has a value, source and last-checked date. A local file can extend a parent.
- `src/data/team.json`: the starting team name and player names (made up), kit colours, the kit choices for both teams (`kitOptions`, `ourKit`, `theirKit`: shirt styles and colours), and the coach's shapes, as spots on an evenly spaced grid. Each shape spot has an ideal dot (`at`) and a `zone`: a box in yards where anywhere counts, so the child only needs the right area (Rich's choice, 27th November 2026). Kick-ins use jobs instead of areas (Rich's choice, 27th November 2026): each spot has a `job`, such as "3 to 10 yards from the ball, for a short pass", "stay back", or "goal side of their player, within 6 yards" (`doesJob` in `src/lib/checks.js`). Anywhere that does the job counts, and a missing job is named in the feedback. The rule check is unchanged.
- The child can change every player's name and look, both team names and both teams' kits (shirt style, shirt colours, shorts and socks) on the "My team" screen. Our kit starts as blue and yellow stripes (Rich's choice, 27th November 2026). The two teams can't wear the same shirt colour: the other team's shirt colour is shown crossed out. Each keeper gets the first colour from its list that neither team is wearing. Her changes are saved on the phone and laid over `team.json` by `src/lib/myteam.js`.
- `src/data/levels.json`: the levels, grouped into matches (for the album and shinies), and the cup: its rounds, each round's difficulty and its own order of moments, half by half, the story's goals, and the story rules every order must keep (checked by `tests/cup.test.js`).
- `src/data/stickers.json`: the album pages and every sticker, in the order they are won. Nothing extra is saved for stickers: they follow from her progress.
- `src/data/difficulty.json`: Easy, Medium and Difficult. How soon each kind of help comes, whether the dots show, and the Difficult consequences. In the cup the rounds go Easy, Medium, Difficult. `flash` turns on the Easy yellow flash.
- `src/data/replays.json`: the cup's later rounds. The made-up teams she plays (names and kits only, same privacy rules as the album), the levels that can switch sides, and how many full-time endings there are.
- `src/data/script.json`: every spoken line as `{ id, text, cue }`.
- `src/data/quiz.json`: the bonus question for each level: words on screen, the three pictures, which one is right, and the script lines it speaks.
- `public/voices/<pack>/<id>.mp3`: one file per line. `public/voices/packs.json` names the active pack.
- Speech fallback order: recorded file, then device speech in en-GB, then caption and visual cue, which are always shown.
- Avatar parts are layered SVG with fixed layer names and colours set by CSS variables.

## The rule: 5v5 centre kick (FA, under-8 and under-9, 2026/27)

- Taken from the centre mark.
- Every player is in their own half.
- The other team is at least five yards from the ball.
- The ball can go in any direction.
- No goal straight from the kick.
- There is no centre circle in 5v5. Draw a dashed five-yard ring as a helper and say it is a helper.
- Not confirmed for 5v5, so do not test the child on them: which team kicks off after a goal, and whether the kicker can touch the ball twice. Level 2's story has them restart after our goal, at Rich's request. It is told, never tested.

## The rule: 5v5 goal kicks (FA retreat line, under-7 to under-11)

- At a goal kick, the other team goes back into its own half until the ball is kicked. In 5v5 the retreat line is the halfway line.
- Level 3 tells this (their players walk back). Level 4 tests it: all of ours in our own half.
- Not confirmed yet, so not tested: exactly when they may cross (as the ball is kicked, or once it is received), and whether the keeper may dribble it out.

## The rule: 5v5 corners (FA, under-7 to under-11)

- The ball sits still in the corner. One of our players takes it (level 8 tests this).
- The other team stands at least five yards from the ball until it is kicked (level 9 tests this, with a dashed helper ring).
- Not confirmed yet, so not tested: whether a goal can be scored straight from a corner.

## The rule: 5v5 penalties (FA Law 14)

- One of ours takes it from the penalty spot. Everyone else, apart from the keepers, stays outside the penalty area and at least five yards from the spot until it is kicked (level 10 tests this). The box line counts as inside the box.
- The ball must be kicked forward.
- The handbook gives no spot distance for 5v5. The game uses 6 yards, a guess Rich agreed (27th November 2026). It is drawn for her, never tested.

## Match 1

The full match is storyboarded in `docs/match-1-storyboard.md` (agreed by Rich, 27th November 2026): ten levels, kick-off to full time. All ten levels are built. The cup now spreads them over three short rounds; playing every level once (across the cup) gives the Match 1 shiny. A match still being built has `complete: false` in `levels.json`, so its shiny waits for full time. The scoreboard shows the score and the minute. The score as a level starts comes from the story's goals in the levels before it in this round's order (`stage.startScore`, `stage.storyGoal`), so it is right in any order. Lines at the end of a level that lead into the next one ("that's the next level") are only said when that level really is next (`stage.linked`). "Level three done" says the moment's place in this round (`{levelNo}`).

## The cup, replays and difficulty

Replays and difficulty built 27th November 2026. The cup replaced the difficulty picker later that day (Rich's choice). A match clock briefly replaced the level path, then the path came back as one cup path (Rich, 27th November 2026).

- The matches make a cup: Round 1 (Easy), the semi-final (Medium), then the final (Difficult). The order is fixed, so she always knows she will move on if she keeps trying, and that it gets harder. The cup screen between rounds shows the cup run, the next team and the balls, and the voice says so. Winning the final wins the cup: a full-screen "Cup winners!" moment with the trophy, her team, confetti, the fanfare and Coach's words. Then a yellow "New cup" button starts again, against new teams.
- Round 1 of her first cup is her first time through the match, saved in `progress`. Every other round is played like a replay, saved separately (`src/lib/replays.js`, store key `replays`), so her own progress, stickers and team never change. Where she is in the cup is saved under `cup` (`src/lib/cup.js`). A player who finished the match before the cup existed starts at the semi-final.
- Each round is a short match of 4 or 5 moments, and the skills are spread across the cup (Rich, after his daughter found ten levels too many, 27th November 2026): Round 1 is kick-offs and goal kicks (1, 2 | 3, 4), the semi-final is kick-ins and corners (5, 6 | 8, 9), the final is a mix ending with the penalty to win the cup (1, 6 | 7, 9, 10). Each round has its own story goals in `levels.json` and always ends in a win (1-0, 2-1, 2-1). The story rules every round must keep are in `cup.story` and checked by `roundProblems` in `src/lib/cup.js`: 2 straight after 1, 10 straight after 9 and only last, 6 ends the first half, 7 starts the second. Level 9 either scores on the break or leads to the penalty. At level 9 our keeper catches their corner, puts the ball down, dribbles out and passes up to start the break, so the keeper is part of the play (Rich, 28th November 2026: a save, then dribble out, never a pass back to her). While she is out, the friend from the near post stays close to our goal, and Coach says why (`c9.cover`). A round can place a moment at a set minute (`minutes`). A level that does not blow its own whistle gets a general half-time or full-time whistle (`ht.whistle`, `ft.whistle`).
- Earlier progress: a phone that finished Round 1's levels starts at the semi-final, and an old replay whose levels are all done counts as won.
- Each later round also brings a new team and kit, some of levels 3 to 6, 8 and 9 drawn the other way round (the pitch flips its drawing and finger positions in `src/lib/pitch.js`, so levels and rules need no changes), and the next of three full-time endings.
- Difficult has no dots. Players snap to an unseen one-yard grid (`freeSpots` in `src/lib/geometry.js`), and every shape spot's zone decides if she is right.
- The score in spoken lines comes from `{score}` and `{final}`, so extra goals on Difficult are said correctly.
- Stickers stay first-time-only for bonus answers, whatever the round.
- A grown-up can stop a round in the grown-ups area. Her levels and stickers stay, and she can start that round again from the path.

## Match day and Training night

Built 28th November 2026 (Rich's choices). The game opens on two big doors after the Play button: Match day and Training night. Neither locks the other. A new player's first run still ends on the cup path.

- Match day (`src/trainingScreens.js`): a yellow Cup run tile opens the cup path, and a Coming soon tile marks a future kind of match. The cup path's back button returns to Match day.
- Training night: mini-games grouped like the FA fundamentals Rich coaches: when we have the ball (Dribble, Pass, Shoot), when they have the ball (Tackle, Press, Intercept) and goalkeeping (Get in line, Save it, Play it out), then 100 touches a day at home. The menu and the puzzles are data in `src/data/training.json`. A tile with `built: false` shows as coming soon.
- A mini-game is three short puzzles on the match pitch, run by `src/game/drill.js`: she moves one player and taps the tick, and the move plays out. Pass, Intercept and Get in line share one check, a player on (or clear of) the line between two points (`src/lib/drillChecks.js`). Anywhere that does the job counts. Help steps up: a nudge, then a flash on a good place, then do it together. No timer.
- In goalkeeping, her own player goes in goal: every girl gets a turn (FA advice).
- Coaching points Rich added for later mini-games: Shoot at the best time, not too far out and not too close. The keeper sometimes comes out with the ball, and then a defender stays close to goal.
- 100 touches a day (`src/lib/touches.js`, store key `touches`): a grown-up sets the touches and days with two iPhone-style dials. One ball a day. Stickers come from the total (the first ball, half the chart, a full chart), never from days in a row, and a missed day stays blank. "Print the chart" uses the phone's own print, with an A4 layout in `@media print`.
- The Training ground album page (before the shinies) holds the training stickers. Each names what wins it in `earnedBy`, and they never use up a bonus answer.

## Not in scope yet

A coach editor, sharing a team code, recorded voice, polished artwork.
