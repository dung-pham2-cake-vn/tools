import mongoose, { Document, Schema } from 'mongoose';

export interface ISvkComment {
  id: string;
  author: string;
  body: string;
  bodyAdf: any;
  created: string;
  updated: string;
}

export interface IAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface ILinkedPl {
  key: string;
  summary: string;
  status: string;
  assignee: string;
  sprint: string;
  created: string;
  description: string;
  descriptionAdf: any;
  comments: ISvkComment[];
  attachments: IAttachment[];
}

export interface ISvkTicket extends Document {
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
  attachments: IAttachment[];
  /** hash of SVK + PL content/comments — AI re-runs only when this changes */
  aiInputHash: string;
  aiResult: string;
  aiError: string;
  aiRunAt?: Date;
  /** id comment AI đã đăng lên ticket — lần chạy sau sửa lại chính comment này */
  aiCommentId?: string;
  lastScanAt?: Date;
}

export const CommentSchema = new Schema<ISvkComment>(
  {
    id: { type: String },
    author: { type: String, default: '' },
    body: { type: String, default: '' },
    bodyAdf: { type: Schema.Types.Mixed },
    created: { type: String, default: '' },
    updated: { type: String, default: '' },
  },
  { _id: false }
);

export const AttachmentSchema = new Schema<IAttachment>(
  {
    id: { type: String, default: '' },
    filename: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    size: { type: Number, default: 0 },
  },
  { _id: false }
);

export const LinkedPlSchema = new Schema<ILinkedPl>(
  {
    key: { type: String, required: true },
    summary: { type: String, default: '' },
    status: { type: String, default: '' },
    assignee: { type: String, default: '' },
    sprint: { type: String, default: '' },
    created: { type: String, default: '' },
    description: { type: String, default: '' },
    descriptionAdf: { type: Schema.Types.Mixed },
    comments: { type: [CommentSchema], default: [] },
    attachments: { type: [AttachmentSchema], default: [] },
  },
  { _id: false }
);

const SvkTicketSchema = new Schema<ISvkTicket>(
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
    attachments: { type: [AttachmentSchema], default: [] },
    linkedPlKeys: { type: [String], default: [] },
    linkedPl: { type: [LinkedPlSchema], default: [] },
    aiInputHash: { type: String, default: '' },
    aiResult: { type: String, default: '' },
    aiError: { type: String, default: '' },
    aiRunAt: { type: Date },
    aiCommentId: { type: String, default: '' },
    lastScanAt: { type: Date },
  },
  { timestamps: true }
);

export const SvkTicket = mongoose.model<ISvkTicket>('SvkTicket', SvkTicketSchema);
