import { mkdir, writeFile, readFile, readdir, unlink, rmdir } from 'node:fs/promises';
import sharp from 'sharp';
import { profile, tokens, displayedTechnologies, escape, loadFonts, hero, chip, heading, contactCard } from './artwork.mjs';

const fonts = await loadFonts();
const paths = ['assets/stack', 'assets/ai-tools', 'assets/headings', 'assets/contacts'];
for (const path of paths) await mkdir(path, { recursive: true });

const mascot = await sharp(await readFile('assets/source/mascot.png')).resize({ width: 1000, withoutEnlargement: true }).png({ palette: true, colours: 256, dither: .25, effort: 10 }).toBuffer();
await writeFile('assets/mascot.png', mascot);
const embeddedMascot = `data:image/png;base64,${mascot.toString('base64')}`;
for (const mobile of [false, true]) {
  for (const animate of [true, false]) {
    const name = `hero-${mobile ? 'mobile' : 'desktop'}${animate ? '' : '-static'}`;
    await writeFile(`assets/${name}.svg`, hero(fonts, embeddedMascot, { mobile, animate }));
  }
}

async function headingMarkup(id, title, level = 2) {
  let dimensions;
  for (const theme of ['dark', 'light']) {
    const image = heading(title, fonts, level, theme);
    dimensions = image;
    await writeFile(`assets/headings/${id}-${theme}.svg`, image.svg);
  }
  return `${'#'.repeat(level)} <picture><source media="(prefers-color-scheme: light)" srcset="./assets/headings/${id}-light.svg"><img src="./assets/headings/${id}-dark.svg" alt="${escape(title)}" width="${dimensions.width}" height="${dimensions.height}"></picture>`;
}

const sections = [
  '<!-- Generated from design/profile.json and design/technologies.json with npm run build. -->',
  `<picture>
  <source media="(max-width: ${tokens.hero.mobileBreakpoint}px) and (prefers-reduced-motion: reduce)" srcset="./assets/hero-mobile-static.svg">
  <source media="(prefers-reduced-motion: reduce)" srcset="./assets/hero-desktop-static.svg">
  <source media="(max-width: ${tokens.hero.mobileBreakpoint}px)" srcset="./assets/hero-mobile.svg">
  <img src="./assets/hero-desktop.svg" alt="${escape(profile.name)} — ${escape(profile.role)}. ${escape(profile.hero.lines.join(' '))}" width="1200">
</picture>`,
  profile.intro,
  await headingMarkup('technologies', 'Tech stack')
];

const dimensions = {};
async function chipMarkup(items, directory) {
  const images = [];
  for (const item of items) {
    const image = chip(item, fonts);
    dimensions[item.id] = { width: image.width, height: image.height };
    await writeFile(`assets/${directory}/${item.id}.svg`, image.svg);
    images.push(`  <img src="./assets/${directory}/${item.id}.svg" alt="${escape(item.label)}" title="${escape(item.label)}" width="${image.width}" height="${image.height}">`);
  }
  return `<p>\n${images.join('\n')}\n</p>`;
}
sections.push(await chipMarkup(displayedTechnologies, 'stack'));
sections.push(await headingMarkup('ai-tools', 'AI coding tools'), await chipMarkup(profile.aiTools, 'ai-tools'));
sections.push(await headingMarkup('capabilities', 'Automation & integrations'));
sections.push(profile.capabilities.map(item => `- **${item.label}:** ${item.text}`).join('\n'));

sections.push(await headingMarkup('connect', 'Let’s connect'));

const contacts = [];
for (const [index, contact] of profile.contacts.entries()) {
  for (const mobile of [false, true]) {
    const image = contactCard(contact, fonts, { index, mobile });
    await writeFile(`assets/contacts/${contact.id}${mobile ? '-mobile' : ''}.svg`, image.svg);
  }
  contacts.push(`<a href="${escape(contact.url)}"><picture><source media="(max-width: ${tokens.hero.mobileBreakpoint}px)" srcset="./assets/contacts/${contact.id}-mobile.svg" width="50%" height="${tokens.contact.height}"><img src="./assets/contacts/${contact.id}.svg" alt="${escape(contact.label)} — ${escape(contact.action)}" width="25%" height="${tokens.contact.height}"></picture></a>`);
}
// Adjacent links avoid inline whitespace that would push the last 25%-wide card to a new row.
sections.push(`<p>${contacts.join('')}</p>`);
await writeFile('README.md', `${sections.join('\n\n')}\n`);

// These directories contain generated SVGs only. Remove exports no longer used by the profile.
const expected = {
  stack: displayedTechnologies.map(item => `${item.id}.svg`),
  'ai-tools': profile.aiTools.map(item => `${item.id}.svg`),
  headings: ['technologies', 'ai-tools', 'capabilities', 'connect'].flatMap(id => ['dark', 'light'].map(theme => `${id}-${theme}.svg`)),
  contacts: profile.contacts.flatMap(item => [`${item.id}.svg`, `${item.id}-mobile.svg`]),
  workflow: []
};
for (const [directory, filenames] of Object.entries(expected)) {
  let entries;
  try { entries = await readdir(`assets/${directory}`, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') continue; throw error; }
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.svg') && !filenames.includes(entry.name)) await unlink(`assets/${directory}/${entry.name}`);
  }
}
try { await rmdir('assets/workflow'); } catch (error) { if (!['ENOENT', 'ENOTEMPTY'].includes(error.code)) throw error; }

await mkdir('.cache', { recursive: true });
await writeFile('.cache/artwork-dimensions.json', JSON.stringify(dimensions, null, 2));
console.log(`Built README, four terminal variants, ${displayedTechnologies.length} core technologies, ${profile.aiTools.length} AI tools, capabilities and contacts.`);
