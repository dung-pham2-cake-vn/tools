const TG_LIMIT = 4096;
const EDIT_INTERVAL_MS = 1600;

export function chunk(text, size = TG_LIMIT) {
  const out = [];
  let rest = text;
  while (rest.length > size) {
    // Prefer to break on a newline so code blocks and paragraphs stay intact.
    let cut = rest.lastIndexOf('\n', size);
    if (cut < size * 0.5) cut = size;
    out.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  if (rest.length) out.push(rest);
  return out;
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

  async flush() {
    if (!this.msg) return;
    const next = this.compose();
    if (next === this.rendered || !next.trim()) return;
    this.rendered = next;
    this.lastEdit = Date.now();
    try {
      await this.ctx.api.editMessageText(this.msg.chat.id, this.msg.message_id, next);
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
      await this.ctx.api.editMessageText(this.msg.chat.id, this.msg.message_id, parts[0]);
    } catch (err) {
      if (!/not modified/i.test(err.description || err.message || '')) {
        console.error('[telegram] final edit failed:', err.description || err.message);
      }
    }
    for (const part of parts.slice(1)) {
      await this.ctx.reply(part);
    }
  }
}
