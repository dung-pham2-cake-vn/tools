import mongoose, { Document, Schema } from 'mongoose';

export interface ITicketBrd extends Document {
  /** Ticket Product Roadmap (PR-xxxx) mà BRD này thuộc về. */
  ideaKey: string;
  sourceUrl: string;
  filename: string;
  /** PDF do Word xuất ra — giữ nguyên để tải lại. */
  pdf: Buffer;
  pdfSize: number;
  /** Text lấy thẳng từ Word, dùng làm context cho AI. */
  text: string;
  /** 'word' = PDF do Word xuất (đúng layout), 'fallback' = PDF text-only tự dựng. */
  converter: string;
  /** Tóm tắt/phân tích gần nhất của AI cho BRD này. */
  analysis: string;
  analysisRunAt?: Date;
  importedAt: Date;
}

const TicketBrdSchema = new Schema<ITicketBrd>(
  {
    ideaKey: { type: String, required: true, index: true },
    sourceUrl: { type: String, default: '' },
    filename: { type: String, default: '' },
    pdf: { type: Buffer },
    pdfSize: { type: Number, default: 0 },
    text: { type: String, default: '' },
    converter: { type: String, default: '' },
    analysis: { type: String, default: '' },
    analysisRunAt: { type: Date },
    importedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const TicketBrd = mongoose.model<ITicketBrd>('TicketBrd', TicketBrdSchema);
