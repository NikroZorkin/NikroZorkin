import { readFileSync } from 'node:fs';
import { create } from 'fontkit';
import { decompress } from 'wawoff2';
import * as simpleIcons from 'simple-icons';

export const profile = JSON.parse(readFileSync(new URL('../design/profile.json', import.meta.url)));
export const tokens = JSON.parse(readFileSync(new URL('../design/tokens.json', import.meta.url)));
export const inventory = JSON.parse(readFileSync(new URL('../design/technologies.json', import.meta.url)));
const brandAssets = JSON.parse(readFileSync(new URL('../design/brand-icons.json', import.meta.url))).icons;
const technologyIndex = new Map(inventory.groups.flatMap(group => group.items).map(item => [item.id, item]));
export const displayedTechnologies = profile.technologyIds.map(id => {
  const item = technologyIndex.get(id);
  if (!item) throw new Error(`Unknown profile technology: ${id}`);
  return item;
});
export const colors = tokens.colors;
export const icons = new Map(Object.values(simpleIcons).filter(value => value?.slug).map(icon => [icon.slug, icon]));

export const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const round = number => Math.round(number * 100) / 100;

export async function loadFonts() {
  const fonts = {};
  // The decoder shares a WASM heap, so font decoding is deliberately sequential.
  for (const [key, spec] of Object.entries(tokens.fonts)) {
    let font;
    try {
      const bytes = readFileSync(spec.file);
      // Decode WOFF2 first: fontkit's variable-instance reader expects an SFNT directory.
      font = create(bytes.toString('ascii', 0, 4) === 'wOF2' ? Buffer.from(await decompress(bytes)) : bytes);
    } catch (error) {
      throw new Error(`Cannot load ${spec.family} at ${spec.file}. See MAINTAINING.md. Existing artwork does not need fonts to display.`, { cause: error });
    }
    fonts[key] = Object.keys(font.variationAxes ?? {}).length ? font.getVariation({ wght: spec.weight }) : font;
  }
  return fonts;
}

function layout(text, font) {
  return font.layout(text, { liga: false, clig: false });
}

export function measure(text, font, size) {
  return layout(text, font).positions.reduce((sum, position) => sum + position.xAdvance, 0) * size / font.unitsPerEm;
}

export function lettering(text, x, y, size, font, fill = colors.text, attributes = '') {
  const run = layout(text, font);
  let penX = 0;
  let penY = 0;
  const paths = run.glyphs.map((glyph, i) => {
    const position = run.positions[i];
    if (glyph.id === 0) throw new Error(`The chosen font has no glyph for ${JSON.stringify(text)}.`);
    const path = glyph.path.toSVG().replace(/-?\d+\.\d+/g, number => String(round(Number(number))));
    const element = path ? `<path transform="translate(${round(penX + position.xOffset)} ${round(penY + position.yOffset)})" d="${path}"/>` : '';
    penX += position.xAdvance;
    penY += position.yAdvance;
    return element;
  }).join('');
  const scale = size / font.unitsPerEm;
  return `<g ${attributes} fill="${fill}" transform="translate(${x} ${y}) scale(${scale} ${-scale})">${paths}</g>`;
}

export function svgDocument(width, height, title, content, description = '') {
  const viewBox = typeof width === 'number' ? ` viewBox="0 0 ${width} ${height}"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}"${viewBox} role="img" aria-labelledby="title description"><title id="title">${escape(title)}</title><desc id="description">${escape(description || title)}</desc>${content}</svg>\n`;
}

function readableBrandColor(hex) {
  const rgb = hex.match(/../g).map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  const luminance = .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
  return luminance < .07 ? colors.text : `#${hex}`;
}

export function brandMark(item, x, y, size, fonts, forceColor) {
  if (item.assetIcon) {
    const asset = brandAssets[item.assetIcon];
    if (!asset) throw new Error(`Unknown local brand icon: ${item.assetIcon}`);
    const fill = forceColor || asset.color;
    return `<g transform="translate(${x} ${y}) scale(${size / asset.viewBox[2]})" fill="${fill}" fill-rule="evenodd">${asset.body.replaceAll('currentColor', fill)}</g>`;
  }
  if (item.icon) {
    const icon = icons.get(item.icon);
    if (!icon) throw new Error(`Unknown Simple Icons slug: ${item.icon} (${item.label}). Choose an explicit monogram instead.`);
    return `<path transform="translate(${x} ${y}) scale(${size / 24})" fill="${forceColor || readableBrandColor(icon.hex)}" d="${icon.path}"/>`;
  }
  if (item.symbol === 'mail') {
    return `<g transform="translate(${x} ${y}) scale(${size / 24})" fill="none" stroke="${forceColor || colors.peach}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="m3 6 9 7 9-7"/></g>`;
  }
  const mono = item.monogram || item.label.slice(0, 2);
  const fontSize = Math.min(14, size / (mono.length * .62));
  const width = measure(mono, fonts.sans, fontSize);
  return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="4" fill="${colors.peach}" fill-opacity=".1"/>${lettering(mono, x + (size - width) / 2, y + size / 2 + fontSize * .34, fontSize, fonts.sans, forceColor || colors.peach)}`;
}

export function chip(item, fonts) {
  const { height, fontSize, radius, iconSize } = tokens.chip;
  const width = Math.ceil(43 + measure(item.label, fonts.sans, fontSize) + 14);
  const content = `<rect x=".5" y=".5" width="${width - 1}" height="${height - 1}" rx="${radius}" fill="${colors.surface}" stroke="${colors.border}"/>${brandMark(item, 13, 9, iconSize, fonts)}${lettering(item.label, 43, 24, fontSize, fonts.sans)}`;
  return { width: width + 3, height: height + 5, svg: svgDocument(width + 3, height + 5, item.label, content) };
}

export function heading(text, fonts, level, theme) {
  const size = level === 2 ? 25 : 18;
  const height = level === 2 ? 34 : 25;
  const width = Math.ceil(measure(text, fonts.sans, size)) + 2;
  const fill = theme === 'light' ? '#3E3430' : colors.text;
  return { width, height, svg: svgDocument(width, height, text, lettering(text, 0, size, size, fonts.sans, fill)) };
}

export function contactCard(contact, fonts, { index, mobile = false }) {
  const { height, radius, gap, surface, border } = tokens.contact;
  const columns = mobile ? 2 : 4;
  const column = index % columns;
  const left = .5 + column * gap / columns;
  const right = .5 + (columns - 1 - column) * gap / columns;
  const content = `<rect x="${left}" y=".5" width="100%" style="width:calc(100% - ${left + right}px)" height="${height - 8}" rx="${radius}" fill="${surface}" stroke="${border}"/>${brandMark(contact, left + 16, 16, 24, fonts, colors.peach)}${lettering(contact.label, left + 16, 62, 20, fonts.sans)}${lettering(contact.action, left + 16, 82, 12.5, fonts.sans, colors.muted)}<svg x="100%" width="24" height="40" overflow="visible"><path transform="translate(-${right + 24} 18)" d="m0 7 7-7m-6 0h6v6" fill="none" stroke="${colors.peach}" stroke-opacity=".7" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  // Fluid SVG width without a viewBox keeps the lettering at a readable fixed size.
  return { height, svg: svgDocument('100%', height, `${contact.label} — ${contact.action}`, content) };
}

function commandLine(fonts, x, y, size, animate) {
  const text = profile.hero.command;
  const period = profile.hero.cycleSeconds;
  const advance = measure('M', fonts.mono, size);
  const width = measure(text, fonts.mono, size);
  let style = '';
  let glyphs = '';
  let cursorFrames = `0%,5%{transform:translateX(0px)}`;
  for (const [i, char] of [...text].entries()) {
    const reveal = 5 + (i + 1) / text.length * 28;
    style += `.char-${i}{animation:char-${i} ${period}s step-end infinite}@keyframes char-${i}{0%,${round(reveal - .01)}%{opacity:0}${round(reveal)}%,97%{opacity:1}97.01%,100%{opacity:0}}`;
    cursorFrames += `${round(reveal)}%{transform:translateX(${round(advance * (i + 1))}px)}`;
    glyphs += `<g class="command-character char-${i}">${lettering(char, x + advance * i, y, size, fonts.mono, colors.peach)}</g>`;
  }
  cursorFrames += `97%{transform:translateX(${round(width)}px)}97.01%,100%{transform:translateX(0px)}`;
  style += `.cursor-travel{transform:translateX(${round(width)}px);animation:cursor-travel ${period}s step-end infinite}.cursor-blink{animation:cursor-blink 1s step-end infinite}@keyframes cursor-travel{${cursorFrames}}@keyframes cursor-blink{0%,49%{opacity:1}50%,100%{opacity:0}}@media(prefers-reduced-motion:reduce){.command-character,.cursor-travel,.cursor-blink{animation:none!important;opacity:1}.cursor-travel{transform:translateX(${round(width)}px)}}`;
  const cursor = `<g class="cursor-travel"${animate ? '' : ` transform="translate(${round(width)} 0)"`}><rect class="cursor-blink" x="${x + 1}" y="${y + 4}" width="${advance * .65}" height="2" rx="1" fill="${colors.peach}"/></g>`;
  return (animate ? `<style>${style}</style>` : '') + glyphs + cursor;
}

export function hero(fonts, mascot, { mobile = false, animate = true } = {}) {
  const width = mobile ? tokens.hero.mobileWidth : tokens.hero.desktopWidth;
  const height = mobile ? tokens.hero.mobileHeight : tokens.hero.desktopHeight;
  const topbar = mobile ? 52 : 61;
  const defs = `<defs><linearGradient id="frame" x2="0" y2="1"><stop stop-color="#443630"/><stop offset="1" stop-color="#302826"/></linearGradient><linearGradient id="screen" x2=".9" y2="1"><stop stop-color="#2B2624"/><stop offset="1" stop-color="#201E1E"/></linearGradient><radialGradient id="glow"><stop stop-color="#BC8B73" stop-opacity=".08"/><stop offset="1" stop-color="#BC8B73" stop-opacity="0"/></radialGradient><filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".73" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".08"/></feComponentTransfer><feBlend in="SourceGraphic" mode="soft-light"/></filter><clipPath id="bounds"><rect x="2" y="2" width="${width - 4}" height="${height - 4}" rx="13"/></clipPath></defs>`;
  let scene = `<rect x="2" y="2" width="${width - 4}" height="${height - 4}" rx="13" fill="url(#frame)" stroke="${colors.border}" stroke-width="2"/><rect x="7" y="${topbar}" width="${width - 14}" height="${height - topbar - 7}" rx="10" fill="url(#screen)"/><rect x="7" y="7" width="${width - 14}" height="${height - 14}" rx="10" fill="transparent" filter="url(#grain)" opacity=".28"/>`;
  const dotY = mobile ? 28 : 34;
  const dotR = mobile ? 7 : 10;
  const dotStep = mobile ? 24 : 33;
  [colors.peach, colors.sand, '#66514B'].forEach((color, i) => {
    scene += `<circle cx="${(mobile ? 25 : 39) + i * dotStep}" cy="${dotY}" r="${dotR}" fill="${color}"/>`;
  });
  scene += `<path d="M${width - 49} ${dotY}h23" stroke="${colors.sand}" stroke-width="2" stroke-linecap="round" opacity=".7"/>`;

  if (!mobile) {
    scene += `<ellipse cx="932" cy="245" rx="280" ry="195" fill="url(#glow)"/><path d="M95 87v170" stroke="#705B51" stroke-opacity=".5" stroke-width="2"/>`;
    [1, 2, 3, 4, 5].forEach((number, i) => { scene += lettering(String(number), 46, 119 + 34 * i, 22, fonts.mono, '#A38C7E', 'opacity=".7"'); });
    scene += lettering(profile.hero.greeting, 115, 120, 33, fonts.mono);
    scene += lettering(profile.role, 139, 157, 24, fonts.mono);
    scene += lettering(profile.hero.lines[0], 139, 218, 23, fonts.mono);
    scene += lettering(profile.hero.lines[1], 139, 252, 23, fonts.mono);
    scene += lettering('$', 48, 305, 25, fonts.mono, colors.peach);
    scene += commandLine(fonts, 82, 305, 25, animate);
    scene += lettering('{ }', 709, 124, 33, fonts.mono, colors.sand, 'opacity=".65"');
    scene += lettering('</>', 1142, 213, 28, fonts.mono, colors.sand, 'opacity=".7"');
    scene += `<path d="M706 204h31m-46 15h30m419 61h26m-13 16h-30" fill="none" stroke="${colors.sand}" stroke-width="2.5" stroke-linecap="round" opacity=".55"/>`;
    scene += `<image x="725" y="20" width="432" height="324" preserveAspectRatio="xMidYMid meet" xlink:href="${mascot}"/>`;
  } else {
    scene += lettering('< Hi, I’m', 27, 95, 24, fonts.mono);
    scene += lettering(`${profile.name} />`, 27, 133, 29, fonts.mono);
    scene += lettering('Full-Stack Web Developer', 28, 172, 20, fonts.mono);
    scene += lettering('UI/UX Designer', 28, 199, 20, fonts.mono, colors.sand);
    scene += lettering(profile.hero.lines[0], 28, 240, 18.5, fonts.mono);
    scene += lettering(profile.hero.lines[1], 28, 266, 18.5, fonts.mono);
    scene += lettering('$', 28, 308, 18.5, fonts.mono, colors.peach);
    scene += commandLine(fonts, 50, 308, 18.5, animate);
    scene += lettering('{ }', 32, 393, 32, fonts.mono, colors.sand, 'opacity=".45"');
    scene += lettering('</>', 45, 467, 29, fonts.mono, colors.sand, 'opacity=".5"');
    scene += `<path d="M37 435h27m-11 61h26" stroke="${colors.sand}" stroke-width="2" stroke-linecap="round" opacity=".45"/>`;
    scene += `<image x="101" y="316" width="288" height="216" xlink:href="${mascot}"/>`;
  }
  // The artwork has its fingers at the bottom; the border remains behind them.
  const description = `${profile.role}. ${profile.hero.lines.join(' ')} ${profile.hero.command} A dark-haired illustrated character peeks over the lower edge of a warm brown terminal.`;
  return svgDocument(width, height, profile.name, defs + `<g clip-path="url(#bounds)">${scene}</g>`, description);
}
