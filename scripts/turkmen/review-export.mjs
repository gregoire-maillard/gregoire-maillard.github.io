#!/usr/bin/env node
// Turkmen course (Daily Turkmen, /turkmen/): exports the Turkmen text of one level into a review sheet for a native
// speaker, the first of the two TK-REVIEW conversations (turkmen/TM-PROJECT.md 9). It reads the content and the two
// spec files and never changes them. No dependencies: the .xlsx is written here as Office Open XML in a zip.
//
//   node scripts/turkmen/review-export.mjs a1            write turkmen/review/a1-review.xlsx and a1-review-note.md
//   options: --out <dir>   another folder for the two files (default turkmen/review)
//            --csv         also write <level>-review.csv (UTF-8 with a BOM, the same columns)
//            --list        print the "Check first" rows
//
// One row per distinct string: the same Turkmen with the same English and the same verdict (shown as right, or marked
// wrong) is one row, whose Location cell lists every place it comes from. Columns: No., Part, Flag, Kind, Turkmen,
// English, What to check, then the reviewer's OK?, Correction and Comment, then Location (file and JSON path), which the
// reviewer can ignore. The rows, in this order:
//
//   Check first   the forms the progress log lists as uncertain (TM-PROJECT.md 10: the passages "for the native
//                 review", "not sure of", "Kept out", "Engine points", "to check first"), taken from the rows of this
//                 level's batches and, from other rows (TK-MORPH, the build and flashcard conversations), only the
//                 items whose Turkmen occurs in this level; then the open questions of TM-CURRICULUM.md, one row each
//                 (question 9 one row per point)
//   Unit 1 …      per unit of the level that has a unit file: its Turkmen title, the grammar guide (examples,
//                 paradigms, tables, dialogues), the lessons (new words, then each exercise: prompts and sentences,
//                 every expansion of every accepted answer, the rejected answers with their feedback, right choices with
//                 the wrong ones beside them, match pairs, built words, verb tables), the interlude (mini-reads,
//                 dialogues, tables, quotes, word list, questions)
//   Flashcards    the cards whose `level` is this level: word, example, forms, and the Turkmen of the note
//   Pages         A1 only: achievement names and streak ranks (turkmen.js), the greeting lines and other Turkmen in
//                 the pages, the level summaries
//   Explanations  optional: the Turkmen inside English explanations (hints, feedback, guide and interlude prose,
//                 rule lines, summaries), one row per text, without the texts whose Turkmen is all in rows above
//
// Check first lists the uncertain forms and phrases, then the open questions, then the single words of the writers'
// lists of uncertain words; each says in which rows its Turkmen is used. A content row that uses an uncertain form
// or phrase (one found in eight rows or fewer) is flagged with that row's number. The note for the reviewer, in
// English and Turkmen, is written beside the sheet and is also its first tab, "Read me", with a place for initials.
//
// The second TK-REVIEW conversation reads the filled-in sheet back: the Location cell names every place a corrected
// string comes from (file, JSON path, exercise or card ID, and which expansion of an accept entry it is).
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DATA = path.join(ROOT, "assets/data/turkmen");
const PROJECT = path.join(ROOT, "turkmen/TM-PROJECT.md");
const CURRICULUM = path.join(ROOT, "turkmen/TM-CURRICULUM.md");
const require = createRequire(import.meta.url);
const TKM = require(path.join(ROOT, "assets/js/turkmen.js"));
const rel = p => path.relative(ROOT, p).split(path.sep).join("/");
const readJson = p => JSON.parse(fs.readFileSync(p, "utf8"));

// ─────────────────────────── command line ───────────────────────────
const opt = { level: null, out: path.join(ROOT, "turkmen/review"), csv: false, list: false };
{
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--out") opt.out = path.resolve(a[++i]);
    else if (a[i] === "--csv") opt.csv = true;
    else if (a[i] === "--list") opt.list = true;
    else if (/^[ab][12]$/i.test(a[i])) opt.level = a[i].toLowerCase();
    else { console.error("Unknown argument " + a[i]); process.exit(2); }
  }
  if (!opt.level) {
    console.error("Usage: node scripts/turkmen/review-export.mjs <level> [--out dir] [--csv] [--list]   (level: a1, a2 or b1)");
    process.exit(2);
  }
}
const LEVEL = opt.level, LEVEL_UP = LEVEL.toUpperCase();
const index = readJson(path.join(DATA, "index.json"));
const levelFile = path.join(DATA, "levels", LEVEL + ".json");
if (!fs.existsSync(levelFile)) { console.error("No level file " + rel(levelFile)); process.exit(1); }
const level = readJson(levelFile);

// ─────────────────────────── text helpers ───────────────────────────
const NBSP = /[\u00a0\u202f]/g;
const clean = s => String(s == null ? "" : s).normalize("NFC").replace(NBSP, " ").replace(/\s+/g, " ").trim();
const plain = s => clean(TKM.plain(s));                       // Rich or TkRich without markup
const unseg = s => clean(String(s || "").replace(/\|/g, ""));  // Seg → text
const decode = s => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
// The Turkmen spans of a Rich text (*…*), as the pages render them.
function spans(rich) {
  const out = [];
  for (const m of String(TKM.rich(rich || "")).matchAll(/<i lang="tk"[^>]*>([\s\S]*?)<\/i>/g)) {
    const t = clean(decode(m[1].replace(/<[^>]+>/g, "")));
    if (t) out.push(t);
  }
  return out;
}
// A Turkmen span worth showing: more than single letters and notation (a, e, ä; -da; A, Y).
const wordy = s => /[a-zäçžňöşüýA-ZÄÇŽŇÖŞÜÝ]{2,}/.test(s.replace(/^-/, "").replace(/\([^)]*\)/g, "")) && !/[a-zäçžňöşüý()][AYÄI]|\([A-Za-z]\)/.test(s);
const uniq = a => [...new Set(a)];
// For matching forms inside strings: lower case, no punctuation.
const key = s => " " + clean(s).toLowerCase().replace(/[.,!?;:“”„"«»()…—–\[\]]/g, " ").replace(/\s+/g, " ").trim() + " ";
const POS = { noun: "noun", verb: "verb", adj: "adjective", adv: "adverb", pron: "pronoun", num: "number", postp: "postposition",
  conj: "conjunction", interj: "interjection", det: "determiner", particle: "particle", phrase: "phrase" };
const FORM = { prs: "present (-ýAr), he/she form", past: "past (-dY), he/she form", fut: "future (-jAk), he/she form",
  aor: "general present (-Ar), he/she form", cvb: "converb (-(Y)p)", acc: "accusative (definite object)",
  poss3: "his/her … (possessive)", pl: "plural" };
const list = (a, max = 8) => a.length <= max ? a.join(" · ") : a.slice(0, max).join(" · ") + " · (+" + (a.length - max) + " more)";
const stop = s => /[.!?…]$/.test(s) ? s : s + ".";   // end a sentence with one full stop

// ─────────────────────────── rows ───────────────────────────
// A row: { part, flag, kind, tk, en, check, locs[], verdict } with verdict "ok" (shown as right: sentences, answers,
// words, examples), "wrong" (marked wrong) or "q" (a question for the reviewer). Accepted variants are "ok" too, with
// the kind "Also accepted"; if the same string is also shown as an answer elsewhere, the row keeps the first kind.
const rows = [], byKey = new Map();
let part = "";
function add(kind, tk, en, check, loc, verdict = "ok") {
  tk = clean(tk); en = clean(en); check = clean(check);
  if (!tk) return null;
  const k = (verdict === "wrong" ? "w" : "o") + "\u0001" + tk + "\u0001" + en;
  const old = byKey.get(k);
  if (old) {
    if (!old.locs.includes(loc)) old.locs.push(loc);
    if (check && !old.check.includes(check) && old.extra < 2) { old.check += (old.check ? " / " : "") + check; old.extra++; }
    return old;
  }
  const r = { part, flag: "", kind, tk, en, check, locs: [loc], verdict, extra: 0 };
  rows.push(r); byKey.set(k, r);
  return r;
}
// Rich texts with Turkmen inside English: the optional last part.
const expl = [];
function addExpl(rich, loc, where) {
  if (!rich) return;
  const s = spans(rich).filter(wordy);
  if (s.length) expl.push({ part, tk: uniq(s), en: plain(rich), where, loc });
}
const L = (file, p, extra) => rel(file) + "  " + p + (extra ? "  (" + extra + ")" : "");
function expansions(entry) { const e = TKM.expand(entry); return e.error ? [entry] : e.list; }
// Every expansion of an accept list, in order, with where it comes from.
function accepted(list, base) {
  const out = [];
  (list || []).forEach((a, i) => {
    const xs = expansions(a);
    xs.forEach((x, j) => out.push({ text: x, path: base + "[" + i + "]", extra: xs.length > 1 ? "variant " + (j + 1) + " of " + xs.length : "" }));
  });
  return out;
}
const glossary = new Map();   // Turkmen word → English, for the uncertain forms
const gloss = (tk, en) => { const k = key(tk); if (en && !glossary.has(k)) glossary.set(k, clean(en)); };

// ─────────────────────────── the level's content ───────────────────────────
const units = level.units.filter(u => fs.existsSync(path.join(DATA, "units", u + ".json")));
units.forEach((uid, ui) => {
  const uFile = path.join(DATA, "units", uid + ".json"), unit = readJson(uFile);
  part = "Unit " + (ui + 1);
  add("Unit title", unit.titleTk, unit.title, "The unit's Turkmen tagline, shown under its English title.", L(uFile, "titleTk"));
  addExpl(unit.summary, L(uFile, "summary"), "unit summary");
  const gFile = path.join(DATA, "grammar", uid + ".json");
  if (fs.existsSync(gFile)) {
    const g = readJson(gFile);
    addExpl(g.intro, L(gFile, "intro"), "guide introduction");
    g.sections.forEach((s, si) => blocks(s.blocks, gFile, "sections[" + si + "].blocks", "guide"));
    (g.summary || []).forEach((t, i) => addExpl(t, L(gFile, "summary[" + i + "]"), "guide summary"));
  }
  for (const lid of unit.lessons) {
    const lFile = path.join(DATA, "lessons", lid + ".json");
    if (fs.existsSync(lFile)) lesson(readJson(lFile), lFile);
  }
  const cFile = path.join(DATA, "culture", uid + ".json");
  if (fs.existsSync(cFile)) {
    const c = readJson(cFile);
    blocks(c.blocks, cFile, "blocks", "interlude");
    (c.vocab || []).forEach((v, i) => { gloss(v.tk, v.en); add("Word", v.tk, v.en, "In the interlude's word list.", L(cFile, "vocab[" + i + "]")); });
    (c.questions || []).forEach((q, i) => question(q, cFile, "questions[" + i + "]", "Interlude question"));
  }
});

function lesson(les, file) {
  addExpl(les.intro && les.intro.text, L(file, "intro.text"), "lesson tip");
  (les.vocab || []).forEach((v, i) => { gloss(v.tk, v.en); add("Word", v.tk, v.en, "New word of the lesson" + (POS[v.pos] ? " (" + POS[v.pos] + ")" : "") + ".", L(file, "vocab[" + i + "]")); });
  les.exercises.forEach((e, ei) => {
    const P = "exercises[" + ei + "]", id = e.id;
    const at = (p, extra) => L(file, P + (p ? "." + p : ""), id + (extra ? ", " + extra : ""));
    addExpl(e.hint, at("hint"), "hint");
    addExpl(e.explain, at("explain"), "explanation after answering");
    if (e.why) for (const k of Object.keys(e.why)) addExpl(e.why[k], at("why." + k), "feedback on a wrong choice");
    for (const [ri, r] of (e.reject || []).entries()) addExpl(r.why, at("reject[" + ri + "].why"), "feedback on a wrong answer");
    switch (e.type) {
      case "translate": {
        if (e.from === "en") {
          accepted(e.accept, "accept").forEach((a, i) =>
            add(i ? "Also accepted" : "Answer", a.text, e.prompt, i ? "Also accepted as a translation of the English." : "Shown as the right translation of the English.", at(a.path, a.extra)));
          (e.reject || []).forEach((r, ri) => add("Marked wrong", r.answer, e.prompt, "Learners who type this are told: " + plain(r.why), at("reject[" + ri + "].answer"), "wrong"));
        } else {
          const en = accepted(e.accept, "accept").map(a => a.text);
          const rj = (e.reject || []).map(r => r.answer + " (" + plain(r.why) + ")");
          add("Sentence", e.prompt, en[0], "Learners translate it into English. Accepted: " + stop(list(en)) + (rj.length ? " Marked wrong: " + rj.join("; ") : ""), at("prompt"));
        }
        break;
      }
      case "wordbank": {
        if (e.from === "en") {
          add("Answer", e.text, e.prompt, "Built from tiles." + (e.distractors && e.distractors.length ? " Extra tiles offered: " + e.distractors.join(" · ") + "." : ""), at("text"));
          (e.accept || []).forEach((a, i) => add("Also accepted", a, e.prompt, "Also accepted, built from the same tiles.", at("accept[" + i + "]")));
        } else add("Sentence", e.prompt, e.text, "Learners build the English from tiles." + ((e.accept || []).length ? " Also accepted: " + e.accept.join(" / ") : ""), at("prompt"));
        break;
      }
      case "cloze": cloze(e, at); break;
      case "mcq": {
        (e.context || []).forEach((c, ci) => { gloss(c.tk, c.en); add("Dialogue line", c.tk, c.en || "", (c.who ? "Said by " + c.who + ". " : "") + "Context of a question.", at("context[" + ci + "].tk")); });
        question(e, file, P, "Question", id);
        break;
      }
      case "match":
        e.pairs.forEach((p, pi) => { gloss(p[0], p[1]); add("Word", p[0], p[1], "A pair to match.", at("pairs[" + pi + "]")); });
        break;
      case "morph":
        gloss(e.result, e.gloss);
        add("Built word", e.result, e.gloss, "Built from tiles: " + e.parts.join(" + ") + " (from " + e.base + "). Wrong tiles offered: " + (e.distractors || []).join(" · ") + ".", at("result"));
        break;
      case "conjugate":
        e.cells.forEach((c, ci) => accepted(c.accept, "cells[" + ci + "].accept").forEach((a, i) =>
          add(i ? "Also accepted" : "Table form", a.text, c.p + ": " + plain(e.label), i ? "Also accepted in this cell (person: " + c.p + ")." : "Person: " + c.p + ". Base: " + e.base + ".", at(a.path, a.extra))));
        break;
      case "reading":
        add("Reading", plain(e.passage), e.translation || "", e.title ? "Title: " + e.title : "", at("passage"));
        if (e.title) add("Title", e.title, "", "Title of a reading.", at("title"));
        (e.glossary || []).forEach((g, gi) => { gloss(g.tk, g.en); add("Word", g.tk, g.en, "Glossary of a reading.", at("glossary[" + gi + "]")); });
        (e.questions || []).forEach((q, qi) => question(q, file, P + ".questions[" + qi + "]", "Question", id));
        break;
      case "open":
        if (e.sourceLang === "tk") add("Sentence", e.source, "", "Text to translate.", at("source"));
        if (e.modelsLang === "tk") e.models.forEach((m, mi) => add(mi ? "Also accepted" : "Answer", m, plain(e.task), "Model answer.", at("models[" + mi + "]")));
        break;
    }
  });
}

// cloze: the sentence with every blank filled; each other accepted filling and each rejected one in its own sentence.
function cloze(e, at) {
  const firsts = e.blanks.map(b => b.accept ? expansions(b.accept[0])[0] : b.options[b.answer]);
  const fill = (i, x) => { let n = 0; return e.text.replace(/___/g, () => { const v = n === i ? x : firsts[n]; n++; return v; }); };
  const choices = e.blanks.map((b, i) => b.options ? "gap " + (i + 1) + " offers " + b.options.join(" / ") : null).filter(Boolean);
  add("Answer", fill(-1), e.en, "Gap-fill; the gaps are " + firsts.map(x => "“" + x + "”").join(", ") + "." + (choices.length ? " Choices: " + choices.join("; ") + ". Say if a wrong choice is also right." : ""), at("text"));
  e.blanks.forEach((b, i) => {
    if (!b.accept) return;
    accepted(b.accept, "blanks[" + i + "].accept").slice(1).forEach(a => add("Also accepted", fill(i, a.text), e.en, "Also accepted in gap " + (i + 1) + ": “" + a.text + "”.", at(a.path, a.extra)));
    (b.reject || []).forEach((r, ri) => add("Marked wrong", fill(i, r.answer), e.en, "Gap " + (i + 1) + " typed “" + r.answer + "”. Learners are told: " + plain(r.why), at("blanks[" + i + "].reject[" + ri + "].answer"), "wrong"));
  });
}

// mcq and the questions of interludes and readings
function question(q, file, p, kind, id) {
  const text = q.q || q.question, en = q.optionsLang !== "tk";
  const opts = q.options.map(o => en ? plain(o) : o), ans = opts[q.answer], wrong = opts.filter((_, k) => k !== q.answer);
  const loc = L(file, p, id || "");
  if (!en) {
    add("Right choice", ans, plain(text), "Wrong choices shown: " + stop(wrong.join(" · ")) + " Say if one of them is also right.", loc + " options[" + q.answer + "]");
  } else {
    const s = spans(text).filter(wordy);
    if (s.length) add(kind, uniq(s).join(" · "), ans, "Question: " + plain(text) + " Right answer: " + stop(ans) + " Wrong choices: " + stop(wrong.join(" · ")), loc + " question");
  }
  addExpl(q.explain, loc + " explain", "explanation after answering");
}

// Content blocks of guides and interludes
function blocks(list, file, base, where) {
  (list || []).forEach((b, bi) => {
    const p = base + "[" + bi + "]";
    switch (b.type) {
      case "p": addExpl(b.text, L(file, p), where); break;
      case "list": b.items.forEach((t, i) => addExpl(t, L(file, p + ".items[" + i + "]"), where)); break;
      case "callout": addExpl(b.text, L(file, p + ".text"), where + " box"); break;
      case "image": addExpl(b.caption, L(file, p + ".caption"), where); break;
      case "see": addExpl(b.text, L(file, p + ".text"), where); break;
      case "rule": b.lines.forEach((t, i) => { if (/[a-zäçžňöşüý]{3,}/.test(t)) expl.push({ part, tk: [clean(t)], en: clean(b.label || ""), where: "rule line (notation)", loc: L(file, p + ".lines[" + i + "]") }); }); break;
      case "examples":
        b.items.forEach((x, i) => { gloss(x.tk, x.en); add("Example", x.tk, x.en, x.note ? "Note shown: " + plain(x.note) : "", L(file, p + ".items[" + i + "]")); });
        break;
      case "paradigm":
        b.rows.forEach((r, i) => add("Table form", unseg(r.tk), r.en || "", (b.title ? plain(b.title) + ". " : "") + "Person: " + r.p + ".", L(file, p + ".rows[" + i + "]")));
        break;
      case "table": {
        const head = b.head.map(plain);
        addExpl(b.caption, L(file, p + ".caption"), where + " table caption");
        b.rows.forEach((row, ri) => {
          const tk = [], en = [];
          row.forEach((cell, ci) => {
            const col = b.cols[ci];
            if (col === "tk") { if (wordy(cell) || /\d/.test(cell) && /[a-zäçžňöşüý]/i.test(cell)) tk.push(clean(cell)); }
            else if (col === "seg") tk.push(unseg(cell));
            else if (col === "en") en.push(clean(cell));
            else if (col === "rich") { const s = spans(cell).filter(wordy); if (s.length) tk.push(...s); en.push(plain(cell)); }
          });
          if (!tk.length) return;
          if (tk.length === 1 && en.length === 1) gloss(tk[0], en[0]);
          add("Table row", uniq(tk).join(" · "), en.join(" · "), "Table" + (b.caption ? " “" + plain(b.caption) + "”" : "") + ", columns: " + head.join(" · ") + ".", L(file, p + ".rows[" + ri + "]"));
        });
        break;
      }
      case "dialogue":
        b.lines.forEach((l, i) => add("Dialogue line", l.tk, l.en, l.who ? "Said by " + l.who + "." : "", L(file, p + ".lines[" + i + "]")));
        break;
      case "parallel":
        add("Reading", plain(b.tk), b.en, "A short reading with its English beside it.", L(file, p + ".tk"));
        break;
      case "passage":
        add("Reading", plain(b.tk), "", "A Turkmen text.", L(file, p + ".tk"));
        (b.glossary || []).forEach((g, i) => { gloss(g.tk, g.en); add("Word", g.tk, g.en, "Glossary of a text.", L(file, p + ".glossary[" + i + "]")); });
        break;
      case "quote":
        add("Quote", b.tk, b.en, "Traditional text. Source given: " + b.source + ".", L(file, p + ".tk"));
        break;
    }
  });
}

// ─────────────────────────── flashcards ───────────────────────────
part = "Flashcards";
const cards = [];
for (const f of index.flashcards.files) {
  const file = path.join(DATA, "flashcards", path.basename(f));
  readJson(file).cards.forEach((c, i) => { if (c.level === LEVEL) cards.push({ c, file, i }); });
}
cards.sort((a, b) => a.c.rank - b.c.rank);
for (const { c, file, i } of cards) {
  const p = "cards[" + i + "]", at = (q) => L(file, p + "." + q, c.id);
  gloss(c.tk, c.en.join("; "));
  add("Card word", c.tk, c.en.join("; "), (POS[c.pos] || c.pos) + (c.sense ? ", sense " + c.sense : "") + ". Rank " + c.rank + " in the deck" + (c.unit ? ", taught in " + c.unit : "") + ".", at("tk"));
  add("Card example", c.ex.tk, c.ex.en, "Example sentence on the card for " + c.tk + ".", at("ex"));
  for (const k of ["prs", "past", "fut", "aor", "cvb", "acc", "poss3", "pl"])
    if (c.forms && c.forms[k]) add("Card form", c.forms[k], c.en[0] + ": " + FORM[k], "Form shown on the card for " + c.tk + ".", at("forms." + k));
  if (c.note) { const s = spans(c.note).filter(wordy); if (s.length) add("Card note", uniq(s).join(" · "), plain(c.note), "The Turkmen in the note on the card for " + c.tk + ".", at("note")); }
}

// ─────────────────────────── the pages (A1 only) ───────────────────────────
if (LEVEL === "a1") {
  part = "Pages";
  const js = path.join(ROOT, "assets/js/turkmen.js");
  const ach = TKM.progress.achievements(index, TKM.progress.defaults("course"), TKM.progress.defaults("cards"), TKM.progress.defaults("settings"), Date.now());
  for (const a of ach)
    add(/^streak-/.test(a.id) ? "Streak rank" : "Achievement", a.tk, a.en + " (" + a.text + ")", "A badge name in My Profile; the English name is shown beside it.", L(js, "achievements(), id “" + a.id + "”"));
  // The pages read their English from assets/data/turkmen/i18n/en.json (TM-FR.md 4.4, FR-BUILD-1): a T.t("key", …) call
  // reads as the string it gives, its {placeholders} as what the page fills in (a count's forms: the words they share).
  const EN_JSON = path.join(DATA, "i18n/en.json"), EN = fs.existsSync(EN_JSON) ? readJson(EN_JSON) : {};
  const shared = v => {
    if (typeof v === "string") return v;
    const a = v.one.split(" "), b = v.other.split(" ");
    if (a.length !== b.length) return v.other;
    return a.map((w, i) => (w === b[i] ? w : "{n}")).join(" ");
  };
  const asExpr = v => shared(v).split(/(?:\{\w+\}(?: \{\w+\})*)/).map(x => JSON.stringify(x)).join(" + x + ").replace(/^"" \+ | \+ ""$/g, "");
  const resolveT = expr => expr.replace(/T\.t\("([\w.-]+)"(?:, \{[^}]*\})?\)/g, (m, k) => (k in EN ? asExpr(EN[k]) : m));
  const tkSpan = /<(?:i|span|b|p)\b[^>]*\blang=\\?"tk\\?"[^>]*>([^<]+)<\//g;
  for (const page of fs.readdirSync(path.join(ROOT, "turkmen")).filter(f => f.endsWith(".html")).sort()) {
    const file = path.join(ROOT, "turkmen", page), lines = fs.readFileSync(file, "utf8").split("\n");
    lines.forEach((line, n) => {
      if (/window\.TKM_STRINGS = /.test(line)) return;   // the page's copy of en.json: read below, from en.json
      const g = line.match(/\bsay = "([^"]+)"; sub = (.+?);\s*(?:yay = true;\s*)?\}?$/);
      if (g) {   // the English under it: string literals, "…" for what the page fills in, " / " between two choices
        const expr = resolveT(g[2]), lits = [...expr.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map(m => m[1]);
        const en = /\?\s*"/.test(expr) && /"\s*:\s*"/.test(expr) ? lits.join(" / ")
          : expr.split(" + ").map(x => (x.trim().match(/^"((?:[^"\\]|\\.)*)"$/) || [, "…"])[1]).join("").replace(/\s*…\s*/g, " … ").replace(/ … ([,.])/g, " …$1");
        add("Greeting", g[1], en, "Said by the character on the front page.", L(file, "line " + (n + 1)));
      }
      for (const m of line.matchAll(tkSpan)) {
        const t = clean(decode(m[1]));
        if (/esc\(|[+'"\\]/.test(t) || t.split(/[\s,]+/).every(w => w.length <= 1)) continue;
        add("Page text", t, context(line, m[1]), "Turkmen in the English text of " + page + ".", L(file, "line " + (n + 1)));
      }
    });
    // the strings this page's script reads (its markup's are in the page above)
    const src = lines.filter(l => !/window\.TKM_STRINGS = /.test(l)).join("\n");
    for (const k of Object.keys(EN)) {
      if (!src.includes('"' + k + '"')) continue;
      if (new RegExp('data-i18n(?:-html)?="' + k.replace(/\./g, "\\.") + '"').test(src)) continue;
      for (const v of typeof EN[k] === "string" ? [EN[k]] : [EN[k].one, EN[k].other]) for (const m of v.matchAll(tkSpan)) {
        const t = clean(decode(m[1]));
        if (/\{\w+\}/.test(t) || t.split(/[\s,]+/).every(w => w.length <= 1)) continue;
        add("Page text", t, context(v, m[1]), "Turkmen in the English text of " + page + ".", L(EN_JSON, k));
      }
    }
  }
  for (const lv of index.levels) {
    const f = path.join(DATA, "levels", lv.id + ".json"), l = readJson(f), s = spans(l.summary).filter(wordy);
    if (s.length) add("Level summary", uniq(s).join(" · "), plain(l.summary), "The Turkmen in the front page's summary of level " + l.cefr + ".", L(f, "summary"));
  }
}
// The English around a Turkmen span in a page: its sentence or string.
function context(line, span) {
  const s = line.replace(/<[^>]+>/g, "").replace(/\\"/g, '"'), at = s.indexOf(span.trim());
  if (at < 0) return "";
  const isQuote = i => /["']/.test(s[i]) && !(/\p{L}/u.test(s[i - 1] || "") && /\p{L}/u.test(s[i + 1] || ""));
  let a = at; while (a > 0 && !isQuote(a - 1)) a--;
  let b = at + span.length; while (b < s.length && !isQuote(b)) b++;
  return clean(decode(s.slice(a, b))).slice(0, 300);
}

// ─────────────────────────── explanations (optional) ───────────────────────────
// One row per text; texts whose Turkmen is all in the rows above are left out, and so are repeats.
{
  part = "Explanations";
  const known = new Set(rows.map(r => key(r.tk)));
  for (const r of rows) for (const piece of r.tk.split(" · ")) known.add(key(piece));
  const seenText = new Map();
  for (const x of expl) {
    const fresh = x.tk.filter(t => !known.has(key(t)) && !known.has(key(t.replace(/^-/, ""))));
    if (!fresh.length) continue;
    const k = x.en;
    if (seenText.has(k)) { seenText.get(k).locs.push(x.loc); continue; }
    const saved = part; part = x.part + " · explanations";
    const r = add("In explanation", x.tk.join(" · "), x.en, "Turkmen inside English text (" + x.where + "). Not in the rows above: " + stop(fresh.join(" · ")) + " A form quoted as a mistake is wrong on purpose.", x.loc);
    part = saved;
    if (r) seenText.set(k, r);
  }
}

// ─────────────────────────── check first: the progress log ───────────────────────────
const contentRows = rows.slice();
const levelKeys = contentRows.map(r => key(r.tk));
const occurs = form => { const k = key(form); return k.trim() ? levelKeys.some(s => s.includes(k)) : false; };
const md = fs.readFileSync(PROJECT, "utf8");
const REVIEW_LABEL = /native review|not sure of|engine points|kept out|check first/i;
const STOP = /^(Open for|Checker choices|The subject check|Merging|Branch|Character names|For content batches|Screenshots)\b/;
const batchOfLevel = new RegExp("^" + LEVEL_UP + "-\\d");
const flagged = [];
{
  const log = md.slice(md.indexOf("## 10. Progress log"));
  for (const line of log.split("\n")) {
    if (!/^\|\s*\d{4}-\d{2}-\d{2}\s*\|/.test(line)) continue;
    const cells = line.trim().replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, "|"));
    const conv = cells[1], ofLevel = batchOfLevel.test(conv);
    cells.slice(2).forEach((cell, ci) => {
      for (const passage of reviewPassages(cell)) {
        for (const item of splitTop(passage.text)) {
          for (const it of items(item)) {
            if (!ofLevel && !it.forms.some(occurs)) continue;
            const loc = rel(PROJECT) + "  progress log, " + conv + ", “" + passage.label + "”";
            const same = it.forms.length && flagged.find(f => f.forms.join("·").toLowerCase() === it.forms.join("·").toLowerCase());
            if (same) { if (!same.convs.includes(conv)) { same.convs.push(conv); same.locs.push(loc); } continue; }
            flagged.push({ conv, convs: [conv], label: passage.label, ...it, locs: [loc] });
          }
        }
      }
    });
  }
}
// The passages of a log cell that list Turkmen for the review, each up to the next label or a sentence that changes topic.
function reviewPassages(cell) {
  const labels = [];
  for (const m of cell.matchAll(/\*\*([^*]+?)\*\*:\s*/g)) labels.push({ at: m.index, end: m.index + m[0].length, text: m[1] });
  for (const m of cell.matchAll(/(?:^|[.;]\s+)([A-Z][^*.;:]*?for the native review[^*.;:]*):\s*/g))
    labels.push({ at: m.index + m[0].indexOf(m[1]), end: m.index + m[0].length, text: m[1] });
  labels.sort((a, b) => a.at - b.at);
  const out = [];
  labels.forEach((l, i) => {
    if (!REVIEW_LABEL.test(l.text)) return;
    let text = cell.slice(l.end, i + 1 < labels.length ? labels[i + 1].at : cell.length);
    const parts = splitTop(text, true), keep = [];
    for (const s of parts) { if (STOP.test(s)) break; keep.push(s); }
    out.push({ label: l.text.replace(/\s*\(TK-REVIEW looks here first\)/, ""), text: keep.join(" ") });
  });
  return out;
}
// Split at ";" and at sentence ends outside (…), *…*, “…” and `…`; with sentencesOnly, at sentence ends only.
function splitTop(s, sentencesOnly) {
  const out = []; let depth = 0, ital = false, code = false, quote = 0, cur = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "\\" && i + 1 < s.length) { cur += ch + s[i + 1]; i++; continue; }
    if (ch === "`") code = !code;
    else if (!code && ch === "*") { if (s[i + 1] === "*") { cur += "**"; i++; continue; } ital = !ital; }
    else if (!code && !ital) {
      if (ch === "(") depth++;
      else if (ch === ")") depth = Math.max(0, depth - 1);
      else if (ch === "“") quote++;
      else if (ch === "”") quote = Math.max(0, quote - 1);
      else if (depth === 0 && quote === 0) {
        if (ch === ";" && !sentencesOnly) { out.push(cur); cur = ""; continue; }
        if (/[.?!]/.test(ch) && /^\s+(?:[A-Z*“"]|$)/.test(s.slice(i + 1))) { cur += ch; out.push(cur); cur = ""; continue; }
      }
    }
    cur += ch;
  }
  out.push(cur);
  return out.map(x => x.trim()).filter(Boolean);
}
// The rows of one item of a log list. A labelled list of words (“words: *a*, *b*, …”) gives one row per word, with the
// note in brackets after it; otherwise the item is cut before each form that follows a comma (“*a* (note), *b* beside
// *c*, …”), and a piece that is a bare list of four or more words gives one row per word too.
function italics(s) {   // the *…* spans of s: { form, note (the brackets right after it), outside (not in brackets) }
  const found = [];
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    else if (ch === "*") {
      const j = s.indexOf("*", i + 1);
      if (j < 0) break;
      const raw = s.slice(i + 1, j).replace(/\\\|/g, "").replace(/\|/g, "").trim();
      const rest = s.slice(j + 1).match(/^\s*(\((?:[^()]|\([^()]*\))*\))/);
      const note = rest ? clean(rest[1].slice(1, -1).replace(/\*/g, "")) : "";
      // “*a, b, c*” is a list; “*Hawa, haýyş edýärin*” and “*Ol hem mugallym, hem talyp.*” are phrases
      const parts = raw.split(/, /);
      const subs = /[.!?…]/.test(raw) || parts.length < 2 || (parts.length < 3 && parts.some(p => / /.test(p))) ? [raw] : parts;
      subs.forEach((f, k) => found.push({ form: clean(f), note: k === subs.length - 1 ? note : "", outside: depth === 0 }));
      i = j;
    }
  }
  return found.filter(f => /\p{L}{2,}/u.test(f.form) && wordy(f.form) || / /.test(f.form));
}
function textOf(s) { return clean(s.replace(/\*/g, "").replace(/`/g, "")).replace(/^(and|or) /, ""); }
function proseWords(s) {   // the English words of s outside *…* and brackets
  return (s.replace(/\*[^*]*\*/g, " ").replace(/\((?:[^()]|\([^()]*\))*\)/g, " ").match(/[A-Za-z]{2,}/g) || []).filter(w => !/^(and|or)$/i.test(w));
}
function splitComma(s) {   // at “, *” outside brackets and *…*
  const out = []; let depth = 0, ital = false, cur = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "*") ital = !ital;
    else if (!ital && ch === "(") depth++;
    else if (!ital && ch === ")") depth = Math.max(0, depth - 1);
    else if (!ital && !depth && ch === "," && s[i + 1] === " " && s[i + 2] === "*") { out.push(cur); cur = ""; i++; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map(x => x.trim()).filter(Boolean);
}
function items(item) {
  const s = item.replace(/\*\*/g, "");
  const label = (s.match(/^([a-z][^:*()]{0,40}):\s*/) || [])[1];
  const outside = italics(s).filter(f => f.outside);
  if (label && outside.length >= 6 && proseWords(s.replace(/^[^:]*:/, "")).length <= 8)
    return outside.map(f => ({ forms: [f.form], word: true,
      text: (f.note ? f.form + " (" + f.note + "), " : "") + "listed among the " + (label === "words" ? "words" : "Turkmen of the " + label) + " they were unsure of" }));
  const out = [], lead = s.indexOf("*") < 0 ? s : s.slice(0, s.indexOf("*"));
  for (const piece of proseWords(lead).length <= 3 ? splitComma(s) : [s]) {   // a list of forms, not prose that quotes some
    const f = italics(piece), forms = uniq(f.map(x => x.form)), bare = uniq(f.filter(x => x.outside).map(x => x.form));
    if (bare.length >= 4 && proseWords(piece).length <= 3) bare.forEach(form => out.push({ forms: [form], word: true, text: textOf(piece) }));
    else out.push({ forms, text: textOf(piece) });
  }
  return out;
}

// ─────────────────────────── check first: the open questions ───────────────────────────
const questions = [];
{
  const cur = fs.readFileSync(CURRICULUM, "utf8");
  const sec = cur.slice(cur.indexOf("## Open questions for native review"));
  const body = sec.slice(sec.indexOf("\n") + 1).split(/\n## /)[0];
  let q = null;
  for (const line of body.split("\n")) {
    const m = line.match(/^(\d+)\. \*\*(.+?)\*\*(.*)$/);
    if (m) { q = { n: +m[1], title: m[2], first: m[3], notes: [], bullets: [] }; questions.push(q); continue; }
    if (!q || !line.trim()) continue;
    if (/^\s+- /.test(line)) q.bullets.push(line.replace(/^\s+- /, ""));
    else q.notes.push(line.trim());
  }
}
const pointLevel = gp => { const p = index.points && index.points[gp]; return p ? p.unit.slice(0, 2) : null; };
const formsIn = s => uniq(italics(s.replace(/\*\*/g, "")).map(f => f.form));
const openRows = [];
for (const q of questions) {
  const gps = [...q.first.matchAll(/`(gp-[a-z0-9-]+)`/g)].map(m => m[1]);
  const later = gps.length && !gps.some(g => pointLevel(g) === LEVEL);
  const asks = [];
  for (const n of q.notes) {
    const m = n.match(/For the native review(?:, first)?: (.*)$/);
    if (m) asks.push(m[1]);
    else if (/For the native review\.\s*$/.test(n)) asks.push(n.replace(/^\*\*[^*]+\*\*:?\s*/, "").replace(/\s*For the native review\.\s*$/, ""));
  }
  const question = clean(plain(q.title + q.first.replace(/^\s*\([^)]*\)/, "")));
  const lateNote = later ? " (A grammar point of a later level: answer only if you know.)" : "";
  if (q.bullets.length) {
    q.bullets.forEach((b, i) => openRows.push({ tk: formsIn(b).join(" · "), en: question, check: "Point " + (i + 1) + ": " + plain(b) + lateNote, loc: rel(CURRICULUM) + "  Open questions for native review, " + q.n + ", point " + (i + 1), n: q.n }));
  } else {
    openRows.push({ tk: uniq(formsIn(asks.join(" ")).concat(formsIn(q.first))).join(" · "), en: question, check: (asks.length ? "Please tell us: " + asks.map(plain).join(" Also: ") : "Please tell us what is usual.") + lateNote, loc: rel(CURRICULUM) + "  Open questions for native review, " + q.n, n: q.n });
  }
}

// ─────────────────────────── order, numbers, flags ───────────────────────────
// Check first: the uncertain forms and phrases, the open questions, then the uncertain words of the writers' word lists.
// A form's English is its gloss or the English of a row that is exactly that form.
const englishOf = form => glossary.get(key(form)) || (contentRows.find(r => key(r.tk) === key(form)) || {}).en || "";
const unsure = f => ({ part: "Check first", flag: "Unsure", kind: f.word ? "Unsure word" : "Unsure form", tk: f.forms.join(" · "),
  en: f.forms.length <= 3 ? uniq(f.forms.map(englishOf).filter(Boolean)).join(" / ") : "",
  check: "Writers' note (" + f.conv + "): " + stop(f.text) + (f.convs.length > 1 ? " Also listed by " + f.convs.slice(1).join(", ") + "." : ""),
  locs: f.locs, verdict: "q", forms: f.forms, backflag: !f.word });
const ordered = flagged.filter(f => !f.word).map(unsure);
for (const o of openRows) ordered.push({ part: "Check first", flag: "Open question " + o.n, kind: "Open question", tk: o.tk, en: o.en, check: o.check, locs: [o.loc], verdict: "q", forms: o.tk ? o.tk.split(" · ") : [] });
ordered.push(...flagged.filter(f => f.word).map(unsure));
const nCheck = ordered.length;
ordered.push(...contentRows);
ordered.forEach((r, i) => { r.no = i + 1; });
// "Used in rows …" on each of them, and on the rows that use an uncertain form (one found in eight rows or fewer), its number.
const pieces = form => form.split(/ … | — /).map(key).filter(k => k.trim());
for (const f of ordered.slice(0, nCheck)) {
  const hits = new Set();
  for (const form of f.forms) {
    const these = contentRows.filter(r => { const k = key(r.tk); return pieces(form).every(p => k.includes(p)); });
    these.forEach(r => hits.add(r.no));
    if (f.backflag && these.length && these.length <= 8)
      these.forEach(r => { if (!r.flag.includes("row " + f.no)) r.flag = r.flag ? r.flag.replace(/^See rows? /, "See rows ") + ", " + f.no : "See row " + f.no; });
  }
  const h = [...hits].sort((a, b) => a - b);
  if (f.forms.length) f.check += h.length ? " Used in rows " + list(h.map(String), 12).replace(/ · /g, ", ") + "." : " Not used in the course's text.";
}

// ─────────────────────────── the note for the reviewer ───────────────────────────
const nUnits = units.length;
const firstUnitRow = (ordered.find(r => r.part === "Unit 1") || {}).no || nCheck + 1;
const firstExpl = (ordered.find(r => / · explanations$/.test(r.part)) || {}).no;
const nEn = n => n.toLocaleString("en-CA"), nTk = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
// The ordinal ending after digits, by the vowels of the number's last word (birinji, altynjy, onunjy, ýüzünji…): 348-nji.
const ordinal = n => {
  const back = [, 0, 0, 0, 0, 0, 1, 0, 0, 1], backTens = [, 1, 0, 1, 1, 0, 1, 0, 0, 1];
  const b = n % 10 ? back[n % 10] : Math.floor(n / 10) % 10 ? backTens[Math.floor(n / 10) % 10] : 0;
  return n + (b ? "-njy" : "-nji");
};
const NOTE = [
  ["h1", "Daily Turkmen · " + LEVEL_UP + " review", "Daily Turkmen · " + LEVEL_UP + " derejesiniň barlagy"],
  ["p", "Thank you for checking the Turkmen of Daily Turkmen, a free course for English speakers who start Turkmen from zero. The sheet **Review** holds every piece of Turkmen in level " + LEVEL_UP + " (" + nUnits + " units): " + nEn(ordered.length) + " rows. The Turkmen was written with the help of AI and checked against dictionaries where we could. Only a native speaker can tell us whether it is right.",
        "Daily Turkmen kursunyň türkmen dilindäki tekstlerini barlaýandygyňyz üçin sag boluň. Bu kurs türkmen dilini noldan öwrenýän iňlis dilli adamlar üçin mugt. **Review** jedwelinde " + LEVEL_UP + " derejesiniň (" + nUnits + " bölüm) ähli türkmen tekstleri bar: " + nTk(ordered.length) + " setir. Türkmen tekstleri emeli aňyň kömegi bilen ýazyldy we mümkin bolan ýerlerinde sözlüklerden barlandy. Olaryň dogrudygyny diňe ene dili türkmen dili bolan adam aýdyp biler."],
  ["h2", "How to fill it in", "Nädip doldurmaly"],
  ["p", "Each row is one piece of Turkmen with its English. Fill in the three columns on the right:", "Her setirde türkmençe bir tekst we onuň iňlisçesi bar. Sag tarapdaky üç sütüni dolduryň:"],
  ["li", "**OK?**: Yes, No or Not sure.", "**OK?**: Hawa (Yes), Ýok (No) ýa-da Anyk däl (Not sure)."],
  ["li", "**Correction**: if No, the right Turkmen, written in full.", "**Correction** (düzediş): «Ýok» bolsa, dogry türkmençesini doly ýazyň."],
  ["li", "**Comment**: anything else: why, a more natural way to say it, a doubt.", "**Comment** (bellik): başga islendik zat: näme üçin, has tebigy aýdylyşy, şübhäňiz."],
  ["p", "Ignore the Location column: it only tells us where the text is in the course. A text used in several places has one row.", "Location sütünine üns bermäň: ol diňe tekstiň kursda nirededigini görkezýär. Birnäçe ýerde ulanylýan tekstiň bir setiri bar."],
  ["p", "Start with the yellow rows, **Check first** (No. 1 to " + nEn(nCheck) + "): forms we were not sure of, and open questions about the grammar. They matter most. Then go through the units in order (from No. " + nEn(firstUnitRow) + "). The flashcards and the texts of the website come after them" + (firstExpl ? "; the last part, Turkmen inside the English explanations (from No. " + nEn(firstExpl) + "), is optional." : "."),
        "Sary setirlerden, **Check first** (No. 1–" + nTk(nCheck) + "), başlaň: anyk bilmedik görnüşlerimiz we grammatika baradaky açyk soraglar. Olar iň möhümi. Soňra bölümleri tertibi boýunça barlaň (" + ordinal(firstUnitRow) + " setirden). Olardan soň kartoçkalar we web sahypanyň tekstleri gelýär" + (firstExpl ? "; iň soňky bölüm, iňlisçe düşündirişleriň içindäki türkmen sözleri (" + ordinal(firstExpl) + " setirden), hökmany däl." : ".")],
  ["h2", "What to check", "Nämäni barlamaly"],
  ["li", "**Spelling**: y and ý, e and ä, the other marked letters, words written together or apart (the question particle -my, -mi is written onto the word), capital letters.",
         "**Ýazylyşy**: y we ý, e we ä, beýleki bellikli harplar, bile ýa-da aýry ýazylýan sözler (-my, -mi sorag goşulmasy söze goşulyp ýazylýar), baş harplar."],
  ["li", "**Naturalness**: would a Turkmen speaker say or write it this way? If it is correct but not natural, mark Yes and give the natural way in Comment.",
         "**Tebigylygy**: türkmen adamy muny şeýle aýdarmy ýa-da ýazarmy? Dogry, ýöne tebigy däl bolsa, «Hawa» belläň we Bellik sütüninde tebigy görnüşini ýazyň."],
  ["li", "**Meaning**: does the English say what the Turkmen says?", "**Manysy**: iňlisçesi türkmençesi bilen şol bir zady aýdýarmy?"],
  ["li", "**Also accepted**: learners who type these are told they are right. Is each one really a right answer to the English? If a usual right answer is missing, add it in Comment.",
         "**Also accepted** (hem kabul edilýär): muny ýazan öwrenijilere dogry diýilýär. Olaryň her biri iňlisçä hakykatdanam dogry jogapmy? Köp ulanylýan dogry jogap ýok bolsa, ony Bellikde ýazyň."],
  ["li", "**Marked wrong** (pink): learners who type these are told they are wrong. Is each one really wrong? Here Yes means “yes, it is wrong”; if it is in fact right, mark No.",
         "**Marked wrong** (ýalňyş diýlip bellenen, gülgüne): muny ýazan öwrenijilere ýalňyş diýilýär. Olar hakykatdanam ýalňyşmy? Bu ýerde «Hawa» «hawa, ol ýalňyş» diýmekdir; aslynda dogry bolsa, «Ýok» belläň."],
  ["li", "**Register**: sen and siz, polite and everyday forms, greetings: is the word right for the situation?", "**Äheňi**: sen we siz, sypaýy we gündelik görnüşler, salamlaşmak: söz ýagdaýa laýykmy?"],
  ["h2", "What not to bother with", "Nämä üns bermek hökman däl"],
  ["li", "The English itself, unless its meaning is wrong.", "Iňlis diliniň özi, manysy ýalňyş bolmasa."],
  ["li", "Wrong choices in spelling exercises: they are misspelt on purpose. Tell us only if a “wrong” choice is in fact right.", "Ýazylyş gönükmelerindäki ýalňyş wariantlar: olar bilkastlaýyn ýalňyş ýazyldy. Diňe «ýalňyş» wariant aslynda dogry bolsa aýdyň."],
  ["li", "Notation such as -(Y)m, or capital A and Y for vowels that change: check the Turkmen words, not the notation.", "-(Y)m ýaly belgiler ýa-da üýtgeýän çekimliler üçin baş A we Y harplary: belgileri däl-de, türkmen sözlerini barlaň."],
  ["li", "Sound: the course has no audio. Facts about history and culture: we check those separately.", "Ses: kursda ses ýok. Taryh we medeniýet baradaky maglumatlar: olary aýratyn barlaýarys."],
  ["p", "When you are done, put your initials at the bottom of the **Read me** tab and send the file back to the person who sent it. Thank you!", "Gutaranyňyzdan soň, **Read me** sahypasynyň aşagynda adyňyzyň baş harplaryny ýazyň we faýly size iberen adama yzyna iberiň. Köp sag boluň!"],
  ["small", "The Turkmen of this note was also written with AI help: please forgive its mistakes.", "Bu belligiň türkmençesi hem emeli aňyň kömegi bilen ýazyldy: ýalňyşlary üçin bagyşlaň."]
];
function noteMd() {
  const one = lang => NOTE.map(([t, en, tk]) => {
    const s = lang === "en" ? en : tk;
    if (t === "h1") return "## " + s;
    if (t === "h2") return "**" + s.replace(/\*\*/g, "") + "**";
    if (t === "li") return "- " + s;
    if (t === "small") return "*" + s + "*";
    return s;
  }).join("\n\n").replace(/(\n\n- [^\n]*)\n\n(?=- )/g, "$1\n").replace(/(\n- [^\n]*)\n\n(?=- )/g, "$1\n");
  return "# Note for the reviewer · Gözden geçiriji üçin bellik\n\n" +
    "<!-- Generated by scripts/turkmen/review-export.mjs " + LEVEL + ", with " + rel(path.join(opt.out, LEVEL + "-review.xlsx")) + ". Edit the text in the script. -->\n\n" +
    one("en") + "\n\n---\n\n" + one("tk") + "\n";
}

// ─────────────────────────── xlsx ───────────────────────────
const COLS = [
  ["No.", 6], ["Part", 11], ["Flag", 11], ["Kind", 13], ["Turkmen", 42], ["English", 36], ["What to check", 44],
  ["OK?", 10], ["Correction", 32], ["Comment", 32], ["Location (ignore)", 34]
];
const OK_LIST = ["Yes", "No", "Not sure"];
function xmlEsc(s) {
  return String(s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
const colName = n => { let s = ""; n++; while (n) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
// Styles: fonts, fills and cell formats, registered on demand.
const style = (() => {
  const fonts = ['<font><sz val="11"/><name val="Calibri"/><family val="2"/></font>'], fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'];
  const borders = ['<border><left/><right/><top/><bottom/><diagonal/></border>', '<border><left style="thin"><color rgb="FFD9D9D9"/></left><right style="thin"><color rgb="FFD9D9D9"/></right><top style="thin"><color rgb="FFD9D9D9"/></top><bottom style="thin"><color rgb="FFD9D9D9"/></bottom><diagonal/></border>'];
  const xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'], map = new Map();
  const fontId = f => { const x = '<font>' + (f.b ? "<b/>" : "") + (f.i ? "<i/>" : "") + '<sz val="' + (f.sz || 11) + '"/>' + (f.color ? '<color rgb="' + f.color + '"/>' : "") + '<name val="Calibri"/><family val="2"/></font>'; let i = fonts.indexOf(x); if (i < 0) { fonts.push(x); i = fonts.length - 1; } return i; };
  const fillId = c => { if (!c) return 0; const x = '<fill><patternFill patternType="solid"><fgColor rgb="' + c + '"/><bgColor indexed="64"/></patternFill></fill>'; let i = fills.indexOf(x); if (i < 0) { fills.push(x); i = fills.length - 1; } return i; };
  const get = (o = {}) => {
    const k = JSON.stringify(o);
    if (map.has(k)) return map.get(k);
    const x = '<xf numFmtId="0" fontId="' + fontId(o) + '" fillId="' + fillId(o.fill) + '" borderId="' + (o.border ? 1 : 0) + '" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="' + (o.v || "top") + '"' + (o.wrap !== false ? ' wrapText="1"' : "") + (o.h ? ' horizontal="' + o.h + '"' : "") + "/></xf>";
    xfs.push(x); map.set(k, xfs.length - 1); return xfs.length - 1;
  };
  get.xml = () => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="' + fonts.length + '">' + fonts.join("") + "</fonts>" + '<fills count="' + fills.length + '">' + fills.join("") + "</fills>" +
    '<borders count="' + borders.length + '">' + borders.join("") + "</borders>" + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="' + xfs.length + '">' + xfs.join("") + "</cellXfs>" + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  return get;
})();
// Shared strings: plain text, or runs [{ t, b }] for a cell with bold words (the Read me tab).
const sst = [], sstIndex = new Map();
const sstId = s => { const k = typeof s === "string" ? s : JSON.stringify(s); if (!sstIndex.has(k)) { sstIndex.set(k, sst.length); sst.push(s); } return sstIndex.get(k); };
const sstXmlOf = s => typeof s === "string" ? "<si><t xml:space=\"preserve\">" + xmlEsc(s) + "</t></si>"
  : "<si>" + s.map(r => "<r><rPr>" + (r.b ? "<b/>" : "") + '<sz val="11"/><rFont val="Calibri"/><family val="2"/></rPr><t xml:space="preserve">' + xmlEsc(r.t) + "</t></r>").join("") + "</si>";
const runs = s => s.split(/\*\*/).map((t, i) => ({ t, b: i % 2 === 1 })).filter(r => r.t);
// A sheet from rows of cells { v, s } (v a string or a number).
function sheetXml(rowsOfCells, o) {
  const width = Math.max(...rowsOfCells.map(r => r.length));
  const ref = "A1:" + colName(width - 1) + rowsOfCells.length;
  let x = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">';
  x += '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="' + ref + '"/>';
  x += '<sheetViews><sheetView workbookViewId="0"' + (o.selected ? ' tabSelected="1"' : "") + (o.zoom ? ' zoomScale="' + o.zoom + '" zoomScaleNormal="' + o.zoom + '"' : "") + ">" +
    (o.freeze ? '<pane ySplit="' + o.freeze + '" topLeftCell="A' + (o.freeze + 1) + '" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A' + (o.freeze + 1) + '" sqref="A' + (o.freeze + 1) + '"/>' : "") +
    "</sheetView></sheetViews>";
  x += '<sheetFormatPr defaultRowHeight="15"/><cols>' + o.widths.map((w, i) => '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>').join("") + "</cols><sheetData>";
  rowsOfCells.forEach((r, ri) => {
    x += '<row r="' + (ri + 1) + '"' + (o.heights && o.heights[ri] ? ' ht="' + o.heights[ri] + '" customHeight="1"' : "") + ">";
    r.forEach((c, ci) => {
      if (c == null) return;
      const a = colName(ci) + (ri + 1), s = c.s ? ' s="' + c.s + '"' : "";
      if (c.v === "" || c.v == null) x += '<c r="' + a + '"' + s + "/>";
      else if (typeof c.v === "number") x += '<c r="' + a + '"' + s + "><v>" + c.v + "</v></c>";
      else x += '<c r="' + a + '"' + s + ' t="s"><v>' + sstId(Array.isArray(c.v) ? c.v : String(c.v)) + "</v></c>";
    });
    x += "</row>";
  });
  x += "</sheetData>";
  if (o.filter) x += '<autoFilter ref="' + ref + '"/>';
  if (o.merges && o.merges.length) x += '<mergeCells count="' + o.merges.length + '">' + o.merges.map(m => '<mergeCell ref="' + m + '"/>').join("") + "</mergeCells>";
  if (o.validations) x += '<dataValidations count="' + o.validations.length + '">' + o.validations.map(v => '<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="0" sqref="' + v.sqref + '"><formula1>"' + xmlEsc(v.list.join(",")) + '"</formula1></dataValidation>').join("") + "</dataValidations>";
  x += '<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup orientation="landscape" paperSize="9" fitToWidth="1" fitToHeight="0"/></worksheet>';
  return x;
}
function buildXlsx() {
  const GREEN = "FF167A55", RED = "FFB23A2E", YELLOW = "FFFFF2CC", PINK = "FFFBE3E1", INPUT = "FFFFFCF2";
  const S = {
    head: style({ b: true, color: "FFFFFFFF", fill: GREEN, v: "center" }), headIn: style({ b: true, color: "FFFFFFFF", fill: RED, v: "center" }),
    body: style({ border: true }), flag: style({ border: true, fill: YELLOW }), num: style({ border: true, h: "right", wrap: false }), numFlag: style({ border: true, fill: YELLOW, h: "right", wrap: false }),
    tk: style({ border: true, sz: 12 }), tkFlag: style({ border: true, sz: 12, fill: YELLOW }), tkWrong: style({ border: true, sz: 12, fill: PINK }),
    small: style({ border: true, sz: 9, color: "FF555555" }), smallFlag: style({ border: true, sz: 9, color: "FF555555", fill: YELLOW }),
    loc: style({ border: true, sz: 8, color: "FF8C8C8C" }), input: style({ border: true, fill: INPUT }), inputFlag: style({ border: true, fill: YELLOW }),
    title: style({ b: true, sz: 16, color: GREEN, wrap: false, v: "center" }), h2: style({ b: true, sz: 12, color: RED }), p: style({}), pSmall: style({ i: true, sz: 9, color: "FF555555" }),
    label: style({ b: true }), field: style({ border: true, fill: INPUT, v: "center" })
  };
  const head = COLS.map(([t], i) => ({ v: t, s: i >= 7 && i <= 9 ? S.headIn : S.head }));
  const review = [head];
  for (const r of ordered) {
    const f = r.verdict === "q";
    review.push([
      { v: r.no, s: f ? S.numFlag : S.num }, { v: r.part, s: f ? S.smallFlag : S.small }, { v: r.flag, s: f ? S.smallFlag : S.small }, { v: r.kind, s: f ? S.smallFlag : S.small },
      { v: r.tk, s: f ? S.tkFlag : r.verdict === "wrong" ? S.tkWrong : S.tk }, { v: r.en, s: f ? S.flag : S.body }, { v: r.check, s: f ? S.smallFlag : S.small },
      { v: "", s: f ? S.inputFlag : S.input }, { v: "", s: f ? S.inputFlag : S.input }, { v: "", s: f ? S.inputFlag : S.input },
      { v: r.locs.join("\n"), s: S.loc }
    ]);
  }
  // Read me: the note, English beside Turkmen, then the reviewer's initials and the date.
  const readme = [], heights = [], merges = [];
  readme.push([{ v: NOTE[0][1], s: S.title }, { v: NOTE[0][2], s: S.title }]); heights.push(30);
  for (const [t, en, tk] of NOTE.slice(1)) {
    const fmt = s => (t === "li" ? "•  " : "") + s;
    const val = s => t === "p" || t === "li" ? runs(fmt(s)) : fmt(s).replace(/\*\*/g, "");
    const st = t === "h2" ? S.h2 : t === "small" ? S.pSmall : S.p;
    readme.push([{ v: val(en), s: st }, { v: val(tk), s: st }]);
    const len = s => fmt(s).replace(/\*\*/g, "").length;
    heights.push(t === "h2" ? 22 : Math.max(18, 15.5 * Math.ceil(Math.max(len(en), len(tk) * 1.05) / 80) + 3));
  }
  readme.push([]); heights.push(10);
  readme.push([{ v: "Your initials · Adyňyzyň baş harplary", s: S.label }, { v: "", s: S.field }]); heights.push(22);
  readme.push([{ v: "Date · Sene", s: S.label }, { v: "", s: S.field }]); heights.push(22);
  readme.push([]); heights.push(10);
  readme.push([{ v: "Exported " + new Date().toISOString().slice(0, 10) + " from the course's content by scripts/turkmen/review-export.mjs " + LEVEL + ".", s: S.pSmall }]); heights.push(16);
  const sheets = [
    { name: "Read me", xml: sheetXml(readme, { widths: [84, 84], heights, selected: true, merges }) },
    { name: "Review", xml: sheetXml(review, { widths: COLS.map(c => c[1]), freeze: 1, filter: true, validations: [{ sqref: "H2:H" + review.length, list: OK_LIST }] }) }
  ];
  const sstXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="' + sst.length + '" uniqueCount="' + sst.length + '">' +
    sst.map(sstXmlOf).join("") + "</sst>";
  const now = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  const files = [
    ["[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      sheets.map((_, i) => '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join("") +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>'],
    ["_rels/.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>'],
    ["docProps/core.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Daily Turkmen · ' + LEVEL_UP + ' review</dc:title><dc:creator>Daily Turkmen</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">' + now + '</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">' + now + "</dcterms:modified></cp:coreProperties>"],
    ["docProps/app.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>scripts/turkmen/review-export.mjs</Application></Properties>'],
    ["xl/workbook.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>' +
      sheets.map((s, i) => '<sheet name="' + xmlEsc(s.name) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join("") + "</sheets>" +
      '<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="1" hidden="1">\'Review\'!$A$1:$' + colName(COLS.length - 1) + "$" + (ordered.length + 1) + '</definedName><definedName name="_xlnm.Print_Titles" localSheetId="1">\'Review\'!$1:$1</definedName></definedNames></workbook>'],
    ["xl/_rels/workbook.xml.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      sheets.map((_, i) => '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>').join("") +
      '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId' + (sheets.length + 2) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>'],
    ...sheets.map((s, i) => ["xl/worksheets/sheet" + (i + 1) + ".xml", s.xml]),
    ["xl/styles.xml", style.xml()],
    ["xl/sharedStrings.xml", sstXml]
  ];
  return zip(files.map(([name, text]) => ({ name, data: Buffer.from(text, "utf8") })));
}
// A zip archive (deflate), as the .xlsx format needs it.
const CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
function crc32(buf) { let c = -1; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function zip(files) {
  const local = [], central = []; let offset = 0;
  const d = new Date(), time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const f of files) {
    const name = Buffer.from(f.name, "utf8"), body = zlib.deflateRawSync(f.data, { level: 9 }), crc = crc32(f.data);
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(8, 8); h.writeUInt16LE(time, 10); h.writeUInt16LE(date, 12);
    h.writeUInt32LE(crc, 14); h.writeUInt32LE(body.length, 18); h.writeUInt32LE(f.data.length, 22); h.writeUInt16LE(name.length, 26); h.writeUInt16LE(0, 28);
    local.push(h, name, body);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(8, 10); c.writeUInt16LE(time, 12); c.writeUInt16LE(date, 14);
    c.writeUInt32LE(crc, 16); c.writeUInt32LE(body.length, 20); c.writeUInt32LE(f.data.length, 24); c.writeUInt16LE(name.length, 28);
    c.writeUInt16LE(0, 30); c.writeUInt16LE(0, 32); c.writeUInt16LE(0, 34); c.writeUInt16LE(0, 36); c.writeUInt32LE(0, 38); c.writeUInt32LE(offset, 42);
    central.push(c, name);
    offset += h.length + name.length + body.length;
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(0, 4); end.writeUInt16LE(0, 6); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16); end.writeUInt16LE(0, 20);
  return Buffer.concat([...local, cd, end]);
}
function csv() {
  const q = s => /[",\n\r]/.test(String(s)) ? '"' + String(s).replace(/"/g, '""') + '"' : String(s);
  return "\ufeff" + [COLS.map(c => c[0]).join(","), ...ordered.map(r => [r.no, r.part, r.flag, r.kind, r.tk, r.en, r.check, "", "", "", r.locs.join(" | ")].map(q).join(","))].join("\r\n") + "\r\n";
}

// ─────────────────────────── write ───────────────────────────
fs.mkdirSync(opt.out, { recursive: true });
const xlsxPath = path.join(opt.out, LEVEL + "-review.xlsx"), notePath = path.join(opt.out, LEVEL + "-review-note.md");
fs.writeFileSync(xlsxPath, buildXlsx());
fs.writeFileSync(notePath, noteMd());
if (opt.csv) fs.writeFileSync(path.join(opt.out, LEVEL + "-review.csv"), csv());

const count = {};
for (const r of ordered) { const p = /^Unit /.test(r.part) ? (/ · explanations$/.test(r.part) ? "Explanations" : "Units") : r.part; count[p] = (count[p] || 0) + 1; }
const kinds = {};
for (const r of ordered) kinds[r.kind] = (kinds[r.kind] || 0) + 1;
console.log(LEVEL_UP + ": " + ordered.length + " rows from " + nUnits + " units, " + cards.length + " cards" + (LEVEL === "a1" ? " and the pages" : "") + ".");
console.log("  by part: " + Object.entries(count).map(([k, v]) => k + " " + v).join(", "));
console.log("  by kind: " + Object.entries(kinds).map(([k, v]) => k + " " + v).join(", "));
console.log("  check first: " + flagged.length + " uncertain forms from the log, " + openRows.length + " open questions; " + contentRows.filter(r => r.flag).length + " content rows flagged");
console.log("  wrote " + rel(xlsxPath) + ", " + rel(notePath) + (opt.csv ? ", " + rel(path.join(opt.out, LEVEL + "-review.csv")) : ""));
if (opt.list) for (const r of ordered.slice(0, nCheck)) console.log(String(r.no).padStart(4) + "  " + r.flag.padEnd(16) + r.tk + "  —  " + r.check.slice(0, 160));
