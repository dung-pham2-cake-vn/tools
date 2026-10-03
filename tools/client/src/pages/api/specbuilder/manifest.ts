import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { SPECS_ROOT } from '../openapi/specs';
import { loadEngine } from './meta';

const DIR_RE = /^[a-z0-9][a-z0-9_-]*$/;

/** Đọc lại manifest đã lưu của 1 partner để nạp vào form. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const dir = Array.isArray(req.query.dir) ? req.query.dir[0] : req.query.dir;
  if (!dir || !DIR_RE.test(dir)) return res.status(400).json({ error: 'dir không hợp lệ' });
  const abs = path.resolve(SPECS_ROOT, dir, 'spec.config.yaml');
  if (!abs.startsWith(path.resolve(SPECS_ROOT) + path.sep)) {
    return res.status(400).json({ error: 'dir không hợp lệ' });
  }
  try {
    const { manifestMod } = await loadEngine();
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ manifest: await manifestMod.readManifest(abs) });
  } catch {
    res.status(404).json({ error: `chưa có ${dir}/spec.config.yaml` });
  }
}
