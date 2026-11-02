// Pre-renders the Turkmen course (Daily Turkmen) for dailyturkish.app/turkmen/, so search engines read it without JavaScript.
//
//   node scripts/turkmen/static.mjs <mirror folder>
//
// Run from the repo root by .github/workflows/sync-dailyturkish.yml, after scripts/turkish/static.mjs, on the folder it is
// about to publish (turkmen/*.html, assets/js/turkmen.js, assets/data/turkmen/...). Needs Playwright with Chromium.
// A fork of scripts/turkish/static.mjs that loads nothing from it (TM-PROJECT.md 2). It serves that folder on localhost, opens
// each page in headless Chromium (outside requests blocked), copies the rendered HTML into the page's own source, and writes:
//   turkmen/guides/<unit>-grammar.html, -culture.html   one page per guide and interlude (units not written yet: noindex),
//                                                        rendered where it is published, one folder down (TKM_BASE "../")
//   turkmen/guide.html                                   the index, filled in
//   turkmen/index.html                                   the hub, with the path filled in ("Today" stays personal)
//   + schema.org JSON-LD: a BreadcrumbList on the guides and the index
//   sitemap.xml                                          the Turkmen hub, index, flashcards and every written guide, added
//                                                        to the sitemap.xml the Turkish step wrote
// Every Turkmen page of the mirror gets window.TKM_STATIC_GUIDES = true before turkmen.js, so its links lead to the static
// guides also when it renders again in a browser (progress, quiz), and its links to /turkish.html become "/", the
// Daily Turkish hub's one address on dailyturkish.app. Canonical and og: URLs are on dailyturkish.app/turkmen/ in the pages
// themselves; a guide's canonical is checked against its static address.
// Exits 1 if any page fails to render, so the workflow publishes nothing rather than a broken mirror.

import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, readdirSync } from "node:fs";
import { join, extname, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";

const SITE = "https://dailyturkish.app";
const HOME = SITE + "/turkmen/";
const OUT = resolve(process.argv[2] || "");
const TM = join(OUT, "turkmen");
if (!process.argv[2] || !existsSync(join(TM, "guide.html")) || !existsSync(join(OUT, "sitemap.xml"))) {
  console.error("usage: node scripts/turkmen/static.mjs <mirror folder containing turkmen/guide.html and sitemap.xml>\n" +
    "       (run it after scripts/turkish/static.mjs, which writes sitemap.xml)");
  process.exit(2);
}

// ── a static server for the mirror folder ──
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".txt": "text/plain" };
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
const ld = (o) => `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", ...o }).replace(/</g, "\\u003c")}</script>`;
const crumbs = (trail) => ld({ "@type": "BreadcrumbList", itemListElement: trail.map(([name, item], i) => ({ "@type": "ListItem", position: i + 1, name, item })) });
const addLd = (src, block, what) => swap(src, /\n\s*<\/head>/, `\n    ${block}\n  </head>`, `</head> of ${what}`);
const HOME_CRUMB = ["Daily Turkmen", HOME];
const GUIDES_CRUMB = ["Grammar guides", HOME + "guide.html"];

// Before turkmen.js loads: links to the static guides and, for a page one folder down, the way up to the course (TKM_BASE).
const withFlags = (src, base, what) => swap(src, /<script defer src="\/assets\/js\/turkmen\.js"><\/script>/,
  `<script>window.TKM_STATIC_GUIDES = true;${base ? ` window.TKM_BASE = "${base}";` : ""}</script>\n    <script defer src="/assets/js/turkmen.js"></script>`,
  `turkmen.js script tag of ${what}`);
// One folder down, the header bar's relative links (index.html, cards.html…) go up a folder. Only the header: the page's
// scripts build their links from TKM.C.PAGES, which TKM_BASE already prefixes.
function headerUp(src, what) {
  const a = src.indexOf("<body>"), b = src.indexOf("<main");
  if (a < 0 || b < a || !/class="at-hdr"/.test(src.slice(a, b))) throw new Error(`template: no header bar between <body> and <main> in ${what}`);
  return src.slice(0, a) + src.slice(a, b).replace(/href="(?![a-z][a-z0-9+.-]*:|\/|#)([^"]*)"/gi, 'href="../$1"') + src.slice(b);
}

// ── the browser ──
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "en-CA" });
await context.route("**/*", (route) => (route.request().url().startsWith(BASE) ? route.continue() : route.abort()));
await context.addInitScript(() => {
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

const index = JSON.parse(readFileSync(join(OUT, "assets/data/turkmen/index.json"), "utf8"));
const units = index.levels.flatMap((lv) => lv.units);
const unitMeta = new Map();
index.levels.forEach((lv) => lv.units.forEach((u, i) => unitMeta.set(u.id, { label: `${lv.cefr} · Unit ${i + 1}`, title: u.title, interlude: u.interlude })));

// ── guide pages: guide.html with the rendered rail and guide ──
function guidePage(src, r, id, noindex) {
  let s = setHead(src, { ...r, noindex });
  s = swap(s, /<header id="rail"><\/header>/, `<header id="rail">${r.rail}</header>`, "#rail");
  s = swap(s, /<div id="main"><p class="loading">[^<]*<\/p><\/div>/, `<div id="main">${r.main}</div>`, "#main");
  s = swap(s, /\n\s*<noscript><p class="notice">The grammar guides need JavaScript to show\.<\/p><\/noscript>/, "", "noscript");
  const trail = [HOME_CRUMB, GUIDES_CRUMB];
  if (id) {
    const m = /^(.+)-(grammar|culture)$/.exec(id), u = unitMeta.get(m[1]);
    trail.push([`${u.label}: ${m[2] === "grammar" ? u.title : "Interlude, " + u.interlude}`, `${HOME}guides/${id}.html`]);
  }
  if (!noindex) s = addLd(s, crumbs(trail), id || "turkmen/guide.html");
  return s;
}

const sitemap = [];
let written = 0, soon = 0;
try {
  const guideSrc = headerUp(withFlags(readFileSync(join(TM, "guide.html"), "utf8"), "../", "turkmen/guide.html"), "turkmen/guide.html");
  // Every page links to the static guides, in the browser as here.
  for (const f of ["index.html", "guide.html", "cards.html", "lesson.html"]) {
    writeFileSync(join(TM, f), withFlags(readFileSync(join(TM, f), "utf8"), "", "turkmen/" + f));
  }
  mkdirSync(join(TM, "guides"), { recursive: true });
  for (const u of units) {
    for (const kind of ["grammar", "culture"]) {
      const id = `${u.id}-${kind}`, ready = u.status === "ready", file = join(TM, "guides", id + ".html");
      const src = swap(guideSrc, /<body>/, `<body data-guide="${attr(id)}">`, "<body>");
      writeFileSync(file, src);   // rendered where it is published, so its links are the ones a visitor follows
      const r = await render(`/turkmen/guides/${id}.html`, guideDone);
      if (!r.main || !/doc-title/.test(r.main)) throw new Error(id + ": no guide rendered");
      const want = `${HOME}guides/${id}.html`;
      if (r.canonical !== want) throw new Error(`${id}: canonical ${r.canonical}, expected ${want}`);
      writeFileSync(file, guidePage(src, r, id, !ready));
      if (ready) { written++; sitemap.push({ loc: want, lastmod: lastmod([`assets/data/turkmen/${kind}/${u.id}.json`, "turkmen/guide.html"]) }); }
      else soon++;
    }
  }

  // ── the index of guides ──
  const ix = await render("/turkmen/guide.html", guideDone);
  if (ix.canonical !== HOME + "guide.html") throw new Error(`turkmen/guide.html: canonical ${ix.canonical}, expected ${HOME}guide.html`);
  writeFileSync(join(TM, "guide.html"), guidePage(readFileSync(join(TM, "guide.html"), "utf8"), ix, null, false));

  // ── the hub: the path (levels, units, lessons, links to every guide). "Today" stays personal. ──
  // The path is drawn first from index.json, then again as each level's file brings its summary: wait for those.
  const sums = index.levels.filter((lv) => existsSync(join(OUT, "assets/data/turkmen/levels", lv.id + ".json"))).length;
  const hub = await render("/turkmen/index.html", `document.querySelectorAll("#levels details.level").length === ${index.levels.length} && ` +
    `document.querySelectorAll("#levels .lvl-sum").length === ${sums}`);
  let s = readFileSync(join(TM, "index.html"), "utf8");
  s = swap(s, /<span id="path-meta"><\/span>/, `<span id="path-meta">${hub.pathMeta}</span>`, "#path-meta");
  s = swap(s, /<nav class="lvl-nav" id="lvl-nav" aria-label="Levels"><\/nav>/, `<nav class="lvl-nav" id="lvl-nav" aria-label="Levels">${hub.lvlNav}</nav>`, "#lvl-nav");
  s = swap(s, /<div id="levels"><\/div>/, `<div id="levels">${hub.levels}</div>`, "#levels");
  writeFileSync(join(TM, "index.html"), s);
} catch (e) {
  console.error("turkmen-static: " + e.message);
  await browser.close(); server.close();
  process.exit(1);
}
await browser.close();
server.close();

// ── the link back to Daily Turkish: "/" is its hub on dailyturkish.app (as scripts/turkish/static.mjs does for its pages) ──
let relinked = 0;
(function relink(dir) {
  for (const name of readdirSync(dir)) {
    const f = join(dir, name);
    if (statSync(f).isDirectory()) { relink(f); continue; }
    if (!name.endsWith(".html")) continue;
    const s = readFileSync(f, "utf8"), t = s.replace(/href="\/turkish\.html(?=["#])/g, 'href="/');
    if (t !== s) { writeFileSync(f, t); relinked++; }
  }
})(TM);

// ── sitemap.xml: the Turkmen pages after the Turkish ones ──
const head = [
  { loc: HOME, lastmod: lastmod(["turkmen/index.html", "assets/data/turkmen/index.json"]) },
  { loc: HOME + "guide.html", lastmod: lastmod(["turkmen/guide.html", "assets/data/turkmen/index.json"]) },
  { loc: HOME + "cards.html", lastmod: lastmod(["turkmen/cards.html"]) }
];
const urls = head.concat(sitemap);
const sm = readFileSync(join(OUT, "sitemap.xml"), "utf8");
if (sm.includes(HOME)) { console.error("turkmen-static: sitemap.xml already lists Turkmen pages (run on a fresh mirror folder)"); process.exit(1); }
writeFileSync(join(OUT, "sitemap.xml"), swap(sm, /<\/urlset>\n?$/,
  urls.map((x) => `  <url><loc>${text(x.loc)}</loc><lastmod>${x.lastmod}</lastmod></url>`).join("\n") + "\n</urlset>\n", "</urlset> at the end of sitemap.xml"));

console.log(`turkmen-static: ${written} guide pages, ${soon} coming-soon pages (noindex), index and hub filled in, links to /turkish.html made "/" in ${relinked} pages, ${urls.length} URLs added to sitemap.xml`);
