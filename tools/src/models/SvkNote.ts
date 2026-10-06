import mongoose, { Document, Schema } from 'mongoose';

export interface ISvkNote extends Document {
  key: string;
  note: string;
  /** Câu trả lời cuối của hội thoại Chat AI gắn với SVK này — tách khỏi note gõ tay. */
  aiNote: string;
  aiNoteAt?: Date;
  aiNoteError: string;
}

const SvkNoteSchema = new Schema<ISvkNote>(
  {
    key: { type: String, required: true, unique: true },
    note: { type: String, default: '' },
    aiNote: { type: String, default: '' },
    aiNoteAt: { type: Date },
    aiNoteError: { type: String, default: '' },
  },
  { timestamps: true }
);

export const SvkNote = mongoose.model<ISvkNote>('SvkNote', SvkNoteSchema);
