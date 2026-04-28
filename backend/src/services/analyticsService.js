import { monthLabel } from '../utils/date.js';

export function buildScoreTrend(sessions) {
  const completed = sessions.filter((session) => session.status === 'completed');
  const sorted = [...completed].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const recent = sorted.slice(-5);

  return recent.map((session) => {
    const scores = session.result || {};
    const answers = (session.answers || []).filter((answer) => answer.status === 'completed');
    const fillerWordsAvg = answers.length
      ? Math.round(answers.reduce((sum, item) => sum + (item.fillerWords || 0), 0) / answers.length)
      : 0;

    return {
      label: monthLabel(session.createdAt),
      score: scores.overallScore || 0,
      confidence: scores.confidenceScore || 0,
      fillerWords: fillerWordsAvg,
    };
  });
}

export function buildWeakTopicHeatmap(sessions) {
  const answers = sessions.flatMap((session) =>
    (session.answers || []).filter((answer) => answer.status === 'completed'),
  );

  const buckets = {
    'System Design': [],
    'Behavioral Storytelling': [],
    'API Security': [],
    'Testing Strategy': [],
    'Scalability Tradeoffs': [],
  };

  for (const answer of answers) {
    if (answer.type === 'Behavioral') {
      buckets['Behavioral Storytelling'].push(answer.scores.clarity);
    }

    buckets['System Design'].push(answer.scores.technical);
    buckets['Testing Strategy'].push(answer.scores.technical - 5);
    buckets['API Security'].push(answer.scores.technical - 8);
    buckets['Scalability Tradeoffs'].push(answer.scores.technical - 3);
  }

  return Object.entries(buckets).map(([topic, values]) => {
    if (!values.length) {
      return { topic, value: 3 };
    }

    const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
    let risk = 5 - Math.round(avg / 20);
    risk = Math.max(1, Math.min(5, risk));

    return { topic, value: risk };
  });
}

export function deriveWeakestArea(summary = {}) {
  const pairs = [
    ['Technical depth', summary.technicalScore ?? 0],
    ['Clarity', summary.clarityScore ?? 0],
    ['Confidence', summary.confidenceScore ?? 0],
  ];

  pairs.sort((a, b) => a[1] - b[1]);
  return pairs[0][0];
}
