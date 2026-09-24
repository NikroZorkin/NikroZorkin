import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve, extname, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function createPreview({ refresh = false } = {}) {
  const markdown = await readFile('README.md', 'utf8');
  const hash = createHash('sha256').update(markdown).digest('hex');
  await mkdir('.cache/markdown', { recursive: true });
  await mkdir('preview', { recursive: true });
  const cachePath = `.cache/markdown/${hash}.html`;
  let html;
  if (!refresh) {
    try { html = await readFile(cachePath, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  if (!html) {
    // Rendering is read-only. This endpoint does not create a repo or publish content.
    html = execFileSync('gh', ['api', 'markdown', '--method', 'POST', '--input', '-'], {
      input: JSON.stringify({ text: markdown, mode: 'gfm' }), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024
    });
    await writeFile(cachePath, html);
  }
  await copyFile('node_modules/github-markdown-css/github-markdown.css', 'preview/github-markdown.css');
  await writeFile('preview/rendered-github.html', html);
  await writeFile('preview/index.html', `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark light"><base href="../"><title>Danylo Zorkin · GitHub README preview</title><link rel="stylesheet" href="preview/github-markdown.css"><style>
*{box-sizing:border-box}body{margin:0;padding:36px 20px;background:#0d1117;color:#f0f6fc;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.preview-shell{max-width:1040px;margin:auto}.preview-note{font-size:12px;color:#9198a1;margin:0 0 14px}.readme-frame{padding:26px 32px 32px;border:1px solid #30363d;border-radius:7px;background:#0d1117}.readme-label{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:12px;margin:0 0 24px;color:#9198a1}.readme-label strong{color:#f0f6fc;font-weight:500}.markdown-body{background:transparent}.markdown-body>picture:first-child{display:block}.markdown-body>p:last-child{margin-bottom:0}@media(prefers-color-scheme:light){body,.readme-frame{background:#fff;color:#1f2328}.readme-frame{border-color:#d1d9e0}.readme-label,.preview-note{color:#59636e}.readme-label strong{color:#1f2328}}@media(max-width:767px){body{padding:20px 12px}.readme-frame{padding:16px}.readme-label{margin-bottom:18px}.preview-note{font-size:11px}}
</style></head><body><main class="preview-shell"><p class="preview-note">Local preview · GitHub Markdown renderer · follows your system theme and motion preference</p><section class="readme-frame"><div class="readme-label">NikroZorkin / <strong>README.md</strong></div><article class="markdown-body">${html}</article></section></main></body></html>\n`);
  await writeFile('preview/render-info.json', JSON.stringify({ renderer: 'GitHub REST Markdown API', markdownSha256: hash, styles: 'github-markdown-css 5.9.0', published: false }, null, 2));
  return { html, hash };
}

export async function servePreview({ port = 4173 } = {}) {
  const root = process.cwd();
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json' };
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://127.0.0.1');
      if (url.pathname === '/') { response.writeHead(302, { Location: '/preview/index.html' }).end(); return; }
      const file = resolve(root, `.${decodeURIComponent(url.pathname)}`);
      const name = relative(root, file).replaceAll('\\', '/');
      if (name.startsWith('..') || !/^(assets|preview)\//.test(name)) { response.writeHead(404).end(); return; }
      const bytes = await readFile(file);
      response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(bytes);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return { server, url: `http://127.0.0.1:${server.address().port}/preview/index.html` };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await createPreview({ refresh: process.argv.includes('--refresh') });
  if (process.argv.includes('--render-only')) console.log('Saved preview/index.html using the GitHub Markdown renderer.');
  else {
    const { server, url } = await servePreview();
    console.log(`README preview: ${url}`);
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
  }
}
