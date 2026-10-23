// Builds app/www, the web content of the Daily Turkish iOS app, from the website's own files.
//
// The website stays the source of truth: nothing in the repo root is changed. This script copies
// the same files the dailyturkish.app mirror uses (.github/workflows/sync-dailyturkish.yml, keep the
// two lists in step), then, in the copies only:
//   - makes turkish.html the start page (index.html), as the mirror does;
//   - removes the Google tag snippet (no analytics in the app, and the app works offline);
//   - adds the app-only scripts after turkish-account.js: Capacitor's runtime, the Local
//     Notifications plugin and src/turkish-app.js (the daily reminder).
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
for (const [to, from] of APP_SCRIPTS) {
  const src = join(APP, from);
  if (!existsSync(src)) fail(from + " not found (run npm install in app/)");
  cp(src, join(OUT, to));
}

const GTAG = /<!-- Google tag \(gtag\.js\) -->\s*<script async src="https:\/\/www\.googletagmanager\.com[^"]*"><\/script>\s*<script>[\s\S]*?<\/script>\s*/;
const ACCOUNT = /(<script defer src="\/assets\/js\/turkish-account\.js"><\/script>)/;
const tags = APP_SCRIPTS.map(([to]) => '<script defer src="/' + to + '"></script>').join("\n    ");

for (const page of PAGES) {
  const file = join(OUT, page);
  let html = readFileSync(file, "utf8");
  if (!GTAG.test(html)) fail(page + ": Google tag snippet not found, update GTAG in build-www.mjs");
  if (!ACCOUNT.test(html)) fail(page + ": turkish-account.js script tag not found, update ACCOUNT in build-www.mjs");
  html = html.replace(GTAG, "").replace(ACCOUNT, "$1\n    " + tags);
  writeFileSync(file, html);
}
cp(join(OUT, "turkish.html"), join(OUT, "index.html"));

let count = 0;
(function walk(d) { for (const e of readdirSync(d, { withFileTypes: true })) e.isDirectory() ? walk(join(d, e.name)) : count++; })(OUT);
console.log("build-www: www/ ready, " + count + " files");
