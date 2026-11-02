import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { tokens } from './artwork.mjs';

const sources = JSON.parse(await readFile('design/font-sources.json', 'utf8'));
// Temporary build inputs from the foundry's own CDN, never committed or cached.
for (const [key, source] of Object.entries(sources)) {
  const response = await fetch(source.url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Font download failed: ${key} (${response.status})`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (createHash('sha256').update(bytes).digest('hex') !== source.sha256) throw new Error(`Font checksum changed: ${key}. Existing profile is preserved.`);
  await mkdir(dirname(tokens.fonts[key].file), { recursive: true });
  await writeFile(tokens.fonts[key].file, bytes);
  console.log(`Verified ${tokens.fonts[key].family}`);
}
