import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    jobRole: { type: String, required: true },
    jdText: { type: String },
    resumeText: { type: String },
    skillsMatch: { type: mongoose.Schema.Types.Mixed },
    // New fields
    yoe: { type: Number, default: 0 },  // years of experience
    mode: { type: String, enum: ['interview', 'concepts', 'dsa'], default: 'interview' },
    conceptsConfig: {
        topic: { type: String },
        difficulty: { type: String },
        answerMode: { type: String, enum: ['mcq', 'voice'], default: 'mcq' }
    },
    dsaConfig: {
        company: { type: String },
        language: { type: String },
        topic: { type: String }
    },
    createdAt: { type: Date, default: Date.now }
});

// We can define virtuals or handle cascades manually if needed later.
export default mongoose.models.Session || mongoose.model('Session', sessionSchema);
