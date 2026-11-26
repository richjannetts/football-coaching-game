// The screens outside the chapters: install, first-run note, start,
// player setup, menu, grown-ups gate and grown-ups area.

import { h, s, motion } from './lib/svg.js';
import { buildPath } from './lib/path.js';
import { avatarSvg } from './lib/avatar.js';
import { missingStep } from './lib/profile.js';
import { menuDotsIcon, installIcon } from './lib/icons.js';
import { ballIcon, bonusStickerSvg, titleLogo, titleScene, lockIcon, shareIcon, plusSquareIcon, tickIcon, backIcon, speakerIcon } from './lib/icons.js';
import * as narrator from './lib/narrator.js';
import looks from './data/looks.json';

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
  return h(
    'section',
    { class: 'screen start' },
    h('div', { class: 'title-block' }, titleLogo(), h('p', { class: 'title-sub' }, 'Football puzzles')),
    scene,
    h('button', { class: 'play-btn', type: 'button', 'aria-label': 'Play', onclick: onStart }, ballIcon(true), h('span', { class: 'play-label' }, 'PLAY')),
    h('p', { class: 'small start-note' }, 'Turn the sound up.')
  );
}

// ---------- Player setup ----------
// who: 'you' for her own player, 'friend' for a team-mate. The same screen
// does both, with its own spoken lines for a friend.
const SETUP_LINES = {
  you: { hello: 'setup.hello', name: 'setup.name', skin: 'setup.skin', hairColour: 'setup.hairColour', hair: 'setup.hair', done: 'setup.done' },
  friend: { hello: 'setup.friendHello', name: 'setup.friendName', skin: 'setup.skin', hairColour: 'setup.hairColour', hair: 'setup.hair', done: 'setup.friendDone' },
};
export function setupScreen({ profile, onDone, who = 'you', kit = 'us' }) {
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

  const nameNote = h('p', { class: 'small name-note' }, 'First name or nickname only, please. Not a full name.');
  const nameInput = h('input', {
    type: 'text',
    id: 'player-name',
    maxlength: NAME_MAX,
    autocomplete: 'off',
    autocapitalize: 'words',
    spellcheck: 'false',
    value: state.name,
    'aria-describedby': 'name-help',
  });
  nameInput.addEventListener('input', () => {
    const cleaned = cleanName(nameInput.value);
    nameNote.classList.toggle('is-warning', /\s/.test(nameInput.value.trim()) || nameInput.value.length > NAME_MAX);
    state.name = cleaned;
    drawPreview();
  });

  const nameBox = h(
    'div',
    { class: 'name-box grown-up-box' },
    h('label', { for: 'player-name' }, who === 'you' ? 'Type your name (a grown-up can help)' : 'Type this player’s name (a grown-up can help)'),
    nameInput,
    h('span', { id: 'name-help' }, nameNote)
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
    h('div', { class: 'setup-top' }, preview, againButton()),
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
// Every player can be changed, both teams can be named and the other team
// can be given a kit colour (Rich's choice, 26th November 2026).
export function teamScreen({ team, kits, onBack, onPlayer, onTeamName, onTheirName, onTheirKit }) {
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
  const themPreview = h('div', { class: 'them-preview' });
  const drawThem = () => themPreview.replaceChildren(avatarSvg({ skin: 's5', hair: 'short', hairColour: 'h1' }, { size: 50, idSuffix: 'them', kit: 'them' }));
  drawThem();
  const kitRow = h(
    'div',
    { class: 'choice-row row-kit', role: 'radiogroup', 'aria-label': 'The other team’s colour' },
    kits.map((k) => {
      const b = h('button', { class: 'choice', type: 'button', role: 'radio', 'aria-checked': String(team.theirKit === k.id), 'aria-label': k.label }, h('span', { class: 'swatch', style: { background: k.them.shirt } }));
      b.addEventListener('click', () => {
        kitRow.querySelectorAll('.choice').forEach((c) => c.setAttribute('aria-checked', String(c === b)));
        onTheirKit(k.id);
        drawThem();
      });
      return b;
    })
  );
  const el = h(
    'section',
    { class: 'screen team' },
    h('header', { class: 'menu-top' }, h('button', { class: 'icon-btn back-btn', type: 'button', 'aria-label': 'Back', onclick: onBack }, backIcon()), againButton()),
    h(
      'div',
      { class: 'team-card' },
      nameField('team-name', 'Our team’s name', team.name, 'Our team', onTeamName),
      h('div', { class: 'team-players' }, team.squad.map(card))
    ),
    h('div', { class: 'team-vs' }, 'v'),
    h(
      'div',
      { class: 'team-card them' },
      nameField('their-name', 'The other team’s name', team.theirName, 'The other team', onTheirName),
      h('div', { class: 'them-row' }, themPreview, kitRow)
    ),
    h('p', { class: 'small team-note' }, 'Grown-ups: first names or nicknames, and made-up team names, please. They stay on this phone.')
  );
  el.begin = () => narrator.say(['team.hello']);
  return el;
}

// ---------- Menu: the level path ----------
// A winding trail of levels that scrolls with her finger, so it can hold as
// many levels as we like. Passing a level moves her player one place up.
// Levels are grouped into matches, each starting with a flag (Rich's
// choice, 26th November 2026). movedFrom: the level she has just passed,
// so her player can be seen walking up from it.
export function menuScreen({ profile, progress, team, levels, updateReady, movedFrom = null, onChapter, onSoon, onGrownUps, onUpdate, onTeam }) {
  const path = buildPath(levels, progress);
  const real = path.nodes.filter((n) => n.kind === 'level');
  const count = real.filter((n) => n.state === 'done').length + real.filter((n) => n.bonus).length;

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
    const locked = n.state === 'locked' || n.state === 'soon';
    const label = n.kind === 'soon' ? 'More levels soon' : `Level ${n.level}${n.state === 'done' ? ', done' : locked ? ', locked' : ''}`;
    const b = h(
      'button',
      { class: `path-node is-${n.state}`, type: 'button', 'aria-label': label, style: place(n.x - 38, n.y - 38) },
      n.kind === 'soon' ? lockIcon() : String(n.level),
      n.bonus ? h('span', { class: 'node-bonus' }, bonusStickerSvg(n.level, true)) : null
    );
    b.addEventListener('click', () => {
      if (locked) shake(b);
      if (n.kind === 'soon') onSoon?.();
      else onChapter(n.level, locked);
    });
    return b;
  };
  // A flag sits above the first level of each match, on the far side.
  const flag = (n) => h('div', { class: `path-flag${n.kind === 'soon' ? ' is-soon' : ''}`, style: { top: `${n.y - 74}px`, [n.x > path.width / 2 ? 'left' : 'right']: '6px' } }, n.flag);

  // Her player stands beside the level she is on.
  const beside = (n) => ({ x: n.x > path.width / 2 ? n.x - 108 : n.x + 48, y: n.y - 70 });
  const here = path.nodes[path.at];
  const spot = beside(here);
  const you = h('div', { class: 'path-you', style: place(spot.x, spot.y) }, h('span', { class: 'path-you-shadow' }), avatarSvg(profile, { size: 60, idSuffix: 'menu' }));
  const fromNode = movedFrom == null ? null : path.nodes.find((n) => n.level === movedFrom);
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
  // Open with her own level in view, a little below the middle.
  const showHere = () => {
    scroller.scrollTop = Math.max(0, here.y - scroller.clientHeight * 0.6);
  };
  requestAnimationFrame(() => requestAnimationFrame(showHere));

  return h(
    'section',
    { class: 'screen menu' },
    scroller,
    h('div', { class: 'path-fade', 'aria-hidden': 'true' }),
    h(
      'header',
      { class: 'path-top' },
      h(
        'button',
        { class: 'chip team-btn', type: 'button', 'aria-label': `My team: ${team.name}`, onclick: onTeam },
        h('span', { class: 'chip-face' }, avatarHead(profile, 44, 'chip')),
        h('span', { class: 'chip-name' }, profile.name)
      ),
      h('div', { class: 'chip chip-count', 'aria-label': `${count} of ${real.length * 2} football stickers` }, ballIcon(true), `${count} / ${real.length * 2}`),
      againButton()
    ),
    updateReady ? h('button', { class: 'update-btn', type: 'button', onclick: onUpdate }, 'Grown-ups: a new version is ready. Tap to update.') : null,
    h('button', { class: 'text-btn grown-ups-btn', type: 'button', onclick: onGrownUps }, 'Grown-ups')
  );
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
export function grownUpsScreen({ version, onBack, onDelete, onEditPlayer, showWords, onToggleWords, sounds = true, onToggleSounds }) {
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
      h('li', {}, 'The game keeps a first name or nickname and a look for each player, the two team names, the other team’s colour, which levels are finished and the two settings below. That is all.'),
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
    h('h2', {}, 'Player'),
    h('button', { class: 'big-btn secondary', type: 'button', onclick: onEditPlayer }, 'Change name or look'),
    h('h2', {}, 'Delete'),
    h('button', { class: 'danger-btn', type: 'button', onclick: () => confirmBox.classList.remove('is-hidden') }, 'Delete everything'),
    confirmBox,
    h('p', { class: 'small version' }, `Version ${version}. Rules: FA 5v5 for under-8 and under-9, season 2026/27.`)
  );
}
