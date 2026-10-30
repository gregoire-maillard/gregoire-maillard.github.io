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
//   verbs/index.html, verbs/<verb>.html                       the 100 most common verbs, conjugated (static-verbs.mjs)
//   grammar-cheat-sheet.html                                  grammar on one page (static-cheatsheet.mjs)
//   404.html                                                  the page for addresses that don't exist (noindex)
//   assets/img/og/<page>.jpg                                  share images (1200×630): one per written guide and word-list
//                                                            page, daily-turkish.jpg for the rest; og:image on every page
//   + schema.org JSON-LD: WebSite and Organization on the hub, BreadcrumbList on the guides, the index and the word list
//   sitemap.xml                                               the hub, the index, cards, privacy, every written guide,
//                                                            the word list
// and changes every href="/turkish.html…" in the mirror to "/…" (index.html is the hub, so it keeps one address).
// The pages keep their scripts: in a browser they render again as usual (progress, speaker buttons, quiz).
// Exits 1 if any page fails to render, so the workflow publishes nothing rather than a broken mirror.

import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, readdirSync } from "node:fs";
import { join, extname, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";
import { createRequire } from "node:module";
import { writeVerbPages } from "./static-verbs.mjs";
import { cheatSheetBody, CHEAT_CSS } from "./static-cheatsheet.mjs";
const M = createRequire(import.meta.url)("../../assets/js/turkish-morph.js");   // the morphology engine, for the verb pages and the cheat sheet

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
const WORDS_LINK = '<p style="margin-bottom:6px"><a href="/words/">1,000 common words</a> · <a href="/verbs/">100 verbs conjugated</a> · <a href="/grammar-cheat-sheet.html">Grammar cheat sheet</a></p>';
const addWordsLink = (src, what) => swap(src, /<footer class="dt-foot">/, `<footer class="dt-foot">${WORDS_LINK}`, `footer of ${what}`);

// ── structured data (schema.org JSON-LD), for the mirror only ──
// The home page says what the site is called (Google shows that name above its results) and who makes it;
// guides and word-list pages carry a breadcrumb trail (Daily Turkish › Grammar guides › A1 · Unit 5: …).
const ld = (o) => `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", ...o }).replace(/</g, "\\u003c")}</script>`;
const crumbs = (trail) => ld({ "@type": "BreadcrumbList", itemListElement: trail.map(([name, item], i) => ({ "@type": "ListItem", position: i + 1, name, item })) });
const HOME_LD = ld({ "@graph": [
  { "@type": "WebSite", "@id": SITE + "/#website", name: "Daily Turkish", alternateName: "dailyturkish.app", url: SITE + "/", inLanguage: "en",
    description: "A free Turkish course from A1 to C2: short lessons, grammar guides, culture notes and 1,000 flashcards.", publisher: { "@id": SITE + "/#org" } },
  { "@type": "Organization", "@id": SITE + "/#org", name: "Daily Turkish", url: SITE + "/",
    logo: { "@type": "ImageObject", url: SITE + "/assets/img/daily-turkish-apple-touch-icon.png", width: 180, height: 180 },
    founder: { "@type": "Person", name: "Grégoire Maillard", url: "https://gregoiremaillard.com/" },
    sameAs: ["https://buymeacoffee.com/dailyturkish"] }
] });
const addLd = (src, block, what) => swap(src, /\n\s*<\/head>/, `\n    ${block}\n  </head>`, `</head> of ${what}`);
const HOME_CRUMB = ["Daily Turkish", SITE + "/"];

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
// The frame of a generated page (Google tag, icons, styles, header bar, footer), taken from turkishcards.html.
// m: { title, description, canonical (none: noindex, as for the 404 page), kicker, h1, body, noTab (no tab marked current) }
function pageFrame(cardsSrc) {
  const headSrc = cardsSrc.slice(0, cardsSrc.indexOf("</head>"));
  const gtag = one(headSrc, /<!-- Google tag \(gtag\.js\) -->[\s\S]*?<\/script>\s*<script>[\s\S]*?<\/script>/, "Google tag");
  const icons = headSrc.match(/<link rel="(?:icon|apple-touch-icon|preload)"[^>]*>/g) || [];
  const styles = headSrc.match(/<style>[\s\S]*?<\/style>/g) || [];
  if (icons.length < 3 || !styles.length) throw new Error("template: turkishcards.html lost its icons or styles");
  one(cardsSrc, /<body>/, "<body>"); one(cardsSrc, /<main class="wrap">/, '<main class="wrap">');
  const header = cardsSrc.slice(cardsSrc.indexOf("<body>") + 6, cardsSrc.indexOf('<main class="wrap">'));
  if (!/class="at-hdr"/.test(header)) throw new Error("template: no header bar before <main> in turkishcards.html");
  const footer = one(cardsSrc, /<footer class="dt-foot">[\s\S]*?<\/footer>/, "footer");

  return (m) => `<!doctype html>
<!-- © 2026 Grégoire Maillard. All rights reserved, except the order of the words (CC BY-SA 4.0): see /LICENSE.txt -->
<!-- Generated by scripts/turkish/static.mjs: edit the script or its data (the word list: assets/data/turkish/flashcards/), not this page. -->
<html lang="en">
  <head>
${gtag}
    <meta charset="utf-8">
    <title>${text(m.title)}</title>
    <meta name="description" content="${attr(m.description)}">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    ${icons.join("\n    ")}
    ${m.canonical ? `<link rel="canonical" href="${attr(m.canonical)}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Daily Turkish">
    <meta property="og:title" content="${attr(m.title)}">
    <meta property="og:description" content="${attr(m.description)}">
    <meta property="og:url" content="${attr(m.canonical)}">` : '<meta name="robots" content="noindex">'}
    ${styles.join("\n    ")}
    <style>${WORDS_CSS}</style>${m.css ? "\n    <style>" + m.css + "</style>" : ""}${m.ld ? "\n    " + m.ld : ""}
  </head>
  <body>${m.noTab ? header.replace(/ aria-current="page"/, "") : header}<main class="wrap">
      <div class="head"><div><p class="kicker">${m.kicker}</p><h1>${text(m.h1)}</h1></div></div>
${m.body}
    </main>
    ${footer}
  </body>
</html>
`;
}
// Writes the eleven pages into OUT/words; returns their sitemap entries.
function writeWordList(frame, deck, notes, unitInfo, fileOfRank, verbLinks) {
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
            <p class="wl-meta"><span class="lv-tag">${text(c.level.toUpperCase())}</span>${u ? `<span>First taught in <a href="/guides/${u.id}-grammar.html">${text(u.label)}: ${text(u.title)}</a></span>` : ""}${verbLinks.has(c.tr) ? `<span>· <a href="${verbLinks.get(c.tr)}">Conjugation</a></span>` : ""}</p>
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
      ld: crumbs([HOME_CRUMB, ["Word list", SITE + "/words/"], [`Words ${r.from}–${r.to}`, `${SITE}/words/${r.file}`]]),
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
    ld: crumbs([HOME_CRUMB, ["Word list", SITE + "/words/"]]),
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

// ── share images ──
// Each card is a small HTML page drawn in the headless browser and saved as JPEG: the level's colour (İznik palette,
// as in the course), the logo and name, a kicker, the title (shrunk to fit three lines) and, in Lora italic, the
// Turkish title of the unit or the first words of the list.
const LEVEL_COLOUR = { a1: "#11847f", a2: "#2452a0", b1: "#2b7d50", b2: "#c2462c", c1: "#6c3f9e", c2: "#b8861a" };
async function drawShareCards(cardsSrc) {
  const logo = one(cardsSrc, /<svg class="at-logo"[\s\S]*?<\/svg>/, "logo in the header bar").replace(/ width="28" height="28"/, ' width="64" height="64"');
  mkdirSync(join(OUT, "assets/img/og"), { recursive: true });
  const card = await context.newPage();
  await card.setViewportSize({ width: 1200, height: 630 });
  for (const c of shareCards) {
    const colour = LEVEL_COLOUR[c.level] || "#287a9e";
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
      .d { color: #e34b4f; font-weight: 600; } .t { color: #242424; font-weight: 750; margin-left: .22em; }
      .kicker { margin-top: auto; font-size: 25px; font-weight: 650; letter-spacing: .08em; text-transform: uppercase; color: ${colour}; }
      .title { margin-top: 14px; font-size: 78px; line-height: 1.06; font-weight: 700; letter-spacing: -0.025em; max-width: 880px; }
      .sub { margin-top: 20px; font-size: 38px; color: #555; max-width: 880px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .sub.tr { font-family: "Lora", serif; font-style: italic; }
      .url { position: absolute; right: 110px; top: 88px; font-size: 26px; color: #8a8a86; }
    </style></head><body>
      <div class="band"></div><div class="disc"></div><div class="disc2"></div>
      <div class="url">dailyturkish.app</div>
      <div class="wrap">
        <div class="brand">${logo}<span><span class="d">Daily</span><span class="t">Turkish</span></span></div>
        <div class="kicker">${text(c.kicker)}</div>
        <div class="title">${text(c.title)}</div>
        ${c.sub ? `<div class="sub${c.subTr ? " tr" : ""}"${c.subTr ? ' lang="tr"' : ""}>${text(c.sub)}</div>` : ""}
      </div></body></html>`, { waitUntil: "load" });
    await card.evaluate(async () => {
      await document.fonts.ready;
      const t = document.querySelector(".title"); let size = 78;
      while (t.scrollHeight > 3.3 * size && size > 40) { size -= 4; t.style.fontSize = size + "px"; }
    });
    await card.screenshot({ path: join(OUT, "assets/img/og", c.name + ".jpg"), type: "jpeg", quality: 86 });
  }
  await card.close();
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
  const trail = [HOME_CRUMB, ["Grammar guides", SITE + "/turkishguide.html"]];
  if (id) {
    const m = /^(.+)-(grammar|culture)$/.exec(id), u = unitMeta.get(m[1]);
    trail.push([`${u.label}: ${m[2] === "grammar" ? u.title : "Interlude, " + u.interlude}`, `${SITE}/guides/${id}.html`]);
  }
  if (!noindex) s = addLd(s, crumbs(trail), id || "turkishguide.html");
  return s;
}

const index = JSON.parse(readFileSync(join(OUT, "assets/data/turkish/index.json"), "utf8"));
const units = index.levels.flatMap((lv) => lv.units);
const unitMeta = new Map();
index.levels.forEach((lv) => lv.units.forEach((u, i) => unitMeta.set(u.id, { label: `${lv.cefr} · Unit ${i + 1}`, cefr: lv.cefr, num: i + 1, level: lv.id,
  title: u.title, titleTr: u.titleTr, interlude: u.interlude, ready: u.status === "ready" })));
// a grammar point's section in its guide, if the unit is written: { href, label (the point), unit ("A1 · Unit 6") }
const guideLink = (gp) => {
  const pt = index.points[gp], u = pt && unitMeta.get(pt.unit);
  if (!pt) throw new Error(`unknown grammar point ${gp}`);
  return u && u.ready ? { href: `/guides/${pt.unit}-grammar.html#${gp}`, label: pt.label, unit: u.label } : null;
};
const shareCards = [];   // { file (page in OUT), name (image), kicker, title, sub, subTr, level, alt }, drawn once the pages are written
mkdirSync(join(OUT, "guides"), { recursive: true });
const sitemap = [];
let written = 0, soon = 0, wordPages = [], verbPages = [], cheatPage = null;
try {
  for (const u of units) {
    for (const kind of ["grammar", "culture"]) {
      const id = `${u.id}-${kind}`, ready = u.status === "ready";
      const r = await render(`/turkishguide.html?id=${id}`, guideDone);
      if (!r.main || !/doc-title/.test(r.main)) throw new Error(id + ": no guide rendered");
      const want = `${SITE}/guides/${id}.html`;
      if (r.canonical !== want) throw new Error(`${id}: canonical ${r.canonical}, expected ${want}`);
      writeFileSync(join(OUT, "guides", id + ".html"), guidePage(r, id, !ready));
      if (ready) {
        written++; sitemap.push({ loc: want, lastmod: lastmod([`assets/data/turkish/${kind}/${u.id}.json`, "turkishguide.html"]) });
        const m = unitMeta.get(u.id), g = kind === "grammar";
        shareCards.push({ file: `guides/${id}.html`, name: id, level: m.level, kicker: g ? `${m.cefr} grammar · Unit ${m.num}` : `Turkish culture · ${m.label}`,
          title: g ? m.title : m.interlude, sub: g ? m.titleTr : "", subTr: true, alt: `Daily Turkish · ${g ? m.cefr + " grammar: " + m.title : "Turkish culture: " + m.interlude}` });
      }
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
    writeFileSync(join(OUT, f), addLd(addWordsLink(s, f), HOME_LD, f));
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
  const frame = pageFrame(cards);
  const crumbsGuide = ["Grammar guides", SITE + "/turkishguide.html"];

  // ── conjugation pages (static-verbs.mjs) and the grammar cheat sheet (static-cheatsheet.mjs), built by the engine ──
  const verbs = writeVerbPages({ OUT, SITE, M, deck, notes, frame, crumbs, HOME_CRUMB, text, attr, guideLink, lastmod, fileOfRank, writeFileSync, mkdirSync, join });
  verbPages = verbs.pages; shareCards.push(...verbs.cards);
  const cs = cheatSheetBody({ M, text, guideLink, verbLinks: verbs.links });
  const csPage = {
    title: "Turkish grammar cheat sheet: suffixes, cases, tenses", h1: "Turkish grammar cheat sheet", kicker: '<a href="/turkishguide.html">Turkish · Grammar</a>',
    description: "Turkish grammar on one page: vowel harmony, consonant changes, the six cases, possessives, pronouns, personal endings, every tense, participles, voices and word order, with examples.",
    canonical: `${SITE}/grammar-cheat-sheet.html`, css: CHEAT_CSS, ld: crumbs([HOME_CRUMB, crumbsGuide, ["Cheat sheet", `${SITE}/grammar-cheat-sheet.html`]]),
    body: `      <p class="wl-intro">The essentials of Turkish grammar on one page, from vowel harmony to word order. Every example is built by the course's own conjugation engine, and each section links to the guide that explains it.</p>
      <ol class="cs-toc">${cs.toc.map(([id, t]) => `<li><a href="#${id}">${text(t)}</a></li>`).join("")}</ol>
${cs.html}`
  };
  writeFileSync(join(OUT, "grammar-cheat-sheet.html"), frame(csPage));
  cheatPage = { loc: csPage.canonical, lastmod: lastmod(["assets/js/turkish-morph.js", "scripts/turkish/static-cheatsheet.mjs", "scripts/turkish/static-verbs.mjs"]) };
  shareCards.push({ file: "grammar-cheat-sheet.html", name: "grammar-cheat-sheet", kicker: "Turkish · Grammar", title: "Turkish grammar cheat sheet",
    sub: "Cases, endings, tenses and suffixes on one page", subTr: false, alt: "Daily Turkish · Turkish grammar cheat sheet" });

  wordPages = writeWordList(frame, deck, notes, unitInfo, fileOfRank, verbs.links);
  const firstWords = (from, n) => deck.slice(from - 1, from - 1 + n).map((c) => c.tr).join(", ") + "…";
  shareCards.push({ file: "words/index.html", name: "words", kicker: "Word list", title: "The 1,000 most common Turkish words", sub: firstWords(1, 6), subTr: true,
    alt: "Daily Turkish · The 1,000 most common Turkish words" });
  for (let from = 1; from <= deck.length; from += 100) {
    const to = Math.min(from + 99, deck.length), title = from === 1 ? "The 100 most common Turkish words" : `Turkish words ${from}–${to}`;
    shareCards.push({ file: `words/${from}-${to}.html`, name: `words-${from}-${to}`, kicker: "Word list", title, sub: firstWords(from, 5), subTr: true, alt: `Daily Turkish · ${title}` });
  }

  // ── 404.html: GitHub Pages serves it for any address that doesn't exist ──
  writeFileSync(join(OUT, "404.html"), frame({
    title: "Page not found · Daily Turkish", description: "This page doesn't exist on Daily Turkish.", noTab: true,
    kicker: "Not found", h1: "This page doesn't exist",
    body: `      <p class="wl-intro">The address may be mistyped, or the page has moved. Everything in the course is one click away:</p>
      <ul class="wl-grid">
        <li><a href="/"><b>The course</b><span>Lessons from A1 to C2</span></a></li>
        <li><a href="/turkishguide.html"><b>Grammar guides</b><span>Every guide and grammar point</span></a></li>
        <li><a href="/turkishcards.html"><b>Flashcards</b><span>The 1,000 most useful words, Anki-style</span></a></li>
        <li><a href="/words/"><b>Word list</b><span>The 1,000 most common Turkish words</span></a></li>
      </ul>`
  }));

  // ── share images: a 1200×630 card per guide and word-list page, and one for every other page ──
  shareCards.push({ file: null, name: "daily-turkish", kicker: "Turkish · A1 → C2", title: "A free Turkish course, from A1 to C2",
    sub: "Lessons, grammar guides and 1,000 flashcards", subTr: false, alt: "Daily Turkish · A free Turkish course, from A1 to C2" });
  await drawShareCards(cards);
} catch (e) {
  console.error("turkish-static: " + e.message);
  await browser.close(); server.close();
  process.exit(1);
}
await browser.close();
server.close();

// ── share-image tags on every page (404 aside): its own card if it has one, else the site's ──
const cardOf = new Map(shareCards.filter((c) => c.file).map((c) => [c.file, c]));
const siteCard = shareCards.find((c) => !c.file);
let tagged = 0;
(function tag(dir, rel) {
  for (const name of readdirSync(dir)) {
    const f = join(dir, name), r = rel ? rel + "/" + name : name;
    if (statSync(f).isDirectory()) { if (name !== "assets") tag(f, r); continue; }
    if (!name.endsWith(".html") || r === "404.html") continue;
    const s = readFileSync(f, "utf8");
    if (/property="og:image"/.test(s)) continue;
    const c = cardOf.get(r) || siteCard;
    writeFileSync(f, addLd(s, `<meta property="og:image" content="${SITE}/assets/img/og/${c.name}.jpg">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="${attr(c.alt)}">
    <meta name="twitter:card" content="summary_large_image">`, r));
    tagged++;
  }
})(OUT, "");

// ── one address for the hub: index.html serves "/", so every link to /turkish.html becomes "/" ──
// (pages rendered above already use "/": turkish.js sets PAGES.hub to "/" on dailyturkish.app; this catches the
// header bars and other links written in the HTML itself)
let relinked = 0;
(function relink(dir) {
  for (const name of readdirSync(dir)) {
    const f = join(dir, name);
    if (statSync(f).isDirectory()) { if (name !== "assets") relink(f); continue; }
    if (!name.endsWith(".html")) continue;
    const s = readFileSync(f, "utf8"), t = s.replace(/href="\/turkish\.html(?=["#])/g, 'href="/');
    if (t !== s) { writeFileSync(f, t); relinked++; }
  }
})(OUT);

// ── sitemap.xml ──
const head = [
  { loc: SITE + "/", lastmod: lastmod(["turkish.html", "assets/data/turkish/index.json"]) },
  { loc: SITE + "/turkishguide.html", lastmod: lastmod(["turkishguide.html", "assets/data/turkish/index.json"]) },
  { loc: SITE + "/turkishcards.html", lastmod: lastmod(["turkishcards.html"]) },
  { loc: SITE + "/turkishprivacy.html", lastmod: lastmod(["turkishprivacy.html"]) }
];
writeFileSync(join(OUT, "sitemap.xml"), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  head.concat(sitemap, wordPages, verbPages, cheatPage ? [cheatPage] : []).map((x) => `  <url><loc>${text(x.loc)}</loc><lastmod>${x.lastmod}</lastmod></url>`).join("\n") + "\n</urlset>\n");

console.log(`turkish-static: ${written} guide pages, ${soon} coming-soon pages (noindex), ${wordPages.length} word-list pages, ${verbPages.length} verb pages, the cheat sheet, 404 page, ${shareCards.length} share images on ${tagged} pages, links to /turkish.html made "/" in ${relinked} pages, index and hub filled in, sitemap with ${head.length + sitemap.length + wordPages.length + verbPages.length + 1} URLs`);
