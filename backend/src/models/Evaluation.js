import mongoose from 'mongoose';

const evaluationSchema = new mongoose.Schema({
    answerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Answer', required: true },
    scoreTech: { type: Number, required: true },
    scoreRelevance: { type: Number, required: true },
    scoreDepth: { type: Number, required: true },
    scoreClarity: { type: Number, required: true },
    scoreStructure: { type: Number, required: true },
    scoreConfidence: { type: Number, default: 0 },
    generalFeedback: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Evaluation || mongoose.model('Evaluation', evaluationSchema);
