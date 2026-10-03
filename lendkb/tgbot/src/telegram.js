import { toTelegramHtml } from './markdown.js';

const TG_LIMIT = 4096;
// Giới hạn 4096 của Telegram tính trên HTML đã sinh, không phải Markdown gốc.
// HTML luôn dài hơn (escape + thẻ) và tỉ lệ phình phụ thuộc nội dung, nên đo
// trực tiếp thay vì đoán bằng một hệ số cố định.
const HTML_BUDGET = TG_LIMIT - 120;
const EDIT_INTERVAL_MS = 1600;

/**
 * Cắt Markdown thành các phần mà bản HTML tương ứng vừa một tin nhắn Telegram.
 * Cắt theo dòng để code block và đoạn văn không bị đứt giữa chừng.
 */
export function chunk(text) {
  const lines = String(text).split('\n');
  const out = [];
  let cur = '';

  const fits = (s) => toTelegramHtml(s).length <= HTML_BUDGET;

  for (let line of lines) {
    // Một dòng đơn lẻ đã quá dài: cắt cứng theo ký tự.
    while (!fits(line)) {
      let lo = 1;
      let hi = line.length;
      while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        if (fits(line.slice(0, mid))) lo = mid;
        else hi = mid - 1;
      }
      if (cur) {
        out.push(cur);
        cur = '';
      }
      out.push(line.slice(0, lo));
      line = line.slice(lo);
    }
    const next = cur ? `${cur}\n${line}` : line;
    if (fits(next)) {
      cur = next;
    } else {
      if (cur) out.push(cur);
      cur = line;
    }
  }
  if (cur) out.push(cur);
  return out.length ? out : [''];
}

function isParseError(err) {
  const d = err?.description || err?.message || '';
  return /can't parse entities|unsupported start tag|unclosed|entities/i.test(d);
}

/**
 * Gửi/sửa với parse_mode HTML, nếu Telegram từ chối HTML thì gửi lại chữ thuần.
 * Thà mất định dạng còn hơn mất tin nhắn.
 */
async function withHtml(call, markdown) {
  // HTML dài hơn Markdown gốc (escape + thẻ). Tỉ lệ phụ thuộc nội dung — một
  // đoạn toàn chữ đậm có thể phình gần 3 lần — nên cắt dần cho tới khi vừa,
  // và cắt trên bản Markdown để không bao giờ cắt đứt một thẻ HTML.
  let src = markdown;
  let html = toTelegramHtml(src);
  while (html.length > TG_LIMIT && src.length > 200) {
    const cut = Math.floor(src.length * Math.max(0.5, (TG_LIMIT / html.length) * 0.95));
    src = src.slice(0, src.lastIndexOf('\n', cut) > cut * 0.5 ? src.lastIndexOf('\n', cut) : cut);
    html = toTelegramHtml(src);
  }
  const body = html.length > TG_LIMIT ? html.slice(0, TG_LIMIT) : html;
  try {
    return await call(body, { parse_mode: 'HTML', link_preview_options: { is_disabled: true } });
  } catch (err) {
    if (!isParseError(err)) throw err;
    console.error('[telegram] HTML bị từ chối, gửi lại chữ thuần:', err.description || err.message);
    return call(src.slice(0, TG_LIMIT), {});
  }
}

/**
 * A single Telegram message that is edited in place as text streams in,
 * throttled so we stay well under Telegram's edit rate limit.
 */
export class LiveMessage {
  constructor(ctx, placeholder = '…') {
    this.ctx = ctx;
    this.placeholder = placeholder;
    this.body = '';
    this.status = '';
    this.msg = null;
    this.lastEdit = 0;
    this.timer = null;
    this.rendered = '';
  }

  async start() {
    this.msg = await this.ctx.reply(this.placeholder);
  }

  setStatus(status) {
    this.status = status;
    this.schedule();
  }

  append(text) {
    this.body += text;
    this.schedule();
  }

  compose() {
    const body = this.body.trim();
    if (!body) return this.status || this.placeholder;
    // Only the tail lives in the edited message; overflow is flushed separately.
    const parts = chunk(body);
    const tail = parts[parts.length - 1];
    return this.status ? `${tail}\n\n${this.status}` : tail;
  }

  schedule() {
    if (this.timer) return;
    const wait = Math.max(0, EDIT_INTERVAL_MS - (Date.now() - this.lastEdit));
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush().catch(() => {});
    }, wait);
  }

  edit(markdown) {
    return withHtml(
      (text, opts) =>
        this.ctx.api.editMessageText(this.msg.chat.id, this.msg.message_id, text, opts),
      markdown,
    );
  }

  async flush() {
    if (!this.msg) return;
    const next = this.compose();
    if (next === this.rendered || !next.trim()) return;
    this.rendered = next;
    this.lastEdit = Date.now();
    try {
      await this.edit(next);
    } catch (err) {
      // 400 "message is not modified" and rate limits are both non-fatal here.
      if (!/not modified|too many requests/i.test(err.description || err.message || '')) {
        console.error('[telegram] edit failed:', err.description || err.message);
      }
    }
  }

  /** Final render: drop the status line and send any overflow as extra messages. */
  async finish(finalText) {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.status = '';
    const body = (finalText ?? this.body).trim() || '(không có nội dung trả về)';
    const parts = chunk(body);

    try {
      await this.edit(parts[0]);
    } catch (err) {
      if (!/not modified/i.test(err.description || err.message || '')) {
        console.error('[telegram] final edit failed:', err.description || err.message);
      }
    }
    for (const part of parts.slice(1)) {
      await withHtml((text, opts) => this.ctx.reply(text, opts), part);
    }
  }
}
