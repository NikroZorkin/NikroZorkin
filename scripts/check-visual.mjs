import assert from 'node:assert/strict';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { createPreview, servePreview } from './preview.mjs';
import { profile, displayedTechnologies } from './artwork.mjs';

const { html } = await createPreview();
assert(html.includes('(max-width: 600px) and (prefers-reduced-motion: reduce)'), 'GitHub stripped the combined mobile/motion source');
assert(html.includes('prefers-color-scheme: light'), 'GitHub stripped theme sources');
await mkdir('preview/screenshots', { recursive: true });
await rm('preview/validation.json', { force: true });
const { server, url } = await servePreview({ port: 0 });
let browser;
const results = [];
try {
  // Use Playwright's pinned browser; a locally installed Chrome is a convenient fallback.
  try { browser = await chromium.launch(); } catch { browser = await chromium.launch({ channel: 'chrome' }); }
  for (const width of [375, 768, 1280]) {
    for (const colorScheme of ['dark', 'light']) {
      for (const reducedMotion of ['reduce', 'no-preference']) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme, reducedMotion, deviceScaleFactor: 1 });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(url, { waitUntil: 'networkidle' });
        await page.evaluate(async () => Promise.all([...document.images].map(img => img.decode())));
        const state = await page.evaluate(() => {
          const article = document.querySelector('article');
          const pictures = [...article.querySelectorAll('picture')];
          const hero = pictures[0].querySelector('img');
          return {
            documentWidth: document.documentElement.scrollWidth,
            viewportWidth: window.innerWidth,
            heroSource: hero.currentSrc,
            heroWidth: hero.getBoundingClientRect().width,
            badImages: [...article.querySelectorAll('img')].filter(img => !img.complete || !img.naturalWidth || !img.alt).map(img => img.src),
            overflow: [...article.querySelectorAll('img')].filter(img => img.getBoundingClientRect().right > article.getBoundingClientRect().right + 1).map(img => img.alt),
            chipCount: article.querySelectorAll('img[src*="/stack/"]').length,
            aiTools: [...article.querySelectorAll('img[src*="/ai-tools/"]')].map(img => img.alt),
            headings: [...article.querySelectorAll('h2 img,h3 img')].map(img => img.currentSrc),
            contacts: [...article.querySelectorAll('a:has(img[src*="/contacts/"])')].map(a => a.getAttribute('href'))
          };
        });
        assert.equal(state.documentWidth, state.viewportWidth, `Page overflow at ${width}`);
        assert.deepEqual(state.badImages, [], 'Missing or undecodable artwork');
        assert.deepEqual(state.overflow, [], 'Artwork extends beyond README');
        assert.equal(state.chipCount, displayedTechnologies.length);
        assert.deepEqual(state.aiTools, profile.aiTools.map(item => item.label));
        assert.deepEqual(state.contacts, profile.contacts.map(contact => contact.url));
        assert(state.headings.every(source => source.endsWith(`-${colorScheme}.svg`)), 'Heading theme selection failed');
        assert(state.heroSource.endsWith(`hero-${width <= 600 ? 'mobile' : 'desktop'}${reducedMotion === 'reduce' ? '-static' : ''}.svg`), 'Incorrect terminal variant');
        assert.deepEqual(errors, []);
        if (reducedMotion === 'reduce') {
          await page.screenshot({ path: `preview/screenshots/readme-${colorScheme}-${width}.png`, fullPage: true });
          if (width !== 768 && colorScheme === 'dark') await page.locator('article picture img').first().screenshot({ path: `preview/screenshots/hero-${width === 375 ? 'mobile' : 'desktop'}.png` });
        }
        results.push({ width, colorScheme, reducedMotion, passed: true, hero: state.heroSource.split('/').pop() });
        await context.close();
      }
    }
  }

  // Verify actual pixel changes in the SVG image, while all pixels outside the command stay fixed.
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark', reducedMotion: 'no-preference' });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'load' });
  const image = page.locator('article picture img').first();
  await image.evaluate(img => img.decode());
  const before = await image.screenshot({ animations: 'allow' });
  await page.waitForTimeout(1400);
  const after = await image.screenshot({ animations: 'allow' });
  const first = await sharp(before).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const second = await sharp(after).ensureAlpha().raw().toBuffer();
  const scale = first.info.width / 1200;
  let changed = 0;
  let outsideCommand = 0;
  for (let i = 0; i < second.length; i += 4) {
    const difference = Math.max(...[0, 1, 2].map(channel => Math.abs(first.data[i + channel] - second[i + channel])));
    if (difference < 8) continue;
    changed++;
    const x = (i / 4) % first.info.width;
    const y = Math.floor(i / 4 / first.info.width);
    if (x < 77 * scale || x > 550 * scale || y < 275 * scale || y > 318 * scale) outsideCommand++;
  }
  assert(changed > 30, 'The command did not animate inside an SVG image');
  assert.equal(outsideCommand, 0, 'Something outside the command is animated');
  await context.close();
  results.push({ animation: 'Only command pixels change', changedPixels: changed, outsideCommand, passed: true });

  // The static source must remain visually identical over time.
  const staticContext = await browser.newContext({ viewport: { width: 375, height: 900 }, reducedMotion: 'reduce', colorScheme: 'dark' });
  const staticPage = await staticContext.newPage();
  await staticPage.goto(url, { waitUntil: 'networkidle' });
  const staticHero = staticPage.locator('article picture img').first();
  await staticHero.evaluate(img => img.decode());
  await staticPage.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const staticBefore = await staticHero.screenshot();
  await staticPage.waitForTimeout(300);
  const staticAfter = await staticHero.screenshot();
  const beforePixels = await sharp(staticBefore).ensureAlpha().raw().toBuffer();
  const afterPixels = await sharp(staticAfter).ensureAlpha().raw().toBuffer();
  assert.equal(afterPixels.length, beforePixels.length, 'Reduced-motion card dimensions changed');
  let maxChannelDifference = 0;
  for (let i = 0; i < beforePixels.length; i++) maxChannelDifference = Math.max(maxChannelDifference, Math.abs(afterPixels[i] - beforePixels[i]));
  // Chromium can round filtered SVG colors by one 8-bit value between paints.
  // Any movement or blinking produces larger differences and still fails.
  assert(maxChannelDifference <= 1, 'Reduced-motion card changed');
  await staticContext.close();
  results.push({ reducedMotion: 'Static image is stable within rasterization rounding', maxChannelDifference, passed: true });
  await writeFile('preview/validation.json', JSON.stringify({ renderer: 'GitHub Markdown API + Chromium', results }, null, 2));
  console.log(`PASS: ${results.length} browser scenarios; screenshots in preview/screenshots/.`);
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
