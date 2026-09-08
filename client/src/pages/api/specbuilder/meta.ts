import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import { SPECS_ROOT } from '../openapi/specs';

export const BUILDER_ROOT = path.join(process.cwd(), '..', 'open_api_viewer', 'builder');

// Engine sống ngoài Next app (dùng chung với CLI). `import()` thường bị webpack
// bắt và cố bundle -> "Cannot find module", vì catalog.mjs/js-yaml không nằm
// trong graph của Next. `new Function` giữ nó là dynamic import thật của Node.
const nodeImport: (url: string) => Promise<any> = new Function(
  'u',
  'return import(u)'
) as any;

export async function loadEngine() {
  const url = (f: string) => pathToFileURL(path.join(BUILDER_ROOT, f)).href;
  const [engine, catalog, manifestMod] = await Promise.all([
    nodeImport(url('engine.mjs')),
    nodeImport(url('catalog.mjs')),
    nodeImport(url('manifest.mjs')),
  ]);
  return { engine, catalog, manifestMod };
}

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const { catalog } = await loadEngine();
    const partners: string[] = [];
    for (const e of await fs.readdir(SPECS_ROOT, { withFileTypes: true })) {
      if (e.isDirectory() && !e.name.startsWith('.') && !['base', 'base2'].includes(e.name)) {
        partners.push(e.name);
      }
    }
    let fragments: string[] = [];
    try {
      fragments = (await fs.readdir(path.join(SPECS_ROOT, 'base2', 'custom')))
        .filter((f) => /\.ya?ml$/i.test(f));
    } catch { /* chưa có folder custom */ }

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({
      products: catalog.PRODUCTS,
      bases: catalog.BASES,
      features: Object.fromEntries(
        Object.entries(catalog.FEATURE_PATHS).map(([model, table]) => [
          model,
          Object.fromEntries(Object.entries(table as Record<string, string[]>)),
        ])
      ),
      partners: partners.sort(),
      fragments: fragments.sort(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
