#!/usr/bin/env node
// Dựng spec đối tác từ base2 + spec.config.yaml.
//
//   node builder/cli.mjs build <dir>     dựng 1 partner -> specs/<dir>/index.yaml
//   node builder/cli.mjs build-all       dựng mọi partner có spec.config.yaml
//   node builder/cli.mjs check           dựng vào bộ nhớ, báo partner nào lệch (CI)
//   node builder/cli.mjs matrix          in bảng feature của mọi partner
//
// Không bao giờ ghi vào *.lock.yaml (CLAUDE.md §1).

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSpec } from './engine.mjs';
import { readManifest } from './manifest.mjs';
import { featuresOf, pathsOf } from './catalog.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SPECS = path.join(ROOT, 'specs');
const SKIP = new Set(['base', 'base2']);

async function partnerDirs() {
  const out = [];
  for (const e of await fs.readdir(SPECS, { withFileTypes: true })) {
    if (e.isDirectory() && !e.name.startsWith('.') && !SKIP.has(e.name)) out.push(e.name);
  }
  return out.sort();
}

async function manifestOf(dir) {
  try {
    return await readManifest(path.join(SPECS, dir, 'spec.config.yaml'));
  } catch {
    return null;
  }
}

async function buildOne(dir, { write }) {
  const m = await manifestOf(dir);
  if (!m) return { dir, skipped: 'chưa có spec.config.yaml' };
  const r = await buildSpec(m, { specsRoot: SPECS });
  const target = path.join(SPECS, dir, 'index.yaml');
  let current = null;
  try { current = await fs.readFile(target, 'utf8'); } catch { /* file mới */ }
  const drift = current !== null && current !== r.yaml;
  if (write) await fs.writeFile(target, r.yaml, 'utf8');
  return { dir, paths: r.paths, warnings: r.warnings, drift, isNew: current === null };
}

const cmd = process.argv[2];
const arg = process.argv[3];

if (cmd === 'build') {
  if (!arg) { console.error('cần tên thư mục partner'); process.exit(2); }
  const r = await buildOne(arg, { write: true });
  if (r.skipped) { console.error(`${arg}: ${r.skipped}`); process.exit(1); }
  console.log(`${arg}: ${r.paths.length} endpoint -> specs/${arg}/index.yaml`);
  r.warnings.forEach((w) => console.warn(`  ⚠ ${w}`));
} else if (cmd === 'build-all') {
  let n = 0;
  for (const dir of await partnerDirs()) {
    const r = await buildOne(dir, { write: true });
    if (r.skipped) { console.log(`${dir.padEnd(20)} — ${r.skipped}`); continue; }
    console.log(`${dir.padEnd(20)} ${String(r.paths.length).padStart(2)} endpoint${r.drift ? '  (đã cập nhật)' : ''}`);
    r.warnings.forEach((w) => console.warn(`  ⚠ ${w}`));
    n++;
  }
  console.log(`\n${n} partner dựng lại từ base2.`);
} else if (cmd === 'check') {
  const bad = [];
  for (const dir of await partnerDirs()) {
    const r = await buildOne(dir, { write: false });
    if (r.skipped) continue;
    if (r.drift || r.isNew) bad.push(dir);
  }
  if (bad.length) {
    console.error('index.yaml lệch so với base2 + manifest:');
    bad.forEach((d) => console.error(`  - ${d}   (chạy: node builder/cli.mjs build ${d})`));
    process.exit(1);
  }
  console.log('OK — mọi partner có manifest đều khớp bản dựng từ base2.');
} else if (cmd === 'matrix') {
  const cols = ['model', 'product', 'challenge', 'disburse', 'repayment', 'term', 'pay', 'inst', 'eps'];
  const rows = [];
  for (const dir of await partnerDirs()) {
    const m = await manifestOf(dir);
    if (!m) { rows.push([dir, '—', '', '', '', '', '', '', '', '']); continue; }
    const f = featuresOf(m);
    rows.push([
      dir, m.model, m.product || '',
      m.onboarding?.challenge_otp ? 'otp' : (m.onboarding?.challenge_facematch ? 'face' : '—'),
      m.disburse?.mode || '—', m.repayment?.mode || '—',
      m.termination ? '✓' : '', m.payment ? '✓' : '', m.installment ? '✓' : '',
      String(pathsOf(m).size),
    ]);
  }
  const head = ['partner', ...cols];
  const w = head.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] || '').length)));
  const line = (r) => r.map((c, i) => (c || '').padEnd(w[i])).join('  ');
  console.log(line(head));
  console.log(w.map((n) => '─'.repeat(n)).join('  '));
  rows.forEach((r) => console.log(line(r)));
} else {
  console.log(`Cách dùng:
  node builder/cli.mjs build <dir>     dựng 1 partner -> specs/<dir>/index.yaml
  node builder/cli.mjs build-all       dựng mọi partner có spec.config.yaml
  node builder/cli.mjs check           báo partner nào lệch so với base2 (CI)
  node builder/cli.mjs matrix          bảng feature của mọi partner`);
  process.exit(cmd ? 2 : 0);
}
