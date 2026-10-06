// Dùng chung cho kb-index.mjs, kb-lint.mjs, linkify.mjs.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
export const KB_DIRS = ['kb', 'kb-po'];

/** Mọi file .md trong kb/ và kb-po/, đường dẫn tính từ workspace/. */
export function allPages() {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(rel);
      else if (e.name.endsWith('.md')) out.push(rel);
    }
  };
  for (const d of KB_DIRS) walk(d);
  return out.sort();
}

/** Tách YAML frontmatter rất đơn giản — đủ cho các khoá một dòng mà KB dùng. */
export function parse(relPath) {
  const text = readFileSync(join(ROOT, relPath), 'utf8');
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  const fm = {};
  if (m) {
    let key = null;
    for (const line of m[1].split('\n')) {
      // Mục của danh sách nhiều dòng: `  - confluence:123`
      const item = line.match(/^\s+-\s*(.*)$/);
      if (item && key) {
        fm[key] = fm[key] ? `${fm[key]}, ${item[1].trim()}` : item[1].trim();
        continue;
      }
      const kv = line.match(/^([a-z_]+):\s*(.*)$/);
      if (!kv) continue;
      key = kv[1];
      const val = kv[2].trim().replace(/^["']|["']$/g, '');
      // `key:` trống = mở đầu danh sách nhiều dòng, chờ các dòng `- ` phía dưới.
      fm[key] = val;
      if (val === '') delete fm[key];
    }
  }
  // Ngày có thể là `2026-10-01` hoặc ISO đầy đủ — chuẩn hoá về YYYY-MM-DD.
  for (const k of ['last_verified', 'numbers_asof']) {
    if (fm[k]) fm[k] = String(fm[k]).slice(0, 10);
  }
  return { path: relPath, fm, body: m ? text.slice(m[0].length) : text, text };
}

/** `[[kb/operations/ma-loi-api]]` → `kb/operations/ma-loi-api` */
export function wikilinks(body) {
  return [...body.matchAll(/\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g)].map((m) => m[1].trim());
}

/** Tiêu đề hiển thị: title trong frontmatter, nếu không có thì heading H1. */
export function titleOf(page) {
  if (page.fm.title) return page.fm.title;
  const h = page.body.match(/^#\s+(.+)$/m);
  return h ? h[1].trim() : page.path;
}

/** Bỏ khối code có rào — ví dụ minh hoạ trong đó không phải link thật. */
export function stripCode(body) {
  return body.replace(/^```[\s\S]*?^```/gm, '');
}

/** Bỏ cả inline code — `[[ví dụ]]` trong backtick không phải link thật. */
export function stripAllCode(body) {
  return stripCode(body).replace(/`[^`\n]*`/g, '');
}

export const today = () => new Date().toISOString().slice(0, 10);

export function daysSince(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return null;
  return Math.round((Date.now() - Date.parse(iso)) / 86400000);
}
