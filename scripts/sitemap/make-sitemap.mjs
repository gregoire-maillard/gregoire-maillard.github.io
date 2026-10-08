// sitemap.xml for the whole site: every page a visitor can reach by following links from the home page.
//
//   node scripts/sitemap/make-sitemap.mjs        (no dependencies; run it after committing, see lastmod)
//
// Starts at index.html and follows links to other .html pages in the repo. Links inside HTML comments
// don't count, so a project commented out of index.html stays out of the sitemap, and so does any page
// nothing links to. Redirect pages and pages marked <meta name="robots" content="noindex"> are skipped.
// lastmod is the date of the page's last commit, so commit the pages first, then run this.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SITE = 'https://' + fs.readFileSync(path.join(ROOT, 'CNAME'), 'utf8').trim();
const pages = new Set(fs.readdirSync(ROOT).filter(f => f.endsWith('.html')));
const seen = new Map();
const queue = ['index.html'];
while (queue.length) {
  const f = queue.shift();
  if (seen.has(f) || !pages.has(f)) continue;
  const html = fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  seen.set(f, html);
  for (const m of html.matchAll(/["']\.?\/?([A-Za-z0-9_-]+\.html)(?:#[^"'\s]*)?["']/g)) if (!seen.has(m[1])) queue.push(m[1]);
}
const skip = h => /<meta[^>]+name=["']robots["'][^>]+noindex/i.test(h) || /http-equiv=["']refresh["']|location\.replace\(/i.test(h);
const keep = [...seen].filter(([, h]) => !skip(h)).map(([f]) => f)
  .sort((a, b) => (a === 'index.html' ? -1 : b === 'index.html' ? 1 : a.localeCompare(b)));
const lastmod = f => {
  try { return execFileSync('git', ['log', '-1', '--format=%ci', '--', f], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).slice(0, 10); }
  catch (e) { return ''; }
};
const urls = keep.map(f => {
  const d = lastmod(f);
  return `  <url><loc>${SITE}/${f === 'index.html' ? '' : f}</loc>${d ? `<lastmod>${d}</lastmod>` : ''}</url>`;
});
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
console.log(`sitemap.xml: ${keep.length} pages`);
console.log(`left out: ${[...pages].filter(f => !keep.includes(f)).sort().join(', ')}`);
