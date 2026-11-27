import './style.css';
import { registerSW } from 'virtual:pwa-register';
import * as store from './lib/storage.js';
import * as narrator from './lib/narrator.js';
import * as sfx from './lib/sfx.js';
import { createStage, ABORT } from './game/stage.js';
import { chapter1 } from './game/chapter1.js';
import { chapter2 } from './game/chapter2.js';
import { chapter3 } from './game/chapter3.js';
import { chapter4 } from './game/chapter4.js';
import { chapter5 } from './game/chapter5.js';
import { chapter6 } from './game/chapter6.js';
import { chapter7 } from './game/chapter7.js';
import { chapter8 } from './game/chapter8.js';
import { chapter9 } from './game/chapter9.js';
import { chapter10 } from './game/chapter10.js';
import quiz from './data/quiz.json';
import levels from './data/levels.json';
import stickers from './data/stickers.json';
import { buildAlbum, newShinies } from './lib/album.js';
import { quizFor } from './lib/quiz.js';
import { detectPlatform } from './lib/platform.js';
import { hasPointed } from './lib/firstTap.js';
import { installScreen, welcomeScreen, startScreen, storyScreen, setupScreen, menuScreen, teamScreen, albumScreen, gateScreen, grownUpsScreen, newMatchScreen } from './screens.js';
import * as teams from './lib/teamState.js';
import difficulty from './data/difficulty.json';
import replayData from './data/replays.json';
import { readReplays, startReplay, finishReplayLevel, addGoal, isUnlocked, pathProgress } from './lib/replays.js';


const app = document.getElementById('app');
const VERSION = __APP_VERSION__;
// A level can list extra spots it needs, such as the kick-in spot on the side line.
chapter5.spots = ['kick-in-left'];
chapter8.spots = ['corner-right'];
chapter10.spots = ['penalty-spot'];
const chapters = { 1: chapter1, 2: chapter2, 3: chapter3, 4: chapter4, 5: chapter5, 6: chapter6, 7: chapter7, 8: chapter8, 9: chapter9, 10: chapter10 };

let profile = store.load('profile');
let progress = store.load('progress', {});
// Playing a match again against a new team (see src/lib/replays.js).
let replays = readReplays(store.load('replays'));
const saveReplays = (next) => {
  replays = next;
  store.save('replays', replays);
};
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
  // A replay's other team is only laid over the top while a level plays.
  if (!el.classList.contains('chapter')) {
    teams.setMatch(null);
    tellNames();
  }
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
  narrator.setVars({ name: profile?.name || '', team: t.name, them: t.theirName, colours: teams.ourKitWords(profile) });
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
          goStory();
        },
      })
    );
    return;
  }
  // Always start with one tap, so sound is allowed to play.
  show(
    startScreen({
      profile,
      onStart: () => (profile ? goMenu(true) : goStory()),
    })
  );
}

// ---- A new player's first run ----
// A short story, then she makes her player, meets her team-mates, sets up
// the other team, and a last story page takes her to the path (Rich asked
// for a lead-in and for both teams to be set up first, 27th November 2026).
// Everything here can be changed later from the My team button.
const COACH = stickers.pages.flatMap((p) => p.stickers || []).find((st) => st.kind === 'coach');
const storyPages = (part) =>
  part === 'start'
    ? [
        { line: 'story.morning', scene: 'morning' },
        { line: 'story.coach', scene: 'coach' },
        { line: 'story.you', scene: 'you' },
      ]
    : [
        // The sticker book is explained before her first level (Rich, 27th
        // November 2026), then the team goes to the pitch.
        { line: 'story.stickers', scene: 'stickers' },
        { line: 'story.ready', scene: 'ready' },
      ];

// Every step has a back button that goes one step back (Rich asked, 27th
// November 2026): story, her player, her team-mates, the other team, and
// the last story page.
function goStory(part = 'start', atEnd = false) {
  tellNames();
  const pages = storyPages(part);
  const el = storyScreen({
    pages,
    startAt: atEnd ? pages.length - 1 : 0,
    team: teams.myTeam(profile),
    profile,
    coach: COACH,
    album: albumNow(),
    onBack: part === 'start' ? null : () => goTeam(true, 'them'),
    onDone: () => (part === 'start' ? firstSetup() : goMenu(true)),
  });
  show(el);
  el.begin(); // called from a tap, so sound can start
}

// Her own player, on the first run: back goes to the last story page.
function firstSetup() {
  goSetup(() => goTeam(true, 'us'), () => goStory('start', true));
}

function goSetup(then, back) {
  const el = setupScreen({
    profile,
    onBack: back,
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
// mode 'both' comes from the menu. 'us' then 'them' are the first-run steps.
function goTeam(speak = true, mode = 'both') {
  const el = teamScreen({
    team: teams.myTeam(profile),
    kits: teams.kitOptions,
    mode,
    onBack: () => {
      tellNames();
      if (mode === 'us') firstSetup();
      else if (mode === 'them') goTeam(true, 'us');
      else goMenu(false);
    },
    onNext: () => {
      tellNames();
      if (mode === 'us') goTeam(true, 'them');
      else goStory('end');
    },
    onPlayer: (i) => {
      const p = teams.myTeam(profile).squad[i];
      if (p.you) return goSetup(() => goTeam(false, mode), () => goTeam(false, mode));
      const setup = setupScreen({
        profile: p,
        who: 'friend',
        kit: p.keeper ? 'keeper' : 'us',
        onBack: () => goTeam(false, mode),
        onDone: (next) => {
          teams.savePlayer(i, next);
          goTeam(false, mode);
        },
      });
      show(setup);
      setup.begin();
    },
    onTeamName: teams.saveTeamName,
    onTheirName: teams.saveTheirName,
    onTheirKit: teams.saveTheirKit,
    onOurKit: teams.saveOurKit,
  });
  show(el);
  if (speak) el.begin();
}

// The sticker album as it stands: worked out from her progress and team.
function albumNow() {
  const t = teams.myTeam(profile);
  return buildAlbum(stickers, { squad: t.squad, teamName: t.name, progress, levels });
}

// The album page a sticker sits on, with its page number.
function pageOf(album, st) {
  const index = album.pages.findIndex((p) => p.id === st.page);
  return index < 0 ? null : { ...album.pages[index], index };
}

function goAlbum() {
  const el = albumScreen({ album: albumNow(), onBack: () => goMenu(false) });
  show(el);
  el.begin();
}

// justPassed: the level she has only now finished for the first time, so
// the path can show her player walking up from it.
let justPassed = null;
const MATCH = levels.matches[0];
const matchDone = () => MATCH.levels.every((n) => progress[`ch${n}`]);
const levelCfg = (d) => difficulty.levels[d] || difficulty.levels.easy;
function goMenu(speak) {
  const movedFrom = justPassed;
  justPassed = null;
  const cur = replays.current;
  const allLevels = levels.matches.flatMap((m) => m.levels);
  const allDone = allLevels.every((n) => progress[`ch${n}`]);
  // A new match can start once the whole match has been played, and
  // there is no replay already going.
  const canStart = matchDone() && !cur;
  show(
    menuScreen({
      profile,
      progress: pathProgress(replays, progress),
      levels,
      album: albumNow(),
      onAlbum: goAlbum,
      movedFrom,
      onSoon: () => narrator.say(['menu.soon']),
      team: teams.myTeam(profile),
      onTeam: () => goTeam(true),
      updateReady,
      replay: cur ? { name: cur.opponent.name, kit: teams.previewKit(cur.opponent.kit), balls: levelCfg(cur.difficulty).balls, label: levelCfg(cur.difficulty).label } : null,
      onNewMatch: canStart ? goNewMatch : null,
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
  if (cur) narrator.setVars({ them: cur.opponent.name });
  if (!speak) return;
  // The first time she has a sticker, the voice shows her the book too.
  const book = albumNow().count > 0 && !hasPointed('album') ? ['menu.album'] : [];
  if (cur) narrator.say([movedFrom != null ? 'menu.replayMoved' : 'menu.replay', ...book]);
  else if (canStart) narrator.say(['menu.newMatch', ...book]);
  else narrator.say([allDone ? 'menu.allDone' : movedFrom != null ? 'menu.moved' : 'menu.welcome', ...book]);
}

// A new match: meet the new team, then choose how hard.
function goNewMatch() {
  const ourKit = teams.myTeam(profile).ourKit;
  const plan = (d) => startReplay(replays, { match: MATCH.id, difficulty: d, opponents: replayData.opponents, ourKit, mirrorable: replayData.mirrorable, endings: replayData.endings });
  const opponent = plan('easy').current.opponent;
  const choices = difficulty.order.map((id) => ({ id, ...levelCfg(id), locked: !isUnlocked(replays, id, difficulty.levels) }));
  const el = newMatchScreen({
    opponent,
    kit: teams.previewKit(opponent.kit),
    choices,
    onBack: () => goMenu(false),
    onLocked: () => narrator.say(['match.locked']),
    onPick: (c) => {
      saveReplays(plan(c.id));
      goMenu(false);
      const warn = c.id === 'difficult' && c.consequences && !store.load('consequencesOff') ? ['match.difficultLose'] : [];
      // Inside the tap, so the voice can start.
      narrator.setVars({ them: opponent.name });
      narrator.say([`match.${c.id}`, ...warn, 'match.go']);
    },
  });
  show(el);
  narrator.setVars({ them: opponent.name });
  el.begin();
}

function goGrownUps() {
  show(
    grownUpsScreen({
      version: VERSION,
      onBack: () => goMenu(false),
      onEditPlayer: () => goSetup(null, goGrownUps),
      showWords: !!store.load('showWords'),
      onToggleWords: (on) => store.save('showWords', on),
      sounds: sfx.isEnabled(),
      onToggleSounds: (on) => {
        sfx.setEnabled(on);
        store.save('soundsOff', !on);
      },
      consequences: !store.load('consequencesOff'),
      onToggleConsequences: (on) => store.save('consequencesOff', !on),
      replay: replays.current
        ? { name: replays.current.opponent.name, label: levelCfg(replays.current.difficulty).label, done: replays.current.done.length, total: MATCH.levels.length }
        : null,
      onStopReplay: () => {
        saveReplays({ ...replays, current: null });
        goGrownUps();
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

// How a level is played. The first time through Match 1 is Easy. A replay
// brings its own difficulty, side of the pitch, extra goals and ending.
function modeFor(n) {
  const cur = replays.current;
  if (!cur || !MATCH.levels.includes(n)) return { level: n, difficulty: 'easy' };
  return {
    level: n,
    difficulty: cur.difficulty,
    mirror: cur.mirror.includes(n),
    goals: { ...cur.goals },
    consequences: !store.load('consequencesOff'),
    ending: cur.ending,
    onGoal: (side) => saveReplays(addGoal(replays, side)),
  };
}

function goChapter(n) {
  const cur = replays.current;
  teams.setMatch(cur ? cur.opponent : null);
  if (cur) narrator.setVars({ them: cur.opponent.name });
  const stage = createStage({ profile, onHome: () => goMenu(true), showWords: !!store.load('showWords'), spots: chapters[n].spots || [], mode: modeFor(n) });
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
  // In a replay, "first time" means the first time in this replay: that is
  // when her player walks up the path.
  let movesUp = firstTime;
  if (replays.current && MATCH.levels.includes(n)) {
    const r = finishReplayLevel(replays, n, MATCH.levels);
    movesUp = r.firstTime;
    saveReplays(r.state);
  }
  if (movesUp && chapters[n + 1]) justPassed = n;
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
    prizePage: progress[`bonus${n}`] || !after.next ? null : pageOf(after, after.next),
    shiny,
    question: quizFor(quiz, n),
    firstTime,
    onBonus: () => {
      progress = { ...progress, [`bonus${n}`]: true };
      store.save('progress', progress);
    },
    // The first time, the arrow goes back to the path so she sees her player
    // move up. Playing a level again goes straight on to the next one.
    onNext: chapters[n + 1] ? () => (movesUp ? goMenu(true) : goChapter(n + 1)) : null,
  });
  stage.setBusy(false);
  stage.showReady(false);
  await stage.play(['sfx.sticker', `c${n}.end`, ...(shiny ? ['end.shiny'] : [])]).catch(() => {});
  await end.startQuiz().catch(() => {});
}

boot();

