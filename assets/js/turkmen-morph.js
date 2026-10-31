/* © 2026 Grégoire Maillard. All rights reserved. Not open source: see /LICENSE.txt */
/* Daily Turkmen: a rule-based morphology engine for written Turkmen, see turkmen/TM-PROJECT.md section 3 (TK-MORPH).

   It builds written Turkmen words from a stem and suffixes, and conjugates the finite forms A1 and A2 teach
   (turkmen/TM-CURRICULUM.md, coverage tables), positive, negative and question. scripts/turkmen/validate.mjs
   checks the `conjugate` and `morph` exercises and the forms on the flashcards against it, and
   scripts/turkmen/morph-test.mjs tests it on forms typed by hand. Loaded as a classic script it exposes
   window.TKMMorph (and TKM.morph when turkmen.js has already run); in Node, require() returns the same object.
   It loads nothing from the Turkish course (TM-PROJECT.md 2).

     1. Letters and sounds: the nine vowels, front/back harmony, the rounding rule
     2. Lexicon: voicing (long-vowel monosyllables, homographs, words that keep their consonant), vowel loss,
        the verbs that voice t to d, loanwords whose rounding is unsure, pronouns
     3. Words and suffixes: attach(), with linking vowels, buffer letters, voicing, vowel loss, e → ä
     4. Nouns, pronouns and nominal predicates: plural, possessives, the five cases, -kY, the copula
     5. Verbs: -ýAr, -dY, -jAk, -Ar, -mAlY, -(Y)p, the moods, the helpers bilmek, otyr, dur, ýatyr, ýör
     6. Forms by name: the slugs that `conjugate` exercises use
     7. Analysis: which suffixes a sequence of morph tiles stands for, or what the engine builds instead

   Suffix notation (TM-CURRICULUM.md): A = a/e, Ä = a/ä (-ýÄr, -rÄk), Y = y/i (u/ü where the rounding rule
   applies); (Y) and (A) are linking vowels used after a consonant, (n) and (s) buffer letters used after a
   vowel. Persons are "men" … "olar" or 0 … 5. No dependencies, no build step. */
(function (root, factory) {
  var M = factory();
  if (typeof module === "object" && module.exports) module.exports = M;
  if (root && root.document) { root.TKMMorph = M; if (root.TKM) root.TKM.morph = M; }
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  // ───────────────────────────── 1. letters and sounds ─────────────────────────────
  // y is a vowel and ý a consonant; ä is the open front vowel. Back: a, o, u, y. Rounded: o, ö, u, ü.
  var VOWELS = "aeäiyoöuü", BACK = "aouy", ROUND = "oöuü";
  var PERSONS = ["men", "sen", "ol", "biz", "siz", "olar"];

  // Turkmen has no dotted and dotless i pair, so plain toLowerCase() is right (TM-PROJECT.md 6.4)
  function lower(s) { return String(s).normalize("NFC").toLowerCase(); }
  function letters(s) { return lower(s).replace(/[^a-zäçňöşüýž]/g, ""); }
  function isV(c) { return !!c && VOWELS.indexOf(c) >= 0; }
  function lastV(s) { s = letters(s); for (var i = s.length - 1; i >= 0; i--) if (isV(s[i])) return s[i]; return null; }
  function syllables(s) { return (letters(s).match(/[aeäiyoöuü]/g) || []).length; }
  function front(v) { return BACK.indexOf(v) < 0; }
  // A: a after a back vowel, e after a front one; Y: y or i, rounded later by the rounding rule
  function harmA(v) { return v && !front(v) ? "a" : "e"; }
  function harmY(v) { return v && !front(v) ? "y" : "i"; }
  function harmAe(v) { return v && !front(v) ? "a" : "ä"; }      // Ä: a or ä, in -ýÄr (gelýär) and -rÄk (kiçiräk)
  function roundV(c) { return c === "y" ? "u" : c === "i" ? "ü" : c; }
  function unroundV(c) { return c === "u" ? "y" : c === "ü" ? "i" : c; }
  function dots(s) { return new Array(s.length + 1).join("."); }
  function lastWord(s) { var a = String(s).trim().split(/\s+/); return a[a.length - 1]; }
  function personIndex(p) { return typeof p === "number" ? (p >= 0 && p < 6 ? p : -1) : PERSONS.indexOf(p); }

  // The rounding rule (gp-harmony-rounding; TM-CURRICULUM.md, open question 1). A high vowel that a suffix brings,
  // or a stem's final y or i once a suffix follows it, is u or ü when it is the vowel of the second syllable and the
  // first syllable has o, ö, u or ü, unless it is the last letter of the word: gözüm, öýüne, boldum, bolup, gowurak,
  // but gözi, ogly, boldy, gowy. From the third syllable on it is y or i: ýurdumyz, öýümiz, bolupdyr, okuwçy.
  // The question particle -mY is written attached and counts as part of the word (gowumy), but its own vowel
  // never rounds (ýokmydy). Stem vowels are spelt as they are (uzyn, otyr).

  // ───────────────────────────── 2. lexicon ─────────────────────────────
  // Every list is about the written standard. Add words here (with a test) when the validator finds a gap.
  var LEX = {
    // one-syllable words whose final k, p, ç or t voices before a vowel because their vowel is long (adym, ýadyma,
    // ýurdumyz, dördünji, gögümtik); other one-syllable words keep it (atym "my horse", saçym, topy)
    voice: { "ýat": "ýad", "ýurt": "ýurd", "dört": "dörd", "gök": "gög" },
    // the same spelling for a long-vowel word and a short one: sense 1, 2 as in scripts/turkmen/tm-wordlist.tsv
    homographs: { at: [["name", "ad"], ["horse", null]], ot: [["fire", "od"], ["grass", null]] },
    // words of two or more syllables in -t voice only from this list (Aşgabady, umydy); most keep it (döwleti,
    // jemgyýeti, suraty). Words of two or more syllables in -k, -p, -ç voice (kitaby, çöregi, agajy) unless in keep.
    tVoice: ["aşgabat", "umyt", "ýigit"],
    keep: ["tarap"],
    // vowel loss before a vowel: ogly, burnum, agzy, göwnüm
    drop: {
      ogul: "ogl", burun: "burn", agyz: "agz", "boýun": "boýn", garyn: "garn", "göwün": "göwn", "köňül": "köňl",
      "ömür": "ömr", "döwür": "döwr", ylym: "ylm", nesil: "nesl", sabyr: "sabr", bagyr: "bagr"
    },
    // the closed list of verbs whose final t becomes d before a vowel and before -ýAr (gidýär, gidip, gider, but
    // gitdi, gitjek); every other verb keeps its consonant (satýar, tutup, çykar). Compounds follow their last word.
    verbSoft: { git: "gid", et: "ed", "aýt": "aýd", "gaýt": "gaýd", seret: "sered", "eşit": "eşid", "äkit": "äkid", "öýt": "öýd" },
    // one-syllable loanwords: the rounding rule gives stoluň, the spelling stolyň is also accepted (open question 1)
    loanRound: ["stol", "sport", "klub", "tort", "kod", "gol", "port", "post", "front", "kort", "forum"],
    // the posture verbs that make the progressive after -(Y)p, in the form they take endings (otyryn, durun)
    posture: { otyr: "otyr", dur: "dur", "ýatyr": "ýatyr", "ýör": "ýör" }
  };
  // Pronouns and demonstratives: their case forms are written out (maňa, oňa, muny), cut where the endings start.
  var PRON = {
    men: { acc: ["men", "i"], dat: ["ma", "ň", "a"], loc: ["men", "de"], abl: ["men", "den"], gen: ["men", "iň"] },
    sen: { acc: ["sen", "i"], dat: ["sa", "ň", "a"], loc: ["sen", "de"], abl: ["sen", "den"], gen: ["sen", "iň"] },
    ol: { acc: ["o", "n", "y"], dat: ["o", "ň", "a"], loc: ["o", "n", "da"], abl: ["o", "n", "dan"], gen: ["o", "n", "uň"], pl: ["o", "lar"] },
    biz: { acc: ["biz", "i"], dat: ["biz", "e"], loc: ["biz", "de"], abl: ["biz", "den"], gen: ["biz", "iň"] },
    siz: { acc: ["siz", "i"], dat: ["siz", "e"], loc: ["siz", "de"], abl: ["siz", "den"], gen: ["siz", "iň"] },
    bu: { acc: ["mu", "n", "y"], dat: ["mu", "ň", "a"], loc: ["mu", "n", "da"], abl: ["mu", "n", "dan"], gen: ["mu", "n", "uň"], pl: ["bu", "lar"] },
    "şu": { acc: ["şu", "n", "y"], dat: ["şu", "ň", "a"], loc: ["şu", "n", "da"], abl: ["şu", "n", "dan"], gen: ["şu", "n", "uň"], pl: ["şu", "lar"] },
    "şol": { acc: ["şo", "n", "y"], dat: ["şo", "ň", "a"], loc: ["şo", "n", "da"], abl: ["şo", "n", "dan"], gen: ["şo", "n", "uň"], pl: ["şo", "lar"] }
  };

  function senseIndex(list, sense) {
    if (typeof sense === "number") return sense >= 1 && sense <= list.length ? sense - 1 : 0;
    for (var i = 0; i < list.length; i++) if (list[i][0] === sense) return i;
    return 0;
  }
  function voiced(s) { var r = { p: "b", "ç": "j", t: "d", k: "g" }[s.slice(-1)]; return r ? s.slice(0, -1) + r : undefined; }
  // the stem a noun uses before a vowel, or undefined when it doesn't change
  function nounLex(stem, sense) {
    var k = lower(stem), lex = {}, alt;
    if (LEX.drop[k]) alt = LEX.drop[k];
    else if (LEX.homographs[k]) { var h = LEX.homographs[k], i = senseIndex(h, sense); alt = h[i][1] || undefined; lex.sense = i + 1; }
    else if (LEX.voice[k]) alt = LEX.voice[k];
    else if (syllables(k) > 1 && LEX.keep.indexOf(k) < 0 && (k.slice(-1) !== "t" || LEX.tVoice.indexOf(k) >= 0)) alt = voiced(k);
    if (alt) lex.alt = stem.charAt(0) + alt.slice(1);      // keep a capital: Aşgabat → Aşgabady
    if (LEX.loanRound.indexOf(k) >= 0) lex.loanRound = true;
    if (PRON[k]) lex.pron = k;
    return lex;
  }
  function verbLex(stem) { var lex = {}; if (LEX.verbSoft[lower(stem)]) lex.alt = LEX.verbSoft[lower(stem)]; return lex; }

  // ───────────────────────────── 3. words and suffixes ─────────────────────────────
  // A word is a list of parts (stem, buffer letters, suffixes), so it can be shown segmented: öý|üm|iz.
  // Each part keeps a mask that marks the vowels the rounding rule may change ("r"); text() applies the rule.
  // pre holds the words before the inflected one (pikir in "pikir edýärin"), which never change.
  function mk(stem, o) {
    o = o || {};
    var m = dots(stem);
    if ((o.cat || "n") === "n" && /[yi]$/.test(lower(stem))) m = m.slice(0, -1) + "r";   // gowy → gowurak
    return { pre: o.pre || "", parts: [{ t: stem, k: "stem", m: m }], cat: o.cat || "n", lemma: o.lemma || stem,
             lex: o.lex || {}, proper: !!o.proper, f: {} };
  }
  function clone(w) {
    var f = {}, k;
    for (k in w.f) f[k] = w.f[k];
    return { pre: w.pre, parts: w.parts.map(function (p) { return { t: p.t, k: p.k, id: p.id, m: p.m, soft: p.soft }; }),
             cat: w.cat, lemma: w.lemma, lex: w.lex, proper: w.proper, f: f };
  }
  function lastPart(w) { return w.parts[w.parts.length - 1]; }
  function rootOnly(w) { return w.parts.length === 1; }
  function lit(s) { return mk(s, { cat: "x", lemma: s }); }   // a word that takes no suffix here (däl, bilen)

  // The letters of each part after the rounding rule. o.clitic false: the rule ends the word before -mY;
  // o.noRound: a loanword of LEX.loanRound, spelt without rounding.
  function renderParts(w, o) {
    o = o || {};
    var s = "", m = "", q = -1, i;
    for (i = 0; i < w.parts.length; i++) {
      var p = w.parts[i];
      if (p.k === "q" && q < 0) q = s.length;
      s += p.t; m += p.m || dots(p.t);
    }
    var low = lower(s), end = o.clitic === false && q >= 0 ? q : s.length, n = 0, fv = null, out = "";
    var noRound = o.noRound && w.lex.loanRound;
    for (i = 0; i < s.length; i++) {
      var c = s.charAt(i), lc = low.charAt(i);
      if (isV(lc)) {
        n++;
        if (n === 1) fv = lc;
        if (m.charAt(i) === "r") {
          var t = n === 2 && ROUND.indexOf(fv) >= 0 && i < end - 1 && !noRound ? roundV(lc) : unroundV(lc);
          c = c === lc ? t : t.toUpperCase();
        }
      }
      out += c;
    }
    var res = [], k = 0;
    for (i = 0; i < w.parts.length; i++) { res.push(out.slice(k, k + w.parts[i].t.length)); k += w.parts[i].t.length; }
    return res;
  }
  function text(w, o) { return w.pre + renderParts(w, o).join(""); }
  function segOf(w, o) { return w.pre + renderParts(w, o).filter(Boolean).join("|"); }
  function body(w) { return text(w).slice(w.pre.length); }

  // A vowel is about to follow: the stem changes if it can (kitap → kitab, ogul → ogl, git → gid; -lYk → -lYg).
  // Verbs of LEX.verbSoft also change before -ýAr (gidýär).
  function alternate(w, vfirst) {
    var p = lastPart(w);
    if (p.k === "stem") {
      if (!w.lex.alt || p.t !== w.lemma || (w.cat !== "v" && !vfirst)) return;
      p.t = w.lex.alt; p.m = dots(p.t);
    } else if (p.soft && vfirst) {
      var r = voiced(p.t);
      if (r) p.t = r;
    }
  }
  // e → ä: eje → ejä, işle → işlä, gelme → gelmä (TM-CURRICULUM.md, open question 5)
  function eToA(w) {
    var p = lastPart(w), c = p.t.slice(-1);
    if (c === "e") p.t = p.t.slice(0, -1) + "ä";
    else if (c === "E") p.t = p.t.slice(0, -1) + "Ä";
  }

  // Attach one suffix written in the notation above. o: { id, cat, k, ea, keepE, soft }
  //   ea: a final e becomes ä when the suffix joins the word with its linking vowel or buffer n (ejäm, nämäni);
  //       a linking (A) always makes it ä (işlär, işläýin). keepE: don't (the spelling ejem, accepted beside ejäm).
  function attach(w0, tpl, o) {
    o = o || {};
    var w = clone(w0), lead = "", bodyT = tpl, mm = /^\((.)\)/.exec(tpl);
    if (mm) { lead = mm[1]; bodyT = tpl.slice(3); }
    var L = letters(body(w)), endsV = isV(L.slice(-1)), buf = "", link = "";
    if (lead === "Y" || lead === "A") {
      if (!endsV) link = lead;
      else if ((lead === "A" || o.ea) && !o.keepE) eToA(w);
    } else if (lead) {
      if (endsV) { buf = lead; if (o.ea && !o.keepE) eToA(w); }
    } else if (o.ea && endsV && !o.keepE) eToA(w);                    // öýde + ki → öýdäki
    var first = (link || bodyT).charAt(0);
    var vfirst = !buf && (first === "A" || first === "Ä" || first === "Y" || isV(first));
    if (!endsV && (vfirst || first === "ý")) alternate(w, vfirst);
    var v = lastV(body(w)), out = "", mask = "", s = link + bodyT;
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i), c, r = ".";
      if (ch === "A") { c = harmA(v); v = c; }
      else if (ch === "Ä") { c = harmAe(v); v = c; }
      else if (ch === "Y") { c = harmY(v); v = c; if (o.k !== "q") r = "r"; }
      else { c = ch; if (isV(c)) v = c; }
      out += c; mask += r;
    }
    if (buf) w.parts.push({ t: buf, k: "buf", m: "." });
    w.parts.push({ t: out, k: o.k || "suf", id: o.id || tpl, m: mask, soft: !!o.soft });
    if (o.cat) w.cat = o.cat;
    return w;
  }

  // ───────────────────────────── 4. nouns, pronouns, nominal predicates ─────────────────────────────
  var POSS = ["(Y)m", "(Y)ň", "(s)Y", "(Y)mYz", "(Y)ňYz", "(s)Y"];

  function mkNoun(base, o) {
    var ws = String(base).trim().split(/\s+/), last = ws.pop(), pre = ws.length ? ws.join(" ") + " " : "";
    var proper = /^[A-ZÄÇŇÖŞÜÝŽ]/.test(last);
    return mk(last, { pre: pre, cat: "n", lemma: last, lex: nounLex(last, o && o.sense), proper: proper });
  }
  function fromParts(w, list, id) {   // a pronoun form written out: o|n|y, ma|ň|a
    var x = clone(w);
    x.parts = list.map(function (t, i) { return { t: t, k: i === 0 ? "stem" : i === list.length - 1 ? "suf" : "buf", id: i === list.length - 1 ? id : null, m: dots(t) }; });
    x.f = {}; x.cat = "k";
    return x;
  }
  function nbuf(w) { var x = clone(w); x.parts.push({ t: "n", k: "buf", m: "." }); return x; }   // the pronominal n: öýüne, kitabynda
  function plural(w) {
    if (rootOnly(w) && w.lex.pron && PRON[w.lex.pron].pl) { var x = fromParts(w, PRON[w.lex.pron].pl, "PL"); x.cat = "n"; return x; }
    if (w.f.poss) throw new Error("the plural comes before the possessive");
    var y = attach(w, "lAr", { id: "PL" }); y.f = {}; return y;
  }
  // possessive p (0 … 5); o.lary: -lArY for olar (kitaplary); o.keepE: ejem beside ejäm
  function poss(w, p, o) {
    o = o || {};
    if (w.f.poss) throw new Error("a word takes one possessive");
    var x = p === 5 && o.lary ? attach(w, "lArY", { id: "POSS6", cat: "n" }) : attach(w, POSS[p], { id: "POSS" + (p + 1), cat: "n", ea: p !== 2 && p !== 5, keepE: o.keepE });   // ejäm, but ejesi
    x.f = { p3: p === 2 || p === 5, poss: true };
    return x;
  }
  // the dative after a vowel fuses with it: Mary → Mara, okuwçy → okuwça, eje → ejä, kişi → kişä, oba → oba
  function fuseDat(w) {
    var x = clone(w), p = lastPart(x), c = lower(p.t.slice(-1));
    p.t = p.t.slice(0, -1); p.m = p.m.slice(0, -1);
    x.parts.push({ t: front(c) ? "ä" : "a", k: "suf", id: "DAT", m: "." });
    return x;
  }
  function addCase(w, c) {
    var x;
    if (rootOnly(w) && w.lex.pron && PRON[w.lex.pron][c]) x = fromParts(w, PRON[w.lex.pron][c], c.toUpperCase());
    else if (c === "acc") x = attach(w, "(n)Y", { id: "ACC", ea: true });
    else if (c === "gen") x = attach(w, "(n)Yň", { id: "GEN", ea: true });
    else if (w.f.p3) x = attach(nbuf(w), c === "dat" ? "A" : c === "loc" ? "dA" : "dAn", { id: c.toUpperCase() });
    else if (c === "dat") x = isV(letters(body(w)).slice(-1)) ? fuseDat(w) : attach(w, "A", { id: "DAT" });
    else if (c === "loc") x = attach(w, "dA", { id: "LOC" });
    else if (c === "abl") x = attach(w, "dAn", { id: "ABL" });
    else throw new Error("unknown case " + c);
    x.cat = "k"; x.f = { "case": c };
    return x;
  }
  // -kY: öýdäki, Aşgabatdaky, şu günki, meniňki; what follows takes the pronominal n like a third-person possessive
  function ky(w) { var x = attach(w, "kY", { id: "KY", ea: true, cat: "n" }); x.f = { p3: true }; return x; }
  // decline("kitap", { pl, poss: "men", case: "loc", ky, sense, keepE }) → kitaplarymda
  function decline(base, o) {
    o = o || {};
    var w = typeof base === "string" ? mkNoun(base, o) : base;
    if (o.pl) w = plural(w);
    if (o.poss != null) w = poss(w, personIndex(o.poss), o);
    if (o["case"]) w = addCase(w, o["case"]);
    if (o.ky) w = ky(w);
    return w;
  }

  // Personal endings: E1 after "to be", -ýAr and -Ar (talybyn, gelýärin, gelerin); E2 after -dY (geldim, talypdym).
  var E1 = ["(Y)n", "sYň", "", "(Y)s", "sYňYz", "lAr"];
  var E2 = ["m", "ň", "", "k", "ňYz", "lAr"];
  function person(w, set, p) { return set[p] ? attach(w, set[p], { id: set[p] === "lAr" ? "PL" : "P" + (p + 1), cat: "f" }) : w; }
  function Q(w) { return attach(w, "mY", { id: "Q", k: "q" }); }   // the question particle, written attached
  // E1 with the question particle: gelýärinmi, gelýärsiňmi (or gelýärmiň), gelýärmi, gelýärsiňizmi (or gelýärmisiňiz)
  function e1(w, p, q) {
    if (!q) return [[person(w, E1, p)]];
    var out = [[Q(person(w, E1, p))]];
    if (p === 1) out.push([attach(Q(w), "ň", { id: "P2" })]);
    if (p === 4) out.push([attach(Q(w), "sYňYz", { id: "P5" })]);
    return out;
  }
  function e2(w, p, q) { var x = person(w, E2, p); return [[q ? Q(x) : x]]; }

  // Nominal predicates: copula("talyp", { tense: "pres" | "past" | "dyr", neg, q, p }). A predicate ending in
  // "däl" is negative already; bar and ýok swap for the negative. Returns variants (arrays of words), the usual first.
  // Present (open question 2, settled in A1-1): the zero form first in every person (Men talyp); then -dYr with
  // the personal ending, the formal written form (talypdyryn, talypdyrsyň, talypdyr, talypdyrys, talypdyrsyňyz,
  // talypdyrlar; minnetdardyryn, minnetdardyrys in print); last, the endings without -dYr (talybyn, talypsyň,
  // talybys, talypsyňyz, talyplar), which no source reached shows and the course doesn't teach. After a vowel
  // the bare first-person endings are left out: öýden and öýdes would read as other words.
  function copula(pred, spec) {
    var p = personIndex(spec.p), q = !!spec.q, neg = !!spec.neg, t = spec.tense || "pres", out = [];
    if (p < 0) return null;
    var ws = String(pred).trim().split(/\s+/);
    if (ws.length > 1 && ws[ws.length - 1] === "däl") { ws.pop(); neg = true; }
    var head = mkNoun(ws.join(" ")), hl = lower(ws.join(" "));
    if (neg && (hl === "bar" || hl === "ýok")) { head = mkNoun(hl === "bar" ? "ýok" : "bar"); neg = false; }
    var X = neg ? mkNoun(text(head) + " däl") : head;
    var vowelEnd = isV(letters(body(X)).slice(-1));
    var dyrP = function () { return person(attach(X, "dYr", { id: "DYR", cat: "f" }), E1, p); };   // talypdyryn … talypdyrlar
    if (t === "pres") {
      if (q) {
        if (p === 2) return [[Q(X)]];
        if (p === 5) return [[Q(X)], [Q(person(X, E1, 5))]];
        return [[Q(X)]].concat(e1(X, p, true));                                     // talypmy, talypsyňmy, talypmyň
      }
      if (p === 2) return [[X], [dyrP()]];                                           // talyp, talypdyr
      if (p === 5) return [[X], [person(X, E1, 5)], [dyrP()]];                       // talyp, talyplar, talypdyrlar
      out = [[X], [dyrP()]];                                                         // talyp, talypdyryn
      if (!(vowelEnd && (p === 0 || p === 3))) out.push([person(X, E1, p)]);         // talybyn (not öýden: "from home")
      return out;
    }
    if (t === "dyr") {                                                               // first and second persons: positive only
      if (p !== 2 && p !== 5 && (neg || q)) return null;
      var d = attach(X, "dYr", { id: "DYR", cat: "f" });
      if (q) return [[Q(p === 5 ? attach(d, "lAr", { id: "PL" }) : d)]];
      return p === 5 ? [[attach(d, "lAr", { id: "PL" })], [attach(attach(X, "lAr", { id: "PL" }), "dYr", { id: "DYR" })]] : [[dyrP()]];
    }
    if (t === "past") {                                                              // talypdym, öýdedik, bardy, däldi
      var dy = function (w) { return attach(w, "dY", { id: "PCOP", cat: "g" }); };
      if (q) {                                                                       // talypmydyň
        if (p === 5) return [[attach(dy(Q(X)), "lAr", { id: "PL" })], [dy(Q(attach(X, "lAr", { id: "PL" })))]];
        return [[person(dy(Q(X)), E2, p)]];
      }
      if (p === 5) return [[attach(dy(X), "lAr", { id: "PL" })], [dy(attach(X, "lAr", { id: "PL" }))]];
      return [[person(dy(X), E2, p)]];
    }
    throw new Error("unknown tense " + t);
  }

  // ───────────────────────────── 5. verbs ─────────────────────────────
  // mkVerb("gelmek"), mkVerb("gel-"), mkVerb("pikir etmek"): only the last word is conjugated.
  function mkVerb(base) {
    var ws = String(base).trim().split(/\s+/), last = ws.pop(), pre = ws.length ? ws.join(" ") + " " : "";
    var stem = /m[ae]k$/.test(last) ? last.slice(0, -3) : last.replace(/-$/, "");
    return mk(stem, { pre: pre, cat: "v", lemma: stem, lex: verbLex(stem) });
  }
  function isVerbBase(b) { return /m[ae]k$/.test(lastWord(String(b).trim())); }
  function negate(w) { return attach(w, "mA", { id: "NEG", cat: "v" }); }
  function converb(w) { return attach(w, "(Y)p", { id: "CVB", cat: "c", ea: true }); }   // gelip, okap, görüp, işläp, gidip

  // Finite forms. spec: { tense, neg, q, p, ability, aux }
  //   tense: present (-ýAr), past (-dY), future (-jAk, no ending), aorist (-Ar; negative -mAr, -mAz), necess (-mAlY,
  //          no ending), imp (sen, siz), opt (men, biz), imp3 (ol, olar), prog (-(Y)p + aux otyr, dur, ýatyr, ýör),
  //          ypdyr (-(Y)pdYr, ol and olar: the first look of a2-u02)
  //   ability: -(Y)p bilmek, conjugated in tense present, aorist or past
  // Returns variants (arrays of words), the usual one first, or null where the form doesn't exist.
  function conj(base, spec) {
    var p = personIndex(spec.p), neg = !!spec.neg, q = !!spec.q, t = spec.tense;
    if (p < 0) return null;
    var w0 = typeof base === "string" ? mkVerb(base) : base;
    if (spec.ability) {
      var cv = converb(w0), r = conj("bilmek", { tense: t, neg: neg, q: q, p: p });
      return r && r.map(function (v) { return [cv].concat(v); });
    }
    var w = neg ? negate(w0) : w0, x;
    switch (t) {
      case "present": return e1(attach(w, "ýÄr", { id: "PRES", cat: "f" }), p, q);
      case "past": return e2(attach(w, "dY", { id: "PAST", cat: "g" }), p, q);
      case "future":                                                     // geljek; geljek däl; geljekmi; geljek dälmi
        x = attach(w0, "jAk", { id: "FUT", cat: "n", soft: true });
        if (!neg) return [[q ? Q(x) : x]];
        return q ? [[x, Q(lit("däl"))]] : [[x, lit("däl")], [attach(negate(w0), "jAk", { id: "FUT", cat: "n", soft: true })]];
      case "necess":                                                     // gelmeli; gelmeli däl; gelmelimi
        x = attach(w0, "mAlY", { id: "NEC", cat: "n" });
        if (!neg) return [[q ? Q(x) : x]];
        return q ? [[x, Q(lit("däl"))]] : [[x, lit("däl")], [attach(negate(w0), "mAlY", { id: "NEC", cat: "n" })]];
      case "aorist":
        if (!neg) return e1(attach(w0, "(A)r", { id: "AOR", cat: "f" }), p, q);                 // gelerin, okar, işlär
        if (p === 2 || p === 5) {                                                              // gelmez, gelmezler
          x = attach(w0, "mAz", { id: "NAOR", cat: "f" });
          if (p === 5) x = attach(x, "lAr", { id: "PL" });
          return [[q ? Q(x) : x]];
        }
        return e1(attach(w0, "mAr", { id: "NAOR", cat: "f" }), p, q);                           // gelmerin, gelmersiň
      case "imp":                                                         // gel, geliň (geliňiz); gelme, gelmäň
        if (q) return null;
        if (p === 1) return [[w]];
        if (p === 4) return [[attach(w, "(Y)ň", { id: "IMP", cat: "x", ea: true })], [attach(w, "(Y)ňYz", { id: "IMP", cat: "x", ea: true })]];
        return null;
      case "opt":                                                         // geleýin, okaýyn, işläýin; geleli, geleliň
        var o = p === 0 ? [attach(w, "(A)ýYn", { id: "OPT1", cat: "x" })]
              : p === 3 ? [attach(w, "(A)lY", { id: "OPT4", cat: "x" }), attach(w, "(A)lYň", { id: "OPT4", cat: "x" })] : null;
        return o && o.map(function (y) { return [q ? Q(y) : y]; });
      case "imp3":                                                        // gelsin, gelsinler; gelmesin; gelsinmi
        if (p !== 2 && p !== 5) return null;
        x = attach(w, "sYn", { id: "IMP3", cat: "f" });
        if (p === 5) x = attach(x, "lAr", { id: "PL" });
        return [[q ? Q(x) : x]];
      case "prog":                                                        // okap otyr, işläp ýörün, gelip durus
        if (neg) return null;
        var a = LEX.posture[spec.aux];
        if (!a) throw new Error("unknown helper verb " + spec.aux);
        var c = converb(w0), aw = mk(a, { cat: "f", lemma: a });
        return e1(aw, p, q).map(function (v) { return [c].concat(v); });
      case "ypdyr":                                                       // gelipdir, gelipdirler
        if (neg || (p !== 2 && p !== 5)) return null;
        x = attach(converb(w0), "dYr", { id: "DYR", cat: "f" });
        if (p === 5) x = attach(x, "lAr", { id: "PL" });
        return [[q ? Q(x) : x]];
      default: throw new Error("unknown tense " + t);
    }
  }

  // ───────────────────────────── 6. forms by name ─────────────────────────────
  // The rows of the coverage table in TM-CURRICULUM.md that A1 and A2 teach, each with -negative and -question
  // (and -negative-question) slugs where the form has them, plus other paradigms a `conjugate` exercise may drill.
  // form(slug, base, person, { sense }) → { text, seg, variants, segs } or null.
  var TABLE = [
    // slug, coverage-table row, grammar points, "verb" | "nom", spec, polarities, persons
    ["copula-present", 'Present "to be"', "gp-copula-present, gp-dal, gp-question-my", "nom", { tense: "pres" }],
    ["copula-dyr", 'Present "to be" with -dYr', "gp-copula-present", "nom", { tense: "dyr" }, "pnq"],   // negative, question: ol, olar
    ["present", "Present -ýAr", "gp-present-yar, gp-present-negative", "verb", { tense: "present" }],
    ["imperative", "Imperative, 2nd person", "gp-imperative", "verb", { tense: "imp" }, "pn", [1, 4]],
    ["past", "Past -dY", "gp-past-dy, gp-past-dy-negative-question", "verb", { tense: "past" }],
    ["past-copula", 'Past "to be" -dY', "gp-past-copula", "nom", { tense: "past" }],
    ["perfect-ypdyr", "Perfect -(Y)pdYr (first look)", "gp-ypdyr-intro", "verb", { tense: "ypdyr" }, "pq", [2, 5]],
    ["future", "Future -jAk (no personal ending)", "gp-future-jak, gp-future-negative-question", "verb", { tense: "future" }],
    ["aorist", "General present -Ar", "gp-aorist-forms, gp-aorist-negative", "verb", { tense: "aorist" }],
    ["ability", "Ability -(Y)p bilmek", "gp-yp-bilmek, gp-yp-bilmek-negative", "verb", { tense: "present", ability: true }],
    ["ability-aorist", "Ability -(Y)p bilmek, general present", "gp-yp-bilmek, gp-yp-bilmek-negative", "verb", { tense: "aorist", ability: true }],
    ["ability-past", "Ability -(Y)p bilmek, past", "gp-yp-bilmek, gp-yp-bilmek-negative", "verb", { tense: "past", ability: true }],
    ["necessitative", "Necessity -mAlY (no personal ending)", "gp-maly", "verb", { tense: "necess" }],
    ["optative", "Optative", "gp-optative", "verb", { tense: "opt" }, "pnq", [0, 3]],
    ["imperative-3rd", "Imperative, 3rd person -sYn", "gp-imperative-3rd", "verb", { tense: "imp3" }, "pnq", [2, 5]],
    ["progressive-otyr", "Progressive with posture verbs", "gp-yp-progressive", "verb", { tense: "prog", aux: "otyr" }, "pq"],
    ["progressive-dur", "Progressive with posture verbs", "gp-yp-progressive", "verb", { tense: "prog", aux: "dur" }, "pq"],
    ["progressive-yatyr", "Progressive with posture verbs", "gp-yp-progressive", "verb", { tense: "prog", aux: "ýatyr" }, "pq"],
    ["progressive-yor", "Progressive with posture verbs", "gp-yp-progressive", "verb", { tense: "prog", aux: "ýör" }, "pq"]
  ];
  var ALIAS = {
    "copula": "copula-present", "copula-negative": "copula-present-negative", "copula-question": "copula-present-question",
    "copula-negative-question": "copula-present-negative-question", "dal": "copula-present-negative",
    "present-yar": "present", "present-yar-negative": "present-negative", "present-yar-question": "present-question",
    "present-yar-negative-question": "present-negative-question", "past-dy": "past", "past-dy-negative": "past-negative",
    "past-dy-question": "past-question", "past-dy-negative-question": "past-negative-question", "future-jak": "future",
    "future-jak-negative": "future-negative", "future-jak-question": "future-question", "general-present": "aorist",
    "general-present-negative": "aorist-negative", "general-present-question": "aorist-question", "maly": "necessitative",
    "maly-negative": "necessitative-negative", "maly-question": "necessitative-question", "yp-bilmek": "ability",
    "yp-bilmek-negative": "ability-negative", "yp-bilmek-question": "ability-question", "ypdyr": "perfect-ypdyr"
  };
  var FORMS = {};
  TABLE.forEach(function (r) {
    var pols = r[5] || "pnq", persons = r[6] || [0, 1, 2, 3, 4, 5];
    [["", false, false], ["-negative", true, false], ["-question", false, true], ["-negative-question", true, true]].forEach(function (x) {
      if ((x[1] && pols.indexOf("n") < 0) || (x[2] && pols.indexOf("q") < 0)) return;
      var spec = {}, k;
      for (k in r[4]) spec[k] = r[4][k];
      spec.neg = x[1]; spec.q = x[2];
      FORMS[r[0] + x[0]] = { slug: r[0] + x[0], row: r[1], gp: r[2], persons: persons, build: function (b, p) {
        if (persons.indexOf(p) < 0) return null;
        var s = {}, j;
        for (j in spec) s[j] = spec[j];
        s.p = p;
        return r[3] === "nom" ? copula(b, s) : conj(b, s);
      } };
    });
  });
  // the other paradigms: the moods side by side, possessives, pronouns
  function moods(neg) {    // optative for men and biz, imperative for sen and siz, -sYn for ol and olar
    return function (b, p) { return conj(b, { tense: p === 0 || p === 3 ? "opt" : p === 1 || p === 4 ? "imp" : "imp3", neg: neg, p: p }); };
  }
  function possV(b, p, o, after) {   // ejäm and ejem; kitaby and, for olar, kitaplary
    var w = mkNoun(b, o), vs = [poss(w, p)];
    if (/e$/.test(lower(b)) && p !== 2 && p !== 5) vs.push(poss(w, p, { keepE: true }));
    if (p === 5) vs.push(poss(w, 5, { lary: true }));
    return vs.map(function (x) { return after ? after(x) : [x]; });
  }
  var EXTRA = {
    "moods": moods(false),
    "moods-negative": moods(true),
    "possessive": function (b, p, o) { return possV(b, p, o); },
    "possessive-locative": function (b, p, o) { return possV(b, p, o, function (x) { return [addCase(x, "loc")]; }); },
    "possessive-dative": function (b, p, o) { return possV(b, p, o, function (x) { return [addCase(x, "dat")]; }); },
    "possessive-accusative": function (b, p, o) { return possV(b, p, o, function (x) { return [addCase(x, "acc")]; }); },
    "possessive-bar": function (b, p, o) { return possV(b, p, o, function (x) { return [x, lit("bar")]; }); },
    "possessive-yok": function (b, p, o) { return possV(b, p, o, function (x) { return [x, lit("ýok")]; }); },
    "pronoun-genitive-ky": function (b, p) { return [[ky(addCase(mkNoun(PERSONS[p]), "gen"))]]; }
  };
  [["accusative", "acc"], ["dative", "dat"], ["locative", "loc"], ["ablative", "abl"], ["genitive", "gen"]].forEach(function (c) {
    EXTRA["pronoun-" + c[0]] = function (b, p) { return [[addCase(mkNoun(PERSONS[p]), c[1])]]; };
  });
  var EXTRA_INFO = {
    "moods": ["The moods side by side: optative (men, biz), imperative (sen, siz), -sYn (ol, olar)", "gp-imperative, gp-optative, gp-imperative-3rd"],
    "moods-negative": ["The moods side by side, negative", "gp-imperative, gp-optative, gp-imperative-3rd"],
    "possessive": ["Possessive endings", "gp-possessive-suffixes, gp-possessive-voicing, gp-vowel-loss"],
    "possessive-locative": ["Possessive and locative", "gp-possessive-suffixes, gp-pronominal-n"],
    "possessive-dative": ["Possessive and dative", "gp-possessive-suffixes, gp-pronominal-n"],
    "possessive-accusative": ["Possessive and accusative", "gp-possessive-suffixes, gp-pronominal-n"],
    "possessive-bar": ['"To have" with bar', "gp-possessive-have"],
    "possessive-yok": ['"Not to have" with ýok', "gp-possessive-have"],
    "pronoun-genitive-ky": ["-ky after the genitive of the pronouns", "gp-ky-pronoun"],
    "pronoun-accusative": ["Pronouns in the accusative", "gp-pronoun-accusative"],
    "pronoun-dative": ["Pronouns in the dative", "gp-pronoun-cases-dat-abl"],
    "pronoun-locative": ["Pronouns in the locative", "gp-place-words"],
    "pronoun-ablative": ["Pronouns in the ablative", "gp-pronoun-cases-dat-abl"],
    "pronoun-genitive": ["Pronouns in the genitive", "gp-genitive"]
  };
  Object.keys(EXTRA).forEach(function (k) {
    FORMS[k] = { slug: k, row: EXTRA_INFO[k][0], gp: EXTRA_INFO[k][1], persons: [0, 1, 2, 3, 4, 5], build: EXTRA[k] };
  });

  // every spelling a list of variants stands for: the rounding rule with -mY counted or not (boldumy, boldymy),
  // and a loanword of LEX.loanRound rounded or not (stoluň, stolyň); the usual spelling of the usual variant first
  var RENDERS = [{}, { clitic: false }, { noRound: true }, { clitic: false, noRound: true }];
  function pack(vs) {
    if (!vs || !vs.length) return null;
    var texts = [], segs = [];
    RENDERS.forEach(function (o) {
      vs.forEach(function (v) {
        var t = v.map(function (w) { return text(w, o); }).join(" ");
        if (texts.indexOf(t) < 0) { texts.push(t); segs.push(v.map(function (w) { return segOf(w, o); }).join(" ")); }
      });
    });
    return { text: texts[0], seg: segs[0], variants: texts, segs: segs };
  }
  function formInfo(slug) {
    var f = FORMS[ALIAS[slug] || slug];
    return f ? { slug: slug, same: ALIAS[slug] ? f.slug : null, row: f.row, gp: f.gp, persons: f.persons.map(function (i) { return PERSONS[i]; }) } : null;
  }
  function form(slug, base, personName, o) {
    var f = FORMS[ALIAS[slug] || slug], p = personIndex(personName);
    if (!f || p < 0) return null;
    return pack(f.build(base, p, o || {}));
  }
  function paradigm(slug, base, o) {
    var out = {};
    PERSONS.forEach(function (n) { out[n] = form(slug, base, n, o); });
    return out;
  }
  function forms() { return Object.keys(FORMS).concat(Object.keys(ALIAS)).sort().map(formInfo); }
  // the readings of a spelling that the lexicon tells apart: readings("at") → [{ sense: 1, gloss: "name" }, …]
  function readings(base) {
    var h = LEX.homographs[lower(lastWord(base))];
    return h ? h.map(function (x, i) { return { sense: i + 1, gloss: x[0] }; }) : [{ sense: null, gloss: null }];
  }

  // ───────────────────────────── 7. analysis of morph tiles ─────────────────────────────
  // Every suffix the analysis may try, by id: what it attaches to and what it makes. Categories: v a verb stem,
  // n a noun or nominal predicate, k a noun with a case ending, f a finite form with type 1 endings, g one with
  // type 2 endings (-dY), c the converb, x a form that takes nothing but -mY, q a word that ends in -mY.
  // build(base, ids) applies them in order; analyze() searches them.
  var INV = [], BY_ID = {};
  function step(id, on, fn) { var s = { id: id, on: on.split(""), fn: fn }; INV.push(s); BY_ID[id] = s; }
  function tstep(id, on, tpl, cat, o) {
    step(id, on, function (w) { var oo = { id: id, cat: cat }, k; if (o) for (k in o) oo[k] = o[k]; return attach(w, tpl, oo); });
  }
  // nouns
  step("PL", "nfg", function (w) { return w.cat === "n" ? plural(w) : attach(w, "lAr", { id: "PL" }); });
  [0, 1, 2, 3, 4, 5].forEach(function (i) { step("POSS" + (i + 1), "n", function (w) { return poss(w, i); }); });
  step("POSS6-LARY", "n", function (w) { return poss(w, 5, { lary: true }); });
  [0, 1, 3, 4].forEach(function (i) { step("POSS" + (i + 1) + "-E", "n", function (w) { return poss(w, i, { keepE: true }); }); });   // ejem beside ejäm
  ["acc", "dat", "loc", "abl", "gen"].forEach(function (c) { step(c.toUpperCase(), "n", function (w) { return addCase(w, c); }); });
  step("KY", "nk", function (w) { if (w.cat === "k" && w.f["case"] !== "loc" && w.f["case"] !== "gen") throw new Error("-kY follows the locative or genitive"); return ky(w); });
  // the copula and endings
  [0, 1, 3, 4].forEach(function (i) {
    step("E1-" + (i + 1), "nkf", function (w) { return person(w, E1, i); });
    step("E2-" + (i + 1), "g", function (w) { return person(w, E2, i); });
  });
  tstep("DYR", "nkfc", "dYr", "f");
  tstep("PCOP", "nkq", "dY", "g");
  step("Q", "nkfgx", function (w) { var x = Q(w); x.cat = "q"; return x; });
  tstep("Q-P2", "q", "ň", "x");          // gelýärmiň
  tstep("Q-P5", "q", "sYňYz", "x");      // gelýärmisiňiz
  // word building (a2-u08, a2-u12) and ordinals (a1-u11)
  [["LY", "lY"], ["SYZ", "sYz"], ["CY", "çY"], ["CA", "çA"], ["RAK", "rÄk"], ["NJY", "(Y)njY"]].forEach(function (d) { tstep(d[0], "n", d[1], "n"); });
  tstep("LYK", "n", "lYk", "n", { soft: true });
  // verbs
  step("NEG", "v", negate);
  tstep("PRES", "v", "ýÄr", "f");
  tstep("PAST", "v", "dY", "g");
  tstep("FUT", "v", "jAk", "n", { soft: true });
  tstep("AOR", "v", "(A)r", "f");
  tstep("NAOR", "v", "mAr", "f");
  tstep("NAOR3", "v", "mAz", "f");
  tstep("NEC", "v", "mAlY", "n");
  step("CVB", "v", converb);
  tstep("IMP", "v", "(Y)ň", "x", { ea: true });
  tstep("IMP-POLITE", "v", "(Y)ňYz", "x", { ea: true });
  tstep("OPT1", "v", "(A)ýYn", "x");
  tstep("OPT4", "v", "(A)lY", "x");
  tstep("OPT4-N", "v", "(A)lYň", "x");
  tstep("IMP3", "v", "sYn", "f");
  tstep("AN", "v", "(A)n", "n");

  function start(base, o) {
    var out = [];
    if (isVerbBase(base)) out.push(mkVerb(base));
    readings(base).forEach(function (r) { out.push(mkNoun(base, { sense: o && o.sense != null ? o.sense : r.sense })); });
    return out;
  }
  function build(base, ids, o) {
    var first = BY_ID[ids[0]];
    var w = typeof base !== "string" ? base : first && first.on[0] === "v" && isVerbBase(base) ? mkVerb(base) : mkNoun(base, o);
    ids.forEach(function (id) {
      var s = BY_ID[id];
      if (!s) throw new Error("unknown suffix " + id);
      if (s.on.indexOf(w.cat) < 0) throw new Error(id + " does not attach to a word of category " + w.cat);
      w = s.fn(w);
    });
    return { text: text(w), seg: segOf(w), word: w };
  }

  // fold for the loose search: the letters a harmony, rounding, voicing or e/ä mistake can change
  var FOLD = { a: "A", e: "A", "ä": "A", y: "Y", i: "Y", u: "Y", "ü": "Y", o: "O", "ö": "O", d: "D", t: "D", g: "K", k: "K",
               b: "P", p: "P", j: "J", "ç": "J" };
  function fold(s) { var o = ""; s = lower(s); for (var i = 0; i < s.length; i++) o += FOLD[s[i]] || s[i]; return o; }
  // looser still: a vowel written before the vowel of the dative or another suffix (Marya for Mara, ejeä for ejä)
  function fuse(s) { return fold(s).replace(/[AYO](?=[AYO])/g, ""); }
  function bounds(w, o) {
    var set = {}, n = w.pre.length, rp = renderParts(w, o);
    for (var i = 0; i < rp.length; i++) { n += rp[i].length; set[n] = true; }
    return set;
  }
  function search(starts, target, B, loose, maxDepth) {
    var key = loose === 2 ? fuse : loose ? fold : function (t) { return t; }, T = key(target), seen;
    function same(t) { return key(t) === T; }
    function dfs(w, ids) {
      if (ids.length) {
        for (var r = 0; r < RENDERS.length; r++) {
          if (!same(text(w, RENDERS[r]))) continue;
          if (!B) return { w: w, ids: ids, o: RENDERS[r] };
          var bs = bounds(w, RENDERS[r]);
          if (B.every(function (b) { return bs[b]; })) return { w: w, ids: ids, o: RENDERS[r] };
        }
      }
      if (ids.length >= maxDepth) return null;
      var t = text(w), sk = ids.length + "|" + w.cat + "|" + w.parts.map(function (p) { return p.t; }).join("|") + "|" + JSON.stringify(w.f);
      if (seen[sk]) return null;
      seen[sk] = true;
      for (var i = 0; i < INV.length; i++) {
        var s = INV[i], w2;
        if (s.on.indexOf(w.cat) < 0) continue;
        try { w2 = s.fn(w); } catch (e) { continue; }
        if (!w2) continue;
        // a later suffix can still change the last letters (gördi → gördüm, Mary → Mara, işle → işläp)
        var t2 = text(w2);
        var k2 = key(t2);
        if (t2 === t || k2.length > T.length + 1 || k2.slice(0, Math.max(0, k2.length - 3)) !== T.slice(0, Math.max(0, k2.length - 3))) continue;
        var res = dfs(w2, ids.concat(s.id));
        if (res) return res;
      }
      return null;
    }
    for (var j = 0; j < starts.length; j++) { seen = {}; var r = dfs(starts[j], []); if (r) return r; }
    return null;
  }
  // analyze(base, tiles): base is the dictionary form (verbs with -mAk), tiles the stem and suffixes in order.
  //   { ok: true, ids, seg }                       the tiles are base + suffixes, cut at morpheme boundaries
  //   { ok: false, reason: "boundaries", seg }     the word is right but the tiles cut a morpheme
  //   { ok: false, reason: "form", text, seg }     the same suffixes give another word: text is the engine's
  //   { ok: false, reason: "unknown" }             no analysis (a suffix or stem change the engine lacks)
  function analyze(base, tiles, o) {
    var target = tiles.join(""), B = [], n = 0, starts = start(base, o);
    for (var i = 0; i < tiles.length - 1; i++) { n += tiles[i].length; B.push(n); }
    var r = search(starts, target, B, false, 8);
    if (r) return { ok: true, text: target, seg: segOf(r.w, r.o), ids: r.ids };
    r = search(starts, target, null, false, 8);
    if (r) return { ok: false, reason: "boundaries", text: target, seg: segOf(r.w, r.o), ids: r.ids };
    r = search(starts, target, null, 1, 8) || search(starts, target, null, 2, 8);
    if (r) return { ok: false, reason: "form", text: text(r.w), seg: segOf(r.w), ids: r.ids };
    return { ok: false, reason: "unknown" };
  }

  // ───────────────────────────── API ─────────────────────────────
  function out(w) { return { text: text(w), seg: segOf(w) }; }
  return {
    PERSONS: PERSONS.slice(), LEX: LEX, SUFFIXES: INV.map(function (s) { return s.id; }),
    // letters and sounds
    lower: lower, isVowel: isV, lastVowel: lastV, syllables: syllables, harmonyA: harmA, harmonyY: harmY,
    // words: noun("kitap"), verb("gelmek"), attach(word, "(Y)m"), text(word), seg(word)
    noun: mkNoun, verb: mkVerb, attach: attach, text: text, seg: segOf,
    plural: plural, possessive: function (w, p, o) { return poss(w, personIndex(p), o); }, addCase: addCase, ky: ky,
    negative: negate,
    // ready-made results { text, seg } or { text, seg, variants, segs }
    decline: function (base, o) { return out(decline(base, o)); },
    converb: function (base) { return out(converb(mkVerb(base))); },
    conjugate: function (base, spec) { return pack(conj(base, spec)); },
    copula: function (pred, spec) { return pack(copula(pred, spec)); },
    build: build, form: form, formInfo: formInfo, forms: forms, paradigm: paradigm, readings: readings, analyze: analyze, fold: fold
  };
});
