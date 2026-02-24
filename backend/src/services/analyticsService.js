import mongoose from 'mongoose';
import Session from '../models/Session.js';
import Question from '../models/Question.js';
import Answer from '../models/Answer.js';
import Evaluation from '../models/Evaluation.js';

/**
 * Generates an analytics summary for a given logical user.
 * @param {string} userId
 */
export async function getUserAnalytics(userId) {
    // Build a query that matches sessions where userId is the string OR the ObjectId equivalent
    let sessionQuery;
    try {
        const oid = new mongoose.Types.ObjectId(userId);
        // Match either the ObjectId or the string version (handles old and new sessions)
        sessionQuery = { $or: [{ userId: oid }, { userId: userId }] };
    } catch {
        sessionQuery = { userId: userId };
    }
    const sessions = await Session.find(sessionQuery).lean();

    if (!sessions || sessions.length === 0) {
        return {
            message: "No interview data available yet.",
            trend: [],
            averages: null
        };
    }

    // Rather than multiple aggregations, fetch related items
    const sessionIds = sessions.map(s => s._id);
    const questions = await Question.find({ sessionId: { $in: sessionIds } }).lean();

    const questionIds = questions.map(q => q._id);
    const answers = await Answer.find({ questionId: { $in: questionIds } }).lean();

    const answerIds = answers.map(a => a._id);
    const evaluations = await Evaluation.find({ answerId: { $in: answerIds } }).lean();

    let totalScoreTech = 0;
    let totalScoreRelevance = 0;
    let totalScoreDepth = 0;
    let count = 0;

    const trend = [];

    for (const session of sessions) {
        let sessionScore = 0;
        let sessionEvals = 0;

        const sessionQs = questions.filter(q => q.sessionId.toString() === session._id.toString());
        for (const q of sessionQs) {
            const qsAs = answers.filter(a => a.questionId.toString() === q._id.toString());
            for (const a of qsAs) {
                const asEv = evaluations.filter(ev => ev.answerId.toString() === a._id.toString());
                for (const ev of asEv) {
                    totalScoreTech += ev.scoreTech;
                    totalScoreRelevance += ev.scoreRelevance;
                    totalScoreDepth += ev.scoreDepth;
                    count++;

                    sessionScore += (ev.scoreTech + ev.scoreRelevance + ev.scoreDepth) / 3;
                    sessionEvals++;
                }
            }
        }

        if (sessionEvals > 0) {
            trend.push({
                date: session.createdAt,
                score: parseFloat((sessionScore / sessionEvals).toFixed(2))
            });
        }
    }

    return {
        sessionsCompleted: sessions.length,
        questionsAnswered: count,
        averages: count > 0 ? {
            tech: (totalScoreTech / count).toFixed(1),
            relevance: (totalScoreRelevance / count).toFixed(1),
            depth: (totalScoreDepth / count).toFixed(1)
        } : null,
        trend: trend.sort((a, b) => new Date(a.date) - new Date(b.date))
    };
}
