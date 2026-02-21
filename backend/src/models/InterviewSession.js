import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    type: { type: String, enum: ['Technical', 'Behavioral', 'Mixed'], required: true },
  },
  { _id: false },
);

const scoreSchema = new mongoose.Schema(
  {
    technical: { type: Number, required: true },
    clarity: { type: Number, required: true },
    confidence: { type: Number, required: true },
  },
  { _id: false },
);

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    question: { type: String, required: true },
    type: { type: String, enum: ['Technical', 'Behavioral', 'Mixed'], required: true },
    transcript: { type: String, default: '' },
    feedback: { type: [String], default: [] },
    betterAnswer: { type: String, default: '' },
    keywords: { type: [String], default: [] },
    scores: { type: scoreSchema, required: true },
    fillerWords: { type: Number, default: 0 },
    audio: {
      fileName: { type: String },
      mimeType: { type: String },
      size: { type: Number },
      path: { type: String },
    },
    answeredAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const resultSchema = new mongoose.Schema(
  {
    overallScore: { type: Number },
    confidenceScore: { type: Number },
    technicalScore: { type: Number },
    clarityScore: { type: Number },
    strengths: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    improvements: { type: [String], default: [] },
  },
  { _id: false },
);

const interviewSessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, required: true },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
    interviewType: {
      type: String,
      enum: ['Technical', 'Behavioral', 'Mixed'],
      required: true,
    },
    status: { type: String, enum: ['active', 'completed'], default: 'active', index: true },
    questions: { type: [questionSchema], default: [] },
    answers: { type: [answerSchema], default: [] },
    result: { type: resultSchema, default: () => ({}) },
    endedAt: { type: Date },
  },
  {
    timestamps: true,
  },
);

export const InterviewSession = mongoose.model('InterviewSession', interviewSessionSchema);
