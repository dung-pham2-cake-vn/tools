import mongoose, { Document, Schema } from 'mongoose';

export interface ISupportTicket extends Document {
  jiraId: string;
  key: string;
  title: string;
  description: string;
  linkedWorkItems: any[];
  hyperlink: string;
  type: string;
  status: string;
  assignee: string;
  priority: string;
  sprint: string;
  created: Date;
  updated: Date;
  comments: any[];
  analyzeNote: string;
}

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    jiraId: { type: String, required: true, unique: true },
    key: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    linkedWorkItems: [{ type: Schema.Types.Mixed }],
    hyperlink: { type: String },
    type: { type: String },
    status: { type: String },
    assignee: { type: String },
    priority: { type: String },
    sprint: { type: String },
    created: { type: Date },
    updated: { type: Date },
    comments: [{ type: Schema.Types.Mixed }],
    analyzeNote: { type: String, default: '' },
  },
  { timestamps: true }
);

export const SupportTicket = mongoose.model<ISupportTicket>('SupportTicket', SupportTicketSchema);
