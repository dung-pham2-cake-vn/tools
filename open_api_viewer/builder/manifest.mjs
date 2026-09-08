// Đọc/ghi spec.config.yaml. Ở đây thay vì trong Next API route để route không
// phải import js-yaml trực tiếp (repo chưa có @types/js-yaml).

import fs from 'node:fs/promises';
import { createRequire } from 'node:module';

const yaml = createRequire(import.meta.url)('js-yaml');

const HEADER = (dir) =>
  `# Manifest của spec ${dir} — nguồn để sinh index.yaml.\n` +
  `# Build lại: trang /specbuilder, hoặc \`node open_api_viewer/builder/cli.mjs build ${dir}\`.\n` +
  `# Sửa file này rồi build lại; đừng sửa tay index.yaml (build sau sẽ ghi đè).\n`;

export async function readManifest(absPath) {
  return yaml.load(await fs.readFile(absPath, 'utf8'));
}

export async function writeManifest(absPath, manifest, dir) {
  const body = yaml.dump(manifest, { lineWidth: 120, noRefs: true, sortKeys: false });
  await fs.writeFile(absPath, HEADER(dir) + body, 'utf8');
}

export function parseManifest(text) {
  return yaml.load(text);
}
