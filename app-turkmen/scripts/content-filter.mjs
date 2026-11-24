// Applies content-4plus.mjs to the course in app-turkmen/www (build-www.mjs calls it after copying the site's files).
// A fork of app/scripts/content-filter.mjs. Changes only the copies in www; fails the build when a rule doesn't match
// or when GUARD finds something.
//
// After the rules: the dropped cards are removed and the app's own card added, index.json is brought in line with
// what is left (lesson titles and exercise counts, the counts block, the deck), with a version of its own.

import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { createHash } from "node:crypto";
import { DROP_CARDS, ADD_CARDS, EDITS, REPLACE, GUARD, GUARD_OK } from "./content-4plus.mjs";

function walkFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walkFiles(p)); else if (name.endsWith(".json")) out.push(p);
  }
  return out;
}

// "a/b/key=value/0" → [parent, key] of the last step, so a rule can read, replace or remove it.
function locate(root, path, where) {
  let parent = null, key = null, cur = root;
  for (const step of path.split("/")) {
    if (cur === null || typeof cur !== "object") throw new Error(where + ": " + path + ": nothing at " + step);
    parent = cur;
    const eq = step.indexOf("=");
    if (eq > 0 && Array.isArray(cur)) {
      const k = step.slice(0, eq), v = step.slice(eq + 1);
      const hits = cur.map((x, i) => [x, i]).filter(([x]) => x && typeof x === "object" && x[k] === v);
      if (hits.length !== 1) throw new Error(where + ": " + path + ": " + hits.length + " elements with " + step);
      key = hits[0][1];
    } else if (Array.isArray(cur)) {
      key = Number(step);
      if (!Number.isInteger(key) || key < 0 || key >= cur.length) throw new Error(where + ": " + path + ": no index " + step);
    } else {
      if (!(step in cur)) throw new Error(where + ": " + path + ": no key " + step);
      key = step;
    }
    cur = cur[key];
  }
  return [parent, key];
}

function count(hay, needle) { let n = 0, i = 0; while ((i = hay.indexOf(needle, i)) >= 0) { n++; i += needle.length; } return n; }

// Every string of a JSON value, through fn (which returns the new string).
function mapStrings(o, fn) {
  if (typeof o === "string") return fn(o);
  if (Array.isArray(o)) return o.map((x) => mapStrings(x, fn));
  if (o && typeof o === "object") { const r = {}; for (const k of Object.keys(o)) r[k] = mapStrings(o[k], fn); return r; }
  return o;
}

export function filterCourse(OUT, fail) {
  const DATA = join(OUT, "assets/data/turkmen");
  const files = {};
  const load = (f) => files[f] || (files[f] = JSON.parse(readFileSync(join(DATA, f), "utf8")));
  const errors = [];

  // 1. Cards left out whole (before the replacements, so their words don't count).
  const dropCards = new Set(DROP_CARDS), seenCards = new Set();
  for (const p of walkFiles(join(DATA, "flashcards"))) {
    const f = relative(DATA, p), doc = load(f);
    doc.cards = doc.cards.filter((c) => { if (dropCards.has(c.id)) { seenCards.add(c.id); return false; } return true; });
  }
  for (const id of dropCards) if (!seenCards.has(id)) errors.push("card " + id + " to drop not found");

  // 2. The edits, each against the text it expects. Drops run last, from the last array index to the first.
  const drops = [];
  for (const r of EDITS) {
    try {
      const doc = load(r.file);
      if (r.drop) { drops.push(r); continue; }
      const [parent, key] = locate(doc, r.path, r.file);
      if ("set" in r) { parent[key] = JSON.parse(JSON.stringify(r.set)); continue; }
      const s = parent[key];
      if (typeof s !== "string") throw new Error(r.file + ": " + r.path + " is not a string");
      const n = count(s, r.find);
      if (n !== 1) throw new Error(r.file + ": " + r.path + ": expected \"" + r.find + "\" once, found " + n + " times");
      parent[key] = s.replace(r.find, () => r.replace);
    } catch (e) { errors.push(e.message); }
  }
  const located = [];
  for (const r of drops) {
    try { located.push(locate(load(r.file), r.path, r.file)); } catch (e) { errors.push(e.message); }
  }
  located.sort((a, b) => (typeof b[1] === "number" ? b[1] : 0) - (typeof a[1] === "number" ? a[1] : 0));
  for (const [parent, key] of located) { if (Array.isArray(parent)) parent.splice(key, 1); else delete parent[key]; }

  // 3. The replacements, in every string of every course file, each the expected number of times in all.
  for (const p of walkFiles(DATA)) load(relative(DATA, p));
  const seen = REPLACE.map(() => 0);
  for (const f of Object.keys(files)) {
    files[f] = mapStrings(files[f], (s) => {
      REPLACE.forEach(([find, rep], i) => { const n = count(s, find); if (n) { seen[i] += n; s = s.split(find).join(rep); } });
      return s;
    });
  }
  REPLACE.forEach(([find, , n], i) => { if (seen[i] !== n) errors.push("REPLACE \"" + find + "\": expected " + n + " times, found " + seen[i]); });

  // 4. The app's own card, in a file of its own listed in index.json; its id and word must be new to the deck.
  let cardsLeft = 0;
  const known = new Set(), words = new Set();
  for (const f of Object.keys(files)) if (f.startsWith("flashcards/")) for (const c of files[f].cards) { known.add(c.id); words.add(c.tk); cardsLeft++; }
  for (const c of ADD_CARDS.doc.cards) {
    if (!/^fc-\d{4}$/.test(c.id) || known.has(c.id)) errors.push(ADD_CARDS.file + ": card id " + c.id + " is malformed or already in the deck");
    if (words.has(c.tk)) errors.push(ADD_CARDS.file + ": " + c.tk + " is already in the deck");
  }
  files[ADD_CARDS.file] = JSON.parse(JSON.stringify(ADD_CARDS.doc));
  cardsLeft += ADD_CARDS.doc.cards.length;
  // Lessons must not point to a dropped card.
  for (const f of Object.keys(files)) if (f.startsWith("lessons/"))
    for (const v of files[f].vocab || []) if (v.card && dropCards.has(v.card)) errors.push(f + ": vocab " + v.tk + " points to the dropped card " + v.card);

  // 5. index.json in line with what is left.
  const index = files["index.json"];
  let lessons = 0, exercises = 0;
  for (const lv of index.levels) for (const u of lv.units) for (const l of u.lessons || []) {
    const doc = files["lessons/" + l.id + ".json"];
    if (!doc) continue;   // a planned lesson not written yet
    l.title = doc.title; l.exercises = doc.exercises.length;
    lessons++; exercises += l.exercises;
  }
  if (index.counts) { if ("lessons" in index.counts) index.counts.lessons = lessons; if ("exercises" in index.counts) index.counts.exercises = exercises; if ("cards" in index.counts) index.counts.cards = cardsLeft; }
  index.flashcards.count = cardsLeft;
  if (!index.flashcards.files.includes(ADD_CARDS.file)) index.flashcards.files.push(ADD_CARDS.file);

  if (errors.length) fail("content filter (content-4plus.mjs):\n  " + errors.join("\n  "));
  // The data files are fetched with ?v=<index.version>: give the app's own content its own version.
  index.version = createHash("sha256").update(String(index.version) + "|app-4plus|" + JSON.stringify(Object.keys(files).sort().filter((f) => f !== "index.json").map((f) => [f, files[f]]))).digest("hex").slice(0, 10);
  for (const f of Object.keys(files)) writeFileSync(join(DATA, f), JSON.stringify(files[f], null, 2) + "\n");

  // 6. The guard: nothing of the kinds the app leaves out, in any string of any course file.
  const ok = new Set(GUARD_OK.map(([f, w]) => f + "|" + w.toLowerCase()));
  const found = [];
  const rx = new RegExp(GUARD.source, "giu");
  const scan = (o, f, path) => {
    if (typeof o === "string") {
      if (/^https?:\/\//.test(o)) return;
      const t = o.includes("|") && !o.includes("[") ? o.split("|").join("") : o;   // seg strings: Surat çek|mä|ň!
      for (const m of t.matchAll(rx)) if (!ok.has(f + "|" + m[0].toLowerCase())) found.push(f + " " + path + ": " + m[0] + "  …" + t.slice(Math.max(0, m.index - 40), m.index + 40).replace(/\n/g, " ") + "…");
    }
    else if (Array.isArray(o)) o.forEach((x, i) => scan(x, f, path + "/" + i));
    else if (o && typeof o === "object") for (const k of Object.keys(o)) scan(o[k], f, path + "/" + k);
  };
  for (const p of walkFiles(DATA)) { const f = relative(DATA, p); scan(JSON.parse(readFileSync(p, "utf8")), f, ""); }
  if (found.length) fail("content guard: " + found.length + " match(es) the app must not ship (content-4plus.mjs GUARD):\n  " + found.join("\n  "));

  return { cards: cardsLeft, lessons, exercises, dropped: { cards: dropCards.size }, added: ADD_CARDS.doc.cards.length,
           edits: EDITS.length + REPLACE.reduce((a, r) => a + r[2], 0) };
}
