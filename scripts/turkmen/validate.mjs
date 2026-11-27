#!/usr/bin/env node
// Turkmen course (Daily Turkmen, /turkmen/): validates every content file against the schemas of turkish/PROJECT.md 5
// with the renames of turkmen/TM-PROJECT.md 5.0, and the registry of units, grammar points and batches in
// turkmen/TM-CURRICULUM.md. Forked from scripts/turkish/validate.mjs in TK-BUILD-1. No dependencies.
//
//   node scripts/turkmen/validate.mjs                    validate everything; exit 1 on errors
//   node scripts/turkmen/validate.mjs --batch A1-1       also report what a batch still lacks
//   node scripts/turkmen/validate.mjs --index            validate, then rewrite assets/data/turkmen/index.json
//   node scripts/turkmen/validate.mjs --examples         validate the JSON examples in turkmen/TM-PROJECT.md
//   node scripts/turkmen/validate.mjs --vocab            list the words taught so far, unit by unit
//   node scripts/turkmen/validate.mjs --progress f.json  validate an exported progress file
//   node scripts/turkmen/validate.mjs --lang fr          the French edition (turkmen/TM-FR.md 10): assets/data/turkmen/fr/
//                                                        and i18n/fr.json, their parity with the English files, French typography
//   node scripts/turkmen/validate.mjs --lang fr --sync   copy the Turkmen of the English files into the French ones
//   node scripts/turkmen/validate.mjs --lang fr --fix    French typography: ’, spaces before ; : ! ? and inside « », œ
//   --lang all: both editions; --batch, --index, --vocab and --progress also take --lang fr
//   options: --strict (warnings count as errors), --quiet (hide warnings)
//
// The schema definitions below mirror TM-PROJECT.md 5; change both together and run --examples.
// Conjugate cells, morph tiles and the forms on the flashcards are also compared with the morphology engine,
// assets/js/turkmen-morph.js (TM-PROJECT.md 3 and 8; TK-MORPH).
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DATA = path.join(ROOT, "assets/data/turkmen");
const CURRICULUM = path.join(ROOT, "turkmen/TM-CURRICULUM.md");
const PROJECT = path.join(ROOT, "turkmen/TM-PROJECT.md");
const WORDLIST = path.join(ROOT, "scripts/turkmen/tm-wordlist.tsv");
const rel = p => path.relative(ROOT, p).split(path.sep).join("/");

// ─────────────────────────── command line ───────────────────────────
const opt = { batch: null, index: false, examples: false, vocab: false, progress: null, strict: false, quiet: false, lang: "en", sync: false, fix: false };
{
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    const k = a[i];
    if (k === "--batch") opt.batch = a[++i];
    else if (k === "--progress") opt.progress = a[++i];
    else if (k === "--index") opt.index = true;
    else if (k === "--lang") opt.lang = a[++i];
    else if (k === "--sync") opt.sync = true;
    else if (k === "--fix") opt.fix = true;
    else if (k === "--examples") opt.examples = true;
    else if (k === "--vocab") opt.vocab = true;
    else if (k === "--strict") opt.strict = true;
    else if (k === "--quiet") opt.quiet = true;
    else if (k === "-h" || k === "--help") { console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 17).map(l => l.replace(/^\/\/ ?/, "")).join("\n")); process.exit(0); }
    else { console.error(`Unknown option ${k} (try --help)`); process.exit(2); }
  }
  if ((opt.batch === undefined) || (opt.progress === undefined)) { console.error("--batch and --progress need a value"); process.exit(2); }
  if (!["en", "fr", "all"].includes(opt.lang)) { console.error("--lang takes en, fr or all"); process.exit(2); }
  if ((opt.sync || opt.fix) && opt.lang === "en") { console.error("--sync and --fix work on the French edition: add --lang fr"); process.exit(2); }
}

// ─────────────────────────── reporting ───────────────────────────
const issues = [];
const seenIssue = new Set();
function report(level, where, msg) {
  const key = level + where + msg;
  if (seenIssue.has(key)) return;
  seenIssue.add(key);
  issues.push({ level, where, msg });
}
const err = (where, msg) => report("error", where, msg);
const warn = (where, msg) => report("warn", where, msg);

// ─────────────────────────── constants ───────────────────────────
// A1 to B1 for now (TM-CURRICULUM.md); B2 and up would be added to LEVELS, CEFR and LV together.
const LEVELS = ["a1", "a2", "b1"];
const CEFR = { a1: "A1", a2: "A2", b1: "B1" };
const PERSONS = ["men", "sen", "ol", "biz", "siz", "olar"];
const POS = ["noun", "verb", "adj", "adv", "pron", "num", "postp", "conj", "interj", "det", "particle", "phrase"];
const TYPES = ["mcq", "cloze", "translate", "wordbank", "match", "conjugate", "morph", "reading", "open"];   // no listen: no audio (TM-PROJECT.md 2)
const LV = "(?:a1|a2|b1)";
const RE = {
  level: new RegExp(`^${LV}$`),
  unit: new RegExp(`^${LV}-u\\d{2}$`),
  lesson: new RegExp(`^${LV}-u\\d{2}-l\\d{2}$`),
  exercise: new RegExp(`^${LV}-u\\d{2}-l\\d{2}-e\\d{2}$`),
  grammar: new RegExp(`^${LV}-u\\d{2}-grammar$`),
  culture: new RegExp(`^${LV}-u\\d{2}-culture$`),
  gp: /^gp-[a-z0-9]+(?:-[a-z0-9]+)*$/,
  card: /^fc-\d{4}$/,
  slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  day: /^\d{4}-\d{2}-\d{2}$/,
  iso: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/,
};
const levelOf = id => id.slice(0, 2);
const unitOf = id => id.slice(0, 6);
const pad2 = n => String(n).padStart(2, "0");
// The 30 letters of the Turkmen Latin alphabet (TM-PROJECT.md 7.1). Plain toUpperCase() gives their capitals.
const TK_ABC = "abçdeäfghijžklmnňoöprsştuüwyýz";
const TK_LETTERS = new Set([...TK_ABC, ...TK_ABC.toUpperCase()]);
// Turkish letters that Turkmen doesn't have are errors (TM-PROJECT.md 8), with the Turkmen letter that replaces them.
const TURKISH_ONLY = { "ı": "y", "ğ": "g", "İ": "I", "Ğ": "G", "â": "a", "î": "i", "û": "u", "Â": "A", "Î": "I", "Û": "U" };
// Other foreign letters are warnings; these get a hint (c and v typed by habit, or a lookalike of ý and ň).
const LETTER_HINT = { c: "j or ç", C: "J or Ç", v: "w", V: "W", "ÿ": "ý (U+00FD)", "Ÿ": "Ý (U+00DD)", "ñ": "ň (U+0148)", "Ñ": "Ň (U+0147)" };
const CONS = "bçdfghjžklmnňprsştwz";   // consonants other than ý, for the y/ý checks

// ─────────────────────────── text checks ───────────────────────────
// The checker's fold for its "almost" verdict (TM-PROJECT.md 6.4): the eight Turkmen letters to their base.
const fold = s => s.replace(/ä/g, "a").replace(/ç/g, "c").replace(/ž/g, "z").replace(/ň/g, "n").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u").replace(/ý/g, "y");

function hygiene(s, where, { multiline = false, spaces = false } = {}) {
  if (s !== s.normalize("NFC")) err(where, "text is not NFC-normalized");
  const mark = s.normalize("NFC").match(/\p{M}/u);
  if (mark) err(where, `contains a combining mark (U+${mark[0].codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}); type the letter itself (ň U+0148, ý U+00FD, ž U+017E, ä U+00E4)`);
  if (/<\/?[a-zA-Z][^>]*>/.test(s)) err(where, "contains an HTML tag; use the inline markup of PROJECT.md 5.1");
  if (/[\u0000-\u0009\u000b-\u001f]/.test(s)) err(where, "contains a control character");
  if (!multiline && /\n/.test(s)) err(where, "contains a line break");
  if (multiline && /\n/.test(s.replace(/\n\n/g, ""))) err(where, "paragraphs must be separated by exactly one blank line (\\n\\n)");
  if (s !== s.trim()) err(where, "leading or trailing whitespace");
  if (!spaces && /[^\n] {2,}|\t/.test(s)) err(where, "double space or tab");
}

// Turkmen has no dotted and dotless i pair, so plain toUpperCase() is right for it as for English.
function sentenceCase(s, where) {
  if (!/[.!?…]["”»)]?$/.test(s)) return;
  const first = [...s].find(ch => /[\p{L}\d]/u.test(ch));
  if (!first || /\d/.test(first)) return;
  if (first !== first.toUpperCase()) warn(where, `sentence starts with a lowercase letter: “${s.slice(0, 40)}”`);
}

// TM-PROJECT.md 7.1 and 8: letters, no apostrophe, the question particle written attached, y against ý.
// wrong: a wrong option of an mcq or a cloze blank, or a wordbank distractor, which a spelling drill misspells on
// purpose (yok, hava, neme): only the Turkish-only letters are reported there, as errors (TM-PROJECT.md 8, A1-1).
const PARTICLE_APART = /(?:^|[^\p{L}-])(\p{L}+)\s+(m[yi](?:d[yi](?:m|ň|k|ňyz|ňiz|lar|ler)?)?)(?![\p{L}-])/u;
function checkTk(s, where, { sentence = true, wrong = false } = {}) {
  if (wrong) {
    for (const ch of new Set(s)) if (ch in TURKISH_ONLY) err(where, `“${ch}” is a Turkish letter, not a Turkmen one (Turkmen writes ${TURKISH_ONLY[ch]})`);
    return;
  }
  if (/['’‘ʼ]/.test(s)) warn(where, "apostrophe in Turkmen text: Turkmen writes none, not even before a suffix on a name (Aşgabatda, Merdanyň)");
  for (const ch of new Set(s)) {
    if (!/\p{L}/u.test(ch) || TK_LETTERS.has(ch)) continue;
    if (ch in TURKISH_ONLY) err(where, `“${ch}” is a Turkish letter, not a Turkmen one (Turkmen writes ${TURKISH_ONLY[ch]})`);
    else warn(where, `non-Turkmen letter “${ch}” in Turkmen text${LETTER_HINT[ch] ? ` (Turkmen writes ${LETTER_HINT[ch]})` : ""}`);
  }
  const low = s.toLowerCase();
  let m = low.match(PARTICLE_APART);
  if (m) warn(where, `“${m[1]} ${m[2]}”: Turkmen writes the question particle attached (${m[1]}${m[2]})`);
  if ((m = low.match(new RegExp(`[${CONS}]ý[${CONS}]`)))) warn(where, `“${m[0]}”: ý between two consonants; did you mean the vowel y?`);
  if ((m = low.match(/(?:^|[^\p{L}])(y[aeäioöuüy]\p{L}*)/u))) warn(where, `“${m[1]}” starts with y before a vowel; did you mean the consonant ý (as in ýok)?`);
  if ((m = low.match(/\p{L}*[aeäioöuü]y\p{L}*/u))) warn(where, `“${m[0]}”: y right after a vowel; did you mean the consonant ý (as in aý, öý)?`);
  if (sentence) sentenceCase(s, where);
}

function checkEnText(s, where) { sentenceCase(s, where); bareId(s, where); noTurkish(s, where); }

// TM-PROJECT.md 1 and 8: learner-facing text never compares Turkmen with Turkish. A warning, since the word can be
// legitimate (a sentence about languages); the writer checks it.
function noTurkish(t, where) {
  if (/\bTurkish\b/i.test(t)) warn(where, "mentions “Turkish”: the course never compares Turkmen with Turkish (TM-PROJECT.md 1); check that it is needed");
}

// learners never see internal IDs: refer to a unit, lesson or grammar point with a [label](ref) link
function bareId(t, where) {
  const m = t.match(/(?:^|[^\w-])((?:[abc][12]-u\d\d(?:-l\d\d(?:-e\d\d)?)?|gp-[a-z0-9]+(?:-[a-z0-9]+)*))(?![\w-])/);
  if (m) warn(where, `internal ID “${m[1]}” in learner-facing text; use a [label](ref) link`);
}

function checkText(s, lang, where, o = {}) { if (lang === "tk") checkTk(s, where, o); else checkEnText(s, where); }

// QA-TK-2, ported from the Turkish course's QA-2: markup in a plain-text field would show as typed (asterisks, backticks)
function rawMarkup(s, where) {
  const m = s.match(/\*+[^*]*\*+|\*|`[^`]*`?|\[[^\]\n]+\]\([^)\s]+\)/);
  if (m) warn(where, `“${m[0].slice(0, 40)}”: markup isn't rendered in a plain-text field; write it without * \` or [ ]( )`);
}
// Options follow optionsLang (TM-PROJECT.md 5.0, QA-TK-2): Turkmen options are plain Tk; English options are Rich
// without links (*Turkmen*, `code` and **bold** render; a link would sit inside a button, so it goes in explain).
// wrong: a wrong option of an mcq, which a spelling drill may misspell on purpose (TM-PROJECT.md 8).
function checkOption(o, lang, where, cx, { wrong = false } = {}) {
  if (lang === "tk") { checkTk(o, where, { sentence: false, wrong }); rawMarkup(o, where); return; }
  checkRich(o, where, cx); checkEnText(o, where);
  if (/\]\(/.test(o)) warn(where, "a link in an option: the option is a button, so leave the link to explain");
}

// inline markup (PROJECT.md 5.1, TM-PROJECT.md 5.0): *Turkmen*, **bold**, `code`, [label](ref)
function checkRich(s, where, cx) {
  let t = s.replace(/\\\*/g, "\u0001");
  t = t.replace(/`([^`\n]*)`/g, (m, inner) => { if (!inner.trim()) err(where, "empty `code` span"); return "\u0002"; });
  if (t.includes("`")) err(where, "unbalanced backtick");
  t = t.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (m, label, ref) => { checkRef(ref, where, cx); return label; });
  if (/\]\(/.test(t)) err(where, "malformed [label](ref) link");
  bareId(t, where);
  if (cx && cx.lang === "fr") noTurc(t, where); else noTurkish(t, where);
  t = t.replace(/\*\*([^*\n]+)\*\*/g, (m, inner) => inner);
  t = t.replace(/\*([^*\n]+)\*/g, (m, inner) => { checkTk(inner.trim(), where + " (Turkmen in *…*)", { sentence: false }); return "\u0003"; });
  if (t.includes("*")) err(where, "unbalanced * or ** markup (write a literal asterisk as \\*)");
}

function checkTkRich(s, where, cx) {
  let t = s.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (m, label, ref) => { checkRef(ref, where, cx); return label; });
  t = t.replace(/\*\*([^*\n]+)\*\*/g, (m, inner) => inner);
  if (/[*`]/.test(t)) err(where, "Turkmen text allows only **bold** and [links](ref)");
  for (const para of t.split("\n\n")) checkTk(para, where);
}

function checkSeg(seg, where, plain) {
  const flat = seg.replace(/\|/g, "");
  if (plain !== undefined && flat !== plain) err(where, `seg “${seg}” does not match its text “${plain}” once the bars are removed`);
  if (/\|\||(^|[\s“"(])\||\|($|[\s.,!?;:…”")])/.test(seg)) err(where, `seg “${seg}” has an empty morpheme`);
  checkTk(flat, where, { sentence: plain === undefined });
}

// links: unit, lesson, grammar point, guide, interlude, "cards" or https URL
function checkRef(ref, where, cx) {
  if (/^https:\/\/\S+$/.test(ref) || ref === "cards") return;
  if (RE.gp.test(ref)) { if (!REG.points.has(ref)) err(where, `link to unknown grammar point ${ref}`); return; }
  if (RE.unit.test(ref)) { if (!REG.units.has(ref)) err(where, `link to unknown unit ${ref}`); return; }
  if (RE.grammar.test(ref) || RE.culture.test(ref)) { if (!REG.units.has(unitOf(ref))) err(where, `link to ${ref}, whose unit is not in TM-CURRICULUM.md`); return; }
  if (RE.lesson.test(ref)) {
    if (!REG.units.has(unitOf(ref))) { err(where, `link to lesson ${ref}, whose unit is not in TM-CURRICULUM.md`); return; }
    if (!cx.examples) deferred.push(() => { if (!C.lessons.has(ref)) err(where, `link to missing lesson ${ref}`); });
    return;
  }
  err(where, `unknown link target “${ref}”`);
}

// ─────────────────────────── accepted answers (PROJECT.md 6.4, 7.3; TM-PROJECT.md 6.4, 7.3) ───────────────────────────
function expand(entry) {
  // returns { list } or { error }
  const parts = [];
  let i = 0, lit = "";
  while (i < entry.length) {
    const ch = entry[i];
    if (ch === "[" || ch === "(") {
      const close = ch === "[" ? "]" : ")";
      const j = entry.indexOf(close, i + 1);
      if (j < 0) return { error: `unclosed “${ch}”` };
      const inner = entry.slice(i + 1, j);
      if (/[[\]()]/.test(inner)) return { error: "nested brackets are not allowed" };
      const alts = inner.split("|");
      if (alts.some(a => !a.trim()) && ch === "[") return { error: "empty alternative in [ ]" };
      if (alts.some(a => !a.trim()) && ch === "(") return { error: "empty alternative in ( )" };
      if (ch === "[" && alts.length < 2) return { error: "[ ] needs at least two alternatives; use plain text" };
      parts.push([lit]); lit = "";
      parts.push(ch === "[" ? alts : ["", ...alts]);
      i = j + 1;
    } else if (ch === "]" || ch === ")" || ch === "|") {
      return { error: `stray “${ch}”` };
    } else { lit += ch; i++; }
  }
  parts.push([lit]);
  let out = [""];
  for (const p of parts) {
    const next = [];
    for (const o of out) for (const a of p) next.push(o + a);
    out = next;
    if (out.length > 200) return { error: "more than 200 expansions" };
  }
  return { list: out.map(s => s.replace(/\s+/g, " ").replace(/\s+([.,!?;:…])/g, "$1").trim()) };
}

const CONTRACTION_LIST = [
  ["i'm", "i am"], ["you're", "you are"], ["we're", "we are"], ["they're", "they are"], ["he's", "he is"], ["she's", "she is"],
  ["it's", "it is"], ["that's", "that is"], ["there's", "there is"], ["here's", "here is"], ["what's", "what is"], ["where's", "where is"],
  ["who's", "who is"], ["how's", "how is"], ["isn't", "is not"], ["aren't", "are not"], ["wasn't", "was not"], ["weren't", "were not"],
  ["don't", "do not"], ["doesn't", "does not"], ["didn't", "did not"], ["haven't", "have not"], ["hasn't", "has not"], ["hadn't", "had not"],
  ["won't", "will not"], ["wouldn't", "would not"], ["can't", "can not"], ["cannot", "can not"], ["couldn't", "could not"],
  ["shouldn't", "should not"], ["mustn't", "must not"], ["i'll", "i will"], ["you'll", "you will"], ["he'll", "he will"],
  ["she'll", "she will"], ["it'll", "it will"], ["we'll", "we will"], ["they'll", "they will"], ["i've", "i have"], ["you've", "you have"],
  ["we've", "we have"], ["they've", "they have"], ["i'd", "i would"], ["you'd", "you would"], ["he'd", "he would"], ["she'd", "she would"],
  ["we'd", "we would"], ["they'd", "they would"], ["it'd", "it would"], ["that'd", "that would"],
  ["there'd", "there would"], ["who'd", "who would"], ["could've", "could have"], ["should've", "should have"],
  ["would've", "would have"], ["might've", "might have"], ["must've", "must have"], ["who've", "who have"], ["let's", "let us"],
  // the same without the apostrophe, which phone keyboards leave out (inputs have autocorrect off); not its, lets, were, well, ill, id, hed, shed, wed
  ["im", "i am"], ["youre", "you are"], ["theyre", "they are"], ["hes", "he is"], ["shes", "she is"], ["thats", "that is"],
  ["theres", "there is"], ["heres", "here is"], ["whats", "what is"], ["wheres", "where is"], ["whos", "who is"], ["hows", "how is"],
  ["isnt", "is not"], ["arent", "are not"], ["wasnt", "was not"], ["werent", "were not"], ["dont", "do not"], ["doesnt", "does not"],
  ["didnt", "did not"], ["havent", "have not"], ["hasnt", "has not"], ["hadnt", "had not"], ["wont", "will not"], ["wouldnt", "would not"],
  ["cant", "can not"], ["couldnt", "could not"], ["shouldnt", "should not"], ["mustnt", "must not"], ["ive", "i have"], ["youve", "you have"],
  ["weve", "we have"], ["theyve", "they have"], ["youll", "you will"], ["theyll", "they will"], ["itll", "it will"], ["youd", "you would"],
  ["theyd", "they would"], ["couldve", "could have"], ["shouldve", "should have"], ["wouldve", "would have"],
  ["mightve", "might have"], ["mustve", "must have"],
];
// a learner's 'd is tried as "would" and as "had" (6.4, ported from the Turkish course's QA-2 in QA-TK-2):
// the same list with "had" for the 'd forms
const compileContractions = had => CONTRACTION_LIST.map(([a, b]) =>
  [new RegExp(`(^|\\s)${a}(?=\\s|$)`, "g"), `$1${had && /d$/.test(a) && /would$/.test(b) ? b.replace(/would$/, "had") : b}`]);
const CONTRACTIONS = compileContractions(false), CONTRACTIONS_HAD = compileContractions(true);
// 's before "been" is "has" (it's been, it has been), also typed without the apostrophe
const HAS_BEEN = /(^|\s)(it|that|there|here|what|who|where|how|he|she)'?s been(?=\s|$)/g;

// stage-1 normalization of TM-PROJECT.md 6.4 (apostrophes kept), and in French that of TM-FR.md 7.2: plain lowercasing, since Turkmen has
// no dotted and dotless i pair; U+0307 is still removed, the residue of an İ typed on a Turkish keyboard.
// had: read every 'd as "had" instead of "would" (the second reading the checker tries for an English answer).
function norm(s, lang, had) {
  s = s.normalize("NFC").replace(/[’‘ʼ´`]/g, "'").replace(/[“”„"«»]/g, " ");
  s = s.toLowerCase();
  if (lang === "fr") s = frQuestion(s);
  s = s.replace(/̇/g, "").replace(/[.,!?;:()…¿¡]/g, " ").replace(/[-–—/]/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  if (lang === "en") {
    s = s.replace(HAS_BEEN, "$1$2 has been");
    for (const [re, r] of had ? CONTRACTIONS_HAD : CONTRACTIONS) s = s.replace(re, r);
    s = fold(s).replace(/\s+/g, " ").trim();
  }
  if (lang === "fr") s = frWords(s);
  return s;
}
// a normalized answer with the question particle typed apart joined to its word (talyp my → talypmy, talyp mydyň)
const joinParticle = s => s.replace(/(\S) (m[yi](?:d[yi]\S*)?)(?= |$)/g, "$1$2");
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const TYPO_MIN = 5;   // C.TYPO_MIN of turkmen.js: a typo is forgiven in a word of five letters or more
// ── French answers (TM-FR.md 7.2) ──
// Question forms, read before hyphens become spaces: a leading est-ce que is dropped, and a subject inverted with a
// hyphen is put back (es-tu → tu es, a-t-il → il a, allez-vous → vous allez), so the three ways of asking are one answer.
var FR_SUBJECTS = "je|tu|il|elle|on|nous|vous|ils|elles";
var FR_INVERTED = new RegExp("(^|[\\s(¿¡])([a-zà-öø-ÿœæ']+)-(?:t-)?(" + FR_SUBJECTS + ")(?=$|[\\s.,;:!?…)])", "g");
function frQuestion(s) {
  s = s.replace(/^[\s(¿¡]*est[- ]ce qu(?:e(?=\s)|')\s*/, "");
  return s.replace(FR_INVERTED, "$1$3 $2");
}
// Ligatures, î and û (the 1990 spellings: connaitre, aout), the Turkmen letters French doesn't write (Aýna = Ayna; ç
// stays), elision undone, typed with or without the apostrophe (l'école, l école → le école; s'il → si il), and the
// articles inside au and aux (au marché → à le marché).
var FR_ELIDED = { l: "le", d: "de", j: "je", m: "me", n: "ne", s: "se", t: "te", c: "ce", qu: "que", jusqu: "jusque", lorsqu: "lorsque", puisqu: "puisque" };
function frWords(s) {
  s = s.replace(/œ/g, "oe").replace(/æ/g, "ae").replace(/î/g, "i").replace(/û/g, "u");
  s = s.replace(/ä/g, "a").replace(/ž/g, "z").replace(/ň/g, "n").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u").replace(/ý/g, "y");
  s = s.replace(/(^|\s)(jusqu|lorsqu|puisqu|qu|[ldjmnstc])'\s*/g, function (m, a, w) { return a + FR_ELIDED[w] + " "; });
  s = s.replace(/(^|\s)(qu|[ldjmnstc])(?=\s|$)/g, function (m, a, w) { return a + FR_ELIDED[w]; });
  s = s.replace(/(^|\s)se (ils?)(?=\s|$)/g, "$1si $2");
  s = s.replace(/(^|\s)au(?=\s|$)/g, "$1à le").replace(/(^|\s)aux(?=\s|$)/g, "$1à les");
  return s.replace(/\s+/g, " ").trim();
}
// The "almost" folds (step 5): accents and the cedilla; then also the ne of a negation (je sais pas).
function frAccents(s) { return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").normalize("NFC"); }
function frNoNe(s) { return frAccents(s).replace(/(^|\s)ne(?=\s|$)/g, "$1").replace(/\s+/g, " ").trim(); }
// Articles (step 4b): le, la, les, un, une, des, du, de la, de l' (and the le, les of au, aux); le and la count as one
// article, un and une as one. le, la, les are pronouns, not articles, after a subject pronoun, ne or another object
// pronoun, before y, en, moi, toi, lui, leur, and as the last word (je le vois, je ne la vois pas, prends-le).
var FR_ARTICLE = { le: "le", la: "le", les: "les", un: "un", une: "un", des: "des", du: "du" };
var FR_BEFORE_PRONOUN = { je: 1, tu: 1, il: 1, elle: 1, on: 1, nous: 1, vous: 1, ils: 1, elles: 1, ne: 1, me: 1, te: 1, se: 1, le: 1, la: 1, les: 1, lui: 1, leur: 1 };
var FR_AFTER_PRONOUN = { y: 1, en: 1, moi: 1, toi: 1, lui: 1, leur: 1 };
function frArticleAt(w, i) {
  var x = w[i];
  if (!has(FR_ARTICLE, x)) return null;
  if (x === "le" || x === "la" || x === "les") {
    if (i === w.length - 1 || (i > 0 && has(FR_BEFORE_PRONOUN, w[i - 1])) || has(FR_AFTER_PRONOUN, w[i + 1] || "")) return null;
  }
  return FR_ARTICLE[x];
}
// A normalized answer as its words, each with the articles in front of it ("de le" for de la and de l').
function frParse(s) {
  var w = s ? s.split(" ") : [], art = [], words = [], groups = [], cur = [], i;
  for (i = 0; i < w.length; i++) art[i] = frArticleAt(w, i);
  for (i = 0; i < w.length - 1; i++) if (w[i] === "de" && art[i + 1] === "le") art[i] = "de";
  for (i = 0; i < w.length; i++) {
    if (art[i]) { cur.push(art[i]); continue; }
    words.push(w[i]); groups.push(cur.join(" ")); cur = [];
  }
  if (cur.length) { words.push(""); groups.push(cur.join(" ")); }
  return { words: words, groups: groups };
}
// Two normalized answers the same give or take articles left out or added in front of a word, never one article changed
// for another (J'achète un pain is not J'achète le pain); with typo, also one typo in one word of five letters or more.
function frSame(a, b, typo) {
  if (a === b) return true;
  var p = frParse(a), q = frParse(b), typos = 0;
  if (p.words.length !== q.words.length) return false;
  for (var i = 0; i < p.words.length; i++) {
    var x = p.words[i], y = q.words[i];
    if (x !== y) {
      if (!typo || typos || y.replace(/'/g, "").length < TYPO_MIN || distance(x, y) !== 1) return false;
      typos += 1;
    }
    if (p.groups[i] && q.groups[i] && p.groups[i] !== q.groups[i]) return false;
  }
  return true;
}
// Edit distance with a swap of two neighbouring letters counted as one edit (optimal string alignment).
function distance(a, b) {
  if (Math.abs(a.length - b.length) > 1) return 2;
  var d = [], i, j;
  for (i = 0; i <= a.length; i++) { d[i] = [i]; }
  for (j = 0; j <= b.length; j++) d[0][j] = j;
  for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++) {
    var cost = a[i - 1] === b[j - 1] ? 0 : 1;
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[a.length][b.length];
}
// (end of the normalization that assets/js/turkmen.js repeats; scripts/turkmen/test.mjs compares the two)

// mode: the exercise's diacritics mode (PROJECT.md 6.4). The folds only happen in lenient mode, so in strict mode a
// reject that differs from an accepted answer only by y/ý, a/ä… is meaningful.
function checkAccept(list, lang, where, rejects, mode = "lenient") {
  const all = new Map(); // normalized → entry index
  list.forEach((entry, k) => {
    const w = `${where}.accept[${k}]`;
    if (k === 0 && /[[\]()|]/.test(entry)) err(w, "accept[0] is the canonical answer shown to learners: plain text, no [ ] ( ) |");
    const ex = expand(entry);
    if (ex.error) { err(w, `“${entry}”: ${ex.error}`); return; }
    if (lang === "en" && /(?:^|[\s\[(|])(?:i|you|he|she|it|we|they|that|there|who)['’]d(?=[\s\])|.,!?]|$)/i.test(entry))
      warn(w, `“${entry}”: write 'd out as “had” or “would” (TM-PROJECT.md 7.3); the checker tries both for a learner's 'd`);
    for (const s of ex.list) {
      if (!s) { err(w, "an expansion is empty"); continue; }
      checkText(s, lang, w, { sentence: k === 0 });
      rawMarkup(s, w);
      const n = norm(s, lang);
      if (all.has(n) && all.get(n) !== k) warn(w, `“${s}” is already accepted by accept[${all.get(n)}]`);
      else if (all.has(n)) warn(w, `“${s}” appears twice in its own expansions`);
      else all.set(n, k);
    }
  });
  const folds = lang === "tk" && mode === "lenient";
  const relax = n => (folds ? fold(n.replace(/'/g, "")) : n.replace(/'/g, ""));
  const looseSet = new Set([...all.keys()].map(relax));
  (rejects || []).forEach((r, k) => {
    const w = `${where}.reject[${k}]`;
    const n = norm(r.answer, lang);
    if (all.has(n)) err(w, `rejected answer “${r.answer}” is also accepted (accept[${all.get(n)}])`);
    else if (looseSet.has(relax(n))) warn(w, `rejected answer “${r.answer}” differs from an accepted one only by apostrophes${folds ? " or the marks of Turkmen letters" : ""}`);
  });
  return all;
}

// TM-PROJECT.md 7.3: the future -jAk and the necessity -mAlY carry no personal ending, so the subject must be said.
// A rough check of a canonical Turkmen answer: a clause that ends in such a form (or in it + däl) needs a personal
// pronoun, a name of the cast of 7.5 or a capitalized word after its first one. Nouns as subjects (kakam) aren't seen.
const PRONOUNS = new Set(["men", "sen", "ol", "biz", "siz", "olar", "menem", "senem", "olam", "bizem", "sizem", "olaram"]);
const CAST = new Set(["aýna", "merjen", "jeren", "maral", "aýgül", "bahar", "mähri", "selbi", "gülşat", "myrat", "batyr", "merdan",
  "döwran", "arslan", "kerim", "begenç", "atajan", "kakajan", "rahman", "dowlet"]);
function subjectSaid(s, where) {
  for (const clause of s.split(/[,;:.!?…“”"]+/)) {
    const ws = clause.split(/[^\p{L}-]+/u).filter(Boolean);
    let k = ws.length - 1;
    if (k > 0 && /^däl(?:mi)?$/i.test(ws[k])) k--;
    if (k < 0 || !/(?:jak|jek|maly|meli)(?:my|mi)?$/i.test(ws[k])) continue;
    const said = ws.slice(0, k).some((x, i) => PRONOUNS.has(x.toLowerCase()) || CAST.has(x.toLowerCase()) || (i > 0 && /^\p{Lu}/u.test(x)));
    if (!said) warn(where, `“${clause.trim()}”: -jAk and -mAlY carry no personal ending, so the subject must be said (TM-PROJECT.md 7.3)`);
  }
}

// ─────────────────────────── morphology engine (TM-PROJECT.md 3, 8) ───────────────────────────
// conjugate: every cell's paradigm form must be accepted, and everything accepted must be a form the engine
// builds (its variants; for olar also the ol form, since a plural subject can take a singular verb; words in
// front of the form are allowed, as in "Men talyp"). morph: the tiles must be the base plus suffixes cut at
// morpheme boundaries. Flashcards: forms.prs, past, aor, cvb, fut, acc, poss3 and pl must be what the engine
// builds. Slugs and tiles the engine doesn't know are listed as not checked, not warned about. A base with two
// readings (at "name" and "horse") is checked with the reading that fits the cells or the card's sense.
const MORPH = createRequire(import.meta.url)(path.join(ROOT, "assets/js/turkmen-morph.js"));
const MSTAT = { conj: 0, conjChecked: 0, cells: 0, morph: 0, morphChecked: 0, cards: 0, cardForms: 0, notModelled: [] };
function engineConjugate(e, w) {
  MSTAT.conj++;
  const info = MORPH.formInfo(e.form);
  if (!info) { MSTAT.notModelled.push(`${e.id} (form “${e.form}”)`); return; }
  // try each reading of the base; keep the one with the fewest disagreements
  let best = null;
  for (const r of MORPH.readings(e.base)) {
    const out = [], cells = [];
    let checked = 0;
    e.cells.forEach((c, i) => {
      const cw = `${w}.cells[${i}]`;
      if (!info.persons.includes(c.p)) { out.push([cw, `“${e.form}” has no ${c.p} form in the morphology engine`]); return; }
      const f = MORPH.form(e.form, e.base, c.p, { sense: r.sense });
      if (!f) { cells.push(`${e.id} (${c.p} of “${e.base}”)`); return; }
      checked++;
      const ok = new Set(f.variants.map(v => norm(v, "tk")));
      if (c.p === "olar") { const o = MORPH.form(e.form, e.base, "ol", { sense: r.sense }); if (o) for (const v of o.variants) ok.add(norm(v, "tk")); }
      const fits = x => ok.has(x) || [...ok].some(v => x.endsWith(" " + v));
      const accepted = new Set();
      for (const a of c.accept) for (const x of expand(a).list || []) accepted.add(norm(x, "tk"));
      if (!accepted.has(norm(f.text, "tk"))) out.push([cw, `the morphology engine gives “${f.text}”, which this cell doesn't accept`]);
      for (const x of accepted) if (!fits(x)) out.push([cw, `“${x}” is accepted, but the morphology engine gives ${f.variants.map(v => `“${v}”`).join(" or ")}`]);
    });
    if (!best || out.length < best.out.length) best = { out, cells, checked };
  }
  for (const [cw, msg] of best.out) warn(cw, msg);
  MSTAT.notModelled.push(...best.cells);
  if (best.checked) MSTAT.conjChecked++;
  MSTAT.cells += best.checked;
}
function engineMorph(e, w) {
  MSTAT.morph++;
  const r = MORPH.analyze(e.base, e.parts);
  if (r.reason === "unknown") { MSTAT.notModelled.push(`${e.id} (morph ${e.parts.join("+")})`); return; }
  MSTAT.morphChecked++;
  if (r.reason === "boundaries") warn(`${w}.parts`, `the tiles cut a morpheme: the morphology engine splits “${e.result}” as ${r.seg}`);
  else if (!r.ok) warn(`${w}.parts`, `the morphology engine builds “${r.text}” (${r.seg}) from “${e.base}” with these suffixes, not “${e.result}”`);
}
// the third-person forms a card gives (TM-PROJECT.md 5.8), as the engine builds them
function engineCard(c, w) {
  if (!c.forms) return;
  MSTAT.cards++;
  const o = { sense: c.sense || null };
  const third = slug => { const r = MORPH.form(slug, c.tk, "ol", o); return r && r.variants; };
  const want = c.pos === "verb"
    ? { prs: () => third("present"), past: () => third("past"), aor: () => third("aorist"), fut: () => third("future"), cvb: () => [MORPH.converb(c.tk).text] }
    : { acc: () => [MORPH.decline(c.tk, { ...o, case: "acc" }).text], poss3: () => third("possessive"), pl: () => [MORPH.decline(c.tk, { ...o, pl: true }).text] };
  for (const [k, v] of Object.entries(c.forms)) {
    if (!want[k]) continue;
    let got;
    try { got = want[k](); } catch { got = null; }
    if (!got) { MSTAT.notModelled.push(`${c.id} (forms.${k})`); continue; }
    MSTAT.cardForms++;
    if (!got.map(x => norm(x, "tk")).includes(norm(v, "tk"))) warn(`${w}.forms.${k}`, `“${v}”, but the morphology engine gives ${got.map(x => `“${x}”`).join(" or ")}`);
  }
}

// ─────────────────────────── schema combinators ───────────────────────────
// A spec is a function (value, path, cx) that reports errors through cx.err. cx.file is the file label.
const at = (cx, p) => (p ? `${cx.file} › ${p}` : cx.file);
const kindOf = v => (v === null ? "null" : Array.isArray(v) ? "array" : typeof v);
const S = {
  str: (o = {}) => (v, p, cx) => {
    if (typeof v !== "string") return cx.err(p, `expected a string, got ${kindOf(v)}`);
    if (!o.empty && !v.length) return cx.err(p, "empty string");
    if (o.enum && !o.enum.includes(v)) return cx.err(p, `“${v}” is not one of: ${o.enum.join(", ")}`);
    if (o.re && !o.re.test(v)) return cx.err(p, `“${v}” does not match ${o.re}`);
    if (o.text && v.length) cx.text.push([o.text, v, p]);
  },
  int: (o = {}) => (v, p, cx) => {
    if (!Number.isInteger(v)) return cx.err(p, `expected an integer, got ${JSON.stringify(v)}`);
    if (o.min !== undefined && v < o.min) cx.err(p, `${v} is below ${o.min}`);
    if (o.max !== undefined && v > o.max) cx.err(p, `${v} is above ${o.max}`);
  },
  num: (o = {}) => (v, p, cx) => {
    if (typeof v !== "number" || !Number.isFinite(v)) return cx.err(p, `expected a number, got ${JSON.stringify(v)}`);
    if (o.min !== undefined && v < o.min) cx.err(p, `${v} is below ${o.min}`);
    if (o.max !== undefined && v > o.max) cx.err(p, `${v} is above ${o.max}`);
  },
  bool: () => (v, p, cx) => { if (typeof v !== "boolean") cx.err(p, `expected true or false, got ${JSON.stringify(v)}`); },
  lit: val => (v, p, cx) => { if (v !== val) cx.err(p, `must be ${JSON.stringify(val)}`); },
  oneOfLit: vals => (v, p, cx) => { if (!vals.includes(v)) cx.err(p, `must be one of ${vals.map(x => JSON.stringify(x)).join(", ")}`); },
  arr: (item, o = {}) => (v, p, cx) => {
    if (!Array.isArray(v)) return cx.err(p, `expected an array, got ${kindOf(v)}`);
    if (o.min !== undefined && v.length < o.min) cx.err(p, `needs at least ${o.min} item(s), has ${v.length}`);
    if (o.max !== undefined && v.length > o.max) cx.err(p, `allows at most ${o.max} item(s), has ${v.length}`);
    v.forEach((x, i) => item(x, `${p}[${i}]`, cx));
    if (o.unique) { const s = new Set(); v.forEach((x, i) => { const k = JSON.stringify(x); if (s.has(k)) cx.err(`${p}[${i}]`, "duplicate item"); s.add(k); }); }
  },
  tuple: items => (v, p, cx) => {
    if (!Array.isArray(v) || v.length !== items.length) return cx.err(p, `expected an array of ${items.length} items`);
    items.forEach((spec, i) => spec(v[i], `${p}[${i}]`, cx));
  },
  obj: shape => (v, p, cx) => {
    if (kindOf(v) !== "object") return cx.err(p, `expected an object, got ${kindOf(v)}`);
    const keys = new Map(Object.entries(shape).map(([k, spec]) => [k.replace(/\?$/, ""), { spec, optional: k.endsWith("?") }]));
    for (const k of Object.keys(v)) if (!keys.has(k)) cx.err(p ? `${p}.${k}` : k, "unknown field");
    for (const [k, { spec, optional }] of keys) {
      if (!(k in v)) { if (!optional) cx.err(p, `missing field “${k}”`); continue; }
      spec(v[k], p ? `${p}.${k}` : k, cx);
    }
  },
  map: (keyRe, val) => (v, p, cx) => {
    if (kindOf(v) !== "object") return cx.err(p, `expected an object, got ${kindOf(v)}`);
    for (const [k, x] of Object.entries(v)) {
      if (!keyRe.test(k)) cx.err(`${p}.${k}`, `key does not match ${keyRe}`);
      val(x, `${p}.${k}`, cx);
    }
  },
  union: (field, shapes) => (v, p, cx) => {
    if (kindOf(v) !== "object") return cx.err(p, `expected an object, got ${kindOf(v)}`);
    const t = v[field];
    if (!(t in shapes)) return cx.err(p, `${field} “${t}” is not one of: ${Object.keys(shapes).join(", ")}`);
    shapes[t](v, p, cx);
  },
  when: (test, a, b) => (v, p, cx) => (test(v) ? a : b)(v, p, cx),
};
const T = {
  tk: S.str({ text: "tk" }), en: S.str({ text: "en" }), rich: S.str({ text: "rich" }), tkRich: S.str({ text: "tkRich" }),
  seg: S.str({ text: "seg" }), plain: S.str({ text: "plain" }), cell: S.str({ empty: true, text: "cell" }),
  // an option follows its exercise's optionsLang (checkOption); an accept entry is checked on its expansions (checkAccept)
  fr: S.str({ text: "fr" }),
  option: S.str({ text: "option" }), accept: S.str({ text: "accept" }),
  mono: S.str({ text: "mono" }), // rule lines: aligned with spaces
  // a flashcard file's credit line: it names the Turkish list the deck's order comes from (TM-PROJECT.md 7.8, CC BY-SA)
  credit: S.str({ text: "credit" }),
};
const dia = S.oneOfLit(["strict", "lenient"]);
const person = S.oneOfLit(PERSONS);
const gpId = S.str({ re: RE.gp });
const reject = S.obj({ answer: T.plain, why: T.rich });
const isoTime = S.str({ re: RE.iso });

// The content schemas for the learner-language key L: "en" in the English tree, "fr" in the French tree, where
// every en key is fr and every "en" value (from, optionsLang, table cols, culture format) is "fr" (TM-FR.md 5.2).
function schemaSet(L) {
  const TL = T[L];
  const lang = S.oneOfLit(["tk", L]);
  const gloss = S.obj({ tk: T.tk, [L]: TL });

  const BLOCK = S.union("type", {
    p: S.obj({ type: S.lit("p"), text: T.rich }),
    list: S.obj({ type: S.lit("list"), items: S.arr(T.rich, { min: 1 }), "ordered?": S.bool() }),
    rule: S.obj({ type: S.lit("rule"), "label?": TL, lines: S.arr(T.mono, { min: 1 }) }),
    table: S.obj({ type: S.lit("table"), "caption?": T.rich, head: S.arr(T.rich, { min: 1 }), cols: S.arr(S.oneOfLit(["tk", "seg", L, "rich"]), { min: 1 }), rows: S.arr(S.arr(T.cell, { min: 1 }), { min: 1 }) }),
    examples: S.obj({ type: S.lit("examples"), items: S.arr(S.obj({ tk: T.tk, "seg?": S.str(), "gloss?": T.plain, [L]: TL, "note?": T.rich }), { min: 1 }) }),
    paradigm: S.obj({ type: S.lit("paradigm"), "title?": T.rich, rows: S.arr(S.obj({ p: person, tk: T.seg, [L + "?"]: TL }), { min: 2, max: 6 }) }),
    dialogue: S.obj({ type: S.lit("dialogue"), lines: S.arr(S.obj({ who: T.tk, tk: T.tk, [L]: TL }), { min: 2 }) }),
    callout: S.obj({ type: S.lit("callout"), kind: S.oneOfLit(["tip", "pitfall", "compare", "culture", "history"]), "title?": TL, text: T.rich }),
    parallel: S.obj({ type: S.lit("parallel"), tk: T.tkRich, [L]: TL }),
    passage: S.obj({ type: S.lit("passage"), tk: T.tkRich, "glossary?": S.arr(gloss, { min: 1 }) }),
    quote: S.obj({ type: S.lit("quote"), tk: T.tk, [L]: TL, source: TL, pd: S.lit(true) }),
    image: S.obj({ type: S.lit("image"), src: S.str({ re: /^\/assets\/img\/\S+\.(?:webp|png|jpe?g|svg)$/ }), alt: TL, "caption?": T.rich, "credit?": TL }),
    see: S.obj({ type: S.lit("see"), refs: S.arr(S.str(), { min: 1 }), "text?": T.rich }),
  });

  const EX_BASE = { id: S.str({ re: RE.exercise }), type: S.oneOfLit(TYPES), "points?": S.arr(gpId, { min: 1, unique: true }), "hint?": T.rich, "explain?": T.rich };
  const mcqQ = S.obj({ q: T.rich, options: S.arr(T.option, { min: 2, max: 6 }), optionsLang: lang, answer: S.int({ min: 0 }), "explain?": T.rich });
  const EXERCISE = S.union("type", {
    mcq: S.obj({ ...EX_BASE, question: T.rich, "context?": S.arr(S.obj({ "who?": T.tk, tk: T.tk, [L + "?"]: TL }), { min: 1 }), options: S.arr(T.option, { min: 2, max: 6 }), optionsLang: lang, answer: S.int({ min: 0 }), "why?": S.map(/^\d+$/, T.rich) }),
    cloze: S.obj({ ...EX_BASE, text: T.plain, [L]: TL, blanks: S.arr(S.when(b => b && typeof b === "object" && "options" in b, S.obj({ options: S.arr(T.plain, { min: 2, max: 6 }), answer: S.int({ min: 0 }) }), S.obj({ accept: S.arr(T.accept, { min: 1 }), "reject?": S.arr(reject, { min: 1 }) })), { min: 1, max: 4 }), "diacritics?": dia }),
    translate: S.obj({ ...EX_BASE, from: lang, prompt: T.plain, accept: S.arr(T.accept, { min: 1 }), "reject?": S.arr(reject, { min: 1 }), "diacritics?": dia }),
    wordbank: S.obj({ ...EX_BASE, from: lang, prompt: T.plain, text: T.plain, answer: S.arr(T.plain, { min: 1 }), distractors: S.arr(T.plain, { max: 6 }), "accept?": S.arr(T.accept, { min: 1 }) }),
    match: S.obj({ ...EX_BASE, pairs: S.arr(S.tuple([T.tk, TL]), { min: 4, max: 6 }) }),
    listen: (v, p, cx) => cx.err(p, "listen exercises are not allowed: the Turkmen course has no audio (TM-PROJECT.md 2)"),
    conjugate: S.obj({ ...EX_BASE, base: T.tk, form: S.str({ re: RE.slug }), label: T.rich, cells: S.arr(S.obj({ p: person, accept: S.arr(T.accept, { min: 1 }) }), { min: 2, max: 6 }), "diacritics?": dia }),
    morph: S.obj({ ...EX_BASE, base: T.tk, gloss: TL, parts: S.arr(T.plain, { min: 2 }), distractors: S.arr(T.plain, { min: 2, max: 6 }), result: T.tk }),
    reading: S.obj({ ...EX_BASE, "title?": T.tk, passage: T.tkRich, "glossary?": S.arr(gloss, { min: 1 }), "translation?": TL, questions: S.arr(mcqQ, { min: 1, max: 5 }) }),
    open: S.obj({ ...EX_BASE, task: T.rich, "source?": T.plain, "sourceLang?": lang, models: S.arr(T.plain, { min: 1, max: 3 }), modelsLang: lang, checklist: S.arr(T.rich, { min: 2, max: 6 }) }),
  });

  return {
    level: S.obj({ id: S.str({ re: RE.level }), cefr: S.oneOfLit(Object.values(CEFR)), title: TL, summary: T.rich, canDo: S.arr(TL, { min: 3, max: 6 }), units: S.arr(S.str({ re: RE.unit }), { min: 1, unique: true }) }),
    unit: S.obj({ id: S.str({ re: RE.unit }), level: S.oneOfLit(LEVELS), order: S.int({ min: 1 }), title: TL, titleTk: T.tk, summary: T.rich, canDo: S.arr(TL, { min: 2, max: 5 }), grammarPoints: S.arr(gpId, { min: 1, unique: true }), vocabThemes: S.arr(TL, { min: 1, max: 6 }), lessons: S.arr(S.str({ re: RE.lesson }), { min: 3, max: 6, unique: true }), grammar: S.str({ re: RE.grammar }), culture: S.str({ re: RE.culture }) }),
    lesson: S.obj({ id: S.str({ re: RE.lesson }), unit: S.str({ re: RE.unit }), order: S.int({ min: 1 }), title: TL, goal: TL, points: S.arr(gpId, { min: 1, unique: true }), "intro?": S.obj({ text: T.rich, "see?": gpId }), vocab: S.arr(S.obj({ tk: T.tk, [L]: TL, "pos?": S.oneOfLit(POS), "card?": S.str({ re: RE.card }) }), { max: 12 }), exercises: S.arr(EXERCISE, { min: 1 }) }),
    exercise: EXERCISE,
    block: BLOCK,
    grammar: S.obj({ id: S.str({ re: RE.grammar }), unit: S.str({ re: RE.unit }), title: TL, "seoTitle?": S.str({ text: L, re: L === "en" ? /^(?=.*\bTurkmen\b).{10,48}$/u : /^(?=.*turkmène).{10,48}$/iu }), intro: T.rich, sections: S.arr(S.obj({ point: gpId, title: TL, blocks: S.arr(BLOCK, { min: 1 }) }), { min: 1 }), summary: S.arr(T.rich, { min: 3, max: 8 }) }),
    culture: S.obj({ id: S.str({ re: RE.culture }), unit: S.str({ re: RE.unit }), title: TL, kicker: TL, format: S.oneOfLit([L, "parallel"]), minutes: S.int({ min: 2, max: 10 }), blocks: S.arr(BLOCK, { min: 1 }), vocab: S.arr(gloss, { min: 4, max: 15 }), "questions?": S.arr(mcqQ, { max: 3 }), sources: S.arr(S.obj({ title: TL, "publisher?": TL, "url?": S.str({ re: /^https?:\/\/\S+$/ }), "note?": TL }), { min: 1 }) }),
    flashcards: S.obj({
      deck: S.lit("core-1000"), range: S.tuple([S.int({ min: 1, max: 1000 }), S.int({ min: 1, max: 1000 })]), source: T.credit,
      cards: S.arr(S.obj({
        id: S.str({ re: RE.card }), rank: S.int({ min: 1, max: 1000 }), tk: T.tk, pos: S.oneOfLit(POS), "sense?": S.int({ min: 1, max: 9 }),
        [L]: S.arr(TL, { min: 1, max: 4 }), ex: S.obj({ tk: T.tk, [L]: TL }),
        "forms?": S.obj({ "acc?": T.tk, "poss3?": T.tk, "pl?": T.tk, "prs?": T.tk, "past?": T.tk, "fut?": T.tk, "aor?": T.tk, "cvb?": T.tk }),
        "note?": T.rich, "tags?": S.arr(S.str({ re: RE.slug }), { min: 1, unique: true }), "level?": S.oneOfLit(LEVELS), "unit?": S.str({ re: RE.unit }),
      }), { min: 1 }),
    }),
  };
}
const SCHEMA = schemaSet("en"), SCHEMA_FR = schemaSet("fr");
const COURSE_PROGRESS = S.obj({
  schema: S.lit(1), updated: isoTime,
  lessons: S.map(RE.lesson, S.obj({ first: S.str({ re: RE.day }), last: isoTime, runs: S.int({ min: 1 }), best: S.num({ min: 0, max: 1 }), xp: S.int({ min: 0 }), "via?": S.lit("test") })),
  units: S.map(RE.unit, S.obj({ "reviewed?": isoTime, "reviewBest?": S.num({ min: 0, max: 1 }), "tested?": isoTime, "guide?": isoTime, "culture?": isoTime })),
  mistakes: S.map(RE.exercise, S.obj({ n: S.int({ min: 0 }), ok: S.int({ min: 0 }), last: isoTime })),
  xp: S.obj({ total: S.int({ min: 0 }), days: S.map(RE.day, S.int({ min: 0 })) }),
  streak: S.obj({ current: S.int({ min: 0 }), best: S.int({ min: 0 }), last: (v, p, cx) => (v === null ? undefined : S.str({ re: RE.day })(v, p, cx)) }),
});
const CARD_STATE = S.obj({ s: S.oneOfLit(["learning", "review", "relearning", "suspended"]), due: S.int({ min: 0 }), ivl: S.num({ min: 0, max: 36500 }), ease: S.num({ min: 1.3, max: 10 }), step: S.int({ min: 0 }), reps: S.int({ min: 0 }), lapses: S.int({ min: 0 }), last: S.int({ min: 0 }), "leech?": S.lit(true), "was?": S.oneOfLit(["learning", "review", "relearning"]) });
const CARDS_PROGRESS = S.obj({ schema: S.lit(1), updated: isoTime, cards: S.map(/^fc-\d{4}:(?:tk-en|en-tk|tk-fr|fr-tk)$/, CARD_STATE), days: S.map(RE.day, S.obj({ new: S.int({ min: 0 }), reviews: S.int({ min: 0 }), again: S.int({ min: 0 }), "lapses?": S.int({ min: 0 }), "mature?": S.int({ min: 0 }), "matureLapses?": S.int({ min: 0 }) })) });
// TM-PROJECT.md 5.9: the Turkish settings without speech; directions holds both editions' (TM-FR.md 8.3)
const SETTINGS = S.obj({ schema: S.lit(1), dailyGoal: S.oneOfLit([10, 20, 30, 50]), newPerDay: S.int({ min: 0, max: 100 }), reviewsPerDay: S.int({ min: 10, max: 9999 }), directions: S.arr(S.oneOfLit(["tk-en", "en-tk", "tk-fr", "fr-tk"]), { min: 1, max: 4, unique: true }), dayStartHour: S.int({ min: 0, max: 23 }), keyboardBar: S.bool(), unlockAll: S.bool(), onlyTaughtWords: S.bool() });
SCHEMA.progress = S.obj({ app: S.lit("daily-turkmen"), schema: S.lit(1), exported: isoTime, course: COURSE_PROGRESS, cards: CARDS_PROGRESS, settings: SETTINGS });

// Runs a schema, then the text checks it collected. Returns true when the structure is valid.
function validate(kind, value, file, cx0 = {}) {
  let ok = true;
  const cx = { file, examples: !!cx0.examples, lang: cx0.lang || "en", text: [], err: (p, m) => { ok = false; err(at(cx, p), m); } };
  (cx0.schema || SCHEMA)[kind](value, "", cx);
  for (const [k, s, p] of cx.text) {
    const w = at(cx, p);
    if (k === "plain") { hygiene(s, w); rawMarkup(s, w); }
    else if (k === "cell" || k === "option" || k === "accept") hygiene(s, w);
    else if (k === "mono") hygiene(s, w, { spaces: true });
    else if (k === "tk") { hygiene(s, w); checkTk(s, w); rawMarkup(s, w); }
    else if (k === "en") { hygiene(s, w); checkEnText(s, w); rawMarkup(s, w); }
    else if (k === "fr") { hygiene(s, w); checkFrText(s, w); rawMarkup(s, w); }
    else if (k === "credit") { hygiene(s, w); sentenceCase(s, w); bareId(s, w); }
    else if (k === "rich") { hygiene(s, w); checkRich(s, w, cx); }
    else if (k === "tkRich") { hygiene(s, w, { multiline: true }); checkTkRich(s, w, cx); }
    else if (k === "seg") { hygiene(s, w); checkSeg(s, w); }
  }
  return ok;
}

// ─────────────────────────── registry: turkmen/TM-CURRICULUM.md ───────────────────────────
const REG = { levels: new Map(), units: new Map(), points: new Map(), order: [], batches: new Map() };
function parseCurriculum() {
  const label = rel(CURRICULUM);
  if (!fs.existsSync(CURRICULUM)) { err(label, "missing"); return; }
  const lines = fs.readFileSync(CURRICULUM, "utf8").split("\n");
  let level = null, unit = null, inGrammar = false;
  const finishUnit = () => {
    if (!unit) return;
    const w = `${label}:${unit.line}`;
    if (!unit.points.length) err(w, `${unit.id} has no grammar points`);
    if (!unit.interlude) err(w, `${unit.id} has no “- Interlude: **Title** — …” line`);
    if (!unit.batch) err(w, `${unit.id} has no “- Batch: …” line`);
  };
  lines.forEach((line, i) => {
    const ln = i + 1, w = `${label}:${ln}`;
    let m;
    if (/^## /.test(line)) {
      finishUnit(); unit = null; inGrammar = false;
      m = line.match(/^## (A1|A2|B1|B2|C1|C2) · (.+)$/);
      if (m) {
        const id = m[1].toLowerCase();
        if (!LEVELS.includes(id)) { err(w, `level ${m[1]}: this validator knows ${LEVELS.map(x => CEFR[x]).join(", ")}; add it to LEVELS, CEFR and LV`); level = null; return; }
        if (REG.levels.has(id)) err(w, `level ${m[1]} is defined twice`);
        level = { id, cefr: m[1], title: m[2].trim(), units: [], line: ln };
        REG.levels.set(id, level);
      } else level = null;
      return;
    }
    if (/^#### /.test(line)) {
      finishUnit(); inGrammar = false;
      m = line.match(/^#### ((?:a1|a2|b1|b2|c1|c2)-u(\d{2})) · (.+?)(?: · (.+))?$/);
      if (!m) { err(w, "unit heading must read “#### a1-u01 · English title · Turkmen tagline”"); unit = null; return; }
      if (!level) { err(w, `${m[1]} is not under a level heading`); unit = null; return; }
      if (levelOf(m[1]) !== level.id) err(w, `${m[1]} sits under level ${level.cefr}`);
      if (REG.units.has(m[1])) err(w, `unit ${m[1]} is defined twice`);
      const order = Number(m[2]);
      if (order !== level.units.length + 1) err(w, `${m[1]} should be number ${pad2(level.units.length + 1)} in ${level.cefr}`);
      unit = { id: m[1], level: level.id, order, title: m[3].trim(), titleTk: (m[4] || "").trim(), points: [], labels: [], interlude: null, interludeLine: "", batch: null, line: ln };
      if (!unit.titleTk) err(w, `${m[1]} has no Turkmen tagline`);
      else checkTk(unit.titleTk, w);
      REG.units.set(unit.id, unit); REG.order.push(unit.id); level.units.push(unit.id);
      return;
    }
    if (!unit) return;
    if (/^- Grammar:\s*$/.test(line)) { inGrammar = true; return; }
    if (/^ {2}- /.test(line) && inGrammar) {
      m = line.match(/^ {2}- `(gp-[a-z0-9]+(?:-[a-z0-9]+)*)` — (.+)$/);
      if (!m) { err(w, "grammar point line must read “  - `gp-id` — description”"); return; }
      if (REG.points.has(m[1])) err(w, `grammar point ${m[1]} is already defined in ${REG.points.get(m[1]).unit}`);
      else REG.points.set(m[1], { id: m[1], unit: unit.id, description: m[2].trim(), index: REG.points.size });
      unit.points.push(m[1]);
      return;
    }
    if (/^- /.test(line)) inGrammar = false;
    if ((m = line.match(/^- Interlude: \*\*(.+?)\*\*(?: — (.+))?$/))) { unit.interlude = m[1].trim(); unit.interludeLine = (m[2] || "").trim(); return; }
    if ((m = line.match(/^- Batch: (\S+)$/))) { unit.batch = m[1]; return; }
    if (/^- Interlude:|^- Batch:/.test(line)) err(w, "malformed Interlude or Batch line");
  });
  finishUnit();
  // batch table rows
  lines.forEach((line, i) => {
    const w = `${label}:${i + 1}`;
    let m = line.match(/^\| ([ABC][12]-\d) \| ([^|]+) \|/);
    if (m) {
      const units = m[2].split(",").map(s => s.trim()).filter(Boolean);
      if (REG.batches.has(m[1])) err(w, `batch ${m[1]} is listed twice`);
      REG.batches.set(m[1], { id: m[1], units, line: i + 1 });
      for (const u of units) if (!REG.units.has(u)) err(w, `batch ${m[1]} lists unknown unit ${u}`);
      return;
    }
    m = line.match(/^\| (FC-\d) \| (\d+)[–-](\d+) \|/);
    if (m) REG.batches.set(m[1], { id: m[1], range: [Number(m[2]), Number(m[3])], line: i + 1 });
  });
  for (const u of REG.units.values()) {
    if (!u.batch) continue;
    const b = REG.batches.get(u.batch);
    if (!b) err(`${label}:${u.line}`, `${u.id} is in batch ${u.batch}, which is not in the batch table`);
    else if (!b.units || !b.units.includes(u.id)) err(`${label}:${b.line}`, `batch ${u.batch} does not list ${u.id}`);
  }
  for (const b of REG.batches.values()) if (b.units) for (const id of b.units) {
    const u = REG.units.get(id);
    if (u && u.batch !== b.id) err(`${label}:${b.line}`, `batch ${b.id} lists ${id}, whose Batch line says ${u.batch}`);
  }
  for (const id of LEVELS) if (!REG.levels.has(id)) err(label, `level ${CEFR[id]} is missing`);
}
const unitIndex = id => REG.order.indexOf(id);

// ─────────────────────────── content ───────────────────────────
const C = { levels: new Map(), units: new Map(), lessons: new Map(), grammar: new Map(), culture: new Map(), cardFiles: new Map(), cards: new Map(), files: [] };
const deferred = [];
const DIRS = { levels: "level", units: "unit", lessons: "lesson", grammar: "grammar", culture: "culture", flashcards: "flashcards" };

function loadContent() {
  if (!fs.existsSync(DATA)) return;
  for (const name of fs.readdirSync(DATA).sort()) {
    if (name.startsWith(".")) continue;
    const full = path.join(DATA, name);
    if (fs.statSync(full).isDirectory()) {
      if (name === "fr" || name === "i18n") continue;   // the French tree and the interface strings: --lang fr (TM-FR.md 4.4, 5.1)
      if (!(name in DIRS)) { err(rel(full), "unexpected folder"); continue; }
      for (const f of fs.readdirSync(full).sort()) {
        if (f.startsWith(".")) continue;
        const fp = path.join(full, f);
        if (!f.endsWith(".json") || fs.statSync(fp).isDirectory()) { err(rel(fp), "unexpected file"); continue; }
        loadFile(DIRS[name], fp);
      }
    } else if (name !== "index.json") err(rel(full), "unexpected file");
  }
}

function loadFile(kind, fp) {
  const label = rel(fp);
  const raw = fs.readFileSync(fp, "utf8");
  C.files.push([label, raw]);
  if (raw.charCodeAt(0) === 0xfeff) err(label, "starts with a byte-order mark");
  let v;
  try { v = JSON.parse(raw); } catch (e) { err(label, `invalid JSON: ${e.message}`); return; }
  const base = path.basename(fp, ".json");
  const ok = validate(kind, v, label);
  const id = v && v.id;
  const expect = { level: base, unit: base, lesson: base, grammar: `${base}-grammar`, culture: `${base}-culture` }[kind];
  if (kind !== "flashcards" && id !== expect) { err(label, `id “${id}” should be “${expect}” to match the file name`); return; }
  const rec = { v, file: label, ok };
  if (kind === "level") C.levels.set(id, rec);
  else if (kind === "unit") C.units.set(id, rec);
  else if (kind === "lesson") C.lessons.set(id, rec);
  else if (kind === "grammar") C.grammar.set(unitOf(id), rec);
  else if (kind === "culture") C.culture.set(unitOf(id), rec);
  else if (kind === "flashcards") {
    const m = base.match(/^tm-fc-(\d{4})-(\d{4})$/);
    if (!m) { err(label, "flashcard files are named tm-fc-NNNN-NNNN.json after their rank range"); return; }
    rec.range = [Number(m[1]), Number(m[2])];
    C.cardFiles.set(label, rec);
  }
}

// ─────────────────────────── semantic checks ───────────────────────────
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// lesson and unit sizes (PROJECT.md 7.5): A1 to B1 all have four lessons per unit and 10–14 exercises per lesson
const sizeTargets = () => ({ lessons: 4, exMin: 8, exMax: 16, types: 4 });

function checkLevel(rec) {
  const { v, file } = rec, r = REG.levels.get(v.id);
  if (!r) return;
  if (v.cefr !== r.cefr) err(file, `cefr should be ${r.cefr}`);
  if (v.title !== r.title) err(file, `title “${v.title}” differs from TM-CURRICULUM.md “${r.title}”`);
  if (!same(v.units, r.units)) err(file, `units differ from TM-CURRICULUM.md (${r.units.join(", ")})`);
}

function checkUnit(rec, cx) {
  const { v, file } = rec, r = REG.units.get(v.id);
  if (!r) { err(file, `${v.id} is not in TM-CURRICULUM.md`); return; }
  if (v.level !== r.level) err(file, `level should be ${r.level}`);
  if (v.order !== r.order) err(file, `order should be ${r.order}`);
  if (v.title !== r.title) err(file, `title “${v.title}” differs from TM-CURRICULUM.md “${r.title}”`);
  if (v.titleTk !== r.titleTk) err(file, `titleTk “${v.titleTk}” differs from TM-CURRICULUM.md “${r.titleTk}”`);
  if (!same(v.grammarPoints, r.points)) err(file, `grammarPoints differ from TM-CURRICULUM.md: ${r.points.join(", ")}`);
  if (v.grammar !== `${v.id}-grammar`) err(file, `grammar should be ${v.id}-grammar`);
  if (v.culture !== `${v.id}-culture`) err(file, `culture should be ${v.id}-culture`);
  v.lessons.forEach((l, i) => { if (l !== `${v.id}-l${pad2(i + 1)}`) err(`${file} › lessons[${i}]`, `should be ${v.id}-l${pad2(i + 1)}`); });
  const tg = sizeTargets(v.level);
  if (v.lessons.length !== tg.lessons) warn(file, `${v.lessons.length} lessons; units at ${CEFR[v.level]} have ${tg.lessons}`);
  if (cx.examples) return;
  for (const l of v.lessons) if (!C.lessons.has(l)) err(file, `lesson ${l} is missing (lessons/${l}.json)`);
  if (!C.grammar.has(v.id)) err(file, `grammar guide is missing (grammar/${v.id}.json)`);
  if (!C.culture.has(v.id)) err(file, `interlude is missing (culture/${v.id}.json)`);
  // unit-level exercise mix
  const lessons = v.lessons.map(l => C.lessons.get(l)).filter(x => x && x.ok).map(x => x.v);
  if (lessons.length === v.lessons.length) {
    const all = lessons.flatMap(l => l.exercises);
    const lvi = LEVELS.indexOf(v.level);
    if (lvi <= 1 && lessons[0] && !lessons[0].exercises.some(e => e.type === "match")) warn(file, "the first lesson of an A1–A2 unit should have a match exercise for its new words");
    if (lvi >= 2 && !all.some(e => e.type === "reading")) warn(file, "units from B1 on need at least one reading exercise");
  }
}

function checkPointsUsable(points, unitId, where) {
  const ui = unitIndex(unitId);
  for (const gp of points || []) {
    const r = REG.points.get(gp);
    if (!r) { err(where, `unknown grammar point ${gp}`); continue; }
    if (ui >= 0 && unitIndex(r.unit) > ui) err(where, `${gp} is introduced later, in ${r.unit}`);
  }
}

function checkLesson(rec, cx) {
  const { v, file } = rec;
  const unitId = v.unit;
  if (!REG.units.has(unitId)) { err(file, `unit ${unitId} is not in TM-CURRICULUM.md`); return; }
  if (unitOf(v.id) !== unitId) err(file, `id ${v.id} does not belong to unit ${unitId}`);
  if (v.order !== Number(v.id.slice(-2))) err(file, `order should be ${Number(v.id.slice(-2))}, the number in its id`);
  checkPointsUsable(v.points, unitId, `${file} › points`);
  if (v.intro && v.intro.see) checkPointsUsable([v.intro.see], unitId, `${file} › intro.see`);
  if (!cx.examples) {
    const u = C.units.get(unitId);
    if (!u) err(file, `unit file units/${unitId}.json is missing or does not list this lesson`);
    else if (u.ok && !u.v.lessons.includes(v.id)) err(file, `units/${unitId}.json does not list this lesson`);
    // a vocab link points at a card the lessons have taught by this unit (TM-PROJECT.md 7.8; QA-TK-1)
    v.vocab.forEach((w, i) => { if (w.card) deferred.push(() => {
      const k = C.cards.get(w.card), at = `${file} › vocab[${i}].card`;
      if (!k) { err(at, `unknown flashcard ${w.card}`); return; }
      if (!k.c.unit) warn(at, `${w.card} (${k.c.tk}) has no unit; a card linked from a lesson gets the first unit that teaches it (7.8)`);
      else if (unitIndex(k.c.unit) > unitIndex(unitId)) warn(at, `${w.card} (${k.c.tk}) has unit ${k.c.unit}, later than this lesson's ${unitId}; its unit is the first that teaches it (7.8)`);
    }); });
  }
  let last = 0;
  const ids = new Set();
  v.exercises.forEach((e, i) => {
    const w = `${file} › exercises[${i}]`;
    if (!e.id.startsWith(v.id + "-e")) err(w, `id ${e.id} should start with ${v.id}-e`);
    const n = Number(e.id.slice(-2));
    if (ids.has(e.id)) err(w, `duplicate exercise id ${e.id}`);
    else if (n <= last) err(w, `exercise numbers must increase (${e.id} after e${pad2(last)})`);
    ids.add(e.id); last = Math.max(last, n);
    checkExercise(e, w, unitId, cx);
  });
  // lesson mix (warnings); the lesson in TM-PROJECT.md 5.1 is an excerpt, so not for examples
  if (cx.examples) return;
  const tg = sizeTargets(levelOf(unitId)), ex = v.exercises;
  if (ex.length < tg.exMin || ex.length > tg.exMax) warn(file, `${ex.length} exercises; aim for 10–14`);
  const types = new Set(ex.map(e => e.type));
  if (types.size < tg.types) warn(file, `${types.size} exercise types; use at least ${tg.types}`);
  const dirs = new Set(ex.filter(e => e.type === "translate" || e.type === "wordbank").map(e => e.from));
  if (dirs.size < 2) warn(file, "A1–B1 lessons need translation in both directions (translate or wordbank, from tk and from en)");
}

function checkExercise(e, w, unitId, cx) {
  checkPointsUsable(e.points, unitId, `${w}.points`);
  if (["mcq", "cloze", "conjugate", "morph"].includes(e.type) && !e.explain) err(w, `${e.type} exercises need an explain`);
  switch (e.type) {
    case "mcq": {
      if (e.answer >= e.options.length) err(`${w}.answer`, "points past the last option");
      e.options.forEach((o, i) => checkOption(o, e.optionsLang, `${w}.options[${i}]`, cx, { wrong: i !== e.answer }));
      dupes(e.options.map(o => norm(o, e.optionsLang)), `${w}.options`);
      for (const k of Object.keys(e.why || {})) {
        if (Number(k) >= e.options.length) err(`${w}.why.${k}`, "no such option");
        if (Number(k) === e.answer) err(`${w}.why.${k}`, "why is for wrong options; use explain for the right one");
      }
      break;
    }
    case "cloze": {
      if (/_{4,}/.test(e.text)) err(`${w}.text`, "blanks are exactly three underscores ___");
      const n = e.text.split("___").length - 1;
      if (n !== e.blanks.length) err(`${w}.text`, `${n} blank(s) in the text but ${e.blanks.length} in blanks`);
      let filled = e.text;
      e.blanks.forEach((b, i) => {
        const bw = `${w}.blanks[${i}]`;
        if ("options" in b) {
          if (b.answer >= b.options.length) err(`${bw}.answer`, "points past the last option");
          b.options.forEach((o, j) => checkTk(o, `${bw}.options[${j}]`, { sentence: false, wrong: j !== b.answer }));
          dupes(b.options.map(o => norm(o, "tk")), `${bw}.options`);
          filled = filled.replace("___", b.options[b.answer] ?? "");
        } else {
          checkAccept(b.accept, "tk", bw, b.reject, e.diacritics || "strict");
          filled = filled.replace("___", b.accept[0] ?? "");
        }
      });
      if (n === e.blanks.length) checkTk(filled, `${w}.text (with answers filled in)`);
      break;
    }
    case "translate": {
      const to = e.from === "tk" ? "en" : "tk";
      checkText(e.prompt, e.from, `${w}.prompt`);
      checkAccept(e.accept, to, w, e.reject, e.diacritics || "lenient");
      if (to === "tk") subjectSaid(e.accept[0], `${w}.accept[0]`);
      if (norm(e.prompt, e.from) === norm(e.accept[0], to)) warn(`${w}.prompt`, "prompt and answer are identical");
      break;
    }
    case "wordbank": {
      const to = e.from === "tk" ? "en" : "tk";
      checkText(e.prompt, e.from, `${w}.prompt`);
      checkText(e.text, to, `${w}.text`);
      [...e.answer, ...e.distractors].forEach((t, i) => {
        if (/\s/.test(t)) warn(`${w}.tiles`, `tile “${t}” contains a space; tiles are single words`);
        if (/[.,!?;:…"“”]/.test(t)) warn(`${w}.tiles`, `tile “${t}” contains punctuation`);
        checkText(t, to, `${w}.tiles`, { sentence: false, wrong: i >= e.answer.length });
      });
      if (norm(e.text, to) !== norm(e.answer.join(" "), to)) err(`${w}.answer`, `tiles “${e.answer.join(" ")}” do not spell the text “${e.text}”`);
      const answerTiles = new Set(e.answer.map(t => norm(t, to)));
      for (const d of e.distractors) if (answerTiles.has(norm(d, to))) err(`${w}.distractors`, `distractor “${d}” is also an answer tile`);
      const pool = [...e.answer, ...e.distractors].map(t => norm(t, to));
      (e.accept || []).forEach((a, i) => {
        const left = [...pool];
        for (const tok of norm(a, to).split(" ")) {
          const j = left.indexOf(tok);
          if (j < 0) { err(`${w}.accept[${i}]`, `“${a}” uses “${tok}”, which is not a tile`); break; }
          left.splice(j, 1);
        }
        if (norm(a, to) === norm(e.text, to)) warn(`${w}.accept[${i}]`, "same as text");
        if (/[.!?…]$/.test(e.text) && !/[.!?…]["”»)]?$/.test(a)) warn(`${w}.accept[${i}]`, `“${a}” should end with punctuation, like text`);
      });
      break;
    }
    case "match": {
      dupes(e.pairs.map(p => norm(p[0], "tk")), `${w}.pairs (Turkmen side)`);
      dupes(e.pairs.map(p => norm(p[1], "en")), `${w}.pairs (English side)`);
      break;
    }
    case "conjugate": {
      let prev = -1;
      e.cells.forEach((c, i) => {
        const k = PERSONS.indexOf(c.p);
        if (k <= prev) err(`${w}.cells[${i}]`, "persons must be unique and in the order men, sen, ol, biz, siz, olar");
        prev = Math.max(prev, k);
        checkAccept(c.accept, "tk", `${w}.cells[${i}]`);
      });
      engineConjugate(e, w);
      break;
    }
    case "morph": {
      if (e.parts.join("") !== e.result) err(`${w}.parts`, `parts join to “${e.parts.join("")}”, not “${e.result}”`);
      e.parts.forEach((t, i) => checkTk(t, `${w}.parts[${i}]`, { sentence: false }));
      e.distractors.forEach((t, i) => {
        checkTk(t, `${w}.distractors[${i}]`, { sentence: false });
        if (e.parts.includes(t)) err(`${w}.distractors[${i}]`, `“${t}” is also a correct part`);
      });
      dupes(e.distractors, `${w}.distractors`);
      if (e.parts.join("") === e.result) engineMorph(e, w);
      break;
    }
    case "reading": {
      e.questions.forEach((q, i) => {
        if (q.answer >= q.options.length) err(`${w}.questions[${i}].answer`, "points past the last option");
        q.options.forEach((o, j) => checkOption(o, q.optionsLang, `${w}.questions[${i}].options[${j}]`, cx));
        dupes(q.options.map(o => norm(o, q.optionsLang)), `${w}.questions[${i}].options`);
      });
      break;
    }
    case "open": {
      if (("source" in e) !== ("sourceLang" in e)) err(w, "source and sourceLang go together");
      if (e.source) checkText(e.source, e.sourceLang, `${w}.source`);
      e.models.forEach((m, i) => checkText(m, e.modelsLang, `${w}.models[${i}]`));
      break;
    }
  }
}

function dupes(list, where) {
  const s = new Set();
  for (const x of list) { if (s.has(x)) err(where, `“${x}” appears twice`); s.add(x); }
}

// text of blocks, for word counts and per-block checks
const stripMarkup = s => s.replace(/`[^`]*`/g, " ").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*+/g, "").replace(/\|/g, "");
const words = s => (stripMarkup(s).match(/[\p{L}\d][\p{L}\d'’-]*/gu) || []).length;
function blockWords(b) {
  switch (b.type) {
    case "p": case "callout": return { en: words(b.text) };
    case "list": return { en: b.items.reduce((n, x) => n + words(x), 0) };
    case "parallel": return { tk: words(b.tk), en: words(b.en) };
    case "passage": return { tk: words(b.tk) };
    case "quote": return { tk: words(b.tk), en: words(b.en) };
    case "examples": return { tk: b.items.reduce((n, x) => n + words(x.tk), 0), en: b.items.reduce((n, x) => n + words(x.en) + words(x.note || ""), 0) };
    case "dialogue": return { tk: b.lines.reduce((n, x) => n + words(x.tk), 0), en: b.lines.reduce((n, x) => n + words(x.en), 0) };
    case "table": return { en: b.rows.flat().reduce((n, x) => n + words(x), 0) };
    case "paradigm": return { tk: b.rows.length * 2 };
    default: return {};
  }
}

function checkBlocks(blocks, where, cx) {
  blocks.forEach((b, i) => {
    const w = `${where}[${i}]`;
    if (b.type === "table") {
      if (b.cols.length !== b.head.length) err(`${w}.cols`, `${b.cols.length} column types for ${b.head.length} headings`);
      b.rows.forEach((row, r) => {
        if (row.length !== b.head.length) { err(`${w}.rows[${r}]`, `${row.length} cells for ${b.head.length} headings`); return; }
        row.forEach((cell, c) => {
          if (!cell) return;
          const cw = `${w}.rows[${r}][${c}]`;
          const t = b.cols[c];
          if (t === "tk") { checkTk(cell, cw, { sentence: false }); rawMarkup(cell, cw); }
          else if (t === "en") rawMarkup(cell, cw);
          else if (t === "seg") checkSeg(cell, cw);
          else if (t === "rich") checkRich(cell, cw, cx);
        });
      });
    }
    if (b.type === "examples") b.items.forEach((x, k) => { if (x.seg !== undefined) { hygiene(x.seg, `${w}.items[${k}].seg`); checkSeg(x.seg, `${w}.items[${k}].seg`, x.tk); } });
    if (b.type === "see") b.refs.forEach((r, k) => checkRef(r, `${w}.refs[${k}]`, cx));
    if (b.type === "image" && !fs.existsSync(path.join(ROOT, b.src))) err(`${w}.src`, `${b.src} does not exist`);
    if (b.type === "quote" && !b.source.trim()) err(`${w}.source`, "quotes need a source");
  });
}

function checkGrammar(rec, cx) {
  const { v, file } = rec, unitId = v.unit, r = REG.units.get(unitId);
  if (!r) { err(file, `unit ${unitId} is not in TM-CURRICULUM.md`); return; }
  if (v.id !== `${unitId}-grammar`) err(file, `id should be ${unitId}-grammar`);
  if (v.title !== r.title) err(file, `title “${v.title}” should be the unit title “${r.title}”`);
  let prev = -1;
  const seen = new Set();
  v.sections.forEach((s, i) => {
    const w = `${file} › sections[${i}]`;
    const k = r.points.indexOf(s.point);
    if (k < 0) { err(`${w}.point`, `${s.point} is not a grammar point of ${unitId} (${r.points.join(", ")})`); return; }
    if (seen.has(s.point)) err(`${w}.point`, `${s.point} has two sections`);
    else if (k < prev) err(`${w}.point`, "sections must follow the TM-CURRICULUM.md order of grammar points");
    seen.add(s.point); prev = Math.max(prev, k);
    checkBlocks(s.blocks, `${w}.blocks`, cx);
    if (!s.blocks.some(b => ["examples", "paradigm", "table", "dialogue"].includes(b.type))) warn(w, "section has no examples, paradigm or table");
  });
  if (!cx.examples) {
    const missing = r.points.filter(p => !seen.has(p));
    if (missing.length) err(file, `no section for ${missing.join(", ")}`);
    if (!C.units.has(unitId)) err(file, `unit file units/${unitId}.json is missing`);
    const n = [v.intro, ...v.summary].reduce((a, x) => a + words(x), 0) + v.sections.flatMap(s => s.blocks).reduce((a, b) => { const c = blockWords(b); return a + (c.en || 0) + (c.tk || 0); }, 0);
    const [lo, hi] = LEVELS.indexOf(r.level) <= 1 ? [700, 3000] : [900, 3500];
    if (n < lo || n > hi) warn(file, `about ${n} words; aim for ${LEVELS.indexOf(r.level) <= 1 ? "900–2,000" : "1,200–2,500"}`);
  }
}

function checkCulture(rec, cx) {
  const { v, file } = rec, unitId = v.unit, r = REG.units.get(unitId);
  if (!r) { err(file, `unit ${unitId} is not in TM-CURRICULUM.md`); return; }
  if (v.id !== `${unitId}-culture`) err(file, `id should be ${unitId}-culture`);
  if (v.title !== r.interlude) err(file, `title “${v.title}” differs from TM-CURRICULUM.md “${r.interlude}”`);
  const fmt = LEVELS.indexOf(r.level) <= 1 ? "en" : "parallel";
  if (v.format !== fmt) warn(file, `format “${v.format}”; interludes at ${CEFR[r.level]} are “${fmt}”`);
  checkBlocks(v.blocks, `${file} › blocks`, cx);
  (v.questions || []).forEach((q, i) => {
    if (q.answer >= q.options.length) err(`${file} › questions[${i}].answer`, "points past the last option");
    q.options.forEach((o, j) => checkOption(o, q.optionsLang, `${file} › questions[${i}].options[${j}]`, { file }));
  });
  if (v.sources.length < 2) warn(file, "history and archaeology interludes need at least two sources");
  v.sources.forEach((s, i) => { if (!s.url) warn(`${file} › sources[${i}]`, "add a URL so the fact can be checked"); });
  if (!cx.examples) {
    if (!C.units.has(unitId)) err(file, `unit file units/${unitId}.json is missing`);
    let tk = 0, en = 0;
    for (const b of v.blocks) { const c = blockWords(b); tk += c.tk || 0; en += c.en || 0; }
    const n = v.format === "en" ? en : Math.min(tk, en);
    const [lo, hi] = v.format === "en" ? [250, 900] : [200, 700];
    if (n < lo || n > hi) warn(file, `about ${n} ${v.format === "parallel" ? "words per language" : "words"}; see PROJECT.md 7.7 for the target`);
  }
}

// Does a card's example contain its word? Prefix match on the lemma's stem, with the final k, p, ç or t left out
// (voicing: kitap → kitaby), ä read as e (işlemek → işläp), and the card's own forms (at → ady, men → maňa…).
const exKey = s => s.toLowerCase().replace(/ä/g, "e");
function exampleHasWord(c) {
  const toks = exKey(c.ex.tk).split(/[^\p{L}-]+/u).filter(Boolean);
  const lemma = exKey(c.tk.split(" ")[0]);
  if (lemma.startsWith("-")) return toks.some(t => t.endsWith(lemma.slice(1)) || t.includes(lemma.slice(1)));
  let stem = c.pos === "verb" ? lemma.replace(/m[ae]k$/, "") : lemma;
  if (/[pçtk]$/.test(stem)) stem = stem.slice(0, -1);
  if (stem.length < 3) return true;
  const starts = [stem, ...Object.values(c.forms || {}).map(f => exKey(f).split(" ")[0])];
  return toks.some(t => starts.some(s => t.startsWith(s) || fold(t).startsWith(fold(s))));
}

function checkFlashFile(rec, cx) {
  const { v, file } = rec;
  if (rec.range && !same(v.range, rec.range)) err(file, `range ${JSON.stringify(v.range)} should be ${JSON.stringify(rec.range)} to match the file name`);
  if (v.range[0] > v.range[1]) err(file, "range is reversed");
  let prev = 0;
  v.cards.forEach((c, i) => {
    const w = `${file} › cards[${i}]`;
    if (c.rank < v.range[0] || c.rank > v.range[1]) err(w, `rank ${c.rank} is outside the file's range ${v.range.join("–")}`);
    if (c.rank <= prev) err(w, "cards must be sorted by rank, without duplicates");
    prev = c.rank;
    if (!cx.examples) {
      if (C.cards.has(c.id)) err(w, `duplicate card id ${c.id} (also in ${C.cards.get(c.id).file})`);
      C.cards.set(c.id, { c, file });
    }
    if (c.pos === "verb") {
      if (!/m[ae]k$/.test(c.tk)) err(`${w}.tk`, "verbs are given as infinitives in -mak or -mek");
      const miss = ["prs", "past", "aor", "cvb"].filter(k => !c.forms || !c.forms[k]);
      if (miss.length) err(`${w}.forms`, `verbs need forms.${miss.join(", forms.")} (TM-PROJECT.md 5.8)`);
    }
    if (c.unit && !REG.units.has(c.unit)) err(`${w}.unit`, `${c.unit} is not in TM-CURRICULUM.md`);
    if (c.unit && c.level && !c.unit.startsWith(c.level + "-")) warn(`${w}.level`, `${c.level}, but its unit ${c.unit} is in ${c.unit.slice(0, 2).toUpperCase()}; a card's level follows its unit (PROJECT.md 7.8)`);
    if (!exampleHasWord(c)) warn(`${w}.ex.tk`, `example does not seem to contain “${c.tk}”`);
    if (!cx.examples) engineCard(c, w);
  });
  if (!cx.examples) {
    const want = v.range[1] - v.range[0] + 1;
    if (v.cards.length !== want) warn(file, `${v.cards.length} of ${want} cards so far`);
  }
}

// scripts/turkmen/tm-wordlist.tsv (TM-PROJECT.md 7.8): the ranked 1,000 lemmas that every flashcard batch follows
const WL_HEADER = ["rank", "lemma", "pos", "sense", "gloss", "tr"];
function loadWordlist() {
  const label = rel(WORDLIST);
  if (!fs.existsSync(WORDLIST)) { err(label, "missing: the flashcards follow it (TM-PROJECT.md 7.8)"); return null; }
  const raw = fs.readFileSync(WORDLIST, "utf8");
  if (raw.charCodeAt(0) === 0xfeff) err(label, "starts with a byte-order mark");
  if (raw !== raw.normalize("NFC")) err(label, "text is not NFC-normalized");
  if (/\r/.test(raw)) err(label, "use LF line endings");
  const lines = raw.split("\n");
  if (lines[lines.length - 1] === "") lines.pop(); else err(label, "must end with a newline");
  if (lines[0] !== WL_HEADER.join("\t")) err(label, `the first line must be the header: ${WL_HEADER.join(", ")} (tab-separated)`);
  const list = new Map(), seen = new Map();
  lines.slice(1).forEach((line, i) => {
    const where = `${label}:${i + 2}`, rank = i + 1;
    const f = line.split("\t");
    if (f.length !== WL_HEADER.length) { err(where, `needs exactly six tab-separated fields: ${WL_HEADER.join(", ")}`); return; }
    const [r, lemma, pos, sense, gl, tr] = f;
    if (r !== String(rank)) err(where, `rank should be ${rank}`);
    if (!POS.includes(pos)) err(where, `“${pos}” is not a part of speech of PROJECT.md 5.1`);
    if (!lemma || lemma !== lemma.trim() || / {2,}/.test(lemma)) err(where, "empty lemma or stray spaces");
    else { hygiene(lemma, where); checkTk(lemma, where, { sentence: false }); }
    if (pos === "verb" && !/m[ae]k$/.test(lemma)) err(where, "verbs are given as infinitives in -mak or -mek");
    if (lemma !== lemma.toLowerCase()) err(where, "lemmas are lowercase (no proper nouns in the deck)");
    if (sense !== "" && !/^[1-9]$/.test(sense)) err(where, `sense “${sense}” should be empty, or 1, 2… for a second meaning`);
    if (!gl || gl !== gl.trim()) err(where, "empty gloss or stray spaces"); else hygiene(gl, where);
    if (!tr || tr !== tr.trim()) err(where, "tr is the Turkish lemma the row was matched to, or + for an added word"); else hygiene(tr, where);
    const key = `${lemma}|${pos}`;
    if (!seen.has(key)) seen.set(key, []);
    seen.get(key).push({ rank, sense, where });
    list.set(rank, { lemma, pos, sense: sense ? Number(sense) : undefined, gloss: gl, tr });
  });
  for (const [key, rows] of seen) {
    const [lemma, pos] = key.split("|");
    if (rows.length === 1) { if (rows[0].sense) warn(rows[0].where, `sense ${rows[0].sense}, but “${lemma}” (${pos}) has no other row`); continue; }
    if (rows.some(x => !x.sense)) err(rows[rows.length - 1].where, `“${lemma}” (${pos}) is also rank ${rows[0].rank}: give each row a sense (1, 2…)`);
    else if (new Set(rows.map(x => x.sense)).size !== rows.length) err(rows[rows.length - 1].where, `“${lemma}” (${pos}) has the same sense twice`);
  }
  if (list.size !== 1000) warn(label, `${list.size} lemmas; the deck has 1,000`);
  return list;
}

function checkCardsGlobal() {
  const wl = loadWordlist();
  const desc = (tk, pos, sense) => `“${tk}” (${pos}${sense ? `, sense ${sense}` : ""})`;
  if (wl) for (const { c, file } of C.cards.values()) {
    const w = wl.get(c.rank);
    if (!w) err(file, `${c.id}: rank ${c.rank} is not in ${rel(WORDLIST)}`);
    else if (w.lemma !== c.tk || w.pos !== c.pos || w.sense !== c.sense) err(file, `${c.id}: rank ${c.rank} is ${desc(w.lemma, w.pos, w.sense)} in ${rel(WORDLIST)}, not ${desc(c.tk, c.pos, c.sense)}`);
  }
  const seen = new Map();
  for (const { c, file } of C.cards.values()) {
    const key = `${c.tk.toLowerCase()}|${c.pos}|${c.sense || 1}`;
    if (seen.has(key)) err(file, `“${c.tk}” (${c.pos}) appears twice (${c.id} and ${seen.get(key)}); give one of them a sense`);
    seen.set(key, c.id);
  }
  const ranks = new Map();
  for (const { c, file } of C.cards.values()) {
    if (ranks.has(c.rank)) err(file, `rank ${c.rank} is used by ${c.id} and ${ranks.get(c.rank)}`);
    ranks.set(c.rank, c.id);
  }
}

// ─────────────────────────── index.json ───────────────────────────
function buildIndex() {
  const files = [...C.files].sort((a, b) => a[0].localeCompare(b[0]));
  const h = crypto.createHash("sha1");
  for (const [f, raw] of files) h.update(f + "\0" + raw + "\0");
  const label = gp => {
    const r = REG.points.get(gp);
    const g = C.grammar.get(r.unit);
    const sec = g && g.ok && g.v.sections.find(s => s.point === gp);
    if (sec) return sec.title;
    const d = r.description.split(/;| — /)[0].replace(/\*/g, "").trim();
    return d.length > 90 ? d.slice(0, 87).trimEnd() + "…" : d;
  };
  let nLessons = 0, nEx = 0;
  const levels = LEVELS.filter(id => REG.levels.has(id)).map(id => {
    const r = REG.levels.get(id), lf = C.levels.get(id);
    return {
      id, cefr: r.cefr, title: r.title, ready: !!(lf && lf.ok),
      units: r.units.map(uid => {
        const u = REG.units.get(uid), uf = C.units.get(uid);
        const o = { id: uid, title: u.title, titleTk: u.titleTk, batch: u.batch, status: uf && uf.ok ? "ready" : "planned", interlude: u.interlude, points: u.points };
        if (uf && uf.ok) o.lessons = uf.v.lessons.map(lid => {
          const l = C.lessons.get(lid);
          const n = l && l.ok ? l.v.exercises.length : 0;
          nLessons++; nEx += n;
          return { id: lid, title: l && l.ok ? l.v.title : "", exercises: n };
        });
        return o;
      }),
    };
  });
  const points = {};
  for (const gp of REG.points.keys()) { const r = REG.points.get(gp); points[gp] = { unit: r.unit, label: label(gp), ready: !!C.units.get(r.unit) }; }
  const cardFiles = [...C.cardFiles.keys()].sort().map(f => f.replace(/^assets\/data\/turkmen\//, ""));
  return {
    version: h.digest("hex").slice(0, 10),
    levels,
    points,
    flashcards: { files: cardFiles, count: C.cards.size },
    counts: { units: [...C.units.values()].filter(u => u.ok).length, lessons: nLessons, exercises: nEx, cards: C.cards.size },
  };
}

// JSON with 2-space indent, short arrays of strings or numbers kept on one line (smaller, readable diffs)
function pretty(v) {
  return JSON.stringify(v, null, 2).replace(/\[\n\s+((?:(?:"[^"\n]*"|-?[\d.]+),\n\s+)*(?:"[^"\n]*"|-?[\d.]+))\n\s+\]/g, (m, inner) => {
    const one = "[" + inner.split(/,\n\s+/).join(", ") + "]";
    return one.length <= 160 ? one : m;
  });
}

// ─────────────────────────── the French edition (turkmen/TM-FR.md 10) ───────────────────────────
// --lang fr: the French tree assets/data/turkmen/fr/ with the schema rules above (its learner-language key is fr, 5.2),
// then its parity with the English files (10.2: the same IDs, types and counts, identical Turkmen, the French
// registry's titles), the interface strings (i18n/fr.json against en.json) and French typography (10.3, warnings).
// --sync copies the Turkmen of the English files into the French ones; --fix applies 11.3 to the French text.
const FR_DATA = path.join(DATA, "fr"), I18N = path.join(DATA, "i18n"), TM_FR = path.join(ROOT, "turkmen/TM-FR.md");
const CF = { levels: new Map(), units: new Map(), lessons: new Map(), grammar: new Map(), culture: new Map(), cardFiles: new Map(), cards: new Map(), files: [] };
const FREG = { levels: new Map(), units: new Map() };   // TM-FR.md 13: level id → title; unit id → { title, interlude }
const FSTAT = { keys: 0, strings: 0, synced: [], unplaced: [], fixed: [] };
const isFr = where => /^(?:assets\/data\/turkmen\/(?:fr|i18n)\/|turkmen\/TM-FR\.md|French batch|--batch)/.test(where);
const LANG_FR = x => (x === "en" ? "fr" : x);   // a language value of an English file, as its French file has it
const short = v => { const s = JSON.stringify(v); return s === undefined ? "nothing" : s.length > 70 ? s.slice(0, 67) + "…" : s; };
const nfc = v => JSON.stringify(v === undefined ? null : v).normalize("NFC");

function parseFrRegistry() {
  const label = rel(TM_FR);
  if (!fs.existsSync(TM_FR)) { err(label, "missing: the French registry is its section 13"); return; }
  const text = fs.readFileSync(TM_FR, "utf8"), a = text.search(/^## 13\. /m), b = text.search(/^## 14\. /m);
  if (a < 0) { err(label, "no section “## 13. French registry”"); return; }
  const lines = text.slice(a, b > a ? b : undefined).split("\n"), base = text.slice(0, a).split("\n").length;
  lines.forEach((line, i) => {
    const w = `${label}:${base + i}`;
    let m;
    if ((m = line.match(/^\| (a1|a2|b1) \| ([^|]+?) \|\s*$/))) {
      if (FREG.levels.has(m[1])) err(w, `level ${m[1]} is listed twice`);
      FREG.levels.set(m[1], m[2].trim());
    } else if ((m = line.match(/^\| ((?:a1|a2|b1)-u\d\d) \| ([^|]+?) \| ([^|]+?) \|\s*$/))) {
      if (FREG.units.has(m[1])) err(w, `unit ${m[1]} is listed twice`);
      if (!REG.units.has(m[1])) err(w, `unit ${m[1]} is not in TM-CURRICULUM.md`);
      FREG.units.set(m[1], { title: m[2].trim(), interlude: m[3].trim() });
    }
  });
  for (const id of REG.levels.keys()) if (!FREG.levels.has(id)) err(label, `section 13 has no French title for level ${id}`);
  for (const id of REG.order) if (!FREG.units.has(id)) err(label, `section 13 has no French titles for unit ${id}`);
  for (const [id, t] of [...FREG.levels].concat([...FREG.units].flatMap(([u, x]) => [[u, x.title], [u + " interlude", x.interlude]]))) {
    hygiene(t, `${label} (${id})`); frTypo(t, `${label} (${id})`);
  }
}

// French typography (TM-FR.md 11.3), on the text outside markup, placeholders, Turkmen (*…*, lang="tk") and code.
const NNBSP = "\u202f", NBSP = "\u00a0";
const FR_MASK = /<(i|span|b)\b[^>]*\blang="tk"[^>]*>[\s\S]*?<\/\1>|<[^>]+>|\{\w+\}|&[#\w]+;|`[^`\n]*`|\*\*(?=[^*\n]+\*\*)|(?<!\*)\*[^*\n]+\*(?!\*)|\]\([^)\s]+\)/g;
function frMasked(s, f) {
  const saved = [];
  const t = f(String(s).replace(FR_MASK, m => { saved.push(m); return String.fromCharCode(0xe000 + saved.length - 1); }));
  return t.replace(/[\ue000-\uf8ff]/g, ch => saved[ch.charCodeAt(0) - 0xe000]);
}
const OE_END = "(?:ur|il|uvre|ud|uf|ux|u)s?(?![\\p{L}])";
const OE_WORDS = new RegExp(`(?<![\\p{L}])((?:c|s|n|b|v|m|ch|man)?oe${OE_END})`, "iu");
const OE_FIX = new RegExp(`(?<![\\p{L}])((?:[CcSsNnBbVvMm]|[Cc]h|[Mm]an)?)[Oo]e(?=${OE_END})`, "gu");
function frFix(s) {
  return frMasked(s, t => t.replace(/'/g, "’").replace(/\.\.\./g, "…")
    .replace(/(?<=\S)[ \u00a0\u202f]?([;!?])/g, NNBSP + "$1")
    .replace(/(?<=\S)[ \u00a0\u202f]?:(?=\s|$)/g, NBSP + ":")
    .replace(/[ \u00a0\u202f]:(?=[\ue000-\uf8ff])/g, NBSP + ":")
    .replace(/«[ \u00a0\u202f]*/g, "«" + NNBSP).replace(/[ \u00a0\u202f]*»/g, NNBSP + "»")
    .replace(/[ \u00a0]%/g, NNBSP + "%")
    .replace(/(?<=\d)[ \u00a0](?=\d{3}(?!\d))/g, NNBSP)
    .replace(OE_FIX, (m, a) => (a || "") + (m.endsWith("Oe") ? "Œ" : "œ")));
}
function frTypo(s, where) {
  if (typeof s !== "string" || !s) return;
  const plain = String(s).replace(FR_MASK, " ");
  if (/'/.test(plain)) warn(where, "straight apostrophe: French writes ’ (U+2019); --fix replaces it");
  if (/"/.test(plain)) warn(where, "straight quotes: French writes « … » (U+202F inside), and “ ” only inside them");
  if (/\.\.\./.test(plain)) warn(where, "... for …: write the one character (U+2026)");
  if (/[^\s\u202f;!?(«]([;!?])/u.test(plain)) warn(where, "no space before ; ! or ?: French puts a narrow no-break space (U+202F) there");
  else if (/[ \u00a0][;!?]/.test(plain)) warn(where, "an ordinary space before ; ! or ?: use a narrow no-break space (U+202F)");
  if (/[^\s\u00a0\d]:(?=\s|$)/u.test(plain)) warn(where, "no space before a colon: French puts a no-break space (U+00A0) there");
  else if (/[ \u202f]:(?=\s|$)/.test(plain)) warn(where, "an ordinary space before a colon: use a no-break space (U+00A0)");
  if (/«(?!\u202f)|(?<!\u202f)»/.test(plain)) warn(where, "« » take a narrow no-break space (U+202F) inside");
  if (/\d[ ,\u00a0]\d{3}(?!\d)/.test(plain)) warn(where, "thousands: French writes 1 000 with a narrow no-break space (U+202F)");
  const m = plain.match(OE_WORDS);
  if (m) warn(where, `“${m[1]}”: French writes œ (cœur, sœur, œil, œuvre, nœud, bœuf)`);
}
function noTurc(t, where) {
  if (/(?<![\p{L}])(?:turcs?|turques?|Turquie)(?![\p{L}])/iu.test(t)) warn(where, "mentions « turc »: the course never compares Turkmen with Turkish (TM-PROJECT.md 1); check that it is needed");
}
function checkFrText(s, where) { sentenceCase(s, where); bareId(s, where); noTurc(s, where); }
// 10.3: a French field equal to its English counterpart, or with English words outside *…* and code
const EN_WORDS = /(?<![\p{L}’'])(the|and|of|with|you|is|are|this|that|your|what|which)(?![\p{L}’'])/iu;
function untranslated(s, en, where) {
  const plain = String(s).replace(FR_MASK, " ");
  const name = plain.split(/\s+/).filter(Boolean).every(x => /^[\p{Lu}\d]/u.test(x));
  if (typeof en === "string" && s === en && words(s) > 3 && !name) warn(where, "the same as the English: translate it");
  const m = plain.match(EN_WORDS);
  if (m) warn(where, `English word “${m[1]}”: is this translated?`);
}
// 10.3: no new Turkmen in French explanations: a *…* span is Turkmen of the English edition, or a form the engine builds
let TK_WORDS = null;
function englishWords() {
  if (TK_WORDS) return TK_WORDS;
  TK_WORDS = new Set();
  const walk = v => { if (typeof v === "string") for (const x of v.toLowerCase().match(/[\p{L}-]+/gu) || []) TK_WORDS.add(x); else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object") Object.values(v).forEach(walk); };
  for (const m of [C.levels, C.units, C.lessons, C.grammar, C.culture, C.cardFiles]) for (const r of m.values()) walk(r.v);
  return TK_WORDS;
}
// a word the engine builds from one of the deck's words (TM-FR.md 10.3): only the cards whose stem starts the word are tried
const ENGINE_FORMS = new Map();
function engineBuilds(word) {
  const w = word.toLowerCase();
  for (const { c } of C.cards.values()) {
    const lemma = c.tk.toLowerCase().split(" ")[0], stem = c.pos === "verb" ? lemma.replace(/m[ae]k$/, "") : lemma;
    if (!w.startsWith(stem.slice(0, Math.max(2, Math.min(3, stem.length - 1))))) continue;
    if (!ENGINE_FORMS.has(c.id)) {
      const set = new Set();
      for (const f of MORPH.forms()) for (const p of PERSONS) {
        let r = null;
        try { r = MORPH.form(f.slug, c.tk, p); } catch (e) { r = null; }
        if (r && r.variants) for (const t of r.variants) for (const x of t.toLowerCase().match(/[\p{L}-]+/gu) || []) set.add(x);
      }
      ENGINE_FORMS.set(c.id, set);
    }
    if (ENGINE_FORMS.get(c.id).has(w)) return true;
  }
  return false;
}
function newTurkmen(s, where) {
  for (const m of String(s).matchAll(/(?<!\*)\*([^*\n]+)\*(?!\*)/g)) {
    const ws = (m[1].toLowerCase().match(/[\p{L}-]+/gu) || []).filter(x => !/^-/.test(x));
    const odd = ws.filter(x => !englishWords().has(x));
    if (odd.length && odd.some(x => !engineBuilds(x))) warn(where, `*${m[1]}*: Turkmen that the English edition doesn't have; quote its Turkmen rather than adding to it (TM-FR.md 10.3)`);
  }
}

// ── the French tree ──
function loadFrench() {
  if (!fs.existsSync(FR_DATA)) return;
  for (const name of fs.readdirSync(FR_DATA).sort()) {
    if (name.startsWith(".")) continue;
    const full = path.join(FR_DATA, name);
    if (fs.statSync(full).isDirectory()) {
      if (!(name in DIRS)) { err(rel(full), "unexpected folder"); continue; }
      for (const f of fs.readdirSync(full).sort()) {
        if (f.startsWith(".")) continue;
        const fp = path.join(full, f);
        if (!f.endsWith(".json") || fs.statSync(fp).isDirectory()) { err(rel(fp), "unexpected file"); continue; }
        if (!fs.existsSync(path.join(DATA, name, f))) { err(rel(fp), `has no English file (${rel(path.join(DATA, name, f))}): the French tree has the English file names (TM-FR.md 5.1)`); continue; }
        loadFrFile(DIRS[name], fp);
      }
    } else if (name !== "index.json") err(rel(full), "unexpected file");
  }
}
function loadFrFile(kind, fp) {
  const label = rel(fp), raw = fs.readFileSync(fp, "utf8");
  CF.files.push([label, raw]);
  if (raw.charCodeAt(0) === 0xfeff) err(label, "starts with a byte-order mark");
  let v;
  try { v = JSON.parse(raw); } catch (e) { err(label, `invalid JSON: ${e.message}`); return; }
  const base = path.basename(fp, ".json"), ok = validate(kind, v, label, { schema: SCHEMA_FR, lang: "fr" });
  const expect = { level: base, unit: base, lesson: base, grammar: `${base}-grammar`, culture: `${base}-culture` }[kind];
  if (kind !== "flashcards" && v && v.id !== expect) { err(label, `id “${v.id}” should be “${expect}” to match the file name`); return; }
  const rec = { v, file: label, ok, fp, en: path.join(DATA, path.relative(FR_DATA, fp)) };
  const id = v && v.id, map = { level: CF.levels, unit: CF.units, lesson: CF.lessons, grammar: CF.grammar, culture: CF.culture }[kind];
  if (kind === "flashcards") { CF.cardFiles.set(label, rec); if (ok) for (const c of v.cards) CF.cards.set(c.id, { c, file: label }); }
  else if (map) map.set(kind === "grammar" || kind === "culture" ? base : id || base, rec);
}

// A walker over a French file and its English file: eq (the same value), tk (Turkmen, identical after NFC; --sync
// copies it), fr (French text: typography, untranslated, new Turkmen; --fix rewrites it), len (the same number of items).
function frWalker(file, mode) {
  const W = { dirty: false };
  const at2 = p => (p ? `${file} › ${p}` : file);
  W.eq = (a, b, p, what) => {
    if (same(a, b)) return true;
    if (mode.sync) FSTAT.unplaced.push(`${at2(p)}: ${what || "value"} ${short(b)}, English ${short(a)}`);
    else err(at2(p), `${what || "value"} ${short(b)} differs from the English file's ${short(a)}`);
    return false;
  };
  W.len = (a, b, p) => W.eq((a || []).length, (b || []).length, p, "number of items") && !!a;
  W.tk = (eo, fo, k, p) => {
    const a = eo ? eo[k] : undefined, b = fo ? fo[k] : undefined;
    if (nfc(a) === nfc(b)) return;
    if (mode.sync && fo && a !== undefined) { fo[k] = JSON.parse(JSON.stringify(a)); W.dirty = true; FSTAT.synced.push(at2(p)); return; }
    if (mode.sync) { FSTAT.unplaced.push(`${at2(p)}: ${a === undefined ? "Turkmen the English file doesn't have" : "no place for the English Turkmen"}`); return; }
    err(at2(p), a === undefined ? `Turkmen ${short(b)} that the English file doesn't have` : b === undefined ? `missing: the English file has ${short(a)} (run --sync)` : `Turkmen differs from the English file: ${short(b)}, English ${short(a)} (run --sync)`);
  };
  // o.rich: Rich text (new Turkmen checked); o.need: the English counterpart is required here too
  W.fr = (fo, k, ea, p, o = {}) => {
    const b = fo ? fo[k] : undefined;
    if (b === undefined) { if (o.need && ea !== undefined && !mode.sync && !mode.fix) err(at2(p), "missing: the English file has it"); return; }
    const list = Array.isArray(b) ? b : [b];
    list.forEach((s, i) => {
      if (typeof s !== "string") return;
      const pi = Array.isArray(b) ? `${p}[${i}]` : p, e = Array.isArray(ea) ? ea[i] : Array.isArray(b) ? undefined : ea;
      if (mode.fix) {
        const f = frFix(s);
        if (f !== s) { if (Array.isArray(b)) b[i] = f; else fo[k] = f; W.dirty = true; FSTAT.fixed.push(at2(pi)); }
        return;
      }
      if (mode.sync) return;
      frTypo(s, at2(pi)); untranslated(s, e, at2(pi));
      if (o.rich) newTurkmen(s, at2(pi));
    });
  };
  return W;
}

// options and answers on the side of their language: Turkmen identical, French translated and all different
function frOptions(e, f, k, lang, p, W) {
  if (lang === "tk") { W.tk(e, f, k, p); return; }
  if (W.len(e[k], f[k], p)) W.fr(f, k, e[k], p, { rich: true });
  if (!W.mode) dupes((f[k] || []).map(o => norm(o, "fr")), `${W.file} › ${p}`);
}
function frRejects(e, f, side, p, W) {
  if (side === "tk") {
    if ((e.reject || f.reject) && W.len(e.reject, f.reject, `${p}.reject`)) e.reject.forEach((r, i) => { W.tk(r, f.reject[i], "answer", `${p}.reject[${i}].answer`); W.fr(f.reject[i], "why", r.why, `${p}.reject[${i}].why`, { rich: true }); });
  } else (f.reject || []).forEach((r, i) => { W.fr(r, "answer", undefined, `${p}.reject[${i}].answer`); W.fr(r, "why", undefined, `${p}.reject[${i}].why`, { rich: true }); });
}
// French accepted answers (TM-FR.md 7.2, 7.3): expansions, duplicates the article rule already covers, rejects accepted
function checkAcceptFr(list, where, rejects) {
  const all = [];
  (list || []).forEach((entry, k) => {
    const w = `${where}.accept[${k}]`;
    if (k === 0 && /[[\]()|]/.test(entry)) err(w, "accept[0] is the canonical answer shown to learners: plain text, no [ ] ( ) |");
    const ex = expand(entry);
    if (ex.error) { err(w, `“${entry}”: ${ex.error}`); return; }
    for (const s of ex.list) {
      if (!s) { err(w, "an expansion is empty"); continue; }
      const n = norm(s, "fr"), j = all.findIndex(x => frSame(x.n, n));
      if (j < 0) { all.push({ n, k }); continue; }
      warn(w, all[j].k === k && all[j].n === n ? `“${s}” appears twice in its own expansions`
        : `“${s}” is already accepted by accept[${all[j].k}]${all[j].n !== n ? ": the checker takes an article left out or added (TM-FR.md 7.3)" : ""}`);
    }
  });
  (rejects || []).forEach((r, k) => {
    const w = `${where}.reject[${k}]`, n = norm(r.answer, "fr"), hit = all.find(x => frSame(x.n, n));
    if (hit) err(w, `rejected answer “${r.answer}” is also accepted (accept[${hit.k}])`);
    else if (all.some(x => frSame(frAccents(x.n), frAccents(n)) || frSame(frNoNe(x.n), frNoNe(n))))
      warn(w, `rejected answer “${r.answer}” differs from an accepted one only by accents or a missing ne, which the checker calls almost before it reads the rejects`);
  });
}

function parityExercise(e, f, p, W) {
  if (!W.eq(e.type, f.type, `${p}.type`, "type")) return;
  W.eq(e.points, f.points, `${p}.points`, "points"); W.eq(e.diacritics, f.diacritics, `${p}.diacritics`, "diacritics");
  W.fr(f, "hint", e.hint, `${p}.hint`, { rich: true });
  W.fr(f, "explain", e.explain, `${p}.explain`, { rich: true, need: true });
  const w = `${W.file} › ${p}`;
  switch (e.type) {
    case "mcq": {
      W.fr(f, "question", e.question, `${p}.question`, { rich: true });
      W.eq(LANG_FR(e.optionsLang), f.optionsLang, `${p}.optionsLang`, "optionsLang");
      frOptions(e, f, "options", e.optionsLang, `${p}.options`, W);
      W.eq(e.answer, f.answer, `${p}.answer`, "answer");
      if (W.eq(!!e.context, !!f.context, `${p}.context`, "context") && e.context && W.len(e.context, f.context, `${p}.context`))
        e.context.forEach((c, i) => { const q = `${p}.context[${i}]`, g = f.context[i]; W.tk(c, g, "who", `${q}.who`); W.tk(c, g, "tk", `${q}.tk`); W.fr(g, "fr", c.en, `${q}.fr`, { need: true }); });
      for (const k of Object.keys(f.why || {})) {
        if (Number(k) >= (f.options || []).length) err(`${w}.why.${k}`, "no such option");
        if (Number(k) === f.answer) err(`${w}.why.${k}`, "why is for wrong options; use explain for the right one");
        W.fr(f.why, k, (e.why || {})[k], `${p}.why.${k}`, { rich: true });
      }
      break;
    }
    case "cloze": {
      W.tk(e, f, "text", `${p}.text`); W.fr(f, "fr", e.en, `${p}.fr`);
      if (W.len(e.blanks, f.blanks, `${p}.blanks`)) e.blanks.forEach((b, i) => {
        const q = `${p}.blanks[${i}]`, g = f.blanks[i];
        if (!W.eq("options" in b, "options" in g, q, "kind of blank (options or typed)")) return;
        if ("options" in b) { W.tk(b, g, "options", `${q}.options`); W.eq(b.answer, g.answer, `${q}.answer`, "answer"); }
        else { W.tk(b, g, "accept", `${q}.accept`); frRejects(b, g, "tk", q, W); }
      });
      break;
    }
    case "translate": {
      W.eq(LANG_FR(e.from), f.from, `${p}.from`, "from");
      if (e.from === "tk") { W.tk(e, f, "prompt", `${p}.prompt`); W.fr(f, "accept", e.accept, `${p}.accept`); frRejects(e, f, "fr", p, W); if (!W.mode) checkAcceptFr(f.accept, w, f.reject); }
      else { W.fr(f, "prompt", e.prompt, `${p}.prompt`); W.tk(e, f, "accept", `${p}.accept`); frRejects(e, f, "tk", p, W); }
      break;
    }
    case "wordbank": {
      W.eq(LANG_FR(e.from), f.from, `${p}.from`, "from");
      if (e.from !== "tk") { W.fr(f, "prompt", e.prompt, `${p}.prompt`); for (const k of ["text", "answer", "distractors", "accept"]) W.tk(e, f, k, `${p}.${k}`); break; }
      W.tk(e, f, "prompt", `${p}.prompt`);
      for (const k of ["text", "answer", "distractors", "accept"]) W.fr(f, k, e[k] === undefined ? undefined : null, `${p}.${k}`);
      if (W.mode || !Array.isArray(f.answer) || !Array.isArray(f.distractors) || typeof f.text !== "string") break;
      [...f.answer, ...f.distractors].forEach(t => {
        if (/\s/.test(t)) warn(`${w}.tiles`, `tile “${t}” contains a space; tiles are single words`);
        if (/[.,!?;:…"“”«»]/.test(t)) warn(`${w}.tiles`, `tile “${t}” contains punctuation`);
      });
      if (norm(f.text, "fr") !== norm(f.answer.join(" "), "fr")) err(`${w}.answer`, `tiles “${f.answer.join(" ")}” do not spell the text “${f.text}”`);
      const answerTiles = new Set(f.answer.map(t => norm(t, "fr")));
      for (const d of f.distractors) if (answerTiles.has(norm(d, "fr"))) err(`${w}.distractors`, `distractor “${d}” is also an answer tile`);
      const pool = [...f.answer, ...f.distractors].map(t => norm(t, "fr"));
      (f.accept || []).forEach((a, i) => {
        const left = [...pool];
        for (const tok of norm(a, "fr").split(" ")) { const j = left.indexOf(tok); if (j < 0) { err(`${w}.accept[${i}]`, `“${a}” uses “${tok}”, which is not a tile`); break; } left.splice(j, 1); }
      });
      break;
    }
    case "match": {
      if (W.len(e.pairs, f.pairs, `${p}.pairs`)) e.pairs.forEach((x, i) => { W.tk(x, f.pairs[i], 0, `${p}.pairs[${i}][0]`); W.fr(f.pairs[i], 1, x[1], `${p}.pairs[${i}][1]`); });
      if (!W.mode) dupes((f.pairs || []).map(x => norm(String(x[1]), "fr")), `${w}.pairs (French side)`);
      break;
    }
    case "conjugate": {
      W.tk(e, f, "base", `${p}.base`); W.eq(e.form, f.form, `${p}.form`, "form"); W.fr(f, "label", e.label, `${p}.label`, { rich: true });
      if (W.len(e.cells, f.cells, `${p}.cells`)) e.cells.forEach((c, i) => { W.eq(c.p, f.cells[i].p, `${p}.cells[${i}].p`, "person"); W.tk(c, f.cells[i], "accept", `${p}.cells[${i}].accept`); });
      break;
    }
    case "morph": {
      for (const k of ["base", "parts", "distractors", "result"]) W.tk(e, f, k, `${p}.${k}`);
      W.fr(f, "gloss", e.gloss, `${p}.gloss`);
      break;
    }
    case "reading": {
      W.tk(e, f, "title", `${p}.title`); W.tk(e, f, "passage", `${p}.passage`);
      frGlossary(e.glossary, f.glossary, `${p}.glossary`, W);
      W.fr(f, "translation", e.translation, `${p}.translation`, { need: true });
      if (W.len(e.questions, f.questions, `${p}.questions`)) e.questions.forEach((q, i) => parityQuestion(q, f.questions[i], `${p}.questions[${i}]`, W));
      break;
    }
    case "open": {
      W.fr(f, "task", e.task, `${p}.task`, { rich: true }); W.fr(f, "checklist", e.checklist, `${p}.checklist`, { rich: true });
      for (const [k, l] of [["source", "sourceLang"], ["models", "modelsLang"]]) {
        W.eq(LANG_FR(e[l]), f[l], `${p}.${l}`, l);
        if (e[l] === "tk") W.tk(e, f, k, `${p}.${k}`); else W.fr(f, k, e[k], `${p}.${k}`);
      }
      break;
    }
  }
}
function parityQuestion(q, g, p, W) {
  W.fr(g, "q", q.q, `${p}.q`, { rich: true }); W.fr(g, "explain", q.explain, `${p}.explain`, { rich: true, need: true });
  W.eq(LANG_FR(q.optionsLang), g.optionsLang, `${p}.optionsLang`, "optionsLang");
  frOptions(q, g, "options", q.optionsLang, `${p}.options`, W);
  W.eq(q.answer, g.answer, `${p}.answer`, "answer");
}
function frGlossary(a, b, p, W) {
  if (!W.eq(!!a, !!b, p, "glossary") || !a || !W.len(a, b, p)) return;
  a.forEach((x, i) => { W.tk(x, b[i], "tk", `${p}[${i}].tk`); W.fr(b[i], "fr", x.en, `${p}[${i}].fr`); });
  if (!W.mode) dupes(b.map(x => norm(String(x.fr), "fr")), `${W.file} › ${p} (French side)`);
}

// Guides and interludes (TM-FR.md 6): the blocks with Turkmen in them are kept, in their section and in the English
// order, with identical Turkmen; the other blocks are written in French, and may be added, dropped or reordered.
const TK_BLOCKS = new Set(["examples", "paradigm", "dialogue", "parallel", "passage", "quote"]);
const tkBlock = b => !!b && (TK_BLOCKS.has(b.type) || (b.type === "table" && Array.isArray(b.cols) && b.cols.some(c => c === "tk" || c === "seg")));
function parityBlocks(eb, fb, p, W) {
  const E = (eb || []).map((b, i) => [b, i]).filter(([b]) => tkBlock(b)), F = (fb || []).map((b, i) => [b, i]).filter(([b]) => tkBlock(b));
  W.eq(E.map(([b]) => b.type), F.map(([b]) => b.type), p, "the blocks with Turkmen (examples, paradigm, dialogue, parallel, passage, quote, tables with Turkmen), in order:");
  E.forEach(([b], j) => {
    if (!F[j] || F[j][0].type !== b.type) return;
    const [f, fi] = F[j], q = `${p}[${fi}]`;
    switch (b.type) {
      case "examples":
        if (W.len(b.items, f.items, `${q}.items`)) b.items.forEach((x, k) => {
          const r = `${q}.items[${k}]`, y = f.items[k];
          W.tk(x, y, "tk", `${r}.tk`); W.tk(x, y, "seg", `${r}.seg`); W.fr(y, "fr", x.en, `${r}.fr`);
          W.fr(y, "gloss", x.gloss, `${r}.gloss`); W.fr(y, "note", x.note, `${r}.note`, { rich: true });
        });
        break;
      case "paradigm":
        W.fr(f, "title", b.title, `${q}.title`, { rich: true });
        if (W.len(b.rows, f.rows, `${q}.rows`)) b.rows.forEach((x, k) => { W.eq(x.p, f.rows[k].p, `${q}.rows[${k}].p`, "person"); W.tk(x, f.rows[k], "tk", `${q}.rows[${k}].tk`); W.fr(f.rows[k], "fr", x.en, `${q}.rows[${k}].fr`, { need: true }); });
        break;
      case "dialogue":
        if (W.len(b.lines, f.lines, `${q}.lines`)) b.lines.forEach((x, k) => { W.tk(x, f.lines[k], "who", `${q}.lines[${k}].who`); W.tk(x, f.lines[k], "tk", `${q}.lines[${k}].tk`); W.fr(f.lines[k], "fr", x.en, `${q}.lines[${k}].fr`); });
        break;
      case "parallel": W.tk(b, f, "tk", `${q}.tk`); W.fr(f, "fr", b.en, `${q}.fr`); break;
      case "passage": W.tk(b, f, "tk", `${q}.tk`); frGlossary(b.glossary, f.glossary, `${q}.glossary`, W); break;
      case "quote": W.tk(b, f, "tk", `${q}.tk`); W.fr(f, "fr", b.en, `${q}.fr`); W.fr(f, "source", b.source, `${q}.source`); W.eq(b.pd, f.pd, `${q}.pd`, "pd"); break;
      case "table": {
        if (!W.eq(b.cols.map(LANG_FR), f.cols, `${q}.cols`, "cols")) break;
        W.fr(f, "caption", b.caption, `${q}.caption`, { rich: true }); W.fr(f, "head", b.head, `${q}.head`, { rich: true });
        if (W.len(b.rows, f.rows, `${q}.rows`)) b.rows.forEach((row, r) => b.cols.forEach((c, k) => {
          const cp = `${q}.rows[${r}][${k}]`;
          if (c === "tk" || c === "seg") W.tk(row, f.rows[r], k, cp); else W.fr(f.rows[r], k, row[k], cp, { rich: c === "rich" });
        }));
        break;
      }
    }
  });
  (fb || []).forEach((f, i) => { if (!tkBlock(f)) proseBlock(f, `${p}[${i}]`, W); });
}
function proseBlock(b, q, W) {
  if (!b || typeof b !== "object") return;
  if (b.type === "p" || b.type === "callout" || b.type === "see") W.fr(b, "text", undefined, `${q}.text`, { rich: true });
  if (b.type === "callout" || b.type === "rule") W.fr(b, b.type === "rule" ? "label" : "title", undefined, `${q}.${b.type === "rule" ? "label" : "title"}`);
  if (b.type === "list") W.fr(b, "items", undefined, `${q}.items`, { rich: true });
  if (b.type === "image") { W.fr(b, "alt", undefined, `${q}.alt`); W.fr(b, "caption", undefined, `${q}.caption`, { rich: true }); W.fr(b, "credit", undefined, `${q}.credit`); }
  if (b.type === "table") { W.fr(b, "caption", undefined, `${q}.caption`, { rich: true }); W.fr(b, "head", undefined, `${q}.head`, { rich: true }); }
}

function parityFile(kind, en, fr, file, mode) {
  const W = frWalker(file, mode);
  W.file = file; W.mode = mode.sync || mode.fix;
  switch (kind) {
    case "level":
      for (const k of ["id", "cefr", "units"]) W.eq(en[k], fr[k], k, k);
      W.fr(fr, "title", en.title, "title"); W.fr(fr, "summary", en.summary, "summary", { rich: true }); W.fr(fr, "canDo", en.canDo, "canDo");
      break;
    case "unit":
      for (const k of ["id", "level", "order", "grammarPoints", "lessons", "grammar", "culture"]) W.eq(en[k], fr[k], k, k);
      W.tk(en, fr, "titleTk", "titleTk");
      W.fr(fr, "title", en.title, "title"); W.fr(fr, "summary", en.summary, "summary", { rich: true });
      W.fr(fr, "canDo", en.canDo, "canDo"); W.fr(fr, "vocabThemes", en.vocabThemes, "vocabThemes");
      break;
    case "lesson":
      for (const k of ["id", "unit", "order", "points"]) W.eq(en[k], fr[k], k, k);
      W.fr(fr, "title", en.title, "title"); W.fr(fr, "goal", en.goal, "goal");
      if (W.eq(!!en.intro, !!fr.intro, "intro", "intro") && en.intro) { W.eq(en.intro.see, fr.intro.see, "intro.see", "intro.see"); W.fr(fr.intro, "text", en.intro.text, "intro.text", { rich: true }); }
      if (W.len(en.vocab, fr.vocab, "vocab")) en.vocab.forEach((v, i) => {
        const g = fr.vocab[i]; W.tk(v, g, "tk", `vocab[${i}].tk`); W.eq(v.pos, g.pos, `vocab[${i}].pos`, "pos"); W.eq(v.card, g.card, `vocab[${i}].card`, "card"); W.fr(g, "fr", v.en, `vocab[${i}].fr`);
      });
      if (W.len(en.exercises, fr.exercises, "exercises")) en.exercises.forEach((e, i) => { if (W.eq(e.id, fr.exercises[i].id, `exercises[${i}].id`, "id")) parityExercise(e, fr.exercises[i], `exercises[${i}]`, W); });
      break;
    case "grammar":
      W.eq(en.id, fr.id, "id", "id"); W.eq(en.unit, fr.unit, "unit", "unit");
      W.fr(fr, "title", en.title, "title"); W.fr(fr, "seoTitle", en.seoTitle, "seoTitle");
      if (en.seoTitle && !fr.seoTitle && !W.mode) warn(file, "the English guide has a seoTitle: give the French one its own (with « turkmène », 10–48 characters)");
      W.fr(fr, "intro", en.intro, "intro", { rich: true }); W.fr(fr, "summary", undefined, "summary", { rich: true });
      if (W.len(en.sections, fr.sections, "sections")) en.sections.forEach((s, i) => {
        const g = fr.sections[i];
        W.eq(s.point, g.point, `sections[${i}].point`, "point"); W.fr(g, "title", s.title, `sections[${i}].title`);
        parityBlocks(s.blocks, g.blocks, `sections[${i}].blocks`, W);
      });
      break;
    case "culture":
      W.eq(en.id, fr.id, "id", "id"); W.eq(en.unit, fr.unit, "unit", "unit"); W.eq(LANG_FR(en.format), fr.format, "format", "format");
      W.fr(fr, "title", en.title, "title"); W.fr(fr, "kicker", en.kicker, "kicker");
      parityBlocks(en.blocks, fr.blocks, "blocks", W);
      frGlossary(en.vocab, fr.vocab, "vocab", W);
      if (W.len(en.questions || [], fr.questions || [], "questions")) (en.questions || []).forEach((q, i) => parityQuestion(q, fr.questions[i], `questions[${i}]`, W));
      (fr.sources || []).forEach((s, i) => { W.fr(s, "note", undefined, `sources[${i}].note`); });
      if (!W.mode) for (const s of en.sources || []) if (s.url && !(fr.sources || []).some(x => x.url === s.url)) err(file, `sources: the English source ${s.url} is missing (keep every English source, TM-FR.md 6)`);
      break;
    case "flashcards": {
      W.eq(en.deck, fr.deck, "deck", "deck"); W.eq(en.range, fr.range, "range", "range"); W.fr(fr, "source", en.source, "source");
      if (!W.eq((en.cards || []).map(c => c.id), (fr.cards || []).map(c => c.id), "cards", "the cards, in order:")) break;
      en.cards.forEach((c, i) => {
        const g = fr.cards[i], q = `cards[${i}]`;
        for (const k of ["rank", "pos", "sense", "forms", "tags", "level", "unit"]) W.eq(c[k], g[k], `${q}.${k}`, k);
        W.tk(c, g, "tk", `${q}.tk`); W.fr(g, "fr", c.en, `${q}.fr`);
        if (c.ex && g.ex) { W.tk(c.ex, g.ex, "tk", `${q}.ex.tk`); W.fr(g.ex, "fr", c.ex.en, `${q}.ex.fr`); }
        W.fr(g, "note", undefined, `${q}.note`, { rich: true });
        if (!W.mode && Array.isArray(g.fr)) dupes(g.fr.map(x => norm(x, "fr")), `${file} › ${q}.fr`);
      });
      break;
    }
  }
  return W;
}

function checkFrench(mode) {
  parseFrRegistry();
  loadFrench();
  const recs = [["level", CF.levels], ["unit", CF.units], ["lesson", CF.lessons], ["grammar", CF.grammar], ["culture", CF.culture], ["flashcards", CF.cardFiles]];
  for (const [kind, map] of recs) for (const rec of map.values()) {
    if (!rec.ok && !mode.sync && !mode.fix) continue;
    let en;
    try { en = JSON.parse(fs.readFileSync(rec.en, "utf8")); } catch (e) { err(rec.file, `the English file ${rel(rec.en)} can't be read`); continue; }
    let W;
    try { W = parityFile(kind, en, rec.v, rec.file, mode); } catch (e) { (mode.sync || mode.fix ? FSTAT.unplaced : []).push(`${rec.file}: not walked (${e.message})`); if (!mode.sync && !mode.fix) err(rec.file, `parity not checked: ${e.message}`); continue; }
    if (W.dirty) fs.writeFileSync(rec.fp, pretty(rec.v) + "\n");
  }
  if (mode.sync || mode.fix) return;
  // titles of the French registry (TM-FR.md 13)
  for (const rec of CF.levels.values()) if (rec.ok && FREG.levels.has(rec.v.id) && rec.v.title !== FREG.levels.get(rec.v.id)) err(rec.file, `title “${rec.v.title}” differs from TM-FR.md 13 “${FREG.levels.get(rec.v.id)}”`);
  for (const rec of CF.units.values()) { const r = rec.ok && FREG.units.get(rec.v.id); if (r && rec.v.title !== r.title) err(rec.file, `title “${rec.v.title}” differs from TM-FR.md 13 “${r.title}”`); }
  for (const rec of CF.grammar.values()) { const r = rec.ok && FREG.units.get(rec.v.unit); if (r && rec.v.title !== r.title) err(rec.file, `title “${rec.v.title}” should be the unit's French title “${r.title}” (TM-FR.md 13)`); }
  for (const rec of CF.culture.values()) { const r = rec.ok && FREG.units.get(rec.v.unit); if (r && rec.v.title !== r.interlude) err(rec.file, `title “${rec.v.title}” differs from TM-FR.md 13 “${r.interlude}”`); }
  // a French unit, once its unit file exists, has its lessons, guide and interlude in French (10.2)
  for (const rec of CF.units.values()) {
    if (!rec.ok) continue;
    const id = rec.v.id;
    for (const l of rec.v.lessons) if (!CF.lessons.has(l)) err(rec.file, `lesson ${l} is missing in French (fr/lessons/${l}.json)`);
    if (!CF.grammar.has(id)) err(rec.file, `grammar guide is missing in French (fr/grammar/${id}.json)`);
    if (!CF.culture.has(id)) err(rec.file, `interlude is missing in French (fr/culture/${id}.json)`);
  }
  for (const [kind, map] of [["lesson", CF.lessons], ["grammar", CF.grammar], ["culture", CF.culture]]) for (const [id, rec] of map) {
    const u = unitOf(id);
    if (!CF.units.has(u)) err(rec.file, `the French unit file fr/units/${u}.json is missing`);
  }
  for (const rec of CF.levels.values()) if (rec.ok) for (const u of rec.v.units) if (!C.units.has(u)) warn(rec.file, `${u} has no English unit file yet`);
  // fr-tk prompts: no two cards with the same first French gloss (TM-FR.md 8.4)
  const first = new Map();
  for (const { c, file } of CF.cards.values()) {
    if (!Array.isArray(c.fr) || !c.fr.length) continue;
    const k = norm(c.fr[0], "fr");
    if (first.has(k)) warn(`${file} › ${c.id}`, `first gloss “${c.fr[0]}” is also ${first.get(k)}'s: add a hint in brackets for the French → Turkmen prompt (TM-FR.md 8.4)`);
    else first.set(k, c.id);
  }
  checkStrings(mode);
}

// ── interface strings (TM-FR.md 4.4, 10.2) ──
// Placeholders the code passes that the English string doesn't show: French writes the hours on the 24-hour clock.
const EXTRA_VARS = { "common.hour.am": ["H"], "common.hour.pm": ["H"] };
const isPlural = v => !!v && typeof v === "object" && !Array.isArray(v);
const varsOf = v => new Set([...(isPlural(v) ? Object.values(v).join(" ") : String(v)).matchAll(/\{(\w+)\}/g)].map(m => m[1]));
const tagsOf = v => [...(isPlural(v) ? Object.values(v).join(" ") : String(v)).matchAll(/<[^>]+>/g)].map(m => m[0].replace(/\blang="(?:en|fr)"/, 'lang=""')).sort();
function readJson(fp) {
  if (!fs.existsSync(fp)) { err(rel(fp), "missing"); return null; }
  try { return JSON.parse(fs.readFileSync(fp, "utf8")); } catch (e) { err(rel(fp), `invalid JSON: ${e.message}`); return null; }
}
function checkStrings(mode) {
  const enPath = path.join(I18N, "en.json"), frPath = path.join(I18N, "fr.json");
  const en = readJson(enPath), fr = readJson(frPath);
  if (!en || !fr) return;
  const label = rel(frPath);
  if (mode && mode.fix) {
    let n = 0;
    for (const k of Object.keys(fr)) {
      if (k.startsWith("_")) continue;
      const fix = s => { const f = frFix(s); if (f !== s) n++; return f; };
      fr[k] = isPlural(fr[k]) ? Object.fromEntries(Object.entries(fr[k]).map(([f, s]) => [f, fix(s)])) : typeof fr[k] === "string" ? fix(fr[k]) : fr[k];
    }
    if (n) { fs.writeFileSync(frPath, JSON.stringify(fr, null, 2) + "\n"); FSTAT.fixed.push(`${label} (${n} string(s))`); }
    return;
  }
  if (typeof fr._live !== "boolean") err(label, "“_live” must be true or false (TM-FR.md 3.4)");
  for (const k of Object.keys(en)) {
    if (k.startsWith("_")) continue;
    FSTAT.keys++;
    const e = en[k], f = fr[k], w = `${label} › ${k}`;
    if (f === undefined) { err(w, "missing: the French pages show the English string"); continue; }
    let ok = true;
    if (isPlural(e) || isPlural(f)) {
      if (!isPlural(f) || typeof f.one !== "string" || typeof f.other !== "string") { err(w, "a count needs “one” and “other” (French reads 0 and 1 as one)"); ok = false; }
    } else if (typeof f !== "string") { err(w, "should be a string"); ok = false; }
    if (!ok) continue;
    const ve = varsOf(e), vf = varsOf(f), extra = new Set(EXTRA_VARS[k] || []);
    for (const x of vf) if (!ve.has(x) && !extra.has(x)) { err(w, `placeholder {${x}} that the English string doesn't have`); ok = false; }
    if (!extra.size) for (const x of ve) if (!vf.has(x)) { err(w, `placeholder {${x}} is missing`); ok = false; }
    if (k.endsWith(".html")) { if (!same(tagsOf(e), tagsOf(f))) { err(w, "its markup differs from the English string's (the same tags and attributes; lang=\"fr\" for lang=\"en\")"); ok = false; } }
    else if (/<\/?[a-z][^>]*>/i.test(isPlural(f) ? Object.values(f).join(" ") : f)) { err(w, "markup in a plain string: only keys ending in .html hold markup"); ok = false; }
    for (const s of isPlural(f) ? Object.values(f) : [f]) {
      if (s !== s.normalize("NFC")) err(w, "text is not NFC-normalized");
      if (/[\u0000-\u0009\u000b-\u001f]/.test(s)) err(w, "contains a control character");
      frTypo(s, w); untranslated(s, isPlural(e) ? undefined : e, w);
    }
    if (ok) FSTAT.strings++;
  }
  for (const k of Object.keys(fr)) if (!k.startsWith("_") && !(k in en)) warn(`${label} › ${k}`, "not in en.json: no page reads it");
}

// ── fr/index.json: the English shape, with the French titles (TM-FR.md 5.1) ──
function buildIndexFr() {
  const files = [...CF.files].sort((a, b) => a[0].localeCompare(b[0])), h = crypto.createHash("sha1");
  for (const [f, raw] of files) h.update(f + "\0" + raw + "\0");
  let nLessons = 0, nEx = 0;
  const ok = (m, id) => { const r = m.get(id); return r && r.ok ? r : null; };
  const levels = LEVELS.filter(id => REG.levels.has(id)).map(id => {
    const r = REG.levels.get(id);
    return {
      id, cefr: r.cefr, title: FREG.levels.get(id) || r.title, ready: !!ok(CF.levels, id),
      units: r.units.map(uid => {
        const u = REG.units.get(uid), f = FREG.units.get(uid) || {}, uf = ok(CF.units, uid);
        const o = { id: uid, title: f.title || u.title, titleTk: u.titleTk, batch: u.batch, status: uf ? "ready" : "planned", interlude: f.interlude || u.interlude, points: u.points };
        if (uf) o.lessons = uf.v.lessons.map(lid => {
          const l = ok(CF.lessons, lid), n = l ? l.v.exercises.length : 0;
          nLessons++; nEx += n;
          return { id: lid, title: l ? l.v.title : "", exercises: n };
        });
        return o;
      }),
    };
  });
  const points = {};
  for (const [gp, r] of REG.points) {
    const g = ok(CF.grammar, r.unit), sec = g && g.v.sections.find(s => s.point === gp);
    points[gp] = { unit: r.unit, label: sec ? sec.title : "Bientôt disponible", ready: !!(ok(CF.units, r.unit) && sec) };
  }
  const cardFiles = [...CF.cardFiles.keys()].filter(f => CF.cardFiles.get(f).ok).sort().map(f => f.replace(/^assets\/data\/turkmen\/fr\//, ""));
  return {
    version: h.digest("hex").slice(0, 10), levels, points,
    flashcards: { files: cardFiles, count: CF.cards.size },
    counts: { units: [...CF.units.values()].filter(u => u.ok).length, lessons: nLessons, exercises: nEx, cards: CF.cards.size },
  };
}

// --batch with --lang fr: the English batch IDs and the names of TM-FR-PROMPTS.md (TM-FR.md 10.1)
const FR_BATCHES = { "FR-FC-1": ["FC-1", "FC-2", "FC-3"], "FR-FC-2": ["FC-4", "FC-5"] };
function runBatchFr(name) {
  const ids = FR_BATCHES[name] || [name.replace(/^FR-/, "")], lines = [];
  for (const id of ids) {
    const b = REG.batches.get(id);
    if (!b) { err("--batch", `unknown batch ${name} (A1-1…B1-5, FC-1…FC-5, or FR-A1-1…FR-B1-5, FR-FC-1, FR-FC-2)`); continue; }
    if (b.units) for (const uid of b.units) {
      const missing = [], u = CF.units.get(uid), eu = C.units.get(uid);
      if (!u) missing.push(`fr/units/${uid}.json`);
      for (const l of u && u.ok ? u.v.lessons : eu && eu.ok ? eu.v.lessons : []) if (!CF.lessons.has(l)) missing.push(`fr/lessons/${l}.json`);
      if (!CF.grammar.has(uid)) missing.push(`fr/grammar/${uid}.json`);
      if (!CF.culture.has(uid)) missing.push(`fr/culture/${uid}.json`);
      const bad = issues.some(x => x.level === "error" && x.where.includes(`/fr/`) && x.where.includes(uid));
      if (missing.length) err(`French batch ${name}`, `${uid} is not all in French yet: missing ${missing.join(", ")}`);
      lines.push(`  ${uid}  ${missing.length ? `${missing.length} file(s) to write` : bad ? "complete, with errors" : "complete"}`);
    } else {
      const [a, z] = b.range, f = `assets/data/turkmen/fr/flashcards/tm-fc-${String(a).padStart(4, "0")}-${String(z).padStart(4, "0")}.json`, rec = CF.cardFiles.get(f);
      if (!rec || !rec.ok) err(`French batch ${name}`, `${f} is missing or invalid`);
      lines.push(`  ${f}  ${rec && rec.ok ? `${rec.v.cards.length}/${z - a + 1} cards` : "missing"}`);
    }
  }
  return lines;
}
// --vocab with --lang fr: the French glosses of each lesson's words, and a lesson's gloss among its card's (TM-FR.md 8.4)
function runVocabFr() {
  for (const uid of REG.order) {
    const u = CF.units.get(uid);
    if (!u || !u.ok) continue;
    console.log(`\n${uid} · ${u.v.title}`);
    for (const lid of u.v.lessons) {
      const l = CF.lessons.get(lid);
      if (!l || !l.ok) continue;
      console.log(`  ${lid}: ${l.v.vocab.map(x => `${x.tk} = ${x.fr}`).join(" · ") || "(no new words)"}`);
      l.v.vocab.forEach((x, i) => {
        const k = x.card && CF.cards.get(x.card);
        if (k && Array.isArray(k.c.fr) && !k.c.fr.some(g => norm(g, "fr") === norm(x.fr, "fr"))) warn(`${l.file} › vocab[${i}].fr`, `“${x.fr}” is not among the French glosses of ${x.card} (${k.c.fr.join("; ")})`);
      });
    }
  }
}
// the counts of the summary line without validating the French tree (for --progress)
function frCount() {
  const dir = k => (fs.existsSync(path.join(FR_DATA, k)) ? fs.readdirSync(path.join(FR_DATA, k)).filter(f => f.endsWith(".json")) : []);
  for (const f of dir("units")) CF.units.set(f.replace(/\.json$/, ""), { ok: true });
  for (const f of dir("flashcards")) { try { for (const c of JSON.parse(fs.readFileSync(path.join(FR_DATA, "flashcards", f), "utf8")).cards || []) CF.cards.set(c.id, { c }); } catch (e) { /* counted as none */ } }
  let en = {}, fr = {};
  try { en = JSON.parse(fs.readFileSync(path.join(I18N, "en.json"), "utf8")); fr = JSON.parse(fs.readFileSync(path.join(I18N, "fr.json"), "utf8")); } catch (e) { /* none */ }
  for (const k of Object.keys(en)) if (!k.startsWith("_")) { FSTAT.keys++; if (k in fr) FSTAT.strings++; }
}
function frSummary() {
  const units = [...CF.units.values()].filter(u => u.ok).length;
  return `French: ${units} of ${REG.units.size} units translated, ${CF.cards.size.toLocaleString("en-CA")} of 1,000 cards; interface strings: ${FSTAT.strings.toLocaleString("en-CA")} of ${FSTAT.keys.toLocaleString("en-CA")}`;
}

// ─────────────────────────── modes ───────────────────────────
function runExamples() {
  const label = rel(PROJECT);
  if (!fs.existsSync(PROJECT)) { err(label, "missing"); return 0; }
  const text = fs.readFileSync(PROJECT, "utf8");
  if (/\{\{|\{%/.test(text)) err(label, "contains a Liquid tag opener (two opening braces, or brace + percent), which breaks the Jekyll build");
  const re = /^```json (\w+)\n([\s\S]*?)^```$/gm;
  let m, n = 0;
  while ((m = re.exec(text))) {
    const kind = m[1], line = text.slice(0, m.index).split("\n").length;
    const where = `${label}:${line} (${kind} example)`;
    n++;
    if (!SCHEMA[kind]) { err(where, `unknown example kind “${kind}”`); continue; }
    let v;
    try { v = JSON.parse(m[2]); } catch (e) { err(where, `invalid JSON: ${e.message}`); continue; }
    const ok = validate(kind, v, where, { examples: true });
    if (!ok) continue;
    const cx = { examples: true };
    if (kind === "level") checkLevel({ v, file: where });
    if (kind === "unit") checkUnit({ v, file: where }, cx);
    if (kind === "lesson") checkLesson({ v, file: where }, cx);
    if (kind === "exercise") checkExercise(v, where, unitOf(v.id), cx);
    if (kind === "block") checkBlocks([v], where, cx);
    if (kind === "grammar") checkGrammar({ v, file: where }, cx);
    if (kind === "culture") checkCulture({ v, file: where }, cx);
    if (kind === "flashcards") checkFlashFile({ v, file: where }, cx);
  }
  if (!n) err(label, "no ```json <kind> examples found");
  return n;
}

function runProgress(file) {
  const fp = path.resolve(file);
  if (!fs.existsSync(fp)) { err(file, "file not found"); return; }
  let v;
  try { v = JSON.parse(fs.readFileSync(fp, "utf8")); } catch (e) { err(file, `invalid JSON: ${e.message}`); return; }
  if (v && v.app === "gregoiremaillard.com/turkish") { err(file, "this is a Daily Turkish progress file, not a Daily Turkmen one"); return; }
  validate("progress", v, file);
}

function runBatch(id) {
  const b = REG.batches.get(id);
  const lines = [];
  if (!b) { err("--batch", `unknown batch ${id} (content batches A1-1…B1-5, flashcard batches FC-1…FC-5)`); return lines; }
  if (b.units) {
    for (const uid of b.units) {
      const missing = [];
      const u = C.units.get(uid);
      if (!u) missing.push(`units/${uid}.json`);
      else if (u.ok) for (const l of u.v.lessons) if (!C.lessons.has(l)) missing.push(`lessons/${l}.json`);
      if (!C.grammar.has(uid)) missing.push(`grammar/${uid}.json`);
      if (!C.culture.has(uid)) missing.push(`culture/${uid}.json`);
      const bad = issues.some(x => x.level === "error" && x.where.includes(uid));
      if (missing.length) err(`batch ${id}`, `${uid} is incomplete: missing ${missing.join(", ")}`);
      lines.push(`  ${uid}  ${missing.length ? "incomplete" : bad ? "complete, with errors" : "complete"}${u && u.ok ? `  (${u.v.lessons.length} lessons, ${u.v.lessons.reduce((n, l) => n + (C.lessons.get(l)?.v?.exercises?.length || 0), 0)} exercises)` : ""}`);
    }
  } else {
    const [a, z] = b.range;
    const f = `assets/data/turkmen/flashcards/tm-fc-${String(a).padStart(4, "0")}-${String(z).padStart(4, "0")}.json`;
    const rec = C.cardFiles.get(f);
    if (!rec || !rec.ok) err(`batch ${id}`, `${f} is missing or invalid`);
    else {
      const have = new Set(rec.v.cards.map(c => c.rank));
      const miss = [];
      for (let r = a; r <= z; r++) if (!have.has(r)) miss.push(r);
      if (miss.length) err(`batch ${id}`, `${miss.length} ranks missing (first: ${miss.slice(0, 8).join(", ")})`);
      lines.push(`  ${f}  ${rec.v.cards.length}/${z - a + 1} cards`);
    }
  }
  return lines;
}

function runVocab() {
  const firstSeen = new Map();
  for (const uid of REG.order) {
    const u = C.units.get(uid);
    if (!u || !u.ok) continue;
    console.log(`\n${uid} · ${u.v.title}`);
    for (const lid of u.v.lessons) {
      const l = C.lessons.get(lid);
      if (!l || !l.ok) continue;
      const ws = l.v.vocab.map(x => {
        const k = x.tk.toLowerCase();
        const again = firstSeen.has(k) ? ` (again; first in ${firstSeen.get(k)})` : "";
        if (!firstSeen.has(k)) firstSeen.set(k, lid);
        return `${x.tk} = ${x.en}${again}`;
      });
      console.log(`  ${lid}: ${ws.join(" · ") || "(no new words)"}`);
    }
  }
  console.log(`\n${firstSeen.size} words taught so far.`);
}

// ─────────────────────────── main ───────────────────────────
parseCurriculum();
let summary = "", enHidden = null;
const french = opt.lang !== "en", english = opt.lang !== "fr";
if (opt.examples) {
  const n = runExamples();
  summary = `${n} examples in ${rel(PROJECT)}`;
} else if (opt.progress) {
  runProgress(opt.progress);
  summary = `progress file ${opt.progress}`;
  if (french) { frCount(); summary += ` · ${frSummary()}`; }
} else {
  loadContent();   // the English edition, which the French one is checked against
  const cx = { examples: false };
  for (const rec of C.cardFiles.values()) if (rec.ok) checkFlashFile(rec, cx);
  checkCardsGlobal();
  for (const rec of C.levels.values()) if (rec.ok) checkLevel(rec);
  for (const rec of C.units.values()) if (rec.ok) checkUnit(rec, cx);
  for (const rec of C.lessons.values()) if (rec.ok) checkLesson(rec, cx);
  for (const rec of C.grammar.values()) if (rec.ok) checkGrammar(rec, cx);
  for (const rec of C.culture.values()) if (rec.ok) checkCulture(rec, cx);
  for (const f of deferred) f();
  const nEx = [...C.lessons.values()].reduce((n, l) => n + (l.ok ? l.v.exercises.length : 0), 0);
  summary = `registry ${REG.levels.size} levels, ${REG.units.size} units, ${REG.points.size} grammar points · content ${C.levels.size} levels, ${C.units.size} units, ${C.lessons.size} lessons (${nEx} exercises), ${C.grammar.size} guides, ${C.culture.size} interludes, ${C.cards.size} cards · morphology engine: ${MSTAT.cells} cells of ${MSTAT.conjChecked}/${MSTAT.conj} conjugate exercises, ${MSTAT.morphChecked}/${MSTAT.morph} morph exercises, ${MSTAT.cardForms} forms on ${MSTAT.cards} cards`;
  let batchLines = [];
  if (english) {
    if (opt.vocab) runVocab();
    if (opt.batch && !/^FR-/.test(opt.batch)) batchLines = runBatch(opt.batch);
    // index.json
    const idxPath = path.join(DATA, "index.json");
    const idx = pretty(buildIndex()) + "\n";
    const onDisk = fs.existsSync(idxPath) ? fs.readFileSync(idxPath, "utf8") : null;
    if (opt.index) {
      if (issues.some(x => x.level === "error")) console.log("index.json not written: fix the errors first.");
      else if (onDisk === idx) console.log("index.json already up to date.");
      else { fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(idxPath, idx); console.log(`index.json written (version ${JSON.parse(idx).version}).`); }
    } else if (onDisk !== idx && (C.files.length || onDisk !== null) && !issues.some(x => x.level === "error")) {
      // only once everything else is clean, since --index refuses to write while there are errors
      err(rel(idxPath), onDisk === null ? "missing: run with --index" : "out of date: run with --index");
    }
  } else {
    // --lang fr reports the French edition only; the English issues are counted on one line (run without --lang)
    enHidden = issues.splice(0).filter(x => !isFr(x.where));
  }
  if (french) {
    if (opt.sync || opt.fix) {
      checkFrench({ sync: opt.sync, fix: opt.fix });
      if (opt.fix) checkStrings({ fix: true });
      if (opt.sync) {
        console.log(FSTAT.synced.length ? `--sync copied the English Turkmen into ${FSTAT.synced.length} French field(s):\n${FSTAT.synced.map(x => "  " + x).join("\n")}` : "--sync: every Turkmen field of the French files is already the English one.");
        if (FSTAT.unplaced.length) console.log(`Not placed (the structure differs from the English file; fix by hand):\n${FSTAT.unplaced.map(x => "  " + x).join("\n")}`);
      }
      if (opt.fix) console.log(FSTAT.fixed.length ? `--fix rewrote the typography of ${FSTAT.fixed.length} French field(s):\n${FSTAT.fixed.map(x => "  " + x).join("\n")}` : "--fix: nothing to change.");
      console.log("Now run validate.mjs --lang fr.");
      summary = "French edition";
    } else {
      checkFrench({});
      if (opt.vocab) runVocabFr();
      if (opt.batch && (/^FR-/.test(opt.batch) || opt.lang === "fr")) batchLines = batchLines.concat(runBatchFr(opt.batch));
      const frIdx = path.join(FR_DATA, "index.json"), idx = pretty(buildIndexFr()) + "\n";
      const onDisk = fs.existsSync(frIdx) ? fs.readFileSync(frIdx, "utf8") : null;
      const frErrors = () => issues.some(x => x.level === "error" && isFr(x.where));
      if (opt.index) {
        if (frErrors()) console.log("fr/index.json not written: fix the errors first.");
        else if (onDisk === idx) console.log("fr/index.json already up to date.");
        else { fs.mkdirSync(FR_DATA, { recursive: true }); fs.writeFileSync(frIdx, idx); console.log(`fr/index.json written (version ${JSON.parse(idx).version}).`); }
      } else if (onDisk !== idx && (CF.files.length || onDisk !== null) && !frErrors()) err(rel(frIdx), onDisk === null ? "missing: run with --lang fr --index" : "out of date: run with --lang fr --index");
      summary = (opt.lang === "fr" ? "" : summary + " · ") + frSummary();
    }
  }
  if (batchLines.length) console.log(`Batch ${opt.batch}:\n${batchLines.join("\n")}`);
}

const errors = issues.filter(x => x.level === "error"), warnings = issues.filter(x => x.level === "warn");
for (const x of errors) console.log(`ERROR  ${x.where}: ${x.msg}`);
if (!opt.quiet) for (const x of warnings) console.log(`warn   ${x.where}: ${x.msg}`);
if (MSTAT.notModelled.length && !opt.quiet) console.log(`Not modelled by the morphology engine, so not checked: ${MSTAT.notModelled.join(", ")}`);
if (enHidden && enHidden.length) {
  const e = enHidden.filter(x => x.level === "error").length;
  console.log(`English edition: ${e} error(s), ${enHidden.length - e} warning(s); run without --lang to see them.`);
}
console.log(`\nTurkmen course · ${summary}`);
const fail = errors.length || (opt.strict && warnings.length);
console.log(fail ? `${errors.length} error(s), ${warnings.length} warning(s).` : `All checks passed${warnings.length ? ` (${warnings.length} warning(s)${opt.quiet ? ", hidden" : ""})` : ""}.`);
process.exit(fail ? 1 : 0);
