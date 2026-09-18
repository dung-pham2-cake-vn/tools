import { scanSvkTickets, waitForAiIdle, getAiJobState, ScanResult } from './SvkService';
import { SvkTicket } from '../models/SvkTicket';
import { SvkNote } from '../models/SvkNote';
import { sendTelegram, escapeHtml, isTelegramConfigured } from './TelegramService';

/**
 * Periodic SVK rescan. The scan itself is cheap to repeat: tickets are upserted by key
 * and the AI review only re-runs when a ticket's content hash changes, so an unchanged
 * ticket costs nothing beyond the Jira read.
 *
 * SVK_AUTO_SCAN_HOURS=0 disables it; default is every 4 hours.
 */
const HOURS = Number(process.env.SVK_AUTO_SCAN_HOURS ?? 4);
const RUN_ON_BOOT = process.env.SVK_AUTO_SCAN_ON_BOOT === 'true';
/** Report every run, or stay quiet when nothing changed. */
const NOTIFY_WHEN_EMPTY = process.env.SVK_NOTIFY_WHEN_EMPTY === 'true';

const vnTime = (d: Date) =>
  d.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false });

/** Ngày tuổi tính theo ngày làm việc, khớp với cột trên trang Support. */
function workingDaysSince(createdIso: string): number {
  if (!createdIso) return 0;
  const start = new Date(new Date(createdIso).getTime() + 7 * 60 * 60 * 1000);
  const today = new Date(Date.now() + 7 * 60 * 60 * 1000);
  start.setUTCHours(0, 0, 0, 0);
  today.setUTCHours(0, 0, 0, 0);
  if (start > today) return 0;

  let count = 0;
  const cursor = new Date(start);
  while (cursor <= today) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) count++;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

async function buildReport(
  trigger: string,
  total: number,
  changedKeys: string[],
  seconds: number,
  aiDrained: boolean,
  aiUnavailableReason: string
): Promise<string> {
  const ai = getAiJobState();
  const aiLine = aiUnavailableReason
    ? `🚫 AI bỏ qua — ${escapeHtml(aiUnavailableReason)}`
    : `AI: ${ai.done} xong, ${ai.failed} lỗi${ai.skipped ? `, ${ai.skipped} bỏ qua` : ''}${
        aiDrained ? '' : ', <i>còn đang chạy (timeout chờ)</i>'
      }`;
  const head = [
    `🔍 <b>SVK scan</b> — ${escapeHtml(vnTime(new Date()))} (${escapeHtml(trigger)})`,
    `Tổng ticket đang mở: <b>${total}</b> | Mới/đổi nội dung: <b>${changedKeys.length}</b> | ${seconds}s`,
    aiLine,
  ].join('\n');

  if (!changedKeys.length) return head;

  const docs = await SvkTicket.find({ key: { $in: changedKeys } })
    .select('key created linkedPlKeys')
    .sort({ created: 1 })
    .lean();

  const noteDocs = await SvkNote.find({ key: { $in: changedKeys } }).select('key note').lean();
  const notes = new Map(noteDocs.map((n) => [n.key, (n.note || '').replace(/\s+/g, ' ').trim()]));

  // một dòng mỗi ticket: SVK x PL · ngày tuổi · note (lỗi AI đã có ở dòng tổng, không lặp lại)
  const lines = docs.map((d) => {
    const pl = (d.linkedPlKeys || []).join(', ') || 'chưa có PL';
    const parts = [`${d.key} x ${pl}`, `${workingDaysSince(d.created)}d`];
    const note = notes.get(d.key);
    if (note) parts.push(note);
    return escapeHtml(parts.join(' · '));
  });

  return `${head}\n\n${lines.join('\n')}`;
}

/**
 * Wait for the AI queue this scan filled, then report to Telegram. Runs detached from the
 * HTTP request that triggered a manual scan — the wait can take minutes.
 */
export const reportScan = async (
  trigger: string,
  result: ScanResult,
  startedAt: number
): Promise<void> => {
  const { total, pendingAi, changedKeys, aiAvailable, aiUnavailableReason } = result;
  try {
    // nothing was queued when the provider failed its probe — don't wait on an empty queue
    const aiDrained = pendingAi > 0 ? await waitForAiIdle() : true;
    const seconds = Math.round((Date.now() - startedAt) / 1000);
    console.log(
      `[SVK scan] ${trigger}: ${total} tickets, ${changedKeys.length} changed, ` +
        `${pendingAi} queued for AI${aiAvailable ? '' : ` (AI off: ${aiUnavailableReason})`} (${seconds}s)`
    );

    if (!isTelegramConfigured()) return;
    if (!changedKeys.length && !NOTIFY_WHEN_EMPTY) return;
    // the breaker can trip mid-run, so read the reason again rather than trusting the probe
    const reason = aiUnavailableReason || getAiJobState().aiUnavailableReason;
    await sendTelegram(await buildReport(trigger, total, changedKeys, seconds, aiDrained, reason));
  } catch (error: any) {
    console.error(`[SVK scan] ${trigger} report failed:`, error?.message || error);
  }
};

const runOnce = async (trigger: string) => {
  const startedAt = Date.now();
  try {
    const result = await scanSvkTickets();
    await reportScan(trigger, result, startedAt);
  } catch (error: any) {
    const message = error?.message || String(error);
    console.error(`[SVK auto-scan] ${trigger} failed:`, message);
    if (isTelegramConfigured()) {
      await sendTelegram(`❌ <b>SVK scan lỗi</b> (${escapeHtml(trigger)})\n${escapeHtml(message)}`);
    }
  }
};

export const startSvkAutoScan = (): void => {
  if (!Number.isFinite(HOURS) || HOURS <= 0) {
    console.log('[SVK auto-scan] disabled (SVK_AUTO_SCAN_HOURS=0)');
    return;
  }

  const intervalMs = HOURS * 60 * 60 * 1000;
  const timer = setInterval(() => void runOnce('scheduled'), intervalMs);
  // don't hold the process open just for the scheduler
  timer.unref?.();
  console.log(
    `[SVK auto-scan] enabled — every ${HOURS}h; telegram ${isTelegramConfigured() ? 'on' : 'off (chưa set token/chat id)'}`
  );

  if (RUN_ON_BOOT) void runOnce('boot');
};
