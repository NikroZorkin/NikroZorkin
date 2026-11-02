import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import sharp from 'sharp';
import { profile, inventory, displayedTechnologies } from './artwork.mjs';

const root = process.cwd();
const readme = await readFile('README.md', 'utf8');
const dependencies = JSON.parse(await readFile('design/dependencies.json', 'utf8'));
const items = inventory.groups.flatMap(group => group.items);
assert.equal(new Set(items.map(item => item.id)).size, items.length, 'Duplicate technology IDs');
for (const ecosystem of ['npm', 'python']) {
  const mapped = items.flatMap(item => item[ecosystem] || []);
  assert.equal(new Set(mapped).size, mapped.length, `A ${ecosystem} package belongs to more than one family`);
  assert.deepEqual([...mapped].sort(), [...dependencies[ecosystem]].sort(), `Incomplete ${ecosystem} inventory coverage`);
}

const refs = [...readme.matchAll(/(?:src|srcset)="([^"]+)"/g)].map(match => match[1]);
for (const ref of new Set(refs)) {
  assert(ref.startsWith('./assets/'), `Non-local image reference: ${ref}`);
  const path = resolve(root, ref);
  assert(!relative(root, path).startsWith('..'), 'Image escapes repository');
  assert((await stat(path)).isFile(), `Missing ${ref}`);
}
for (const image of readme.matchAll(/<img\b[^>]+>/g)) assert(/alt="[^"]+"/.test(image[0]), `Missing image description: ${image[0]}`);
assert.equal(new Set(profile.technologyIds).size, displayedTechnologies.length, 'Duplicate visible technologies');
assert.equal(new Set(profile.aiTools.map(item => item.id)).size, profile.aiTools.length, 'Duplicate AI tools');
for (const item of displayedTechnologies) assert(refs.includes(`./assets/stack/${item.id}.svg`), `No chip for ${item.id}`);
for (const item of profile.aiTools) assert(refs.includes(`./assets/ai-tools/${item.id}.svg`), `No AI tool chip for ${item.id}`);
assert(!readme.includes('How I work') && !readme.includes('/workflow/'), 'Removed workflow block was reintroduced');
assert(!profile.technologyIds.includes('csharp') && !profile.technologyIds.includes('markdown'), 'An explicitly removed badge was restored');
assert(!readme.includes('### '), 'The unified stack was split into subcategories again');
for (const capability of profile.capabilities) assert(readme.includes(capability.text), 'Missing capability description');
const links = [...readme.matchAll(/<a href="([^"]+)"/g)].map(match => match[1]);
assert.deepEqual(links, profile.contacts.map(contact => contact.url), 'Contact destinations differ from profile data');
assert(!/selected (?:work|projects)|featured projects|visitor count|github-readme-stats|\$35/i.test(readme), 'An excluded profile section was introduced');
assert(!/<(?:script|style|iframe)\b/i.test(readme), 'README contains unsupported active HTML');

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}
const assets = await walk('assets');
assert(assets.every(path => /\.(svg|png)$/.test(path)), 'Unexpected file type in publishable artwork');
for (const path of assets.filter(path => path.endsWith('.svg'))) {
  assert(refs.includes(`./${path}`), `Unused generated SVG left in the repository: ${path}`);
  const svg = await readFile(path, 'utf8');
  assert(!/<(?:script|foreignObject|text)\b|@font-face/i.test(svg), `Non-portable SVG: ${path}`);
  assert(!/(?:href|xlink:href)="(?!data:image\/png;base64,|#)/.test(svg), `External SVG dependency: ${path}`);
  assert(svg.includes('<title') && svg.includes('<desc'), `Missing image metadata: ${path}`);
  const animated = /assets\/(hero|skyline)-(desktop|mobile)\.svg$/.test(path);
  assert.equal(svg.includes('@keyframes'), animated, `Unexpected animation in ${path}`);
  if (animated) assert(svg.includes('prefers-reduced-motion:reduce'), 'Missing internal reduced-motion support');
  if (path.includes('/hero-')) assert(Buffer.byteLength(svg) < 600_000, `Oversized terminal card: ${path}`);
}
const mascot = await sharp('assets/mascot.png').metadata();
assert(mascot.hasAlpha, 'Mascot transparency was lost');
console.log(`PASS: ${displayedTechnologies.length} core technologies + ${profile.aiTools.length} AI tools, two capability descriptions, ${new Set(refs).size} local image references, four contacts; full audit inventory retained separately.`);
