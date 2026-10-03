#!/usr/bin/env node
// Export Confluence space PL và Jira project PL (Initiative/Epic/Story, tạo từ 2024-06-01) về raw/ dạng Markdown.
//
// Chạy thử:    node --env-file=tools/.env tools/export.mjs --limit=5
// Chạy đầy đủ: node --env-file=tools/.env tools/export.mjs
// Chỉ một nguồn: --only=confluence | --only=jira
//
// Cần Node >= 20.6 (fetch và --env-file có sẵn), không cần cài package.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'raw');

const ATLASSIAN_FIELDS = 'summary,issuetype,status,priority,created,updated,resolutiondate,labels,components,fixVersions,parent,description,comment';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const LIMIT = args.limit ? Number(args.limit) : Infinity;
const ONLY = args.only;

// --order=desc lấy nội dung MỚI nhất trước (mặc định asc = cũ nhất trước).
// Quan trọng khi chạy mẫu: 30 page cũ nhất không đại diện cho sản phẩm đang chạy.
const ORDER = String(args.order ?? 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC';
const CONFLUENCE_CQL = `space = PL AND type = page ORDER BY created ${ORDER}`;
const ATLASSIAN_JQL = `project = PL AND issuetype in (Initiative, Epic, Story) AND status != "Will Not Do" AND created >= "2024-06-01" ORDER BY created ${ORDER}`;

const { ATLASSIAN_BASE_URL, ATLASSIAN_EMAIL, ATLASSIAN_API_TOKEN } = process.env;
if (!ATLASSIAN_BASE_URL || !ATLASSIAN_EMAIL || !ATLASSIAN_API_TOKEN) {
  console.error('Thiếu ATLASSIAN_BASE_URL / ATLASSIAN_EMAIL / ATLASSIAN_API_TOKEN (xem tools/.env.example).');
  process.exit(1);
}
const BASE = ATLASSIAN_BASE_URL.replace(/\/+$/, '');
const AUTH = 'Basic ' + Buffer.from(`${ATLASSIAN_EMAIL}:${ATLASSIAN_API_TOKEN}`).toString('base64');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, attempt = 0) {
  const full = url.startsWith('http') ? url : BASE + url;
  const res = await fetch(full, { headers: { Authorization: AUTH, Accept: 'application/json' } });
  if (res.status === 429 || res.status >= 500) {
    if (attempt >= 5) throw new Error(`${res.status} ${full}`);
    const wait = Number(res.headers.get('retry-after')) * 1000 || 2 ** attempt * 1000;
    await sleep(wait);
    return get(url, attempt + 1);
  }
  if (!res.ok) throw new Error(`${res.status} ${full}\n${(await res.text()).slice(0, 500)}`);
  return res.json();
}

// ---------- Tiện ích chung ----------

const ACCENT = { grave: '̀', acute: '́', circ: '̂', tilde: '̃', uml: '̈', ring: '̊', cedil: '̧' };
const NAMED = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", hellip: '…', ndash: '–', mdash: '—',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', laquo: '«', raquo: '»', bull: '•', middot: '·',
  rarr: '→', larr: '←', harr: '↔', rArr: '⇒', lArr: '⇐', uarr: '↑', darr: '↓', ge: '≥', le: '≤', ne: '≠',
  times: '×', divide: '÷', plusmn: '±', deg: '°', copy: '©', reg: '®', trade: '™', euro: '€', sect: '§',
  para: '¶', shy: '', zwj: '', zwnj: '', frac12: '½', frac14: '¼', frac34: '¾', szlig: 'ß', check: '✓',
};

function decode(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (m, e) => {
    try {
      if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
    } catch {
      return m;
    }
    if (e in NAMED) return NAMED[e];
    const a = e.match(/^([a-zA-Z])(grave|acute|circ|tilde|uml|ring|cedil)$/);
    return a ? (a[1] + ACCENT[a[2]]).normalize('NFC') : m;
  });
}

// Ẩn danh hoá theo Giai đoạn 3 của PLAN.md.
//
// Nguyên tắc: số tài khoản / CIF / số hợp đồng chỉ được ẩn khi ĐỨNG SAU một từ
// khoá chỉ danh. Tài liệu Lending đầy mã tài khoản GL kế toán 9-11 chữ số
// (vd "Dr GL: 397xxxxxx - Fee receivable"); ẩn mù theo độ dài sẽ phá mất nội
// dung nghiệp vụ thật, nên chỉ ẩn khi ngữ cảnh nói rõ đó là dữ liệu khách hàng.
const KW_ACCOUNT = 'STK|số tài khoản|so tai khoan|tài khoản nhận|account\\s*(?:no|number)|acc\\s*no';
const KW_CIF = '\\bCIF\\b';  // \b bắt buộc: nếu không, 'Specification' bị ăn mất 'cif'
const KW_CONTRACT = 'số hợp đồng|so hop dong|mã hợp đồng|contract\\s*(?:no|number|code)|HĐ\\s*số';

function redact(s) {
  return (
    s
      // Luật có từ khoá chạy TRƯỚC luật thuần-số, nếu không một CIF như
      // "CAK0012345678" sẽ bị luật SĐT bắt mất và gắn sai nhãn.
      // `[^\\s]` cuối mỗi mẫu để không nuốt dấu cách đứng sau.
      .replace(new RegExp(`(${KW_ACCOUNT})([\\s:=]*)[0-9][0-9 .-]{5,18}[0-9]`, 'gi'), '$1$2[STK]')
      .replace(new RegExp(`(${KW_CIF})([\\s:=]*)[A-Z0-9][A-Z0-9-]{4,18}[A-Z0-9]`, 'gi'), '$1$2[CIF]')
      .replace(new RegExp(`(${KW_CONTRACT})([\\s:=]*)[A-Z0-9][A-Z0-9/-]{4,23}[A-Z0-9]`, 'gi'), '$1$2[SỐ HĐ]')
      .replace(/\b(CCCD|CMND|CMTND)\b([\s:=]*)\d{9,12}\b/gi, '$1$2[CCCD]')
      // Email.
      .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[EMAIL]')
      // SĐT Việt Nam: 10 số, đầu 0 hoặc +84.
      .replace(/(?<!\d)(?:\+84|0)(?:[ .]?\d){9}(?!\d)/g, '[SĐT]')
      // CCCD trần: đúng 12 chữ số liền.
      .replace(/(?<!\d)\d{12}(?!\d)/g, '[CCCD]')
  );
}

function tidy(s) {
  return s
    .split('\n')
    .map((l) => l.replace(/[​﻿]/g, '').replace(/[ \t ]+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function frontmatter(obj) {
  const lines = Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
  return `---\n${lines.join('\n')}\n---\n\n`;
}

function csv(rows, cols) {
  const esc = (v) => {
    const s = Array.isArray(v) ? v.join(';') : String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n') + '\n';
}

// ---------- Confluence storage format → Markdown ----------

function storageToMarkdown(html) {
  const stash = [];
  const keep = (md) => `\u0000${stash.push(md) - 1}\u0000`;
  const restore = (s) => {
    while (/\u0000\d+\u0000/.test(s)) s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => stash[i]);
    return s;
  };

  let s = html;

  // Widget "adf-extension" (Mermaid, Lucid, …) mang theo một khối metadata
  // ARI/extension-key dài ngoằng. Nội dung thật của sơ đồ nằm ở code macro
  // riêng, nên khối metadata này là rác thuần — bỏ trước khi strip tag,
  // nếu không nó bị nối thành một dòng text khổng lồ giữa bài.
  s = s.replace(/<ac:adf-attribute[\s\S]*?<\/ac:adf-attribute>/g, '');
  s = s.replace(/<ac:adf-parameter[\s\S]*?<\/ac:adf-parameter>/g, '');

  // Code macro: giữ nguyên nội dung.
  s = s.replace(/<ac:plain-text-body><!\[CDATA\[([\s\S]*?)\]\]><\/ac:plain-text-body>/g, (_, code) => keep(`\n\n\`\`\`\n${code}\n\`\`\`\n\n`));
  s = s.replace(/<ac:structured-macro[^>]*ac:name="jira"[^>]*>([\s\S]*?)<\/ac:structured-macro>/g, (_, inner) => {
    const k = inner.match(/<ac:parameter ac:name="key">([^<]*)</);
    return k ? keep(`[jira:${k[1]}]`) : '';
  });
  s = s.replace(/<ac:structured-macro[^>]*ac:name="status"[^>]*>([\s\S]*?)<\/ac:structured-macro>/g, (_, inner) => {
    const t = inner.match(/<ac:parameter ac:name="title">([^<]*)</);
    return t ? `[${t[1]}]` : '';
  });
  s = s.replace(/<ac:image[^>]*>([\s\S]*?)<\/ac:image>/g, (_, inner) => {
    const f = inner.match(/ri:filename="([^"]*)"/) || inner.match(/ri:value="([^"]*)"/);
    return f ? keep(`[image: ${f[1]}]`) : '[image]';
  });
  s = s.replace(/<ac:link[^>]*>([\s\S]*?)<\/ac:link>/g, (_, inner) => {
    const title = inner.match(/ri:content-title="([^"]*)"/)?.[1];
    const text = inner.match(/<!\[CDATA\[([\s\S]*?)\]\]>/)?.[1] ?? inner.match(/<ac:link-body>([\s\S]*?)<\/ac:link-body>/)?.[1];
    if (/<ri:user/.test(inner)) return '@user';
    if (title) return text && text !== title ? `${text} ([[${title}]])` : `[[${title}]]`;
    return text ?? '';
  });
  s = s.replace(/<ri:user[^>]*\/>/g, '@user');
  s = s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_, t) => keep(t));
  s = s.replace(/<ac:parameter[^>]*>[\s\S]*?<\/ac:parameter>/g, '');

  // Bảng: xử lý bảng trong cùng trước. Ô gộp (rowspan/colspan) được trải ra thành ô trống để cột không bị lệch.
  const tableRe = /<table\b[^>]*>((?:(?!<table\b)[\s\S])*?)<\/table>/;
  let m;
  while ((m = s.match(tableRe))) {
    const grid = [];
    [...m[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].forEach((r, ri) => {
      grid[ri] ??= [];
      let ci = 0;
      for (const c of r[1].matchAll(/<t[hd]\b([^>]*)>([\s\S]*?)<\/t[hd]>/g)) {
        while (grid[ri][ci] !== undefined) ci++;
        const rs = Number(c[1].match(/rowspan="(\d+)"/)?.[1] ?? 1);
        const cs = Number(c[1].match(/colspan="(\d+)"/)?.[1] ?? 1);
        const text = tidy(restore(blocks(c[2]))).replace(/\n+/g, ' <br> ').replace(/\|/g, '\\|');
        for (let dr = 0; dr < rs; dr++) {
          for (let dc = 0; dc < cs; dc++) (grid[ri + dr] ??= [])[ci + dc] = dr === 0 && dc === 0 ? text : '';
        }
        ci += cs;
      }
    });
    const rows = grid.map((r) => Array.from(r, (v) => v ?? ''));
    const width = Math.max(1, ...rows.map((r) => r.length));
    // Bảng đánh số dòng tự động: dòng header không có ô số thứ tự nên ngắn hơn một ô và bị lệch sang trái.
    if (
      rows.length > 1 &&
      rows[0].length === width - 1 &&
      rows.slice(1).every((r) => /^[^\p{L}\p{N}]*\d+[^\p{L}\p{N}]*$/u.test(r[0] ?? ''))
    ) {
      rows[0] = ['#', ...rows[0]];
    }
    const line = (r) => `| ${[...r, ...Array(width - r.length).fill('')].join(' | ')} |`;
    const md = rows.length ? [line(rows[0]), line(Array(width).fill('---')), ...rows.slice(1).map(line)].join('\n') : '';
    s = s.replace(m[0], keep(`\n\n${md}\n\n`));
  }

  return tidy(restore(blocks(s)));
}

function blocks(s) {
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<hr\s*\/?>/gi, '\n\n---\n\n');
  s = s.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, n, t) => `\n\n${'#'.repeat(n)} ${t.trim()}\n\n`);
  s = s.replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, _t, t) => (t.trim() ? `**${t.trim()}**` : t));
  s = s.replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, _t, t) => (t.trim() ? `_${t.trim()}_` : t));
  s = s.replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');
  s = s.replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, t) => (t.trim() && t.trim() !== href ? `[${t.trim()}](${href})` : href));

  // Danh sách, giữ độ sâu.
  s = s.replace(/(<li[^>]*>)\s*<p[^>]*>([\s\S]*?)<\/p>/gi, '$1$2');
  const stack = [];
  const counters = [];
  s = s.replace(/<\/?(ul|ol|li)\b[^>]*>/gi, (tag, name) => {
    const closing = tag[1] === '/';
    name = name.toLowerCase();
    if (name !== 'li') {
      if (closing) stack.pop();
      else {
        stack.push(name);
        counters[stack.length] = 0;
      }
      return '\n';
    }
    if (closing) return '';
    const depth = Math.max(1, stack.length);
    const marker = stack[stack.length - 1] === 'ol' ? `${++counters[depth]}. ` : '- ';
    return `\n${'  '.repeat(depth - 1)}${marker}`;
  });

  s = s.replace(/<\/(p|div|blockquote|tr|h[1-6])>/gi, '\n\n');
  s = s.replace(/<[^>]+>/g, '');
  return decode(s);
}

// ---------- Jira ADF → Markdown ----------

function adf(node, depth = 0) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  const kids = () => (node.content ?? []).map((n) => adf(n, depth)).join('');
  const a = node.attrs ?? {};
  switch (node.type) {
    case 'text': {
      let t = node.text ?? '';
      for (const mk of node.marks ?? []) {
        if (mk.type === 'code') t = `\`${t}\``;
        else if (mk.type === 'strong') t = `**${t}**`;
        else if (mk.type === 'em') t = `_${t}_`;
        else if (mk.type === 'strike') t = `~~${t}~~`;
        else if (mk.type === 'link') t = `[${t}](${mk.attrs?.href})`;
      }
      return t;
    }
    case 'hardBreak': return '\n';
    case 'paragraph': return `${kids()}\n\n`;
    case 'heading': return `${'#'.repeat(a.level ?? 3)} ${kids()}\n\n`;
    case 'bulletList':
    case 'orderedList':
      return (node.content ?? [])
        .map((li, i) => {
          const marker = node.type === 'orderedList' ? `${(a.order ?? 1) + i}. ` : '- ';
          const body = (li.content ?? []).map((n) => adf(n, depth + 1)).join('').trim();
          return `${'  '.repeat(depth)}${marker}${body}`;
        })
        .join('\n') + '\n\n';
    case 'codeBlock': return `\`\`\`${a.language ?? ''}\n${kids()}\n\`\`\`\n\n`;
    case 'blockquote':
    case 'panel':
      return kids().trim().split('\n').map((l) => `> ${l}`).join('\n') + '\n\n';
    case 'rule': return '---\n\n';
    case 'table': {
      const rows = (node.content ?? []).map((r) =>
        (r.content ?? []).map((c) => tidy(adf({ type: 'doc', content: c.content })).replace(/\n+/g, ' <br> ').replace(/\|/g, '\\|')),
      );
      if (!rows.length) return '';
      const width = Math.max(...rows.map((r) => r.length));
      const line = (r) => `| ${[...r, ...Array(width - r.length).fill('')].join(' | ')} |`;
      return [line(rows[0]), line(Array(width).fill('---')), ...rows.slice(1).map(line)].join('\n') + '\n\n';
    }
    case 'mention': return a.text ?? '@user';
    case 'inlineCard':
    case 'blockCard': return a.url ?? '';
    case 'emoji': return a.text ?? a.shortName ?? '';
    case 'status': return `[${a.text}]`;
    case 'date': return a.timestamp ? new Date(Number(a.timestamp)).toISOString().slice(0, 10) : '';
    case 'mediaSingle':
    case 'mediaGroup':
    case 'media': return '[media]\n\n';
    case 'expand':
    case 'nestedExpand': return `**${a.title ?? ''}**\n\n${kids()}`;
    default: return kids();
  }
}

// ---------- Confluence ----------

async function exportConfluence() {
  const dir = path.join(OUT, 'confluence', 'PL');
  await fs.mkdir(dir, { recursive: true });
  const rows = [];
  let url = `/wiki/rest/api/content/search?cql=${encodeURIComponent(CONFLUENCE_CQL)}&limit=25&expand=body.storage,version,ancestors,metadata.labels,history`;
  while (url && rows.length < LIMIT) {
    const data = await get(url);
    for (const page of data.results) {
      if (rows.length >= LIMIT) break;
      const ancestors = page.ancestors ?? [];
      const parent = ancestors.at(-1);
      const row = {
        id: page.id,
        title: page.title,
        parent_id: parent?.id,
        parent_title: parent?.title,
        breadcrumb: ancestors.map((x) => x.title).join(' > '),
        labels: page.metadata?.labels?.results?.map((l) => l.name) ?? [],
        created: page.history?.createdDate,
        updated: page.version?.when,
        version: page.version?.number,
        url: BASE + '/wiki' + page._links.webui,
        path: `confluence/PL/${page.id}.md`,
      };
      const body = redact(storageToMarkdown(page.body?.storage?.value ?? ''));
      const { path: _p, ...meta } = row;
      await fs.writeFile(path.join(OUT, row.path), frontmatter({ source: 'confluence', space: 'PL', ...meta }) + `# ${page.title}\n\n${body}\n`);
      rows.push(row);
    }
    url = data._links?.next ? (data._links.base ?? BASE + '/wiki') + data._links.next : null;
    console.log(`confluence: ${rows.length} page`);
  }
  await fs.writeFile(
    path.join(OUT, 'confluence', '_index.csv'),
    csv(rows, ['id', 'title', 'parent_id', 'parent_title', 'breadcrumb', 'labels', 'created', 'updated', 'version', 'path', 'url']),
  );
  return rows.length;
}

// ---------- Jira ----------

async function allComments(key) {
  const out = [];
  let startAt = 0;
  for (;;) {
    const data = await get(`/rest/api/3/issue/${key}/comment?startAt=${startAt}&maxResults=100`);
    out.push(...data.comments);
    startAt += data.comments.length;
    if (!data.comments.length || startAt >= data.total) return out;
  }
}

async function exportJira() {
  const dir = path.join(OUT, 'jira', 'PL');
  await fs.mkdir(dir, { recursive: true });
  const rows = [];
  let token;
  do {
    const q = new URLSearchParams({ jql: ATLASSIAN_JQL, fields: ATLASSIAN_FIELDS, maxResults: String(Math.min(100, LIMIT - rows.length)) });
    if (token) q.set('nextPageToken', token);
    const data = await get(`/rest/api/3/search/jql?${q}`);
    for (const issue of data.issues) {
      const f = issue.fields;
      let comments = f.comment?.comments ?? [];
      if (f.comment && f.comment.total > comments.length) comments = await allComments(issue.key);
      // Bỏ comment do bot automation sinh ra (báo subtask, story point…), không có giá trị nội dung.
      // Bot đăng dưới tên người thật nên còn nhận diện theo nội dung: log ngắn có link subtask "#icft=".
      comments = comments.filter((c) => {
        if (c.author?.accountType === 'app' || /automation/i.test(c.author?.displayName ?? '')) return false;
        const text = tidy(adf(c.body));
        return !(text.includes('#icft=') && text.length < 400);
      });
      const row = {
        key: issue.key,
        title: f.summary,
        type: f.issuetype?.name,
        status: f.status?.name,
        priority: f.priority?.name,
        parent_key: f.parent?.key,
        parent_title: f.parent?.fields?.summary,
        labels: f.labels ?? [],
        components: (f.components ?? []).map((c) => c.name),
        fix_versions: (f.fixVersions ?? []).map((v) => v.name),
        created: f.created,
        updated: f.updated,
        resolved: f.resolutiondate,
        comments: comments.length,
        url: `${BASE}/browse/${issue.key}`,
        path: `jira/PL/${issue.key}.md`,
      };
      let body = `# ${issue.key} — ${f.summary}\n\n## Description\n\n${tidy(adf(f.description)) || '_(trống)_'}\n`;
      if (comments.length) {
        body += '\n## Comments\n';
        for (const c of comments) body += `\n### ${c.created?.slice(0, 10)}\n\n${tidy(adf(c.body))}\n`;
      }
      const { path: _p, ...meta } = row;
      await fs.writeFile(path.join(OUT, row.path), frontmatter({ source: 'jira', project: 'PL', ...meta }) + redact(body));
      rows.push(row);
    }
    token = data.isLast ? undefined : data.nextPageToken;
    console.log(`jira: ${rows.length} issue`);
  } while (token && rows.length < LIMIT);
  await fs.writeFile(
    path.join(OUT, 'jira', '_index.csv'),
    csv(rows, ['key', 'title', 'type', 'status', 'parent_key', 'parent_title', 'labels', 'components', 'fix_versions', 'created', 'updated', 'resolved', 'comments', 'path', 'url']),
  );
  return rows.length;
}

// ---------- main ----------

const started = Date.now();
const result = {};
if (!ONLY || ONLY === 'confluence') result.confluence = await exportConfluence();
if (!ONLY || ONLY === 'jira') result.jira = await exportJira();
console.log(`Xong sau ${Math.round((Date.now() - started) / 1000)}s:`, result, `→ ${OUT}`);
