/* © 2026 Grégoire Maillard. All rights reserved. Not open source: see /LICENSE.txt */
/* Turkish A1 → C2: a rule-based morphology engine, see turkish/PROJECT.md section 3.

   It builds written Turkish words from a stem and suffixes, and conjugates every finite form of the
   coverage table in turkish/CURRICULUM.md, positive, negative and question. scripts/turkish/validate.mjs
   checks the `conjugate` and `morph` exercises against it, and scripts/turkish/morph-test.mjs tests it on
   known-correct forms. Loaded as a classic script it exposes window.TRKMorph (and TRK.morph when
   turkish.js has already run); in Node, require() returns the same object.

     1. Letters and sounds: vowels, two- and four-way harmony, voiceless consonants
     2. Lexicon: loanword harmony, softening, vowel loss, doubled consonants, the 13 aorists in -Ir,
        irregular causatives, de- and ye-, one-word compounds that end in -(s)I
     3. Words and suffixes: attach(), the core (buffer letters, linking vowels, consonant assimilation,
        softening, vowel loss, narrowing of de- and ye-, the apostrophe of proper nouns)
     4. Nouns, pronouns and nominal predicates: plural, possessives, cases, -ki, the copula
     5. Verbs: stems, voices, compound verbs, tenses, personal endings, the question particle
     6. Forms by name: the rows of the coverage table and the `form` slugs of the content
     7. Analysis: which suffixes a sequence of morph tiles stands for, or what the engine builds instead

   Suffix notation (CURRICULUM.md): A = a/e, I = ı/i/u/ü, D = d/t, C = c/ç, G = g/k, K = a final k that
   becomes ğ before a vowel; (y), (n), (s), (ş) are buffer letters used after a vowel, (I) and (A) linking
   vowels used after a consonant. Persons are "ben" … "onlar" or 0 … 5. No dependencies, no build step. */
(function (root, factory) {
  var M = factory();
  if (typeof module === "object" && module.exports) module.exports = M;
  if (root && root.document) { root.TRKMorph = M; if (root.TRK) root.TRK.morph = M; }
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  // ───────────────────────────── 1. letters and sounds ─────────────────────────────
  var VOWELS = "aeıioöuüâîû", BACK = "aıouâû", ROUND = "oöuüû", VOICELESS = "fstkçşhp";
  var PERSONS = ["ben", "sen", "o", "biz", "siz", "onlar"];

  function lower(s) { return String(s).replace(/I/g, "ı").replace(/İ/g, "i").toLowerCase(); }
  function letters(s) { return lower(s).replace(/[^a-zçğıöşüâîû]/g, ""); }
  function isV(c) { return !!c && VOWELS.indexOf(c) >= 0; }
  function lastV(s) { s = letters(s); for (var i = s.length - 1; i >= 0; i--) if (isV(s[i])) return s[i]; return null; }
  function lastC(s) { s = letters(s); return s.charAt(s.length - 1); }
  function syllables(s) { return (letters(s).match(/[aeıioöuüâîû]/g) || []).length; }
  function front(v) { return BACK.indexOf(v) < 0; }
  // two-way harmony (A): a after a back vowel, e after a front one; four-way (I) adds rounding
  function harm2(v) { return v && !front(v) ? "a" : "e"; }
  function harm4(v) { if (!v) return "i"; var r = ROUND.indexOf(v) >= 0; return front(v) ? (r ? "ü" : "i") : (r ? "u" : "ı"); }
  function voiceless(c) { return !!c && VOICELESS.indexOf(c) >= 0; }   // fıstıkçı şahap
  function lastWord(s) { var a = String(s).split(" "); return a[a.length - 1]; }
  function personIndex(p) { return typeof p === "number" ? (p >= 0 && p < 6 ? p : -1) : PERSONS.indexOf(p); }

  // ───────────────────────────── 2. lexicon ─────────────────────────────
  // Every list is about the written standard (TDK). Add words here when the validator finds a gap.
  var LEX = {
    // loanwords whose suffixes follow a palatal final consonant, not the last vowel: saati, kalbi, rolü
    harmony: {
      saat: "e", kalp: "e", harf: "e", hal: "e", "hâl": "e", dikkat: "e", hakikat: "e", seyahat: "e", itaat: "e",
      cemaat: "e", hayal: "e", ihtimal: "e", istikbal: "e", istiklal: "e", misal: "e", emsal: "e", hilal: "e",
      kemal: "e", sual: "e", normal: "e", general: "e", "meşgul": "ü", kabul: "ü", rol: "ö", gol: "ö", alkol: "ö",
      kontrol: "ö", petrol: "ö", sembol: "ö", protokol: "ö"
    },
    // nouns that soften although the default says no: one-syllable words and words in -t (kurdu, umudu)
    soften: ["uç", "güç", "borç", "genç", "harç", "kalp", "dip", "kap", "grup", "tat", "dört", "kurt", "yurt", "dert",
      "renk", "denk", "kanat", "umut", "armut", "yoğurt", "damat", "kilit", "öğüt", "yiğit", "geçit", "ağıt", "kâğıt",
      "kağıt", "ümit", "cilt"],
    // nouns of two or more syllables in -p, -ç or -k that keep their consonant (hukuku, ahlakı)
    keep: ["ahlak", "hukuk", "ittifak", "tebrik", "idrak", "iştirak", "evrak", "infilak"],
    // vowel loss before a vowel: ağzı, burnu, oğlu, isminiz
    drop: {
      "ağız": "ağz", burun: "burn", "oğul": "oğl", "alın": "aln", "akıl": "akl", vakit: "vakt", isim: "ism",
      resim: "resm", "şehir": "şehr", fikir: "fikr", beyin: "beyn", boyun: "boyn", "göğüs": "göğs", "karın": "karn",
      "hüküm": "hükm", "kayıt": "kayd", "kayıp": "kayb", "şükür": "şükr", bahis: "bahs", emir: "emr", "sabır": "sabr",
      zehir: "zehr", nehir: "nehr", "ömür": "ömr", "kısım": "kısm", ilim: "ilm", cisim: "cism", "keşif": "keşf",
      "kahır": "kahr", metin: "metn", nesil: "nesl", zihin: "zihn", hapis: "haps", "gönül": "gönl", "asıl": "asl",
      devir: "devr", "fasıl": "fasl", nakil: "nakl", seyir: "seyr", "şekil": "şekl", ufuk: "ufk", "zulüm": "zulm",
      kabir: "kabr", zikir: "zikr"
    },
    // doubled consonant before a vowel: hakkı, hissi, sırrı
    double: { hak: "hakk", his: "hiss", "sır": "sırr", af: "aff", ret: "redd", zan: "zann", "tıp": "tıbb", "şık": "şıkk",
      "zıt": "zıdd", "üs": "üss", hat: "hatt", hac: "hacc", had: "hadd" },
    // one-word compounds that end in the possessive -(s)I and so take the pronominal n: havalimanına
    p3: ["havalimanı", "zeytinyağı", "buzdolabı", "ayçiçeği", "akşamüstü", "denizaltı"],
    // diminutives that don't follow the rule (küçük → küçücük drops the k)
    dim: { az: "IcIK", dar: "AcIK", "genç": "AcIK" },
    // verbs whose final t becomes d before a vowel (gidiyor, ediyor); one-word compounds of etmek do too
    verbSoft: { git: "gid", et: "ed", tat: "tad", "güt": "güd", dit: "did" },
    etCompounds: ["add", "aff", "azl", "bahs", "def", "emr", "feth", "hall", "haps", "hiss", "hükm", "kahr", "kast", "kayb",
      "kayd", "keşf", "mahv", "men", "nakl", "redd", "sabr", "seyr", "şükr", "zann"],
    // the 13 one-syllable verbs with the aorist in -Ir (alır, gelir…); every other one-syllable stem takes -Ar
    aorIr: ["al", "bil", "bul", "dur", "gel", "gör", "kal", "ol", "öl", "san", "var", "ver", "vur"],
    // causatives: whole-stem irregulars, then the closed lists in -Ir, -Ar and -It; otherwise -t or -DIr
    caus: { gel: "getir", "gör": "göster", kalk: "kaldır", "öğren": "öğret", em: "emzir" },
    causIr: ["piş", "düş", "kaç", "bit", "geç", "iç", "doy", "duy", "uç", "taş", "yat", "bat", "art", "şiş", "doğ", "yit",
      "göç", "aş"],
    causAr: ["çık", "kop"],
    causIt: ["kork", "ak", "sark", "ürk", "kok"],
    // compound verbs (b2-u06): template and the aorist of the auxiliary
    aux: { iver: ["(y)Iver", "Ir"], akal: ["(y)Akal", "Ir"], adur: ["(y)Adur", "Ir"], ayaz: ["(y)Ayaz", "Ar"], agel: ["(y)Agel", "Ir"] },
    // personal and demonstrative pronouns
    pron: ["ben", "sen", "biz", "siz", "onlar"],
    dem: ["bu", "şu", "o"]
  };

  // the stem a noun uses before a vowel, or undefined when it doesn't change
  function softened(s) {
    var c = s.slice(-1);
    if ("pçtk".indexOf(c) < 0) return undefined;
    if (LEX.soften.indexOf(s) < 0 && (syllables(s) < 2 || c === "t" || LEX.keep.indexOf(s) >= 0)) return undefined;
    var r = c === "p" ? "b" : c === "ç" ? "c" : c === "t" ? "d" : (s.slice(-2, -1) === "n" ? "g" : "ğ");
    return s.slice(0, -1) + r;
  }
  function nounLex(stem) {
    var k = lower(stem), lex = {};
    if (LEX.harmony[k]) lex.hv = LEX.harmony[k];
    lex.alt = LEX.double[k] || LEX.drop[k] || softened(k);
    if (LEX.p3.indexOf(k) >= 0) lex.p3 = true;
    if (k === "su") lex.ystem = "suy";              // suyu, suya, suyun, suyla; but suda, sular, susuz
    if (LEX.dem.indexOf(k) >= 0) lex.dem = true;
    if (LEX.pron.indexOf(k) >= 0) lex.pron = true;
    return lex;
  }
  function verbLex(stem) {
    var lex = {};
    if (LEX.verbSoft[stem]) lex.alt = LEX.verbSoft[stem];
    else if (/et$/.test(stem) && LEX.etCompounds.indexOf(stem.slice(0, -2)) >= 0) lex.alt = stem.slice(0, -1) + "d";
    if (LEX.aorIr.indexOf(stem) >= 0) lex.aor = "Ir";
    else if (stem === "et" || (lex.alt && /ed$/.test(lex.alt) && stem !== "git")) lex.aor = "Ar";   // eder, kaybeder
    if (stem === "de" || stem === "ye") lex.narrow = true;
    return lex;
  }

  // ───────────────────────────── 3. words and suffixes ─────────────────────────────
  // A word is a list of parts (stem, buffer letters, suffixes), so it can be shown segmented: ev|ler|de.
  // pre holds the words before the inflected one (yardım in "yardım ediyorum"), which never change.
  function mk(stem, o) {
    o = o || {};
    var w = { pre: o.pre || "", parts: [{ t: stem, k: "stem" }], cat: o.cat || "n", lemma: o.lemma || stem,
              lex: o.lex || {}, proper: !!o.proper, apos: /'/.test(stem), f: {} };
    if (w.lex.hv) w.f.hv = w.lex.hv;
    if (w.lex.p3) w.f.p3 = true;
    if (w.lex.dem) w.f.dem = true;
    return w;
  }
  function clone(w) {
    var f = {}, k;
    for (k in w.f) f[k] = w.f[k];
    return { pre: w.pre, parts: w.parts.map(function (p) { return { t: p.t, k: p.k, id: p.id, softK: p.softK }; }),
             cat: w.cat, lemma: w.lemma, lex: w.lex, proper: w.proper, apos: w.apos, f: f };
  }
  function text(w) { var s = w.pre; for (var i = 0; i < w.parts.length; i++) s += w.parts[i].t; return s; }
  function lastPart(w) { return w.parts[w.parts.length - 1]; }
  function rootOnly(w) { return w.parts.length === 1; }
  function hvOf(w) { return w.f.hv || lastV(text(w).slice(w.pre.length)) || lastV(w.pre); }
  function lit(s) { return mk(s, { lemma: s }); }   // a word that takes no suffix here (lazım, gibi, için)

  // A vowel is about to follow: the last part changes if it can (kitap → kitab, ağız → ağz, git → gid, -AcAk → -AcAğ).
  function alternate(w) {
    var p = lastPart(w);
    if (p.k === "stem") {
      if (w.proper || w.apos) return;              // names keep their spelling: Mehmet'i, Zonguldak'a
      if (w.lex.alt && p.t === w.lemma) p.t = w.lex.alt;
    } else if (p.softK && /k$/.test(p.t)) p.t = p.t.slice(0, -1) + "ğ";
  }

  // Attach one suffix written in archiphoneme notation. o: { id, cat, k, deriv, keepDe }.
  function attach(w0, tpl, o) {
    o = o || {};
    var w = clone(w0), lead = "", body = tpl, m = /^\((.)\)/.exec(tpl);
    if (m) { lead = m[1]; body = tpl.slice(3); }
    var stemP = lastPart(w);
    if (w.lex.ystem && stemP.k === "stem" && stemP.t === w.lemma && (lead || /^[AIaeıioöuü]/.test(body))) stemP.t = w.lex.ystem;
    var L = letters(text(w)), endsV = isV(L.charAt(L.length - 1));
    var buf = "", link = "";
    if (lead === "I" || lead === "A") { if (!endsV) link = lead; }
    else if (lead && endsV) buf = lead;
    var first = (link || body).charAt(0);
    var vfirst = !buf && (first === "A" || first === "I" || isV(first));
    var v = hvOf(w);
    if (vfirst && !endsV) alternate(w);
    // de- and ye- narrow before a buffer y: diyecek, yiyen, diye; but deyip, deyince, deyiş, deyin (TDK)
    if (buf === "y" && w.lex.narrow && stemP === lastPart(w) && stemP.k === "stem" && !(w.lemma === "de" && o.keepDe))
      stemP.t = stemP.t.replace(/e$/, "i");
    // the apostrophe of a proper noun goes before its first inflectional suffix (Ankara'ya); the plural and
    // derivational suffixes take none, and neither does anything after them (Mehmetler, İstanbullu)
    if (w.proper && !w.apos) {
      if (o.deriv || o.id === "PL") w.proper = false;
      else { lastPart(w).t += "'"; w.apos = true; }
    }
    var prev = buf || lastC(text(w)), out = "", s = link + body;
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i), c;
      if (ch === "A") { c = harm2(v); v = c; }
      else if (ch === "I") { c = harm4(v); v = c; }
      else if (ch === "D") c = voiceless(prev) ? "t" : "d";
      else if (ch === "C") c = voiceless(prev) ? "ç" : "c";
      else if (ch === "G") c = voiceless(prev) ? "k" : "g";
      else if (ch === "K") c = "k";
      else { c = ch; if (isV(c)) v = c; }
      out += c; prev = c;
    }
    if (buf) w.parts.push({ t: buf, k: "buf" });
    w.parts.push({ t: out, k: o.k || "suf", id: o.id || tpl, softK: /K$/.test(body) });
    if (/[aeıioöuüâîû]/.test(out)) w.f.hv = null;
    if (o.cat) w.cat = o.cat;
    if (o.deriv) w.f.p3 = w.f.dem = w.f.ki = false;
    return w;
  }

  // ev|ler|de: a linking vowel joins the next part (bekl|iyor), or the negative before it (gel|mi|yor)
  function segOf(w) {
    var out = [], carry = "";
    for (var i = 0; i < w.parts.length; i++) {
      var p = w.parts[i];
      if (!p.t) continue;
      if (p.k === "link") {
        if (i > 0 && w.parts[i - 1].id === "NEG" && out.length) out[out.length - 1] += p.t;
        else carry += p.t;
        continue;
      }
      out.push(carry + p.t); carry = "";
    }
    if (carry) out.push(carry);
    return w.pre + out.join("|");
  }

  // ───────────────────────────── 4. nouns, pronouns, nominal predicates ─────────────────────────────
  var POSS = ["(I)m", "(I)n", "(s)I", "(I)mIz", "(I)nIz", "lArI"];
  var CASES = { acc: "(y)I", dat: "(y)A", loc: "DA", abl: "DAn", gen: "(n)In", ins: "(y)lA" };

  function mkNoun(base) {
    var ws = String(base).trim().split(/\s+/), last = ws.pop(), pre = ws.length ? ws.join(" ") + " " : "";
    var proper = /^[A-ZÇĞİÖŞÜ]/.test(last) && !/'/.test(last);
    return mk(last, { pre: pre, cat: "n", lemma: last, lex: nounLex(last), proper: proper });
  }
  function nbuf(w) { return attach(w, "n", { id: "N", k: "buf" }); }   // the pronominal n: onu, arabasına, evdekini
  function plural(w) { if (w.f.dem) w = nbuf(w); var x = attach(w, "lAr", { id: "PL" }); x.f.dem = false; return x; }
  function poss(w, p) {
    var x = attach(w, POSS[p], { id: "POSS" + (p + 1), cat: "n" });
    x.f.p3 = p === 2 || p === 5; x.f.dem = x.f.ki = false;
    return x;
  }
  function pronCase(w, c) {
    var L = lower(w.lemma);
    if (c === "dat" && (L === "ben" || L === "sen")) {   // bana, sana
      var x = clone(w); x.parts[0].t = L === "ben" ? "ban" : "san"; x.parts.push({ t: "a", k: "suf", id: "DAT" }); x.f.hv = null;
      return x;
    }
    if (c === "gen" && (L === "ben" || L === "biz")) return attach(w, "(I)m", { id: "GEN" });   // benim, bizim
    if (c === "ins" && L !== "onlar") return attach(addCase(w, "gen"), "lA", { id: "INS" });     // benimle, sizinle
    return null;
  }
  function addCase(w, c) {
    if (!CASES[c]) throw new Error("unknown case " + c);
    if (rootOnly(w) && w.lex.pron) { var r = pronCase(w, c); if (r) return r; }
    if (w.f.dem && c === "ins") return attach(addCase(w, "gen"), "lA", { id: "INS" });            // bununla, onunla
    if (lastPart(w).id === "MAK" && (c === "acc" || c === "dat")) {                              // okumayı, okumaya
      w = clone(w); var lp = lastPart(w); lp.t = lp.t.slice(0, -1); lp.id = "MA";
    }
    if ((w.f.dem || w.f.p3 || w.f.ki) && c !== "ins" && c !== "gen") w = nbuf(w);
    var x = attach(w, CASES[c], { id: c.toUpperCase(), cat: "n" });
    x.f.p3 = x.f.ki = x.f.dem = false;
    return x;
  }
  function ki(w) {
    var x = attach(w, rootOnly(w) && /^(bugün|dün|öbür)$/.test(lower(w.lemma)) ? "kü" : "ki", { id: "KI" });
    x.f.ki = true; x.f.p3 = x.f.dem = false;
    return x;
  }
  // diminutive -CIk: küçük → küçücük, ufak → ufacık; az → azıcık, dar → daracık from the lexicon
  function dim(w) {
    var L = lower(w.lemma);
    if (rootOnly(w) && LEX.dim[L]) return attach(w, LEX.dim[L], { id: "DIM", deriv: true });
    if (rootOnly(w) && /k$/.test(L) && syllables(L) > 1) { w = clone(w); w.parts[0].t = w.parts[0].t.slice(0, -1); }
    return attach(w, "CIK", { id: "DIM", deriv: true });
  }
  // decline("kitap", { pl, poss: "ben", case: "loc", ki }) → kitaplarımdaki
  function decline(base, o) {
    o = o || {};
    var w = typeof base === "string" ? mkNoun(base) : base;
    if (o.pl) w = plural(w);
    if (o.poss != null) w = poss(w, personIndex(o.poss));
    if (o["case"]) w = addCase(w, o["case"]);
    if (o.ki) w = ki(w);
    return w;
  }

  // Personal endings: type I after the copula, -(I)yor, -(y)AcAk, the aorist, -mIş, -mAlI, -mAktA;
  // type II after -DI and -sA (and the copula's -(y)DI, -(y)sA); the optative has its own.
  var E1 = ["(y)Im", "sIn", "", "(y)Iz", "sInIz", "lAr"];
  var E2 = ["m", "n", "", "k", "nIz", "lAr"];
  var EOPT = ["(y)Im", "sIn", "", "lIm", "sInIz", "lAr"];
  var COP = { past: "(y)DI", rep: "(y)mIş", cond: "(y)sA", dir: "DIr" };

  function person(w, set, p) {
    if (w.f.negAor && lastPart(w).id === "NAOR" && (p === 0 || p === 3)) {   // gelmem, gelmeyiz: the z of -mAz drops
      w = clone(w); var lp = lastPart(w); lp.t = lp.t.replace(/z$/, "");
      return attach(w, p === 0 ? "m" : "(y)Iz", { id: "P" + (p + 1) });
    }
    return set[p] ? attach(w, set[p], { id: set[p] === "lAr" ? "PL" : "P" + (p + 1) }) : w;
  }
  // the question particle, a word of its own that carries the endings: geliyor muyum, gelir miydin
  function qword(w) { return mk("m" + harm4(lastV(text(w))), { lemma: "mI" }); }

  // Nominal predicates: copula("öğrenci", { tense: "pres" | "past" | "rep" | "cond" | "dir", neg, q, p }).
  // A predicate ending in "değil" is negative already. Returns variants (arrays of words), the usual one first.
  function copula(pred, spec) {
    var p = personIndex(spec.p), q = !!spec.q, neg = !!spec.neg, t = spec.tense || "pres", out = [];
    if (p < 0) return null;
    var ws = String(pred).trim().split(/\s+/);
    if (ws.length > 1 && ws[ws.length - 1] === "değil") { ws.pop(); neg = true; }
    var head = mkNoun(ws.join(" "));
    if (neg && /^(var|yok)$/.test(lower(ws.join(" ")))) { head = mkNoun(lower(ws.join(" ")) === "var" ? "yok" : "var"); neg = false; }
    var tgt = neg ? mkNoun(text(head) + " değil") : head;
    if (t === "pres") {
      if (q) {
        if (p === 5) { var pl = plural(tgt); out.push([pl, qword(pl)]); }       // gençler mi
        else out.push([tgt, person(qword(tgt), E1, p)]);                         // genç miyim
      } else if (p === 2) out.push([tgt], [attach(tgt, "DIr", { id: "DIR" })]);  // öğrenci, öğrencidir
      else if (p === 5) out.push([plural(tgt)], [tgt]);                          // öğrenciler, öğrenci
      else out.push([person(tgt, E1, p)]);
      return out;
    }
    var copT = COP[t], set = t === "rep" ? E1 : E2;
    if (!copT) throw new Error("unknown tense " + t);
    if (t === "dir") {
      if (q) {
        if (p !== 2 && p !== 5) return null;
        var bq = p === 5 ? plural(tgt) : tgt;
        out.push([bq, attach(qword(bq), "DIr", { id: "DIR" })]);              // evde midir
        return out;
      }
      out.push([attach(p === 2 ? tgt : p === 5 ? plural(tgt) : person(tgt, E1, p), "DIr", { id: "DIR" })]);
      return out;
    }
    if (q) {
      if (t === "cond") return null;                                            // no question of a condition
      if (p === 5) { var pq = plural(tgt); out.push([pq, attach(qword(pq), copT, { id: "COP" })]); return out; }
      out.push([tgt, person(attach(qword(tgt), copT, { id: "COP" }), set, p)]);  // hasta mıydın
      return out;
    }
    if (p === 5) {
      var after = [attach(attach(tgt, copT, { id: "COP" }), "lAr", { id: "PL" })];   // evdeydiler, hastaymışlar
      var before = [attach(plural(tgt), copT, { id: "COP" })];                        // evdelerdi, evdelerse
      if (t === "cond") out.push(before, after); else out.push(after, before);
      return out;
    }
    out.push([person(attach(tgt, copT, { id: "COP" }), set, p)]);
    return out;
  }

  // ───────────────────────────── 5. verbs ─────────────────────────────
  // mkVerb("gelmek"), mkVerb("gel-"), mkVerb("yardım etmek"): only the last word is conjugated.
  function mkVerb(base) {
    var ws = String(base).trim().split(/\s+/), last = ws.pop(), pre = ws.length ? ws.join(" ") + " " : "";
    var stem = /m[ae]k$/.test(last) ? last.slice(0, -3) : last.replace(/-$/, "");
    return mk(stem, { pre: pre, cat: "v", lemma: stem, lex: verbLex(stem) });
  }
  function negate(w) { return attach(w, "mA", { id: "NEG", cat: "v" }); }

  // -(I)yor: a final a or e drops and the vowel before -yor follows the new last vowel (bekliyor,
  // anlıyor, gelmiyor, yapmıyor); de- and ye- become diyor, yiyor; a final ı i u ü stays (okuyor)
  function prog(w0) {
    var w = clone(w0), L = letters(text(w)), c = L.slice(-1);
    if (isV(c)) {
      if (c === "a" || c === "e") {
        var p = lastPart(w); p.t = p.t.slice(0, -1);
        w.parts.push({ t: harm4(lastV(text(w).slice(w.pre.length)) || c), k: "link" });
      }
      w.parts.push({ t: "yor", k: "suf", id: "PROG" });
    } else {
      var v = hvOf(w);
      alternate(w);
      w.parts.push({ t: harm4(v) + "yor", k: "suf", id: "PROG" });
    }
    w.f.hv = null; w.cat = "f";
    return w;
  }
  // the aorist: -r after a vowel; -Ir after a stem of two or more syllables, a passive, or one of the 13;
  // -Ar after any other one-syllable stem (yapar, gider, eder); compound verbs follow their auxiliary
  function aorKind(w) {
    if (w.f.aor) return w.f.aor;
    if (rootOnly(w) && w.lex.aor) return w.lex.aor;
    if (w.f.pass) return "Ir";
    return syllables(lastWord(text(w))) > 1 ? "Ir" : "Ar";
  }
  function aorist(w) {
    var L = letters(text(w));
    return attach(w, isV(L.slice(-1)) ? "r" : aorKind(w), { id: "AOR", cat: "f" });
  }
  function naor(w) { var x = attach(w, "mAz", { id: "NAOR", cat: "f" }); x.f.negAor = true; return x; }
  function auxv(w, a) {
    var d = LEX.aux[a];
    if (!d) throw new Error("unknown compound verb " + a);
    var x = attach(w, d[0], { id: a.toUpperCase(), cat: "v" });
    x.f.aor = d[1]; x.f.pass = false;
    return x;
  }
  // voices (b1-u10, b1-u11, b2-u07)
  function passive(w) {
    var c = lastC(text(w)), x = attach(w, isV(c) ? "n" : c === "l" ? "In" : "Il", { id: "PASS", cat: "v" });
    x.f.pass = true; x.f.aor = null;
    return x;
  }
  function reflexive(w) { var x = attach(w, isV(lastC(text(w))) ? "n" : "In", { id: "REFL", cat: "v" }); x.f.pass = false; x.f.aor = null; return x; }
  function reciprocal(w) { var x = attach(w, isV(lastC(text(w))) ? "ş" : "Iş", { id: "RECIP", cat: "v" }); x.f.pass = false; x.f.aor = null; return x; }
  function causative(w) {
    var x, L = w.lemma;
    if (rootOnly(w) && LEX.caus[L]) x = mk(LEX.caus[L], { pre: w.pre, cat: "v", lemma: LEX.caus[L], lex: verbLex(LEX.caus[L]) });
    else if (rootOnly(w) && LEX.causIr.indexOf(L) >= 0) x = attach(w, "Ir", { id: "CAUS", cat: "v" });
    else if (rootOnly(w) && LEX.causAr.indexOf(L) >= 0) x = attach(w, "Ar", { id: "CAUS", cat: "v" });
    else if (rootOnly(w) && LEX.causIt.indexOf(L) >= 0) x = attach(w, "It", { id: "CAUS", cat: "v" });
    else {
      // -t after a stem of two or more syllables ending in a vowel, l or r (okut, beklet, oturt); -DIr elsewhere
      var t = lastWord(text(w)), c = lastC(t);
      x = attach(w, syllables(t) > 1 && (isV(c) || c === "l" || c === "r") ? "t" : "DIr", { id: "CAUS", cat: "v" });
    }
    x.f.pass = false; x.f.aor = null;
    return x;
  }

  // Finite forms. spec: { tense, cop, ability, neg, q, aux, keske, periph, p }
  //   tense: present (-(I)yor), past (-DI), evid (-mIş), future (-(y)AcAk), aorist, necess (-mAlI), makta (-mAktA),
  //          cond (-sA), opt (optative), imp (imperative, sen and siz), imp3 (imperative, o and onlar)
  //   cop:   past (-(y)DI), rep (-(y)mIş), cond (-(y)sA), dir (-DIr)
  //   ability: -(y)Abil, or -(y)AmA with neg; aux: iver, akal, adur, ayaz, agel; keske: also with keşke
  //   periph: the tense of a participle before ol- (gelmiş olmalıyım: periph "evid", tense "necess")
  // Returns variants (arrays of words), the usual one first, or null where the form doesn't exist.
  function conj(base, spec) {
    var p = personIndex(spec.p), neg = !!spec.neg, t = spec.tense, out = null;
    if (p < 0) return null;
    if (spec.periph) return periph(base, spec, p);
    var w = typeof base === "string" ? mkVerb(base) : base;
    if (spec.aux) w = auxv(w, spec.aux);
    if (spec.ability) w = neg ? attach(w, "(y)A", { id: "INAB", cat: "v" }) : attach(w, "(y)Abil", { id: "ABIL", cat: "v" });
    if (neg && t !== "aorist") w = negate(w);
    var set = E1;
    switch (t) {
      case "present": w = prog(w); break;
      case "past": w = attach(w, "DI", { id: "PAST", cat: "f" }); set = E2; break;
      case "evid": w = attach(w, "mIş", { id: "EVID", cat: "n" }); break;
      case "future": w = attach(w, "(y)AcAK", { id: "FUT", cat: "n" }); break;
      case "aorist": w = neg ? naor(w) : aorist(w); break;
      case "necess": w = attach(w, "mAlI", { id: "NEC", cat: "f" }); break;
      case "makta": w = attach(w, "mAktA", { id: "MAKTA", cat: "f" }); break;
      case "cond": w = attach(w, "sA", { id: "COND", cat: "f" }); set = E2; break;
      case "opt":
        w = person(attach(w, "(y)A", { id: "OPT", cat: "f" }), EOPT, p);
        out = [spec.q ? [w, qword(w)] : [w]];
        break;
      case "imp":
        if (spec.q) return null;
        if (p === 1) out = [[w]];
        else if (p === 4) out = [[attach(w, "(y)In", { id: "IMP", keepDe: true })], [attach(w, "(y)InIz", { id: "IMP", keepDe: true })]];
        else return null;
        break;
      case "imp3":
        if (p !== 2 && p !== 5) return null;
        w = attach(w, "sIn", { id: "IMP3", cat: "f" });
        if (p === 5) w = attach(w, "lAr", { id: "PL" });
        out = [spec.q ? [w, qword(w)] : [w]];
        break;
      default: throw new Error("unknown tense " + t);
    }
    if (!out) out = finish(w, set, spec, p);
    if (!out || !out.length) return null;
    if (spec.keske) out = out.concat(out.map(function (v) { return [lit("keşke")].concat(v); }));
    return out;
  }
  function finish(w, set, spec, p) {
    var cop = spec.cop, q = !!spec.q, out = [];
    if (!cop) {
      if (spec.tense === "makta" && !q && (p === 2 || p === 5)) {   // formal: çalışmaktadır(lar), also çalışmakta(lar)
        var d = attach(w, "DIr", { id: "DIR" });
        if (p === 2) out.push([d], [w]); else out.push([attach(d, "lAr", { id: "PL" })], [attach(w, "lAr", { id: "PL" })]);
        return out;
      }
      if (set === E2) { var x = person(w, E2, p); out.push(q ? [x, qword(x)] : [x]); return out; }   // geldin mi
      if (!q) { out.push([person(w, E1, p)]); return out; }
      if (p === 5) { var pl = attach(w, "lAr", { id: "PL" }); out.push([pl, qword(pl)]); return out; }   // geliyorlar mı
      out.push([w, person(qword(w), E1, p)]);                                                        // geliyor muyum
      return out;
    }
    var copT = COP[cop];
    if (!copT) throw new Error("unknown copula " + cop);
    if (cop === "dir") {                                                 // gelmiştir, gelmişlerdir, gelmişimdir
      if (q) {
        if (p !== 2 && p !== 5) return null;
        var b = p === 5 ? attach(w, "lAr", { id: "PL" }) : w;
        out.push([b, attach(qword(b), "DIr", { id: "DIR" })]);         // gelmiş midir
        return out;
      }
      out.push([attach(p === 2 ? w : p === 5 ? attach(w, "lAr", { id: "PL" }) : person(w, E1, p), "DIr", { id: "DIR" })]);
      return out;
    }
    var cset = cop === "rep" ? E1 : E2;
    if (q) {
      if (cop === "cond" || spec.tense === "cond") return null;          // no question of a condition or of -sAydI
      if (p === 5) { var pq = attach(w, "lAr", { id: "PL" }); out.push([pq, attach(qword(pq), copT, { id: "COP" })]); return out; }
      out.push([w, person(attach(qword(w), copT, { id: "COP" }), cset, p)]);   // geliyor muydum, gelir miymişim
      return out;
    }
    if (p === 5) {
      out.push([attach(attach(w, "lAr", { id: "PL" }), copT, { id: "COP" })]);   // geliyorlardı, gelirlerse, gelselerdi
      out.push([attach(attach(w, copT, { id: "COP" }), "lAr", { id: "PL" })]);   // geliyordular, gelirseler, gelseydiler
    } else out.push([person(attach(w, copT, { id: "COP" }), cset, p)]);
    if (cop === "cond" && spec.tense === "past") out.push([attach(person(w, E2, p), copT, { id: "COP" })]);   // geldimse (spoken)
    return out;
  }
  // gelmiş olmalıyım, geliyor olacağım, gelecek olursam: a participle, then ol- conjugated
  function periph(base, spec, p) {
    var first = conj(base, { tense: spec.periph, neg: spec.neg, p: 2 }), s2 = {}, k;
    for (k in spec) if (k !== "periph" && k !== "neg") s2[k] = spec[k];
    s2.p = p;
    return conj(text(first[0][0]) + " olmak", s2);
  }

  // ───────────────────────────── 6. forms by name ─────────────────────────────
  // The rows of the coverage table in CURRICULUM.md, each with -negative and -question (and
  // -negative-question) slugs where the form has them, plus the other `form` slugs used by conjugate
  // exercises. form(slug, base, person) → { text, seg, variants, segs } or null.
  var TABLE = [
    // slug, coverage-table row, grammar points, "verb" | "nom" | "any", spec, polarities, persons
    ["copula-present", 'Present "to be" (copula)', "gp-copula-present", "nom", { tense: "pres" }],
    ["present-continuous", "Present continuous -(I)yor", "gp-present-continuous", "verb", { tense: "present" }],
    ["imperative", "Imperative, 2nd person", "gp-imperative", "verb", { tense: "imp" }, "pn", [1, 4]],
    ["past", "Past -DI", "gp-past-di", "verb", { tense: "past" }],
    ["past-copula", 'Past "to be" -(y)DI', "gp-past-copula", "nom", { tense: "past" }],
    ["reported-copula", 'Reported "to be" -(y)mIş', "gp-idi-imis", "nom", { tense: "rep" }],
    ["mis", "Evidential -mIş (first look; full evidential)", "gp-mis-intro, gp-evidential-mis", "verb", { tense: "evid" }],
    ["future", "Future -(y)AcAk", "gp-future", "verb", { tense: "future" }],
    ["aorist", "Aorist -r / -Ar / -Ir", "gp-aorist-forms, gp-aorist-irregulars, gp-aorist-negative", "verb", { tense: "aorist" }],
    ["ability", "Ability -(y)Abil / -(y)AmA", "gp-abil, gp-ama-inability", "verb", { tense: "aorist", ability: true }],
    ["ability-past", "Ability -(y)Abil / -(y)AmA, in the past", "gp-abil, gp-ama-inability", "verb", { tense: "past", ability: true }],
    ["necessitative", "Necessitative -mAlI", "gp-meli", "verb", { tense: "necess" }],
    ["optative", "Optative -(y)A", "gp-optative", "verb", { tense: "opt" }],
    ["imperative-3rd", "Imperative, 3rd person -sIn", "gp-imperative-3rd", "verb", { tense: "imp3" }, "pnq", [2, 5]],
    ["past-continuous", "Past continuous -(I)yordu", "gp-past-continuous, gp-di-compounds", "verb", { tense: "present", cop: "past" }],
    ["pluperfect", "Pluperfect -mIştI", "gp-pluperfect, gp-di-compounds", "verb", { tense: "evid", cop: "past" }],
    ["past-aorist", 'Past aorist, "used to" -(I)rdI', "gp-used-to", "verb", { tense: "aorist", cop: "past" }],
    ["future-in-past", "Future in the past -(y)AcAktI", "gp-future-in-past", "verb", { tense: "future", cop: "past" }],
    ["past-necessitative", "Past necessitative -mAlIydI", "gp-should-have", "verb", { tense: "necess", cop: "past" }],
    ["past-ability", "Past ability -(y)AbilIrdI", "gp-could-have", "verb", { tense: "aorist", ability: true, cop: "past" }],
    ["reported-present-continuous", "Reported compounds", "gp-mis-compounds", "verb", { tense: "present", cop: "rep" }],
    ["reported-future", "Reported compounds", "gp-mis-compounds", "verb", { tense: "future", cop: "rep" }],
    ["reported-aorist", "Reported compounds", "gp-mis-compounds", "verb", { tense: "aorist", cop: "rep" }],
    ["reported-mis", "Reported compounds", "gp-mis-compounds", "verb", { tense: "evid", cop: "rep" }],
    ["conditional-sa", "Conditional -sA", "gp-conditional-sa", "verb", { tense: "cond" }],
    ["conditional-aorist", "Real conditionals", "gp-conditional-real", "verb", { tense: "aorist", cop: "cond" }, "pn"],
    ["conditional-present", "Real conditionals", "gp-conditional-real", "verb", { tense: "present", cop: "cond" }, "pn"],
    ["conditional-past", "Real conditionals", "gp-conditional-real", "verb", { tense: "past", cop: "cond" }, "pn"],
    ["conditional-future", "Real conditionals", "gp-conditional-real", "verb", { tense: "future", cop: "cond" }, "pn"],
    ["conditional-mis", "Real conditionals", "gp-conditional-real", "verb", { tense: "evid", cop: "cond" }, "pn"],
    ["conditional-nominal", "Real conditionals", "gp-conditional-real", "nom", { tense: "cond" }, "pn"],
    ["unreal-present", "Unreal present -sA … -(I)rdI (the main clause; the if-clause is conditional-sa)", "gp-unreal-present", "verb", { tense: "aorist", cop: "past" }],
    ["unreal-past", "Unreal past -sAydI", "gp-unreal-past", "verb", { tense: "cond", cop: "past" }, "pn"],
    ["keske", "Wishes with keşke", "gp-keske", "verb", { tense: "cond", keske: true }, "pn"],
    ["keske-unreal-past", "Wishes with keşke", "gp-keske", "verb", { tense: "cond", cop: "past", keske: true }, "pn"],
    ["makta", "Formal progressive -mAktA", "gp-makta", "verb", { tense: "makta" }],
    ["mis-olmali", "Inference about the past", "gp-mis-olmali", "verb", { periph: "evid", tense: "necess" }],
    ["mis-olabilir", "Inference about the past", "gp-mis-olmali", "verb", { periph: "evid", tense: "aorist", ability: true }],
    ["mis-olacak", "Future perfect and future progressive", "gp-mis-olacak", "verb", { periph: "evid", tense: "future" }],
    ["iyor-olacak", "Future perfect and future progressive", "gp-mis-olacak", "verb", { periph: "present", tense: "future" }],
    ["acak-olsa", '"If it came to"', "gp-acak-olsa", "verb", { periph: "future", tense: "cond" }, "pn"],
    ["acak-olursa", '"If it came to"', "gp-acak-olsa", "verb", { periph: "future", tense: "aorist", cop: "cond" }, "pn"],
    ["mis-olsaydi", "Counterfactual perfect", "gp-mis-olsaydi", "verb", { periph: "evid", tense: "cond", cop: "past" }, "pn"],
    ["assumption", "Assumption -DIr", "gp-dir-assumption", "any", { tense: "evid", cop: "dir" }]
  ];
  var ALIAS = {
    "mis-positive": "mis", "evidential": "mis", "inability": "ability-negative", "past-inability": "past-ability-negative",
    "used-to": "past-aorist", "unreal-present-main": "unreal-present", "unreal-present-if": "conditional-sa",
    "unreal-past-if": "unreal-past", "causative-past": "past", "passive-past": "past", "caus-pass-past": "past",
    "ip-past": "past", "pass-abil-aorist": "ability", "copula-negative": "copula-present-negative",
    "copula-question": "copula-present-question", "copula-negative-question": "copula-present-negative-question",
    "mis-dir": "assumption", "mis-dir-negative": "assumption-negative", "mis-dir-question": "assumption-question"
  };
  var FORMS = {};
  function isVerbBase(b) { return /m[ae]k$/.test(lastWord(String(b).trim())); }
  TABLE.forEach(function (r) {
    var pols = r[5] || "pnq", persons = r[6] || [0, 1, 2, 3, 4, 5];
    [["", false, false], ["-negative", true, false], ["-question", false, true], ["-negative-question", true, true]].forEach(function (x) {
      if (x[2] && pols.indexOf("q") < 0) return;
      var spec = {}, k;
      for (k in r[4]) spec[k] = r[4][k];
      spec.neg = x[1]; spec.q = x[2];
      FORMS[r[0] + x[0]] = { slug: r[0] + x[0], row: r[1], gp: r[2], persons: persons, build: function (b, p) {
        if (persons.indexOf(p) < 0) return null;
        var s = {}, j;
        for (j in spec) s[j] = spec[j];
        s.p = p;
        if (r[3] === "nom" || (r[3] === "any" && !isVerbBase(b))) return copula(b, r[3] === "any" ? { tense: "dir", neg: s.neg, q: s.q, p: p } : s);
        return conj(b, s);
      } };
    });
  });

  // the other paradigms of the content: participles, verbal nouns, possessives, pronouns, compound verbs
  function vposs(tpl, id, o) {
    return function (b, p) {
      var w = mkVerb(b);
      if (o.neg) w = negate(w);
      w = poss(attach(w, tpl, { id: id, cat: "n" }), p);
      if (o.c) w = addCase(w, o.c);
      return (o.post || [null]).map(function (s) { return s ? [w, lit(s)] : [w]; });
    };
  }
  function moods(b, p, aux) {   // optative for ben and biz, imperative for sen and siz, -sIn for o and onlar
    return conj(b, { tense: p === 0 || p === 3 ? "opt" : p === 1 || p === 4 ? "imp" : "imp3", aux: aux, p: p });
  }
  function sana(neg) {          // otursana, otursanıza, bağırmasana
    return function (b, p) {
      if (p !== 1 && p !== 4) return null;
      var w = mkVerb(b);
      if (neg) w = negate(w);
      return [[attach(w, p === 1 ? "sAnA" : "sAnIzA", { id: "SANA", cat: "f" })]];
    };
  }
  function withWord(vs, s) { return vs && vs.map(function (v) { return v.concat([lit(s)]); }); }
  function compoundHead(base) {   // okul çantası → okul çanta, otobüs durağı → otobüs durak
    var w = mkNoun(base), word = w.parts[0].t, cands = [];
    if (/[aeıioöuü]s[ıiuü]$/.test(word)) cands.push(word.slice(0, -2));
    if (/[^aeıioöuü][ıiuü]$/.test(word)) {
      var h = word.slice(0, -1), un = { "ğ": "k", b: "p", c: "ç", d: "t", g: "k" }[h.slice(-1)];
      if (un) cands.push(h.slice(0, -1) + un);
      cands.push(h);
    }
    for (var i = 0; i < cands.length; i++) {
      var c = mkNoun(w.pre + cands[i]);
      if (text(poss(c, 2)) === String(base).trim()) return c;
    }
    return null;
  }
  var EXTRA = {
    "optative-imperative-3rd": function (b, p) { return p === 1 || p === 4 ? null : moods(b, p); },
    "iver-past": function (b, p) { return conj(b, { tense: "past", aux: "iver", p: p }); },
    "adur-imperative": function (b, p) { return moods(b, p, "adur"); },
    "ip-durmak-present": function (b, p) { return conj(text(attach(mkVerb(b), "(y)Ip", { id: "IP", keepDe: true })) + " durmak", { tense: "present", p: p }); },
    "sana-imperative": sana(false),
    "sana-imperative-negative": sana(true),
    "wh-ever": function (b, p) {   // ne yaparsam yapayım: aorist conditional + the same verb's optative or imperative
      var a = conj(b, { tense: "aorist", cop: "cond", p: p }), m = moods(b, p), out = [];
      a.forEach(function (x) { m.forEach(function (y) { out.push(x.concat(y)); }); });
      return out;
    },
    "acak-possessive": vposs("(y)AcAK", "FUT", {}),
    "dik-possessive": vposs("DIK", "DIK", {}),
    "dik-clause-accusative": vposs("DIK", "DIK", { c: "acc" }),
    "digi-gibi": vposs("DIK", "DIK", { post: ["gibi"] }),
    "digi-icin": vposs("DIK", "DIK", { post: ["için"] }),
    "digi-surece": vposs("DIK", "DIK", { post: ["sürece", null] }),
    "diginda": vposs("DIK", "DIK", { c: "loc" }),
    "digindan-beri": vposs("DIK", "DIK", { c: "abl", post: ["beri", null] }),
    "madigi-halde": vposs("DIK", "DIK", { neg: true, post: ["hâlde"] }),
    "lazim": vposs("mA", "MA", { post: ["lazım"] }),
    "ma-possessive-accusative": vposs("mA", "MA", { c: "acc" }),
    "reported-request": vposs("mA", "MA", { c: "acc" }),
    "mamasini-rica": vposs("mA", "MA", { neg: true, c: "acc" }),
    "masina-ragmen": vposs("mA", "MA", { c: "dat", post: ["rağmen"] }),
    "masindan-dolayi": vposs("mA", "MA", { c: "abl", post: ["dolayı"] }),
    "ip-mayacagi": function (b, p) {   // gelip gelmeyeceğimi
      return [[attach(mkVerb(b), "(y)Ip", { id: "IP", keepDe: true }), addCase(poss(attach(negate(mkVerb(b)), "(y)AcAK", { id: "FUT", cat: "n" }), p), "acc")]];
    },
    "mis-gibi": function (b, p) { return withWord(conj(b, { tense: "evid", p: p }), "gibi"); },
    "mis-gibi-negative": function (b, p) { return withWord(conj(b, { tense: "evid", neg: true, p: p }), "gibi"); },
    "zorunda": function (b, p) { return copula(b + " zorunda", { tense: "pres", p: p }); },
    "possessive": function (b, p) { return [[poss(mkNoun(b), p)]]; },
    "possessive-locative": function (b, p) { return [[addCase(poss(mkNoun(b), p), "loc")]]; },
    "possessive-var": function (b, p) { return [[poss(mkNoun(b), p), lit("var")]]; },
    "compound-possessive": function (b, p) { var h = compoundHead(b); return h ? [[poss(h, p)]] : null; },
    "kendi-accusative": function (b, p) {
      var r = [[addCase(poss(mkNoun("kendi"), p), "acc")]];
      if (p === 2) r.push([lit("kendini")]);
      return r;
    },
    "pronoun-genitive-ki": function (b, p) { return [[ki(addCase(mkNoun(PERSONS[p]), "gen"))]]; }
  };
  [["accusative", "acc"], ["dative", "dat"], ["locative", "loc"], ["ablative", "abl"], ["genitive", "gen"], ["ile", "ins"]].forEach(function (c) {
    EXTRA["pronoun-" + c[0]] = function (b, p) { return [[addCase(mkNoun(PERSONS[p]), c[1])]]; };
  });
  var EXTRA_PERSONS = { "sana-imperative": [1, 4], "sana-imperative-negative": [1, 4], "optative-imperative-3rd": [0, 2, 3, 5] };
  Object.keys(EXTRA).forEach(function (k) {
    FORMS[k] = { slug: k, row: null, gp: null, persons: EXTRA_PERSONS[k] || [0, 1, 2, 3, 4, 5], build: EXTRA[k] };
  });

  function pack(vs) {
    if (!vs || !vs.length) return null;
    var texts = [], segs = [];
    vs.forEach(function (v) {
      var t = v.map(text).join(" ");
      if (texts.indexOf(t) < 0) { texts.push(t); segs.push(v.map(segOf).join(" ")); }
    });
    return { text: texts[0], seg: segs[0], variants: texts, segs: segs };
  }
  function formInfo(slug) {
    var f = FORMS[ALIAS[slug] || slug];
    return f ? { slug: slug, same: ALIAS[slug] ? f.slug : null, row: f.row, gp: f.gp, persons: f.persons.map(function (i) { return PERSONS[i]; }) } : null;
  }
  function form(slug, base, person) {
    var f = FORMS[ALIAS[slug] || slug], p = personIndex(person);
    if (!f || p < 0) return null;
    return pack(f.build(base, p));
  }
  function paradigm(slug, base) {
    var out = {};
    PERSONS.forEach(function (n) { out[n] = form(slug, base, n); });
    return out;
  }
  function forms() { return Object.keys(FORMS).concat(Object.keys(ALIAS)).sort().map(formInfo); }

  // ───────────────────────────── 7. analysis of morph tiles ─────────────────────────────
  // Every suffix the analysis may try, by id: what it attaches to (v: a verb stem, n: a noun, adjective,
  // participle or verbal noun, f: a finite form, which takes endings and the copula but no case) and how.
  // build(base, ids) applies them in order; analyze(base, tiles) searches for them.
  var INV = [], BY_ID = {};
  function step(id, on, fn) { var s = { id: id, on: on.split(""), fn: fn }; INV.push(s); BY_ID[id] = s; }
  function tstep(id, on, tpl, cat, o) {
    step(id, on, function (w) { var oo = { id: id, cat: cat }, k; if (o) for (k in o) oo[k] = o[k]; return attach(w, tpl, oo); });
  }
  // nouns and finite forms
  step("PL", "nf", plural);
  [0, 1, 2, 3, 4, 5].forEach(function (i) { step("POSS" + (i + 1), "n", function (w) { return poss(w, i); }); });
  Object.keys(CASES).forEach(function (c) { step(c.toUpperCase(), "n", function (w) { return addCase(w, c); }); });
  step("KI", "n", ki);
  [0, 1, 3, 4].forEach(function (i) {
    step("E1-" + (i + 1), "nf", function (w) { return person(w, E1, i); });
    step("E2-" + (i + 1), "nf", function (w) { return person(w, E2, i); });
  });
  tstep("OPT-1P", "f", "lIm", "f");
  tstep("DIR", "nf", "DIr", "f");
  tstep("PCOP", "nf", "(y)DI", "f");
  tstep("RCOP", "nf", "(y)mIş", "f");
  tstep("CCOP", "nf", "(y)sA", "f");
  tstep("KEN", "nf", "(y)ken", "f");
  tstep("CASINA", "nf", "CAsInA", "n");
  // word building
  [["LI", "lI"], ["SIZ", "sIz"], ["CI", "CI"], ["LIK", "lIK"], ["CA", "CA"], ["SAR", "(ş)Ar"], ["LEYIN", "leyin"], ["DAS", "Daş"],
   ["IMSI", "(I)msI"], ["IMTIRAK", "(I)mtırak"], ["CAGIZ", "cAğIz"], ["INCI", "(I)ncI"], ["SAL", "sAl"]].forEach(function (d) {
    tstep(d[0], "n", d[1], "n", { deriv: true });
  });
  step("DIM", "n", dim);
  [["LA", "lA"], ["LAS", "lAş"], ["LAN", "lAn"], ["AL", "Al"]].forEach(function (d) { tstep(d[0], "n", d[1], "v", { deriv: true }); });
  // verbs
  step("NEG", "v", negate);
  tstep("ABIL", "v", "(y)Abil", "v");
  tstep("INAB", "v", "(y)A", "v");
  step("PASS", "v", passive);
  step("REFL", "v", reflexive);
  step("CAUS", "v", causative);
  step("RECIP", "v", reciprocal);
  Object.keys(LEX.aux).forEach(function (a) { step(a.toUpperCase(), "v", function (w) { return auxv(w, a); }); });
  step("PROG", "v", prog);
  tstep("PAST", "v", "DI", "f");
  tstep("EVID", "v", "mIş", "n");
  tstep("FUT", "v", "(y)AcAK", "n");
  step("AOR", "v", aorist);
  step("NAOR", "v", naor);
  tstep("NEC", "v", "mAlI", "f");
  tstep("COND", "v", "sA", "f");
  tstep("MAKTA", "v", "mAktA", "f");
  tstep("OPT", "v", "(y)A", "f");
  tstep("IMP", "v", "(y)In", "f", { keepDe: true });
  tstep("IMP-POLITE", "v", "(y)InIz", "f", { keepDe: true });
  tstep("IMP3", "v", "sIn", "f");
  tstep("SANA", "v", "sAnA", "f");
  tstep("SANIZA", "v", "sAnIzA", "f");
  // participles, verbal nouns, converbs
  tstep("AN", "v", "(y)An", "n");
  tstep("DIK", "v", "DIK", "n");
  tstep("ASI", "v", "(y)AsI", "n");
  tstep("MAK", "v", "mAk", "n");
  tstep("MA", "v", "mA", "n");
  tstep("IS", "v", "(y)Iş", "n", { keepDe: true });
  tstep("MAZLIK", "v", "mAzlIK", "n");
  tstep("IP", "v", "(y)Ip", "n", { keepDe: true });
  tstep("INCA", "v", "(y)IncA", "n", { keepDe: true });
  tstep("ARAK", "v", "(y)ArAk", "n");
  tstep("MADAN", "v", "mAdAn", "n");
  tstep("ALI", "v", "(y)AlI", "n");
  tstep("MAKSIZIN", "v", "mAksIzIn", "n");
  tstep("GAN", "v", "GAn", "n", { deriv: true });
  tstep("GIN", "v", "GIn", "n", { deriv: true });
  tstep("IM", "v", "(I)m", "n", { deriv: true });
  tstep("INTI", "v", "(I)ntI", "n", { deriv: true });
  tstep("ICI", "v", "(y)IcI", "n", { deriv: true });
  tstep("MAN", "v", "mAn", "n", { deriv: true });

  function build(base, ids) {
    var first = BY_ID[ids[0]];
    var w = typeof base !== "string" ? base : first && first.on[0] === "v" && isVerbBase(base) ? mkVerb(base) : mkNoun(base);
    ids.forEach(function (id) {
      var s = BY_ID[id];
      if (!s) throw new Error("unknown suffix " + id);
      if (s.on.indexOf(w.cat) < 0) throw new Error(id + " does not attach to " + { v: "a verb stem", n: "a noun", f: "a finite form" }[w.cat]);
      w = s.fn(w);
    });
    return { text: text(w), seg: segOf(w), word: w };
  }

  // fold for the loose search: the letters a harmony, assimilation or softening mistake can change
  var FOLD = { a: "A", e: "A", "ı": "I", i: "I", u: "I", "ü": "I", o: "O", "ö": "O", d: "D", t: "D", c: "C", "ç": "C",
               k: "K", "ğ": "K", g: "K", b: "P", p: "P" };
  function fold(s) { var o = ""; s = lower(s); for (var i = 0; i < s.length; i++) o += FOLD[s[i]] || s[i]; return o; }
  function bounds(w) { var set = {}, n = w.pre.length; for (var i = 0; i < w.parts.length; i++) { n += w.parts[i].t.length; set[n] = true; } return set; }
  function search(starts, target, B, loose, maxDepth) {
    var T = loose ? fold(target) : target, seen = {};
    function same(t) { return (loose ? fold(t) : t) === T; }
    function dfs(w, ids) {
      var t = text(w);
      if (ids.length && same(t)) {
        if (!B) return { w: w, ids: ids };
        var bs = bounds(w);
        if (B.every(function (b) { return bs[b]; })) return { w: w, ids: ids };
      }
      if (ids.length >= maxDepth) return null;
      var key = ids.length + "|" + w.cat + "|" + w.parts.map(function (p) { return p.t; }).join("|") + "|" + JSON.stringify(w.f);
      if (seen[key]) return null;
      seen[key] = true;
      for (var i = 0; i < INV.length; i++) {
        var s = INV[i], w2;
        if (s.on.indexOf(w.cat) < 0) continue;
        try { w2 = s.fn(w); } catch (e) { continue; }
        if (!w2) continue;
        // a later suffix can still change the last two letters (gitme → gitmiyor, kitap → kitabı, gelmez → gelmem)
        var t2 = text(w2), keep = Math.max(0, t2.length - 2);
        if (t2 === t || t2.length > T.length + 1 || (loose ? fold(t2) : t2).slice(0, keep) !== T.slice(0, keep)) continue;
        var r = dfs(w2, ids.concat(s.id));
        if (r) return r;
      }
      return null;
    }
    for (var j = 0; j < starts.length; j++) { var r = dfs(starts[j], []); if (r) return r; }
    return null;
  }
  // analyze(base, tiles): base is the dictionary form (verbs with -mAk), tiles the stem and suffixes in order.
  //   { ok: true, ids, seg }                       the tiles are base + suffixes, cut at morpheme boundaries
  //   { ok: false, reason: "boundaries", seg }     the word is right but the tiles cut a morpheme
  //   { ok: false, reason: "form", text, seg }     the same suffixes give another word: text is the engine's
  //   { ok: false, reason: "unknown" }             no analysis (a suffix or stem change the engine lacks)
  function analyze(base, tiles) {
    var target = tiles.join(""), B = [], n = 0, starts = [];
    for (var i = 0; i < tiles.length - 1; i++) { n += tiles[i].length; B.push(n); }
    if (isVerbBase(base)) starts.push(mkVerb(base));
    starts.push(mkNoun(base));
    var r = search(starts, target, B, false, 10);
    if (r) return { ok: true, text: target, seg: segOf(r.w), ids: r.ids };
    r = search(starts, target, null, false, 10);
    if (r) return { ok: false, reason: "boundaries", text: target, seg: segOf(r.w), ids: r.ids };
    r = search(starts, target, null, true, 10);
    if (r) return { ok: false, reason: "form", text: text(r.w), seg: segOf(r.w), ids: r.ids };
    return { ok: false, reason: "unknown" };
  }

  // ───────────────────────────── API ─────────────────────────────
  function out(w) { return { text: text(w), seg: segOf(w) }; }
  return {
    PERSONS: PERSONS.slice(), LEX: LEX, SUFFIXES: INV.map(function (s) { return s.id; }),
    // letters and sounds
    lower: lower, isVowel: isV, lastVowel: lastV, syllables: syllables, harmony2: harm2, harmony4: harm4, voiceless: voiceless,
    // words: noun("kitap"), verb("gelmek"), attach(word, "(y)A"), text(word), seg(word)
    noun: mkNoun, verb: mkVerb, attach: attach, text: text, seg: segOf,
    plural: plural, possessive: function (w, p) { return poss(w, personIndex(p)); }, addCase: addCase, ki: ki, diminutive: dim,
    negative: negate, passive: passive, reflexive: reflexive, causative: causative, reciprocal: reciprocal,
    // ready-made results { text, seg, variants, segs }
    decline: function (base, o) { return out(decline(base, o)); },
    conjugate: function (base, spec) { return pack(conj(base, spec)); },
    copula: function (pred, spec) { return pack(copula(pred, spec)); },
    build: build, form: form, formInfo: formInfo, forms: forms, paradigm: paradigm, analyze: analyze, fold: fold
  };
});
