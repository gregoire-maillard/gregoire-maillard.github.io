// Builds app-turkmen/www, the web content of the Daily Turkmen iOS app, from the website's own files.
//
// A fork of app/scripts/build-www.mjs (Daily Turkish), which loads nothing from it. The website stays the source of
// truth: nothing outside app-turkmen/ is changed. This script copies the same files the dailyturkmen.app mirror uses
// (.github/workflows/sync-dailyturkmen.yml, keep the two lists in step), moves the pages of turkmen/ to the root as
// the mirror does (their links to each other are relative, to /assets/… absolute, so they work the same there), then,
// in the copies only:
//   - removes the Google tag snippet from every page (no analytics in the app, and it works offline);
//   - flags every page with <html data-app="ios">: turkmen.js reads it as TKM.app, so turkmen-account.js signs in
//     with email and password only and says "on this iPhone", and the pages get the app's bottom tab bar
//     (src/turkmen-app.js);
//   - points turkmen-account.js at the sign-in library shipped in the app (vendor/, no code downloaded at run time)
//     and its emailed links at dailyturkmen.app (an email can't open capacitor://localhost);
//   - adds the app-only scripts after turkmen-account.js: Capacitor's runtime, the Local Notifications plugin and
//     src/turkmen-app.js (tab bar, reminder, Export/Import, haptics, keyboard, widget; the other plugins are reached
//     through Capacitor's runtime, so they need no script of their own);
//   - draws every page edge to edge: viewport-fit=cover, and src/turkmen-app.css linked at the end of the <head>;
//   - leaves out "Buy me a cup of tea" (the footer line and the About section): App Review wants tips through
//     in-app purchase;
//   - leaves out the header's Daily Turkish mark and sends the other links to Daily Turkish to
//     https://dailyturkish.app/ (they open in Safari), as the mirror does;
//   - says "on this iPhone" where the pages say "in this browser";
//   - leaves out the French edition's data (assets/data/turkmen/fr/) and the interface strings (i18n/), which the pages
//     already carry inline: the app is in English (turkmen/TM-FR.md 4.5), and the French tree isn't filtered for 4+;
//   - leaves out of the course, or rewords, what would keep the App Store age rating above 4+ (content-4plus.mjs,
//     applied by content-filter.mjs, which recounts index.json and fails the build when a rule no longer matches
//     or a new such word appears);
//   - then checks that no Google tag or tip link is left and that every local file a page refers to is in www.
// Run with `npm run build` (or `npm run sync` to also copy into the Xcode project).

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { filterCourse } from "./content-filter.mjs";

const APP = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = resolve(APP, "..");
const OUT = join(APP, "www");

// The course's pages, from turkmen/ to the root of www.
const PAGES = ["index.html", "cards.html", "guide.html", "lesson.html", "privacy.html"];
const COURSE_PAGES = ["index.html", "cards.html", "guide.html", "lesson.html"];   // the ones with the course scripts
const FILES = [
  "assets/js/turkmen.js", "assets/js/turkmen-account.js",
  "assets/data/turkmen", "assets/fonts",
  "assets/img/favicon.png",
  "assets/img/daily-turkmen-favicon.svg", "assets/img/daily-turkmen-favicon.png",
  "assets/img/daily-turkmen-apple-touch-icon.png", "assets/img/daily-turkmen-logo.svg",
  "stylesheets/styles.css",
];

// App-only scripts: [file in www, source]
const APP_SCRIPTS = [
  ["assets/js/app/capacitor.js", "node_modules/@capacitor/core/dist/capacitor.js"],
  ["assets/js/app/local-notifications.js", "node_modules/@capacitor/local-notifications/dist/plugin.js"],
  ["assets/js/app/turkmen-app.js", "src/turkmen-app.js"],
];
// Loaded on demand by turkmen-account.js when someone signs in: the same version as the website's CDN copy.
const APP_LIBS = [["assets/js/app/supabase.js", "vendor/supabase-2.117.3.umd.js"]];
const APP_CSS = ["assets/css/app/turkmen-app.css", "src/turkmen-app.css"];

// Not copied: the French edition's data and the interface strings (TM-FR.md 4.5).
const SKIP = new Set(["assets/data/turkmen/fr", "assets/data/turkmen/i18n"].map((p) => join(SITE, p)));
function cp(from, to) {
  if (SKIP.has(from)) return;
  if (statSync(from).isDirectory()) {
    mkdirSync(to, { recursive: true });
    for (const name of readdirSync(from)) if (name !== ".DS_Store") cp(join(from, name), join(to, name));
  } else {
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(from, to);
  }
}
function fail(msg) { console.error("build-www: " + msg); process.exit(1); }
// Replaces text that must be there (once, or at least once with all: true), so a change on the website fails the
// build instead of shipping something unchecked.
function edit(file, s, find, replace, all) {
  const n = s.split(find).length - 1;
  if (n === 0 || (!all && n !== 1)) fail(file + ": expected \"" + find.slice(0, 80) + "\" " + (all ? "at least once" : "once") + ", found " + n);
  return s.split(find).join(replace);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

for (const p of PAGES) {
  const from = join(SITE, "turkmen", p);
  if (!existsSync(from)) fail("turkmen/" + p + " not found");
  cp(from, join(OUT, p));
}
for (const p of FILES) {
  const from = join(SITE, p);
  if (!existsSync(from)) { console.warn("build-www: skipped missing " + p); continue; }
  cp(from, join(OUT, p));
}
for (const [to, from] of [...APP_SCRIPTS, ...APP_LIBS, APP_CSS]) {
  const src = join(APP, from);
  if (!existsSync(src)) fail(from + " not found (run npm install in app-turkmen/)");
  cp(src, join(OUT, to));
}

// The account script: the app's own copy of the sign-in library, and emailed links that land on dailyturkmen.app.
{
  const f = join(OUT, "assets/js/turkmen-account.js");
  let s = readFileSync(f, "utf8");
  s = edit("turkmen-account.js", s, 'lib: "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/dist/umd/supabase.js"', 'lib: "/' + APP_LIBS[0][0] + '"');
  s = edit("turkmen-account.js", s, "function redirectTo() { return location.origin + CFG.page + \"?signin=1\"; }",
    "function redirectTo() { return \"https://dailyturkmen.app/?signin=1\"; }   // the app (app-turkmen/scripts/build-www.mjs): emailed links open the website");
  writeFileSync(f, s);
}

// The course for a 4+ age rating: only the copies in www change.
const filtered = filterCourse(OUT, fail);

const GTAG = /<!-- Google tag \(gtag\.js\) -->\s*<script async src="https:\/\/www\.googletagmanager\.com[^"]*"><\/script>\s*<script>[\s\S]*?<\/script>\s*/;
const ACCOUNT = /(<script defer src="\/assets\/js\/turkmen-account\.js"><\/script>)/;
const HTML_TAG = /<html(?![^>]*data-app)([^>]*)>/;
const VIEWPORT = /(<meta name="viewport" content=")([^"]*)(")/;
const HEAD_END = /(\s*)<\/head>/;
const TEA_FOOT = /\s*<footer class="dt-foot">[\s\S]*?buymeacoffee[\s\S]*?<\/footer>/;
const TEA_ABOUT = /<h2>Support Daily Turkmen<\/h2>[\s\S]*?buymeacoffee[\s\S]*?<\/p>\s*(?=<h2>)/;
const SISTER = /\s*<a class="at-tab at-set at-sis" href="\/turkish\.html"[^>]*>[\s\S]*?<\/a>/;   // the header's Daily Turkish mark
// The first opening of the day: a green screen with the logo for about a second, then it fades (the look is in
// src/turkmen-app.css). Inline in the hub's <head>, so it covers the page from the first paint; turkmen-app.js calls
// window.TKMSplash() again when the app comes back to the foreground on a new day.
const SPLASH = "<script>window.TKMSplash=function(){try{var d=new Date(),k=d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(),h=document.documentElement;" +
  "if(localStorage.getItem('tkm:app:splash')===k)return;localStorage.setItem('tkm:app:splash',k);h.classList.remove('app-splash-out');h.classList.add('app-splash');" +
  "setTimeout(function(){h.classList.add('app-splash-out')},1000);setTimeout(function(){h.classList.remove('app-splash','app-splash-out')},1500)}catch(e){}};window.TKMSplash();</script>";
const tags = APP_SCRIPTS.map(([to]) => '<script defer src="/' + to + '"></script>').join("\n    ");

for (const page of PAGES) {
  const file = join(OUT, page);
  let html = readFileSync(file, "utf8");
  if (/googletagmanager\.com/.test(html)) {
    if (!GTAG.test(html)) fail(page + ": Google tag snippet not found, update GTAG in build-www.mjs");
    html = html.replace(GTAG, "");
  }
  if (!HTML_TAG.test(html)) fail(page + ": no <html> tag to flag");
  html = html.replace(HTML_TAG, '<html$1 data-app="ios">');
  if (!VIEWPORT.test(html)) fail(page + ": no viewport meta tag, update VIEWPORT in build-www.mjs");
  // Edge to edge, and no zooming: iOS zooms in on a focused field with text under 16 px, and a zoomed page drifts
  // sideways and up under the fixed tab bar.
  html = html.replace(VIEWPORT, (m, a, c, z) => a + (/viewport-fit=/.test(c) ? c : c + ", viewport-fit=cover") + (/maximum-scale=/.test(c) ? "" : ", maximum-scale=1") + z);
  if (!HEAD_END.test(html)) fail(page + ": no </head>");
  html = html.replace(HEAD_END, '$1  <link rel="stylesheet" href="/' + APP_CSS[0] + '">' + (page === "index.html" ? "$1  " + SPLASH : "") + "$1</head>");
  html = html.replace(TEA_FOOT, "").replace(TEA_ABOUT, "").replace(SISTER, "");
  // Daily Turkish is another site here: its links open dailyturkish.app in Safari.
  html = html.replace(/href="\/turkish\.html"/g, 'href="https://dailyturkish.app/"').replace(/href="\/turkish([a-z]+)\.html/g, 'href="https://dailyturkish.app/turkish$1.html');
  // Progress lives on the phone.
  if (page === "index.html") html = edit(page, html, "in this browser's storage only, and clearing your browsing data erases it", "on this iPhone only, and deleting the app erases it");
  // My Profile's menu as Daily Turkish's: signed out, "Account & character" comes first (turkmen-app.css orders it by
  // the class Daily Turkish's page gives it).
  if (page === "index.html") {
    const NAV = /<li class="pf-nav-sep" aria-hidden="true"><\/li>(\s*)<li><button type="button" data-go="pf-side">/;
    if (!NAV.test(html)) fail(page + ": the profile menu's Account & character entry not found, update NAV in build-www.mjs");
    html = html.replace(NAV, '<li class="pf-nav-sep pf-acct-nav" aria-hidden="true"></li>$1<li class="pf-acct-nav"><button type="button" data-go="pf-side">');
  }
  if (COURSE_PAGES.includes(page)) html = html.split("in this browser").join("on this iPhone");   // not the privacy policy, which speaks of both
  if (COURSE_PAGES.includes(page)) {
    if (!ACCOUNT.test(html)) fail(page + ": turkmen-account.js script tag not found, update ACCOUNT in build-www.mjs");
    html = html.replace(ACCOUNT, "$1\n    " + tags);
  }
  writeFileSync(file, html);
}

// Checks on the result: no analytics or tip jar left, and every local file a page loads or links to is in www.
const missing = [];
for (const page of readdirSync(OUT).filter((f) => f.endsWith(".html"))) {
  const html = readFileSync(join(OUT, page), "utf8");
  if (/googletagmanager\.com|gtag\('config'/.test(html)) fail(page + ": the Google tag is still there");
  if (/href="[^"]*buymeacoffee/.test(html)) fail(page + ": a Buy me a cup of tea link is still there, update TEA_FOOT / TEA_ABOUT in build-www.mjs");
  if (/class="at-tab at-set at-sis"/.test(html)) fail(page + ": the header's Daily Turkish mark is still there, update SISTER in build-www.mjs");
  if (!/viewport-fit=cover/.test(html) || !html.includes(APP_CSS[0])) fail(page + ": viewport-fit=cover or the app stylesheet is missing");
  if (!/<html[^>]*data-app="ios"/.test(html)) fail(page + ": <html data-app> missing");
  const refs = [...html.matchAll(/(?:src|href)="(\/[^"]*)"/g), ...html.matchAll(/url\(\s*["']?(\/[^)"']+)/g)].map((m) => m[1]);
  for (const ref of refs) {
    if (ref.startsWith("//")) continue;
    let path = decodeURI(ref.replace(/[?#].*$/, "")).slice(1);
    if (path === "" || path.endsWith("/")) path += "index.html";
    if (!existsSync(join(OUT, path))) missing.push(page + " → /" + path);
  }
  // Relative links between the course's pages (lesson.html?id=…) must name a page that is here.
  for (const m of html.matchAll(/href="([a-z]+\.html)(?:[?#][^"]*)?"/g)) if (!existsSync(join(OUT, m[1]))) missing.push(page + " → " + m[1]);
}
if (missing.length) fail("files the pages use but www lacks (add them to FILES and to sync-dailyturkmen.yml):\n  " + [...new Set(missing)].join("\n  "));

let count = 0;
(function walk(d) { for (const e of readdirSync(d, { withFileTypes: true })) e.isDirectory() ? walk(join(d, e.name)) : count++; })(OUT);
console.log("build-www: www/ ready, " + count + " files; course for 4+: " + filtered.cards + " cards (" + filtered.dropped.cards + " left out, " +
  filtered.added + " added), " + filtered.lessons + " lessons, " + filtered.exercises + " exercises, " + filtered.edits + " edits");
