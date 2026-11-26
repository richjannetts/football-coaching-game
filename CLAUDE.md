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
- Audio: HTMLAudioElement, one MP3 per script line. Device speech as fallback.
- Storage: localStorage behind one small wrapper module.
- Hosting: GitHub Pages. Set the Vite `base` to the repository name.

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

- Every instruction is spoken and shown in pictures. Words on screen are off by default (Rich's choice, 26th November 2026), switch on in the grown-ups area, and come on by themselves if the phone has no voice. Many 6 year olds cannot read fluently. The one exception is the bonus question: its question and answer labels are always shown, big and bold, as well as spoken (Rich's choice, 26th November 2026).
- A wrong answer gets a friendly whistle, a picture of why, a hint, and another go straight away. Hints step up: nudge, show, do it together.
- A wrong answer never loses the match or concedes a goal.
- Praise effort, not cleverness.
- No timer pressure, no streaks, no daily rewards. Football stickers collected are a record of progress.
- Each level ends with one bonus question on what it taught, with three picture answers. Right earns a bonus sticker. Wrong is never called wrong: the right picture glows and the voice explains it. She can try again next time she plays the level.
- A correct line-up starts the play. Goals come from a passing move, so the message is "we were ready", not "stand here and score".
- Explainer animations have no tappable extras. Touch is off while one plays.
- Capable girl players. Not pink by default.

## Privacy rules

- First name or nickname only, short, with a prompt not to use a full name. No other free text.
- Avatar from preset options. No photos.
- No camera, microphone, location or notification permissions.
- No requests to any other website. Fonts, images and audio all sit inside the app. No analytics.
- A grown-ups area behind a simple gate holds "Delete everything" and the privacy note.
- This repository is public. Never commit a real child's name, a photo, or anything from the coaching folder. No club crest or FA branding.

## Content as data

Keep content out of the code so it can be swapped later.

- `src/data/rules/`: one file per rule set (body, season, format, age groups). Each rule has a value, source and last-checked date. A local file can extend a parent.
- `src/data/team.json`: team name, kit colours and the coach's shapes, as spots on a grid.
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

## Not in scope yet

A coach editor, sharing a team code, goal kicks, kick-ins, recorded voice, polished artwork.
