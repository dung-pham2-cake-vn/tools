import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import { resolveSpecPath } from './specs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const rel = Array.isArray(req.query.path) ? req.query.path[0] : req.query.path;
  const abs = resolveSpecPath(rel || '');
  if (!abs) return res.status(400).send('Invalid spec path');
  try {
    const text = await fs.readFile(abs, 'utf8');
    res.setHeader('Content-Type', 'text/yaml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(text);
  } catch (err: any) {
    res.status(404).send(`Cannot read spec: ${err.message}`);
  }
}
