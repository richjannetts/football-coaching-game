import './style.css';
import { registerSW } from 'virtual:pwa-register';
import * as store from './lib/storage.js';
import * as narrator from './lib/narrator.js';
import { createStage, ABORT } from './game/stage.js';
import { chapter1 } from './game/chapter1.js';
import { chapter2 } from './game/chapter2.js';
import { installScreen, welcomeScreen, startScreen, setupScreen, menuScreen, gateScreen, grownUpsScreen } from './screens.js';


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

function show(el) {
  onMenu = false;
  app.replaceChildren(el);
  window.scrollTo(0, 0);
}

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
if (profile) narrator.setVars({ name: profile.name });
if (isInstalled()) store.askToKeepData();

// ---- Screens ----
function boot() {
  if (!isInstalled() && !skippedInstall) {
    show(
      installScreen({
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

function goSetup() {
  const el = setupScreen({
    profile,
    onDone: (next) => {
      profile = next;
      store.save('profile', profile);
      narrator.setVars({ name: profile.name });
      goMenu(true);
    },
  });
  show(el);
  el.begin(); // called from a tap, so sound can start
}

function goMenu(speak) {
  show(
    menuScreen({
      profile,
      progress,
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
      onEditPlayer: goSetup,
    })
  );
  onMenu = true;
  if (speak) narrator.say([progress.ch1 && progress.ch2 ? 'menu.allDone' : 'menu.welcome']);
}

function goGrownUps() {
  show(
    grownUpsScreen({
      version: VERSION,
      onBack: () => goMenu(false),
      onEditPlayer: goSetup,
      showWords: !!store.load('showWords'),
      onToggleWords: (on) => store.save('showWords', on),
      onDelete: () => {
        narrator.stop();
        store.deleteEverything();
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
  progress = { ...progress, [`ch${n}`]: true };
  store.save('progress', progress);
  const total = Object.keys(chapters).length;
  const footballs = Object.keys(chapters).filter((k) => progress[`ch${k}`]).length;
  stage.setBusy(false);
  stage.showReady(false);
  stage.showEnd({
    footballs,
    total,
    onNext: chapters[n + 1] ? () => goChapter(n + 1) : null,
  });
  await stage.play([`c${n}.end`]).catch(() => {});
}

boot();

