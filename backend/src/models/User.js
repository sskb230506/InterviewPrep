import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema(
  {
    resumeId: { type: String },
    fileName: { type: String },
    filePath: { type: String },
    fileUrl: { type: String },
    storageKey: { type: String },
    storageProvider: { type: String },
    status: {
      type: String,
      enum: ['idle', 'uploading', 'parsing', 'parsed', 'failed'],
      default: 'idle',
    },
    skills: { type: [String], default: [] },
    uploadedAt: { type: Date },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    defaultRole: { type: String, default: 'Frontend Engineer' },
    resume: { type: resumeSchema, default: () => ({}) },
  },
  {
    timestamps: true,
  },
);

export const User = mongoose.model('User', userSchema);
