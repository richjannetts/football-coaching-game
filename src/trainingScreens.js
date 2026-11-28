// The opening doors, the Match day screen, the Training night menu and
// the 100 touches chart (Rich's choices, 28th November 2026).
//   - Opening: two big doors, Match day and Training night. Neither locks
//     the other.
//   - Match day: a Cup run tile (the cup path, as before) and a Coming
//     soon tile, a marker for another kind of match later.
//   - Training night: mini-games grouped like the FA fundamentals Rich
//     coaches, then 100 touches a day at home.

import { h, motion } from './lib/svg.js';
import { backIcon, bookIcon, speakerIcon, tickIcon, trophyIcon, lockIcon } from './lib/icons.js';
import { trainingPic, matchDayDoor, trainingDoor } from './lib/trainingIcons.js';
import { footballSvg } from './lib/ball.js';
import { s } from './lib/svg.js';
import * as narrator from './lib/narrator.js';
import { pointOnce } from './lib/firstTap.js';
import { isFull } from './lib/touches.js';

const againButton = () => h('button', { class: 'icon-btn again', type: 'button', 'aria-label': 'Hear it again', onclick: () => narrator.replay() }, speakerIcon());
const backButton = (onBack) => h('button', { class: 'icon-btn back-btn', type: 'button', 'aria-label': 'Back', onclick: onBack }, backIcon());

function wobble(el) {
  el.classList.remove('is-shaking');
  void el.offsetWidth;
  el.classList.add('is-shaking');
  setTimeout(() => el.classList.remove('is-shaking'), 600);
}

const ballPic = (size = 30) => s('svg', { viewBox: `${-size / 2 - 1} ${-size / 2 - 1} ${size + 2} ${size + 2}`, width: size, height: size, class: 'ball-pic', 'aria-hidden': 'true' }, footballSvg(size / 2));

// ---------- Opening: Match day or Training night ----------
export function homeScreen({ albumCount = 0, onMatchDay, onTraining, onAlbum, onGrownUps, updateReady = false, onUpdate, line = 'home.hello' }) {
  const door = (cls, art, title, sub, onTap) => {
    const b = h('button', { class: `door ${cls}`, type: 'button', 'aria-label': title, onclick: onTap }, art, h('span', { class: 'door-cap' }, h('span', { class: 'door-title' }, title), h('span', { class: 'door-sub' }, sub)));
    return b;
  };
  const el = h(
    'section',
    { class: 'screen home' },
    h(
      'header',
      { class: 'setup-top' },
      h('button', { class: 'chip chip-count', type: 'button', 'aria-label': `Sticker album: ${albumCount} stickers`, onclick: onAlbum }, h('span', { class: 'chip-book' }, bookIcon()), String(albumCount)),
      againButton()
    ),
    h('h1', { class: 'home-title' }, 'What are we doing today?'),
    h(
      'div',
      { class: 'doors' },
      door('door-match', matchDayDoor(), 'Match day', 'Play the cup', onMatchDay),
      door('door-training', trainingDoor(), 'Training night', 'Practise with Coach', onTraining)
    ),
    h('footer', { class: 'home-bottom' }, h('button', { class: 'text-btn grown-ups-btn', type: 'button', onclick: onGrownUps }, 'Grown-ups')),
    updateReady ? h('button', { class: 'update-btn', type: 'button', onclick: onUpdate }, 'Grown-ups: a new version is ready. Tap to update.') : null
  );
  el.begin = () => narrator.say([line]);
  return el;
}

// ---------- Match day: the cup run, and something coming soon ----------
export function matchDayScreen({ roundLabel, onBack, onCup }) {
  const cup = h(
    'button',
    { class: 'big-tile is-next is-glow', type: 'button', 'aria-label': `Cup run, ${roundLabel}`, onclick: onCup },
    h('span', { class: 'big-tile-pic' }, trophyIcon(true)),
    h('span', { class: 'big-tile-words' }, h('span', { class: 'big-tile-title' }, 'Cup run'), h('span', { class: 'big-tile-sub' }, roundLabel))
  );
  const soon = h(
    'button',
    { class: 'big-tile is-soon', type: 'button', 'aria-label': 'Coming soon' },
    h('span', { class: 'big-tile-pic' }, lockIcon()),
    h('span', { class: 'big-tile-words' }, h('span', { class: 'big-tile-title' }, 'Coming soon'), h('span', { class: 'big-tile-sub' }, 'A new kind of match'))
  );
  soon.addEventListener('click', () => {
    wobble(soon);
    narrator.say(['md.soon']);
  });
  const el = h('section', { class: 'screen hub match-day' }, h('header', { class: 'setup-top' }, backButton(onBack), h('h1', { class: 'hub-title' }, 'Match day'), againButton()), h('div', { class: 'big-tiles' }, cup, soon));
  el.begin = () => narrator.say(['md.hello']);
  return el;
}

// ---------- Training night ----------
// sections: from training.json. done: mini-games she has finished.
// touches: the 100 touches chart, for its summary.
export function trainingScreen({ sections, done, touches, onBack, onDrill, onTouches, line = 'tn.hello' }) {
  const built = sections.flatMap((sec) => sec.tiles.filter((t) => t.built));
  const next = built.find((t) => !done.has(t.id)) || null;
  const tile = (t) => {
    const state = !t.built ? 'soon' : done.has(t.id) ? 'done' : next === t ? 'next' : 'open';
    const b = h(
      'button',
      { class: `tile is-${state}${state === 'next' ? ' is-glow' : ''}`, type: 'button', 'aria-label': `${t.label}${state === 'soon' ? ', coming soon' : state === 'done' ? ', done' : ''}` },
      trainingPic(t.icon, 44),
      h('span', { class: 'tile-label' }, t.label),
      state === 'done' ? h('span', { class: 'tile-tick' }, tickIcon()) : null,
      state === 'soon' ? h('span', { class: 'tile-lock' }, lockIcon()) : null
    );
    b.addEventListener('click', () => {
      if (state === 'soon') {
        wobble(b);
        narrator.say(['tn.soon']);
        return;
      }
      onDrill(t.id);
    });
    return b;
  };
  const balls = touches.ticks.length;
  const home = h(
    'button',
    { class: 'station-btn', type: 'button', 'aria-label': `${touches.touches} touches a day: ${balls} of ${touches.days} balls`, onclick: onTouches },
    h('span', { class: 'station-pic' }, ballPic(34)),
    h('span', { class: 'station-words' }, h('span', { class: 'station-title' }, `${touches.touches} touches a day`), h('span', { class: 'station-sub' }, isFull(touches) ? 'Chart full!' : `${balls} of ${touches.days} balls`))
  );
  const el = h(
    'section',
    { class: 'screen hub training' },
    h('header', { class: 'setup-top' }, backButton(onBack), h('h1', { class: 'hub-title' }, 'Training night'), againButton()),
    h(
      'div',
      { class: 'hub-body' },
      sections.map((sec) => h('section', { class: 'hub-section' }, h('h2', { class: 'hub-label' }, trainingPic(sec.icon, 26), sec.label), h('div', { class: 'tiles' }, sec.tiles.map(tile)))),
      h('section', { class: 'hub-section' }, h('h2', { class: 'hub-label' }, ballPic(24), 'At home'), home)
    )
  );
  el.begin = () => narrator.say([line]);
  return el;
}

// ---------- A dial, like the iPhone timer ----------
// A short column of numbers that scrolls and snaps; the one in the middle
// is chosen. Tapping a number scrolls to it too.
function dial({ values, value, label, onChange }) {
  const ROW = 48;
  const list = h('div', { class: 'dial-list', role: 'listbox', 'aria-label': label, tabindex: '0' });
  const items = values.map((v) => h('div', { class: 'dial-item', role: 'option' }, String(v)));
  list.append(h('div', { class: 'dial-pad' }), ...items, h('div', { class: 'dial-pad' }));
  let at = Math.max(0, values.indexOf(value));
  const mark = () => items.forEach((it, i) => (it.classList.toggle('is-on', i === at), it.setAttribute('aria-selected', String(i === at))));
  const goTo = (i, smooth = true) => {
    at = Math.max(0, Math.min(values.length - 1, i));
    list.scrollTo({ top: at * ROW, behavior: smooth && motion(200) > 1 ? 'smooth' : 'auto' });
    mark();
    onChange(values[at]);
  };
  let timer = 0;
  list.addEventListener('scroll', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const i = Math.round(list.scrollTop / ROW);
      if (i !== at) {
        at = Math.max(0, Math.min(values.length - 1, i));
        mark();
        onChange(values[at]);
      }
    }, 90);
  });
  items.forEach((it, i) => it.addEventListener('click', () => goTo(i)));
  list.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') goTo(at + 1);
    if (e.key === 'ArrowUp') goTo(at - 1);
  });
  mark();
  // Show the chosen number once the dial is on screen.
  requestAnimationFrame(() => requestAnimationFrame(() => (list.scrollTop = at * ROW)));
  return h('div', { class: 'dial' }, h('div', { class: 'dial-window', 'aria-hidden': 'true' }), list, h('div', { class: 'dial-label' }, label));
}

// ---------- 100 touches a day ----------
// state: from src/lib/touches.js. today: today's date key.
export function touchesScreen({ state, today, skills, options, onBack, onTick, onSetChart, onNewChart }) {
  const el = h('section', { class: 'screen hub touches' });
  let setting = !state.set;

  function draw(st) {
    const tickedToday = st.ticks.includes(today);
    const full = isFull(st);
    const cells = Array.from({ length: st.days }, (_, i) => {
      const got = i < st.ticks.length;
      const isNext = !got && i === st.ticks.length && !tickedToday;
      return h('div', { class: `day${got ? ' is-got' : ''}${isNext ? ' is-next' : ''}`, 'aria-label': `Day ${i + 1}${got ? ', done' : ''}` }, h('span', { class: 'day-no' }, String(i + 1)), got ? ballPic(30) : null);
    });
    const did = h('button', { class: `did-btn${tickedToday || full ? ' is-done' : ' is-glow'}`, type: 'button' }, tickedToday || full ? tickIcon() : null, h('span', {}, full ? 'Chart full!' : tickedToday ? 'Done today' : `I did ${st.touches}!`));
    if (!tickedToday && !full) pointOnce(did, 'touches-did', { above: true });
    did.addEventListener('click', () => {
      if (full) return narrator.say(['tc.full']);
      if (tickedToday) {
        wobble(did);
        return narrator.say(['tc.today']);
      }
      onTick(); // speaks, inside the tap
    });
    const grownUps = h(
      'div',
      { class: 'touches-grown' },
      h('button', { class: 'text-btn', type: 'button', onclick: () => ((setting = true), draw(st), narrator.say(['tc.setup'])) }, 'Grown-ups: change the chart'),
      full ? h('button', { class: 'text-btn', type: 'button', onclick: onNewChart }, 'Start a new chart') : null
    );
    el.replaceChildren(
      h('header', { class: 'setup-top' }, backButton(onBack), h('h1', { class: 'hub-title' }, `${st.touches} touches a day`), againButton()),
      setting ? setup(st) : h('div', { class: 'touches-body' }, h('ul', { class: 'skills' }, skills.map((sk) => h('li', {}, sk.label))), h('div', { class: 'chart' }, cells), did, grownUps)
    );
  }

  function setup(st) {
    let touches = st.touches;
    let days = st.days;
    const ok = h('button', { class: 'ready-btn is-glow', type: 'button', 'aria-label': 'Done' }, tickIcon());
    ok.addEventListener('click', () => {
      setting = false;
      onSetChart({ touches, days });
    });
    return h(
      'div',
      { class: 'touches-setup' },
      h('p', { class: 'lead' }, 'Grown-ups: how many touches, and for how many days?'),
      h(
        'div',
        { class: 'dials' },
        dial({ values: options.touchOptions, value: touches, label: 'touches', onChange: (v) => (touches = v) }),
        dial({ values: options.dayOptions, value: days, label: 'days', onChange: (v) => (days = v) })
      ),
      h('p', { class: 'small' }, 'One ball a day on the chart. A missed day just stays blank.'),
      h('div', { class: 'setup-bottom' }, ok)
    );
  }

  draw(state);
  el.redraw = (st) => {
    state = st;
    draw(st);
  };
  el.begin = () => narrator.say(setting ? ['tc.setup'] : ['tc.hello', 'tc.skills']);
  return el;
}
