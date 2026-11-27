#!/usr/bin/env node
// Turkmen course: the interface strings of the pages (turkmen/TM-FR.md 4; FR-BUILD-1). No dependencies; Node 18 or later.
//
//   node scripts/turkmen/pages.mjs                 fill the strings into turkmen/*.html from assets/data/turkmen/i18n/en.json
//   node scripts/turkmen/pages.mjs --check         exit 1 if a page is out of date or a key is missing (test.mjs runs it)
//   node scripts/turkmen/pages.mjs --preview dir   write the French pages into dir (a preview: turkmen/fr/ is FR-BUILD-2's)
//
// The pages stay single sources in turkmen/. Their text lives in the two string files:
//   - markup carries data-i18n="key" (the element's own text: its one run of text, the child elements kept),
//     data-i18n-html="key" (the element's whole content, as markup) or data-i18n-attr="title:key;aria-label:key";
//   - the keys the page's scripts read (T.t in the page, turkmen.js and turkmen-account.js) are inlined before
//     turkmen.js as <script id="tkm-strings">window.TKM_STRINGS = {…};</script>: the groups of PAGES below, minus the
//     keys only the markup uses, so each text appears once in a page.
// A key missing from fr.json shows the English string on a French page (validate.mjs --lang fr reports it).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const TM = path.join(ROOT, "turkmen");
const I18N = path.join(ROOT, "assets/data/turkmen/i18n");
const JS = ["assets/js/turkmen.js", "assets/js/turkmen-account.js"].map(f => path.join(ROOT, f));
const rel = p => path.relative(ROOT, p).split(path.sep).join("/");

// The pages and the key groups their scripts read (TM-FR.md 4.4). 404.html has no script: markup only.
export const PAGES = {
  "index.html": ["common", "core", "account", "hub", "ach", "char"],
  "lesson.html": ["common", "core", "account", "lesson"],
  "guide.html": ["common", "core", "account", "guide"],
  "cards.html": ["common", "core", "account", "cards", "tag", "pos", "form"],
  "404.html": null,
};
// The order of the groups in the string files.
export const GROUPS = ["common", "meta", "core", "account", "hub", "char", "ach", "lesson", "guide", "cards", "tag", "pos", "form", "notfound"];

export const readStrings = lang => {
  const f = path.join(I18N, lang + ".json");
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : {};
};
const isPlural = v => v && typeof v === "object" && !Array.isArray(v);

// ── a small HTML scanner: enough for the course's own pages ──
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
const RAW = new Set(["script", "style"]);
const escText = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = s => escText(s).replace(/"/g, "&quot;");
const decode = s => s.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m, e) => ({ amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", nbsp: " " }[e]));
const attrOf = (tag, name) => { const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`)); return m ? m[1] : null; };

// The marked elements of a page: [{ start, openEnd, close, tag, name, text?, html?, attrs? }], close = index of its end tag.
function marked(src, file) {
  const out = [];
  const startRe = /<([a-zA-Z][\w-]*)\b((?:[^<>"]|"[^"]*")*?)(\/?)>/g;
  let m;
  while ((m = startRe.exec(src))) {
    const [tag, name, attrs, selfClose] = m;
    if (RAW.has(name.toLowerCase())) { const end = src.indexOf(`</${name}>`, m.index); startRe.lastIndex = end < 0 ? src.length : end; continue; }
    if (!/\sdata-i18n/.test(attrs)) continue;
    const el = { start: m.index, openEnd: m.index + tag.length, tag, name: name.toLowerCase(), text: attrOf(tag, "data-i18n"), html: attrOf(tag, "data-i18n-html"), attrs: attrOf(tag, "data-i18n-attr") };
    if (el.text || el.html) {
      if (VOID.has(el.name) || selfClose) throw new Error(`${file}: <${name}> with data-i18n has no content`);
      el.close = closeOf(src, el.openEnd, el.name, file);
    }
    out.push(el);
  }
  return out;
}
// The index of the end tag that closes an element whose content starts at `from`.
function closeOf(src, from, name, file) {
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w-]*)\b(?:[^<>"]|"[^"]*")*?(\/?)>/g;
  re.lastIndex = from;
  let depth = 0, m;
  while ((m = re.exec(src))) {
    if (m[0].startsWith("<!--")) continue;
    const [all, closing, n, self] = m, low = n.toLowerCase();
    if (RAW.has(low) && !closing) { const end = src.indexOf(`</${n}>`, re.lastIndex); re.lastIndex = end < 0 ? src.length : end + n.length + 3; continue; }
    if (closing) { if (depth === 0) { if (low !== name) throw new Error(`${file}: </${n}> closes <${name}>`); return m.index; } depth--; }
    else if (!VOID.has(low) && !self) depth++;
  }
  throw new Error(`${file}: <${name}> is never closed`);
}
// The direct text runs of an element's content: [{ from, to }] (positions in src), between its child elements.
function textRuns(src, from, to) {
  const runs = [], re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w-]*)\b(?:[^<>"]|"[^"]*")*?(\/?)>/g;
  re.lastIndex = from;
  let depth = 0, pos = from, m;
  while ((m = re.exec(src)) && m.index < to) {
    if (depth === 0 && m.index > pos) runs.push({ from: pos, to: m.index });
    if (!m[0].startsWith("<!--")) {
      const low = m[2].toLowerCase();
      if (m[1]) depth--; else if (!VOID.has(low) && !m[3]) depth++;
    }
    pos = re.lastIndex;
  }
  if (pos < to) runs.push({ from: pos, to });
  return runs.filter(r => src.slice(r.from, r.to).trim());
}

// The keys a page's markup uses: { key: [kinds] }.
export function markupKeys(src, file) {
  const keys = new Map();
  const add = (k, kind) => { if (!keys.has(k)) keys.set(k, new Set()); keys.get(k).add(kind); };
  for (const el of marked(src, file)) {
    if (el.text) add(el.text, "text");
    if (el.html) add(el.html, "html");
    if (el.attrs) for (const pair of el.attrs.split(";")) { const [, k] = pair.split(":").map(s => s.trim()); if (k) add(k, "attr"); }
  }
  return keys;
}
// A string for markup: plural objects aren't allowed there.
function value(strings, key, file) {
  const v = strings[key];
  if (typeof v !== "string") throw new Error(`${file}: key “${key}” ${v === undefined ? "is not in en.json" : "is a count, which markup can't show"}`);
  return v;
}

// Fills every marked element from `strings` (the English, or the French over the English). Returns the new source.
export function fill(src, strings, file) {
  const els = marked(src, file);
  const edits = [];   // [from, to, text]
  for (const el of els) {
    if (el.attrs) {
      let tag = el.tag;
      for (const pair of el.attrs.split(";")) {
        const [attr, key] = pair.split(":").map(s => s.trim());
        if (!attr || !key) throw new Error(`${file}: data-i18n-attr="${el.attrs}" should read name:key;name:key`);
        const re = new RegExp(`(\\s${attr}=")[^"]*(")`);
        if (!re.test(tag)) throw new Error(`${file}: <${el.name}> has no ${attr} attribute for ${key}`);
        tag = tag.replace(re, (mm, a, b) => a + escAttr(value(strings, key, file)) + b);
      }
      edits.push([el.start, el.openEnd, tag]);
    }
    if (el.html) edits.push([el.openEnd, el.close, value(strings, el.html, file)]);
    else if (el.text) {
      const runs = textRuns(src, el.openEnd, el.close);
      if (runs.length !== 1) throw new Error(`${file}: data-i18n="${el.text}" needs exactly one run of text in its element (found ${runs.length}); use data-i18n-html`);
      const raw = src.slice(runs[0].from, runs[0].to), lead = raw.match(/^\s*/)[0], trail = raw.match(/\s*$/)[0];
      edits.push([runs[0].from + lead.length, runs[0].to - trail.length, escText(value(strings, el.text, file))]);
    }
  }
  edits.sort((a, b) => b[0] - a[0]);
  let out = src;
  for (const [a, b, t] of edits) out = out.slice(0, a) + t + out.slice(b);
  return out;
}
// The text a marked element shows today (the English pages' source), to build en.json from the pages.
export function extract(src, file) {
  const out = {};
  for (const el of marked(src, file)) {
    if (el.html) out[el.html] = src.slice(el.openEnd, el.close);
    else if (el.text) {
      const runs = textRuns(src, el.openEnd, el.close);
      if (runs.length === 1) out[el.text] = decode(src.slice(runs[0].from, runs[0].to).trim());
    }
    if (el.attrs) for (const pair of el.attrs.split(";")) { const [attr, key] = pair.split(":").map(s => s.trim()); const v = attrOf(el.tag, attr); if (v !== null) out[key] = decode(v); }
  }
  return out;
}

// The keys the scripts name: every string literal that reads like a key of a group ("hub.wall.h"; T.t(a ? "x.y" : "x.z")
// included). Keys built at run time ("ach." + id + ".name") are covered by their page's groups.
const KEY_LITERAL = new RegExp(`"((?:${["common", "meta", "core", "account", "hub", "char", "ach", "lesson", "guide", "cards", "tag", "pos", "form", "notfound"].join("|")})\\.[\\w.-]*[\\w-])"`, "g");
export function scriptKeys(text) {
  const keys = new Set();
  for (const m of text.matchAll(KEY_LITERAL)) if (!/^(?:index|lesson|guide|cards|404|privacy)\.html$/.test(m[1])) keys.add(m[1]);   // not a page's file name
  return keys;
}
const scriptsOf = src => [...src.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(s => !/window\.TKM_STRINGS = /.test(s)).join("\n");

// The strings inlined into a page: the page's groups, minus the keys only its markup uses, plus any other key its scripts
// read (cards.html sets document.title from meta.cards.title).
export function inlineFor(page, src, strings, file) {
  const groups = PAGES[page];
  if (!groups) return null;
  const mk = markupKeys(src, file), used = scriptKeys(scriptsOf(src) + "\n" + JS.map(f => fs.readFileSync(f, "utf8")).join("\n"));
  const out = {};
  for (const k of Object.keys(strings)) {
    if (k.startsWith("_") || (!groups.includes(k.split(".")[0]) && !used.has(k))) continue;
    if (mk.has(k) && !used.has(k)) continue;
    out[k] = strings[k];
  }
  return out;
}
const TAG = /<script id="tkm-strings">[^\n]*<\/script>\n\s*/;
const CORE = '<script defer src="/assets/js/turkmen.js"></script>';
export function withInline(src, obj, file) {
  src = src.replace(TAG, "");
  if (!obj) return src;
  const i = src.indexOf(CORE);
  if (i < 0) throw new Error(`${file}: no ${CORE}`);
  const json = JSON.stringify(obj).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  const indent = src.slice(src.lastIndexOf("\n", i) + 1, i);
  return src.slice(0, i) + `<script id="tkm-strings">window.TKM_STRINGS = ${json};</script>\n` + indent + src.slice(i);
}

// A page in one edition: English from en.json; French from fr.json over en.json, with <html lang="fr">.
export function render(page, src, lang, en = readStrings("en"), fr = readStrings("fr")) {
  const file = "turkmen/" + page;
  const strings = lang === "fr" ? { ...en, ...Object.fromEntries(Object.entries(fr).filter(([k]) => !k.startsWith("_"))) } : en;
  let out = fill(src, strings, file);
  out = withInline(out, inlineFor(page, out, strings, file), file);
  if (lang === "fr") out = out.replace(/<html lang="en">/, '<html lang="fr">');
  return out;
}

// Checks shared by --check and test.mjs: every key used exists in en.json; returns a list of problems.
export function problems() {
  const en = readStrings("en"), out = [];
  if (!Object.keys(en).length) return ["assets/data/turkmen/i18n/en.json is missing or empty"];
  for (const k of Object.keys(en)) {
    const v = en[k];
    if (!GROUPS.includes(k.split(".")[0]) && !k.startsWith("_")) out.push(`en.json: key “${k}” is in no group (${GROUPS.join(", ")})`);
    if (isPlural(v) && (typeof v.one !== "string" || typeof v.other !== "string")) out.push(`en.json: count “${k}” needs “one” and “other”`);
    else if (!isPlural(v) && typeof v !== "string") out.push(`en.json: “${k}” should be a string or { one, other }`);
  }
  const files = Object.keys(PAGES).map(p => path.join(TM, p));
  for (const f of files.concat(JS)) {
    const text = fs.readFileSync(f, "utf8");
    for (const k of scriptKeys(/\.html$/.test(f) ? scriptsOf(text) : text)) if (!(k in en)) out.push(`${rel(f)}: script reads “${k}”, which is not in en.json`);
    if (/\.html$/.test(f)) for (const k of markupKeys(text, rel(f)).keys()) if (!(k in en)) out.push(`${rel(f)}: markup uses “${k}”, which is not in en.json`);
  }
  return out;
}

// ── command line ──
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), check = args.includes("--check"), pi = args.indexOf("--preview");
  const preview = pi >= 0 ? path.resolve(args[pi + 1] || "") : null;
  const en = readStrings("en"), fr = readStrings("fr");
  const bad = problems();
  let changed = 0;
  for (const page of Object.keys(PAGES)) {
    const f = path.join(TM, page), src = fs.readFileSync(f, "utf8");
    let out;
    try { out = render(page, src, "en", en, fr); } catch (e) { bad.push(e.message); continue; }
    if (out !== src) {
      changed++;
      if (check) bad.push(`turkmen/${page} is out of date: run node scripts/turkmen/pages.mjs`);
      else fs.writeFileSync(f, out);
    }
    if (preview) {
      fs.mkdirSync(preview, { recursive: true });
      fs.writeFileSync(path.join(preview, page), render(page, src, "fr", en, fr));
    }
  }
  for (const b of bad) console.log("ERROR  " + b);
  console.log(check ? `pages.mjs --check: ${bad.length ? bad.length + " problem(s)" : "every page is up to date"}.`
    : `pages.mjs: ${changed} page(s) written${preview ? `, French preview in ${preview}` : ""}${bad.length ? `, ${bad.length} problem(s)` : ""}.`);
  process.exit(bad.length ? 1 : 0);
}
