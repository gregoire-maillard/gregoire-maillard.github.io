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
//   turkmen/verbs/index.html, turkmen/verbs/<verb>.html  the 100 most frequent verbs of the deck, conjugated (static-verbs.mjs)
//   turkmen/words/index.html, turkmen/words/1-100.html … 901-1000.html   the 1,000 flashcard words as a list (static-words.mjs)
//   turkmen/grammar-cheat-sheet.html                     grammar on one page (static-cheatsheet.mjs)
//                                                        (SEO-TK: built from the deck and the engine, assets/js/turkmen-morph.js;
//                                                        the footers of the hub, guides and flashcards link to them)
//   assets/img/og/turkmen/<page>.jpg                     share images (1200×630) for those pages
//   + schema.org JSON-LD: a BreadcrumbList on the guides, the index and the generated pages
//   turkmen/sitemap.xml                                  the Turkmen hub, index, flashcards, every written guide and the
//                                                        generated pages, in a sitemap of their own: since SEO-9 the site's
//                                                        sitemap.xml lists the Turkish course only (submit this one in Search
//                                                        Console to have the course crawled; robots.txt names only the Turkish one)
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
import { createRequire } from "node:module";
import { writeVerbPages } from "./static-verbs.mjs";
import { writeWordList, courseCta, WORDS_CSS } from "./static-words.mjs";
import { cheatSheetBody, CHEAT_CSS } from "./static-cheatsheet.mjs";
const M = createRequire(import.meta.url)("../../assets/js/turkmen-morph.js");   // the morphology engine, for the verb pages and the cheat sheet

const SITE = "https://dailyturkish.app";
const HOME = SITE + "/turkmen/";
const OUT = resolve(process.argv[2] || "");
const TM = join(OUT, "turkmen");
if (!process.argv[2] || !existsSync(join(TM, "guide.html")) || !existsSync(join(OUT, "sitemap.xml"))) {   // sitemap.xml: the Turkish step has run
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

// SEO-TK: a line in the footer of the hub, the guides and the flashcards linking to the generated pages (mirror only:
// gregoiremaillard.com serves the course without them). `up` is "../" one folder down.
const footerLinks = (up) => `<p style="margin-bottom:6px"><a href="${up}words/">1,000 Turkmen words</a> · <a href="${up}verbs/">100 verbs conjugated</a> · ` +
  `<a href="${up}grammar-cheat-sheet.html">Grammar cheat sheet</a></p>`;
const addFooterLinks = (src, up, what) => swap(src, /<footer class="dt-foot">/, `<footer class="dt-foot">${footerLinks(up)}`, `footer of ${what}`);
function one(src, re, what) {
  const m = src.match(new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g")) || [];
  if (m.length !== 1) throw new Error(`template: expected one ${what}, found ${m.length}`);
  return m[0];
}
// The frame of a generated page (Google tag, icons, styles, header bar, footer), taken from turkmen/cards.html as it is in
// the repo, so the pages look like the flashcards and follow any change to them.
// m: { title, description, canonical, image (share image name), imageAlt, kicker (html), h1, h1Html, body, css, ld,
//      up ("../" one folder down), tab ("guide" | "cards": the header tab marked current) }
function pageFrame(cardsSrc) {
  const headSrc = cardsSrc.slice(0, cardsSrc.indexOf("</head>"));
  const gtag = one(headSrc, /<!-- Google tag \(gtag\.js\) -->[\s\S]*?<\/script>\s*<script>[\s\S]*?<\/script>/, "Google tag");
  const icons = headSrc.match(/<link rel="(?:icon|apple-touch-icon|preload)"[^>]*>/g) || [];
  const styles = headSrc.match(/<style>[\s\S]*?<\/style>/g) || [];
  if (icons.length < 3 || !styles.length) throw new Error("template: turkmen/cards.html lost its icons or styles");
  one(cardsSrc, /<body>/, "<body>"); one(cardsSrc, /<main class="wrap">/, '<main class="wrap">');
  const header = cardsSrc.slice(cardsSrc.indexOf("<body>") + 6, cardsSrc.indexOf('<main class="wrap">'));
  if (!/class="at-hdr"/.test(header)) throw new Error("template: no header bar before <main> in turkmen/cards.html");
  const footer = one(cardsSrc, /<footer class="dt-foot">[\s\S]*?<\/footer>/, "footer");
  return (m) => {
    const up = m.up || "";
    let h = header.replace(/ aria-current="page"/g, "");
    if (m.tab) h = swap(h, new RegExp(`<a class="at-tab" href="${m.tab}\\.html"`), `<a class="at-tab" href="${m.tab}.html" aria-current="page"`, `${m.tab} tab`);
    if (up) h = h.replace(/href="(?![a-z][a-z0-9+.-]*:|\/|#)([^"]*)"/gi, `href="${up}$1"`);
    const img = `${SITE}/assets/img/og/turkmen/${m.image}.jpg`;
    return `<!doctype html>
<!-- © 2026 Grégoire Maillard. All rights reserved, except the order of the words (CC BY-SA 4.0): see /LICENSE.txt -->
<!-- Generated by scripts/turkmen/static.mjs (SEO-TK): edit the scripts or their data (assets/data/turkmen/, assets/js/turkmen-morph.js), not this page. -->
<html lang="en">
  <head>
${gtag}
    <meta charset="utf-8">
    <title>${text(m.title)}</title>
    <meta name="description" content="${attr(m.description)}">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    ${icons.join("\n    ")}
    <link rel="canonical" href="${attr(m.canonical)}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Daily Turkmen">
    <meta property="og:title" content="${attr(m.title)}">
    <meta property="og:description" content="${attr(m.description)}">
    <meta property="og:url" content="${attr(m.canonical)}">
    <meta property="og:image" content="${attr(img)}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="${attr(m.imageAlt || "Daily Turkmen · " + m.title)}">
    <meta name="twitter:card" content="summary_large_image">
    ${styles.join("\n    ")}
    <style>${WORDS_CSS}</style>${m.css ? "\n    <style>" + m.css + "</style>" : ""}${m.ld ? "\n    " + m.ld : ""}
  </head>
  <body>${h}<main class="wrap">
      <div class="head"><div><nav class="kicker" aria-label="Breadcrumb">${m.kicker}</nav><h1>${m.h1Html || text(m.h1)}</h1></div></div>
${m.body}
    </main>
    ${addFooterLinks(footer, up, "a generated page")}
  </body>
</html>
`;
  };
}

// ── share images (SEO-TK) ──
// Each card is a small HTML page drawn in the headless browser and saved as JPEG: the level's colour (carnelian, indigo,
// malachite, as in the course; the Daily Turkmen green elsewhere), the logo and name, a kicker, the title (shrunk to fit
// three lines) and, in Lora italic, Turkmen words.
const LEVEL_COLOUR = { a1: "#b23a2e", a2: "#2e4a8a", b1: "#1f7a55" };
async function drawShareCards(cards, cardsSrc) {
  const logo = one(cardsSrc, /<svg class="at-logo"[\s\S]*?<\/svg>/, "logo in the header bar").replace(/ width="28" height="28"/, ' width="64" height="64"');
  mkdirSync(join(OUT, "assets/img/og/turkmen"), { recursive: true });
  const card = await context.newPage();
  await card.setViewportSize({ width: 1200, height: 630 });
  for (const c of cards) {
    const colour = LEVEL_COLOUR[c.level] || "#167a55";
    await card.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
      @font-face { font-family: "Inter Fleet"; src: url("${BASE}/assets/fonts/inter-fleet.woff2") format("woff2"); font-weight: 100 900; }
      @font-face { font-family: "Lora"; font-style: italic; src: url("${BASE}/assets/fonts/lora-latin-italic.woff2") format("woff2"); unicode-range: U+0000-00FF, U+2013-2026; }
      @font-face { font-family: "Lora"; font-style: italic; src: url("${BASE}/assets/fonts/lora-latin-ext-italic.woff2") format("woff2"); unicode-range: U+0100-024F, U+1E00-1EFF; }
      html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: #fff; }
      body { position: relative; font-family: "Inter Fleet", sans-serif; color: #242424; -webkit-font-smoothing: antialiased; }
      .band { position: absolute; inset: 0 auto 0 0; width: 28px; background: ${colour}; }
      .disc { position: absolute; right: -170px; bottom: -230px; width: 640px; height: 640px; border-radius: 50%; background: ${colour}; opacity: .08; }
      .disc2 { position: absolute; right: -50px; bottom: -110px; width: 280px; height: 280px; border-radius: 50%; border: 3px solid ${colour}; opacity: .18; }
      .wrap { position: absolute; left: 100px; right: 110px; top: 72px; bottom: 70px; display: flex; flex-direction: column; }
      .brand { display: flex; align-items: center; gap: 18px; font-size: 38px; letter-spacing: -0.02em; }
      .brand svg { display: block; }
      .d { color: #167a55; font-weight: 600; } .t { color: #242424; font-weight: 750; margin-left: .22em; }
      .kicker { margin-top: auto; font-size: 25px; font-weight: 650; letter-spacing: .08em; text-transform: uppercase; color: ${colour}; }
      .title { margin-top: 14px; font-size: 78px; line-height: 1.06; font-weight: 700; letter-spacing: -0.025em; max-width: 880px; }
      .title.tk { font-family: "Lora", serif; font-style: italic; font-weight: 600; letter-spacing: -0.01em; }
      .sub { margin-top: 20px; font-size: 38px; color: #555; max-width: 880px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .sub.tk { font-family: "Lora", serif; font-style: italic; }
      .url { position: absolute; right: 110px; top: 88px; font-size: 26px; color: #8a8a86; }
    </style></head><body>
      <div class="band"></div><div class="disc"></div><div class="disc2"></div>
      <div class="url">dailyturkish.app/turkmen</div>
      <div class="wrap">
        <div class="brand">${logo}<span><span class="d">Daily</span><span class="t">Turkmen</span></span></div>
        <div class="kicker">${text(c.kicker)}</div>
        <div class="title${c.titleTk ? " tk" : ""}"${c.titleTk ? ' lang="tk"' : ""}>${text(c.title)}</div>
        ${c.sub ? `<div class="sub${c.subTk ? " tk" : ""}"${c.subTk ? ' lang="tk"' : ""}>${text(c.sub)}</div>` : ""}
      </div></body></html>`, { waitUntil: "load" });
    await card.evaluate(async () => {
      await document.fonts.ready;
      const t = document.querySelector(".title"); let size = 78;
      while (t.scrollHeight > 3.3 * size && size > 40) { size -= 4; t.style.fontSize = size + "px"; }
    });
    await card.screenshot({ path: join(OUT, "assets/img/og/turkmen", c.name + ".jpg"), type: "jpeg", quality: 86 });
  }
  await card.close();
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

const sitemap = [], generated = [];
let written = 0, soon = 0, images = 0;
try {
  const cardsSrc = readFileSync(join(TM, "cards.html"), "utf8");   // the frame of the generated pages, as in the repo
  const guideSrc = headerUp(withFlags(addFooterLinks(readFileSync(join(TM, "guide.html"), "utf8"), "../", "turkmen/guide.html"), "../", "turkmen/guide.html"), "turkmen/guide.html");
  // Every page links to the static guides, in the browser as here; the hub, the index and the flashcards link to the
  // generated pages in their footer, and Browse's note on ranks to the word list.
  for (const f of ["index.html", "guide.html", "cards.html", "lesson.html"]) {
    let src = withFlags(readFileSync(join(TM, f), "utf8"), "", "turkmen/" + f);
    if (f !== "lesson.html") src = addFooterLinks(src, "", "turkmen/" + f);
    if (f === "cards.html") src = swap(src, /<span>Rank = the deck's order, roughly how common the word is<\/span>/,
      '<span>Rank = the deck\'s order, roughly how common the word is · <a href="words/">the whole list as a page</a></span>', "Browse note on ranks");
    writeFileSync(join(TM, f), src);
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

  // ── SEO-TK: the word list, the conjugation pages and the grammar cheat sheet, built from the deck and the engine ──
  const fcFiles = index.flashcards.files.map((f) => ({ path: "assets/data/turkmen/" + f, range: (f.match(/fc-(\d+)-(\d+)\.json$/) || []).slice(1).map(Number) }));
  const deck = fcFiles.flatMap((f) => JSON.parse(readFileSync(join(OUT, f.path), "utf8")).cards).sort((a, b) => a.rank - b.rank);
  if (deck.length !== index.flashcards.count || deck.some((c, i) => c.rank !== i + 1)) throw new Error(`word list: ranks are not 1 to ${index.flashcards.count}`);
  const fileOfRank = (rank) => fcFiles.find((f) => rank >= f.range[0] && rank <= f.range[1]).path;
  // the card notes, rendered by turkmen.js in the hub just drawn (Rich text: *Turkmen*, **bold**)
  const notes = await page.evaluate((ns) => ns.map((n) => (n ? window.TKM.rich(n) : "")), deck.map((c) => c.note || ""));
  const unitInfo = new Map();
  index.levels.forEach((lv) => lv.units.forEach((u, i) => { if (u.status === "ready") unitInfo.set(u.id, { id: u.id, label: `${lv.cefr} · Unit ${i + 1}`, title: u.title }); }));
  // a grammar point's section in its static guide, if the unit is written: { href, label, unit ("A1 · Unit 6") }; the
  // anchor only if the rendered guide has it
  const guideHtml = new Map();
  const guideLink = (gp, up) => {
    const pt = index.points[gp];
    if (!pt) throw new Error(`unknown grammar point ${gp}`);
    const u = unitInfo.get(pt.unit);
    if (!u) return null;
    const file = `guides/${pt.unit}-grammar.html`;
    if (!guideHtml.has(file)) guideHtml.set(file, readFileSync(join(TM, file), "utf8"));
    return { href: up + file + (guideHtml.get(file).includes(` id="${gp}"`) ? "#" + gp : ""), label: pt.label, unit: u.label };
  };
  const frame = pageFrame(cardsSrc);
  const firstLesson = "lesson.html?id=" + index.levels[0].units[0].lessons[0].id;
  const verbs = writeVerbPages({ TM, HOME, M, deck, notes, frame, crumbs, HOME_CRUMB, text, guideLink, lastmod, fileOfRank, writeFileSync, mkdirSync, join,
    cta: (c, up) => {   // the box at the end of a verb page: the unit that first teaches the verb, the first lesson, the card
      const u = c && unitInfo.get(c.unit);
      if (!c) return courseCta({ title: "Learn the verbs in the course", text: "Daily Turkmen teaches these forms a few at a time, from A1 to B1, each with a grammar guide and short lessons with instant feedback. Free, no account needed.",
        primary: [up + firstLesson, "Start the first lesson"], secondary: [up + "guide.html", "All grammar guides"] }, text);
      return courseCta({ title: `Practise ${c.tk} in the course`, primary: [up + firstLesson, "Start the first lesson"],
        secondary: u ? [`${up}index.html#${u.id}`, "Go to " + u.label] : [up + "index.html", "See the course"],
        link: [`${up}cards.html?view=browse&amp;q=${encodeURIComponent(c.tk)}`, `Find ${c.tk} in the flashcards`],
        text: `${u ? `<i lang="tk">${text(c.tk)}</i> is first taught in <a href="${up}guides/${u.id}-grammar.html">${text(u.label)}: ${text(u.title)}</a>, and it's in the flashcard deck. ` : ""}Daily Turkmen is a free course from A1 to B1, with short lessons and instant feedback. No account needed.` }, text);
    } });
  const words = writeWordList({ TM, HOME, deck, notes, frame, crumbs, HOME_CRUMB, text, attr, unitInfo, fileOfRank, verbLinks: verbs.links, lastmod, writeFileSync, mkdirSync, join,
    cta: (up) => courseCta({ title: "Learn these words in the course", text: "Every word on this list is in the Daily Turkmen flashcard deck, and most of them are taught in the lessons, in sentences, a unit at a time. Free, from A1 to B1, no account needed.",
      primary: [up + firstLesson, "Start the first lesson"], secondary: [up + "cards.html", "Open the flashcards"] }, text) });
  const cs = cheatSheetBody({ M, text, guideLink, verbLinks: verbs.links });
  const csPage = {
    title: "Turkmen grammar cheat sheet: cases, endings, tenses", h1: "Turkmen grammar cheat sheet", tab: "guide",
    kicker: '<a href="index.html">Daily Turkmen</a> › <a href="guide.html">Grammar</a>',
    description: "Turkmen grammar on one page: vowel harmony and rounding, sound changes, the cases, possessives, pronouns, to be, the personal endings, every tense, participles, voices and word order, with examples.",
    canonical: `${HOME}grammar-cheat-sheet.html`, css: CHEAT_CSS, image: "grammar-cheat-sheet",
    ld: crumbs([HOME_CRUMB, GUIDES_CRUMB, ["Cheat sheet", `${HOME}grammar-cheat-sheet.html`]]),
    body: `      <p class="wl-intro">The essentials of Turkmen grammar on one page, from vowel harmony to word order. Every example is built by the course's own conjugation engine, and each section links to the guide that explains it.</p>
      <ol class="cs-toc">${cs.toc.map(([id, t]) => `<li><a href="#${id}">${text(t)}</a></li>`).join("")}</ol>
${cs.html}
${courseCta({ title: "Practise it, one step at a time", text: "The course teaches this grammar in order, a few points per unit, each with a guide and short lessons with instant feedback. Free, from A1 to B1, no account needed.",
  primary: [firstLesson, "Start the first lesson"], secondary: ["guide.html", "All grammar guides"] }, text)}`
  };
  writeFileSync(join(TM, "grammar-cheat-sheet.html"), frame(csPage));
  generated.push(...words.pages, ...verbs.pages,
    { loc: csPage.canonical, lastmod: lastmod(["assets/js/turkmen-morph.js", "scripts/turkmen/static-cheatsheet.mjs", "scripts/turkmen/static-verbs.mjs"]) });
  const shareCards = [...words.cards, ...verbs.cards, { name: "grammar-cheat-sheet", level: null, kicker: "Turkmen · Grammar", title: "Turkmen grammar cheat sheet",
    titleTk: false, sub: "Cases, endings and tenses on one page", subTk: false }];
  await drawShareCards(shareCards, cardsSrc);
  images = shareCards.length;
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

// ── turkmen/sitemap.xml: the Turkmen pages, apart from the Turkish course's sitemap.xml (SEO-9) ──
const head = [
  { loc: HOME, lastmod: lastmod(["turkmen/index.html", "assets/data/turkmen/index.json"]) },
  { loc: HOME + "guide.html", lastmod: lastmod(["turkmen/guide.html", "assets/data/turkmen/index.json"]) },
  { loc: HOME + "cards.html", lastmod: lastmod(["turkmen/cards.html"]) }
];
const urls = head.concat(sitemap, generated);
if (readFileSync(join(OUT, "sitemap.xml"), "utf8").includes(HOME)) { console.error("turkmen-static: sitemap.xml lists Turkmen pages (run on a fresh mirror folder)"); process.exit(1); }
writeFileSync(join(TM, "sitemap.xml"), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map((x) => `  <url><loc>${text(x.loc)}</loc><lastmod>${x.lastmod}</lastmod></url>`).join("\n") + "\n</urlset>\n");

console.log(`turkmen-static: ${written} guide pages, ${soon} coming-soon pages (noindex), index and hub filled in, ${generated.length} word-list, verb and cheat-sheet pages ` +
  `with ${images} share images, links to /turkish.html made "/" in ${relinked} pages, ${urls.length} URLs in turkmen/sitemap.xml`);
