// The screens outside the chapters: install, first-run note, start,
// player setup, menu, grown-ups gate and grown-ups area.

import { h, s, motion } from './lib/svg.js';
import { buildCupPath } from './lib/path.js';
import { stickerCard, emptyCard } from './lib/stickers.js';
import { avatarSvg } from './lib/avatar.js';
import { missingStep } from './lib/profile.js';
import { menuDotsIcon, installIcon, shirtIcon, shortsIcon, sockIcon, trophyIcon } from './lib/icons.js';
import { ballIcon, bonusStickerSvg, titleLogo, titleScene, bookIcon, homeIcon, nextIcon, shareIcon, plusSquareIcon, tickIcon, backIcon, speakerIcon } from './lib/icons.js';
import * as narrator from './lib/narrator.js';
import { pointOnce } from './lib/firstTap.js';
import looks from './data/looks.json';
import { footballSvg } from './lib/ball.js';

import { NAME_MAX, TEAM_NAME_MAX, cleanName, cleanTeamName } from './lib/myteam.js';
export { NAME_MAX, cleanName };

// A quick "not yet" wobble, for a locked level.
function shake(el) {
  el.classList.remove('is-shaking');
  void el.offsetWidth;
  el.classList.add('is-shaking');
  setTimeout(() => el.classList.remove('is-shaking'), 600);
}

const againButton = () =>
  h('button', { class: 'icon-btn again', type: 'button', 'aria-label': 'Hear it again', onclick: () => narrator.replay() }, speakerIcon());

// ---------- Install (grown-up) ----------
// The steps differ by phone and browser (Rich asked for iPhone Safari,
// iPhone Chrome and Android Chrome, 26th November 2026).
export function installScreen({ platform, canInstall, onInstall, onSkip }) {
  const step = (iconEl, ...text) => h('li', {}, h('span', { class: 'step-icon' }, iconEl), h('span', {}, ...text));
  const openStep = (where) => h('li', {}, h('span', { class: 'step-icon icon-app' }, ballIcon(true)), h('span', {}, 'Then open ', h('strong', {}, 'Spots!'), ` from ${where}.`));
  let steps;
  let why;
  if (platform === 'ios-safari') {
    steps = [
      step(shareIcon(), 'In Safari, tap the Share button.'),
      step(plusSquareIcon(), 'Scroll down and tap ', h('strong', {}, 'Add to Home Screen'), ', then ', h('strong', {}, 'Add'), '.'),
      openStep('your Home Screen'),
    ];
  } else if (platform === 'ios-other') {
    steps = [
      step(shareIcon(), 'Tap the Share button, at the top right next to the web address.'),
      step(plusSquareIcon(), 'Scroll down and tap ', h('strong', {}, 'Add to Home Screen'), ', then ', h('strong', {}, 'Add'), '.'),
      openStep('your Home Screen'),
    ];
  } else if (platform === 'android-chrome') {
    steps = [
      step(menuDotsIcon(), 'Tap the menu button, the three dots at the top right.'),
      step(installIcon(), 'Tap ', h('strong', {}, 'Install app'), ' (on some phones it says ', h('strong', {}, 'Add to Home screen'), '), then ', h('strong', {}, 'Install'), '.'),
      openStep('your Home Screen or app list'),
    ];
  } else if (platform === 'android-samsung') {
    steps = [
      step(menuDotsIcon(), 'Tap the menu button, the three lines at the bottom right.'),
      step(installIcon(), 'Tap ', h('strong', {}, 'Add page to'), ', then ', h('strong', {}, 'Home screen'), '.'),
      openStep('your Home Screen'),
    ];
  } else {
    steps = [
      step(menuDotsIcon(), 'Open your browser menu.'),
      step(installIcon(), 'Look for ', h('strong', {}, 'Install app'), ' or ', h('strong', {}, 'Add to Home Screen'), '.'),
      openStep('your Home Screen'),
    ];
  }
  if (platform.startsWith('ios')) {
    why = 'Why: iPhone clears saved games from websites after 7 days without use. Games on the Home Screen are kept. Progress made in the browser will not carry over to the Home Screen game.';
  } else {
    why = 'Why: installed, the game opens full screen, works without internet and keeps her progress on this phone.';
  }
  return h(
    'section',
    { class: 'screen grown-up install' },
    h('h1', {}, 'Spots!'),
    h('p', { class: 'lead' }, 'Grown-ups: please add this game to your Home Screen before playing.'),
    canInstall ? h('button', { class: 'install-btn', type: 'button', onclick: onInstall }, installIcon(), 'Install Spots!') : null,
    canInstall ? h('p', { class: 'small' }, 'Or do it from the browser menu:') : null,
    h('ol', { class: 'install-steps' }, ...steps),
    h('p', { class: 'small' }, why),
    h('button', { class: 'text-btn', type: 'button', onclick: onSkip }, 'Play in the browser anyway (progress may not be kept)')
  );
}

// ---------- First-run note (grown-up) ----------
export function welcomeScreen({ onAgree }) {
  return h(
    'section',
    { class: 'screen grown-up welcome' },
    h('h1', {}, 'Before you start'),
    h('p', { class: 'lead' }, 'This game saves on this device only.'),
    h(
      'ul',
      { class: 'plain-list' },
      h('li', {}, 'Nothing is sent anywhere. No accounts, no adverts, no tracking.'),
      h('li', {}, 'It works without the internet once installed.'),
      h('li', {}, 'You can delete everything from the Grown-ups button on the menu.')
    ),
    h('button', { class: 'big-btn', type: 'button', onclick: onAgree }, 'OK, let’s play')
  );
}

// ---------- Start (one tap so sound can begin) ----------
export function startScreen({ profile, onStart }) {
  const scene = h('div', { class: 'title-art' }, titleScene());
  if (profile) scene.append(h('div', { class: 'title-player' }, avatarSvg(profile, { size: 78, idSuffix: 'start' })));
  const playBtn = h('button', { class: 'play-btn', type: 'button', 'aria-label': 'Play', onclick: onStart }, ballIcon(true), h('span', { class: 'play-label' }, 'PLAY'));
  pointOnce(playBtn, 'play', { above: true });
  return h(
    'section',
    { class: 'screen start' },
    h('div', { class: 'title-block' }, titleLogo(), h('p', { class: 'title-sub' }, 'Football puzzles')),
    scene,
    playBtn,
    h('p', { class: 'small start-note' }, 'Turn the sound up.')
  );
}

// ---------- Story opening ----------
// A short story before a new player makes her player, so the game has a
// lead-in (Rich asked, 27th November 2026). Each page is a picture and one
// spoken line. Tap the arrow for the next page. Each line starts inside the
// tap, so sound is allowed to play.
// pages: [{ line, scene }] where scene is a name for storyScene().
// startAt: the page to open on (the last page, when she comes back to it).
// onBack: where the back button goes from the first page. Without it the
// first page has no back button.
// album: the sticker album as it stands, for the sticker book page.
export function storyScreen({ pages, team, profile, coach, album = null, onDone, onBack, startAt = 0 }) {
  let at = Math.min(Math.max(0, startAt), pages.length - 1);
  const art = h('div', { class: 'story-art' });
  const dots = h('div', { class: 'dots story-dots', 'aria-hidden': 'true' }, pages.length > 1 ? pages.map(() => h('i', {})) : []);
  const nextBtn = h('button', { class: 'ready-btn is-glow story-next', type: 'button', 'aria-label': 'Next' }, nextIcon());
  pointOnce(nextBtn, 'story');
  const backBtn = h('button', { class: 'icon-btn back-btn', type: 'button', 'aria-label': 'Back' }, backIcon());
  const show = () => {
    art.replaceChildren(storyScene(pages[at].scene, { team, profile, coach, album }));
    [...dots.children].forEach((d, i) => d.classList.toggle('on', i === at));
    backBtn.classList.toggle('is-hidden', at === 0 && !onBack);
    narrator.say([pages[at].line]);
  };
  backBtn.addEventListener('click', () => {
    if (at > 0) {
      at -= 1;
      show();
    } else onBack?.();
  });
  let lastTap = 0;
  nextBtn.addEventListener('click', () => {
    const now = Date.now();
    if (now - lastTap < 400) return; // a double tap turns one page
    lastTap = now;
    if (at >= pages.length - 1) return onDone();
    at += 1;
    show();
  });
  const el = h('section', { class: 'screen story' }, h('header', { class: 'menu-top story-top' }, backBtn, againButton()), art, dots, h('div', { class: 'setup-bottom' }, nextBtn));
  el.begin = show;
  return el;
}

// The pictures for the story pages, drawn from the real team.
function storyScene(name, { team, profile, coach, album }) {
  const figure = (look, opts, cls = '') => h('span', { class: `story-figure ${cls}` }, avatarSvg(look, opts));
  const empty = (big) => h('span', { class: `story-figure story-empty${big ? ' is-big' : ''}` }, h('span', { class: 'story-q' }, '?'));
  const coachFig = () => figure(coach.look, { size: 62, kit: coach.kit, pattern: 'coach', idSuffix: 'story-coach' }, 'is-coach');
  const mates = team.squad.filter((p) => !p.you).map((p, i) => figure(p, { size: 50, kit: p.keeper ? 'keeper' : 'us', idSuffix: `story${i}` }));
  const grass = (...kids) => h('div', { class: 'story-grass' }, ...kids);
  // Big words on the first page, for more of a match-day feeling (Rich
  // asked, 27th November 2026). Decoration only: the voice says it too.
  if (name === 'morning')
    return h('div', { class: 'title-art story-pic story-morning' }, titleScene(), h('div', { class: 'game-day', 'aria-hidden': 'true' }, h('span', { class: 'game-day-top' }, 'It’s'), h('span', { class: 'game-day-big' }, 'GAME DAY!')));
  if (name === 'coach') return h('div', { class: 'story-pic story-panel' }, grass(coachFig(), ...mates.slice(0, 2), empty(false), ...mates.slice(2)));
  if (name === 'you') return h('div', { class: 'story-pic story-panel' }, grass(empty(true)));
  // 'stickers': her sticker book, open at the first page (Rich asked for a
  // bigger deal to be made of it, 27th November 2026). Sticker 1 is her own
  // player, shown as the one she will win first. The rest are empty spaces.
  if (name === 'stickers' && album) {
    const page = album.pages[0];
    const slots = page.stickers.slice(0, 3).map((st, j) =>
      j === 0 ? h('span', { class: 'slot got r0 story-first' }, stickerCard({ ...st, earned: true })) : h('span', { class: 'slot' }, emptyCard(st))
    );
    return h(
      'div',
      { class: 'story-pic story-panel story-book' },
      h(
        'article',
        { class: 'paper' },
        h('div', { class: 'paper-band', style: { background: page.colour } }, h('span', { class: 'paper-title' }, page.title), h('span', { class: 'paper-page' }, 'page 1')),
        h('div', { class: 'paper-grid' }, slots)
      )
    );
  }
  // 'ready': the whole team with her in the middle, Coach and a ball.
  const me = profile ? figure(profile, { size: 62, idSuffix: 'story-me' }, 'is-you') : empty(false);
  const ball = h('span', { class: 'story-ball' }, ballIcon(true));
  return h('div', { class: 'story-pic story-panel' }, grass(coachFig(), mates[0], mates[1], me, ball, mates[2], mates[3]));
}

// ---------- Player setup ----------
// who: 'you' for her own player, 'friend' for a team-mate. The same screen
// does both, with its own spoken lines for a friend.
const SETUP_LINES = {
  you: { hello: 'setup.hello', name: 'setup.name', skin: 'setup.skin', hairColour: 'setup.hairColour', hair: 'setup.hair', done: 'setup.done' },
  friend: { hello: 'setup.friendHello', name: 'setup.friendName', skin: 'setup.skin', hairColour: 'setup.hairColour', hair: 'setup.hair', done: 'setup.friendDone' },
};
export function setupScreen({ profile, onDone, onBack, who = 'you', kit = 'us' }) {
  const STEP_LINES = SETUP_LINES[who];
  // A new player starts with nothing chosen. Done only works once the name,
  // skin colour, hair colour and hair style are all chosen (Rich's choice
  // after the first test, 26th November 2026).
  const state = { name: profile?.name || '', skin: profile?.skin || null, hair: profile?.hair || null, hairColour: profile?.hairColour || null };
  const shown = () => ({ name: state.name, skin: state.skin || looks.default.skin, hair: state.hair || looks.default.hair, hairColour: state.hairColour || looks.default.hairColour });
  const preview = h('div', { class: 'setup-preview' });
  const drawPreview = () => {
    preview.replaceChildren(avatarSvg(shown(), { size: 84, idSuffix: 'preview', kit }));
    doneBtn.classList.toggle('is-waiting', !!missingStep(state));
  };

  const nameInput = h('input', {
    type: 'text',
    id: 'player-name',
    maxlength: NAME_MAX,
    autocomplete: 'off',
    autocapitalize: 'words',
    spellcheck: 'false',
    value: state.name,
  });
  nameInput.addEventListener('input', () => {
    state.name = cleanName(nameInput.value);
    drawPreview();
  });

  const nameBox = h(
    'div',
    { class: 'name-box grown-up-box' },
    h('label', { for: 'player-name' }, who === 'you' ? 'Type your name (a grown-up can help)' : 'Type this player’s name (a grown-up can help)'),
    nameInput
  );
  // When the name is done (Return, or tapping away), move on to skin colour.
  let namePrompted = false;
  const nameDone = () => {
    if (namePrompted || !cleanName(nameInput.value)) return;
    namePrompted = true;
    const step = missingStep(state);
    const line = STEP_LINES[step || 'done'];
    lastPrompt = line;
    narrator.say([line]);
    glow(line);
  };
  nameInput.addEventListener('change', nameDone);
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') nameInput.blur();
  });

  let lastPrompt = STEP_LINES.name;
  const row = (key, items, render) =>
    h(
      'div',
      { class: `choice-row row-${key}`, role: 'radiogroup' },
      items.map((item) => {
        const b = h('button', { class: 'choice', type: 'button', role: 'radio', 'aria-checked': String(state[key] === item.id), 'aria-label': item.label || item.id }, render(item));
        b.addEventListener('click', () => {
          state[key] = item.id;
          b.parentElement.querySelectorAll('.choice').forEach((c) => c.setAttribute('aria-checked', String(c === b)));
          drawPreview();
          // Move on to the next thing still to choose.
          const step = missingStep(state);
          const line = STEP_LINES[step || 'done'];
          if (line !== lastPrompt) {
            lastPrompt = line;
            narrator.say([line]);
          }
          glow(line);
        });
        return b;
      })
    );

  // Order: name, skin colour, hair colour, hair style (Rich's choice).
  const skinRow = row('skin', looks.skin, (it) => h('span', { class: 'swatch', style: { background: it.colour } }));
  const colourRow = row('hairColour', looks.hairColour, (it) => h('span', { class: 'swatch', style: { background: it.colour } }));
  const hairRow = row('hair', looks.hair, (it) => avatarHead({ ...shown(), hair: it.id }));
  const doneBtn = h('button', { class: 'ready-btn', type: 'button', 'aria-label': 'Done' }, tickIcon());
  drawPreview();

  function glow(lineId) {
    [nameBox, skinRow, hairRow, colourRow, doneBtn].forEach((r) => r.classList.remove('is-glow'));
    const step = Object.keys(STEP_LINES).find((k) => k !== 'hello' && STEP_LINES[k] === lineId);
    ({ name: nameBox, skin: skinRow, hair: hairRow, hairColour: colourRow, done: doneBtn })[step]?.classList.add('is-glow');
    // The first time everything is chosen, point at the tick.
    if (step === 'done') pointOnce(doneBtn, 'setup-done');
  }
  // Redraw hair buttons with the chosen skin so they match.
  skinRow.addEventListener('click', () => hairRow.querySelectorAll('.choice').forEach((b, i) => b.replaceChildren(avatarHead({ ...shown(), hair: looks.hair[i].id }))));
  colourRow.addEventListener('click', () => hairRow.querySelectorAll('.choice').forEach((b, i) => b.replaceChildren(avatarHead({ ...shown(), hair: looks.hair[i].id }))));

  doneBtn.addEventListener('click', () => {
    state.name = cleanName(nameInput.value);
    // Something still to choose: say what, and make it glow.
    const step = missingStep(state);
    if (step) {
      const line = STEP_LINES[step];
      lastPrompt = line;
      narrator.say([line]);
      glow(line);
      if (step === 'name') nameInput.focus();
      return;
    }
    onDone({ ...state });
  });

  const el = h(
    'section',
    { class: 'screen setup' },
    h('div', { class: 'setup-top' }, onBack ? h('button', { class: 'icon-btn back-btn', type: 'button', 'aria-label': 'Back', onclick: onBack }, backIcon()) : null, preview, againButton()),
    nameBox,
    skinRow,
    colourRow,
    hairRow,
    h('div', { class: 'setup-bottom' }, doneBtn)
  );
  el.begin = () => {
    // A team-mate already has a look, so only the name is asked for.
    narrator.say([STEP_LINES.hello, STEP_LINES.name]);
    glow(STEP_LINES.name);
  };
  return el;
}

function avatarHead(look, size = 56, id = `h-${look.hair}`, kit = 'us') {
  const svg = avatarSvg(look, { size, idSuffix: id, kit });
  svg.setAttribute('viewBox', '18 2 64 64');
  svg.setAttribute('height', size);
  return svg;
}

// ---------- My team ----------
// Every player can be changed, both teams can be named and both kits can be
// chosen: shirt style, colours, shorts and socks (Rich's choices, 26th and
// 27th November 2026). The two teams can't wear the same shirt colour.
// mode: 'both' from the menu. 'us' or 'them' when a new player sets up her
// team before the first game, with a tick to go on. Every mode has a back
// button.
const TEAM_LINES = { both: 'team.hello', us: 'team.meet', them: 'team.them' };
const PATTERN_WORDS = { stripes: 'Stripes', hoops: 'Hoops', halves: 'Halves', sash: 'Sash', plain: 'Trim' };
export function teamScreen({ team, kits, mode = 'both', onBack, onNext, onPlayer, onTeamName, onTheirName, onOurKit, onTheirKit }) {
  const nameField = (id, label, value, placeholder, onChange) => {
    const input = h('input', { type: 'text', id, maxlength: TEAM_NAME_MAX, autocomplete: 'off', autocapitalize: 'words', spellcheck: 'false', value, placeholder, 'aria-label': label });
    input.addEventListener('input', () => {
      const cleaned = cleanTeamName(input.value);
      if (cleaned !== input.value) input.value = cleaned;
      onChange(cleaned);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') input.blur();
    });
    return input;
  };
  const card = (p, i) =>
    h(
      'button',
      { class: `team-player${p.you ? ' is-you' : ''}`, type: 'button', 'aria-label': `Change ${p.name || 'my player'}`, onclick: () => onPlayer(i) },
      avatarSvg(p, { size: 50, idSuffix: `team${i}`, kit: p.keeper ? 'keeper' : 'us' }),
      p.keeper ? h('span', { class: 'gk-badge' }, 'GK') : null,
      h('span', { class: 'team-player-name' }, p.name || ' ')
    );
  const players = h('div', { class: 'team-players' });
  const drawPlayers = () => players.replaceChildren(...team.squad.map(card));

  // Both kits, as colour ids. Each tap saves and redraws both teams, so a
  // colour taken by one team shows as taken on the other.
  const ourKit = { ...team.ourKit };
  const theirKit = { ...team.theirKit };
  const colourOf = (id) => kits.colours.find((c) => c.id === id)?.colour || '#fff';
  // A pattern needs a second colour that shows up on the shirt.
  const contrast = (shirt) => (shirt === 'white' ? 'black' : 'white');
  const swatch = (it) => h('span', { class: 'swatch', style: { background: it.colour } });
  const rowLabel = (icon, word) => h('span', { class: 'kit-label' }, icon, h('span', { class: 'kit-word' }, word));

  function kitBuilder(kit, other, save, preview) {
    const rows = h('div', { class: 'kit-rows' });
    const choose = (key, value) => {
      kit[key] = value;
      if (kit.pattern !== 'plain' && kit.stripe === kit.shirt) kit.stripe = contrast(kit.shirt);
      save({ ...kit });
      redraw();
    };
    const choiceRow = (key, items, label, render) =>
      h(
        'div',
        { class: `kit-row kit-row-${key}` },
        h('span', { class: 'kit-row-label' }, label),
        h(
          'div',
          { class: 'choice-row', role: 'radiogroup', 'aria-label': label.textContent || key },
          items.map((it) => {
            // The other team's shirt colour can't be our shirt colour too.
            const taken = key === 'shirt' && it.id === other.shirt;
            return h(
              'button',
              { class: `choice${taken ? ' is-taken' : ''}`, type: 'button', role: 'radio', disabled: taken || null, 'aria-checked': String(kit[key] === it.id), 'aria-label': taken ? `${it.label}, the other team has this` : it.label, onclick: () => choose(key, it.id) },
              render(it)
            );
          })
        )
      );
    const draw = () => {
      preview?.();
      const sh = colourOf(kit.shirt);
      const st = colourOf(kit.stripe === kit.shirt ? contrast(kit.shirt) : kit.stripe);
      rows.replaceChildren(
        ...[
          choiceRow('pattern', kits.patterns, rowLabel(shirtIcon(kit.pattern, sh, st), 'Style'), (it) => shirtIcon(it.id, sh, st)),
          choiceRow('shirt', kits.colours, rowLabel(shirtIcon('plain', sh, sh), 'Shirt'), swatch),
          kit.pattern === 'plain' ? null : choiceRow('stripe', kits.colours, rowLabel(shirtIcon(kit.pattern, '#fff', st), PATTERN_WORDS[kit.pattern]), swatch),
          choiceRow('shorts', kits.colours, rowLabel(shortsIcon(colourOf(kit.shorts)), 'Shorts'), swatch),
          choiceRow('socks', kits.colours, rowLabel(sockIcon(colourOf(kit.socks)), 'Socks'), swatch),
        ].filter(Boolean)
      );
    };
    return { rows, draw };
  }

  const themPreview = h('div', { class: 'them-preview' });
  const ourBuilder = kitBuilder(ourKit, theirKit, (k) => onOurKit?.(k), drawPlayers);
  const theirBuilder = kitBuilder(theirKit, ourKit, (k) => onTheirKit(k), () =>
    themPreview.replaceChildren(avatarSvg({ skin: 's5', hair: 'short', hairColour: 'h1' }, { size: 64, idSuffix: 'them', kit: 'them' }))
  );
  function redraw() {
    ourBuilder.draw();
    theirBuilder.draw();
  }
  redraw();

  const ours = h(
    'div',
    { class: 'team-card' },
    nameField('team-name', 'Our team’s name', team.name, 'Our team', onTeamName),
    players,
    h('p', { class: 'kit-title' }, 'Our kit'),
    ourBuilder.rows
  );
  const theirs = h(
    'div',
    { class: 'team-card them' },
    h('div', { class: 'them-top' }, themPreview, nameField('their-name', 'The other team’s name', team.theirName, 'The other team', onTheirName)),
    theirBuilder.rows
  );

  const backBtn = h('button', { class: 'icon-btn back-btn', type: 'button', 'aria-label': 'Back', onclick: onBack }, backIcon());
  const top =
    mode === 'both'
      ? h('header', { class: 'menu-top' }, backBtn, againButton())
      : h('header', { class: 'menu-top team-step-top' }, backBtn, h('h1', { class: 'team-step-title' }, mode === 'us' ? 'Your team' : 'The other team'), againButton());
  const nextBtn = mode === 'both' ? null : h('button', { class: 'ready-btn is-glow', type: 'button', 'aria-label': 'Next', onclick: onNext }, tickIcon());
  if (nextBtn) pointOnce(nextBtn, `team-${mode}`);
  const el = h(
    'section',
    { class: `screen team team-${mode}` },
    top,
    mode !== 'them' ? ours : null,
    mode === 'both' ? h('div', { class: 'team-vs' }, 'v') : null,
    mode !== 'us' ? theirs : null,
    nextBtn ? h('div', { class: 'setup-bottom' }, nextBtn) : null
  );
  el.begin = () => narrator.say([TEAM_LINES[mode]]);
  return el;
}

// ---------- Menu: the cup path ----------
// One winding trail up the screen through the whole cup (Rich's choice,
// 27th November 2026): Round 1's moments, the semi-final's, the final's,
// and the cup at the top. A flag starts each round. Finished moments are
// green, the one to play next is yellow and glows, the rest are white and
// locked. Her player stands beside the moment to play next, and hops on
// when she passes one. The trail scrolls under the top buttons.
// clock: from buildClock(), for the round being played. round: that round.
// cup: the rounds from ladder(). opponent: who we are playing, if a round
// has started. nextButton: { kind: 'round' | 'cup', onTap } between rounds.
export function menuScreen({ profile, team, album, updateReady, clock, round, cup, cupsWon = 0, opponent = null, movedFrom = null, nextButton = null, onChapter, onGrownUps, onUpdate, onTeam, onAlbum }) {
  const path = buildCupPath(cup, clock, cupsWon);

  const trail = s(
    'svg',
    { viewBox: `0 0 ${path.width} ${path.height}`, width: path.width, height: path.height, class: 'path-trail', 'aria-hidden': 'true' },
    s('path', { d: path.trail, class: 'trail-lip' }),
    s('path', { d: path.trail, class: 'trail' }),
    path.doneTrail ? s('path', { d: path.doneTrail, class: 'trail-done' }) : null,
    s('path', { d: path.trail, class: 'trail-dots' })
  );
  const place = (x, y) => ({ left: `${x}px`, top: `${y}px` });
  const nodeBtn = (n) => {
    if (n.kind === 'cup') {
      return h('div', { class: `path-cup${n.state === 'won' ? ' is-won' : ''}`, style: place(n.x - 44, n.y - 44), 'aria-label': 'The cup' }, trophyIcon(n.state === 'won'));
    }
    const locked = n.state === 'locked';
    const label = `${cup[n.round].label}, moment ${n.number}${n.state === 'done' ? ', done' : locked ? ', locked' : ''}`;
    const b = h(
      'button',
      { class: `path-node is-${n.state}`, type: 'button', 'aria-label': label, style: place(n.x - 38, n.y - 38) },
      String(n.number),
      n.bonus ? h('span', { class: 'node-bonus' }, bonusStickerSvg(n.level, true)) : null
    );
    // The very first time on the path, point at the first moment.
    if (n.state === 'now' && n.number === 1 && n.round === 0) pointOnce(b, 'path', { above: true });
    b.addEventListener('click', () => {
      // Moments in rounds already won, or still to come, are not played
      // from here: only the round she is in.
      if (!n.playable) {
        if (locked) {
          shake(b);
          onChapter(n.level, true);
        } else hop(b);
        return;
      }
      if (locked) shake(b);
      onChapter(n.level, locked);
    });
    return b;
  };
  // A flag sits above the first moment of each round, on the far side.
  const flag = (n) => h('div', { class: `path-flag${n.state === 'locked' ? ' is-soon' : ''}`, style: { top: `${n.y - 18}px`, [n.x > path.width / 2 ? 'left' : 'right']: '6px' } }, n.flag);

  // Her player stands beside the moment she is on.
  const beside = (n) => ({ x: n.x > path.width / 2 ? n.x - 108 : n.x + 48, y: n.y - 70 });
  const here = path.nodes[path.at];
  const spot = beside(here);
  const you = h('div', { class: 'path-you', style: place(spot.x, spot.y) }, h('span', { class: 'path-you-shadow' }), avatarSvg(profile, { size: 60, idSuffix: 'menu' }));
  const fromNode = movedFrom == null ? null : path.nodes.find((n) => n.playable && n.level === movedFrom);
  if (fromNode && fromNode !== here) {
    const was = beside(fromNode);
    const dx = was.x - spot.x;
    const dy = was.y - spot.y;
    you.animate(
      [
        { transform: `translate(${dx}px, ${dy}px)`, offset: 0 },
        { transform: `translate(${dx}px, ${dy}px)`, offset: 0.3 },
        { transform: `translate(${dx / 2}px, ${dy / 2 - 34}px)`, offset: 0.65 },
        { transform: 'translate(0, 0)', offset: 1 },
      ],
      { duration: motion(1500), easing: 'ease-in-out', fill: 'backwards' }
    );
  }

  const map = h(
    'div',
    { class: 'path-map', style: { width: `${path.width}px`, height: `${path.height}px` } },
    trail,
    path.nodes.filter((n) => n.flag).map(flag),
    [...path.nodes].reverse().map(nodeBtn),
    you
  );
  const scroller = h('div', { class: 'path-scroll' }, map);
  // Open with her own moment in view, a little below the middle.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      scroller.scrollTop = Math.max(0, here.y - scroller.clientHeight * 0.6);
    })
  );

  // Once she has a sticker, point at her sticker book the first time
  // (Rich asked for a bigger deal to be made of it, 27th November 2026).
  const bookBtn = h('button', { class: 'icon-btn album-btn', type: 'button', 'aria-label': 'Sticker album', onclick: onAlbum }, bookIcon());
  if (album.count > 0) pointOnce(bookBtn, 'album', { above: true });

  const top = h(
    'header',
    { class: 'path-top' },
    h(
      'button',
      { class: 'chip team-btn', type: 'button', 'aria-label': `My team: ${team.name}`, onclick: onTeam },
      h('span', { class: 'chip-face' }, avatarHead(profile, 44, 'chip')),
      h('span', { class: 'chip-name' }, profile.name)
    ),
    h('button', { class: 'chip chip-count', type: 'button', 'aria-label': `Sticker album: ${album.count} stickers`, onclick: onAlbum }, h('span', { class: 'chip-stk' }, album.pages[0].stickers[0].earned ? stickerCard(album.pages[0].stickers[0]) : emptyCard(album.pages[0].stickers[0])), String(album.count)),
    againButton()
  );

  // Who we are playing, and how hard (one to three balls).
  const versus = opponent
    ? h(
        'div',
        { class: 'match-chip', 'aria-label': `Playing ${opponent.name}, ${opponent.label}` },
        shirtIcon(opponent.kit.pattern, opponent.kit.shirt, opponent.kit.stripe),
        h('span', { class: 'match-chip-name' }, `v ${opponent.name}`),
        h('span', { class: 'match-chip-balls' }, ballRow(opponent.balls, 3))
      )
    : null;

  return h(
    'section',
    { class: 'screen menu cup-menu' },
    top,
    versus ? h('div', { class: 'menu-side' }, versus) : null,
    h('div', { class: 'menu-stage' }, scroller),
    h(
      'footer',
      { class: 'menu-bottom' },
      h('button', { class: 'text-btn grown-ups-btn', type: 'button', onclick: onGrownUps }, 'Grown-ups'),
      // Between rounds: on to the next round, or a new cup. Yellow,
      // because it is the thing to tap next.
      nextButton ? h('div', { class: 'menu-next' }, newMatchButton(nextButton)) : null,
      bookBtn
    ),
    updateReady ? h('button', { class: 'update-btn', type: 'button', onclick: onUpdate }, 'Grown-ups: a new version is ready. Tap to update.') : null
  );
}

// A happy little hop, for a moment already won.
function hop(el) {
  el.animate([{ translate: '0 0' }, { translate: '0 -14px' }, { translate: '0 0' }], { duration: motion(380), easing: 'ease-out' });
}

// The cup run: Round 1, then the semi-final, then the final, then the cup.
// Won rounds are green with a tick, the round she is in is blue, and the
// rounds to come are white. The cup is gold once won.
function cupLadder(rounds, cupsWon = 0, current = null, big = false) {
  const steps = rounds.map((r) =>
    h(
      'li',
      { class: `cup-step is-${r.state}${current && r.id === current.id ? ' is-current' : ''}` },
      h('span', { class: 'cup-step-dot' }, r.state === 'won' ? tickIcon() : h('span', { class: 'cup-step-balls' }, ballRow(levelBalls(r), 3))),
      h('span', { class: 'cup-step-label' }, r.label)
    )
  );
  const cup = h('li', { class: `cup-step cup-step-trophy${cupsWon ? ' is-won' : ''}` }, h('span', { class: 'cup-step-dot' }, trophyIcon(cupsWon > 0)), cupsWon > 1 ? h('span', { class: 'cup-count' }, `×${cupsWon}`) : null);
  return h('ol', { class: `cup-ladder${big ? ' is-big' : ''}`, 'aria-label': `The cup: ${rounds.map((r) => `${r.label} ${r.state === 'won' ? 'won' : r.state === 'now' ? 'now' : 'to come'}`).join(', ')}` }, steps, cup);
}
const levelBalls = (r) => ({ easy: 1, medium: 2, difficult: 3 })[r.difficulty] || 1;

// A row of little footballs: how hard a match is. Empty ones are faded.
function ballRow(n, of) {
  return Array.from({ length: of }, (_, i) => h('span', { class: `mini-ball${i < n ? '' : ' is-off'}` }, footballIcon(14)));
}
function footballIcon(size = 30) {
  return s('svg', { viewBox: `${-size / 2 - 1} ${-size / 2 - 1} ${size + 2} ${size + 2}`, class: 'ball-pic', 'aria-hidden': 'true' }, footballSvg(size / 2));
}
function newMatchButton({ kind, onTap }) {
  const label = kind === 'cup' ? 'New cup' : 'Next round';
  const b = h('button', { class: 'new-match-btn is-glow', type: 'button', 'aria-label': label, onclick: onTap }, kind === 'cup' ? trophyIcon(true) : footballIcon(34), h('span', {}, label));
  pointOnce(b, 'newMatch', { above: true });
  return b;
}

// ---------- The cup: the next round ----------
// Between matches she sees the cup run: the rounds she has won, the round
// that is next, and the team she will play. Each round is a bit harder
// (one, two or three balls), and the voice says so (Rich asked, 27th
// November 2026). One yellow tick starts the round.
// lines: what the voice says, chosen in main.js.
export function cupScreen({ cup, cupsWon, round, opponent, kit, lines, onPlay, onBack }) {
  const playBtn = h('button', { class: 'ready-btn is-glow', type: 'button', 'aria-label': `Play the ${round.label}`, onclick: onPlay }, tickIcon());
  pointOnce(playBtn, 'cup-play');
  const el = h(
    'section',
    { class: 'screen cup-screen' },
    h('header', { class: 'setup-top' }, h('button', { class: 'icon-btn back-btn', type: 'button', 'aria-label': 'Back', onclick: onBack }, backIcon()), h('h1', { class: 'cup-title' }, 'The Cup'), againButton()),
    cupLadder(cup, cupsWon, round, true),
    h(
      'div',
      { class: 'cup-next' },
      h('p', { class: 'cup-round' }, round.label),
      h('div', { class: 'versus' }, h('span', { class: 'versus-v' }, 'v'), h('div', { class: 'versus-shirt' }, shirtIcon(kit.pattern, kit.shirt, kit.stripe)), h('h2', { class: 'versus-name' }, opponent.name)),
      h('div', { class: 'cup-balls', 'aria-label': `${levelBalls(round)} of 3 balls: how hard` }, Array.from({ length: 3 }, (_, i) => h('span', { class: `mini-ball${i < levelBalls(round) ? '' : ' is-off'}` }, footballIcon(40))))
    ),
    h('div', { class: 'setup-bottom' }, playBtn)
  );
  el.begin = () => narrator.say(lines);
  return el;
}

// ---------- Cup winners! ----------
// Winning the final wins the cup: the biggest moment in the game (Rich,
// 27th November 2026). Her whole team stands round the trophy, with
// confetti, a fanfare and Coach's words. Only pictures and a tick: touch
// works as normal.
export function cupWinScreen({ team, profile, lines, onDone, celebrate }) {
  const mates = team.squad.map((p, i) => h('span', { class: `cup-win-player${p.you ? ' is-you' : ''}` }, avatarSvg(p, { size: p.you ? 74 : 58, kit: p.keeper ? 'keeper' : 'us', idSuffix: `cupwin${i}` })));
  // Her player stands in the middle, holding up the cup.
  const you = mates.findIndex((m) => m.classList.contains('is-you'));
  const row = [...mates];
  if (you >= 0) {
    const [me] = row.splice(you, 1);
    row.splice(Math.floor(row.length / 2), 0, me);
  }
  const trophy = h('div', { class: 'cup-win-trophy' }, h('div', { class: 'end-rays' }), trophyIcon(true));
  const doneBtn = h('button', { class: 'ready-btn is-glow', type: 'button', 'aria-label': 'Done', onclick: onDone }, tickIcon());
  const el = h(
    'section',
    { class: 'screen cup-win' },
    h('header', { class: 'setup-top' }, h('span'), againButton()),
    h('div', { class: 'cup-win-title', 'aria-label': 'Cup winners!' }, h('span', { class: 'cup-win-top' }, team.name), h('span', { class: 'cup-win-big' }, 'CUP WINNERS!')),
    trophy,
    h('div', { class: 'cup-win-team' }, row),
    h('div', { class: 'setup-bottom' }, doneBtn)
  );
  el.begin = () => {
    narrator.say(lines);
    celebrate?.(trophy);
  };
  return el;
}

// ---------- Sticker album ----------
// Pages of numbered spaces, like the football sticker books parents
// remember. Swipe sideways or tap the arrows to turn the page.
export function albumScreen({ album, onBack }) {
  const pages = album.pages.map((pg, i) =>
    h(
      'article',
      { class: 'paper', 'aria-label': `${pg.title}, page ${i + 1}` },
      h('div', { class: 'paper-band', style: { background: pg.colour } }, h('span', { class: 'paper-title' }, pg.title), h('span', { class: 'paper-page' }, `page ${i + 1}`)),
      h('div', { class: 'paper-grid' }, pg.stickers.map((st, j) => h('span', { class: st.earned ? `slot got r${j % 3}` : 'slot' }, st.earned ? stickerCard(st) : emptyCard(st)))),
      h('div', { class: 'paper-bar' }, h('div', { class: 'bar' }, h('i', { style: { width: `${(100 * pg.got) / pg.stickers.length}%` } })), h('b', {}, `${pg.got} / ${pg.stickers.length}`))
    )
  );
  const scroller = h('div', { class: 'album-pages' }, pages.map((p) => h('div', { class: 'album-page' }, p)));
  const dots = h('div', { class: 'dots', 'aria-hidden': 'true' }, pages.map(() => h('i', {})));
  const prev = h('button', { class: 'icon-btn flip', type: 'button', 'aria-label': 'Page before', onclick: () => go(at - 1) }, nextIcon());
  const next = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Next page', onclick: () => go(at + 1) }, nextIcon());
  let at = 0;
  const update = () => {
    [...dots.children].forEach((d, i) => d.classList.toggle('on', i === at));
    prev.classList.toggle('is-faded', at === 0);
    next.classList.toggle('is-faded', at === pages.length - 1);
  };
  function go(i) {
    at = Math.max(0, Math.min(pages.length - 1, i));
    scroller.scrollTo({ left: at * scroller.clientWidth, behavior: motion(300) > 1 ? 'smooth' : 'auto' });
    update();
  }
  scroller.addEventListener('scroll', () => {
    const now = Math.round(scroller.scrollLeft / Math.max(1, scroller.clientWidth));
    if (now !== at) {
      at = Math.max(0, Math.min(pages.length - 1, now));
      update();
    }
  });
  update();
  const el = h(
    'section',
    { class: 'screen album' },
    h('header', { class: 'album-top' }, h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Home', onclick: onBack }, homeIcon()), h('h1', { class: 'album-tag' }, 'Sticker album'), againButton()),
    scroller,
    h('footer', { class: 'album-nav' }, prev, dots, next)
  );
  el.begin = () => narrator.say(['album.hello']);
  return el;
}

// ---------- Grown-ups gate ----------
export function gateScreen({ onPass, onBack }) {
  const a = 3 + Math.floor(Math.random() * 7);
  const b = 3 + Math.floor(Math.random() * 7);
  let entry = '';
  const shown = h('output', { class: 'gate-entry', 'aria-live': 'polite' }, ' ');
  const keys = h(
    'div',
    { class: 'keypad' },
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'OK'].map((k) =>
      h(
        'button',
        {
          type: 'button',
          class: 'key',
          onclick: () => {
            if (k === 'C') entry = '';
            else if (k === 'OK') {
              if (Number(entry) === a * b) return onPass();
              entry = '';
              shown.classList.add('is-wrong');
              setTimeout(() => shown.classList.remove('is-wrong'), 600);
            } else if (entry.length < 3) entry += k;
            shown.textContent = entry || ' ';
          },
        },
        String(k)
      )
    )
  );
  return h(
    'section',
    { class: 'screen grown-up gate' },
    h('button', { class: 'icon-btn back-btn', type: 'button', 'aria-label': 'Back', onclick: onBack }, backIcon()),
    h('h1', {}, 'Grown-ups only'),
    h('p', { class: 'lead' }, `What is ${a} × ${b}?`),
    shown,
    keys
  );
}

// ---------- Grown-ups area ----------
export function grownUpsScreen({ version, onBack, onDelete, onEditPlayer, showWords, onToggleWords, sounds = true, onToggleSounds, consequences = true, onToggleConsequences, replay = null, onStopReplay }) {
  const confirmBox = h(
    'div',
    { class: 'confirm is-hidden' },
    h('p', {}, 'This deletes the player and all progress on this device. It cannot be undone.'),
    h('button', { class: 'danger-btn', type: 'button', onclick: onDelete }, 'Yes, delete everything'),
    h('button', { class: 'text-btn', type: 'button', onclick: () => confirmBox.classList.add('is-hidden') }, 'Cancel')
  );
  return h(
    'section',
    { class: 'screen grown-up grown-ups' },
    h('button', { class: 'icon-btn back-btn', type: 'button', 'aria-label': 'Back', onclick: onBack }, backIcon()),
    h('h1', {}, 'Grown-ups'),
    h('h2', {}, 'Privacy'),
    h(
      'ul',
      { class: 'plain-list' },
      h('li', {}, 'The game keeps a first name or nickname and a look for each player, the two team names, the other team’s kit, which levels are finished, how far she is in the cup and the settings below. That is all.'),
      h('li', {}, 'It is stored on this device only. Nothing is sent anywhere. There are no accounts, adverts or tracking.'),
      h('li', {}, 'The game does not use the camera, microphone, location or notifications.'),
      h('li', {}, 'Spoken lines use the phone’s own voice, which runs on the device.')
    ),
    h('h2', {}, 'Words on screen'),
    h(
      'label',
      { class: 'toggle' },
      h('input', { type: 'checkbox', checked: showWords, onchange: (e) => onToggleWords(e.target.checked) }),
      h('span', {}, 'Show the spoken words during levels. They come on by themselves if the phone has no voice.')
    ),
    h('h2', {}, 'Game sounds'),
    h(
      'label',
      { class: 'toggle' },
      h('input', { type: 'checkbox', checked: sounds, onchange: (e) => onToggleSounds?.(e.target.checked) }),
      h('span', {}, 'Little sounds for taps, cheers and stickers, and a tiny buzz on Android phones. The referee’s whistle and the voice always stay on.')
    ),
    h('h2', {}, 'Difficult matches'),
    h(
      'label',
      { class: 'toggle' },
      h('input', { type: 'checkbox', checked: consequences, onchange: (e) => onToggleConsequences?.(e.target.checked) }),
      h('span', {}, 'On Difficult only (the final), a first mistake at a line-up can let the other team win the ball or have a shot. It is told kindly, and she can still win. Switch off to keep Difficult without it. Easy and Medium never do this.')
    ),
    replay
      ? h(
          'div',
          { class: 'replay-box' },
          h('p', {}, `In the cup: ${replay.round} against ${replay.name}, on ${replay.label}, ${replay.done} of ${replay.total} levels done.`),
          h('button', { class: 'big-btn secondary', type: 'button', onclick: onStopReplay }, 'Stop this match'),
          h('p', { class: 'small' }, 'Her stickers and finished levels stay. She can start this round again from the path.')
        )
      : null,
    h('h2', {}, 'Player'),
    h('button', { class: 'big-btn secondary', type: 'button', onclick: onEditPlayer }, 'Change name or look'),
    h('h2', {}, 'Delete'),
    h('button', { class: 'danger-btn', type: 'button', onclick: () => confirmBox.classList.remove('is-hidden') }, 'Delete everything'),
    confirmBox,
    h('p', { class: 'small version' }, `Version ${version}. Rules: FA 5v5 for under-8 and under-9, season 2026/27.`)
  );
}
