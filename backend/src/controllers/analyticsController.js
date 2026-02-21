import { InterviewSession } from '../models/InterviewSession.js';
import { buildScoreTrend, buildWeakTopicHeatmap } from '../services/analyticsService.js';

export async function getAnalytics(req, res) {
  const sessions = await InterviewSession.find({ user: req.user._id })
    .sort({ createdAt: 1 })
    .lean();

  const scoreTrend = buildScoreTrend(sessions);

  res.json({
    scoreTrend:
      scoreTrend.length > 0
        ? scoreTrend
        : [
            { label: 'Jan 2026', score: 0, confidence: 0, fillerWords: 0 },
            { label: 'Feb 2026', score: 0, confidence: 0, fillerWords: 0 },
          ],
    weakTopicHeatmap: buildWeakTopicHeatmap(sessions),
  });
}
