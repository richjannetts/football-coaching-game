// The bonus question at the end of each level. Plain logic, no screen,
// so the tests can check it.

export function quizFor(quizData, level) {
  return quizData.levels[String(level)] || null;
}

// Which option is right. A wrong answer is never called wrong on screen:
// the game shows the right one instead.
export function checkAnswer(question, choice) {
  return { right: choice === question.answer, answer: question.answer };
}

// Every spoken line a question needs, in the order they are said.
export function askLines(question) {
  return [question.bonus, question.ask, ...question.options.map((o) => o.line)];
}
