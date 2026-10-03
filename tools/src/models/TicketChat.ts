import mongoose, { Document, Schema } from 'mongoose';

export interface ITicketChatMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

export interface ITicketChat extends Document {
  /** Một thread cho mỗi ticket Product Roadmap. */
  ideaKey: string;
  messages: ITicketChatMessage[];
}

const TicketChatMessageSchema = new Schema<ITicketChatMessage>(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const TicketChatSchema = new Schema<ITicketChat>(
  {
    ideaKey: { type: String, required: true, unique: true },
    messages: { type: [TicketChatMessageSchema], default: [] },
  },
  { timestamps: true }
);

export const TicketChat = mongoose.model<ITicketChat>('TicketChat', TicketChatSchema);
