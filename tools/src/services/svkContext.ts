import { SvkTicket, ISvkComment } from '../models/SvkTicket';
import { SvkHistory } from '../models/SvkHistory';

const formatComments = (comments: ISvkComment[] = []) =>
  comments.length
    ? comments
        .map((c) => `[${c.author} — ${c.created ? new Date(c.created).toLocaleString('vi-VN') : '?'}]\n${c.body || '(trống)'}`)
        .join('\n\n')
    : '(không có comment)';

/**
 * Context SVK dựng từ dữ liệu đã quét (kèm PL liên quan và comment đầy đủ),
 * khỏi gọi lại Jira. Không có bản lưu thì trả null để caller tự đọc Jira.
 */
export const buildSvkContext = async (key: string): Promise<string | null> => {
  const doc: any =
    (await SvkTicket.findOne({ key }).lean()) || (await SvkHistory.findOne({ key }).lean());
  if (!doc) return null;

  const pls = (doc.linkedPl || []).map(
    (pl: any) => [
      `## PL liên quan: ${pl.key} — ${pl.summary}`,
      `Trạng thái: ${pl.status || '?'} | Assignee: ${pl.assignee || 'chưa gán'} | Sprint: ${pl.sprint || '—'}`,
      '',
      pl.description || '(trống)',
      '',
      'Comment:',
      formatComments(pl.comments),
    ].join('\n')
  );

  return [
    `# Ticket ${doc.key} (SVK — ticket hỗ trợ vận hành)`,
    `Summary: ${doc.summary || ''}`,
    `Trạng thái: ${doc.status || '?'} | Ưu tiên: ${doc.priority || '?'} | Tạo: ${doc.created || '?'} | Cập nhật: ${doc.updated || '?'}`,
    `PL liên quan: ${(doc.linkedPlKeys || []).join(', ') || 'chưa có'}`,
    '',
    '## Mô tả',
    doc.description || '(trống)',
    '',
    '## Comment',
    formatComments(doc.comments),
    ...(pls.length ? ['', ...pls] : []),
  ].join('\n');
};
