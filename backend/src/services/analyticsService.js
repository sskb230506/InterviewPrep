import mongoose from 'mongoose';
import Session from '../models/Session.js';
import Question from '../models/Question.js';
import Answer from '../models/Answer.js';
import Evaluation from '../models/Evaluation.js';
import DSASubmission from '../models/DSASubmission.js';
import ConceptSubmission from '../models/ConceptSubmission.js';

export async function getUserAnalytics(userId) {
    let oid;
    try { oid = new mongoose.Types.ObjectId(userId); } catch { oid = null; }
    const userQuery = oid ? { $or: [{ userId: oid }, { userId: userId }] } : { userId: userId };

    // ── Voice Interview data (existing) ──────────────────────────────────────
    const sessions = await Session.find({ ...userQuery, $or: [{ mode: 'interview' }, { mode: { $exists: false } }] }).lean();
    const sessionIds = sessions.map(s => s._id);
    const questions = await Question.find({ sessionId: { $in: sessionIds } }).lean();
    const questionIds = questions.map(q => q._id);
    const answers = await Answer.find({ questionId: { $in: questionIds } }).lean();
    const answerIds = answers.map(a => a._id);
    const evaluations = await Evaluation.find({ answerId: { $in: answerIds } }).lean();

    let totalScoreTech = 0, totalScoreRelevance = 0, totalScoreDepth = 0, voiceCount = 0;
    const sessionTrend = [];

    for (const session of sessions) {
        let sessionScore = 0, sessionEvals = 0;
        const sessionQs = questions.filter(q => q.sessionId.toString() === session._id.toString());
        for (const q of sessionQs) {
            const qAnswers = answers.filter(a => a.questionId.toString() === q._id.toString());
            for (const a of qAnswers) {
                const aEvals = evaluations.filter(ev => ev.answerId.toString() === a._id.toString());
                for (const ev of aEvals) {
                    totalScoreTech += ev.scoreTech; totalScoreRelevance += ev.scoreRelevance;
                    totalScoreDepth += ev.scoreDepth; voiceCount++;
                    sessionScore += (ev.scoreTech + ev.scoreRelevance + ev.scoreDepth) / 3;
                    sessionEvals++;
                }
            }
        }
        if (sessionEvals > 0) {
            sessionTrend.push({ date: session.createdAt, score: parseFloat((sessionScore / sessionEvals).toFixed(2)), mode: 'interview' });
        }
    }

    // ── DSA Submissions ───────────────────────────────────────────────────────
    const dsaSubs = await DSASubmission.find(userQuery).lean();
    const dsaTotal = dsaSubs.length;
    const dsaPassed = dsaSubs.filter(s => s.passed).length;
    const dsaAvgScore = dsaTotal > 0 ? (dsaSubs.reduce((sum, s) => sum + s.score, 0) / dsaTotal).toFixed(1) : 0;
    const dsaByDifficulty = { Easy: 0, Medium: 0, 'Medium-Hard': 0, Hard: 0 };
    const dsaByDifficultyPassed = { Easy: 0, Medium: 0, 'Medium-Hard': 0, Hard: 0 };
    const dsaTopics = {};
    for (const s of dsaSubs) {
        if (s.difficulty) dsaByDifficulty[s.difficulty] = (dsaByDifficulty[s.difficulty] || 0) + 1;
        if (s.difficulty && s.passed) dsaByDifficultyPassed[s.difficulty] = (dsaByDifficultyPassed[s.difficulty] || 0) + 1;
        if (s.topic) dsaTopics[s.topic] = (dsaTopics[s.topic] || 0) + 1;
    }
    // Add DSA to trend
    for (const s of dsaSubs) {
        sessionTrend.push({ date: s.createdAt, score: s.score, mode: 'dsa' });
    }

    // ── Concept Submissions ────────────────────────────────────────────────────
    const conceptSubs = await ConceptSubmission.find(userQuery).lean();
    const mcqSubs = conceptSubs.filter(s => s.answerMode === 'mcq');
    const voiceSubs = conceptSubs.filter(s => s.answerMode === 'voice');
    const mcqTotal = mcqSubs.length;
    const mcqCorrect = mcqSubs.filter(s => s.isCorrect).length;
    const mcqAccuracy = mcqTotal > 0 ? Math.round((mcqCorrect / mcqTotal) * 100) : 0;
    const conceptTopics = {};
    const conceptTopicCorrect = {};
    for (const s of conceptSubs) {
        if (s.topic) {
            conceptTopics[s.topic] = (conceptTopics[s.topic] || 0) + 1;
            if (s.isCorrect !== false) conceptTopicCorrect[s.topic] = (conceptTopicCorrect[s.topic] || 0) + 1;
        }
    }
    // Add concepts to trend
    for (const s of conceptSubs) {
        sessionTrend.push({ date: s.createdAt, score: s.score, mode: s.answerMode === 'mcq' ? 'mcq' : 'voice-concepts' });
    }

    // ── Time stats ─────────────────────────────────────────────────────────────
    const totalTimeSeconds = [...dsaSubs, ...conceptSubs].reduce((sum, s) => sum + (s.timeUsedSeconds || 0), 0);

    // ── Weak topics (topics where MCQ accuracy < 60%) ──────────────────────────
    const weakTopics = Object.keys(conceptTopics)
        .map(topic => ({
            topic,
            total: conceptTopics[topic],
            correct: conceptTopicCorrect[topic] || 0,
            accuracy: Math.round(((conceptTopicCorrect[topic] || 0) / conceptTopics[topic]) * 100)
        }))
        .filter(t => t.accuracy < 60 && t.total > 1)
        .sort((a, b) => a.accuracy - b.accuracy)
        .slice(0, 5);

    // ── Combined averages (all modes) ──────────────────────────────────────────
    const totalAnswered = voiceCount + dsaTotal + conceptSubs.length;
    const allScores = [...dsaSubs.map(s => s.score), ...conceptSubs.map(s => s.score)];
    const overallAvg = allScores.length > 0 ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1) : null;

    return {
        // ── Overview ──
        totalAnswered,
        totalTimeSeconds,
        overallAvg,
        trend: sessionTrend.sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-20),

        // ── Voice Interview ──
        interview: {
            sessionsCompleted: sessions.length,
            questionsAnswered: voiceCount,
            averages: voiceCount > 0 ? {
                tech: (totalScoreTech / voiceCount).toFixed(1),
                relevance: (totalScoreRelevance / voiceCount).toFixed(1),
                depth: (totalScoreDepth / voiceCount).toFixed(1)
            } : null
        },

        // ── DSA ──
        dsa: {
            totalAttempted: dsaTotal,
            totalPassed: dsaPassed,
            passRate: dsaTotal > 0 ? Math.round((dsaPassed / dsaTotal) * 100) : 0,
            avgScore: parseFloat(dsaAvgScore),
            byDifficulty: dsaByDifficulty,
            byDifficultyPassed: dsaByDifficultyPassed,
            topTopics: Object.entries(dsaTopics).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t, c]) => ({ topic: t, count: c })),
        },

        // ── Concepts ──
        concepts: {
            mcqTotal, mcqCorrect, mcqAccuracy,
            voiceTotal: voiceSubs.length,
            voiceAvgScore: voiceSubs.length > 0 ? (voiceSubs.reduce((s, v) => s + v.score, 0) / voiceSubs.length).toFixed(1) : 0,
            topTopics: Object.entries(conceptTopics).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t, c]) => ({ topic: t, count: c })),
            weakTopics,
        },

        // Legacy fields for backward compat
        sessionsCompleted: sessions.length + dsaSubs.length + conceptSubs.length,
        questionsAnswered: totalAnswered,
        averages: voiceCount > 0 ? {
            tech: (totalScoreTech / voiceCount).toFixed(1),
            relevance: (totalScoreRelevance / voiceCount).toFixed(1),
            depth: (totalScoreDepth / voiceCount).toFixed(1)
        } : (overallAvg ? { tech: overallAvg, relevance: overallAvg, depth: overallAvg } : null),
    };
}
