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
//   words/index.html, words/1-100.html … words/901-1000.html  the 1,000 flashcard words as a list (the cards page
//                                                            shows them only through JavaScript); footers link to it
//   sitemap.xml                                               the hub, the index, cards, privacy, every written guide,
//                                                            the word list
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
// The footer of the mirror's pages gets a line linking to the word list (dailyturkish.app only: gregoiremaillard.com and
// the iPhone app have no words/ pages).
const WORDS_LINK = '<p style="margin-bottom:6px"><a href="/words/">The 1,000 most common Turkish words</a></p>';
const addWordsLink = (src, what) => swap(src, /<footer class="dt-foot">/, `<footer class="dt-foot">${WORDS_LINK}`, `footer of ${what}`);

// ── the word list: words/ and words/<from>-<to>.html, built from the flashcard deck ──
// The page frame (Google tag, icons, styles, header bar, footer) is taken from turkishcards.html, so the list looks like
// the flashcards and follows any change to them. Each word: rank, Turkish, part of speech, meanings, example, forms,
// note, level and the unit that first teaches it. The order is the CC BY-SA 4.0 adaptation of FrequencyWords
// (LICENSE.txt), credited on every page.
const POS_LABEL = { noun: "noun", verb: "verb", adj: "adjective", adv: "adverb", pron: "pronoun", num: "number", postp: "postposition",
  conj: "conjunction", interj: "interjection", det: "determiner", particle: "particle", phrase: "phrase" };
const FORM_LABEL = { aor: "aorist", prog: "present", past: "past", fut: "future", acc: "accusative", poss3: "his, her, its", pl: "plural" };
const WORDS_CSS = `
      /* The word list (words/), generated by scripts/turkish/static.mjs */
      .wl-intro { max-width: 46em; font-size: 15.5px; line-height: 1.6; margin: 0 0 12px; }
      .wl-cta { max-width: 46em; margin: 0 0 22px; font-size: 14.5px; }
      .wl-cta a { font-weight: 600; }
      .wl-pager { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 18px; }
      .wl-pager a { display: inline-flex; align-items: center; min-height: 36px; padding: 0 12px; border: 1px solid var(--line); border-radius: 999px; font-size: 13.5px; color: var(--ink); font-variant-numeric: tabular-nums; white-space: nowrap; }
      .wl-pager a:hover { background: var(--blue-tint); color: var(--ink); }
      .wl-pager a[aria-current="page"] { background: var(--ink); border-color: var(--ink); color: #fff; }
      @media (max-width: 599px) { .wl-pager a { min-height: 32px; padding: 0 10px; font-size: 13px; } }
      .wl { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--line); }
      .wl > li { display: grid; grid-template-columns: 40px minmax(140px, 220px) minmax(0, 1fr); gap: 4px 16px; padding: 16px 4px; border-bottom: 1px solid var(--line); scroll-margin-top: 80px; }
      .wl-rk { font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; text-align: right; padding-top: 4px; }
      .wl-w b { display: block; color: var(--ink); font-size: 17px; font-weight: 650; line-height: 1.35; overflow-wrap: anywhere; }
      .wl-pos { display: block; font-size: 12.5px; color: var(--muted); font-style: italic; }
      .wl-d { min-width: 0; display: grid; gap: 8px; }
      .wl-en { color: var(--ink); font-size: 15px; }
      .wl-forms { font-size: 13px; color: var(--muted); }
      .wl-forms span { color: var(--ink); font-style: italic; white-space: nowrap; }
      .wl-note { font-size: 13.5px; }
      .wl-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; font-size: 12.5px; color: var(--muted); }
      @media (max-width: 699px) {
        .wl > li { grid-template-columns: 30px minmax(0, 1fr); gap: 2px 10px; padding: 14px 0; }
        .wl-d { grid-column: 2; margin-top: 4px; }
      }
      .wl-next { display: flex; justify-content: space-between; gap: 12px; margin: 24px 0 0; font-size: 15px; font-weight: 600; }
      .wl-about { max-width: 46em; margin-top: 40px; padding-top: 20px; border-top: 1px solid var(--line); font-size: 13.5px; color: var(--muted); }
      .wl-about h2 { font-size: 16px; margin-bottom: 6px; }
      .wl-about p + p { margin-top: 8px; }
      .wl-grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px; }
      .wl-grid a { display: block; height: 100%; border: 1px solid var(--line); border-radius: 12px; padding: 14px 16px; color: var(--body); }
      .wl-grid a:hover { background: var(--blue-tint); border-color: rgb(40 122 158 / 35%); color: var(--body); }
      .wl-grid b { display: block; color: var(--ink); font-size: 16px; font-weight: 650; margin-bottom: 4px; font-variant-numeric: tabular-nums; }
      .wl-grid span { font-size: 13.5px; font-style: italic; }
    `;
function one(src, re, what) {
  const m = src.match(new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g")) || [];
  if (m.length !== 1) throw new Error(`template: expected one ${what}, found ${m.length}`);
  return m[0];
}
// Writes the eleven pages into OUT/words; returns their sitemap entries.
function writeWordList(cardsSrc, deck, notes, unitInfo, fileOfRank) {
  const headSrc = cardsSrc.slice(0, cardsSrc.indexOf("</head>"));
  const gtag = one(headSrc, /<!-- Google tag \(gtag\.js\) -->[\s\S]*?<\/script>\s*<script>[\s\S]*?<\/script>/, "Google tag");
  const icons = headSrc.match(/<link rel="(?:icon|apple-touch-icon|preload)"[^>]*>/g) || [];
  const styles = headSrc.match(/<style>[\s\S]*?<\/style>/g) || [];
  if (icons.length < 3 || !styles.length) throw new Error("template: turkishcards.html lost its icons or styles");
  one(cardsSrc, /<body>/, "<body>"); one(cardsSrc, /<main class="wrap">/, '<main class="wrap">');
  const header = cardsSrc.slice(cardsSrc.indexOf("<body>") + 6, cardsSrc.indexOf('<main class="wrap">'));
  if (!/class="at-hdr"/.test(header)) throw new Error("template: no header bar before <main> in turkishcards.html");
  const footer = one(cardsSrc, /<footer class="dt-foot">[\s\S]*?<\/footer>/, "footer");

  const frame = (m) => `<!doctype html>
<!-- © 2026 Grégoire Maillard. All rights reserved, except the order of the words (CC BY-SA 4.0): see /LICENSE.txt -->
<!-- Generated by scripts/turkish/static.mjs from assets/data/turkish/flashcards/: edit the cards, not this page. -->
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
    <meta property="og:site_name" content="Daily Turkish">
    <meta property="og:title" content="${attr(m.title)}">
    <meta property="og:description" content="${attr(m.description)}">
    <meta property="og:url" content="${attr(m.canonical)}">
    ${styles.join("\n    ")}
    <style>${WORDS_CSS}</style>
  </head>
  <body>${header}<main class="wrap">
      <div class="head"><div><p class="kicker">${m.kicker}</p><h1>${text(m.h1)}</h1></div></div>
${m.body}
    </main>
    ${footer}
  </body>
</html>
`;
  const ranges = [];
  for (let from = 1; from <= deck.length; from += 100) ranges.push({ from, to: Math.min(from + 99, deck.length), file: `${from}-${Math.min(from + 99, deck.length)}.html` });
  const tr = (s) => `<span lang="tr">${text(s)}</span>`;
  const about = `<section class="wl-about" aria-labelledby="about-h">
        <h2 id="about-h">About this list</h2>
        <p>The words are ranked by how often they come up in film and TV dialogue, so the list leans towards spoken Turkish. Words are listed in their dictionary form (verbs in the infinitive, <span lang="tr">gelmek</span>), names and fragments are left out, and ranks are estimates rather than exact counts.</p>
        <p>The order of the list is adapted from the 2018 Turkish list of <a href="https://github.com/hermitdave/FrequencyWords" rel="noopener">FrequencyWords</a> by Hermit Dave, made from the OpenSubtitles2018 corpus via OPUS, and is licensed under <a href="https://creativecommons.org/licenses/by-sa/4.0/" rel="license noopener">CC BY-SA 4.0</a>. The meanings, example sentences and notes are original to Daily Turkish.</p>
      </section>`;
  const cta = `<p class="wl-cta">Learn them with spaced repetition, Anki-style: <a href="/turkishcards.html">open the flashcards</a>. Free, no account needed.</p>`;
  const pager = (cur) => `<nav class="wl-pager" aria-label="Pages of the list"><a href="/words/"${cur ? "" : ' aria-current="page"'}>Overview</a>` +
    ranges.map((r) => `<a href="/words/${r.file}"${r === cur ? ' aria-current="page"' : ""}>${r.from}–${r.to}</a>`).join("") + "</nav>";
  const item = (c, note) => {
    const u = c.unit && unitInfo.get(c.unit);
    const forms = c.forms ? Object.keys(FORM_LABEL).filter((k) => c.forms[k]).map((k) => `${FORM_LABEL[k]} ${tr(c.forms[k])}`).join(" · ") : "";
    return `        <li id="r${c.rank}" data-lvl="${attr(c.level)}">
          <span class="wl-rk">${c.rank}</span>
          <div class="wl-w"><b lang="tr">${text(c.tr)}</b><span class="wl-pos">${text(POS_LABEL[c.pos] || c.pos)}</span></div>
          <div class="wl-d">
            <p class="wl-en">${c.en.map(text).join("; ")}</p>
            <div class="ex"><p class="tr" lang="tr">${text(c.ex.tr)}</p><p class="en">${text(c.ex.en)}</p></div>` +
      (forms ? `\n            <p class="wl-forms">${forms}</p>` : "") + (note ? `\n            <p class="wl-note">${note}</p>` : "") + `
            <p class="wl-meta"><span class="lv-tag">${text(c.level.toUpperCase())}</span>${u ? `<span>First taught in <a href="/guides/${u.id}-grammar.html">${text(u.label)}: ${text(u.title)}</a></span>` : ""}</p>
          </div>
        </li>`;
  };
  const list = (words) => (n) => words.slice(0, n).map((c) => c.tr);
  mkdirSync(join(OUT, "words"), { recursive: true });
  const out = [];
  ranges.forEach((r, k) => {
    const words = deck.slice(r.from - 1, r.to), first = k === 0;
    const prev = ranges[k - 1], next = ranges[k + 1];
    const some = list(words)(3).join(", "), taught = words.filter((c) => unitInfo.has(c.unit)).length;
    const m = {
      title: first ? "100 most common Turkish words, with examples" : `Most common Turkish words ${r.from}–${r.to}, with examples`,
      h1: first ? "The 100 most common Turkish words" : `Turkish words ${r.from}–${r.to}`,
      description: (first ? `The 100 most common Turkish words (${some}…)` : `Turkish words ${r.from} to ${r.to} by frequency (${some}…)`) +
        ": English meanings, an example sentence for each, and verb forms.",
      canonical: `${SITE}/words/${r.file}`,
      kicker: `<a href="/words/">Turkish · 1,000 words</a>`,
      body: `      <p class="wl-intro">${first ? "The 100 Turkish words you'll hear most often" : `Turkish words ${r.from} to ${r.to}, by how often they're used`}, each with its meaning in English, an example sentence and, for verbs, the main forms (he, she or it).${taught ? ` ${taught === words.length ? "All" : taught} of them are taught in the lessons of the course.` : ""}</p>
      ${cta}
      ${pager(r)}
      <ol class="wl" start="${r.from}">
${words.map((c) => item(c, notes[c.rank - 1])).join("\n")}
      </ol>
      <nav class="wl-next" aria-label="Previous and next">${prev ? `<a href="/words/${prev.file}" rel="prev">← Words ${prev.from}–${prev.to}</a>` : `<a href="/words/">← Overview</a>`}${next ? `<a href="/words/${next.file}" rel="next">Words ${next.from}–${next.to} →</a>` : ""}</nav>
      ${about}`
    };
    writeFileSync(join(OUT, "words", r.file), frame(m));
    out.push({ loc: m.canonical, lastmod: lastmod([fileOfRank(r.from), fileOfRank(r.to)]) });
  });
  const hub = {
    title: "1,000 most common Turkish words, with examples",
    h1: "The 1,000 most common Turkish words",
    description: "The 1,000 most common Turkish words, ranked by how often they're used in film and TV dialogue, each with its English meanings and an example sentence.",
    canonical: `${SITE}/words/`,
    kicker: "Turkish · Word list",
    body: `      <p class="wl-intro">These are the 1,000 Turkish words you'll meet most often, ranked by how often they're used in film and TV dialogue. Each one comes with its English meanings, a natural example sentence and, where it helps, its forms and a short note. Together they make up the Daily Turkish flashcard deck.</p>
      ${cta}
      <ol class="wl-grid">
${ranges.map((r) => `        <li><a href="/words/${r.file}"><b>Words ${r.from}–${r.to}</b><span lang="tr">${list(deck.slice(r.from - 1, r.to))(8).map(text).join(", ")}…</span></a></li>`).join("\n")}
      </ol>
      ${about}`
  };
  writeFileSync(join(OUT, "words", "index.html"), frame(hub));
  out.unshift({ loc: hub.canonical, lastmod: lastmod([...new Set(deck.map((c) => fileOfRank(c.rank)))]) });
  return out;
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
const guideSrc = addWordsLink(readFileSync(join(OUT, "turkishguide.html"), "utf8"), "turkishguide.html");
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
let written = 0, soon = 0, wordPages = [];
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
    writeFileSync(join(OUT, f), addWordsLink(s, f));
  }

  // ── the flashcards page links to the word list (footer, and next to Browse's note on ranks) ──
  let cards = addWordsLink(readFileSync(join(OUT, "turkishcards.html"), "utf8"), "turkishcards.html");
  cards = swap(cards, /<span>Rank = how common the word is<\/span>/, '<span>Rank = how common the word is · <a href="/words/">the whole list as a page</a></span>', "Browse note on ranks");
  writeFileSync(join(OUT, "turkishcards.html"), cards);

  // ── the word list: the deck in rank order, notes rendered by turkish.js (still loaded from the hub) ──
  const fcFiles = index.flashcards.files.map((f) => ({ path: "assets/data/turkish/" + f, range: (f.match(/fc-(\d+)-(\d+)\.json$/) || []).slice(1).map(Number) }));
  const deck = fcFiles.flatMap((f) => JSON.parse(readFileSync(join(OUT, f.path), "utf8")).cards).sort((a, b) => a.rank - b.rank);
  if (deck.length !== index.flashcards.count || deck.some((c, i) => c.rank !== i + 1)) throw new Error(`word list: ranks are not 1 to ${index.flashcards.count}`);
  const fileOfRank = (rank) => fcFiles.find((f) => rank >= f.range[0] && rank <= f.range[1]).path;
  const notes = await page.evaluate((ns) => ns.map((n) => (n ? window.TRK.rich(n) : "")), deck.map((c) => c.note || ""));
  const unitInfo = new Map();
  index.levels.forEach((lv) => lv.units.forEach((u, i) => { if (u.status === "ready") unitInfo.set(u.id, { id: u.id, label: `${lv.cefr} · Unit ${i + 1}`, title: u.title }); }));
  wordPages = writeWordList(cards, deck, notes, unitInfo, fileOfRank);
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
  head.concat(sitemap, wordPages).map((x) => `  <url><loc>${text(x.loc)}</loc><lastmod>${x.lastmod}</lastmod></url>`).join("\n") + "\n</urlset>\n");

console.log(`turkish-static: ${written} guide pages, ${soon} coming-soon pages (noindex), ${wordPages.length} word-list pages, index and hub filled in, sitemap with ${head.length + sitemap.length + wordPages.length} URLs`);
