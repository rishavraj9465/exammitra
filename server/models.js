import mongoose from "mongoose";
const { Schema, model } = mongoose;
const oid = { type: Schema.Types.ObjectId, required: true, index: true };
export const User = model(
  "User",
  new Schema(
    {
      name: { type: String, required: true },
      email: { type: String, unique: true, required: true },
      password: { type: String, required: true, select: false },
      notesPreference: { type: String, default: "concise" },
    },
    { timestamps: true },
  ),
);
export const Pack = model(
  "Pack",
  new Schema(
    {
      owner: oid,
      title: String,
      subject: String,
      detail: String,
      fileKey: String,
      fileName: String,
      pageCount: Number,
      pages: { type: [{ number: Number, text: String }], select: false },
      sourceData: { type: Buffer, select: false },
      content: Schema.Types.Mixed,
      status: { type: String, default: "queued" },
      error: String,
      deleted: { type: Boolean, default: false },
      lastOpenedAt: Date,
    },
    { timestamps: true },
  ),
);
export const Job = model(
  "Job",
  new Schema(
    {
      pack: { ...oid, unique: true },
      owner: oid,
      status: { type: String, default: "queued" },
      stage: String,
      error: String,
      completedChunks: { type: Number, default: 0 },
      totalChunks: { type: Number, default: 0 },
    },
    { timestamps: true },
  ),
);
export const Attempt = model(
  "Attempt",
  new Schema(
    {
      owner: oid,
      pack: oid,
      answers: { type: [Number], default: [] },
      completed: { type: Boolean, default: false },
      score: Number,
      missedTopics: [String],
    },
    { timestamps: true },
  ),
);
Attempt.schema.index(
  { owner: 1, pack: 1 },
  { unique: true, partialFilterExpression: { completed: false } },
);
export const CardProgress = model(
  "CardProgress",
  new Schema(
    {
      owner: oid,
      pack: oid,
      card: Number,
      state: String,
      reviews: { type: Number, default: 0 },
    },
    { timestamps: true },
  ),
);
CardProgress.schema.index({ owner: 1, pack: 1, card: 1 }, { unique: true });
export const Conversation = model(
  "Conversation",
  new Schema(
    {
      owner: oid,
      pack: oid,
      question: String,
      answer: String,
      pages: [Number],
      kind: String,
    },
    { timestamps: true },
  ),
);
