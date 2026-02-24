import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
    text: { type: String, required: true },
    difficulty: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Question || mongoose.model('Question', questionSchema);
