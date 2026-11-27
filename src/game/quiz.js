// The bonus question screen: big words that pop, three little pitch
// pictures to tap, and every word spoken too.

import { h } from '../lib/svg.js';
import { quizPicture, speakerIcon } from '../lib/icons.js';
import { checkAnswer, askLines } from '../lib/quiz.js';
import { pitchSize } from './content.js';

// rightLines: extra lines after a right answer, such as "you've won a sticker".
export function createQuiz({ question, play, say, onShow, onAnswer, thenLines = [], rightLines = [] }) {
  const words = question.question.split(' ').map((w, i) => h('span', { class: 'quiz-word', style: `animation-delay:${0.15 + i * 0.12}s` }, w));
  const title = h('h2', { class: 'quiz-question' }, h('span', { class: 'quiz-tag' }, 'Bonus question!'), h('span', { class: 'quiz-words' }, ...words));
  let ready = false;
  let answered = false;
  let last = null;
  let lastTap = { t: -Infinity, x: 0, y: 0 };

  const buttons = question.options.map((o, i) =>
    h(
      'button',
      { class: 'quiz-option', type: 'button', 'aria-label': o.label, onclick: (e) => choose(i, e) },
      quizPicture(o.picture, pitchSize.length, pitchSize.width),
      h('span', { class: 'quiz-label' }, o.label)
    )
  );
  const again = h('button', { class: 'icon-btn quiz-again', type: 'button', 'aria-label': 'Hear it again', onclick: () => hearAgain() }, speakerIcon());
  const el = h('section', { class: 'quiz is-hidden', 'aria-label': 'Bonus question' }, title, h('div', { class: 'quiz-options' }, ...buttons), again);

  const glow = (i) => buttons.forEach((b, j) => b.classList.toggle('is-glow', i === j));

  const askCues = () => {
    const cues = { [question.bonus]: () => onShow?.() };
    question.options.forEach((o, i) => (cues[o.line] = () => glow(i)));
    return cues;
  };

  function start() {
    el.classList.remove('is-hidden');
    el.classList.add('is-in');
    last = { ids: askLines(question), cues: askCues() };
    return play(last.ids, last.cues).then(() => {
      glow(-1);
      ready = true;
      el.classList.add('is-ready');
    });
  }

  function choose(i, e) {
    if (!ready || answered) return;
    // Ignore a quick second tap in the same place (small hands bounce).
    const now = e?.timeStamp || performance.now();
    if (now - lastTap.t < 300 && Math.hypot((e?.clientX || 0) - lastTap.x, (e?.clientY || 0) - lastTap.y) < 40) return;
    lastTap = { t: now, x: e?.clientX || 0, y: e?.clientY || 0 };
    answered = true;
    glow(-1);
    const { right, answer } = checkAnswer(question, i);
    el.classList.add('is-answered');
    buttons.forEach((b, j) => {
      b.disabled = true;
      b.classList.toggle('is-right', j === answer);
      b.classList.toggle('is-faded', j !== answer);
      b.classList.toggle('is-chosen', j === i);
    });
    // Speech starts inside the tap.
    // A right answer gets a happy chime first. "Hear it again" repeats the
    // words only.
    last = { ids: right ? [question.right, ...rightLines, ...thenLines] : [question.reveal, ...thenLines], cues: {} };
    onAnswer(right);
    say(right ? ['sfx.chime', ...last.ids] : last.ids, last.cues);
  }

  function hearAgain() {
    if (!last) return;
    if (!answered) ready = true;
    play(last.ids, last.cues, { remember: false })
      .then(() => answered || glow(-1))
      .catch(() => {});
  }

  return { el, start };
}
