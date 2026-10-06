import mongoose, { Document, Schema } from 'mongoose';
import { ISvkComment, ILinkedPl, CommentSchema, LinkedPlSchema } from './SvkTicket';

/**
 * Append-only log of every SVK ticket ever pulled from Jira.
 * `SvkTicket` is rebuilt on each scan (tickets leaving the JQL are deleted), so the
 * history keeps the last known snapshot of a ticket even after it drops out.
 * A re-load overwrites the snapshot in place — one document per SVK key.
 */
export interface ISvkHistory extends Document {
  jiraId: string;
  key: string;
  summary: string;
  status: string;
  priority: string;
  created: string;
  updated: string;
  hyperlink: string;
  description: string;
  descriptionAdf: any;
  comments: ISvkComment[];
  linkedPlKeys: string[];
  linkedPl: ILinkedPl[];
  aiResult: string;
  aiError: string;
  aiRunAt?: Date;
  /** first time this ticket was ever loaded */
  firstLoadedAt: Date;
  /** most recent load — snapshot above is from this run */
  lastLoadedAt: Date;
  loadCount: number;
}

const SvkHistorySchema = new Schema<ISvkHistory>(
  {
    jiraId: { type: String, default: '' },
    key: { type: String, required: true, unique: true },
    summary: { type: String, default: '' },
    status: { type: String, default: '' },
    priority: { type: String, default: '' },
    created: { type: String, default: '' },
    updated: { type: String, default: '' },
    hyperlink: { type: String, default: '' },
    description: { type: String, default: '' },
    descriptionAdf: { type: Schema.Types.Mixed },
    comments: { type: [CommentSchema], default: [] },
    linkedPlKeys: { type: [String], default: [] },
    linkedPl: { type: [LinkedPlSchema], default: [] },
    aiResult: { type: String, default: '' },
    aiError: { type: String, default: '' },
    aiRunAt: { type: Date },
    firstLoadedAt: { type: Date, default: Date.now },
    lastLoadedAt: { type: Date, default: Date.now },
    loadCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

SvkHistorySchema.index({ lastLoadedAt: -1 });

export const SvkHistory = mongoose.model<ISvkHistory>('SvkHistory', SvkHistorySchema);
