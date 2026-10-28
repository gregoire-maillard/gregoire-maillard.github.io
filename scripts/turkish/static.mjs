// Pre-renders the Turkish course for dailyturkish.app, so search engines read it without JavaScript.
//
//   node scripts/turkish/static.mjs <mirror folder>
//
// Run from the repo root by .github/workflows/sync-dailyturkish.yml, on the folder it is about to publish
// (turkish*.html, index.html = turkish.html, assets/...). Needs Playwright with Chromium.
// It serves that folder on localhost, opens each page in headless Chromium (outside requests blocked,
// window.TRK_STATIC_GUIDES = true so links point to the static guide pages), copies the rendered HTML
// into the page's own source, and writes:
//   guides/<unit>-grammar.html, guides/<unit>-culture.html   one page per guide and interlude
//                                                            (units not written yet: noindex)
//   turkishguide.html                                         the index, filled in
//   turkish.html, index.html                                  the hub, with the path filled in
//   sitemap.xml                                               the hub, the index, cards, privacy, every written guide
// The pages keep their scripts: in a browser they render again as usual (progress, speaker buttons, quiz).
// Exits 1 if any page fails to render, so the workflow publishes nothing rather than a broken mirror.

import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { join, extname, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";

const SITE = "https://dailyturkish.app";
const OUT = resolve(process.argv[2] || "");
if (!process.argv[2] || !existsSync(join(OUT, "turkishguide.html"))) {
  console.error("usage: node scripts/turkish/static.mjs <mirror folder containing turkishguide.html>");
  process.exit(2);
}

// ── a static server for the mirror folder ──
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2", ".txt": "text/plain" };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  const f = join(OUT, p);
  if (!f.startsWith(OUT) || !existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end("not found"); return; }
  res.writeHead(200, { "content-type": TYPES[extname(f)] || "application/octet-stream" });
  res.end(readFileSync(f));
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const BASE = "http://127.0.0.1:" + server.address().port;

// ── helpers ──
const attr = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const text = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// Replace exactly one occurrence, or stop: a changed page template must not publish half-filled pages.
function swap(src, re, by, what) {
  const n = (src.match(new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g")) || []).length;
  if (n !== 1) throw new Error(`template: expected one ${what}, found ${n}`);
  return src.replace(re, () => by);
}
function setHead(src, m) {
  src = swap(src, /<title>[^<]*<\/title>/, `<title>${text(m.title)}</title>`, "<title>");
  src = swap(src, /<meta name="description" content="[^"]*">/, `<meta name="description" content="${attr(m.description)}">` +
    (m.noindex ? `\n    <meta name="robots" content="noindex">` : ""), "meta description");
  src = swap(src, /<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${attr(m.ogTitle)}">`, "og:title");
  src = swap(src, /<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${attr(m.ogDescription)}">`, "og:description");
  src = swap(src, /<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${attr(m.canonical)}">`, "canonical");
  src = swap(src, /<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${attr(m.canonical)}">`, "og:url");
  return src;
}
const today = new Date().toISOString().slice(0, 10);
function lastmod(files) {
  let best = "";
  for (const f of files) {
    try { const d = execFileSync("git", ["log", "-1", "--format=%cs", "--", f], { encoding: "utf8" }).trim(); if (d > best) best = d; } catch { /* not in git */ }
  }
  return best || today;
}

// ── the browser ──
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "en-CA" });
await context.route("**/*", (route) => (route.request().url().startsWith(BASE) ? route.continue() : route.abort()));
await context.addInitScript(() => {
  window.TRK_STATIC_GUIDES = true;
  // No reading is "seen" while rendering: a guide must not come out marked as read.
  window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } };
});
const page = await context.newPage();
const problems = [];
page.on("pageerror", (e) => problems.push("script error: " + e.message));
page.on("requestfailed", (r) => { if (r.url().startsWith(BASE)) problems.push("failed: " + r.url()); });
page.on("response", (r) => { if (r.url().startsWith(BASE) && r.status() >= 400) problems.push(r.status() + ": " + r.url()); });

async function render(path, ready) {
  problems.length = 0;
  await page.goto(BASE + path, { waitUntil: "load" });
  await page.waitForFunction(ready, null, { timeout: 15000 });
  if (problems.length) throw new Error(path + ": " + problems.join("; "));
  return page.evaluate(() => {
    const v = (sel, a) => { const el = document.querySelector(sel); return el ? el.getAttribute(a) : ""; };
    const h = (id) => { const el = document.getElementById(id); return el ? el.innerHTML : null; };
    return {
      title: document.title, description: v('meta[name="description"]', "content"),
      ogTitle: v('meta[property="og:title"]', "content"), ogDescription: v('meta[property="og:description"]', "content"),
      canonical: v('link[rel="canonical"]', "href"),
      rail: h("rail"), main: h("main"), lvlNav: h("lvl-nav"), levels: h("levels"), pathMeta: h("path-meta")
    };
  });
}
const guideDone = () => !!document.querySelector("#main h1.doc-title") || (!!document.querySelector("#main") && !document.querySelector("#main .loading") && document.querySelector("#main").children.length > 0);

// ── guide pages ──
const guideSrc = readFileSync(join(OUT, "turkishguide.html"), "utf8");
function guidePage(r, id, noindex) {
  let s = setHead(guideSrc, { ...r, noindex });
  s = swap(s, /<header id="rail"><\/header>/, `<header id="rail">${r.rail}</header>`, "#rail");
  s = swap(s, /<div id="main"><p class="loading">[^<]*<\/p><\/div>/, `<div id="main">${r.main}</div>`, "#main");
  s = swap(s, /\n\s*<noscript><p class="notice">The grammar guides need JavaScript to show\.<\/p><\/noscript>/, "", "noscript");
  if (id) s = swap(s, /<body>/, `<body data-guide="${attr(id)}">`, "<body>");
  return s;
}

const index = JSON.parse(readFileSync(join(OUT, "assets/data/turkish/index.json"), "utf8"));
const units = index.levels.flatMap((lv) => lv.units);
mkdirSync(join(OUT, "guides"), { recursive: true });
const sitemap = [];
let written = 0, soon = 0;
try {
  for (const u of units) {
    for (const kind of ["grammar", "culture"]) {
      const id = `${u.id}-${kind}`, ready = u.status === "ready";
      const r = await render(`/turkishguide.html?id=${id}`, guideDone);
      if (!r.main || !/doc-title/.test(r.main)) throw new Error(id + ": no guide rendered");
      const want = `${SITE}/guides/${id}.html`;
      if (r.canonical !== want) throw new Error(`${id}: canonical ${r.canonical}, expected ${want}`);
      writeFileSync(join(OUT, "guides", id + ".html"), guidePage(r, id, !ready));
      if (ready) { written++; sitemap.push({ loc: want, lastmod: lastmod([`assets/data/turkish/${kind}/${u.id}.json`, "turkishguide.html"]) }); }
      else soon++;
    }
  }

  // ── the index of guides ──
  const ix = await render("/turkishguide.html", guideDone);
  writeFileSync(join(OUT, "turkishguide.html"), guidePage(ix, null, false));

  // ── the hub: the path (levels, units, lessons, links to every guide). "Today" stays personal. ──
  const hub = await render("/turkish.html", () => !!document.querySelector("#levels details.level"));
  for (const f of ["turkish.html", "index.html"]) {
    let s = readFileSync(join(OUT, f), "utf8");
    s = swap(s, /<span id="path-meta"><\/span>/, `<span id="path-meta">${hub.pathMeta}</span>`, "#path-meta");
    s = swap(s, /<nav class="lvl-nav" id="lvl-nav" aria-label="Levels"><\/nav>/, `<nav class="lvl-nav" id="lvl-nav" aria-label="Levels">${hub.lvlNav}</nav>`, "#lvl-nav");
    s = swap(s, /<div id="levels"><\/div>/, `<div id="levels">${hub.levels}</div>`, "#levels");
    writeFileSync(join(OUT, f), s);
  }
} catch (e) {
  console.error("turkish-static: " + e.message);
  await browser.close(); server.close();
  process.exit(1);
}
await browser.close();
server.close();

// ── sitemap.xml ──
const head = [
  { loc: SITE + "/", lastmod: lastmod(["turkish.html", "assets/data/turkish/index.json"]) },
  { loc: SITE + "/turkishguide.html", lastmod: lastmod(["turkishguide.html", "assets/data/turkish/index.json"]) },
  { loc: SITE + "/turkishcards.html", lastmod: lastmod(["turkishcards.html"]) },
  { loc: SITE + "/turkishprivacy.html", lastmod: lastmod(["turkishprivacy.html"]) }
];
writeFileSync(join(OUT, "sitemap.xml"), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  head.concat(sitemap).map((x) => `  <url><loc>${text(x.loc)}</loc><lastmod>${x.lastmod}</lastmod></url>`).join("\n") + "\n</urlset>\n");

console.log(`turkish-static: ${written} guide pages, ${soon} coming-soon pages (noindex), index and hub filled in, sitemap with ${head.length + sitemap.length} URLs`);
