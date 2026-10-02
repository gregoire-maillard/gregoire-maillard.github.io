// Link-preview images (1200×630) for every page listed on /airlinetools.html.
//
//   npm i playwright && npx playwright install chromium   (once)
//   node scripts/og/make-og.mjs                 # every tool, course and the hub
//   node scripts/og/make-og.mjs farebuild       # just one page
//
// Each image reuses the page's card on the hub: its topic (the section's data-area), title, description, pills and the
// small illustration. Output: assets/img/og/<page>.jpg. The page itself needs the og:* tags
// (copy the block marked "link previews" from any tool page and change the file names).
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const hub = fs.readFileSync(path.join(ROOT, 'airlinetools.html'), 'utf8');
const unesc = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const strip = s => unesc(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
const reg = [];
for (const area of hub.matchAll(/<section class="sec topic"[^>]*data-area="([^"]+)"[^>]*>([\s\S]*?)<\/section>/g)) {
  for (const c of area[2].matchAll(/<a class="panel tool" href="\/([a-z0-9]+)\.html">([\s\S]*?)<\/a>/g)) {
    const b = c[2];
    reg.push({ file: c[1], area: 'tool', area2: strip(area[1]), title: strip(b.match(/<h3>([\s\S]*?)<\/h3>/)[1]), desc: strip(b.match(/<p>([\s\S]*?)<\/p>/)[1]),
      pills: [...b.matchAll(/<span class="pill">([\s\S]*?)<\/span>/g)].map(m => strip(m[1])), viz: (b.match(/<div class="viz"[^>]*>\s*(<svg[\s\S]*?<\/svg>)/) || [])[1] || '' });
  }
}
for (const c of hub.matchAll(/<a class="panel course[^"]*" href="\/([a-z0-9]+)\.html">([\s\S]*?)<\/a>/g)) {
  const b = c[2], page = fs.readFileSync(path.join(ROOT, c[1] + '.html'), 'utf8');
  reg.push({ file: c[1], area: 'course', num: strip(b.match(/class="num">([\s\S]*?)<\/div>/)[1].replace('<small>', ' <small>')), title: strip(b.match(/<h3>([\s\S]*?)<\/h3>/)[1]),
    desc: strip(b.match(/<p>([\s\S]*?)<\/p>/)[1]), chapters: (page.match(/<h3 id="ch\d+"/g) || []).length });
}
const only = process.argv.slice(2);
const font = fs.readFileSync(path.join(ROOT, 'assets/fonts/inter-fleet.woff2')).toString('base64');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const tools = reg.filter(o => o.area !== 'course'), courses = reg.filter(o => o.area === 'course');
const base = `
@font-face { font-family: F; src: url(data:font/woff2;base64,${font}) format("woff2"); font-weight: 100 900; }
* { box-sizing: border-box; margin: 0; }
html, body { width: 1200px; height: 630px; }
body { font-family: F, sans-serif; color: #151A23; -webkit-font-smoothing: antialiased; overflow: hidden;
  background: radial-gradient(900px 560px at 0% -10%, rgb(36 85 230 / .12), transparent 70%), radial-gradient(760px 520px at 100% 0%, rgb(194 55 143 / .07), transparent 70%), radial-gradient(900px 600px at 50% 120%, rgb(18 161 80 / .07), transparent 70%), #EEF1F5; }
.wrap { position: absolute; inset: 0; padding: 64px 72px; display: grid; grid-template-columns: 1fr 500px; gap: 56px; }
.brand { display: flex; align-items: center; gap: 12px; font-size: 20px; font-weight: 600; }
.mk { width: 32px; height: 32px; border-radius: 9px; background: #151A23; display: grid; place-items: center; } .mk i { width: 11px; height: 11px; border-radius: 50%; background: #fff; }
.brand span { color: #5B6272; font-weight: 500; }
.txt { display: flex; flex-direction: column; min-width: 0; }
.eye { margin-top: 64px; font-size: 16px; font-weight: 600; letter-spacing: .07em; text-transform: uppercase; color: #6B7282; }
h1 { margin-top: 12px; font-size: 60px; line-height: 66px; font-weight: 650; letter-spacing: -0.035em; }
p { margin-top: 20px; font-size: 22px; line-height: 32px; color: #5B6272; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
.foot { margin-top: auto; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.pill { height: 34px; padding: 0 14px; border-radius: 8px; display: inline-flex; align-items: center; font-size: 17px; color: #5B6272; background: rgb(255 255 255 / .9); box-shadow: 0 0 0 1px rgb(15 23 42 / .08); }
.url { margin-left: auto; font-size: 17px; color: #6B7282; }
.panel { align-self: center; height: 420px; border-radius: 24px; background: rgb(255 255 255 / .75); box-shadow: 0 0 0 1px rgb(15 23 42 / .06), 0 24px 60px -30px rgb(15 23 42 / .35), inset 0 1px 0 #fff; overflow: hidden; display: grid; place-items: center; position: relative; }
.panel svg { width: 100%; height: 100%; }
.course { text-align: center; }
.course .n { font-size: 132px; line-height: 1; font-weight: 650; letter-spacing: -0.05em; }
.course .n.s { font-size: 96px; }
.course .n.xs { font-size: 76px; }
.course .n small { font-size: 40px; color: #6B7282; font-weight: 500; letter-spacing: 0; margin-left: 10px; }
.course .c { margin-top: 18px; font-size: 22px; color: #5B6272; }
.mosaic { position: absolute; inset: 20px; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: repeat(3, 1fr); gap: 14px; }
.mosaic div { border-radius: 14px; background: rgb(255 255 255 / .8); box-shadow: 0 0 0 1px rgb(15 23 42 / .06); overflow: hidden; position: relative; }
.mosaic svg { position: absolute; inset: 0; }
`;
function vizSvg(v, mode) { return v.replace('preserveAspectRatio="xMidYMid slice"', `preserveAspectRatio="xMidYMid ${mode}"`); }
function page(o) {
  let eye, title, desc, pills, right;
  if (o.file === 'airlinetools') {
    eye = 'Airline Economics'; title = 'Airline Economics'; desc = `${tools.length} interactive tools and ${courses.length} short courses on how airlines plan, price and fly. Built on open data.`;
    pills = ['Revenue management', 'Network planning', 'Loyalty', 'Cargo'];
    const pick = ['bookinglimits', 'fleettracker', 'airflows', 'memberclv', 'cargorm', 'hubbanks'].map(f => tools.find(t => t.file === f));
    right = `<div class="panel"><div class="mosaic">${pick.map(t => `<div>${vizSvg(t.viz, 'slice')}</div>`).join('')}</div></div>`;
  } else if (o.area === 'course') {
    const [a, b] = o.num.split(' ');
    eye = 'Airline Economics · Course'; title = o.title; desc = o.desc; pills = [`${o.chapters} chapters`, 'Free to read'];
    right = `<div class="panel"><div class="course"><div class="n${a.length > 9 ? ' xs' : a.length > 7 ? ' s' : ''}">${esc(a)}<small>${esc(b)}</small></div><div class="c">${esc(o.title)}</div></div></div>`;
  } else {
    eye = 'Airline Economics · ' + o.area2; title = o.title; desc = o.desc; pills = o.pills.slice(0, 3);
    right = `<div class="panel">${vizSvg(o.viz, 'meet')}</div>`;
  }
  return `<!doctype html><html><head><meta charset="utf-8"><style>${base}</style></head><body><div class="wrap">
    <div class="txt"><div class="brand"><span class="mk"><i></i></span>Grégoire Maillard</div>
      <div class="eye">${esc(eye)}</div><h1>${esc(title)}</h1><p>${esc(desc)}</p>
      <div class="foot">${pills.map(p => `<span class="pill">${esc(p)}</span>`).join('')}</div></div>
    ${right}</div></body></html>`;
}
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
const pg = await ctx.newPage();
const list = [...reg, { file: 'airlinetools', area: 'hub' }].filter(o => !only.length || only.includes(o.file));
const OUT = path.join(ROOT, 'assets/img/og');
fs.mkdirSync(OUT, { recursive: true });
for (const o of list) {
  await pg.setContent(page(o), { waitUntil: 'load' });
  await pg.evaluate(() => document.fonts.ready);
  // shrink long titles to fit two lines
  await pg.evaluate(() => { const h = document.querySelector('h1'); let s = 60; while (h.scrollHeight > 140 && s > 40) { s -= 4; h.style.fontSize = s + 'px'; h.style.lineHeight = (s * 1.1) + 'px'; } });
  await pg.screenshot({ path: path.join(OUT, o.file + '.jpg'), type: 'jpeg', quality: 86 });
}
await browser.close();
console.log('done', list.length);
