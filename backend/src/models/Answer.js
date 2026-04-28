import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema({
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    audioUrl: { type: String },
    transcript: { type: String },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Answer || mongoose.model('Answer', answerSchema);
