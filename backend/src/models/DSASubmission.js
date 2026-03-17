import mongoose from 'mongoose';

// Tracks every DSA problem a user submits (per session)
const dsaSubmissionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sessionId: { type: String },
    problemTitle: { type: String, required: true },
    company: { type: String },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Medium-Hard', 'Hard'] },
    language: { type: String },
    topic: { type: String },
    passed: { type: Boolean, default: false },
    passedCount: { type: Number, default: 0 },
    totalCount: { type: Number, default: 0 },
    score: { type: Number, default: 0 },   // 0–10
    timeUsedSeconds: { type: Number, default: 0 }, // actual time taken
    timeLimitSeconds: { type: Number, default: 0 }, // allotted time
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.DSASubmission || mongoose.model('DSASubmission', dsaSubmissionSchema);
