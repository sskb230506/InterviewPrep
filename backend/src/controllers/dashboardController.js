import { InterviewSession } from '../models/InterviewSession.js';
import { formatDateYYYYMMDD } from '../utils/date.js';
import { deriveWeakestArea } from '../services/analyticsService.js';

export async function getDashboard(req, res) {
  const sessions = await InterviewSession.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const completed = sessions.filter((session) => session.status === 'completed');

  const averageScore = completed.length
    ? Math.round(
        completed.reduce((sum, item) => sum + (item.result?.overallScore || 0), 0) /
          completed.length,
      )
    : 0;

  const aggregateSummary = completed.length
    ? {
        technicalScore: Math.round(
          completed.reduce((sum, item) => sum + (item.result?.technicalScore || 0), 0) /
            completed.length,
        ),
        clarityScore: Math.round(
          completed.reduce((sum, item) => sum + (item.result?.clarityScore || 0), 0) /
            completed.length,
        ),
        confidenceScore: Math.round(
          completed.reduce((sum, item) => sum + (item.result?.confidenceScore || 0), 0) /
            completed.length,
        ),
      }
    : { technicalScore: 0, clarityScore: 0, confidenceScore: 0 };

  const recent = completed.slice(0, 4).reverse();

  res.json({
    profileSummary: {
      completedInterviews: completed.length,
      averageScore,
      weakestArea: deriveWeakestArea(aggregateSummary),
      resumeUploaded: Boolean(req.user.resume?.fileName),
    },
    sessions: completed.slice(0, 10).map((session) => ({
      id: session._id,
      role: session.role,
      score: session.result?.overallScore || 0,
      confidence: session.result?.confidenceScore || 0,
      date: formatDateYYYYMMDD(session.createdAt),
    })),
    scoreTrend:
      recent.length > 0
        ? recent.map((session, index) => ({
            label: `Week ${index + 1}`,
            score: session.result?.overallScore || 0,
            confidence: session.result?.confidenceScore || 0,
          }))
        : [
            { label: 'Week 1', score: 0, confidence: 0 },
            { label: 'Week 2', score: 0, confidence: 0 },
          ],
  });
}
