import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';
import { SPECS_ROOT } from '../openapi/specs';
import { loadEngine } from './meta';

const DIR_RE = /^[a-z0-9][a-z0-9_-]*$/;

/** Chỉ cho ghi vào `specs/<dir>/index.yaml` hoặc `spec.config.yaml`. */
function targetPath(dir: string, file: 'index.yaml' | 'spec.config.yaml'): string | null {
  if (!DIR_RE.test(dir) || ['base', 'base2'].includes(dir)) return null;
  const abs = path.resolve(SPECS_ROOT, dir, file);
  const root = path.resolve(SPECS_ROOT);
  return abs.startsWith(root + path.sep) ? abs : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const { manifest, save } = req.body || {};
  if (!manifest) return res.status(400).json({ error: 'thiếu manifest' });

  let built;
  try {
    const { engine } = await loadEngine();
    built = await engine.buildSpec(manifest, { specsRoot: SPECS_ROOT });
  } catch (err: any) {
    return res.status(400).json({ error: `build lỗi: ${err.message}` });
  }

  const written: string[] = [];
  if (save) {
    const dir = manifest?.partner?.dir;
    const specAbs = targetPath(dir, 'index.yaml');
    const cfgAbs = targetPath(dir, 'spec.config.yaml');
    if (!specAbs || !cfgAbs) {
      return res.status(400).json({ error: `partner.dir không hợp lệ: ${dir}` });
    }
    // *.lock.yaml đã gửi đối tác — build không bao giờ ghi vào đó (CLAUDE.md §1).
    // index.yaml là bản working nên ghi đè được.
    try {
      await fs.mkdir(path.dirname(specAbs), { recursive: true });
      await fs.writeFile(specAbs, built.yaml, 'utf8');
      written.push(`${dir}/index.yaml`);
      const { manifestMod } = await loadEngine();
      await manifestMod.writeManifest(cfgAbs, manifest, dir);
      written.push(`${dir}/spec.config.yaml`);
    } catch (err: any) {
      return res.status(500).json({ error: `ghi file lỗi: ${err.message}`, written });
    }
  }

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ yaml: built.yaml, paths: built.paths, warnings: built.warnings, written });
}
