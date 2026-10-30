// Builds app/www, the web content of the Daily Turkish iOS app, from the website's own files.
//
// The website stays the source of truth: nothing in the repo root is changed. This script copies
// the same files the dailyturkish.app mirror uses (.github/workflows/sync-dailyturkish.yml, keep the
// two lists in step), then, in the copies only:
//   - makes turkish.html the start page (index.html), as the mirror does;
//   - removes the Google tag snippet from every page, the privacy page too (no analytics in the app, and it works offline);
//   - flags every page with <html data-app="ios">: turkish.js reads it as TRK.app, so the pages show no online profile
//     and say "on this iPhone" (PROJECT.md APP-3);
//   - adds the app-only scripts after turkish-account.js: Capacitor's runtime, the Local
//     Notifications plugin and src/turkish-app.js (reminder, Export/Import, haptics, keyboard; the other
//     plugins are reached through Capacitor's runtime, so they need no script of their own);
//   - draws every page edge to edge: viewport-fit=cover, and src/turkish-app.css (notch, home indicator)
//     linked at the end of the <head> (APP-4);
//   - leaves out "Buy me a Turkish coffee" (the footer line and the About section): App Review wants tips
//     through in-app purchase (APP-4);
//   - then checks that no Google tag or coffee link is left and that every local file a page refers to is in www.
// Run with `npm run build` (or `npm run sync` to also copy into the Xcode project).

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const APP = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = resolve(APP, "..");
const OUT = join(APP, "www");

const FILES = [
  "turkish.html", "turkishcards.html", "turkishguide.html", "turkishlesson.html", "turkishprivacy.html",
  "assets/js/turkish.js", "assets/js/turkish-account.js",
  "assets/data/turkish", "assets/fonts",
  "assets/img/favicon.png", "assets/img/ataturk.png", "assets/img/ataturk.webp",
  "assets/img/daily-turkish-favicon.svg", "assets/img/daily-turkish-favicon.png",
  "assets/img/daily-turkish-apple-touch-icon.png", "assets/img/daily-turkish-logo.svg",
  "stylesheets/styles.css",
];
const PAGES = ["turkish.html", "turkishcards.html", "turkishguide.html", "turkishlesson.html"];

// App-only scripts: [file in www, source]
const APP_SCRIPTS = [
  ["assets/js/app/capacitor.js", "node_modules/@capacitor/core/dist/capacitor.js"],
  ["assets/js/app/local-notifications.js", "node_modules/@capacitor/local-notifications/dist/plugin.js"],
  ["assets/js/app/turkish-app.js", "src/turkish-app.js"],
];
// App-only stylesheet, linked from every page's <head>: [file in www, source]
const APP_CSS = ["assets/css/app/turkish-app.css", "src/turkish-app.css"];

// A plain recursive copy (fs.cpSync's native directory copy fails on some mounted folders).
function cp(from, to) {
  if (statSync(from).isDirectory()) {
    mkdirSync(to, { recursive: true });
    for (const name of readdirSync(from)) if (name !== ".DS_Store") cp(join(from, name), join(to, name));
  } else {
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(from, to);
  }
}

function fail(msg) { console.error("build-www: " + msg); process.exit(1); }

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

for (const p of FILES) {
  const from = join(SITE, p);
  if (!existsSync(from)) { console.warn("build-www: skipped missing " + p); continue; }
  cp(from, join(OUT, p));
}
for (const [to, from] of [...APP_SCRIPTS, APP_CSS]) {
  const src = join(APP, from);
  if (!existsSync(src)) fail(from + " not found (run npm install in app/)");
  cp(src, join(OUT, to));
}

const GTAG = /<!-- Google tag \(gtag\.js\) -->\s*<script async src="https:\/\/www\.googletagmanager\.com[^"]*"><\/script>\s*<script>[\s\S]*?<\/script>\s*/;
const ACCOUNT = /(<script defer src="\/assets\/js\/turkish-account\.js"><\/script>)/;
const HTML_TAG = /<html(?![^>]*data-app)([^>]*)>/;
const VIEWPORT = /(<meta name="viewport" content=")([^"]*)(")/;
const HEAD_END = /(\s*)<\/head>/;
const COFFEE_FOOT = /\s*<footer class="dt-foot">[\s\S]*?buymeacoffee[\s\S]*?<\/footer>/;
const COFFEE_ABOUT = /<h2>Support Daily Turkish<\/h2>[\s\S]*?buymeacoffee[\s\S]*?<\/p>\s*(?=<h2>)/;
const tags = APP_SCRIPTS.map(([to]) => '<script defer src="/' + to + '"></script>').join("\n    ");

// Every page of the app, the privacy page included: no Google tag, and <html data-app="ios">, the flag
// turkish.js reads as TRK.app (no online profile, "on this iPhone"; PROJECT.md APP-3). The course pages
// also get the app-only scripts.
const HTML = readdirSync(OUT).filter((f) => f.endsWith(".html"));
for (const page of HTML) {
  const file = join(OUT, page);
  let html = readFileSync(file, "utf8");
  if (/googletagmanager\.com/.test(html)) {
    if (!GTAG.test(html)) fail(page + ": Google tag snippet not found, update GTAG in build-www.mjs");
    html = html.replace(GTAG, "");
  }
  if (!HTML_TAG.test(html)) fail(page + ": no <html> tag to flag");
  html = html.replace(HTML_TAG, '<html$1 data-app="ios">');
  // Edge to edge, with the app's stylesheet keeping clear of the notch and the home indicator (APP-4).
  if (!VIEWPORT.test(html)) fail(page + ": no viewport meta tag, update VIEWPORT in build-www.mjs");
  html = html.replace(VIEWPORT, (m, a, c, z) => a + (/viewport-fit=/.test(c) ? c : c + ", viewport-fit=cover") + z);
  if (!HEAD_END.test(html)) fail(page + ": no </head>");
  html = html.replace(HEAD_END, '$1  <link rel="stylesheet" href="/' + APP_CSS[0] + '">$1</head>');
  // No tip jar in the app (APP-4).
  html = html.replace(COFFEE_FOOT, "").replace(COFFEE_ABOUT, "");
  if (PAGES.includes(page)) {
    if (!ACCOUNT.test(html)) fail(page + ": turkish-account.js script tag not found, update ACCOUNT in build-www.mjs");
    html = html.replace(ACCOUNT, "$1\n    " + tags);
  }
  writeFileSync(file, html);
}
cp(join(OUT, "turkish.html"), join(OUT, "index.html"));

// Checks on the result: no analytics left, and every local file a page loads or links to is in www
// (a new script such as turkish-morph.js, a font or an icon added to a page but not to FILES fails here).
const missing = [];
for (const page of readdirSync(OUT).filter((f) => f.endsWith(".html"))) {
  const html = readFileSync(join(OUT, page), "utf8");
  if (/googletagmanager\.com|gtag\('config'/.test(html)) fail(page + ": the Google tag is still there");
  if (/href="[^"]*buymeacoffee/.test(html)) fail(page + ": a Buy me a coffee link is still there, update COFFEE_FOOT / COFFEE_ABOUT in build-www.mjs");
  if (!/viewport-fit=cover/.test(html) || !html.includes(APP_CSS[0])) fail(page + ": viewport-fit=cover or the app stylesheet is missing");
  if (!/<html[^>]*data-app="ios"/.test(html)) fail(page + ": <html data-app> missing");
  const refs = [...html.matchAll(/(?:src|href)="(\/[^"]*)"/g), ...html.matchAll(/url\(\s*["']?(\/[^)"']+)/g)].map((m) => m[1]);
  for (const ref of refs) {
    if (ref.startsWith("//")) continue;
    let path = decodeURI(ref.replace(/[?#].*$/, "")).slice(1);
    if (path === "" || path.endsWith("/")) path += "index.html";
    if (!existsSync(join(OUT, path))) missing.push(page + " → /" + path);
  }
  if (/EMAIL_TODO/.test(html)) console.warn("build-www: " + page + " still has the EMAIL_TODO placeholder (contact email)");
}
if (missing.length) fail("files the pages use but www lacks (add them to FILES and to sync-dailyturkish.yml):\n  " + [...new Set(missing)].join("\n  "));

let count = 0;
(function walk(d) { for (const e of readdirSync(d, { withFileTypes: true })) e.isDirectory() ? walk(join(d, e.name)) : count++; })(OUT);
console.log("build-www: www/ ready, " + count + " files");
