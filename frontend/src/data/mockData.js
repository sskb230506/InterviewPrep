export const mockUser = {
  id: 'u_1',
  name: 'Krishna Subhash',
  email: 'krishna@example.com',
  hasResume: true,
  defaultRole: 'Frontend Engineer',
};

export const mockDashboard = {
  profileSummary: {
    completedInterviews: 7,
    averageScore: 74,
    weakestArea: 'System design articulation',
    resumeUploaded: true,
  },
  sessions: [
    { id: 's_1001', role: 'Frontend Engineer', score: 78, date: '2026-02-10', confidence: 71 },
    { id: 's_1002', role: 'Frontend Engineer', score: 72, date: '2026-02-14', confidence: 68 },
    { id: 's_1003', role: 'Full Stack Engineer', score: 81, date: '2026-02-18', confidence: 75 },
  ],
  scoreTrend: [
    { label: 'Week 1', score: 62, confidence: 58 },
    { label: 'Week 2', score: 67, confidence: 61 },
    { label: 'Week 3', score: 71, confidence: 66 },
    { label: 'Week 4', score: 74, confidence: 70 },
  ],
};

export const mockExtractedSkills = [
  'React',
  'TypeScript',
  'Node.js',
  'REST APIs',
  'Testing Library',
];

export const mockQuestionBank = [
  {
    id: 'q_1',
    type: 'Technical',
    text: 'Explain how React reconciliation works and why keys matter in lists.',
  },
  {
    id: 'q_2',
    type: 'Technical',
    text: 'How would you optimize an application with slow initial paint and large bundles?',
  },
  {
    id: 'q_3',
    type: 'Behavioral',
    text: 'Tell me about a time you handled disagreement in a code review.',
  },
];

export const mockResults = {
  overallScore: 76,
  confidenceScore: 72,
  technicalScore: 79,
  clarityScore: 70,
  strengths: ['Strong technical depth', 'Good structuring of answers', 'Clear examples from projects'],
  weaknesses: ['Occasional filler words', 'Answer conclusions were sometimes abrupt'],
  improvements: [
    'Use a repeatable answer pattern (Context -> Action -> Outcome).',
    'Slow down when transitioning between points.',
    'Quantify impact with metrics wherever possible.',
  ],
  perQuestion: [
    {
      id: 'q_1',
      question: 'Explain how React reconciliation works and why keys matter in lists.',
      transcript: 'Reconciliation compares virtual DOM trees and updates only changed nodes...',
      feedback: [
        'Good explanation of diffing basics.',
        'Could mention stable keys preventing unnecessary remounting.',
      ],
      betterAnswer:
        'React compares previous and next virtual trees. Stable keys help map list items correctly, minimizing remounts and preserving local component state.',
      scores: { technical: 82, clarity: 73, confidence: 75 },
      keywords: ['virtual DOM', 'diffing', 'keys', 'component state'],
    },
    {
      id: 'q_2',
      question: 'How would you optimize an application with slow initial paint and large bundles?',
      transcript: 'I would inspect bundle sizes and split code by routes, lazy load heavy components...',
      feedback: [
        'Strong practical strategy.',
        'Could include runtime performance metrics to monitor results.',
      ],
      betterAnswer:
        'Start with profiling and bundle analysis. Apply route-based splitting, lazy loading, critical CSS, and preloading for high-priority assets. Track LCP and TTI improvements after each change.',
      scores: { technical: 81, clarity: 78, confidence: 72 },
      keywords: ['code splitting', 'lazy loading', 'LCP', 'TTI'],
    },
    {
      id: 'q_3',
      question: 'Tell me about a time you handled disagreement in a code review.',
      transcript: 'A teammate disagreed about architecture, so I proposed benchmark criteria and we tested both ideas...',
      feedback: ['Great conflict-resolution framing.', 'Tighten the ending with clearer impact metrics.'],
      betterAnswer:
        'I aligned on shared goals, defined objective criteria, tested both approaches, and selected the one that reduced latency by 18 percent with lower maintenance overhead.',
      scores: { technical: 74, clarity: 68, confidence: 69 },
      keywords: ['alignment', 'criteria', 'benchmark', 'impact'],
    },
  ],
};

export const mockAnalytics = {
  scoreTrend: [
    { label: 'Jan', score: 65, confidence: 60, fillerWords: 18 },
    { label: 'Feb', score: 69, confidence: 63, fillerWords: 15 },
    { label: 'Mar', score: 72, confidence: 67, fillerWords: 13 },
    { label: 'Apr', score: 75, confidence: 70, fillerWords: 11 },
    { label: 'May', score: 77, confidence: 72, fillerWords: 9 },
  ],
  weakTopicHeatmap: [
    { topic: 'System Design', value: 4 },
    { topic: 'Behavioral Storytelling', value: 3 },
    { topic: 'API Security', value: 2 },
    { topic: 'Testing Strategy', value: 2 },
    { topic: 'Scalability Tradeoffs', value: 4 },
  ],
};
