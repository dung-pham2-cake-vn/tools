// Claude trả lời bằng Markdown thường. Telegram không hiểu Markdown thường:
// parse_mode 'Markdown'/'MarkdownV2' dùng cú pháp khác (`*đậm*`, không có `**`)
// và bắt escape hơn một chục ký tự — sai một ký tự là cả tin nhắn lỗi 400.
// Nên tự dịch sang HTML của Telegram, tập thẻ nhỏ nhưng ta kiểm soát được escape.
//
// Bất biến quan trọng: chỉ cặp ký hiệu ĐÓNG ĐỦ mới thành thẻ. `**` lẻ (hay gặp
// khi tin nhắn đang stream và bị cắt giữa chừng) được giữ nguyên thành chữ, nên
// kết quả luôn cân thẻ, không bao giờ sinh HTML hỏng.

const ZERO = '\u0000';

/** Thẻ Telegram HTML hỗ trợ: b i u s code pre a blockquote tg-spoiler. */
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Bảng Markdown không có thẻ tương ứng — canh cột rồi bọc <pre> cho thẳng hàng. */
function renderTable(lines) {
  const rows = lines.map((l) =>
    l
      .trim()
      .replace(/^\||\|$/g, '')
      .split('|')
      .map((c) => c.trim().replace(/<br\s*\/?>/gi, ' ').replace(/\*\*/g, '').replace(/`/g, '')),
  );
  // Dòng thứ hai của bảng Markdown là dòng gạch ngang, không phải dữ liệu.
  const body = rows.filter((r) => !r.every((c) => /^:?-{2,}:?$/.test(c) || c === ''));
  if (body.length === 0) return '';

  const cols = Math.max(...body.map((r) => r.length));
  const width = [];
  for (let i = 0; i < cols; i++) {
    width[i] = Math.max(...body.map((r) => (r[i] || '').length));
  }
  const line = (r) =>
    r
      .map((c, i) => (i === cols - 1 ? c : c.padEnd(width[i])))
      .join('  ')
      .trimEnd();

  const out = [line(body[0])];
  if (body.length > 1) out.push('─'.repeat(Math.min(line(body[0]).length, 40)));
  for (const r of body.slice(1)) out.push(line(r));
  return out.join('\n');
}

/**
 * Markdown (như Claude viết) → HTML mà Telegram chấp nhận.
 * @param {string} md
 * @returns {string}
 */
export function toTelegramHtml(md) {
  const blocks = [];
  const stash = (html) => {
    blocks.push(html);
    return `${ZERO}${blocks.length - 1}${ZERO}`;
  };

  let s = String(md ?? '');

  // 1. Code block có rào ``` — cất đi trước để nội dung bên trong không bị
  //    các bước sau diễn giải thành thẻ.
  s = s.replace(/```[^\n`]*\n?([\s\S]*?)```/g, (_, code) =>
    stash(`<pre><code>${escapeHtml(code.replace(/\n$/, ''))}</code></pre>`),
  );

  // 2. Bảng: gom các dòng liền nhau bắt đầu bằng `|`, phải có dòng gạch ngang.
  s = s.replace(/(?:^[ \t]*\|.*\|[ \t]*$\n?){2,}/gm, (block) => {
    const lines = block.replace(/\n$/, '').split('\n');
    if (!lines.some((l) => /\|[\s:]*-{2,}/.test(l))) return block;
    const table = renderTable(lines);
    return table ? `${stash(`<pre>${escapeHtml(table)}</pre>`)}\n` : block;
  });

  // 3. `code` một dòng.
  s = s.replace(/`([^`\n]+)`/g, (_, code) => stash(`<code>${escapeHtml(code)}</code>`));

  // 4. Từ đây trở đi text là chữ thuần — escape rồi mới gắn thẻ của ta vào.
  s = escapeHtml(s);

  // 5. Link [chữ](url). Chỉ nhận http/https để không tạo link javascript:.
  s = s.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, text, href) =>
    stash(`<a href="${href.replace(/"/g, '&quot;')}">${text}</a>`),
  );

  // 6. Nhấn mạnh. `**` trước `*` để `**đậm**` không bị bắt thành nghiêng.
  s = s.replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '<b>$1</b>');
  s = s.replace(/(^|[\s(])__(?=\S)([\s\S]*?\S)__(?=[\s).,;:!?]|$)/g, '$1<b>$2</b>');
  s = s.replace(/~~(?=\S)([\s\S]*?\S)~~/g, '<s>$1</s>');
  s = s.replace(/(^|[\s(])\*(?=\S)([^*\n]*?\S)\*(?=[\s).,;:!?]|$)/g, '$1<i>$2</i>');
  s = s.replace(/(^|[\s(])_(?=\S)([^_\n]*?\S)_(?=[\s).,;:!?]|$)/g, '$1<i>$2</i>');

  // 7. Theo dòng: heading, gạch đầu dòng, trích dẫn, đường kẻ ngang.
  s = s
    .split('\n')
    .map((line) => {
      const h = line.match(/^#{1,6}[ \t]+(.*)$/);
      if (h) return `<b>${h[1].trim()}</b>`;
      if (/^[ \t]*([-*_])(?:[ \t]*\1){2,}[ \t]*$/.test(line)) return '──────────';
      const q = line.match(/^&gt;[ \t]?(.*)$/);
      if (q) return `<blockquote>${q[1]}</blockquote>`;
      // Telegram không có danh sách — thay bằng bullet, thụt lề bằng khoảng trắng.
      const b = line.match(/^([ \t]*)[-*+][ \t]+(.*)$/);
      if (b) return `${' '.repeat(Math.floor(b[1].replace(/\t/g, '  ').length / 2) * 2)}• ${b[2]}`;
      const n = line.match(/^([ \t]*)(\d+)\.[ \t]+(.*)$/);
      if (n) return `${n[1]}${n[2]}. ${n[3]}`;
      return line;
    })
    .join('\n');

  // 8. Gộp blockquote liền nhau thành một khối, nếu không Telegram vẽ mỗi dòng một hộp.
  s = s.replace(
    /(?:<blockquote>.*<\/blockquote>\n?){2,}/g,
    (m) =>
      `<blockquote>${m
        .trim()
        .split('\n')
        .map((l) => l.replace(/^<blockquote>|<\/blockquote>$/g, ''))
        .join('\n')}</blockquote>\n`,
  );

  // 9. Trả lại các khối đã cất.
  s = s.replace(new RegExp(`${ZERO}(\\d+)${ZERO}`, 'g'), (_, i) => blocks[Number(i)]);

  return s.replace(/\n{3,}/g, '\n\n').trim();
}
