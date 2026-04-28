import mongoose from 'mongoose';

// Tracks every Core Concepts question answered (MCQ or Voice)
const conceptSubmissionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sessionId: { type: String },
    topic: { type: String, required: true },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'] },
    answerMode: { type: String, enum: ['mcq', 'voice'] },
    isCorrect: { type: Boolean },       // MCQ only
    score: { type: Number, default: 0 }, // 0–10
    timeUsedSeconds: { type: Number, default: 0 },
    timeLimitSeconds: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.ConceptSubmission || mongoose.model('ConceptSubmission', conceptSubmissionSchema);
