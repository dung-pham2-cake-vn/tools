import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';

// Specs live outside the Next app, in the repo's open_api_viewer folder.
export const SPECS_ROOT = path.join(process.cwd(), '..', 'open_api_viewer', 'specs');
export const VIEWER_HTML = path.join(process.cwd(), '..', 'open_api_viewer', 'index.html');

const SPEC_EXT = /\.(ya?ml)$/i;

export interface SpecEntry {
  path: string;
  size: number;
  mtime: number;
}

export async function listSpecs(dir = SPECS_ROOT, prefix = ''): Promise<SpecEntry[]> {
  const out: SpecEntry[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const abs = path.join(dir, e.name);
    const rel = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...(await listSpecs(abs, rel)));
    else if (SPEC_EXT.test(e.name)) {
      const st = await fs.stat(abs);
      out.push({ path: rel, size: st.size, mtime: st.mtimeMs });
    }
  }
  return out;
}

// Rejects traversal / non-spec paths, returns the absolute file path.
export function resolveSpecPath(rel: string): string | null {
  if (!rel || !SPEC_EXT.test(rel)) return null;
  const abs = path.resolve(SPECS_ROOT, rel);
  const root = path.resolve(SPECS_ROOT);
  if (abs !== root && !abs.startsWith(root + path.sep)) return null;
  return abs;
}

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const files = (await listSpecs()).sort((a, b) => a.path.localeCompare(b.path));
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ count: files.length, files });
  } catch (err: any) {
    res.status(500).json({ error: `Cannot read specs folder: ${err.message}` });
  }
}
