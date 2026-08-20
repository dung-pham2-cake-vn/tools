import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import { VIEWER_HTML } from './specs';

// Serves open_api_viewer/index.html as-is so the standalone viewer and the
// embedded one stay a single file. Specs come from /api/openapi/*.
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const raw = await fs.readFile(VIEWER_HTML, 'utf8');
    // The baked specs-index.js is only for standalone file:// use; here specs
    // come live from /api/openapi/*, so drop the tag instead of 404-ing on it.
    const html = raw.replace(
      /\s*<script src="specs\/specs-index\.js"[^>]*><\/script>/,
      ''
    );
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(html);
  } catch (err: any) {
    res.status(500).send(`Cannot read viewer: ${err.message}`);
  }
}
