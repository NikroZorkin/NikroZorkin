import { colors, lettering, svgDocument, escape } from './artwork.mjs';

const DAY = 86400000;
const clamp = x => Math.max(0, Math.min(1, x));
const ease = x => x < .5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2;
const fmt = value => new Intl.NumberFormat('en-US').format(value);
const date = value => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(value));
const round = value => Math.round(value * 10) / 10;
const palette = ['#39302C', '#665047', '#98715E', '#BF8E73', colors.peach];
const shade = (hex, factor) => '#' + hex.slice(1).match(/../g).map(v => Math.round(parseInt(v, 16) * factor).toString(16).padStart(2, '0')).join('');

export function skylineModel(snapshot) {
  const days = snapshot.days;
  if (!days?.length) throw new Error('Fetch contribution data before building the skyline.');
  let longest = 0, run = 0, current = 0;
  const first = Date.parse(days[0].date);
  const start = first - new Date(first).getUTCDay() * DAY;
  const nonzero = days.map(d => d.count).filter(Boolean).sort((a, b) => a - b);
  const busy = nonzero[Math.floor((nonzero.length - 1) * .95)] || 1;
  const max = nonzero.at(-1) || 0;
  const cells = days.map(d => {
    run = d.count ? run + 1 : 0;
    longest = Math.max(longest, run);
    const offset = Math.round((Date.parse(d.date) - start) / DAY);
    return { ...d, week: Math.floor(offset / 7), day: offset % 7, level: d.count ? 1 + Math.min(3, Math.floor(d.count / busy * 4)) : 0, height: d.count ? .4 + (d.count / max) ** .85 * 7.2 : .16 };
  });
  let i = days.length - 1;
  if (days[i].count === 0) i--;
  for (; i >= 0 && days[i].count > 0; i--) current++;
  return { cells, weeks: cells.at(-1).week + 1, total: days.reduce((sum, d) => sum + d.count, 0), max, longest, current };
}

// The same three faces per day are projected at each frame. No chart swap or JavaScript.
export function skyline(snapshot, fonts, { mobile = false, animate = true } = {}) {
  const model = skylineModel(snapshot);
  const width = mobile ? 400 : 1000;
  const height = mobile ? 570 : 620;
  const pad = mobile ? 22 : 32;
  const area = mobile ? { x: 18, y: 125, w: 364, h: 225 } : { x: 32, y: 120, w: 936, h: 355 };
  const yaw = mobile ? .9 : .57;
  const elevation = .55;
  const label = (text, x, y, size = 14, color = colors.text) => lettering(text, x, y, size, fonts.sans, color);
  const frames = [];
  for (let step = 0; step <= 12; step++) {
    const t = step / 12;
    const e = ease(t);
    const a = yaw * e, el = Math.PI / 2 + (elevation - Math.PI / 2) * e;
    const project = (x, y, z) => [x * Math.cos(a) - y * Math.sin(a), (x * Math.sin(a) + y * Math.cos(a)) * Math.sin(el) - z * Math.cos(el)];
    const boxes = model.cells.map(cell => {
      const delay = cell.week / Math.max(1, model.weeks - 1) * .36 + cell.day / 6 * .06;
      const rise = 1 - (1 - clamp((t - delay) / .58)) ** 3;
      const z = cell.height * rise;
      const x = cell.week + .1, y = cell.day + .1, side = .8;
      const p = (dx, dy, dz) => project(x + dx, y + dy, dz);
      return [
        [p(0, side, 0), p(side, side, 0), p(side, side, z), p(0, side, z)],
        [p(side, 0, 0), p(side, side, 0), p(side, side, z), p(side, 0, z)],
        [p(0, 0, z), p(side, 0, z), p(side, side, z), p(0, side, z)]
      ];
    });
    const points = boxes.flat(2);
    const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const scale = Math.min(area.w / (maxX - minX), area.h / (maxY - minY));
    const ox = area.x + (area.w - (maxX - minX) * scale) / 2;
    const oy = area.y + (area.h - (maxY - minY) * scale) / 2;
    frames.push(boxes.map(faces => faces.map(face => face.map(([x, y], index) => `${index ? 'L' : 'M'}${round(ox + (x - minX) * scale)} ${round(oy + (y - minY) * scale)}`).join('') + 'Z')));
  }
  const sorted = model.cells.map((cell, index) => ({ cell, index })).sort((a, b) => (a.cell.week - b.cell.week) * Math.sin(yaw) + (a.cell.day - b.cell.day) * Math.cos(yaw));
  let styles = '';
  let city = '';
  for (const { cell, index } of sorted) {
    let faces = '';
    for (let face = 0; face < 3; face++) {
      const name = `day${index}face${face}`;
      const d = frames[12][index][face];
      if (animate) {
        let keys = `0%,10%,94%,100%{d:path('${frames[0][index][face]}')}`;
        for (let frame = 1; frame < 12; frame++) keys += `${round(10 + frame / 12 * 22)}%,${round(94 - frame / 12 * 18)}%{d:path('${frames[frame][index][face]}')}`;
        keys += `32%,76%{d:path('${d}')}`;
        styles += `.${name}{animation:${name} 18s linear infinite}@keyframes ${name}{${keys}}`;
      }
      faces += `<path class="${name}" d="${d}" fill="${shade(palette[cell.level], [ .78, .61, 1 ][face])}" stroke="${colors.surface}" stroke-width=".35" stroke-linejoin="round"/>`;
    }
    city += `<g><title>${escape(`${cell.date}: ${cell.count} contributions`)}</title>${faces}</g>`;
  }
  const from = date(snapshot.days[0].date), to = date(snapshot.days.at(-1).date);
  let content = `<rect x=".5" y=".5" width="${width - 1}" height="${height - 1}" rx="14" fill="${colors.surface}" stroke="${colors.border}"/>`;
  content += label('Contribution skyline', pad, 43, mobile ? 23 : 26);
  content += label(`A year of building · @${snapshot.login}`, pad, 68, mobile ? 12.5 : 15, colors.muted);
  content += label(`${from} — ${to}`, pad, 94, mobile ? 11.5 : 13, colors.sand);
  content += city;
  const divider = mobile ? 376 : 500;
  content += `<path d="M${pad} ${divider}H${width - pad}" stroke="${colors.border}"/>`;
  const stats = [[fmt(model.total), 'Contributions'], [fmt(model.max), 'Busiest day'], [`${model.longest} days`, 'Longest streak'], [`${model.current} days`, 'Current streak']];
  stats.forEach(([value, title], index) => {
    const x = pad + (index % (mobile ? 2 : 4)) * (width - pad * 2) / (mobile ? 2 : 4);
    const y = divider + 37 + (mobile ? Math.floor(index / 2) * 69 : 0);
    content += label(value, x, y, mobile ? 25 : 30, colors.peach);
    content += label(title, x, y + 21, mobile ? 12 : 13, colors.muted);
  });
  const footY = height - 21;
  content += label(`Updated ${date(snapshot.fetchedAt)}`, pad, footY, mobile ? 10 : 11, colors.muted);
  const legendX = width - pad - 132;
  content += label('Less', legendX, footY, 10, colors.muted);
  palette.forEach((color, i) => { content += `<rect x="${legendX + 28 + i * 14}" y="${footY - 9}" width="10" height="10" rx="2" fill="${color}"/>`; });
  content += label('More', legendX + 102, footY, 10, colors.muted);
  if (animate) content = `<style>${styles}@media(prefers-reduced-motion:reduce){path{animation:none!important}}</style>` + content;
  return svgDocument(width, height, `GitHub contribution skyline for ${snapshot.login}`, content, `${model.total} contributions from ${from} to ${to}. Busiest day: ${model.max}. Longest streak: ${model.longest} days. Current streak: ${model.current} days. Every block is one day; its height represents that day's contributions.`);
}
