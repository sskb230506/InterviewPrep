import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    jobRole: { type: String, required: true },
    jdText: { type: String },
    resumeText: { type: String },
    skillsMatch: { type: mongoose.Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now }
});

// We can define virtuals or handle cascades manually if needed later.
export default mongoose.models.Session || mongoose.model('Session', sessionSchema);
