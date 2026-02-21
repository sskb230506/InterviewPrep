const QUESTION_LIBRARY = {
  technical: [
    'Explain React reconciliation and why list keys matter.',
    'How would you optimize slow initial render in a frontend app?',
    'Describe tradeoffs between SQL and NoSQL for user analytics.',
    'How do you secure JWT-based auth in SPAs?',
    'What strategy would you use for scaling WebSocket connections?',
    'How do you design an API that supports idempotent retries?',
  ],
  behavioral: [
    'Tell me about a time you handled disagreement during code review.',
    'Describe a project where you had to deliver under tight deadlines.',
    'How do you prioritize when multiple bugs are reported at once?',
    'Share an example of mentoring a teammate.',
    'Describe a mistake you made and how you recovered.',
    'How do you communicate technical tradeoffs to non-engineers?',
  ],
};

const DIFFICULTY_HINT = {
  Easy: 'Keep the explanation practical and concise.',
  Medium: 'Include tradeoffs and measurable impact.',
  Hard: 'Go deep into architecture and edge cases.',
};

function buildQuestion(text, type, index, role, difficulty) {
  return {
    id: `q_${index + 1}_${Date.now()}_${Math.round(Math.random() * 1000)}`,
    type,
    text: `${text} (${role}, ${difficulty}) ${DIFFICULTY_HINT[difficulty]}`,
  };
}

export function generateInterviewQuestions({ role, difficulty, interviewType, count = 5 }) {
  const technical = QUESTION_LIBRARY.technical;
  const behavioral = QUESTION_LIBRARY.behavioral;
  const output = [];

  if (interviewType === 'Technical') {
    for (let i = 0; i < count; i += 1) {
      output.push(buildQuestion(technical[i % technical.length], 'Technical', i, role, difficulty));
    }
    return output;
  }

  if (interviewType === 'Behavioral') {
    for (let i = 0; i < count; i += 1) {
      output.push(buildQuestion(behavioral[i % behavioral.length], 'Behavioral', i, role, difficulty));
    }
    return output;
  }

  for (let i = 0; i < count; i += 1) {
    const isTechnical = i % 2 === 0;
    const text = isTechnical ? technical[i % technical.length] : behavioral[i % behavioral.length];
    const type = isTechnical ? 'Technical' : 'Behavioral';
    output.push(buildQuestion(text, type, i, role, difficulty));
  }

  return output;
}
