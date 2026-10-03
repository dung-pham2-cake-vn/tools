import mongoose, { Document, Schema } from 'mongoose';

export interface IAIConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

export interface IAIConversation extends Document {
  title: string;
  /** Ticket Jira đính kèm (PR, PL, PLO, DOP, PKA...) — làm context cho AI. */
  ticketKeys: string[];
  messages: IAIConversationMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const AIConversationMessageSchema = new Schema<IAIConversationMessage>(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const AIConversationSchema = new Schema<IAIConversation>(
  {
    title: { type: String, default: '' },
    ticketKeys: { type: [String], default: [], index: true },
    messages: { type: [AIConversationMessageSchema], default: [] },
  },
  { timestamps: true }
);

export const AIConversation = mongoose.model<IAIConversation>('AIConversation', AIConversationSchema);
