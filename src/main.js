import './style.css';
import { registerSW } from 'virtual:pwa-register';
import * as store from './lib/storage.js';
import * as narrator from './lib/narrator.js';
import * as sfx from './lib/sfx.js';
import { createStage, ABORT } from './game/stage.js';
import { chapter1 } from './game/chapter1.js';
import { chapter2 } from './game/chapter2.js';
import quiz from './data/quiz.json';
import levels from './data/levels.json';
import stickers from './data/stickers.json';
import { buildAlbum, newShinies } from './lib/album.js';
import { quizFor } from './lib/quiz.js';
import { detectPlatform } from './lib/platform.js';
import { installScreen, welcomeScreen, startScreen, setupScreen, menuScreen, teamScreen, albumScreen, gateScreen, grownUpsScreen } from './screens.js';
import * as teams from './lib/teamState.js';


const app = document.getElementById('app');
const VERSION = __APP_VERSION__;
const chapters = { 1: chapter1, 2: chapter2 };

let profile = store.load('profile');
let progress = store.load('progress', {});
let updateReady = false;
let onMenu = false;
let skippedInstall = false;
let applyUpdate = () => {};

const isInstalled = () => globalThis.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;

const platform = detectPlatform(navigator.userAgent, navigator.maxTouchPoints || 0);

// Android Chrome offers its own install box. Keep hold of it so the install
// screen can show a one-tap "Install Spots!" button.
let installPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e;
  if (app.querySelector('.install')) boot();
});
window.addEventListener('appinstalled', () => {
  installPrompt = null;
});

function show(el) {
  onMenu = false;
  app.replaceChildren(el);
  window.scrollTo(0, 0);
}

// ---- Screen size ----
// Use the real window height, and check again after the phone turns, so the
// game always fills the screen the right way round.
function fitHeight() {
  document.documentElement.style.setProperty('--app-h', `${window.innerHeight}px`);
  window.scrollTo(0, 0);
}
const refit = () => [0, 150, 500].forEach((ms) => setTimeout(fitHeight, ms));
window.addEventListener('resize', refit);
window.addEventListener('orientationchange', refit);
fitHeight();

// ---- Offline support and updates ----
// The service worker stores every file on first visit. A new version is only
// offered on the menu, between chapters, never in the middle of one.
if ('serviceWorker' in navigator) {
  applyUpdate = registerSW({
    onNeedRefresh() {
      updateReady = true;
      if (onMenu) goMenu(false);
    },
  });
}

narrator.prepare(import.meta.env.BASE_URL);
sfx.setEnabled(!store.load('soundsOff'));
const tellNames = () => {
  const t = teams.myTeam(profile);
  narrator.setVars({ name: profile?.name || '', team: t.name, them: t.theirName });
};
tellNames();
if (isInstalled()) store.askToKeepData();

// ---- Screens ----
function boot() {
  if (!isInstalled() && !skippedInstall) {
    show(
      installScreen({
        platform,
        canInstall: !!installPrompt,
        onInstall: async () => {
          const prompt = installPrompt;
          if (!prompt) return;
          prompt.prompt();
          const { outcome } = await prompt.userChoice;
          if (outcome === 'accepted') installPrompt = null;
          boot();
        },
        onSkip: () => {
          skippedInstall = true;
          boot();
        },
      })
    );
    return;
  }
  if (!store.load('agreed')) {
    show(
      welcomeScreen({
        onAgree: () => {
          store.save('agreed', true);
          goSetup();
        },
      })
    );
    return;
  }
  // Always start with one tap, so sound is allowed to play.
  show(
    startScreen({
      profile,
      onStart: () => (profile ? goMenu(true) : goSetup()),
    })
  );
}

function goSetup(then) {
  const el = setupScreen({
    profile,
    onDone: (next) => {
      profile = next;
      store.save('profile', profile);
      tellNames();
      if (typeof then === 'function') then();
      else goMenu(true);
    },
  });
  show(el);
  el.begin(); // called from a tap, so sound can start
}

// The team screen. Tapping a player opens the same setup screen as her own.
function goTeam(speak = true) {
  const el = teamScreen({
    team: teams.myTeam(profile),
    kits: teams.theirKits,
    onBack: () => {
      tellNames();
      goMenu(false);
    },
    onPlayer: (i) => {
      const p = teams.myTeam(profile).squad[i];
      if (p.you) return goSetup(() => goTeam(false));
      const setup = setupScreen({
        profile: p,
        who: 'friend',
        kit: p.keeper ? 'keeper' : 'us',
        onDone: (next) => {
          teams.savePlayer(i, next);
          goTeam(false);
        },
      });
      show(setup);
      setup.begin();
    },
    onTeamName: teams.saveTeamName,
    onTheirName: teams.saveTheirName,
    onTheirKit: teams.saveTheirKit,
  });
  show(el);
  if (speak) el.begin();
}

// The sticker album as it stands: worked out from her progress and team.
function albumNow() {
  const t = teams.myTeam(profile);
  return buildAlbum(stickers, { squad: t.squad, teamName: t.name, progress, levels });
}

function goAlbum() {
  const el = albumScreen({ album: albumNow(), onBack: () => goMenu(false) });
  show(el);
  el.begin();
}

// justPassed: the level she has only now finished for the first time, so
// the path can show her player walking up from it.
let justPassed = null;
function goMenu(speak) {
  const movedFrom = justPassed;
  justPassed = null;
  const allLevels = levels.matches.flatMap((m) => m.levels);
  const allDone = allLevels.every((n) => progress[`ch${n}`]);
  show(
    menuScreen({
      profile,
      progress,
      levels,
      album: albumNow(),
      onAlbum: goAlbum,
      movedFrom,
      onSoon: () => narrator.say(['menu.soon']),
      team: teams.myTeam(profile),
      onTeam: () => goTeam(true),
      updateReady,
      onChapter: (n, locked) => {
        if (locked) {
          narrator.say(['menu.locked']);
          return;
        }
        goChapter(n);
      },
      onGrownUps: () => show(gateScreen({ onPass: goGrownUps, onBack: () => goMenu(false) })),
      onUpdate: () => applyUpdate(true),
    })
  );
  onMenu = true;
  if (speak) narrator.say([allDone ? 'menu.allDone' : movedFrom != null ? 'menu.moved' : 'menu.welcome']);
}

function goGrownUps() {
  show(
    grownUpsScreen({
      version: VERSION,
      onBack: () => goMenu(false),
      onEditPlayer: () => goSetup(),
      showWords: !!store.load('showWords'),
      onToggleWords: (on) => store.save('showWords', on),
      sounds: sfx.isEnabled(),
      onToggleSounds: (on) => {
        sfx.setEnabled(on);
        store.save('soundsOff', !on);
      },
      onDelete: () => {
        narrator.stop();
        store.deleteEverything();
        teams.forgetTeam();
        profile = null;
        progress = {};
        location.reload();
      },
    })
  );
}

function goChapter(n) {
  const stage = createStage({ profile, onHome: () => goMenu(true), showWords: !!store.load('showWords') });
  show(stage.el);
  stage.el.dataset.chapter = n;
  // The chapter's first line is spoken now, inside the tap that opened it.
  chapters[n](stage)
    .then(() => finishChapter(n, stage))
    .catch((err) => {
      if (err === ABORT) return;
      console.error(err);
      stage.leave();
      goMenu(false);
    });
}

async function finishChapter(n, stage) {
  const firstTime = !progress[`ch${n}`];
  if (firstTime && chapters[n + 1]) justPassed = n;
  const before = albumNow();
  progress = { ...progress, [`ch${n}`]: true };
  store.save('progress', progress);
  const after = albumNow();
  // Finishing the last level of a match gives its shiny sticker.
  const shiny = newShinies(before, after)[0] || null;
  const end = stage.showEnd({
    level: n,
    // A right bonus answer wins the next sticker, once for each level.
    prize: progress[`bonus${n}`] ? null : after.next,
    shiny,
    question: quizFor(quiz, n),
    firstTime,
    onBonus: () => {
      progress = { ...progress, [`bonus${n}`]: true };
      store.save('progress', progress);
    },
    // The first time, the arrow goes back to the path so she sees her player
    // move up. Playing a level again goes straight on to the next one.
    onNext: chapters[n + 1] ? () => (firstTime ? goMenu(true) : goChapter(n + 1)) : null,
  });
  stage.setBusy(false);
  stage.showReady(false);
  await stage.play(['sfx.sticker', `c${n}.end`, ...(shiny ? ['end.shiny'] : [])]).catch(() => {});
  await end.startQuiz().catch(() => {});
}

boot();

