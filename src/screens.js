// The screens outside the chapters: install, first-run note, start,
// player setup, menu, grown-ups gate and grown-ups area.

import { h } from './lib/svg.js';
import { avatarSvg } from './lib/avatar.js';
import { ballIcon, stickerSvg, chapterPicture, lockIcon, shareIcon, plusSquareIcon, tickIcon, backIcon, speakerIcon } from './lib/icons.js';
import * as narrator from './lib/narrator.js';
import looks from './data/looks.json';

export const NAME_MAX = 12;

// Keep only a short first name or nickname: letters, apostrophes and
// hyphens, one word, no more than 12 characters.
export function cleanName(raw) {
  const first = String(raw || '').trim().split(/\s+/)[0] || '';
  return first.replace(/[^\p{L}'-]/gu, '').slice(0, NAME_MAX);
}

const againButton = () =>
  h('button', { class: 'icon-btn again', type: 'button', 'aria-label': 'Hear it again', onclick: () => narrator.replay() }, speakerIcon());

// ---------- Install (grown-up) ----------
export function installScreen({ onSkip }) {
  return h(
    'section',
    { class: 'screen grown-up install' },
    h('h1', {}, 'Spots!'),
    h('p', { class: 'lead' }, 'Grown-ups: please add this game to your Home Screen before playing.'),
    h(
      'ol',
      { class: 'install-steps' },
      h('li', {}, h('span', { class: 'step-icon' }, shareIcon()), h('span', {}, 'In Safari, tap the Share button.')),
      h('li', {}, h('span', { class: 'step-icon' }, plusSquareIcon()), h('span', {}, 'Scroll down and tap ', h('strong', {}, 'Add to Home Screen'), ', then ', h('strong', {}, 'Add'), '.')),
      h('li', {}, h('span', { class: 'step-icon icon-app' }, ballIcon(true)), h('span', {}, 'Close Safari and open ', h('strong', {}, 'Spots!'), ' from your Home Screen.'))
    ),
    h(
      'p',
      { class: 'small' },
      'Why: Safari clears saved games from websites after 7 days without use. Games on the Home Screen are kept. Progress made here in Safari will not carry over to the Home Screen game.'
    ),
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
  return h(
    'section',
    { class: 'screen start' },
    h('div', { class: 'start-avatar' }, avatarSvg(profile, { size: 120, idSuffix: 'start' })),
    h('button', { class: 'play-btn', type: 'button', 'aria-label': 'Play', onclick: onStart }, ballIcon(true)),
    h('p', { class: 'small' }, 'Tap the ball to start. Turn the sound up.')
  );
}

// ---------- Player setup ----------
export function setupScreen({ profile, onDone }) {
  const state = { name: profile?.name || '', skin: profile?.skin || looks.default.skin, hair: profile?.hair || looks.default.hair, hairColour: profile?.hairColour || looks.default.hairColour };
  const preview = h('div', { class: 'setup-preview' });
  const drawPreview = () => preview.replaceChildren(avatarSvg(state, { size: 84, idSuffix: 'preview' }));
  drawPreview();

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
  });

  const row = (key, items, render, next) =>
    h(
      'div',
      { class: `choice-row row-${key}`, role: 'radiogroup' },
      items.map((item) => {
        const b = h('button', { class: 'choice', type: 'button', role: 'radio', 'aria-checked': String(state[key] === item.id), 'aria-label': item.label || item.id }, render(item));
        b.addEventListener('click', () => {
          state[key] = item.id;
          b.parentElement.querySelectorAll('.choice').forEach((c) => c.setAttribute('aria-checked', String(c === b)));
          drawPreview();
          if (next) {
            narrator.say([next]);
            glow(next);
          }
        });
        return b;
      })
    );

  const skinRow = row('skin', looks.skin, (it) => h('span', { class: 'swatch', style: { background: it.colour } }), 'setup.hair');
  const hairRow = row('hair', looks.hair, (it) => avatarHead({ ...state, hair: it.id }), 'setup.hairColour');
  const colourRow = row('hairColour', looks.hairColour, (it) => h('span', { class: 'swatch', style: { background: it.colour } }), 'setup.done');
  const doneBtn = h('button', { class: 'ready-btn', type: 'button', 'aria-label': 'Done' }, tickIcon());

  function glow(lineId) {
    [skinRow, hairRow, colourRow, doneBtn].forEach((r) => r.classList.remove('is-glow'));
    ({ 'setup.skin': skinRow, 'setup.hair': hairRow, 'setup.hairColour': colourRow, 'setup.done': doneBtn })[lineId]?.classList.add('is-glow');
  }
  // Redraw hair buttons with the chosen skin so they match.
  skinRow.addEventListener('click', () => hairRow.querySelectorAll('.choice').forEach((b, i) => b.replaceChildren(avatarHead({ ...state, hair: looks.hair[i].id }))));
  colourRow.addEventListener('click', () => hairRow.querySelectorAll('.choice').forEach((b, i) => b.replaceChildren(avatarHead({ ...state, hair: looks.hair[i].id }))));

  doneBtn.addEventListener('click', () => {
    state.name = cleanName(nameInput.value);
    onDone({ ...state });
  });

  const el = h(
    'section',
    { class: 'screen setup' },
    h('div', { class: 'setup-top' }, preview, againButton()),
    h(
      'div',
      { class: 'name-box grown-up-box' },
      h('label', { for: 'player-name' }, 'Grown-up: type the player’s name'),
      nameInput,
      h('span', { id: 'name-help' }, nameNote)
    ),
    skinRow,
    hairRow,
    colourRow,
    h('div', { class: 'setup-bottom' }, doneBtn)
  );
  el.begin = () => {
    narrator.say(['setup.hello', 'setup.skin']);
    glow('setup.skin');
  };
  return el;
}

function avatarHead(look) {
  const svg = avatarSvg(look, { size: 56, idSuffix: `h-${look.hair}` });
  svg.setAttribute('viewBox', '18 2 64 64');
  svg.setAttribute('height', 56);
  return svg;
}

// ---------- Menu ----------
export function menuScreen({ profile, progress, updateReady, onChapter, onGrownUps, onUpdate, onEditPlayer }) {
  const done1 = !!progress.ch1;
  const done2 = !!progress.ch2;
  const chapterBtn = (n, side, locked, done, glow) =>
    h(
      'button',
      { class: `chapter-btn${locked ? ' is-locked' : ''}${glow ? ' is-glow' : ''}`, type: 'button', 'aria-label': `Level ${n}${locked ? ', locked' : ''}`, onclick: () => onChapter(n, locked) },
      chapterPicture(side),
      h('span', { class: 'chapter-num' }, String(n)),
      locked ? h('span', { class: 'chapter-lock' }, lockIcon()) : null,
      done ? h('span', { class: 'chapter-done' }, stickerSvg(n, true)) : null
    );
  const count = Number(done1) + Number(done2);
  return h(
    'section',
    { class: 'screen menu' },
    h(
      'header',
      { class: 'menu-top' },
      h('button', { class: 'text-btn grown-ups-btn', type: 'button', onclick: onGrownUps }, 'Grown-ups'),
      againButton()
    ),
    updateReady ? h('button', { class: 'update-btn', type: 'button', onclick: onUpdate }, 'Grown-ups: a new version is ready. Tap to update.') : null,
    h(
      'div',
      { class: 'menu-player' },
      h('button', { class: 'avatar-btn', type: 'button', 'aria-label': 'Change my player', onclick: onEditPlayer }, avatarSvg(profile, { size: 96, idSuffix: 'menu' })),
      h('div', { class: 'tally', 'aria-label': `${count} of 2 football stickers` }, stickerSvg(1, done1), stickerSvg(2, done2))
    ),
    h('div', { class: 'chapters' }, chapterBtn(1, 'ours', false, done1, !done1), chapterBtn(2, 'theirs', !done1, done2, done1 && !done2))
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
export function grownUpsScreen({ version, onBack, onDelete, onEditPlayer, showWords, onToggleWords }) {
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
      h('li', {}, 'The game keeps a first name or nickname, the player’s look, which levels are finished and the words-on-screen setting. That is all.'),
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
    h('h2', {}, 'Player'),
    h('button', { class: 'big-btn secondary', type: 'button', onclick: onEditPlayer }, 'Change name or look'),
    h('h2', {}, 'Delete'),
    h('button', { class: 'danger-btn', type: 'button', onclick: () => confirmBox.classList.remove('is-hidden') }, 'Delete everything'),
    confirmBox,
    h('p', { class: 'small version' }, `Version ${version}. Rules: FA 5v5 for under-8 and under-9, season 2026/27.`)
  );
}
