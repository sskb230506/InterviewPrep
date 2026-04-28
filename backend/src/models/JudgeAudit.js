import mongoose from 'mongoose';

const judgeAuditSchema = new mongoose.Schema({
    evaluationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Evaluation', required: true },
    confidenceScore: { type: Number, required: true },
    isValid: { type: Boolean, required: true },
    suggestedRegeneration: { type: Boolean, default: false },
    auditReasoning: { type: String },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.JudgeAudit || mongoose.model('JudgeAudit', judgeAuditSchema);
