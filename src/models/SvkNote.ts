import mongoose, { Document, Schema } from 'mongoose';

export interface ISvkNote extends Document {
  key: string;
  note: string;
}

const SvkNoteSchema = new Schema<ISvkNote>(
  {
    key: { type: String, required: true, unique: true },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

export const SvkNote = mongoose.model<ISvkNote>('SvkNote', SvkNoteSchema);
