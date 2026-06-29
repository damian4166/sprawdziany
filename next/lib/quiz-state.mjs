function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createInitialState() {
  return {
    questions: [],
    answers: [],
  };
}

export function addQuestion(state, question) {
  const text = question?.text?.trim();
  const answer = question?.answer?.trim();

  if (!text || !answer) {
    return state;
  }

  return {
    ...state,
    questions: [
      ...state.questions,
      {
        id: createId('question'),
        text,
        answer,
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

export function submitAnswer(state, answer) {
  const studentId = answer?.studentId?.trim();
  const questionId = answer?.questionId?.trim();
  const value = answer?.value?.trim();

  if (!studentId || !questionId || !value) {
    return state;
  }

  return {
    ...state,
    answers: [
      ...state.answers,
      {
        id: createId('answer'),
        studentId,
        questionId,
        value,
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

export function isAnswerCorrect(question, answerValue) {
  const expected = question?.answer?.trim().toLowerCase();
  const provided = answerValue?.trim().toLowerCase();

  return Boolean(expected && provided && expected === provided);
}
