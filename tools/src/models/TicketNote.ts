import mongoose, { Document, Schema } from 'mongoose';

export interface ITicketNote extends Document {
  /** Ticket Jira bất kỳ (PR, PL, PLO, DOP, PKA...). Note chỉ lưu ở tool, không ghi lên Jira. */
  ticketKey: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const TicketNoteSchema = new Schema<ITicketNote>(
  {
    ticketKey: { type: String, required: true, unique: true },
    content: { type: String, default: '' },
  },
  { timestamps: true }
);

export const TicketNote = mongoose.model<ITicketNote>('TicketNote', TicketNoteSchema);
