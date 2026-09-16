// Logic tuổi ticket + mức khẩn (màu) của SVK — dùng chung cho trang Support và Dashboard.

export function workingDaysSince(createdIso: string): number {
  if (!createdIso) return 0;
  const start = new Date(createdIso);
  const today = new Date();
  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  if (start > today) return 0;
  let count = 0;
  const cursor = new Date(start);
  while (cursor <= today) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

export type Urgency = '🔴' | '🟢' | '🟡';

export interface SvkComment {
  id: string;
  author: string;
  body: string;
  bodyAdf?: any;
  created: string;
  updated: string;
}

export interface LinkedPl {
  key: string;
  summary: string;
  status: string;
  assignee: string;
  sprint: string;
  created: string;
  description: string;
  descriptionAdf?: any;
  comments: SvkComment[];
}

export interface SvkTicketDoc {
  _id: string;
  key: string;
  summary: string;
  status: string;
  priority: string;
  created: string;
  updated: string;
  hyperlink: string;
  description: string;
  descriptionAdf?: any;
  comments: SvkComment[];
  linkedPlKeys: string[];
  linkedPl: LinkedPl[];
  aiResult: string;
  aiError: string;
  aiRunAt?: string;
  lastScanAt?: string;
}

export function commentsText(comments: SvkComment[]): string {
  return (comments || []).map((c) => c.body || '').join(' ');
}

export function calcSvkUrgency(doc: SvkTicketDoc, workingDays: number): Urgency {
  const title = (doc.summary || '').toLowerCase();
  const allText = [commentsText(doc.comments), ...(doc.linkedPl || []).map((pl) => commentsText(pl.comments))].join(' ');

  const reducedPriority = /giảm.*ưu tiên|không.*khẩn|không.*gấp|low priority|hạ.*ưu tiên/i.test(allText);
  const hasMerge = /đã merge|has been merged|merged|hotfix.*deploy|đã deploy|deploy.*done/i.test(allText);
  const hasVerify = /đã verify|verified|verify.*xong|confirm.*fix|đã confirm/i.test(allText);
  if (hasMerge && !hasVerify) return '🟢';

  if (!reducedPriority) {
    if (workingDays >= 5) return '🔴';
    if (/gấp|urgent|ảnh hưởng nhiều|nhiều kh\b|nhiều khách|dpd.*tăng|tăng.*dpd|cần xử lý gấp/i.test(title)) return '🔴';
  }

  return '🟡';
}

export function checkIsRecurrence(linkedPl: LinkedPl[]): boolean {
  if (!linkedPl || linkedPl.length < 2) return false;
  const CLOSED_TERMS = ['done', 'invalid', 'test passed', 'closed', 'cancelled'];
  const isClosed = (pl: LinkedPl) => CLOSED_TERMS.some((t) => (pl.status || '').toLowerCase().includes(t));
  return linkedPl.some(isClosed) && linkedPl.some((pl) => !isClosed(pl));
}

export interface SvkRow {
  doc: SvkTicketDoc;
  workingDays: number;
  plWorkingDays: number;
  urgency: Urgency;
  isRecurrence: boolean;
}

export function buildRows(docs: SvkTicketDoc[]): SvkRow[] {
  return docs
    .map((doc) => {
      const workingDays = workingDaysSince(doc.created);
      const plWorkingDays = (doc.linkedPl || []).reduce(
        (max, pl) => Math.max(max, workingDaysSince(pl.created)),
        0
      );
      return {
        doc,
        workingDays,
        plWorkingDays,
        urgency: calcSvkUrgency(doc, workingDays),
        isRecurrence: checkIsRecurrence(doc.linkedPl),
      };
    })
    .sort((a, b) => b.plWorkingDays - a.plWorkingDays || b.workingDays - a.workingDays);
}

