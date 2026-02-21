function clampScore(value) {
  return Math.max(45, Math.min(96, Math.round(value)));
}

function seededBase(questionId = '', size = 0) {
  const chars = Array.from(questionId).reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return (chars + size) % 37;
}

function buildFeedback(scores, type) {
  const feedback = [];

  if (scores.technical >= 80) {
    feedback.push('Strong technical detail and correct terminology.');
  } else {
    feedback.push('Add deeper technical specifics and concrete implementation details.');
  }

  if (scores.clarity >= 75) {
    feedback.push('Answer structure was clear and easy to follow.');
  } else {
    feedback.push('Use a clearer structure: context, approach, outcome.');
  }

  if (scores.confidence >= 72) {
    feedback.push('Delivery sounded confident and stable.');
  } else {
    feedback.push('Slow the pace and reduce filler words for stronger confidence.');
  }

  if (type === 'Behavioral') {
    feedback.push('Use STAR format and quantify impact when possible.');
  }

  return feedback;
}

function buildBetterAnswer(questionText, type) {
  if (type === 'Behavioral') {
    return `I would answer using STAR: set context, explain actions I took, and finish with measurable outcomes related to: ${questionText}`;
  }

  return `I would start with core concepts, then discuss tradeoffs, implementation steps, and measurable outcomes for: ${questionText}`;
}

function pickKeywords(questionText = '') {
  const dictionary = [
    'architecture',
    'performance',
    'tradeoffs',
    'scalability',
    'testing',
    'security',
    'clarity',
    'impact',
    'metrics',
    'ownership',
  ];

  const lower = questionText.toLowerCase();
  const matched = dictionary.filter((item) => lower.includes(item));

  if (matched.length >= 3) {
    return matched.slice(0, 4);
  }

  return ['clarity', 'tradeoffs', 'impact', 'metrics'];
}

export function evaluateAnswer({ questionId, questionText, type, audioSize = 0 }) {
  const base = seededBase(questionId, audioSize);
  const technical = clampScore(62 + base + (type === 'Technical' ? 8 : 0));
  const clarity = clampScore(58 + (base * 0.8));
  const confidence = clampScore(56 + (base * 0.9));
  const fillerWords = Math.max(3, 20 - Math.floor(confidence / 6));

  const transcript = `Candidate response summary for "${questionText}". The answer covered the main direction with emphasis on practical execution.`;

  return {
    transcript,
    feedback: buildFeedback({ technical, clarity, confidence }, type),
    betterAnswer: buildBetterAnswer(questionText, type),
    keywords: pickKeywords(questionText),
    scores: { technical, clarity, confidence },
    fillerWords,
  };
}

export function summarizeSession(answers) {
  if (!answers.length) {
    return {
      overallScore: 0,
      confidenceScore: 0,
      technicalScore: 0,
      clarityScore: 0,
      strengths: ['Complete at least one answer to generate strengths.'],
      weaknesses: ['No responses were submitted in this session.'],
      improvements: ['Answer each question and use concise structured responses.'],
    };
  }

  const technicalScore = Math.round(
    answers.reduce((sum, item) => sum + item.scores.technical, 0) / answers.length,
  );
  const clarityScore = Math.round(
    answers.reduce((sum, item) => sum + item.scores.clarity, 0) / answers.length,
  );
  const confidenceScore = Math.round(
    answers.reduce((sum, item) => sum + item.scores.confidence, 0) / answers.length,
  );

  const overallScore = Math.round((technicalScore + clarityScore + confidenceScore) / 3);

  const strengths = [];
  const weaknesses = [];

  if (technicalScore >= 75) strengths.push('Strong technical articulation across questions.');
  else weaknesses.push('Technical depth needs stronger examples and implementation detail.');

  if (clarityScore >= 72) strengths.push('Answers were generally well-structured and clear.');
  else weaknesses.push('Answer structure can be improved with a repeatable framework.');

  if (confidenceScore >= 70) strengths.push('Confident verbal delivery and pacing.');
  else weaknesses.push('Work on confidence, pacing, and fewer filler words.');

  if (!strengths.length) strengths.push('Good consistency in showing intent and reasoning.');
  if (!weaknesses.length) weaknesses.push('Continue improving precision and measurable impact statements.');

  const improvements = [
    'Use a consistent response framework (Context -> Action -> Outcome).',
    'Quantify outcomes with concrete metrics in every answer.',
    'Keep introductions short and end with a concise summary sentence.',
  ];

  return {
    overallScore,
    confidenceScore,
    technicalScore,
    clarityScore,
    strengths,
    weaknesses,
    improvements,
  };
}
