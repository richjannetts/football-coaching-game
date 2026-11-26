# Football rules game: Phase 2 research (context file)

Researched 25th November 2026. Covers artwork, voice, children's privacy and technical pitfalls.
Full report with all sources: https://claude.ai/artifact/3VudJdYdYToexSNyZnYdgA
Read alongside football-game-phase1-research.md (rules, child design evidence, existing products).

## Scope agreed on 25th November 2026

- The game is now a coaching game: the child places all five players to match the coach's team shape, then watches the result play out. Rules lessons (kick-off first) sit alongside.
- Each child learns every spot in the shape, not one fixed position. This keeps it in line with FA guidance on rotating young players.
- Version one: Rich and his daughter on one family device. His own team's shape is built in as data.
- Stage two, only if it lands: share with the team. Coach editor and sharing come then.
- Status: research complete. Nothing built. Agree a build plan with Rich before writing code.

## Open decisions (not yet agreed by Rich)

1. Own recorded voice for version one. Recommended.
2. Plain code-drawn artwork for version one. Recommended.
3. Host: Cloudflare Pages or GitHub Pages recommended. He already uses Netlify, whose free plan charges credits per deploy.
4. Which devices he and his daughter will use.
5. Still open from phase 1: Match Day framing, retreat line as lesson 2.

## Recommended stack (version one)

- Plain HTML, CSS and JavaScript. Vite with vite-plugin-pwa (generateSW) so every file, including audio, is precached automatically.
- Pitch: one inline SVG with a fixed viewBox. Convert pointer coordinates to viewBox units (getScreenCTM().inverse()).
- Tokens: large SVG groups or buttons. Pointer Events. No drag library. No HTML5 drag and drop API.
- Input: tap a player then tap a spot is the main interaction. Drag is an extra.
- Animation: CSS and the Web Animations API. No Lottie, Rive or video. Respect prefers-reduced-motion.
- Voice: HTMLAudioElement, mono MP3 at about 64 kbps, one file per script line.
- Storage: localStorage behind a small wrapper so it can move to IndexedDB later.
- No third-party requests of any kind. Self-host fonts, images, audio.

## iPhone and iPad rules (highest risk)

1. Install first. Safari deletes script-writable storage after 7 days without interaction. Home Screen web apps are exempt. First screen asks the parent to Add to Home Screen. Call navigator.storage.persist() in the installed app.
2. Safari and the installed app have separate storage, by design. Progress made in a Safari tab does not appear in the app.
3. Audio must start synchronously inside a tap handler. No await or fetch before play(). Reuse one unlocked audio element and chain clips on the "ended" event.
4. Cached audio and range requests: precache whole files. Play from a Blob URL (read from cache, URL.createObjectURL) so the service worker never has to answer a range request. Otherwise add range handling.
5. Silent switch: keep narration on HTML audio, not Web Audio. If Web Audio is used for effects, set navigator.audioSession.type = "playback" where available.
6. No install prompt on iOS (Share, then Add to Home Screen). Android Chrome supports beforeinstallprompt.
7. screen.orientation.lock is not supported on iOS. Design for both orientations.
8. Screen Wake Lock works in installed iOS web apps only from iOS 18.4. Re-request on visibilitychange. Keep explainers short.
9. Layout: 100dvh with 100vh fallback, viewport-fit=cover, env(safe-area-inset-*).
10. Updates: versioned cache name, delete old caches on activate, fixed sw.js filename served no-cache, show "new version ready" only between lessons.

## Touch handling for small hands

- touch-action: none and user-select: none on the pitch only. -webkit-touch-callout: none and overscroll-behavior: none on html and body. touch-action: manipulation on buttons.
- Track one active pointer. Ignore pointerdown during a drag or where isPrimary is false.
- Ignore a new touch within about 300 ms and 40 px of the last accepted one.
- pointercancel returns the token to where it was. A dropped drag never loses a player.
- Hit area about 110 to 130 CSS px (roughly 2 cm; estimate), larger than the drawn token. Snap to the nearest sensible spot.
- Keep tokens and controls out of the outer 20 to 30 px of the screen.

## Voice structure (swappable)

- /script/lines.json: array of { id, text, cue }.
- /voices/<pack>/<id>.mp3: one file per line id.
- /voices/packs.json: lists packs and which is active.
- Fallback order: recorded file, then speechSynthesis with lang en-GB, then caption and visual cue (always shown).
- Captions come from the same script text.
- Normalise recordings to about -16 LUFS in Audacity as the last step.
- Version one: say the child's name inside recorded lines. For the team: show the name on screen and leave it out of audio.

## Artwork structure (swappable)

- Avatar and top-down token built from layered SVG parts with fixed layer names. Colours via CSS variables (skin, hair, shirt, shorts, socks).
- Representation in the main menus: at least six skin tones; afro, braids, curls, straight, bun and short hair; hijab; glasses; hearing aids. All defaults should look good.
- Pitch drawn in SVG. Kenney Sports Pack (CC0) is an option for top-down art; contents not confirmed.
- No AI-generated characters for core artwork. No club, FA or brand marks. No copyrighted characters.
- Do not use unDraw inside the app (its terms advise against it).
- If commissioned later: same layer names, editable vector source, written warranty of original non-AI work.

## Privacy by design checklist (build in from version one)

- First name or nickname only, short length limit, prompt not to use a full name.
- No other free text. Avatar from presets only. No photo upload.
- No camera, microphone, location, contacts or notification permissions. No push notifications.
- Zero third-party requests. Set a Content Security Policy that blocks other origins. Host analytics off.
- Parent area behind a simple gate: Delete everything, privacy note, app info, how to use Guided Access or app pinning.
- No external links, or only behind the parent gate.
- First-run parent screen: "This game saves on this device only", with a button to agree.
- No streaks, guilt messages or rewards for sharing.
- A one-screen privacy note for parents and a four-line version for the child.

Legal position (summary, not legal advice):

- Stage 1, family use: UK GDPR household exemption applies. No ICO fee, no consent banner, no paperwork.
- Local storage of the child's own inputs falls under the "strictly necessary" exemption in PECR Schedule A1 (in force from 5th February 2026).
- Stage 2, team: uncertain whether the coach counts as a controller. Act as if the rules apply. Never receive children's data. Keep a short written note of reasoning. Tell the club welfare officer first.
- Stage 3, public: treat UK GDPR and the Children's Code as applying.

## Sharing the team shape (stage two only)

- Encode five grid positions, palette-index kit colours, team name and a version number. About 30 to 60 characters (estimate). Base64url.
- Put it in the URL fragment (#t=v1.XXXX). Fragments are not sent to the server.
- Android Chrome: the link usually opens the installed app. Read the fragment on launch.
- iPhone: the link opens Safari, which cannot reach the installed app's storage. Show a preview page with "Copy team code", and an "Add my team" paste screen in the app.
- Code short enough to type (8 to 12 characters, no 0/O/1/l look-alikes).
- No in-app QR scanner (camera permission). No player names in the code.
- Version one should already store the team shape in this format.

## First build target (proposed, not yet agreed)

The pitch, five tokens, tap-then-tap placing and one recorded line, installed and working offline on Rich's own phone. This tests the four iPhone risks at once: install, offline, sound and touch.

## Real-device test checklist

1. Install on iPhone (Share, Add to Home Screen) and Android Chrome. Launch from the icon.
2. Close fully, airplane mode, relaunch, play every lesson with sound.
3. Silent switch on: narration still plays.
4. Lock and unlock mid-lesson: audio recovers or offers replay.
5. Two-finger, palm and rapid taps on the pitch: tokens do not jump or duplicate.
6. Tap-then-tap and drag in both orientations, including rotating mid-drag.
7. Long press, double tap, pinch, pull down: no callout, zoom or refresh.
8. Deploy an update: banner appears, progress survives.
9. Oldest iPad and cheapest Android tablet available, with reduced motion on.

## Could not confirm

- Whether the reported iOS 26.0.1 audio bug in installed web apps is fixed.
- Exact Safari behaviour when cached audio is served without range support.
- Whether the silent switch mutes HTML audio on current iOS (secondary sources say no).
- speechSynthesis behaviour inside installed iOS web apps.
- Contents of the Kenney Sports Pack.
- Whether a developer is a controller for device-only data (no ICO guidance).
- OpenAI TTS shutdown date (reported as 6th January 2027) and Netlify credit rules: from research, not re-checked.
- Illustrator price ranges (one survey, one listing).

## Key sources

- WebKit tracking prevention (7-day rule): https://webkit.org/tracking-prevention/
- WebKit bug 181849 (separate storage): https://bugs.webkit.org/show_bug.cgi?id=181849
- WebKit storage policy: https://webkit.org/blog/14403/updates-to-storage-policy/
- MDN autoplay guide: https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay
- Workbox cached audio and video: https://developer.chrome.com/docs/workbox/serving-cached-audio-and-video
- web.dev PWA update guide: https://web.dev/learn/pwa/update
- WCAG 2.2 dragging movements: https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html
- firt.dev iOS PWA compatibility: https://firt.dev/notes/pwa-ios/
- ICO Children's Code scope: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/services-covered-by-this-code/
- PECR Schedule A1: https://www.legislation.gov.uk/uksi/2003/2426/schedule/A1
- UK GDPR Article 2: https://www.legislation.gov.uk/eur/2016/679/article/2
- FA safeguarding guidance 6.1: https://www.thefa.com/-/media/thefacom-new/files/rules-and-regulations/safeguarding/21-10-2025/61-running-websites-and-social-media-platforms.ashx
- Kenney licence: https://kenney.nl/support
- DiceBear licences: https://www.dicebear.com/licenses/
- Audacity loudness normalisation: https://manual.audacityteam.org/man/loudness_normalization.html
- Piper commercial use notes: https://raw.githubusercontent.com/OHF-Voice/piper1-gpl/main/docs/COMMERCIAL_USE.md
