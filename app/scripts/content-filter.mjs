// Applies content-4plus.mjs to the course in app/www (build-www.mjs calls it after copying the site's files).
// Changes only the copies in www; fails the build when a rule doesn't match or when GUARD finds something.
//
// After the rules: the dropped cards and exercises are removed, index.json is brought in line with what is left
// (lesson titles and exercise counts, the counts block, the deck size), and the pages say how many cards there are.

import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { createHash } from "node:crypto";
import { DROP_CARDS, DROP_EXERCISES, EDITS, PAGE_EDITS, GUARD, GUARD_OK } from "./content-4plus.mjs";

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
  const steps = path.split("/");
  let parent = null, key = null, cur = root;
  for (const step of steps) {
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

export function filterCourse(OUT, fail) {
  const DATA = join(OUT, "assets/data/turkish");
  const files = {};
  const load = (f) => files[f] || (files[f] = JSON.parse(readFileSync(join(DATA, f), "utf8")));
  const errors = [];

  // 1. The edits, each against the text it expects. Drops run after the replacements of the same file, from the
  //    last array index to the first, so earlier paths stay valid.
  const drops = [];
  for (const r of EDITS) {
    const where = r.file;
    try {
      const doc = load(r.file);
      if (r.drop) { drops.push(r); continue; }
      const [parent, key] = locate(doc, r.path, where);
      const s = parent[key];
      if (typeof s !== "string") throw new Error(where + ": " + r.path + " is not a string");
      const n = count(s, r.find);
      if (n !== 1) throw new Error(where + ": " + r.path + ": expected \"" + r.find + "\" once, found " + n + " times");
      parent[key] = s.replace(r.find, () => r.replace);
    } catch (e) { errors.push(e.message); }
  }
  const located = [];
  for (const r of drops) {
    try { const [parent, key] = locate(load(r.file), r.path, r.file); located.push([parent, key]); } catch (e) { errors.push(e.message); }
  }
  located.sort((a, b) => (typeof b[1] === "number" ? b[1] : 0) - (typeof a[1] === "number" ? a[1] : 0));
  for (const [parent, key] of located) { if (Array.isArray(parent)) parent.splice(key, 1); else delete parent[key]; }

  // 2. Cards and exercises left out whole.
  const dropCards = new Set(DROP_CARDS), dropEx = new Set(DROP_EXERCISES);
  let cardsLeft = 0;
  const seenCards = new Set(), seenEx = new Set();
  for (const p of walkFiles(join(DATA, "flashcards"))) {
    const f = relative(DATA, p), doc = load(f);
    doc.cards = doc.cards.filter((c) => { if (dropCards.has(c.id)) { seenCards.add(c.id); return false; } return true; });
    cardsLeft += doc.cards.length;
  }
  for (const id of dropCards) if (!seenCards.has(id)) errors.push("card " + id + " to drop not found");
  for (const p of walkFiles(join(DATA, "lessons"))) {
    const f = relative(DATA, p), doc = load(f);
    doc.exercises = doc.exercises.filter((e) => { if (dropEx.has(e.id)) { seenEx.add(e.id); return false; } return true; });
    for (const v of doc.vocab || []) if (v.card && dropCards.has(v.card)) errors.push(f + ": vocab " + v.tr + " points to the dropped card " + v.card + " (drop or edit it in content-4plus.mjs)");
  }
  for (const id of dropEx) if (!seenEx.has(id)) errors.push("exercise " + id + " to drop not found");

  // 3. index.json in line with what is left.
  const index = load("index.json");
  let lessons = 0, exercises = 0;
  for (const lv of index.levels) for (const u of lv.units) for (const l of u.lessons || []) {
    const doc = load("lessons/" + l.id + ".json");
    l.title = doc.title; l.exercises = doc.exercises.length;
    lessons++; exercises += l.exercises;
  }
  index.counts.lessons = lessons; index.counts.exercises = exercises; index.counts.cards = cardsLeft;
  index.flashcards.count = cardsLeft;
  // Grammar point labels must still match the guides' section titles.
  for (const lv of index.levels) for (const u of lv.units) {
    if (u.status !== "ready") continue;
    const g = load("grammar/" + u.id + ".json");
    for (const s of g.sections || []) if (s.point && index.points[s.point] && index.points[s.point].label !== s.title)
      errors.push("index.json: label of " + s.point + " (\"" + index.points[s.point].label + "\") differs from its guide section (\"" + s.title + "\")");
  }

  if (errors.length) fail("content filter (content-4plus.mjs):\n  " + errors.join("\n  "));
  // The data files are fetched with ?v=<index.version>: give the app's own content its own version.
  index.version = createHash("sha256").update(index.version + "|app-4plus|" + JSON.stringify(Object.keys(files).sort().filter((f) => f !== "index.json").map((f) => [f, files[f]]))).digest("hex").slice(0, 10);
  for (const f of Object.keys(files)) writeFileSync(join(DATA, f), JSON.stringify(files[f], null, 2) + "\n");

  // 4. The guard: nothing of the kinds the app leaves out, in any string of any course file.
  const ok = new Set(GUARD_OK.map(([f, w]) => f + "|" + w.toLowerCase()));
  const found = [];
  const rx = new RegExp(GUARD.source, "giu");
  const scan = (o, f, path) => {
    if (typeof o === "string") {
      if (/^https?:\/\//.test(o)) return;
      const t = o.includes("|") && !o.includes("[") ? o.split("|").join("") : o;   // seg strings: Sür|ücü yor|gun|du
      for (const m of t.matchAll(rx)) if (!ok.has(f + "|" + m[0].toLowerCase())) found.push(f + " " + path + ": " + m[0] + "  …" + t.slice(Math.max(0, m.index - 40), m.index + 40).replace(/\n/g, " ") + "…");
    }
    else if (Array.isArray(o)) o.forEach((x, i) => scan(x, f, path + "/" + i));
    else if (o && typeof o === "object") for (const k of Object.keys(o)) scan(o[k], f, path + "/" + k);
  };
  for (const p of walkFiles(DATA)) { const f = relative(DATA, p); scan(JSON.parse(readFileSync(p, "utf8")), f, ""); }
  if (found.length) fail("content guard: " + found.length + " match(es) the app must not ship (content-4plus.mjs GUARD):\n  " + found.join("\n  "));

  // 5. The pages: the deck's size.
  for (const r of PAGE_EDITS) {
    const p = join(OUT, r.file);
    let s = readFileSync(p, "utf8");
    const n = count(s, r.find);
    if (n === 0 || (!r.all && n !== 1)) fail("content filter: " + r.file + ": expected \"" + r.find + "\" " + (r.all ? "at least once" : "once") + ", found " + n);
    s = s.split(r.find).join(r.replace.split("{N}").join(String(cardsLeft)));
    writeFileSync(p, s);
  }
  return { cards: cardsLeft, lessons, exercises, dropped: { cards: dropCards.size, exercises: dropEx.size }, edits: EDITS.length };
}
