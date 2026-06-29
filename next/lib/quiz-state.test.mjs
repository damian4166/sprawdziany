import test from 'node:test';
import assert from 'node:assert/strict';

import { createInitialState, addQuestion, submitAnswer, isAnswerCorrect } from './quiz-state.mjs';

test('adds a question and stores the answer', () => {
  const state = createInitialState();
  const withQuestion = addQuestion(state, {
    text: 'Ile wynosi 2 + 2?',
    answer: '4',
  });

  assert.equal(withQuestion.questions.length, 1);
  assert.equal(withQuestion.questions[0].text, 'Ile wynosi 2 + 2?');

  const withAnswer = submitAnswer(withQuestion, {
    studentId: 'uczen-1',
    questionId: withQuestion.questions[0].id,
    value: '4',
  });

  assert.equal(withAnswer.answers.length, 1);
  assert.equal(withAnswer.answers[0].studentId, 'uczen-1');
  assert.equal(withAnswer.answers[0].value, '4');
});

test('checks whether the answer is correct ignoring case and spaces', () => {
  const question = { answer: 'Warszawa' };

  assert.equal(isAnswerCorrect(question, 'warszawa'), true);
  assert.equal(isAnswerCorrect(question, '  warszawa  '), true);
  assert.equal(isAnswerCorrect(question, 'Kraków'), false);
});
