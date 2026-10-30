#!/usr/bin/env node
// Turkmen course: tests for assets/js/turkmen.js — the answer checker (TM-PROJECT.md 6.4), the flashcard scheduler
// (6.6, as in the Turkish course), and the progress logic around them (5.9, 6.1, 6.3). Forked from
// scripts/turkish/test.mjs in TK-BUILD-1. No dependencies; Node 18 or later.
//
//   node scripts/turkmen/test.mjs            run everything; exit 1 on a failure
//   node scripts/turkmen/test.mjs --verbose  also list the tests that pass
//
// Besides hand-written cases it checks that:
//   - the checker's normalization, fold, particle joining and accept-list expansion behave exactly like the validator's;
//   - every accepted answer in the real content is marked correct, and every rejected one wrong with its feedback;
//   - every Rich text in the real content (flashcard notes included) renders without stray markup, and every link resolves;
//   - a progress file exported by the store passes `validate.mjs --progress`, and a Daily Turkish file is refused;
//   - learning days and due dates hold in time zones with daylight saving time (the date tests run again
//     in child processes under America/Toronto and Australia/Lord_Howe).
// While units are still unwritten, the path tests run on FIX: index.json with a1-u01 to a1-u03 marked ready.
import fs from "fs";
import os from "os";
import path from "path";
import vm from "vm";
import assert from "assert/strict";
import { spawnSync } from "child_process";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DATA = path.join(ROOT, "assets/data/turkmen");
const require = createRequire(import.meta.url);
const TKM = require(path.join(ROOT, "assets/js/turkmen.js"));
const args = process.argv.slice(2);
const VERBOSE = args.includes("--verbose");
const CHILD = args.includes("--tz-child");

const tests = [];
const test = (name, fn, o = {}) => tests.push({ name, fn, tz: !!o.tz });

// ─────────────────────────── fixtures ───────────────────────────
const readJson = p => JSON.parse(fs.readFileSync(p, "utf8"));
const listJson = dir => (fs.existsSync(path.join(DATA, dir)) ? fs.readdirSync(path.join(DATA, dir)).filter(f => f.endsWith(".json")).sort().map(f => readJson(path.join(DATA, dir, f))) : []);
const INDEX = readJson(path.join(DATA, "index.json"));
const LESSONS = listJson("lessons"), GRAMMAR = listJson("grammar"), CULTURE = listJson("culture"), UNITS = listJson("units"), LEVELS = listJson("levels");
const CARDS = listJson("flashcards").flatMap(f => f.cards);
const SETTINGS = () => JSON.parse(JSON.stringify(TKM.C.SETTINGS));
const at = (y, m, d, h = 12, min = 0) => new Date(y, m - 1, d, h, min).getTime();   // local time
const NOW = at(2026, 10, 14, 10);
const MIN = 60000;
const rngMid = () => 0.5;   // no fuzz
const dueDay = (s, set = SETTINGS()) => TKM.dayOf(s.due, set.dayStartHour);

// index.json with the first three units ready (four lessons each, as written or made up), so the path, the links
// and onlyTaughtWords can be tested before A1-1 is written. Units already written keep their own lessons.
const FIX = (() => {
  const ix = JSON.parse(JSON.stringify(INDEX));
  const first = ["a1-u01", "a1-u02", "a1-u03"];
  for (const u of ix.levels[0].units) if (first.includes(u.id) && u.status !== "ready") {
    u.status = "ready";
    u.lessons = [1, 2, 3, 4].map(k => ({ id: `${u.id}-l0${k}`, title: `Lesson ${k}`, exercises: 12 }));
  }
  for (const p of Object.values(ix.points)) if (first.includes(p.unit)) p.ready = true;
  const ready = ix.levels.flatMap(l => l.units).filter(u => u.status === "ready");
  ix.counts.units = ready.length;
  ix.counts.lessons = ready.reduce((n, u) => n + u.lessons.length, 0);
  return ix;
})();

// The validator's own normalization, taken from its source so the two can't drift apart silently.
function validatorText() {
  const src = fs.readFileSync(path.join(ROOT, "scripts/turkmen/validate.mjs"), "utf8");
  const pick = re => { const m = src.match(re); if (!m) throw new Error(`validate.mjs: can't find ${re}`); return m[0]; };
  const code = [
    pick(/^const fold = .*$/m),
    pick(/^function expand\(entry\) \{[\s\S]*?^\/\/ \(end of the normalization/m).replace(/\/\/ \(end of the normalization$/, ""),
    "({ fold, expand, norm, joinParticle })",
  ].join("\n");
  return vm.runInNewContext(code, {});
}

// every typed-answer spec in the content: [where, exercise, index, spec]
function typedSpecs() {
  const out = [];
  for (const l of LESSONS) for (const e of l.exercises) {
    if (e.type === "translate") out.push([e.id, e, 0, TKM.answerSpec(e)]);
    if (e.type === "cloze") e.blanks.forEach((b, i) => { if (b.accept) out.push([`${e.id} blank ${i}`, e, i, TKM.answerSpec(e, i)]); });
    if (e.type === "conjugate") e.cells.forEach((c, i) => out.push([`${e.id} ${c.p}`, e, i, TKM.answerSpec(e, i)]));
  }
  return out;
}

// every Rich string in the content: [where, text]
function richStrings() {
  const out = [];
  const push = (w, s) => { if (typeof s === "string") out.push([w, s]); };
  const blocks = (w, bs) => bs.forEach((b, i) => {
    const bw = `${w}[${i}]`;
    if (b.type === "p" || b.type === "callout") push(bw, b.text);
    if (b.type === "list") b.items.forEach(x => push(bw, x));
    if (b.type === "table") { push(bw, b.caption); b.head.forEach(x => push(bw, x)); b.rows.forEach(r => r.forEach((c, k) => { if (b.cols[k] === "rich") push(bw, c); })); }
    if (b.type === "examples") b.items.forEach(x => push(bw, x.note));
    if (b.type === "paradigm") push(bw, b.title);
    if (b.type === "image") push(bw, b.caption);
    if (b.type === "see") push(bw, b.text);
  });
  for (const lv of LEVELS) push(lv.id, lv.summary);
  for (const u of UNITS) push(u.id, u.summary);
  for (const l of LESSONS) {
    if (l.intro) push(l.id, l.intro.text);
    for (const e of l.exercises) {
      ["hint", "explain", "question", "label", "task"].forEach(k => push(e.id, e[k]));
      Object.values(e.why || {}).forEach(x => push(e.id, x));
      (e.reject || []).forEach(r => push(e.id, r.why));
      (e.blanks || []).forEach(b => (b.reject || []).forEach(r => push(e.id, r.why)));
      (e.questions || []).forEach(q => { push(e.id, q.q); push(e.id, q.explain); });
      (e.checklist || []).forEach(x => push(e.id, x));
    }
  }
  for (const g of GRAMMAR) { push(g.id, g.intro); g.summary.forEach(x => push(g.id, x)); g.sections.forEach(s => blocks(`${g.id} ${s.point}`, s.blocks)); }
  for (const c of CULTURE) { blocks(c.id, c.blocks); (c.questions || []).forEach(q => { push(c.id, q.q); push(c.id, q.explain); }); }
  for (const c of CARDS) push(c.id, c.note);
  return out;
}

// a deck of n cards, ranks 1…n, all taught in a1-u01
const deckOf = n => Array.from({ length: n }, (_, i) => ({ id: `fc-${String(i + 1).padStart(4, "0")}`, rank: i + 1, unit: "a1-u01" }));
const emptyCards = () => TKM.progress.defaults("cards", NOW);
const reviewState = (ivl, dueAt, o = {}) => ({ s: "review", due: dueAt, ivl, ease: 2.5, step: 0, reps: 3, lapses: 0, last: dueAt - ivl * 864e5, ...o });

// in-memory localStorage stand-in
function fakeStorage({ failWrites = false, failAll = false } = {}) {
  const m = new Map();
  return {
    m,
    getItem: k => { if (failAll) throw new Error("SecurityError"); return m.has(k) ? m.get(k) : null; },
    setItem: (k, v) => { if (failAll) throw new Error("SecurityError"); if (failWrites && !k.endsWith("probe")) throw new Error("QuotaExceededError"); m.set(k, String(v)); },
    removeItem: k => { m.delete(k); },
  };
}
const verdict = r => [r.verdict, r.note];

// ─────────────────────────── 6.4 the checker ───────────────────────────
test("expand: [a|b], (a), (a|b), and tidy spaces before punctuation", () => {
  assert.deepEqual(TKM.expand("Merdan [öýde|mekdepde].").list, ["Merdan öýde.", "Merdan mekdepde."]);
  assert.deepEqual(TKM.expand("I am (very) tired.").list, ["I am tired.", "I am very tired."]);
  assert.deepEqual(TKM.expand("(Men|Sen) geldiň (mi) ?").list.length, 6);
  assert.deepEqual(TKM.expand("Salam (dost) !").list, ["Salam!", "Salam dost!"]);
});
test("expand: syntax errors and the 200-expansion cap", () => {
  assert.match(TKM.expand("[a|(b)]").error, /nested/);
  assert.match(TKM.expand("a [b|c").error, /unclosed/);
  assert.match(TKM.expand("a ] b").error, /stray/);
  assert.match(TKM.expand("[a] b").error, /two alternatives/);
  assert.match(TKM.expand("a (|b)").error, /empty/);
  assert.match(TKM.expand("[a|b][a|b][a|b][a|b][a|b][a|b][a|b][a|b]").error, /200/);
  assert.equal(TKM.expand("[a|b][a|b][a|b][a|b][a|b][a|b][a|b]").list.length, 128);
});
test("norm: plain lowercasing (no dotless i), NFC, punctuation, hyphens", () => {
  assert.equal(TKM.norm("AŞGABATDA", "tk"), "aşgabatda");
  assert.equal(TKM.norm("ILKINJI ÝYL", "tk"), "ilkinji ýyl");
  assert.equal(TKM.norm("İLKİNJİ", "tk"), "ilkinji", "an İ typed on a Turkish keyboard");
  assert.equal(TKM.norm("  “Salam”…  nähili? ", "tk"), "salam nähili");
  assert.equal(TKM.norm("Çaý ýa-da kofe/süýt", "tk"), "çaý ýa da kofe süýt");
  assert.equal(TKM.norm("Gün ňy", "tk"), "gün ňy", "decomposed letters are composed");
  assert.equal(TKM.norm("Aşgabat’da", "tk"), "aşgabat'da", "apostrophes are kept for step 5");
});
test("norm: English contractions and folded Turkmen letters in names", () => {
  assert.equal(TKM.norm("I'm at home, aren't I?", "en"), "i am at home are not i");
  assert.equal(TKM.norm("Aýna can’t come.", "en"), "ayna can not come");
  assert.equal(TKM.norm("Merdanyň book is in Türkmenabat", "en"), "merdanyn book is in turkmenabat");
  assert.equal(TKM.norm("Whats your name? Im Batyr, I dont know", "en"), "what is your name i am batyr i do not know");
  assert.equal(TKM.norm("Its colour, lets go, we were well", "en"), "its colour lets go we were well");
});
test("fold and joinParticle", () => {
  assert.equal(TKM.fold("äçžňöşüý"), "acznosuy");
  assert.equal(TKM.fold("ı ğ c v"), "ı ğ c v", "only the eight Turkmen letters");
  assert.equal(TKM.joinParticle("sen talyp my"), "sen talypmy");
  assert.equal(TKM.joinParticle("sen talyp mydyň"), "sen talypmydyň");
  assert.equal(TKM.joinParticle("bu kitap däl mi"), "bu kitap dälmi");
  assert.equal(TKM.joinParticle("talyp mı"), "talyp mı", "ı is not a Turkmen letter");
  assert.equal(TKM.joinParticle("my kitap"), "my kitap", "nothing to join at the start");
  assert.equal(TKM.joinParticle("mekdep mugallym"), "mekdep mugallym", "only the particle");
});
test("check: correct, with and without pronoun, punctuation and case ignored", () => {
  const acc = ["Öýe gidýärin.", "Men öýe gidýärin."];
  assert.equal(TKM.check("öýe gidýärin", acc, [], "tk").verdict, "correct");
  assert.equal(TKM.check("MEN ÖÝE GIDÝÄRIN!", acc, [], "tk").verdict, "correct");
  const r = TKM.check("Men öýe gidýärin", acc, [], "tk");
  assert.equal(r.matched, "Men öýe gidýärin.");
  assert.equal(r.canonical, "Öýe gidýärin.");
});
test("check: a rejected answer is wrong with its feedback, before anything else", () => {
  const r = TKM.check("Öýde", ["Men öýde."], [{ answer: "Öýde.", why: "Keep the subject: *Men öýde*." }], "tk");
  assert.deepEqual([r.verdict, r.why], ["wrong", "Keep the subject: *Men öýde*."]);
});
test("check: an apostrophe left in → almost (apostrophe); Turkmen writes none", () => {
  assert.deepEqual(verdict(TKM.check("Aşgabat'da", ["Aşgabatda."], [], "tk")), ["almost", "apostrophe"]);
  assert.deepEqual(verdict(TKM.check("Aşgabat'ta", ["Aşgabatda."], [], "tk")), ["wrong", undefined], "a t for the d is still wrong");
  assert.deepEqual(verdict(TKM.check("Merdan’ın", ["Merdanyň."], [], "tk")), ["wrong", undefined], "ı is not a Turkmen letter");
});
test("check: missing marks → almost (Turkmen letters), in lenient mode only", () => {
  assert.deepEqual(verdict(TKM.check("Cay icyarin", ["Çaý içýärin."], [], "tk", "lenient")), ["almost", "Turkmen letters"]);
  assert.equal(TKM.check("Cay icyarin", ["Çaý içýärin."], [], "tk", "strict").verdict, "wrong");
  assert.deepEqual(verdict(TKM.check("Gunortan Turkmenabada barýarys", ["Günortan Türkmenabada barýarys."], [], "tk")), ["almost", "Turkmen letters"]);
  assert.deepEqual(verdict(TKM.check("Men zurnal okayaryn", ["Men žurnal okaýaryn."], [], "tk")), ["almost", "Turkmen letters"]);
  assert.deepEqual(verdict(TKM.check("Senin adyn name", ["Seniň adyň näme?"], [], "tk")), ["almost", "Turkmen letters"]);
});
test("check: y and ý — the consonant typed without its mark is almost; strict mode wants the letter", () => {
  assert.equal(TKM.check("ýok", ["Ýok."], [], "tk").verdict, "correct");
  assert.deepEqual(verdict(TKM.check("yok", ["Ýok."], [], "tk")), ["almost", "Turkmen letters"]);
  assert.deepEqual(verdict(TKM.check("yyl", ["ýyl"], [], "tk")), ["almost", "Turkmen letters"]);
  assert.equal(TKM.check("yok", ["Ýok."], [], "tk", "strict").verdict, "wrong");
  assert.equal(TKM.check("aý", ["aý"], [], "tk", "strict").verdict, "correct");
  assert.equal(TKM.check("ay", ["aý"], [], "tk", "strict").verdict, "wrong");
});
test("check: e and ä are never folded together, nor ç and j", () => {
  assert.equal(TKM.check("işler", ["işlär"], [], "tk").verdict, "wrong");
  assert.deepEqual(verdict(TKM.check("işlar", ["işlär"], [], "tk")), ["almost", "Turkmen letters"]);
  assert.equal(TKM.check("jaý", ["çaý"], [], "tk").verdict, "wrong", "jaý is a building, çaý is tea");
  assert.equal(TKM.check("çaý", ["jaý"], [], "tk").verdict, "wrong");
});
test("check: the question particle typed apart → almost (particle), in both modes", () => {
  assert.deepEqual(verdict(TKM.check("Sen talyp my?", ["Sen talypmy?"], [], "tk")), ["almost", "particle"]);
  assert.deepEqual(verdict(TKM.check("Sen talyp my?", ["Sen talypmy?"], [], "tk", "strict")), ["almost", "particle"]);
  assert.deepEqual(verdict(TKM.check("gelýärsiň mi", ["gelýärsiňmi"], [], "tk", "strict")), ["almost", "particle"]);
  assert.deepEqual(verdict(TKM.check("Bu seniň kitabyň däl mi?", ["Bu seniň kitabyň dälmi?"], [], "tk")), ["almost", "particle"]);
  assert.deepEqual(verdict(TKM.check("Sen talyp mydyň?", ["Sen talypmydyň?"], [], "tk")), ["almost", "particle"]);
  assert.equal(TKM.check("Sen talyp mı?", ["Sen talypmy?"], [], "tk").verdict, "wrong", "ı is not a Turkmen letter");
  assert.deepEqual(verdict(TKM.check("Sen yadaw my", ["Sen ýadawmy?"], [], "tk")), ["almost", "particle"], "particle and marks");
  assert.equal(TKM.check("Sen talypmy", ["Sen talypmy?"], [], "tk").verdict, "correct");
});
test("check: letters outside the Turkmen alphabet are not folded (TM-PROJECT.md 6.4)", () => {
  for (const [a, acc] of [["yıl", "ýyl"], ["Bu dağ", "Bu dag."], ["Çay ve çörek", "Çaý we çörek."], ["cogap", "jogap"], ["Kıtap", "Kitap."]])
    assert.deepEqual(verdict(TKM.check(a, [acc], [], "tk")), ["wrong", undefined], a);
  assert.deepEqual(verdict(TKM.check("cay", ["çaý"], [], "tk")), ["almost", "Turkmen letters"], "c for an unmarked ç is a missing mark");
  assert.deepEqual(verdict(TKM.check("Cay we corek", ["Çaý we çörek."], [], "tk")), ["almost", "Turkmen letters"]);
});
test("check: a rejected answer typed without its marks still gets its feedback (6b)", () => {
  const rej = [{ answer: "Öýde.", why: "Keep the subject." }];
  assert.deepEqual([TKM.check("oyde", ["Men öýde."], rej, "tk").verdict, TKM.check("oyde", ["Men öýde."], rej, "tk").why], ["wrong", "Keep the subject."]);
  const rej2 = [{ answer: "Sen talypmydyň?", why: "That is the past: were you a student?" }];
  assert.deepEqual(verdict(TKM.check("Sen talyp mydyň", ["Sen talypmy?"], rej2, "tk")), ["wrong", undefined], "also with the particle joined");
  assert.equal(TKM.check("Sen talyp mydyn", ["Sen talypmy?"], rej2, "tk").why, "That is the past: were you a student?");
  assert.equal(TKM.check("Men öýde", ["Men öýde."], rej, "tk").verdict, "correct");
});
test("check: English alternatives, contractions, articles and Turkmen names", () => {
  const acc = ["The teacher is at school.", "The teacher is [at|in] the school", "The teacher's at (the) school"];
  assert.equal(TKM.check("The teacher's at the school.", acc, [], "en").verdict, "correct");
  assert.equal(TKM.check("the teacher is in the school", acc, [], "en").verdict, "correct");
  assert.equal(TKM.check("The teacher is in school", acc, [], "en").verdict, "wrong");
  assert.equal(TKM.check("I'm at home", ["I am at home."], [], "en").verdict, "correct");
  assert.equal(TKM.check("Ayna is here", ["Aýna is here."], [], "en").verdict, "correct");
  assert.equal(TKM.check("We went to Turkmenbashi", ["We went to Türkmenbaşy."], [], "en").verdict, "wrong", "the English spelling of a name is an accept entry, not a fold");
});
test("check: one typo in an English word of five letters or more → almost (typo)", () => {
  const acc = ["Merdan is at the office."];
  assert.deepEqual(verdict(TKM.check("Merdan is at the ofice", acc, [], "en")), ["almost", "typo"]);
  assert.equal(TKM.check("Merdan is at the offcie", acc, [], "en").verdict, "almost");       // a swap counts as one edit
  assert.equal(TKM.check("Merdan is at teh office", acc, [], "en").verdict, "wrong");        // short word
  assert.equal(TKM.check("Merdan is at the ofic", acc, [], "en").verdict, "wrong");          // two edits
  assert.equal(TKM.check("Merdn is at the ofice", acc, [], "en").verdict, "wrong");          // two words wrong
  assert.equal(TKM.check("mekdepte", ["mekdepde"], [], "tk").note, undefined);               // no typo step for Turkmen
});
test("check: empty answers are wrong; the canonical answer is accept[0]", () => {
  const r = TKM.check("   ", ["Hawa."], [], "tk");
  assert.deepEqual([r.verdict, r.note, r.canonical], ["wrong", "empty", "Hawa."]);
});
test("answerSpec: default diacritics modes by type, overrides, and no listen", () => {
  assert.equal(TKM.answerSpec({ type: "translate", from: "tk", accept: ["Yes."] }).lang, "en");
  assert.deepEqual(TKM.answerSpec({ type: "translate", from: "en", accept: ["Hawa."] }), { accept: ["Hawa."], reject: [], lang: "tk", mode: "lenient" });
  assert.equal(TKM.answerSpec({ type: "cloze", blanks: [{ accept: ["de"] }] }, 0).mode, "strict");
  assert.equal(TKM.answerSpec({ type: "cloze", diacritics: "lenient", blanks: [{ accept: ["de"] }] }, 0).mode, "lenient");
  assert.equal(TKM.answerSpec({ type: "cloze", blanks: [{ options: ["a", "b"], answer: 0 }] }, 0), null);
  assert.deepEqual(TKM.answerSpec({ type: "conjugate", cells: [{ p: "men", accept: ["gelýärin"] }] }, 0), { accept: ["gelýärin"], reject: [], lang: "tk", mode: "strict" });
  assert.equal(TKM.answerSpec({ type: "listen", mode: "type", tk: "Hawa.", en: "Yes." }), null);
  assert.equal(TKM.answerSpec({ type: "mcq" }), null);
});
test("parity with validate.mjs: expand() on every accept entry in the content", () => {
  const V = validatorText();
  for (const [, , , s] of typedSpecs()) for (const a of s.accept) assert.equal(JSON.stringify(TKM.expand(a)), JSON.stringify(V.expand(a)), a);
  for (const x of ["[a|b] (c) d", "a [b", "(x|y|z) w.", "[a|b][a|b][a|b][a|b][a|b][a|b][a|b][a|b]", "(Men) [öýde|mekdepde]."]) assert.equal(JSON.stringify(TKM.expand(x)), JSON.stringify(V.expand(x)), x);
});
test("parity with validate.mjs: norm(), fold() and joinParticle() on every text in the content, in both languages", () => {
  const V = validatorText();
  const strings = new Set(["AŞGABATDA", "İLKİNJİ", "I'm here, aren't I?", "Aşgabat’da… «salam»", "i̇yi", "can't—won't", "it’s ´ok` ", "Sen talyp my?", "talyp mydyň", "yıl dağ ve cogap"]);
  const walk = v => { if (typeof v === "string") strings.add(v); else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object") Object.values(v).forEach(walk); };
  [LESSONS, GRAMMAR, CULTURE, CARDS, LEVELS].forEach(walk);
  for (const s of strings) for (const lang of ["tk", "en"]) {
    const n = TKM.norm(s, lang);
    assert.equal(n, V.norm(s, lang), `${lang}: ${s}`);
    assert.equal(TKM.fold(n), V.fold(n), `fold: ${s}`);
    assert.equal(TKM.joinParticle(n), V.joinParticle(n), `joinParticle: ${s}`);
  }
  assert.ok(strings.size > 800, `only ${strings.size} strings`);
});
test("real content: every accepted answer is correct, every rejected answer wrong with its feedback", () => {
  let n = 0;
  for (const [w, e, i, s] of typedSpecs()) {
    for (const entry of s.accept) for (const x of TKM.expand(entry).list) {
      const r = TKM.checkExercise(e, x, i);
      assert.equal(r.verdict, "correct", `${w}: “${x}” → ${r.verdict}`);
      n++;
    }
    for (const rej of s.reject) {
      const r = TKM.checkExercise(e, rej.answer, i);
      assert.deepEqual([r.verdict, r.why], ["wrong", rej.why], `${w}: rejected “${rej.answer}”`);
    }
    assert.equal(TKM.checkExercise(e, s.accept[0], i).matched, s.accept[0], `${w}: canonical answer`);
  }
  if (LESSONS.length) assert.ok(n > 50, `only ${n} accepted answers found`);
});

// ─────────────────────────── 5.1 the renderer ───────────────────────────
test("rich: Turkmen, bold, code, escaped asterisk", () => {
  const h = TKM.rich("*öý* means **house**; `-dA` is a suffix; 2 \\* 3");
  assert.equal(h, '<i lang="tk">öý</i> means <strong>house</strong>; <code class="tkm-nw">-dA</code> is a suffix; 2 * 3');
});
test("rich: hyphenated suffixes and stems don't break (tkm-nw); a tilde is plain text, not markup", () => {
  assert.equal(TKM.rich("*-my* after *talyp*"), '<i lang="tk" class="tkm-nw">-my</i> after <i lang="tk">talyp</i>');
  assert.equal(TKM.rich("*oka-* and `-(Y)p bil`"), '<i lang="tk" class="tkm-nw">oka-</i> and <code>-(Y)p bil</code>');
  assert.equal(TKM.rich("about ~200 words"), "about ~200 words");
  assert.equal(TKM.plain("*öý* **house**"), "öý house");
});
test("rich: escapes HTML, leaves code spans literal", () => {
  assert.equal(TKM.rich('<script>alert("x")</script> & co'), "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; co");
  assert.equal(TKM.rich("`*x* **y** ~z~`"), "<code>*x* **y** ~z~</code>");
  assert.equal(TKM.rich("`<b>`"), "<code>&lt;b&gt;</code>");
});
test("rich: links are relative to /turkmen/ (TM-PROJECT.md 3); unwritten targets are plain text, coming soon", () => {
  const o = { index: FIX };
  assert.equal(TKM.rich("[Unit 1](a1-u01)", o), '<a href="index.html#a1-u01">Unit 1</a>');
  assert.equal(TKM.rich("[the alphabet](gp-alphabet)", o), '<a href="guide.html?id=a1-u01-grammar#gp-alphabet">the alphabet</a>');
  assert.equal(TKM.rich("[first lesson](a1-u01-l01)", o), '<a href="lesson.html?id=a1-u01-l01">first lesson</a>');
  assert.equal(TKM.rich("[guide](a1-u02-grammar)", o), '<a href="guide.html?id=a1-u02-grammar">guide</a>');
  assert.equal(TKM.rich("[names](a1-u03-culture)", o), '<a href="guide.html?id=a1-u03-culture">names</a>');
  assert.equal(TKM.rich("[UNESCO](https://ich.unesco.org/)", o), '<a href="https://ich.unesco.org/" target="_blank" rel="noopener">UNESCO</a>');
  assert.equal(TKM.rich("[*öýde*](a1-u01)", o), '<a href="index.html#a1-u01"><i lang="tk">öýde</i></a>');
  // unwritten targets come from the real index, so the test keeps working as batches are added
  const soonPoint = Object.keys(INDEX.points).find(k => !INDEX.points[k].ready);
  const soonUnit = INDEX.levels.flatMap(l => l.units).find(u => u.status === "planned");
  if (soonPoint) assert.match(TKM.rich(`[the point](${soonPoint})`, { index: INDEX }), /^<span class="tkm-soon">the point <small>\(coming soon\)<\/small><\/span>$/);
  if (soonUnit) assert.match(TKM.rich(`[next unit](${soonUnit.id})`, { index: INDEX }), /tkm-soon/);
  assert.match(TKM.rich("[flashcards](cards)", { index: INDEX }), INDEX.flashcards.count ? /href="cards.html"/ : /tkm-soon/);
  assert.equal(TKM.href("nowhere", INDEX), null);
  assert.equal(TKM.href("b2-u01", INDEX), null, "no B2 yet");
});
test("guideHref: guide.html?id= unless the page asks for the static guides", () => {
  assert.equal(TKM.guideHref("a1-u02-grammar", "gp-plural"), "guide.html?id=a1-u02-grammar#gp-plural");
  globalThis.TKM_STATIC_GUIDES = true;
  try { assert.equal(TKM.guideHref("a1-u02-grammar"), "guides/a1-u02-grammar.html"); }
  finally { delete globalThis.TKM_STATIC_GUIDES; }
  assert.equal(TKM.guidePath("a1-u05-culture"), "guides/a1-u05-culture.html");
});
test("tkRich: paragraphs, bold and links only", () => {
  assert.equal(TKM.tkRich("Bu **öý** uly.\n\nOl *öý* däl."), '<p lang="tk">Bu <strong>öý</strong> uly.</p><p lang="tk">Ol *öý* däl.</p>');
});
test("seg and plain", () => {
  assert.equal(TKM.seg("Çaga|lar mekdep|de."), '<span lang="tk" class="tkm-seg"><span class="stem">Çaga</span><span class="suf">lar</span> <span class="stem">mekdep</span><span class="suf">de</span>.</span>');
  assert.equal(TKM.plain("*Öýde* + **to be** `-dA` [here](a1-u01) öý|de \\*"), "Öýde + to be -dA here öýde *");
});
test("seg: harmony classes with the Turkmen vowels (y is back, ä is front); plain words and lastStem", () => {
  const wrap = h => `<span lang="tk" class="tkm-seg">${h}</span>`;
  assert.equal(TKM.seg("Aýna|nyň", { harmony: true }), wrap('<span class="stem">Aýna</span><span class="suf">n<span class="back">y</span>ň</span>'));
  assert.equal(TKM.seg("işle|ýär", { harmony: true }), wrap('<span class="stem">işle</span><span class="suf">ý<span class="front">ä</span>r</span>'));
  assert.equal(TKM.seg("MEKDEP|DE", { harmony: true }), wrap('<span class="stem">MEKDEP</span><span class="suf">D<span class="front">E</span></span>'));
  assert.equal(TKM.seg("göz|üm", { harmony: true }), wrap('<span class="stem">göz</span><span class="suf"><span class="front">ü</span>m</span>'));
  assert.equal(TKM.seg("Kitap|lar gyzyl."), wrap('<span class="stem">Kitap</span><span class="suf">lar</span> gyzyl.'));
  assert.equal(TKM.seg("mugallym"), wrap('<span class="stem">mugallym</span>'), "a one-word seg is a stem");
  assert.equal(TKM.seg("talyp däl", { lastStem: true }), wrap('talyp <span class="stem">däl</span>'));
  assert.equal(TKM.seg("“Bu|lar näme?”"), wrap('“<span class="stem">Bu</span><span class="suf">lar</span> näme?”'));
});
test("seg: every seg in the real content renders back to its own text", () => {
  const segs = [];
  const fromBlocks = (blocks, w) => blocks.forEach((b, i) => {
    if (b.type === "examples") b.items.forEach(x => x.seg && segs.push([`${w}[${i}]`, x.seg]));
    if (b.type === "paradigm") b.rows.forEach(r => segs.push([`${w}[${i}]`, r.tk]));
    if (b.type === "table") b.rows.forEach(r => r.forEach((c, k) => b.cols[k] === "seg" && c && segs.push([`${w}[${i}]`, c])));
  });
  GRAMMAR.forEach(g => g.sections.forEach(s => fromBlocks(s.blocks, `${g.id}/${s.point}`)));
  CULTURE.forEach(c => fromBlocks(c.blocks, c.id));
  if (GRAMMAR.length) assert.ok(segs.length > 50, `only ${segs.length} segs found`);
  const unesc = h => h.replace(/<[^>]+>/g, "").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  for (const [w, s] of segs) {
    const h = TKM.seg(s, { harmony: true });
    assert.equal(unesc(h), s.replace(/\|/g, ""), `${w}: “${s}”`);
    if (s.includes("|")) assert.match(h, /class="suf"/, `${w}: “${s}” has no suffix span`);
  }
});
test("real content: every Rich text (flashcard notes included) renders without stray markup and every link resolves", () => {
  const all = richStrings();
  assert.ok(all.length > 100, `only ${all.length} Rich strings found`);
  for (const [w, s] of all) {
    const h = TKM.rich(s, { index: INDEX }).replace(/<code>[\s\S]*?<\/code>/g, "");
    assert.ok(!/[`]|\*\*|(^|[^\\])\*(?=\S)/.test(h.replace(/2 \* 3/g, "")), `${w}: stray markup in “${s}”`);
    for (const m of s.matchAll(/\[[^\]\n]+\]\(([^)\s]+)\)/g)) assert.ok(TKM.href(m[1], INDEX), `${w}: link target ${m[1]} doesn't resolve`);
  }
});

// ─────────────────────────── data, typing, no speech ───────────────────────────
test("data paths: the Turkmen data folder and tm-fc flashcard files", () => {
  assert.equal(TKM.data.url("a1-u05-l01", "abc"), "/assets/data/turkmen/lessons/a1-u05-l01.json?v=abc");
  assert.equal(TKM.data.url("a1-u05-culture"), "/assets/data/turkmen/culture/a1-u05.json");
  assert.equal(TKM.data.url("flashcards/tm-fc-0001-0200.json", "v1"), "/assets/data/turkmen/flashcards/tm-fc-0001-0200.json?v=v1");
  assert.throws(() => TKM.data.url("flashcards/fc-0001-0200.json"), /Unknown content id/);
  assert.deepEqual(INDEX.flashcards.files, ["flashcards/tm-fc-0001-0200.json", ...INDEX.flashcards.files.slice(1)]);
});
test("no speech, the Turkmen letter bar, and the Turkmen persons and directions", () => {
  assert.equal(TKM.tts, undefined);
  assert.ok(!("tts" in TKM.C.SETTINGS) && !("ttsRate" in TKM.C.SETTINGS));
  assert.deepEqual(TKM.C.LETTERS, ["ä", "ç", "ž", "ň", "ö", "ş", "ü", "ý"]);
  assert.deepEqual(TKM.C.LETTERS_UP, TKM.C.LETTERS.map(x => x.toUpperCase()));
  assert.deepEqual([TKM.C.PERSONS, TKM.C.DIRS, TKM.C.LEVELS], [["men", "sen", "ol", "biz", "siz", "olar"], ["tk-en", "en-tk"], ["a1", "a2", "b1"]]);
  assert.equal(TKM.tkUpper("ilkinji ýyl"), "ILKINJI ÝYL");
  assert.equal(TKM.tkLower("ILKINJI ÝYL"), "ilkinji ýyl");
});

// ─────────────────────────── learning days ───────────────────────────
test("dayOf: the learning day starts at dayStartHour", () => {
  assert.equal(TKM.dayOf(at(2026, 10, 14, 2, 30), 4), "2026-10-13");
  assert.equal(TKM.dayOf(at(2026, 10, 14, 4, 0), 4), "2026-10-14");
  assert.equal(TKM.dayOf(at(2026, 10, 14, 0, 5), 0), "2026-10-14");
  assert.equal(TKM.dayOf(at(2026, 1, 1, 3, 59), 4), "2025-12-31");
}, { tz: true });
test("addDays, daysBetween and dayStart across months, years and DST changes", () => {
  assert.equal(TKM.addDays("2026-12-30", 3), "2027-01-02");
  assert.equal(TKM.addDays("2028-03-01", -1), "2028-02-29");
  assert.equal(TKM.daysBetween("2026-10-14", "2027-10-14"), 365);
  assert.equal(TKM.daysBetween("2026-10-14", "2026-10-13"), -1);
  for (let n = 0; n < 400; n += 7) {
    const day = TKM.addDays("2026-03-01", n), t = TKM.dayStart(day, 4);
    assert.equal(TKM.dayOf(t, 4), day, `dayStart(${day})`);
    assert.equal(new Date(t).getHours(), 4, `dayStart(${day}) hour`);
    assert.equal(TKM.dayOf(t - 1, 4), TKM.addDays(day, -1));
  }
}, { tz: true });

// ─────────────────────────── 6.6 the scheduler ───────────────────────────
const S0 = SETTINGS();
test("new card: Again → 1 min, Hard → 5.5 min, Good → 10 min (step 2), Easy → review in 4 days", () => {
  let s = TKM.srs.answer(null, "again", NOW, S0, rngMid);
  assert.deepEqual([s.s, s.step, s.due - NOW, s.reps, s.ease, s.ivl], ["learning", 0, 1 * MIN, 1, 2.5, 0]);
  s = TKM.srs.answer(null, "hard", NOW, S0, rngMid);
  assert.deepEqual([s.step, s.due - NOW], [0, 5.5 * MIN]);
  s = TKM.srs.answer(null, "good", NOW, S0, rngMid);
  assert.deepEqual([s.s, s.step, s.due - NOW], ["learning", 1, 10 * MIN]);
  s = TKM.srs.answer(null, "easy", NOW, S0, rngMid);
  assert.deepEqual([s.s, s.ivl, dueDay(s)], ["review", 4, "2026-10-18"]);
  assert.equal(new Date(s.due).getHours(), 4);
}, { tz: true });
test("learning card on its last step: Hard repeats 10 min, Good graduates to 1 day, Again restarts", () => {
  const l1 = TKM.srs.answer(null, "good", NOW, S0, rngMid);
  const t = NOW + 10 * MIN;
  let s = TKM.srs.answer(l1, "hard", t, S0, rngMid);
  assert.deepEqual([s.s, s.step, s.due - t], ["learning", 1, 10 * MIN]);
  s = TKM.srs.answer(l1, "good", t, S0, rngMid);
  assert.deepEqual([s.s, s.ivl, s.step, dueDay(s), s.reps], ["review", 1, 0, "2026-10-15", 2]);
  s = TKM.srs.answer(l1, "again", t, S0, rngMid);
  assert.deepEqual([s.s, s.step, s.due - t], ["learning", 0, 1 * MIN]);
  assert.equal(l1.step, 1, "the input state is not changed");
}, { tz: true });
test("graduating at 2 am belongs to the previous learning day: due at 4 am the same night", () => {
  const t = at(2026, 10, 15, 2, 0);
  const l1 = { s: "learning", due: t, ivl: 0, ease: 2.5, step: 1, reps: 1, lapses: 0, last: t - 10 * MIN };
  const s = TKM.srs.answer(l1, "good", t, S0, rngMid);
  assert.equal(dueDay(s), "2026-10-15");
  assert.equal(s.due, at(2026, 10, 15, 4, 0));
}, { tz: true });
test("review on time: Hard ×1.2, Good ×ease, Easy ×ease×1.3; ease −0.15 / +0.15", () => {
  const today4 = at(2026, 10, 14, 4);
  const r = reviewState(10, today4);
  let s = TKM.srs.answer(r, "hard", NOW, S0, rngMid);
  assert.deepEqual([s.ivl, s.ease, dueDay(s)], [12, 2.35, "2026-10-26"]);
  s = TKM.srs.answer(r, "good", NOW, S0, rngMid);
  assert.deepEqual([s.ivl, s.ease], [25, 2.5]);
  s = TKM.srs.answer(r, "easy", NOW, S0, rngMid);
  assert.deepEqual([s.ivl, s.ease], [33, 2.65]);
  assert.deepEqual(TKM.srs.preview(r, NOW, S0), [{ ms: 10 * MIN }, { days: 12 }, { days: 25 }, { days: 33 }]);
}, { tz: true });
test("review answered 4 days late: Good uses ivl + d/2, Easy ivl + d", () => {
  const r = reviewState(10, at(2026, 10, 10, 4));
  assert.deepEqual(TKM.srs.preview(r, NOW, S0).slice(1), [{ days: 12 }, { days: 30 }, { days: 46 }]);
}, { tz: true });
test("small intervals keep their order: Hard ≥ ivl+1, Good ≥ Hard+1, Easy ≥ Good+1", () => {
  const r = reviewState(1, at(2026, 10, 14, 4), { ease: 1.3 });
  assert.deepEqual(TKM.srs.preview(r, NOW, S0).slice(1), [{ days: 2 }, { days: 3 }, { days: 4 }]);
});
test("lapse: Again → relearning in 10 min, ease −0.20, interval 1 day; Good → review tomorrow, Easy → 2 days", () => {
  const r = reviewState(30, at(2026, 10, 14, 4));
  const s = TKM.srs.answer(r, "again", NOW, S0, rngMid);
  assert.deepEqual([s.s, s.step, s.due - NOW, s.ivl, s.ease, s.lapses, s.leech], ["relearning", 0, 10 * MIN, 1, 2.3, 1, undefined]);
  const t = NOW + 10 * MIN;
  let g = TKM.srs.answer(s, "good", t, S0, rngMid);
  assert.deepEqual([g.s, g.ivl, dueDay(g), g.ease], ["review", 1, "2026-10-15", 2.3]);
  g = TKM.srs.answer(s, "easy", t, S0, rngMid);
  assert.deepEqual([g.s, g.ivl, dueDay(g)], ["review", 2, "2026-10-16"]);
  g = TKM.srs.answer(s, "hard", t, S0, rngMid);
  assert.deepEqual([g.s, g.due - t], ["relearning", 10 * MIN]);
  g = TKM.srs.answer(s, "again", t, S0, rngMid);
  assert.deepEqual([g.s, g.lapses, g.ease], ["relearning", 1, 2.3], "Again while relearning is not another lapse");
}, { tz: true });
test("ease never drops below 1.30; leech at the 8th lapse", () => {
  const r = reviewState(5, at(2026, 10, 14, 4), { ease: 1.35, lapses: 7 });
  assert.equal(TKM.srs.answer(r, "hard", NOW, S0, rngMid).ease, 1.3);
  const s = TKM.srs.answer(r, "again", NOW, S0, rngMid);
  assert.deepEqual([s.ease, s.lapses, s.leech, s.s], [1.3, 8, true, "relearning"]);
});
test("intervals are capped at 3,650 days, fuzz included", () => {
  const r = reviewState(3000, at(2026, 10, 14, 4));
  for (const rng of [() => 0, () => 0.5, () => 0.999]) for (const g of ["hard", "good", "easy"]) assert.ok(TKM.srs.answer(r, g, NOW, S0, rng).ivl <= 3650);
  assert.equal(TKM.srs.preview(r, NOW, S0)[2].days, 3650);
});
test("fuzz: none below 3 days, ±1 day from 3, ±5% higher up", () => {
  const easy = TKM.srs.answer.bind(null, null, "easy", NOW, S0);
  assert.deepEqual([easy(() => 0).ivl, easy(() => 0.5).ivl, easy(() => 0.999).ivl], [3, 4, 5]);
  const r = reviewState(80, at(2026, 10, 14, 4));            // Good = 200 → ±10
  const seen = new Set();
  for (let i = 0; i <= 100; i++) seen.add(TKM.srs.answer(r, "good", NOW, S0, () => i / 100.0001).ivl);
  assert.equal(Math.min(...seen), 190); assert.equal(Math.max(...seen), 210);
  const r1 = reviewState(1, at(2026, 10, 14, 4));
  assert.equal(TKM.srs.answer(r1, "hard", NOW, S0, () => 0).ivl, 2);
});
test("preview labels", () => {
  assert.deepEqual(TKM.srs.preview(null, NOW, S0).map(TKM.srs.format), ["1 min", "5.5 min", "10 min", "4 days"]);
  assert.deepEqual([{ days: 1 }, { days: 45 }, { days: 800 }].map(TKM.srs.format), ["1 day", "1.5 mo", "2.2 yr"]);
});
test("isDue: learning cards at their minute, review cards from dayStartHour on their day", () => {
  const r = reviewState(3, at(2026, 10, 15, 4));
  assert.equal(TKM.srs.isDue(r, at(2026, 10, 15, 3, 59), S0), false);
  assert.equal(TKM.srs.isDue(r, at(2026, 10, 15, 4, 0), S0), true);
  assert.equal(TKM.srs.isDue({ ...r, s: "suspended" }, at(2026, 10, 20), S0), false);
  const l = { s: "learning", due: NOW + MIN, ivl: 0, ease: 2.5, step: 0, reps: 1, lapses: 0, last: NOW };
  assert.equal(TKM.srs.isDue(l, NOW, S0), false);
  assert.equal(TKM.srs.isDue(l, NOW + MIN, S0), true);
}, { tz: true });
test("a review answered on time lands on the right day at 4 am for 1–60 days ahead", () => {
  for (let ivl = 1; ivl <= 60; ivl++) {
    const r = reviewState(ivl, at(2026, 10, 20, 4), { ease: 1.3 });
    const t = at(2026, 10, 20, 9);
    const s = TKM.srs.answer(r, "hard", t, S0, rngMid);
    assert.equal(dueDay(s), TKM.addDays("2026-10-20", s.ivl));
    assert.equal(new Date(s.due).getHours(), 4);
  }
}, { tz: true });
test("answer: grades by name or number; suspended cards refuse", () => {
  assert.equal(TKM.srs.answer(null, 3, NOW, S0, rngMid).step, 1);
  assert.throws(() => TKM.srs.answer(null, "maybe", NOW, S0));
  assert.throws(() => TKM.srs.answer({ ...reviewState(3, NOW), s: "suspended" }, "good", NOW, S0));
});

// ─────────────────────────── 6.6 the daily session ───────────────────────────
test("queue: reviews oldest first, new cards in rank order, both within their daily limits", () => {
  const deck = deckOf(60), cards = emptyCards();
  for (let i = 30; i < 50; i++) cards.cards[`${deck[i].id}:tk-en`] = reviewState(5, at(2026, 10, 14 - (i % 5), 4));
  cards.days["2026-10-14"] = { new: 2, reviews: 4, again: 0 };
  const st = { ...SETTINGS(), newPerDay: 5, reviewsPerDay: 10 };
  const q = TKM.srs.queue({ deck, cards, settings: st }, NOW);
  assert.equal(q.reviews.length, 6);
  assert.deepEqual(q.news, ["fc-0001:tk-en", "fc-0002:tk-en", "fc-0003:tk-en"]);
  const dues = q.reviews.map(k => cards.cards[k].due);
  assert.deepEqual(dues, [...dues].sort((a, b) => a - b));
  assert.deepEqual(q.counts, { learning: 0, review: 6, new: 3, total: 9 });
});
test("queue: new cards are spread evenly among the reviews", () => {
  const deck = deckOf(40), cards = emptyCards();
  for (let i = 20; i < 30; i++) cards.cards[`${deck[i].id}:tk-en`] = reviewState(5, at(2026, 10, 13, 4));
  const q = TKM.srs.queue({ deck, cards, settings: { ...SETTINGS(), newPerDay: 5 } }, NOW);
  const pattern = q.main.map(k => (cards.cards[k] ? "R" : "N")).join("");
  assert.equal(pattern, "RRNRRNRRNRRNRRN");
});
test("directions: en-tk is introduced only after its tk-en card has graduated", () => {
  const deck = deckOf(3), cards = emptyCards();
  cards.cards["fc-0001:tk-en"] = reviewState(4, at(2026, 10, 20, 4), { last: at(2026, 10, 10) });   // graduated, not due
  cards.cards["fc-0002:tk-en"] = { s: "learning", due: at(2026, 10, 15, 9), ivl: 0, ease: 2.5, step: 1, reps: 1, lapses: 0, last: at(2026, 10, 13) };
  const q = TKM.srs.queue({ deck, cards, settings: SETTINGS() }, NOW);
  assert.deepEqual(q.news, ["fc-0001:en-tk", "fc-0003:tk-en"]);
  const only = TKM.srs.queue({ deck, cards: emptyCards(), settings: { ...SETTINGS(), directions: ["en-tk"] } }, NOW);
  assert.deepEqual(only.news, ["fc-0001:en-tk", "fc-0002:en-tk", "fc-0003:en-tk"]);
  const tkOnly = TKM.srs.queue({ deck, cards, settings: { ...SETTINGS(), directions: ["tk-en"] } }, NOW);
  assert.deepEqual(tkOnly.news, ["fc-0003:tk-en"]);
  assert.equal(TKM.srs.sibling("fc-0042:tk-en"), "fc-0042:en-tk");
  assert.equal(TKM.srs.sibling("fc-0042:en-tk"), "fc-0042:tk-en");
});
test("siblings: once one direction is answered today, the other waits until tomorrow", () => {
  const deck = deckOf(2), cards = emptyCards();
  cards.cards["fc-0001:tk-en"] = reviewState(4, at(2026, 10, 13, 4));
  cards.cards["fc-0001:en-tk"] = reviewState(4, at(2026, 10, 12, 4));
  let q = TKM.srs.queue({ deck, cards, settings: SETTINGS() }, NOW);
  assert.deepEqual(q.reviews, ["fc-0001:en-tk"]);
  cards.cards["fc-0001:tk-en"] = reviewState(9, at(2026, 10, 23, 4), { last: NOW - MIN });   // answered today, e.g. in another session
  q = TKM.srs.queue({ deck, cards, settings: SETTINGS() }, NOW);
  assert.deepEqual(q.reviews, []);
  assert.deepEqual(TKM.srs.queue({ deck, cards, settings: SETTINGS() }, at(2026, 10, 15, 9)).reviews.length, 1, "free again the next day");
});
test("onlyTaughtWords: new cards only from units whose lessons are all done", () => {
  const deck = [{ id: "fc-0001", rank: 1, unit: "a1-u01" }, { id: "fc-0002", rank: 2, unit: "a1-u02" }, { id: "fc-0003", rank: 3 }];
  const course = TKM.progress.defaults("course", NOW);
  const st = { ...SETTINGS(), onlyTaughtWords: true };
  const q0 = TKM.srs.queue({ deck, cards: emptyCards(), settings: st, course, index: FIX }, NOW);
  assert.deepEqual(q0.news, []);
  for (const l of ["a1-u01-l01", "a1-u01-l02", "a1-u01-l03", "a1-u01-l04"]) course.lessons[l] = { first: "2026-10-14", last: TKM.iso(NOW), runs: 1, best: 1, xp: 10 };
  const q1 = TKM.srs.queue({ deck, cards: emptyCards(), settings: st, course, index: FIX }, NOW);
  assert.deepEqual(q1.news, ["fc-0001:tk-en"]);
});
test("session: learning cards come back when due, ahead of the queue; learn-ahead at the end", () => {
  const deck = deckOf(3), cards = emptyCards();
  const sess = TKM.srs.session({ deck, cards, settings: { ...SETTINGS(), newPerDay: 2 }, now: NOW, rng: rngMid });
  let it = sess.next(NOW);
  assert.deepEqual([it.key, it.kind], ["fc-0001:tk-en", "new"]);
  sess.answer(it.key, "good", NOW);                                   // → 10 min
  it = sess.next(NOW + MIN);
  assert.equal(it.key, "fc-0002:tk-en");
  sess.answer(it.key, "again", NOW + MIN);                            // → 1 min
  it = sess.next(NOW + 3 * MIN);
  assert.deepEqual([it.key, it.kind], ["fc-0002:tk-en", "learning"]);
  sess.answer(it.key, "good", NOW + 3 * MIN);                         // → 10 min (step 2)
  it = sess.next(NOW + 4 * MIN);                                      // nothing due; fc-0001 due at +10 is within 20 min
  assert.deepEqual([it.key, it.kind], ["fc-0001:tk-en", "learning"]);
  sess.answer(it.key, "good", NOW + 4 * MIN);                         // graduates
  it = sess.next(NOW + 4 * MIN);
  assert.equal(it.key, "fc-0002:tk-en");
  sess.answer(it.key, "good", NOW + 4 * MIN);
  const end = sess.next(NOW + 5 * MIN);
  assert.deepEqual(end, { done: true, waitUntil: null });
  assert.deepEqual(cards.days["2026-10-14"], { new: 2, reviews: 0, again: 1, lapses: 0, mature: 0, matureLapses: 0 });
  assert.equal(sess.stats.answered, 5);
});
test("session: the 10th card studied in a day credits the streak once; save is called after every answer", () => {
  const deck = deckOf(30), cards = emptyCards();
  for (let i = 0; i < 12; i++) cards.cards[`${deck[i].id}:tk-en`] = reviewState(3, at(2026, 10, 13, 4));
  let credits = 0, saves = 0;
  const sess = TKM.srs.session({ deck, cards, settings: { ...SETTINGS(), newPerDay: 0 }, now: NOW, rng: rngMid, save: () => saves++, onCredit: () => credits++ });
  for (let i = 0; i < 12; i++) { const it = sess.next(NOW + i * 1000); sess.answer(it.key, "good", NOW + i * 1000); }
  assert.deepEqual([credits, saves, cards.days["2026-10-14"].reviews], [1, 12, 12]);
});
test("session: answering one direction buries the other for the rest of the day", () => {
  const deck = deckOf(1), cards = emptyCards();
  cards.cards["fc-0001:tk-en"] = reviewState(4, at(2026, 10, 13, 4));
  cards.cards["fc-0001:en-tk"] = reviewState(4, at(2026, 10, 13, 4));
  const sess = TKM.srs.session({ deck, cards, settings: SETTINGS(), now: NOW, rng: rngMid });
  const it = sess.next(NOW);
  sess.answer(it.key, "good", NOW);
  assert.equal(sess.next(NOW).done, true);
  assert.equal(sess.counts(NOW).total, 0);
});
test("session: undo puts the last answer back (card, day counters, queue) and shows that card again", () => {
  const deck = deckOf(3), cards = emptyCards();
  cards.cards["fc-0003:tk-en"] = reviewState(30, at(2026, 10, 14, 4));
  const sess = TKM.srs.session({ deck, cards, settings: { ...SETTINGS(), newPerDay: 2 }, now: NOW, rng: rngMid });
  assert.equal(sess.undo(NOW), null, "nothing to undo yet");
  let it = sess.next(NOW);
  const first = it.key, before = JSON.stringify(cards);
  sess.answer(first, "again", NOW);
  assert.equal(sess.canUndo(), true);
  assert.equal(sess.undo(NOW + 1000), first);
  assert.equal(JSON.stringify({ ...cards, updated: null }), JSON.stringify({ ...JSON.parse(before), updated: null }), "cards and days exactly as before");
  assert.deepEqual([sess.canUndo(), sess.undo(NOW), sess.stats.answered], [false, null, 0]);
  it = sess.next(NOW + 2000);
  assert.equal(it.key, first, "the undone card comes back first");
  sess.answer(first, "good", NOW + 2000);
  const seen = [];
  for (let i = 0; i < 5; i++) { it = sess.next(NOW + 3000 + i); if (it.done || it.kind === "learning") break; seen.push(it.key); sess.answer(it.key, "good", NOW + 3000 + i); }
  assert.deepEqual(seen.sort(), ["fc-0001:tk-en", "fc-0002:tk-en", "fc-0003:tk-en"].filter(k => k !== first), "the rest of the queue is intact");
});
test("session: retention counters: answers and lapses of cards in review, mature ones apart", () => {
  const deck = deckOf(4), cards = emptyCards();
  cards.cards["fc-0001:tk-en"] = reviewState(5, at(2026, 10, 14, 4));
  cards.cards["fc-0002:tk-en"] = reviewState(5, at(2026, 10, 14, 4));
  cards.cards["fc-0003:tk-en"] = reviewState(21, at(2026, 10, 14, 4));
  cards.cards["fc-0004:tk-en"] = reviewState(40, at(2026, 10, 14, 4));
  const sess = TKM.srs.session({ deck, cards, settings: SETTINGS(), now: NOW, rng: rngMid });
  const grades = { "fc-0001:tk-en": "again", "fc-0002:tk-en": "good", "fc-0003:tk-en": "again", "fc-0004:tk-en": "hard" };
  for (let i = 0; i < 4; i++) { const it = sess.next(NOW); sess.answer(it.key, grades[it.key], NOW); }
  const relearn = sess.next(NOW + 11 * MIN);
  assert.equal(relearn.kind, "learning");
  sess.answer(relearn.key, "good", NOW + 11 * MIN);                    // relearning answers are not review answers
  assert.deepEqual(cards.days["2026-10-14"], { new: 0, reviews: 4, again: 2, lapses: 2, mature: 2, matureLapses: 1 });
  const r = TKM.srs.retention(cards, NOW, SETTINGS(), 1);
  assert.deepEqual([r.all, r.young, r.mature], [{ reviews: 4, lapses: 2, rate: 0.5 }, { reviews: 2, lapses: 1, rate: 0.5 }, { reviews: 2, lapses: 1, rate: 0.5 }]);
});
test("retention: over the last n learning days or all of them; old day records without counters are left out", () => {
  const cards = emptyCards();
  cards.days["2026-10-14"] = { new: 3, reviews: 10, again: 3, lapses: 1, mature: 4, matureLapses: 0 };
  cards.days["2026-10-10"] = { new: 0, reviews: 20, again: 2, lapses: 2, mature: 10, matureLapses: 1 };
  cards.days["2026-09-01"] = { new: 0, reviews: 10, again: 5, lapses: 5, mature: 0, matureLapses: 0 };
  cards.days["2026-10-12"] = { new: 5, reviews: 8, again: 4 };                                      // before the counters
  const st = SETTINGS();
  assert.deepEqual(TKM.srs.retention(cards, NOW, st, 1).all, { reviews: 10, lapses: 1, rate: 0.9 });
  assert.deepEqual(TKM.srs.retention(cards, NOW, st, 7).all, { reviews: 30, lapses: 3, rate: 0.9 });
  assert.deepEqual(TKM.srs.retention(cards, NOW, st, 7).young, { reviews: 16, lapses: 2, rate: 0.875 });
  assert.deepEqual(TKM.srs.retention(cards, NOW, st, null).all, { reviews: 40, lapses: 8, rate: 0.8 });
  assert.equal(TKM.srs.retention(emptyCards(), NOW, st, 30).mature.rate, null);
  assert.deepEqual(TKM.progress.validate({ app: TKM.C.APP, schema: 1, exported: TKM.iso(NOW), course: TKM.progress.defaults("course", NOW), cards, settings: st }), []);
});
test("suspend: the card keeps its schedule and returns to it; a card never studied goes back to new", () => {
  const rev = reviewState(12, at(2026, 10, 20, 4), { lapses: 8, leech: true });
  const s = TKM.srs.suspend(rev, NOW);
  assert.deepEqual([s.s, s.was, s.ivl, s.due, s.leech, rev.s], ["suspended", "review", 12, rev.due, true, "review"]);
  assert.deepEqual(TKM.srs.unsuspend(s), rev);
  const rl = { s: "relearning", due: NOW + 10 * MIN, ivl: 1, ease: 1.3, step: 0, reps: 20, lapses: 8, last: NOW, leech: true };
  assert.deepEqual(TKM.srs.unsuspend(TKM.srs.suspend(rl, NOW)), rl, "a leech in relearning goes back to relearning");
  const fresh = TKM.srs.suspend(null, NOW);
  assert.deepEqual([fresh.s, fresh.reps, fresh.last, "was" in fresh, TKM.srs.unsuspend(fresh)], ["suspended", 0, 0, false, null]);
  assert.deepEqual(TKM.srs.suspend(s, NOW), s, "suspending twice changes nothing");
  assert.equal(TKM.srs.unsuspend({ ...s, was: undefined }).s, "review", "no was: an interval means review");
  assert.equal(TKM.srs.unsuspend({ ...TKM.srs.suspend({ ...rl, s: "learning", ivl: 0 }, NOW), was: undefined }).s, "learning");
  assert.equal(TKM.srs.isDue(s, at(2026, 11, 30), SETTINGS()), false);
});
test("suspend: suspended cards leave the queue and the session; store.setSuspended saves and counts changes", () => {
  const store = TKM.createStore(fakeStorage()), deck = deckOf(4);
  store.update("cards", c => {
    c.cards["fc-0001:tk-en"] = reviewState(4, at(2026, 10, 13, 4));
    c.cards["fc-0002:tk-en"] = { s: "learning", due: NOW - MIN, ivl: 0, ease: 2.5, step: 1, reps: 1, lapses: 0, last: NOW - 11 * MIN };
  }, NOW);
  assert.equal(store.setSuspended(["fc-0001:tk-en", "fc-0002:tk-en", "fc-0003:tk-en", "fc-0004:tr-en"], true, NOW), 3, "a Turkish key is not a card key here");
  assert.equal(store.setSuspended(["fc-0001:tk-en"], true, NOW), 0, "already suspended");
  const q = TKM.srs.queue({ deck, cards: store.cards(), settings: { ...SETTINGS(), directions: ["tk-en"] } }, NOW);
  assert.deepEqual([q.reviews, q.learnNow, q.news], [[], [], ["fc-0004:tk-en"]]);
  const sess = store.cardSession(deck, { now: NOW, rng: rngMid });
  const keys = [];
  for (let it = sess.next(NOW); !it.done; it = sess.next(NOW)) { keys.push(it.key); sess.answer(it.key, "easy", NOW); }
  assert.ok(!keys.some(k => /fc-000[123]:tk-en/.test(k)), keys.join());
  assert.equal(store.setSuspended(["fc-0001:tk-en", "fc-0002:tk-en", "fc-0003:tk-en"], false, NOW), 3);
  const c = store.cards().cards;
  assert.deepEqual([c["fc-0001:tk-en"].s, c["fc-0002:tk-en"].s, "fc-0003:tk-en" in c], ["review", "learning", false]);
  store.setSuspended(["fc-0001:tk-en"], true, NOW);
  assert.deepEqual(TKM.progress.validate(store.exportData(NOW)), [], "a suspended card exports cleanly");
});
test("cardCounts and forecast: states by direction, young under 21 days, overdue cards due today", () => {
  const deck = deckOf(6), cards = emptyCards(), st = SETTINGS();
  cards.cards["fc-0001:tk-en"] = reviewState(5, at(2026, 10, 12, 4));            // young, overdue → today
  cards.cards["fc-0002:tk-en"] = reviewState(30, at(2026, 10, 16, 4));           // mature, in 2 days
  cards.cards["fc-0003:tk-en"] = reviewState(20, at(2026, 10, 15, 4));           // young, tomorrow
  cards.cards["fc-0004:tk-en"] = { s: "learning", due: NOW + 5 * MIN, ivl: 0, ease: 2.5, step: 1, reps: 1, lapses: 0, last: NOW };
  cards.cards["fc-0005:tk-en"] = TKM.srs.suspend(reviewState(40, at(2026, 10, 14, 4), { leech: true, lapses: 8 }), NOW);
  cards.cards["fc-0001:en-tk"] = { s: "relearning", due: NOW + 10 * MIN, ivl: 1, ease: 2.3, step: 0, reps: 5, lapses: 1, last: NOW };
  cards.cards["fc-0006:tk-en"] = reviewState(100, at(2027, 3, 1, 4));            // beyond the forecast
  assert.deepEqual(TKM.srs.cardCounts({ deck, cards, settings: st }),
    { new: 5, learning: 1, relearning: 1, young: 2, mature: 2, suspended: 1, leech: 1, total: 12 });
  assert.deepEqual(TKM.srs.cardCounts({ deck, cards, settings: { ...st, directions: ["tk-en"] } }),
    { new: 0, learning: 1, relearning: 0, young: 2, mature: 2, suspended: 1, leech: 1, total: 6 });
  const f = TKM.srs.forecast({ deck, cards, settings: st }, NOW, 30);
  assert.equal(f.length, 30);
  assert.deepEqual(f.slice(0, 3), [
    { day: "2026-10-14", young: 1, mature: 0, learning: 2 },
    { day: "2026-10-15", young: 1, mature: 0, learning: 0 },
    { day: "2026-10-16", young: 0, mature: 1, learning: 0 }]);
  assert.equal(f.reduce((n, d) => n + d.young + d.mature + d.learning, 0), 5, "suspended and far-off cards are left out");
  assert.equal(TKM.srs.forecast({ deck, cards, settings: { ...st, directions: ["en-tk"] } }, NOW, 7)[0].learning, 1);
}, { tz: true });

// ─────────────────────────── 6.1 the path ───────────────────────────
test("path: the real index has the 36 units of TM-CURRICULUM.md, unwritten ones planned", () => {
  const f = TKM.path.flatten(INDEX);
  assert.equal(f.units.length, 36);
  assert.deepEqual(INDEX.levels.map(l => [l.id, l.units.length]), [["a1", 12], ["a2", 12], ["b1", 12]]);
  assert.equal(f.lessons.length, INDEX.counts.lessons);
  const planned = INDEX.levels.flatMap(l => l.units).find(u => u.status === "planned");
  if (planned) {
    assert.equal(TKM.path.unitState(INDEX, TKM.progress.defaults("course", NOW), SETTINGS(), planned.id).status, "planned");
    assert.equal(TKM.path.nextPlanned(INDEX).id, planned.id);
  }
  if (!f.lessons.length) assert.equal(TKM.path.nextLesson(INDEX, TKM.progress.defaults("course", NOW)), null);
});
test("path: lessons open one after another; the jump test covers what's not done before a unit", () => {
  const course = TKM.progress.defaults("course", NOW), st = SETTINGS();
  const f = TKM.path.flatten(FIX);
  assert.equal(f.lessons.length, FIX.counts.lessons);
  assert.equal(TKM.path.lessonUnlocked(FIX, course, st, "a1-u01-l01"), true);
  assert.equal(TKM.path.lessonUnlocked(FIX, course, st, "a1-u01-l02"), false);
  assert.equal(TKM.path.nextLesson(FIX, course).id, "a1-u01-l01");
  assert.equal(TKM.path.unitState(FIX, course, st, "a1-u01").status, "open");
  assert.equal(TKM.path.unitState(FIX, course, st, "a1-u02").status, "locked");
  assert.deepEqual(TKM.path.testLessons(FIX, course, "a1-u03").length, 8);
  for (const l of ["a1-u01-l01", "a1-u01-l02", "a1-u01-l03", "a1-u01-l04"]) TKM.progress.finishLesson(course, st, l, { correct: 10, counted: 12 }, NOW);
  assert.equal(TKM.path.lessonUnlocked(FIX, course, st, "a1-u02-l01"), true, "a unit's first lesson opens after the previous unit's last");
  assert.equal(TKM.path.unitState(FIX, course, st, "a1-u01").status, "done");
  assert.equal(TKM.path.unitDone(FIX, course, "a1-u01"), true);
  assert.equal(TKM.path.nextLesson(FIX, course).id, "a1-u02-l01");
  assert.deepEqual(TKM.path.testLessons(FIX, course, "a1-u03"), ["a1-u02-l01", "a1-u02-l02", "a1-u02-l03", "a1-u02-l04"]);
  assert.equal(TKM.path.lessonUnlocked(FIX, course, { ...st, unlockAll: true }, "a1-u03-l04"), true);
});

// ─────────────────────────── 6.3 XP, streak, mistakes ───────────────────────────
test("XP: +1 per first-try correct, +5 to finish, +5 if perfect; a repeat earns half", () => {
  const c = TKM.progress.defaults("course", NOW), st = SETTINGS();
  let r = TKM.progress.finishLesson(c, st, "a1-u01-l01", { correct: 10, counted: 12 }, NOW);
  assert.deepEqual([r.xp, r.score, r.perfect, r.repeat], [15, 0.833, false, false]);
  r = TKM.progress.finishLesson(c, st, "a1-u01-l02", { correct: 12, counted: 12 }, NOW);
  assert.deepEqual([r.xp, r.perfect], [22, true]);
  r = TKM.progress.finishLesson(c, st, "a1-u01-l01", { correct: 12, counted: 12 }, NOW + MIN);
  assert.deepEqual([r.xp, r.repeat], [11, true]);
  assert.deepEqual(c.lessons["a1-u01-l01"], { first: "2026-10-14", last: TKM.iso(NOW + MIN), runs: 2, best: 1, xp: 26 });
  assert.deepEqual([c.xp.total, c.xp.days["2026-10-14"]], [48, 48]);
  assert.deepEqual([r.goal.today, r.goal.met, r.goal.justMet], [48, true, false]);
  assert.deepEqual(TKM.progress.goal(c, st, NOW), { xp: 48, goal: 20, met: true, ratio: 1 });
});
test("goal: justMet is set by the lesson that crosses the daily goal", () => {
  const c = TKM.progress.defaults("course", NOW), st = SETTINGS();
  assert.equal(TKM.progress.finishLesson(c, st, "a1-u01-l01", { correct: 10, counted: 12 }, NOW).goal.justMet, false);
  assert.equal(TKM.progress.finishLesson(c, st, "a1-u01-l02", { correct: 1, counted: 12 }, NOW).goal.justMet, true);
});
test("streak: consecutive learning days count up, a missed day resets, best is kept", () => {
  const c = TKM.progress.defaults("course", NOW), st = SETTINGS();
  TKM.progress.finishLesson(c, st, "a1-u01-l01", { correct: 1, counted: 1 }, at(2026, 10, 10, 20));
  TKM.progress.finishLesson(c, st, "a1-u01-l02", { correct: 1, counted: 1 }, at(2026, 10, 11, 23));
  TKM.progress.finishLesson(c, st, "a1-u01-l03", { correct: 1, counted: 1 }, at(2026, 10, 12, 3));    // 3 am: still the 11th
  assert.deepEqual(c.streak, { current: 2, best: 2, last: "2026-10-11" });
  assert.deepEqual(TKM.progress.streak(c, st, at(2026, 10, 12, 9)), { current: 2, best: 2, done: false, last: "2026-10-11" });
  assert.equal(TKM.progress.streak(c, st, at(2026, 10, 13, 9)).current, 0);
  TKM.progress.finishPractice(c, st, { correct: 3 }, at(2026, 10, 14, 9));
  assert.deepEqual(c.streak, { current: 1, best: 2, last: "2026-10-14" });
  assert.equal(TKM.progress.streak(c, st, at(2026, 10, 14, 22)).done, true);
}, { tz: true });
test("unit review: +1 per correct and +10 for a pass; the best score is kept", () => {
  const c = TKM.progress.defaults("course", NOW), st = SETTINGS();
  let r = TKM.progress.finishReview(c, st, "a1-u01", { correct: 11, counted: 15 }, NOW);
  assert.deepEqual([r.passed, r.xp, c.units["a1-u01"].reviewed], [false, 11, undefined]);
  r = TKM.progress.finishReview(c, st, "a1-u01", { correct: 13, counted: 15 }, NOW);
  assert.deepEqual([r.passed, r.xp, c.units["a1-u01"].reviewBest], [true, 23, 0.867]);
  assert.equal(c.units["a1-u01"].reviewed, TKM.iso(NOW));
});
test("jump test: at 80% the skipped lessons are done via test with no XP; playing one later earns full XP", () => {
  const c = TKM.progress.defaults("course", NOW), st = SETTINGS();
  const ids = TKM.path.testLessons(FIX, c, "a1-u02");
  assert.equal(TKM.progress.finishTest(c, st, "a1-u02", ids, { correct: 15, counted: 20 }, NOW).passed, false);
  assert.equal(Object.keys(c.lessons).length, 0);
  const r = TKM.progress.finishTest(c, st, "a1-u02", ids, { correct: 16, counted: 20 }, NOW);
  assert.deepEqual([r.passed, r.marked.length, c.xp.total], [true, 4, 0]);
  assert.deepEqual(c.lessons["a1-u01-l03"], { first: "2026-10-14", last: TKM.iso(NOW), runs: 1, best: 0.8, xp: 0, via: "test" });
  assert.equal(TKM.path.lessonUnlocked(FIX, c, st, "a1-u02-l01"), true);
  const p = TKM.progress.finishLesson(c, st, "a1-u01-l03", { correct: 9, counted: 10 }, NOW);
  assert.deepEqual([p.repeat, p.xp, c.lessons["a1-u01-l03"].runs, c.lessons["a1-u01-l03"].via], [false, 14, 1, undefined]);
});
test("mistakes: remembered when wrong, cleared once right as often, oldest first, capped at 1,000", () => {
  const c = TKM.progress.defaults("course", NOW);
  TKM.progress.answered(c, "a1-u01-l01-e02", false, NOW);
  TKM.progress.answered(c, "a1-u01-l01-e05", false, NOW + 1000);
  TKM.progress.answered(c, "a1-u01-l01-e02", false, NOW + 2000);
  TKM.progress.answered(c, "a1-u01-l01-e02", true, NOW + 3000);
  TKM.progress.answered(c, "a1-u01-l01-e09", true, NOW + 4000);      // never wrong: nothing to remember
  assert.deepEqual(TKM.progress.mistakesDue(c), ["a1-u01-l01-e05", "a1-u01-l01-e02"]);
  TKM.progress.answered(c, "a1-u01-l01-e02", true, NOW + 5000);
  assert.deepEqual(TKM.progress.mistakesDue(c), ["a1-u01-l01-e05"]);
  for (let i = 0; i < 2100; i++) TKM.progress.answered(c, `b1-u${String(1 + (i % 12)).padStart(2, "0")}-l0${1 + (i % 4)}-e${String(i % 97).padStart(2, "0")}`, false, NOW + 20000 + i);
  assert.ok(Object.keys(c.mistakes).length <= 1000);
  assert.equal(c.mistakes["a1-u01-l01-e05"], undefined, "the oldest are dropped first");
});

// ─────────────────────────── 5.9 the store, export and import ───────────────────────────
test("store: saves the three tkm:v1 keys as JSON and reads them back; no speech settings", () => {
  const ls = fakeStorage();
  const s = TKM.createStore(ls);
  assert.deepEqual([s.persistent, s.problem], [true, null]);
  s.finishLesson("a1-u01-l01", { correct: 12, counted: 12 }, NOW);
  s.setSettings({ dailyGoal: 30, tts: false, ttsRate: 1.1 });
  assert.deepEqual([...ls.m.keys()].sort(), ["tkm:v1:course", "tkm:v1:settings"]);
  const s2 = TKM.createStore(ls);
  assert.equal(s2.course().xp.total, 22);
  assert.deepEqual([s2.settings().dailyGoal, s2.settings().newPerDay, "tts" in s2.settings(), "ttsRate" in s2.settings()], [30, 15, false, false]);
});
test("store: invalid settings are refused, partial ones filled with defaults", () => {
  const s = TKM.createStore(fakeStorage());
  s.setSettings({ dailyGoal: 15, newPerDay: 500, directions: [], dayStartHour: 6, bogus: 1 });
  const v = s.settings();
  assert.deepEqual([v.dailyGoal, v.newPerDay, v.directions, v.dayStartHour, v.bogus], [20, 15, ["tk-en", "en-tk"], 6, undefined]);
  s.setSettings({ directions: ["tr-en"] });
  assert.deepEqual(s.settings().directions, ["tk-en", "en-tk"], "a Turkish direction is refused");
  const ls = fakeStorage();
  ls.setItem("tkm:v1:settings", JSON.stringify({ schema: 1, dailyGoal: 50 }));
  assert.deepEqual(TKM.createStore(ls).settings(), { ...SETTINGS(), dailyGoal: 50 });
});
test("store: never reads the Turkish course's keys", () => {
  const ls = fakeStorage();
  ls.setItem("trk:v1:course", JSON.stringify({ ...TKM.progress.defaults("course", NOW), xp: { total: 99, days: {} } }));
  assert.equal(TKM.createStore(ls).course().xp.total, 0);
});
test("store: unreadable JSON → defaults and problem “corrupt”; bad entries are dropped, good ones kept", () => {
  const ls = fakeStorage();
  ls.setItem("tkm:v1:course", "{not json");
  let s = TKM.createStore(ls);
  assert.equal(s.course().xp.total, 0);
  assert.deepEqual([s.problem, s.corrupt.course], ["corrupt", "{not json"]);
  const c = TKM.progress.defaults("course", NOW);
  c.lessons["a1-u01-l01"] = { first: "2026-10-14", last: TKM.iso(NOW), runs: 1, best: 1, xp: 22 };
  c.lessons["a1-u01-l02"] = { first: "yesterday", runs: 1 };
  c.lessons["not-an-id"] = { first: "2026-10-14", last: TKM.iso(NOW), runs: 1, best: 1, xp: 22 };
  c.lessons["c1-u01-l01"] = { first: "2026-10-14", last: TKM.iso(NOW), runs: 1, best: 1, xp: 22 };   // no C1 in this course
  c.xp.total = -3;
  ls.setItem("tkm:v1:course", JSON.stringify(c));
  s = TKM.createStore(ls);
  assert.deepEqual(Object.keys(s.course().lessons), ["a1-u01-l01"]);
  assert.equal(s.course().xp.total, 0);
  assert.equal(s.problem, null);
});
test("store: blocked storage keeps progress in memory; a failed write is reported as “quota”", () => {
  const blocked = TKM.createStore(fakeStorage({ failAll: true }));
  assert.deepEqual([blocked.persistent, blocked.problem], [false, "unavailable"]);
  blocked.finishPractice({ correct: 2 }, NOW);
  assert.equal(blocked.course().xp.total, 2);
  const none = TKM.createStore(null);
  assert.deepEqual([none.persistent, none.problem], [false, "unavailable"]);
  const full = TKM.createStore(fakeStorage({ failWrites: true }));
  full.finishPractice({ correct: 2 }, NOW);
  assert.deepEqual([full.problem, full.course().xp.total], ["quota", 2]);
});
test("store: onChange fires on saves; days older than 400 days are pruned", () => {
  const s = TKM.createStore(fakeStorage());
  const seen = [];
  s.onChange(n => seen.push(n));
  s.update("course", c => { c.xp.days["2025-01-01"] = 5; c.xp.days["2026-01-01"] = 5; }, NOW);
  assert.deepEqual(Object.keys(s.course().xp.days), ["2026-01-01"]);
  assert.deepEqual(seen, ["course"]);
});
test("progress files: the TM-PROJECT.md example passes; mistakes in it are reported", () => {
  const md = fs.readFileSync(path.join(ROOT, "turkmen/TM-PROJECT.md"), "utf8");
  const ex = JSON.parse(md.match(/^```json progress\n([\s\S]*?)^```$/m)[1]);
  assert.deepEqual(TKM.progress.validate(ex), []);
  const bad = JSON.parse(JSON.stringify(ex));
  bad.app = "elsewhere"; bad.course.lessons["a1-u01-l01"].best = 2; bad.cards.cards["fc-0001:tr-en"] = bad.cards.cards["fc-0001:tk-en"];
  bad.settings.tts = true; bad.cards.cards["fc-0002:tk-en"].ease = 1.0;
  const errs = TKM.progress.validate(bad).join("\n");
  for (const w of ["app", "best", "fc-0001:tr-en", "tts: unknown field", "ease"]) assert.ok(errs.includes(w), `no error mentions ${w}:\n${errs}`);
});
test("a Daily Turkish progress file is refused with one clear message, by the store and by validate.mjs --progress", () => {
  const turkish = { app: "gregoiremaillard.com/turkish", schema: 1, exported: TKM.iso(NOW), course: TKM.progress.defaults("course", NOW), cards: { schema: 1, updated: TKM.iso(NOW), cards: {}, days: {} },
    settings: { schema: 1, dailyGoal: 20, newPerDay: 15, reviewsPerDay: 200, directions: ["tr-en", "en-tr"], dayStartHour: 4, tts: true, ttsRate: 0.9, keyboardBar: true, unlockAll: false, onlyTaughtWords: false } };
  const errs = TKM.progress.validate(turkish);
  assert.equal(errs.length, 1);
  assert.match(errs[0], /Daily Turkish progress file/);
  const s = TKM.createStore(fakeStorage());
  s.finishPractice({ correct: 3 }, NOW);
  const r = s.importData(turkish);
  assert.deepEqual([r.ok, r.errors, s.course().xp.total], [false, errs, 3], "nothing is replaced");
  const tmp = path.join(os.tmpdir(), `tkm-turkish-${process.pid}.json`);
  fs.writeFileSync(tmp, JSON.stringify(turkish));
  const run = spawnSync(process.execPath, [path.join(ROOT, "scripts/turkmen/validate.mjs"), "--progress", tmp], { encoding: "utf8" });
  fs.unlinkSync(tmp);
  assert.equal(run.status, 1);
  assert.match(run.stdout, /Daily Turkish progress file/);
});
test("export → validate.mjs --progress passes; import replaces everything; a bad file is refused", () => {
  const a = TKM.createStore(fakeStorage());
  a.finishLesson("a1-u01-l01", { correct: 11, counted: 12 }, NOW);
  a.answered("a1-u01-l01-e04", false, NOW);
  a.setSettings({ directions: ["tk-en"] });
  const deck = deckOf(20), sess = a.cardSession(deck, { now: NOW, rng: rngMid });
  for (let i = 0; i < 12; i++) { const it = sess.next(NOW + i * 1000); if (it.done) break; sess.answer(it.key, "good", NOW + i * 1000); }
  const file = a.exportData(NOW + 60000);
  assert.equal(file.app, "daily-turkmen");
  assert.deepEqual(TKM.progress.validate(file), []);
  const tmp = path.join(os.tmpdir(), `tkm-progress-${process.pid}.json`);
  fs.writeFileSync(tmp, JSON.stringify(file, null, 2));
  const run = spawnSync(process.execPath, [path.join(ROOT, "scripts/turkmen/validate.mjs"), "--progress", tmp], { encoding: "utf8" });
  fs.unlinkSync(tmp);
  assert.equal(run.status, 0, run.stdout + run.stderr);
  const b = TKM.createStore(fakeStorage());
  assert.equal(b.importData({ ...file, schema: 2 }).ok, false);
  const r = b.importData(JSON.parse(JSON.stringify(file)));
  assert.deepEqual([r.ok, b.course().xp.total, Object.keys(b.cards().cards).length, b.settings().directions], [true, a.course().xp.total, 12, ["tk-en"]]);
  assert.equal(b.course().updated, file.course.updated, "the file's own times are kept");
  assert.equal(a.course().streak.current, 1, "ten cards and a lesson on the same day: one streak day");
});
test("store.reset: back to defaults", () => {
  const s = TKM.createStore(fakeStorage());
  s.finishPractice({ correct: 4 }, NOW);
  s.setSettings({ dailyGoal: 50 });
  s.reset();
  assert.deepEqual([s.course().xp.total, s.settings().dailyGoal], [0, 20]);
});

// ─────────────────────────── achievements ───────────────────────────
test("achievements: none at the start; earned from lessons, a review, reading, the streak and cards", () => {
  const now = Date.UTC(2026, 9, 14, 12), P = TKM.progress, set = SETTINGS();
  const course = P.defaults("course", now), cards = P.defaults("cards", now);
  const ids = a => a.filter(x => x.done).map(x => x.id).sort();
  const first = P.achievements(FIX, course, cards, set, now);
  assert.equal(first.length, 32);
  assert.deepEqual(ids(first), []);
  assert.ok(first.every(a => a.have === 0 && a.need > 0 && a.tk && a.en && a.text && a.glyph && ["a1", "a2", "b1", "gold"].includes(a.hue)));
  assert.ok(first.every(a => /^[A-Za-z0-9 äçžňöşüýÄÇŽŇÖŞÜÝ]+$/.test(a.tk) && !/[cvqx]/.test(a.tk.replace(/XP/, ""))), "Turkmen letters only");
  const u = TKM.path.flatten(FIX).units.find(x => x.status === "ready");
  u.lessons.forEach((l, i) => P.finishLesson(course, set, l.id, { correct: i ? 9 : 10, counted: 10 }, now));
  P.finishReview(course, set, u.id, { correct: 15, counted: 15 }, now);
  P.markRead(course, u.id, "guide", now);
  course.streak = { current: 7, best: 7, last: TKM.today(set, now) };
  cards.cards["fc-0001:tk-en"] = { s: "review", due: now, ivl: 1, ease: 2.5, step: 0, reps: 2, lapses: 0, last: now };
  cards.cards["fc-0001:en-tk"] = { s: "review", due: now, ivl: 3, ease: 2.5, step: 0, reps: 2, lapses: 0, last: now };
  const a = P.achievements(FIX, course, cards, set, now), by = Object.fromEntries(a.map(x => [x.id, x]));
  assert.deepEqual(ids(a), ["first-lesson", "first-unit", "golden-tile", "perfect", "streak-3", "streak-7"]);
  assert.equal(by["streak-30"].have, 7);
  assert.equal(by["words-100"].have, 1);          // one word, counted once for its two directions
  assert.equal(by["guides-12"].have, 1);
  assert.equal(by.a1.need, FIX.levels[0].units.length);
  assert.ok(by["xp-1000"].have > 0 && !by["xp-1000"].done);
  // a "jump here" test isn't a perfect lesson
  const c2 = P.defaults("course", now);
  P.finishTest(c2, set, u.id, [u.lessons[0].id], { correct: 20, counted: 20 }, now);
  assert.equal(P.achievements(FIX, c2, cards, set, now).find(x => x.id === "perfect").done, false);
});

// ─────────────────────────── analytics ───────────────────────────
test("track: only the two allowed events, only their allowed fields", () => {
  const sent = [];
  globalThis.gtag = (...a) => sent.push(a);
  try {
    assert.equal(TKM.track("tkm_lesson_complete", { lesson: "a1-u01-l01", score: 0.9, answer: "secret" }), true);
    assert.equal(TKM.track("trk_lesson_complete", { lesson: "a1-u01-l01" }), false, "not the Turkish course's events");
    assert.equal(TKM.track("page_view", {}), false);
    assert.deepEqual(sent, [["event", "tkm_lesson_complete", { lesson: "a1-u01-l01", score: 0.9 }]]);
  } finally { delete globalThis.gtag; }
});

// ─────────────────────────── run ───────────────────────────
const run = tests.filter(t => !CHILD || t.tz);
let failed = 0;
for (const t of run) {
  try { t.fn(); if (VERBOSE) console.log(`ok     ${t.name}`); }
  catch (e) { failed++; console.log(`FAIL   ${t.name}\n       ${String(e.message).split("\n").join("\n       ")}`); }
}
if (CHILD) {
  console.log(`  ${process.env.TZ}: ${run.length - failed}/${run.length} date tests passed`);
  process.exit(failed ? 1 : 0);
}
let childFail = 0;
for (const tz of ["America/Toronto", "Australia/Lord_Howe"]) {
  const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), "--tz-child"], { encoding: "utf8", env: { ...process.env, TZ: tz } });
  process.stdout.write(r.stdout + r.stderr);
  if (r.status !== 0) childFail++;
}
console.log(`\nTurkmen course · turkmen.js: ${run.length - failed}/${run.length} tests passed${childFail ? `, date tests failed in ${childFail} time zone(s)` : ", date tests also pass in 2 other time zones"}.`);
process.exit(failed || childFail ? 1 : 0);
