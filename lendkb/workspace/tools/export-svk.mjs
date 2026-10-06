#!/usr/bin/env node
// Kéo ticket vận hành SVK. Ẩn danh hoá dùng chung với export.mjs.
//   node --env-file=tools/.env tools/export-svk.mjs                  ticket đang mở
//   node --env-file=tools/.env tools/export-svk.mjs --history [ngày] mọi ticket tạo trong N ngày (mặc định 365)
//                                                                   → raw/jira/SVK-history/ — dùng để gom câu hỏi lặp lại
// Mạng công ty chặn TLS bằng CA nội bộ → thêm `--use-system-ca` sau `node` nếu gặp SELF_SIGNED_CERT_IN_CHAIN.
import fs from 'node:fs/promises';
import path from 'node:path';

const RT = '"Request Type" IN ("Lending Onboarding DOP","Lending Onboarding API","Lending Onboarding Appcake","Lending Disburse","Lending Payment Installment","Lending Repayment","Lending Get Detail","Lending Termination","Lending Core","Lending Portal Support","Lending Risk Support","Lending Others")';
const HISTORY = process.argv.includes('--history');
const DAYS = Number(process.argv[process.argv.indexOf('--history') + 1]) || 365;
const JQL = HISTORY
  ? `project = SVK AND ${RT} AND created >= -${DAYS}d ORDER BY created DESC`
  : `project = SVK AND ${RT} AND status NOT IN (Done,Cancelled,Ready4Test,"Waiting for customer") ORDER BY created DESC`;
const FIELDS = 'summary,issuetype,status,priority,created,updated,resolutiondate,labels,components,reporter,assignee,description,comment,customfield_10010';

const { ATLASSIAN_BASE_URL, ATLASSIAN_EMAIL, ATLASSIAN_API_TOKEN } = process.env;
if (!ATLASSIAN_BASE_URL) { console.error('Thiếu ATLASSIAN_* (tools/.env)'); process.exit(1); }
const BASE = ATLASSIAN_BASE_URL.replace(/\/+$/, '');
const AUTH = 'Basic ' + Buffer.from(`${ATLASSIAN_EMAIL}:${ATLASSIAN_API_TOKEN}`).toString('base64');
const get = async (u) => {
  const r = await fetch(BASE + u, { headers: { Authorization: AUTH, Accept: 'application/json' } });
  if (!r.ok) throw new Error(`${r.status} ${u}\n${(await r.text()).slice(0, 400)}`);
  return r.json();
};

// Dùng lại bộ ẩn danh hoá của export.mjs
const src = await fs.readFile('tools/export.mjs', 'utf8');
const mod = src.slice(src.indexOf('const KW_ACCOUNT'), src.indexOf('// ---------- Confluence storage'));
const { redact } = await import('data:text/javascript,' + encodeURIComponent(mod + '\nexport {redact};'));

function adf(n) {
  if (!n || typeof n !== 'object') return '';
  if (n.type === 'text') return n.text ?? '';
  if (n.type === 'hardBreak') return '\n';
  const inner = (n.content ?? []).map(adf).join('');
  return ['paragraph', 'heading', 'listItem', 'codeBlock'].includes(n.type) ? inner + '\n' : inner;
}

const OUT = HISTORY ? 'raw/jira/SVK-history' : 'raw/jira/SVK';
await fs.mkdir(OUT, { recursive: true });
let token, rows = [];
do {
  const q = new URLSearchParams({ jql: JQL, fields: FIELDS, maxResults: '100' });
  if (token) q.set('nextPageToken', token);
  const d = await get(`/rest/api/3/search/jql?${q}`);
  for (const it of d.issues ?? []) {
    const f = it.fields;
    const rt = f.customfield_10010?.requestType?.name ?? f.customfield_10010?.name ?? '';
    const body = [
      `# ${it.key} — ${f.summary ?? ''}`, '',
      '## Description', '', adf(f.description).trim() || '(trống)',
    ];
    const cs = f.comment?.comments ?? [];
    if (cs.length) {
      body.push('', `## Comments (${cs.length})`);
      for (const c of cs) body.push('', `### ${(c.created ?? '').slice(0, 10)} — ${c.author?.displayName ?? '?'}`, '', adf(c.body).trim());
    }
    const fm = {
      source: 'jira', project: 'SVK', key: it.key, title: f.summary ?? '',
      request_type: rt, type: f.issuetype?.name ?? '', status: f.status?.name ?? '',
      priority: f.priority?.name ?? '', created: f.created ?? '', updated: f.updated ?? '',
      reporter: f.reporter?.displayName ?? '', labels: f.labels ?? [], components: (f.components ?? []).map((c) => c.name),
      comments: cs.length, url: `${BASE}/browse/${it.key}`,
    };
    // Ẩn danh hoá cả frontmatter: tiêu đề ticket vận hành thường chứa SĐT khách.
    const head = '---\n' + Object.entries(fm).filter(([, v]) => v !== '' && v != null)
      .map(([k, v]) => `${k}: ${JSON.stringify(typeof v === 'string' ? redact(v) : v)}`).join('\n') + '\n---\n\n';
    await fs.writeFile(path.join(OUT, `${it.key}.md`), head + redact(body.join('\n')));
    rows.push({ key: it.key, rt, status: fm.status, created: fm.created.slice(0, 10), comments: cs.length, title: redact(fm.title) });
  }
  token = d.nextPageToken;
  console.log(`SVK: ${rows.length} ticket`);
} while (token);

await fs.writeFile(HISTORY ? 'raw/jira/svk-history-list.json' : 'tools/scan/svk-list.json', JSON.stringify(rows, null, 1));
console.log(`Xong: ${rows.length} ticket → ${OUT}/`);
