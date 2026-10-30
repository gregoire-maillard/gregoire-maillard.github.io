/* © 2026 Grégoire Maillard. All rights reserved. Not open source: see /LICENSE.txt */
/* Turkish A1 → C2 (/turkish.html and the pages around it): the one shared script, see turkish/PROJECT.md.

   Loaded by every page of the section with <script defer src="/assets/js/turkish.js"></script>; it exposes
   window.TRK. In Node, require() returns the same object, which scripts/turkish/test.mjs uses to test the
   answer checker and the flashcard scheduler.

     1. Constants (PROJECT.md 6)
     2. Helpers: escaping, learning days
     3. Inline markup renderer (5.1)
     4. Answer checker (6.4)
     5. Data loading through index.json and its ?v= version (3, 5.10)
     6. The path: order, unlocking, what comes next (6.1)
     7. Progress: defaults, XP, streak, mistakes, export file checks (5.9, 6.3)
     8. Progress store: localStorage, or memory when it is unavailable (3, 5.9)
     9. Flashcard scheduler: Anki SM-2 with Anki's default settings, the daily session with undo, suspending,
        and the statistics of the flashcards page (6.6)
    10. Text-to-speech and typed input (6.5)
    11. Analytics: the two allowed events (3)

   No dependencies, no build step. Typed answers never leave the page. */
(function (root, factory) {
  var TRK = factory(root);
  if (typeof module === "object" && module.exports) module.exports = TRK;
  if (root && root.document) root.TRK = TRK;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";

  // ───────────────────────────── 1. constants ─────────────────────────────
  var C = {
    DATA: "/assets/data/turkish/",
    APP: "gregoiremaillard.com/turkish",
    KEYS: { course: "trk:v1:course", cards: "trk:v1:cards", settings: "trk:v1:settings" },
    PAGES: { hub: "/turkish.html", lesson: "/turkishlesson.html", guide: "/turkishguide.html", cards: "/turkishcards.html" },
    GUIDES: "/guides/",   // static page of each guide, e.g. /guides/a1-u02-grammar.html (built for dailyturkish.app only, see guideHref)
    LEVELS: ["a1", "a2", "b1", "b2", "c1", "c2"],
    PERSONS: ["ben", "sen", "o", "biz", "siz", "onlar"],
    DIRS: ["tr-en", "en-tr"],
    // 6.1 path: pass mark and session sizes
    PASS: 0.8, TEST_SIZE: 20, REVIEW_SIZE: 15, PRACTICE_SIZE: 15,
    // 6.2 lesson flow: a wrong exercise comes back at most this many times
    RETRIES: 2,
    // 6.3 XP and streak
    XP: { correct: 1, finish: 5, perfect: 5, review: 10, repeat: 0.5 },
    STREAK_CARDS: 10,      // cards studied (new + reviews) that count a day toward the streak
    KEEP_DAYS: 400,        // xp.days and cards.days are kept this long
    MAX_MISTAKES: 1000,
    // 6.4 answer checking
    EXPAND_MAX: 200, TYPO_MIN: 5,
    // 6.5 speech
    TTS_LANG: "tr-TR", TTS_SLOW: 0.6, TTS_WAIT: 1500,
    LETTERS: ["ç", "ğ", "ı", "ö", "ş", "ü"], LETTERS_UP: ["Ç", "Ğ", "İ", "Ö", "Ş", "Ü"],
    // 6.6 scheduler: steps in minutes, intervals in days (Anki's defaults)
    SRS: {
      learn: [1, 10], relearn: [10], graduate: 1, easy: 4,
      ease: 2.5, minEase: 1.3, hard: 1.2, easyBonus: 1.3, lapse: 0,
      maxIvl: 3650, leech: 8, fuzzFrom: 3, fuzz: 0.05,
      learnAhead: 20,      // minutes: at the end of a session, learning cards due this soon are shown early (Anki's learn-ahead limit)
      mature: 21           // days: a review card with an interval this long or longer is mature, shorter is young (as in Anki's stats)
    },
    // 5.9 settings defaults
    SETTINGS: {
      schema: 1, dailyGoal: 20, newPerDay: 15, reviewsPerDay: 200, directions: ["tr-en", "en-tr"], dayStartHour: 4,
      tts: true, ttsRate: 0.9, keyboardBar: true, unlockAll: false, onlyTaughtWords: false
    },
    GOALS: [10, 20, 30, 50]
  };

  // ───────────────────────────── 2. helpers ─────────────────────────────
  var ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ESC[c]; }); }
  function isObj(v) { return v !== null && typeof v === "object" && !Array.isArray(v); }
  function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function iso(t) { return new Date(t == null ? Date.now() : t).toISOString(); }
  function ms(t) { return t == null ? Date.now() : typeof t === "number" ? t : new Date(t).getTime(); }

  // A learning day (PROJECT.md 5.9) is a local date that starts at settings.dayStartHour:
  // with the default 4, Tuesday 02:30 still belongs to Monday. Local clock arithmetic, so DST is safe.
  function dayOf(t, hour) {
    var d = new Date(ms(t));
    if (d.getHours() < (hour || 0)) d.setDate(d.getDate() - 1);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function parseDay(s) { var p = String(s).split("-"); return [+p[0], +p[1], +p[2]]; }
  function dayStart(day, hour) { var p = parseDay(day); return new Date(p[0], p[1] - 1, p[2], hour || 0, 0, 0, 0).getTime(); }
  function addDays(day, n) {
    var p = parseDay(day), d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + n));
    return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate());
  }
  function daysBetween(a, b) { // b − a, in days
    var p = parseDay(a), q = parseDay(b);
    return Math.round((Date.UTC(q[0], q[1] - 1, q[2]) - Date.UTC(p[0], p[1] - 1, p[2])) / 864e5);
  }
  function hourOf(settings) { return settings && typeof settings.dayStartHour === "number" ? settings.dayStartHour : C.SETTINGS.dayStartHour; }

  // Turkish case mapping (PROJECT.md 7.2): never a bare toLowerCase()/toUpperCase() on Turkish.
  function trLower(s) { return String(s).replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase(); }
  function trUpper(s) { return String(s).replace(/i/g, "İ").replace(/ı/g, "I").toUpperCase(); }
  function fold(s) { return s.replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u"); }

  // ───────────────────────────── 3. inline markup (PROJECT.md 5.1) ─────────────────────────────
  // Rich:   *Turkish*  **bold**  `code`  [label](ref)  \* for a literal asterisk. Everything else is escaped.
  // TrRich: **bold** and [label](ref) only, paragraphs separated by a blank line.
  var RE = {
    unit: /^(?:a1|a2|b1|b2|c1|c2)-u\d{2}$/,
    lesson: /^(?:a1|a2|b1|b2|c1|c2)-u\d{2}-l\d{2}$/,
    exercise: /^(?:a1|a2|b1|b2|c1|c2)-u\d{2}-l\d{2}-e\d{2}$/,
    grammar: /^(?:a1|a2|b1|b2|c1|c2)-u\d{2}-grammar$/,
    culture: /^(?:a1|a2|b1|b2|c1|c2)-u\d{2}-culture$/,
    level: /^(?:a1|a2|b1|b2|c1|c2)$/,
    gp: /^gp-[a-z0-9]+(?:-[a-z0-9]+)*$/,
    card: /^fc-\d{4}$/,
    cardKey: /^fc-\d{4}:(?:tr-en|en-tr)$/,
    day: /^\d{4}-\d{2}-\d{2}$/,
    iso: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/,
    url: /^https:\/\/\S+$/
  };

  // Link to a grammar guide or interlude ("a1-u02-grammar"). dailyturkish.app has a static page per guide,
  // pre-rendered by .github/workflows/sync-dailyturkish.yml (scripts/turkish-static.mjs) so search engines
  // read it without JavaScript; gregoiremaillard.com and the iPhone app keep turkishguide.html?id=.
  // guidePath is the static address, used for canonical URLs everywhere.
  function staticGuides() {
    return !!(root && (root.TRK_STATIC_GUIDES === true || (root.location && /(^|\.)dailyturkish\.app$/.test(root.location.hostname))));
  }
  // On dailyturkish.app the course's home is "/" (index.html is the hub): link there, not to its duplicate /turkish.html.
  if (staticGuides()) C.PAGES.hub = "/";
  function guidePath(id) { return C.GUIDES + id + ".html"; }
  function guideHref(id, hash) { return (staticGuides() ? guidePath(id) : C.PAGES.guide + "?id=" + id) + (hash ? "#" + hash : ""); }

  // Where a reference points (PROJECT.md 3, "Links inside content"), and whether it exists yet.
  // Without an index every internal target counts as ready; grammar points need the index to find their unit.
  function href(ref, index) {
    var P = C.PAGES;
    if (RE.url.test(ref)) return { href: ref, ready: true, external: true };
    if (ref === "cards") return { href: P.cards, ready: !index || !!(index.flashcards && index.flashcards.count > 0) };
    var flat = index ? flatten(index) : null;
    var unitReady = function (u) { return !flat || !!(flat.unit[u] && flat.unit[u].status === "ready"); };
    if (RE.gp.test(ref)) {
      var pt = index && index.points ? index.points[ref] : null;
      if (!pt) return { href: P.guide + "#" + ref, ready: !index };
      return { href: guideHref(pt.unit + "-grammar", ref), ready: !!pt.ready };
    }
    if (RE.unit.test(ref)) return { href: P.hub + "#" + ref, ready: unitReady(ref) };
    if (RE.lesson.test(ref)) return { href: P.lesson + "?id=" + ref, ready: !flat || !!flat.lesson[ref] };
    if (RE.grammar.test(ref) || RE.culture.test(ref)) return { href: guideHref(ref), ready: unitReady(ref.slice(0, 6)) };
    return null;
  }

  var SLOT = /\u0002(\d+)\u0003/g;
  function richInline(s, opts) {
    opts = opts || {};
    var slots = [];
    var slot = function (html) { slots.push(html); return "\u0002" + (slots.length - 1) + "\u0003"; };
    var t = String(s == null ? "" : s).replace(/[\u0002\u0003]/g, "");
    if (!opts.tr) {
      t = t.replace(/\\\*/g, function () { return slot("*"); });
      t = t.replace(/`([^`\n]*)`/g, function (m, inner) { return slot("<code" + nw(inner) + ">" + esc(inner) + "</code>"); });
    }
    t = t.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, function (m, label, ref) { return slot(link(label, ref, opts)); });
    var h = emphasis(esc(t), opts);
    for (var i = 0; i < 4 && SLOT.test(h); i++) h = h.replace(SLOT, function (m, k) { return slots[+k]; });
    return h;
  }
  function emphasis(h, opts) {
    h = h.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
    if (!opts.tr) h = h.replace(/\*([^*\n]+)\*/g, function (m, inner) { return '<i lang="tr"' + nw(inner) + ">" + inner + "</i>"; });
    return h;
  }
  // A suffix or stem written with a hyphen (-um, oku-, -(y)AbIl) must not break after the hyphen: class trk-nw (white-space: nowrap).
  function nw(inner) { return /^\S*-\S*$/.test(inner) ? ' class="trk-nw"' : ""; }
  function link(label, ref, opts) {
    var inner = emphasis(esc(label), opts);
    var t = href(ref, opts.index);
    if (!t) return inner;
    if (!t.ready) return '<span class="trk-soon">' + inner + ' <small>(coming soon)</small></span>';
    if (t.external) return '<a href="' + esc(t.href) + '" target="_blank" rel="noopener">' + inner + "</a>";
    return '<a href="' + esc(t.href) + '">' + inner + "</a>";
  }
  // Rich text → HTML (inline). opts.index resolves links and marks unwritten targets "coming soon".
  function rich(s, opts) { return richInline(s, opts); }
  // TrRich → <p lang="tr"> paragraphs.
  function trRich(s, opts) {
    var o = { tr: true, index: opts && opts.index };
    return String(s == null ? "" : s).split(/\n\n+/).map(function (p) { return '<p lang="tr">' + richInline(p, o) + "</p>"; }).join("");
  }
  // Seg ("ev|ler|de") → stem and suffix spans, with the classes of stylesheets/styles.css: .stem and .suf.
  // Punctuation stays outside the spans. In a seg of several words, a word without bars is left plain
  // ("Kalem|ler mavi."); a one-word seg is always a stem, so a paradigm's bare "öğretmen" matches its rows.
  // opts.harmony also marks every suffix vowel .front (e, i, ö, ü) or .back (a, ı, o, u), as the grammar reader does.
  // opts.lastStem makes the last word a stem even without bars: a paradigm row's form ("öğrenci değil" beside "öğrenci değil|im").
  var SEG_WORD = /^([^A-Za-z0-9À-ɏ'|]*)(.*?)([^A-Za-z0-9À-ɏ'|]*)$/;
  var VOWEL_BACK = "aıouâûAIOUÂÛ", VOWEL_FRONT = "eiöüîEİÖÜÎ";
  function segPart(p, cls, harmony) {
    if (!p) return "";
    var inner = !harmony || cls !== "suf" ? esc(p) : p.split("").map(function (c) {
      return VOWEL_BACK.indexOf(c) >= 0 ? '<span class="back">' + c + "</span>" : VOWEL_FRONT.indexOf(c) >= 0 ? '<span class="front">' + c + "</span>" : esc(c);
    }).join("");
    return '<span class="' + cls + '">' + inner + "</span>";
  }
  function seg(s, opts) {
    var harmony = !!(opts && opts.harmony), words = String(s == null ? "" : s).split(" ");
    var last = words.length - 1;
    while (last > 0 && !words[last]) last--;
    return '<span lang="tr" class="trk-seg">' + words.map(function (word, i) {
      var m = SEG_WORD.exec(word), parts = m[2].split("|");
      if (!m[2] || (parts.length === 1 && words.length > 1 && !(opts && opts.lastStem && i === last))) return esc(word);
      return esc(m[1]) + parts.map(function (p, i) { return segPart(p, i ? "suf" : "stem", harmony); }).join("") + esc(m[3]);
    }).join(" ") + "</span>";
  }
  // Markup removed: for speech, aria-labels and titles.
  function plain(s) {
    return String(s == null ? "" : s).replace(/\\\*/g, "\u0001").replace(/`([^`]*)`/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\*+/g, "").replace(/\|/g, "").replace(/\u0001/g, "*");
  }

  // ───────────────────────────── 4. answer checker (PROJECT.md 6.4) ─────────────────────────────
  // expand() and norm() are the validator's (scripts/turkish/validate.mjs), character for character in
  // behaviour; scripts/turkish/test.mjs fails if the two ever drift apart.
  function expand(entry) {
    var parts = [], i = 0, lit = "";
    while (i < entry.length) {
      var ch = entry[i];
      if (ch === "[" || ch === "(") {
        var close = ch === "[" ? "]" : ")";
        var j = entry.indexOf(close, i + 1);
        if (j < 0) return { error: "unclosed “" + ch + "”" };
        var inner = entry.slice(i + 1, j);
        if (/[[\]()]/.test(inner)) return { error: "nested brackets are not allowed" };
        var alts = inner.split("|");
        var empty = alts.some(function (a) { return !a.trim(); });
        if (empty && ch === "[") return { error: "empty alternative in [ ]" };
        if (empty && ch === "(") return { error: "empty alternative in ( )" };
        if (ch === "[" && alts.length < 2) return { error: "[ ] needs at least two alternatives; use plain text" };
        parts.push([lit]); lit = "";
        parts.push(ch === "[" ? alts : [""].concat(alts));
        i = j + 1;
      } else if (ch === "]" || ch === ")" || ch === "|") {
        return { error: "stray “" + ch + "”" };
      } else { lit += ch; i++; }
    }
    parts.push([lit]);
    var out = [""];
    for (var k = 0; k < parts.length; k++) {
      var next = [];
      for (var a = 0; a < out.length; a++) for (var b = 0; b < parts[k].length; b++) next.push(out[a] + parts[k][b]);
      out = next;
      if (out.length > C.EXPAND_MAX) return { error: "more than " + C.EXPAND_MAX + " expansions" };
    }
    return { list: out.map(function (s) { return s.replace(/\s+/g, " ").replace(/\s+([.,!?;:…])/g, "$1").trim(); }) };
  }

  var CONTRACTIONS = [
    ["i'm", "i am"], ["you're", "you are"], ["we're", "we are"], ["they're", "they are"], ["he's", "he is"], ["she's", "she is"],
    ["it's", "it is"], ["that's", "that is"], ["there's", "there is"], ["here's", "here is"], ["what's", "what is"], ["where's", "where is"],
    ["who's", "who is"], ["how's", "how is"], ["isn't", "is not"], ["aren't", "are not"], ["wasn't", "was not"], ["weren't", "were not"],
    ["don't", "do not"], ["doesn't", "does not"], ["didn't", "did not"], ["haven't", "have not"], ["hasn't", "has not"], ["hadn't", "had not"],
    ["won't", "will not"], ["wouldn't", "would not"], ["can't", "can not"], ["cannot", "can not"], ["couldn't", "could not"],
    ["shouldn't", "should not"], ["mustn't", "must not"], ["i'll", "i will"], ["you'll", "you will"], ["he'll", "he will"],
    ["she'll", "she will"], ["it'll", "it will"], ["we'll", "we will"], ["they'll", "they will"], ["i've", "i have"], ["you've", "you have"],
    ["we've", "we have"], ["they've", "they have"], ["i'd", "i would"], ["you'd", "you would"], ["he'd", "he would"], ["she'd", "she would"],
    ["we'd", "we would"], ["they'd", "they would"], ["let's", "let us"],
    // the same without the apostrophe, which phone keyboards leave out (inputs have autocorrect off); not its, lets, were, well, ill, id, hed, shed, wed
    ["im", "i am"], ["youre", "you are"], ["theyre", "they are"], ["hes", "he is"], ["shes", "she is"], ["thats", "that is"],
    ["theres", "there is"], ["heres", "here is"], ["whats", "what is"], ["wheres", "where is"], ["whos", "who is"], ["hows", "how is"],
    ["isnt", "is not"], ["arent", "are not"], ["wasnt", "was not"], ["werent", "were not"], ["dont", "do not"], ["doesnt", "does not"],
    ["didnt", "did not"], ["havent", "have not"], ["hasnt", "has not"], ["hadnt", "had not"], ["wont", "will not"], ["wouldnt", "would not"],
    ["cant", "can not"], ["couldnt", "could not"], ["shouldnt", "should not"], ["mustnt", "must not"], ["ive", "i have"], ["youve", "you have"],
    ["weve", "we have"], ["theyve", "they have"], ["youll", "you will"], ["theyll", "they will"], ["itll", "it will"], ["youd", "you would"],
    ["theyd", "they would"]
  ].map(function (p) { return [new RegExp("(^|\\s)" + p[0] + "(?=\\s|$)", "g"), "$1" + p[1]]; });

  // Stage-1 normalization (apostrophes kept).
  function norm(s, lang) {
    s = String(s == null ? "" : s).normalize("NFC").replace(/[’‘ʼ´`]/g, "'").replace(/[“”„"«»]/g, " ");
    s = lang === "tr" ? trLower(s) : s.toLowerCase();
    s = s.replace(/̇/g, "").replace(/[.,!?;:()…¿¡]/g, " ").replace(/[-–—/]/g, " ");
    s = s.replace(/â/g, "a").replace(/î/g, "i").replace(/û/g, "u").replace(/\s+/g, " ").trim();
    if (lang === "en") {
      for (var i = 0; i < CONTRACTIONS.length; i++) s = s.replace(CONTRACTIONS[i][0], CONTRACTIONS[i][1]);
      s = fold(s).replace(/\s+/g, " ").trim();
    }
    return s;
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

  var expCache = {};
  function expansions(entry) {
    if (has(expCache, entry)) return expCache[entry];
    var e = expand(entry);
    return (expCache[entry] = e.error ? [entry] : e.list);
  }

  // check(answer, accepted[], rejected[], lang, mode) → { verdict: "correct" | "almost" | "wrong", note?, matched?, why?, canonical }
  //   lang: the language of the answer ("tr" or "en"); mode: "strict" or "lenient" (Turkish only).
  //   matched: the accepted expansion that matched (or nearly); canonical: accepted[0], shown after a mistake.
  function check(answer, accepted, rejected, lang, mode) {
    lang = lang === "en" ? "en" : "tr";
    mode = mode === "strict" ? "strict" : "lenient";
    accepted = accepted || []; rejected = rejected || [];
    var canonical = accepted[0];
    var a = norm(answer, lang);
    if (!a) return { verdict: "wrong", note: "empty", canonical: canonical };
    var i, r;
    for (i = 0; i < rejected.length; i++) {                                                   // 3. a predictable mistake
      r = rejected[i];
      if (norm(r.answer, lang) === a) return { verdict: "wrong", why: r.why, rejected: r.answer, canonical: canonical };
    }
    var exps = [];
    accepted.forEach(function (entry) { expansions(entry).forEach(function (s) { exps.push({ text: s, n: norm(s, lang) }); }); });
    for (i = 0; i < exps.length; i++) if (exps[i].n === a) return { verdict: "correct", matched: exps[i].text, canonical: canonical };   // 4.
    var noApos = function (s) { return s.replace(/'/g, ""); };
    var a2 = noApos(a);
    for (i = 0; i < exps.length; i++) if (noApos(exps[i].n) === a2) return { verdict: "almost", note: "apostrophe", matched: exps[i].text, canonical: canonical }; // 5.
    var folds = lang === "tr" && mode === "lenient";
    if (folds) {                                                                              // 6.
      var a3 = fold(a2);
      for (i = 0; i < exps.length; i++) if (fold(noApos(exps[i].n)) === a3) return { verdict: "almost", note: "Turkish letters", matched: exps[i].text, canonical: canonical };
    }
    // 6b. a rejected answer give or take apostrophes (and, in lenient Turkish, Turkish letters): still wrong, with its feedback
    var relax = function (s) { return folds ? fold(noApos(s)) : noApos(s); };
    for (i = 0; i < rejected.length; i++) {
      r = rejected[i];
      if (relax(norm(r.answer, lang)) === relax(a)) return { verdict: "wrong", why: r.why, rejected: r.answer, canonical: canonical };
    }
    if (lang === "en") {                                                                      // 7. one typo in a long word
      var aw = a.split(" ");
      for (i = 0; i < exps.length; i++) {
        var ew = exps[i].n.split(" ");
        if (ew.length !== aw.length) continue;
        var diff = [];
        for (var k = 0; k < ew.length && diff.length < 2; k++) if (ew[k] !== aw[k]) diff.push(k);
        if (diff.length !== 1) continue;
        var w = ew[diff[0]];
        if (w.replace(/'/g, "").length >= C.TYPO_MIN && distance(aw[diff[0]], w) === 1) return { verdict: "almost", note: "typo", matched: exps[i].text, canonical: canonical };
      }
    }
    return { verdict: "wrong", canonical: canonical };                                        // 8.
  }

  // What a typed answer is checked against, for the exercise types that take text (6.4 defaults).
  // index: the blank (cloze) or cell (conjugate). Returns null for types that compare tiles or option indexes.
  function answerSpec(ex, index) {
    switch (ex.type) {
      case "translate": return { accept: ex.accept, reject: ex.reject || [], lang: ex.from === "tr" ? "en" : "tr", mode: ex.diacritics || "lenient" };
      case "listen": return ex.mode === "type" ? { accept: [ex.tr].concat(ex.accept || []), reject: [], lang: "tr", mode: ex.diacritics || "lenient" } : null;
      case "cloze": {
        var b = ex.blanks[index || 0];
        return b && b.accept ? { accept: b.accept, reject: b.reject || [], lang: "tr", mode: ex.diacritics || "strict" } : null;
      }
      case "conjugate": {
        var c = ex.cells[index || 0];
        return c ? { accept: c.accept, reject: [], lang: "tr", mode: ex.diacritics || "strict" } : null;
      }
    }
    return null;
  }
  function checkExercise(ex, answer, index) {
    var s = answerSpec(ex, index);
    if (!s) throw new Error(ex.type + " exercises are not checked as text");
    return check(answer, s.accept, s.reject, s.lang, s.mode);
  }

  // ───────────────────────────── 5. data loading (PROJECT.md 3, 5.10) ─────────────────────────────
  // index.json is fetched with cache: "no-cache"; every other file with ?v=<index.version>, so a new
  // deploy changes every URL at once. Requests are shared and remembered for the life of the page.
  var fetched = {};
  function fetchJson(url, init) {
    if (fetched[url]) return fetched[url];
    if (typeof fetch !== "function") return Promise.reject(new Error("fetch is not available"));
    var p = fetch(url, init).then(function (r) {
      if (!r.ok) throw new Error("Could not load " + url + " (HTTP " + r.status + ")");
      return r.json();
    });
    fetched[url] = p;
    p.catch(function () { delete fetched[url]; });   // a later call retries
    return p;
  }
  // The file of any content ID: "a1", "a1-u05", "a1-u05-l01", "a1-u05-grammar", "a1-u05-culture",
  // or a flashcard file as listed in index.flashcards.files ("flashcards/fc-0001-0200.json").
  function dataPath(id) {
    if (/^flashcards\/fc-\d{4}-\d{4}\.json$/.test(id)) return id;
    if (RE.level.test(id)) return "levels/" + id + ".json";
    if (RE.unit.test(id)) return "units/" + id + ".json";
    if (RE.lesson.test(id)) return "lessons/" + id + ".json";
    if (RE.grammar.test(id)) return "grammar/" + id.slice(0, 6) + ".json";
    if (RE.culture.test(id)) return "culture/" + id.slice(0, 6) + ".json";
    throw new Error("Unknown content id " + id);
  }
  var data = {
    index: function () { return fetchJson(C.DATA + "index.json", { cache: "no-cache" }); },
    url: function (id, version) { return C.DATA + dataPath(id) + (version ? "?v=" + encodeURIComponent(version) : ""); },
    get: function (id) { return data.index().then(function (ix) { return fetchJson(data.url(id, ix.version)); }); },
    // every flashcard, sorted by rank ([] while the deck has no files yet)
    deck: function () {
      return data.index().then(function (ix) {
        var files = (ix.flashcards && ix.flashcards.files) || [];
        return Promise.all(files.map(function (f) { return fetchJson(data.url(f, ix.version)); })).then(function (all) {
          var cards = [];
          all.forEach(function (f) { cards = cards.concat(f.cards || []); });
          return cards.sort(function (a, b) { return a.rank - b.rank; });
        });
      });
    }
  };

  // ───────────────────────────── 6. the path (PROJECT.md 6.1) ─────────────────────────────
  // flatten(index): units in course order (planned ones included) and the lessons of ready units in order.
  var flatMemo = typeof WeakMap === "function" ? new WeakMap() : null;
  function flatten(index) {
    if (flatMemo && flatMemo.has(index)) return flatMemo.get(index);
    var f = { units: [], lessons: [], unit: {}, lesson: {}, level: {} };
    (index.levels || []).forEach(function (lv) {
      f.level[lv.id] = lv;
      (lv.units || []).forEach(function (u, i) {
        var o = { id: u.id, level: lv.id, cefr: lv.cefr, num: i + 1, title: u.title, titleTr: u.titleTr, status: u.status,
                  interlude: u.interlude, points: u.points || [], batch: u.batch, lessons: [] };
        f.units.push(o); f.unit[u.id] = o;
        if (u.status !== "ready") return;
        (u.lessons || []).forEach(function (l, k) {
          var lo = { id: l.id, unit: u.id, level: lv.id, num: k + 1, title: l.title, exercises: l.exercises, pos: f.lessons.length };
          o.lessons.push(lo); f.lessons.push(lo); f.lesson[l.id] = lo;
        });
      });
    });
    if (flatMemo) flatMemo.set(index, f);
    return f;
  }
  function lessonDone(course, id) { return !!(course && course.lessons && course.lessons[id]); }
  // A lesson opens when the lesson before it in course order is done (the first lesson of a unit: the last
  // lesson of the previous ready unit). settings.unlockAll opens everything.
  function lessonUnlocked(index, course, settings, id) {
    var f = flatten(index), l = f.lesson[id];
    if (!l) return false;
    if ((settings && settings.unlockAll) || l.pos === 0 || lessonDone(course, id)) return true;
    return lessonDone(course, f.lessons[l.pos - 1].id);
  }
  // planned | locked | open (unlocked, nothing done) | started | done; plus counts and the next lesson in it.
  function unitState(index, course, settings, unitId) {
    var u = flatten(index).unit[unitId];
    if (!u) return null;
    var units = (course && course.units && course.units[unitId]) || {};
    if (u.status !== "ready") return { status: "planned", done: 0, total: 0, next: null, mastered: false, reviewed: units.reviewed };
    var done = u.lessons.filter(function (l) { return lessonDone(course, l.id); }).length;
    var next = null;
    for (var i = 0; i < u.lessons.length; i++) if (!lessonDone(course, u.lessons[i].id)) { next = u.lessons[i].id; break; }
    var status = done === u.lessons.length ? "done" : done > 0 ? "started" : lessonUnlocked(index, course, settings, u.lessons[0].id) ? "open" : "locked";
    return { status: status, done: done, total: u.lessons.length, next: next, mastered: !!units.reviewed, reviewed: units.reviewed,
             viaTest: u.lessons.some(function (l) { return course.lessons[l.id] && course.lessons[l.id].via === "test"; }) };
  }
  function unitDone(index, course, unitId) {
    var u = flatten(index).unit[unitId];
    return !!u && u.status === "ready" && u.lessons.length > 0 && u.lessons.every(function (l) { return lessonDone(course, l.id); });
  }
  // The "continue" target: the first lesson not done, in course order (null when every written lesson is done).
  function nextLesson(index, course) {
    var L = flatten(index).lessons;
    for (var i = 0; i < L.length; i++) if (!lessonDone(course, L[i].id)) return L[i];
    return null;
  }
  // The first planned unit after the written ones: what the hub announces as coming next.
  function nextPlanned(index) {
    var U = flatten(index).units;
    for (var i = 0; i < U.length; i++) if (U[i].status !== "ready") return U[i];
    return null;
  }
  // "Jump here" (?test=<unit>): the lessons a passed test would mark done.
  function testLessons(index, course, unitId) {
    var f = flatten(index), out = [];
    for (var i = 0; i < f.units.length && f.units[i].id !== unitId; i++)
      f.units[i].lessons.forEach(function (l) { if (!lessonDone(course, l.id)) out.push(l.id); });
    return out;
  }

  // ───────────────────────────── 7. progress (PROJECT.md 5.9, 6.3) ─────────────────────────────
  function defaults(name, now) {
    if (name === "settings") return clone(C.SETTINGS);
    if (name === "course") return { schema: 1, updated: iso(now), lessons: {}, units: {}, mistakes: {}, xp: { total: 0, days: {} }, streak: { current: 0, best: 0, last: null } };
    if (name === "cards") return { schema: 1, updated: iso(now), cards: {}, days: {} };
    throw new Error("Unknown progress part " + name);
  }

  // The schemas of PROJECT.md 5.9, as the validator's --progress checks them.
  var S = {
    int: function (min, max) { return { t: "int", min: min, max: max }; },
    num: function (min, max) { return { t: "num", min: min, max: max }; },
    str: function (re, what) { return { t: "str", re: re, what: what }; },
    lit: function (v) { return { t: "lit", v: v }; },
    one: function (vs) { return { t: "one", vs: vs }; },
    bool: { t: "bool" },
    obj: function (f) { return { t: "obj", f: f }; },
    map: function (re, v, what) { return { t: "map", re: re, v: v, what: what }; },
    arr: function (item, min, max) { return { t: "arr", item: item, min: min, max: max }; },
    opt: function (spec) { var o = clone(spec) || {}; for (var k in spec) o[k] = spec[k]; o.opt = true; return o; },
    dayOrNull: { t: "dayOrNull" }
  };
  var T_ISO = S.str(RE.iso, "an ISO date-time"), T_DAY = S.str(RE.day, "a day (YYYY-MM-DD)");
  var SPEC = {};
  SPEC.course = S.obj({
    schema: S.lit(1), updated: T_ISO,
    lessons: S.map(RE.lesson, S.obj({ first: T_DAY, last: T_ISO, runs: S.int(1), best: S.num(0, 1), xp: S.int(0), via: S.opt(S.lit("test")) }), "a lesson id"),
    units: S.map(RE.unit, S.obj({ reviewed: S.opt(T_ISO), reviewBest: S.opt(S.num(0, 1)), tested: S.opt(T_ISO), guide: S.opt(T_ISO), culture: S.opt(T_ISO) }), "a unit id"),
    mistakes: S.map(RE.exercise, S.obj({ n: S.int(0), ok: S.int(0), last: T_ISO }), "an exercise id"),
    xp: S.obj({ total: S.int(0), days: S.map(RE.day, S.int(0), "a day") }),
    streak: S.obj({ current: S.int(0), best: S.int(0), last: S.dayOrNull })
  });
  SPEC.cards = S.obj({
    schema: S.lit(1), updated: T_ISO,
    cards: S.map(RE.cardKey, S.obj({
      s: S.one(["learning", "review", "relearning", "suspended"]), due: S.int(0), ivl: S.num(0, 36500), ease: S.num(1.3, 10),
      step: S.int(0), reps: S.int(0), lapses: S.int(0), last: S.int(0), leech: S.opt(S.lit(true)),
      was: S.opt(S.one(["learning", "review", "relearning"]))
    }), "a card key (fc-0042:tr-en)"),
    days: S.map(RE.day, S.obj({ "new": S.int(0), reviews: S.int(0), again: S.int(0),
                                lapses: S.opt(S.int(0)), mature: S.opt(S.int(0)), matureLapses: S.opt(S.int(0)) }), "a day")
  });
  SPEC.settings = S.obj({
    schema: S.lit(1), dailyGoal: S.one(C.GOALS), newPerDay: S.int(0, 100), reviewsPerDay: S.int(10, 9999),
    directions: S.arr(S.one(C.DIRS), 1, 2), dayStartHour: S.int(0, 23), tts: S.bool, ttsRate: S.num(0.5, 1.2),
    keyboardBar: S.bool, unlockAll: S.bool, onlyTaughtWords: S.bool
  });
  SPEC.progress = S.obj({ app: S.lit(C.APP), schema: S.lit(1), exported: T_ISO, course: SPEC.course, cards: SPEC.cards, settings: SPEC.settings });

  function vcheck(spec, v, p, errs) {
    var say = function (m) { errs.push((p || "file") + ": " + m); };
    switch (spec.t) {
      case "int": if (!Number.isInteger(v)) return say("expected a whole number");
        if (spec.min != null && v < spec.min) say(v + " is below " + spec.min);
        if (spec.max != null && v > spec.max) say(v + " is above " + spec.max);
        return;
      case "num": if (typeof v !== "number" || !isFinite(v)) return say("expected a number");
        if (spec.min != null && v < spec.min) say(v + " is below " + spec.min);
        if (spec.max != null && v > spec.max) say(v + " is above " + spec.max);
        return;
      case "str": if (typeof v !== "string" || !spec.re.test(v)) say("expected " + spec.what); return;
      case "lit": if (v !== spec.v) say("must be " + JSON.stringify(spec.v)); return;
      case "one": if (spec.vs.indexOf(v) < 0) say("must be one of " + spec.vs.map(function (x) { return JSON.stringify(x); }).join(", ")); return;
      case "bool": if (typeof v !== "boolean") say("expected true or false"); return;
      case "dayOrNull": if (v !== null && !(typeof v === "string" && RE.day.test(v))) say("expected a day (YYYY-MM-DD) or null"); return;
      case "arr":
        if (!Array.isArray(v)) return say("expected a list");
        if (spec.min != null && v.length < spec.min) say("needs at least " + spec.min + " item(s)");
        if (spec.max != null && v.length > spec.max) say("allows at most " + spec.max + " item(s)");
        var seen = {};
        v.forEach(function (x, i) { var k = JSON.stringify(x); if (seen[k]) say("duplicate item " + k); seen[k] = 1; vcheck(spec.item, x, p + "[" + i + "]", errs); });
        return;
      case "obj":
        if (!isObj(v)) return say("expected an object");
        Object.keys(v).forEach(function (k) { if (!has(spec.f, k)) errs.push((p ? p + "." : "") + k + ": unknown field"); });
        Object.keys(spec.f).forEach(function (k) {
          var q = p ? p + "." + k : k;
          if (!has(v, k)) { if (!spec.f[k].opt) say("missing field “" + k + "”"); return; }
          vcheck(spec.f[k], v[k], q, errs);
        });
        return;
      case "map":
        if (!isObj(v)) return say("expected an object");
        Object.keys(v).forEach(function (k) {
          if (!spec.re.test(k)) errs.push(p + "." + k + ": key is not " + spec.what);
          vcheck(spec.v, v[k], p + "." + k, errs);
        });
        return;
    }
  }
  function valid(spec, v) { var e = []; vcheck(spec, v, "", e); return !e.length; }
  // Keeps what is valid in a stored object: bad map entries are dropped, bad fields fall back to the default.
  function repair(spec, v, d) {
    if (valid(spec, v)) return v;
    if (spec.t === "obj" && isObj(v)) {
      var o = {};
      Object.keys(spec.f).forEach(function (k) {
        var dk = isObj(d) && has(d, k) ? d[k] : undefined;
        var r = has(v, k) ? repair(spec.f[k], v[k], dk) : clone(dk);
        if (r !== undefined) o[k] = r;
      });
      return o;
    }
    if (spec.t === "map" && isObj(v)) {
      var m = {};
      Object.keys(v).forEach(function (k) { if (spec.re.test(k) && valid(spec.v, v[k])) m[k] = v[k]; });
      return m;
    }
    return clone(d);
  }
  // Errors in an exported progress file, as messages (empty when it can be imported).
  function validateProgress(obj) { if (isObj(obj) && obj.app === "daily-turkmen") return ["This is a Daily Turkmen progress file. Import it in the Turkmen course; the Turkish course only takes Daily Turkish files."]; var e = []; vcheck(SPEC.progress, obj, "", e); return e; }

  function xpOn(course, day) { return (course.xp.days && course.xp.days[day]) || 0; }
  function addXp(course, settings, n, now) {
    n = Math.max(0, Math.round(n || 0));
    var day = dayOf(now, hourOf(settings));
    course.xp.total += n;
    course.xp.days[day] = xpOn(course, day) + n;
    return n;
  }
  // A day counts toward the streak once a lesson (or a unit review, or a mistakes practice) is finished,
  // or once 10 cards have been studied (6.3). Missing a day starts again from 1.
  function creditDay(course, settings, now) {
    var day = dayOf(now, hourOf(settings)), s = course.streak;
    if (s.last === day) return false;
    s.current = s.last && daysBetween(s.last, day) === 1 ? s.current + 1 : 1;
    if (s.current > s.best) s.best = s.current;
    s.last = day;
    return true;
  }
  // The streak as the learner sees it today: 0 once a whole day has been missed.
  function streakView(course, settings, now) {
    var day = dayOf(now, hourOf(settings)), s = course.streak;
    var gap = s.last ? daysBetween(s.last, day) : null;
    var alive = gap !== null && gap <= 1;
    return { current: alive ? s.current : 0, best: s.best, done: gap === 0 || gap < 0, last: s.last };
  }
  function goalView(course, settings, now) {
    var today = xpOn(course, dayOf(now, hourOf(settings))), goal = settings.dailyGoal;
    return { xp: today, goal: goal, met: today >= goal, ratio: Math.min(1, today / goal) };
  }
  function round3(x) { return Math.round(x * 1000) / 1000; }
  function goalAfter(course, settings, now, before) {
    var g = goalView(course, settings, now);
    return { today: g.xp, goal: g.goal, met: g.met, justMet: g.met && before < g.goal };
  }

  // result: { correct: exercises right on the first try, counted: exercises counted } (6.2)
  function finishLesson(course, settings, lessonId, result, now) {
    now = ms(now);
    var counted = Math.max(0, result.counted | 0), correct = Math.min(Math.max(0, result.correct | 0), counted);
    var score = counted ? round3(correct / counted) : 0, perfect = counted > 0 && correct === counted;
    var rec = course.lessons[lessonId], repeat = !!rec && !rec.via;
    var full = correct * C.XP.correct + C.XP.finish + (perfect ? C.XP.perfect : 0);
    var before = xpOn(course, dayOf(now, hourOf(settings)));
    var xp = addXp(course, settings, repeat ? full * C.XP.repeat : full, now);
    course.lessons[lessonId] = {
      first: rec ? rec.first : dayOf(now, hourOf(settings)), last: iso(now), runs: repeat ? rec.runs + 1 : 1,
      best: repeat ? Math.max(rec.best, score) : score, xp: (repeat ? rec.xp : 0) + xp
    };
    var newDay = creditDay(course, settings, now);
    return { xp: xp, score: score, perfect: perfect, repeat: repeat, streak: streakView(course, settings, now), streakUp: newDay, goal: goalAfter(course, settings, now, before) };
  }
  function finishReview(course, settings, unitId, result, now) {
    now = ms(now);
    var counted = Math.max(0, result.counted | 0), correct = Math.min(Math.max(0, result.correct | 0), counted);
    var score = counted ? round3(correct / counted) : 0, passed = score >= C.PASS;
    var before = xpOn(course, dayOf(now, hourOf(settings)));
    var u = course.units[unitId] || (course.units[unitId] = {});
    u.reviewBest = Math.max(u.reviewBest || 0, score);
    if (passed) u.reviewed = iso(now);
    var xp = addXp(course, settings, correct * C.XP.correct + (passed ? C.XP.review : 0), now);
    var newDay = creditDay(course, settings, now);
    return { xp: xp, score: score, passed: passed, streak: streakView(course, settings, now), streakUp: newDay, goal: goalAfter(course, settings, now, before) };
  }
  // A passed "jump here" test marks the given lessons done, without XP (6.1).
  function finishTest(course, settings, unitId, lessonIds, result, now) {
    now = ms(now);
    var counted = Math.max(0, result.counted | 0), correct = Math.min(Math.max(0, result.correct | 0), counted);
    var score = counted ? round3(correct / counted) : 0, passed = score >= C.PASS, marked = [];
    if (passed) {
      (lessonIds || []).forEach(function (id) {
        if (course.lessons[id]) return;
        course.lessons[id] = { first: dayOf(now, hourOf(settings)), last: iso(now), runs: 1, best: score, xp: 0, via: "test" };
        marked.push(id);
      });
      (course.units[unitId] || (course.units[unitId] = {})).tested = iso(now);
    }
    return { score: score, passed: passed, marked: marked };
  }
  function finishPractice(course, settings, result, now) {
    now = ms(now);
    var before = xpOn(course, dayOf(now, hourOf(settings)));
    var xp = addXp(course, settings, Math.max(0, result.correct | 0) * C.XP.correct, now);
    var newDay = creditDay(course, settings, now);
    return { xp: xp, streak: streakView(course, settings, now), streakUp: newDay, goal: goalAfter(course, settings, now, before) };
  }
  // Every answered exercise: a wrong answer is remembered; a right one counts toward clearing it (6.1, practice).
  function answered(course, exerciseId, correct, now) {
    var m = course.mistakes[exerciseId];
    if (!correct) { m = m || { n: 0, ok: 0, last: iso(now) }; m.n += 1; m.last = iso(now); course.mistakes[exerciseId] = m; }
    else if (m) { m.ok += 1; m.last = iso(now); }
    var keys = Object.keys(course.mistakes);
    if (keys.length > C.MAX_MISTAKES) {
      keys.sort(function (a, b) { return course.mistakes[a].last < course.mistakes[b].last ? -1 : course.mistakes[a].last > course.mistakes[b].last ? 1 : 0; });
      keys.slice(0, keys.length - C.MAX_MISTAKES).forEach(function (k) { delete course.mistakes[k]; });
    }
    return course.mistakes[exerciseId] || null;
  }
  // Exercises still to practise (n > ok), oldest first.
  function mistakesDue(course) {
    return Object.keys(course.mistakes).filter(function (k) { var m = course.mistakes[k]; return m.n > m.ok; })
      .sort(function (a, b) { var x = course.mistakes[a].last, y = course.mistakes[b].last; return x < y ? -1 : x > y ? 1 : a < b ? -1 : 1; });
  }
  function markRead(course, unitId, kind, now) {
    if (kind !== "guide" && kind !== "culture") throw new Error("kind is guide or culture");
    (course.units[unitId] || (course.units[unitId] = {}))[kind] = iso(now);
  }
  function pruneDays(days, settings, now) {
    var cut = addDays(dayOf(now, hourOf(settings)), -C.KEEP_DAYS);
    Object.keys(days).forEach(function (d) { if (d < cut) delete days[d]; });
  }
  // Achievements (decided in UI-5): read from the progress, so nothing new is stored and they follow the
  // learner to other devices with it. Each: { id, tr, en, text, have, need, done, glyph, hue } (hue: a level id or "gold").
  // The streak titles are the old craft ranks: çırak (apprentice), kalfa (journeyman), usta (master).
  function achievements(index, course, cards, settings, now) {
    now = ms(now);
    var f = flatten(index), ready = f.units.filter(function (u) { return u.status === "ready"; });
    var lessonIds = Object.keys(course.lessons), perfect = 0;
    lessonIds.forEach(function (id) { var r = course.lessons[id]; if (r.best >= 1 && !r.via) perfect += 1; });
    var unitsDone = ready.filter(function (u) { return unitDone(index, course, u.id); }).length;
    var units = Object.keys(course.units), count = function (k) { return units.filter(function (id) { return !!course.units[id][k]; }).length; };
    var lvlDone = function (lv) {   // [units done, units in the level] (unwritten units count toward the total)
      var us = f.units.filter(function (u) { return u.level === lv; });
      return [us.filter(function (u) { return u.status === "ready" && unitDone(index, course, u.id); }).length, us.length || 12];
    };
    var a1 = lvlDone("a1"), a2 = lvlDone("a2"), b1 = lvlDone("b1");
    var best = Math.max(course.streak.best || 0, streakView(course, settings, now).current);
    var goal = settings.dailyGoal, xpDays = course.xp.days;
    var goalDays = Object.keys(xpDays).filter(function (d) { return xpDays[d] >= goal; }).length;
    var bigDay = Object.keys(xpDays).reduce(function (m, d) { return Math.max(m, xpDays[d]); }, 0);
    var cdays = (cards && cards.days) || {}, active = {}, cardDay = 0;
    Object.keys(xpDays).forEach(function (d) { if (xpDays[d] > 0) active[d] = true; });
    Object.keys(cdays).forEach(function (d) { var n = (cdays[d]["new"] || 0) + (cdays[d].reviews || 0); if (n > 0) active[d] = true; cardDay = Math.max(cardDay, n); });
    var words = {}, known = {};
    Object.keys((cards && cards.cards) || {}).forEach(function (k) { var c = cards.cards[k], w = k.split(":")[0]; if (c.ivl > 0) words[w] = true; if (c.ivl >= 21) known[w] = true; });
    var nWords = Object.keys(words).length, nKnown = Object.keys(known).length;
    var cleared = Object.keys(course.mistakes).filter(function (k) { var m = course.mistakes[k]; return m.n > 0 && m.ok >= m.n; }).length;
    var repeats = lessonIds.filter(function (id) { return course.lessons[id].runs > 1; }).length;
    var list = [
      // lessons and units
      ["first-lesson", "İlk adım", "First step", "Finish your first lesson", lessonIds.length, 1, "1", "a1"],
      ["lessons-10", "On ders", "Ten lessons", "Finish 10 lessons", lessonIds.length, 10, "10", "a1"],
      ["lessons-50", "Elli ders", "Fifty lessons", "Finish 50 lessons", lessonIds.length, 50, "50", "a1"],
      ["perfect", "Kusursuz", "Flawless", "Finish a lesson without a mistake", perfect, 1, "✓", "gold"],
      ["perfect-10", "Mükemmeliyetçi", "Perfectionist", "Finish 10 lessons without a mistake", perfect, 10, "✓✓", "gold"],
      ["repeat-5", "Tekrar", "Once more", "Redo 5 lessons to sharpen them", repeats, 5, "↻", "a2"],
      ["first-unit", "İlk ünite", "First unit", "Finish every lesson of a unit and lay your first tile", unitsDone, 1, "◆", "a2"],
      ["units-5", "Beş çini", "Five tiles", "Finish 5 units", unitsDone, 5, "5◆", "a2"],
      ["golden-tile", "Altın çini", "Golden tile", "Pass a unit review to glaze a tile gold", count("reviewed"), 1, "★", "gold"],
      ["golden-5", "Altın duvar", "Golden wall", "Glaze 5 tiles gold", count("reviewed"), 5, "5★", "gold"],
      ["mistakes-10", "Telafi", "Making amends", "Clear 10 mistakes in practice", cleared, 10, "✗→✓", "b1"],
      // levels
      ["a1", "A1 tamam", "A1 complete", "Finish all " + a1[1] + " units of A1", a1[0], a1[1], "A1", "a1"],
      ["a2", "A2 tamam", "A2 complete", "Finish all " + a2[1] + " units of A2", a2[0], a2[1], "A2", "a2"],
      ["b1", "B1 tamam", "B1 complete", "Finish all " + b1[1] + " units of B1", b1[0], b1[1], "B1", "b1"],
      // regularity
      ["streak-3", "Çırak", "Apprentice", "Keep a 3-day streak", best, 3, "3", "b2"],
      ["streak-7", "Kalfa", "Journeyman", "Keep a 7-day streak", best, 7, "7", "b2"],
      ["streak-30", "Usta", "Master", "Keep a 30-day streak", best, 30, "30", "b2"],
      ["streak-100", "Üstat", "Grand master", "Keep a 100-day streak", best, 100, "100", "b2"],
      ["goal-7", "Hedef", "On target", "Meet your daily goal on 7 days", goalDays, 7, "◎", "b1"],
      ["goal-30", "Azim", "Determination", "Meet your daily goal on 30 days", goalDays, 30, "◎◎", "b1"],
      ["days-50", "Sadık", "Faithful", "Study on 50 different days", Object.keys(active).length, 50, "50d", "b1"],
      ["big-day", "Çalışkan", "Hard worker", "Earn 100 XP in a single day", bigDay, 100, "⚡", "b2"],
      // words
      ["words-100", "Yüz kelime", "A hundred words", "Learn 100 words in the flashcards", nWords, 100, "100", "c1"],
      ["words-500", "Beş yüz kelime", "Five hundred words", "Learn 500 words in the flashcards", nWords, 500, "500", "c1"],
      ["words-1000", "Bin kelime", "The whole deck", "Learn all 1,000 words in the flashcards", nWords, 1000, "1000", "c1"],
      ["known-100", "Sağlam hafıza", "Solid memory", "Know 100 words well (reviewed at 3+ week intervals)", nKnown, 100, "∞", "c1"],
      ["cards-100", "Maraton", "Marathon", "Study 100 flashcards in a single day", cardDay, 100, "🂠", "c1"],
      // reading
      ["guides-12", "Kitap kurdu", "Bookworm", "Read 12 grammar guides", count("guide"), 12, "§", "a2"],
      ["culture-12", "Gezgin", "Traveller", "Read 12 culture interludes", count("culture"), 12, "✦", "b1"],
      // XP
      ["xp-1000", "Bin XP", "A thousand XP", "Earn 1,000 XP", course.xp.total, 1000, "1K", "c2"],
      ["xp-5000", "Beş bin XP", "Five thousand XP", "Earn 5,000 XP", course.xp.total, 5000, "5K", "c2"],
      ["xp-10000", "On bin XP", "Ten thousand XP", "Earn 10,000 XP", course.xp.total, 10000, "10K", "c2"]
    ];
    return list.map(function (a) {
      return { id: a[0], tr: a[1], en: a[2], text: a[3], have: Math.min(a[4], a[5]), need: a[5], done: a[4] >= a[5], glyph: a[6], hue: a[7] };
    });
  }

  // ───────────────────────────── 8. progress store (PROJECT.md 3, 5.9) ─────────────────────────────
  // createStore(storage): storage is window.localStorage or anything with getItem/setItem/removeItem;
  // null keeps everything in memory. store.problem tells the page what to say:
  //   "unavailable"  storage blocked or missing: progress lasts until the page is closed
  //   "quota"        a write failed: the latest progress is only in memory
  //   "corrupt"      a saved key couldn't be read and was replaced by defaults (store.corrupt keeps the raw text)
  var NAMES = ["course", "cards", "settings"];
  function createStore(storage) {
    var mem = {}, cache = {}, subs = [];
    var store = { persistent: false, problem: null, corrupt: {} };
    if (storage) {
      try { storage.setItem("trk:v1:probe", "1"); storage.removeItem("trk:v1:probe"); store.persistent = true; }
      catch (e) { store.problem = "unavailable"; }
    } else store.problem = "unavailable";

    function raw(name) {
      var k = C.KEYS[name];
      if (store.persistent) { try { var v = storage.getItem(k); if (v !== null) return v; } catch (e) { /* fall through */ } }
      return has(mem, k) ? mem[k] : null;
    }
    function get(name) {
      if (cache[name]) return cache[name];
      var r = raw(name), v = defaults(name);
      if (r !== null) {
        var parsed;
        try { parsed = JSON.parse(r); } catch (e) { parsed = null; }
        if (isObj(parsed) && parsed.schema === 1) v = repair(SPEC[name], parsed, defaults(name));
        else { store.corrupt[name] = r; store.problem = store.problem || "corrupt"; }
      }
      return (cache[name] = v);
    }
    function put(name, v, now) {
      var s = get("settings");
      if (name === "course") { v.updated = iso(now); pruneDays(v.xp.days, s, now); }
      if (name === "cards") { v.updated = iso(now); pruneDays(v.days, s, now); }
      var text = JSON.stringify(v), k = C.KEYS[name];
      cache[name] = v; mem[k] = text;
      if (store.persistent) { try { storage.setItem(k, text); } catch (e) { store.problem = "quota"; } }
      emit(name);
    }
    function emit(name) { subs.slice().forEach(function (fn) { try { fn(name); } catch (e) { setTimeout(function () { throw e; }); } }); }

    store.course = function () { return get("course"); };
    store.cards = function () { return get("cards"); };
    store.settings = function () { return get("settings"); };
    // update("course", fn): fn changes the object in place; the store saves it and returns fn's result
    store.update = function (name, fn, now) { var v = get(name); var r = fn(v); put(name, v, ms(now)); return r; };
    store.setSettings = function (patch) {
      var merged = clone(get("settings"));
      Object.keys(patch || {}).forEach(function (k) { if (has(C.SETTINGS, k) && k !== "schema") merged[k] = patch[k]; });
      var fixed = repair(SPEC.settings, merged, get("settings"));
      put("settings", fixed);
      return fixed;
    };
    store.exportData = function (now) {
      return { app: C.APP, schema: 1, exported: iso(now), course: clone(get("course")), cards: clone(get("cards")), settings: clone(get("settings")) };
    };
    // Replaces all progress with an exported file. Returns { ok, errors }.
    store.importData = function (obj) {
      var errors = validateProgress(obj);
      if (errors.length) return { ok: false, errors: errors };
      cache = {};
      put("settings", clone(obj.settings));
      ["course", "cards"].forEach(function (n) {           // keep the file's own "updated" times
        var v = clone(obj[n]), text = JSON.stringify(v), k = C.KEYS[n];
        cache[n] = v; mem[k] = text;
        if (store.persistent) { try { storage.setItem(k, text); } catch (e) { store.problem = "quota"; } }
        emit(n);
      });
      store.corrupt = {};
      if (store.problem === "corrupt") store.problem = null;
      return { ok: true, errors: [] };
    };
    store.reset = function () {
      NAMES.forEach(function (n) { put(n, defaults(n)); });
      store.corrupt = {};
      if (store.problem === "corrupt") store.problem = null;
    };
    // fn(name) after every save here, and when another tab changes the progress
    store.onChange = function (fn) { subs.push(fn); return function () { subs = subs.filter(function (f) { return f !== fn; }); }; };
    store.forget = function (name) { if (name) delete cache[name]; else cache = {}; };

    // Shortcuts for the pages: each one changes the course progress and saves it.
    var S_ = store.settings;
    store.finishLesson = function (id, result, now) { return store.update("course", function (c) { return finishLesson(c, S_(), id, result, ms(now)); }, now); };
    store.finishReview = function (unitId, result, now) { return store.update("course", function (c) { return finishReview(c, S_(), unitId, result, ms(now)); }, now); };
    store.finishTest = function (unitId, lessonIds, result, now) { return store.update("course", function (c) { return finishTest(c, S_(), unitId, lessonIds, result, ms(now)); }, now); };
    store.finishPractice = function (result, now) { return store.update("course", function (c) { return finishPractice(c, S_(), result, ms(now)); }, now); };
    store.answered = function (exerciseId, correct, now) { return store.update("course", function (c) { return answered(c, exerciseId, correct, ms(now)); }, now); };
    store.markRead = function (unitId, kind, now) { return store.update("course", function (c) { return markRead(c, unitId, kind, ms(now)); }, now); };
    // A flashcard session wired to this store (6.6): answers are saved, and the 10th card of the day credits the streak.
    store.cardSession = function (deck, opts) {
      opts = opts || {};
      return session({
        deck: deck, cards: get("cards"), settings: get("settings"), course: get("course"), index: opts.index, now: opts.now, rng: opts.rng,
        save: function (cards, now) { put("cards", cards, now); },
        onCredit: function (now) { store.update("course", function (c) { creditDay(c, get("settings"), now); }, now); }
      });
    };
    // Suspends (on = true) or unsuspends flashcards by key ("fc-0042:tr-en"); returns how many changed.
    // A suspended card keeps its schedule and returns to it; a card never studied goes back to new.
    store.setSuspended = function (keys, on, now) {
      now = ms(now);
      return store.update("cards", function (c) {
        var n = 0;
        (keys || []).forEach(function (k) {
          if (!RE.cardKey.test(k)) return;
          var s = c.cards[k], susp = !!s && s.s === "suspended";
          if (!!on === susp) return;
          if (on) c.cards[k] = suspend(s || null, now);
          else { var u = unsuspend(s); if (u) c.cards[k] = u; else delete c.cards[k]; }
          n++;
        });
        return n;
      }, now);
    };

    if (storage && root && root.localStorage === storage && typeof root.addEventListener === "function") {
      root.addEventListener("storage", function (e) {
        if (e.key === null) { cache = {}; NAMES.forEach(emit); return; }
        NAMES.forEach(function (n) { if (e.key === C.KEYS[n]) { delete cache[n]; emit(n); } });
      });
    }
    return store;
  }
  var defaultStore = null;
  function browserStorage() {
    if (!root || !root.document) return null;           // Node: memory only
    try { return root.localStorage || null; } catch (e) { return null; }
  }

  // ───────────────────────────── 9. flashcard scheduler (PROJECT.md 6.6) ─────────────────────────────
  var GRADES = { again: 1, hard: 2, good: 3, easy: 4 };
  function gradeOf(g) { var n = typeof g === "string" ? GRADES[g] : g; if (!(n >= 1 && n <= 4)) throw new Error("grade is again, hard, good or easy (1–4)"); return n; }
  function r2(x) { return Math.round(x * 100) / 100; }
  function fuzzed(ivl, rng) {
    var K = C.SRS;
    ivl = Math.min(K.maxIvl, Math.max(1, Math.round(ivl)));
    if (ivl < K.fuzzFrom) return ivl;
    var f = Math.max(1, Math.round(ivl * K.fuzz));
    return Math.min(K.maxIvl, Math.max(1, ivl + Math.floor(rng() * (2 * f + 1)) - f));
  }
  function stepDelay(steps, step, grade) {      // minutes, for learning and relearning cards
    if (grade === 1) return steps[0];
    if (grade === 2) return step === 0 && steps.length > 1 ? (steps[0] + steps[1]) / 2 : steps[Math.min(step, steps.length - 1)];
    return steps[step];
  }
  // answer(state or null for a new card, grade, now, settings, rng) → the card's new state (the input is not changed).
  function answer(prev, grade, now, settings, rng) {
    var K = C.SRS, g = gradeOf(grade), hour = hourOf(settings);
    now = ms(now); rng = rng || Math.random;
    var today = dayOf(now, hour);
    var s = prev ? clone(prev) : { s: "learning", due: now, ivl: 0, ease: K.ease, step: 0, reps: 0, lapses: 0, last: now };
    var toReview = function (ivl) { s.s = "review"; s.ivl = ivl; s.step = 0; s.due = dayStart(addDays(today, ivl), hour); };
    var wait = function (min) { s.due = Math.round(now + min * 60000); };
    if (s.s === "suspended") throw new Error("a suspended card can't be answered");

    if (s.s === "learning" || s.s === "relearning") {
      var steps = s.s === "learning" ? K.learn : K.relearn;
      var step = Math.min(s.step, steps.length - 1);
      var relearn = s.s === "relearning";
      if (g === 1) { s.step = 0; wait(stepDelay(steps, 0, 1)); }
      else if (g === 2) { s.step = step; wait(stepDelay(steps, step, 2)); }
      else if (g === 3) {
        if (step + 1 < steps.length) { s.step = step + 1; wait(steps[step + 1]); }
        else toReview(relearn ? Math.max(1, s.ivl) : fuzzed(K.graduate, rng));
      } else toReview(relearn ? Math.max(1, s.ivl) + 1 : fuzzed(K.easy, rng));
    } else {                                                     // review
      var late = Math.max(0, daysBetween(dayOf(s.due, hour), today));
      var ivl = s.ivl, ease = s.ease;
      if (g === 1) {
        s.lapses += 1; s.ease = r2(Math.max(K.minEase, ease - 0.2));
        s.s = "relearning"; s.step = 0; s.ivl = Math.max(1, Math.round(ivl * K.lapse));
        wait(K.relearn[0]);
        if (s.lapses >= K.leech) s.leech = true;
      } else {
        var cap = function (x) { return Math.min(K.maxIvl, Math.round(x)); };
        var hard = cap(Math.max(ivl + 1, ivl * K.hard));
        var good = cap(Math.max(hard + 1, (ivl + late / 2) * ease));
        var easy = cap(Math.max(good + 1, (ivl + late) * ease * K.easyBonus));
        if (g === 2) { s.ease = r2(Math.max(K.minEase, ease - 0.15)); toReview(fuzzed(hard, rng)); }
        else if (g === 3) toReview(fuzzed(good, rng));
        else { s.ease = r2(ease + 0.15); toReview(fuzzed(easy, rng)); }
      }
    }
    s.reps += 1; s.last = now;
    return s;
  }
  // The four buttons' next intervals, without fuzz: [{ ms } or { days }] for again, hard, good, easy.
  function preview(prev, now, settings) {
    now = ms(now);
    return [1, 2, 3, 4].map(function (g) {
      var s = answer(prev, g, now, settings, function () { return 0.5; });
      return s.s === "review" ? { days: s.ivl } : { ms: s.due - now };
    });
  }
  function formatInterval(p) {
    if (p.ms != null) {
      var m = p.ms / 60000;
      if (m < 60) return (Math.round(m * 10) / 10) + " min";
      var h = m / 60;
      return h < 24 ? (Math.round(h * 10) / 10) + " h" : Math.round(h / 24) + " d";
    }
    var d = p.days;
    if (d < 30) return d + (d === 1 ? " day" : " days");
    if (d < 365) return (Math.round(d / 30 * 10) / 10) + " mo";
    return (Math.round(d / 365 * 10) / 10) + " yr";
  }
  function isDue(state, now, settings) {
    if (!state || state.s === "suspended") return false;
    now = ms(now);
    if (state.s === "review") return dayOf(state.due, hourOf(settings)) <= dayOf(now, hourOf(settings));
    return state.due <= now;
  }
  function siblingKey(key) { return key.slice(0, 7) + ":" + (key.slice(8) === "tr-en" ? "en-tr" : "tr-en"); }

  // Suspending (deck browser): the card leaves every session but keeps its schedule; `was` remembers the state
  // to go back to. A card never studied is stored as suspended with reps 0 and no `was`, and unsuspend() → null
  // (new again). Neither function changes its input.
  function suspend(prev, now) {
    if (prev && prev.s === "suspended") return clone(prev);
    if (!prev) return { s: "suspended", due: ms(now), ivl: 0, ease: C.SRS.ease, step: 0, reps: 0, lapses: 0, last: 0 };
    var s = clone(prev);
    s.was = s.s; s.s = "suspended";
    return s;
  }
  function unsuspend(prev) {
    if (!prev) return null;
    if (prev.s !== "suspended") return clone(prev);
    if (!prev.was && !prev.reps) return null;
    var s = clone(prev);
    s.s = prev.was || (prev.ivl > 0 ? "review" : "learning");   // a file without `was`: guess from the interval
    delete s.was;
    return s;
  }

  // Statistics for the flashcards page. o: { deck, cards: CardsProgress, settings }; only the directions turned on count.
  function dirsOf(settings) { return C.DIRS.filter(function (d) { return ((settings && settings.directions) || C.DIRS).indexOf(d) >= 0; }); }
  // How many cards are new (never studied), learning, relearning, young, mature or suspended; leeches counted apart.
  function cardCounts(o) {
    var c = { "new": 0, learning: 0, relearning: 0, young: 0, mature: 0, suspended: 0, leech: 0, total: 0 };
    var dirs = dirsOf(o.settings), all = o.cards.cards;
    o.deck.forEach(function (card) {
      dirs.forEach(function (dir) {
        var s = all[card.id + ":" + dir];
        c.total++;
        if (!s) { c["new"]++; return; }
        if (s.s === "review") c[s.ivl >= C.SRS.mature ? "mature" : "young"]++;
        else c[s.s]++;
        if (s.leech) c.leech++;
      });
    });
    return c;
  }
  // The next n learning days (0 = today): review cards due each day, young and mature, and learning cards due.
  // Overdue cards count for today. Daily limits and burying are not applied: this is what falls due.
  function forecast(o, now, n) {
    now = ms(now); n = n || 30;
    var hour = hourOf(o.settings), today = dayOf(now, hour), out = [], dirs = dirsOf(o.settings), all = o.cards.cards;
    for (var i = 0; i < n; i++) out.push({ day: addDays(today, i), young: 0, mature: 0, learning: 0 });
    o.deck.forEach(function (card) {
      dirs.forEach(function (dir) {
        var s = all[card.id + ":" + dir];
        if (!s || s.s === "suspended") return;
        var k = Math.max(0, daysBetween(today, dayOf(s.due, hour)));
        if (k >= n) return;
        out[k][s.s === "review" ? (s.ivl >= C.SRS.mature ? "mature" : "young") : "learning"]++;
      });
    });
    return out;
  }
  // Retention over the last n learning days, today included (n null: every day kept): the share of answers to
  // cards in review that weren't Again, for young cards, mature cards and all. rate is null without answers.
  // Days saved before the lapse counters existed (5.9) are left out.
  function retention(prog, now, settings, n) {
    var today = dayOf(now, hourOf(settings)), from = n ? addDays(today, -(n - 1)) : "";
    var r = { young: { reviews: 0, lapses: 0 }, mature: { reviews: 0, lapses: 0 }, all: { reviews: 0, lapses: 0 } };
    Object.keys(prog.days).forEach(function (d) {
      var x = prog.days[d];
      if (d < from || d > today || typeof x.lapses !== "number") return;
      var m = x.mature || 0, ml = x.matureLapses || 0;
      r.all.reviews += x.reviews; r.all.lapses += x.lapses;
      r.mature.reviews += m; r.mature.lapses += ml;
      r.young.reviews += x.reviews - m; r.young.lapses += x.lapses - ml;
    });
    ["young", "mature", "all"].forEach(function (k) { r[k].rate = r[k].reviews ? round3(1 - r[k].lapses / r[k].reviews) : null; });
    return r;
  }

  // queue(o, now): what the daily session holds right now (6.6).
  //   o: { deck: cards sorted by rank, cards: CardsProgress, settings, course?, index? }
  //   → { learnNow, learnToday, reviews, news, main (reviews with new cards spread among them), counts }
  function queue(o, now) {
    now = ms(now);
    var st = o.settings, hour = hourOf(st), today = dayOf(now, hour);
    var prog = o.cards, cards = prog.cards, rec = prog.days[today] || { "new": 0, reviews: 0, again: 0 };
    var dirs = C.DIRS.filter(function (d) { return st.directions.indexOf(d) >= 0; });
    var both = dirs.length === 2, words = {};
    var learnNow = [], learnToday = [], due = [], news = [];
    var buried = function (key) { var b = cards[siblingKey(key)]; return !!(b && b.last && dayOf(b.last, hour) === today); };
    o.deck.forEach(function (card) {
      dirs.forEach(function (dir) {
        var key = card.id + ":" + dir, s = cards[key];
        if (!s) return;
        if (s.s === "learning" || s.s === "relearning") {
          if (s.due <= now) learnNow.push(key); else if (dayOf(s.due, hour) <= today) learnToday.push(key); else return;
          words[card.id] = true;
        } else if (s.s === "review" && dayOf(s.due, hour) <= today) due.push(key);
      });
    });
    var byDue = function (a, b) { return cards[a].due - cards[b].due || (a < b ? -1 : 1); };
    learnNow.sort(byDue); learnToday.sort(byDue); due.sort(byDue);
    var reviews = [], revLeft = Math.max(0, st.reviewsPerDay - rec.reviews);
    due.forEach(function (key) {
      var id = key.slice(0, 7);
      if (reviews.length >= revLeft || words[id] || buried(key)) return;
      words[id] = true; reviews.push(key);
    });
    var newLeft = Math.max(0, st.newPerDay - rec["new"]);
    var taught = function (unit) { return !!(unit && o.course && o.index && unitDone(o.index, o.course, unit)); };
    for (var i = 0; i < o.deck.length && news.length < newLeft; i++) {
      var card = o.deck[i];
      for (var j = 0; j < dirs.length && news.length < newLeft; j++) {
        var key = card.id + ":" + dirs[j];
        if (cards[key] || words[card.id] || buried(key)) continue;
        if (dirs[j] === "en-tr" && both) { var tr = cards[card.id + ":tr-en"]; if (!tr || !(tr.ivl > 0)) continue; }   // after tr-en graduates
        if (st.onlyTaughtWords && !taught(card.unit)) continue;
        words[card.id] = true; news.push(key);
      }
    }
    var main = [], T = reviews.length + news.length, ri = 0, ni = 0;
    for (var k = 0; k < T; k++) {                                // spread the new cards evenly among the reviews
      var isNew = Math.floor((k + 1) * news.length / T) > Math.floor(k * news.length / T);
      main.push(isNew ? news[ni++] : reviews[ri++]);
    }
    return {
      learnNow: learnNow, learnToday: learnToday, reviews: reviews, news: news, main: main,
      counts: { learning: learnNow.length + learnToday.length, review: reviews.length, "new": news.length, total: learnNow.length + learnToday.length + reviews.length + news.length }
    };
  }

  // session(o): one review session. o as for queue(), plus save(cards, now), onCredit(now), rng.
  //   next(now) → { key, id, dir, kind: "new" | "learning" | "review", card } or { done: true, waitUntil }
  //   answer(key, grade, now) → the card's new state
  //   undo(now) → the key of the last answer, put back as it was (card, day counters, queue) and shown next; null if none.
  //     One step only; a streak day already credited stays credited.
  function session(o) {
    var st = o.settings, hour = hourOf(st), prog = o.cards;
    var byId = {};
    o.deck.forEach(function (c) { byId[c.id] = c; });
    var main = queue(o, o.now).main.slice();
    var stats = { answered: 0, again: 0, "new": 0, reviews: 0 };
    var last = null, redo = null;   // what undo() restores; the key it put back
    var dirsOn = function (key) { return st.directions.indexOf(key.slice(8)) >= 0 && byId[key.slice(0, 7)]; };
    var learning = function (until) {
      return Object.keys(prog.cards).filter(function (k) {
        var s = prog.cards[k];
        return (s.s === "learning" || s.s === "relearning") && s.due <= until && dirsOn(k);
      }).sort(function (a, b) { return prog.cards[a].due - prog.cards[b].due; });
    };
    var item = function (key) {
      var s = prog.cards[key];
      return { key: key, id: key.slice(0, 7), dir: key.slice(8), kind: !s ? "new" : s.s === "review" ? "review" : "learning", card: byId[key.slice(0, 7)] };
    };
    var dayRec = function (now) { return prog.days[dayOf(now, hour)] || { "new": 0, reviews: 0, again: 0 }; };
    var stillOk = function (key, now) {
      var s = prog.cards[key], today = dayOf(now, hour), b = prog.cards[siblingKey(key)];
      if (b && b.last && dayOf(b.last, hour) === today) return false;
      if (!s) return dayRec(now)["new"] < st.newPerDay;
      return s.s === "review" && dayOf(s.due, hour) <= today && dayRec(now).reviews < st.reviewsPerDay;
    };
    return {
      stats: stats,
      next: function (now) {
        now = ms(now);
        if (redo) { var r = prog.cards[redo]; if ((!r || r.s !== "suspended") && dirsOn(redo)) return item(redo); redo = null; }
        var l = learning(now);
        if (l.length) return item(l[0]);
        while (main.length) { if (stillOk(main[0], now)) return item(main[0]); main.shift(); }
        l = learning(now + C.SRS.learnAhead * 60000);
        if (l.length) return item(l[0]);
        var later = learning(dayStart(addDays(dayOf(now, hour), 1), hour) - 1);
        return { done: true, waitUntil: later.length ? prog.cards[later[0]].due : null };
      },
      answer: function (key, grade, now) {
        now = ms(now);
        var prev = prog.cards[key] || null, g = gradeOf(grade);
        var s = answer(prev, g, now, st, o.rng);
        var day = dayOf(now, hour);
        last = { key: key, prev: prev ? clone(prev) : null, day: day, rec: clone(prog.days[day]) || null, main: main.slice(), stats: clone(stats) };
        redo = null;
        prog.cards[key] = s;
        var d = prog.days[day] || (prog.days[day] = { "new": 0, reviews: 0, again: 0, lapses: 0, mature: 0, matureLapses: 0 });
        var before = d["new"] + d.reviews;
        if (!prev) { d["new"] += 1; stats["new"] += 1; }
        else if (prev.s === "review") {                  // retention counters (5.9): Again on a card in review is a lapse
          var mature = prev.ivl >= C.SRS.mature;
          d.reviews += 1; stats.reviews += 1;
          d.lapses = (d.lapses || 0) + (g === 1 ? 1 : 0);
          if (mature) { d.mature = (d.mature || 0) + 1; d.matureLapses = (d.matureLapses || 0) + (g === 1 ? 1 : 0); }
        }
        if (g === 1) { d.again += 1; stats.again += 1; }
        stats.answered += 1;
        main = main.filter(function (k) { return k !== key; });
        if (o.save) o.save(prog, now);
        if (before < C.STREAK_CARDS && d["new"] + d.reviews >= C.STREAK_CARDS && o.onCredit) o.onCredit(now);
        return s;
      },
      undo: function (now) {
        if (!last) return null;
        var u = last;
        last = null;
        if (u.prev) prog.cards[u.key] = u.prev; else delete prog.cards[u.key];
        if (u.rec) prog.days[u.day] = u.rec; else delete prog.days[u.day];
        main = u.main;
        Object.keys(u.stats).forEach(function (k) { stats[k] = u.stats[k]; });
        redo = u.key;
        if (o.save) o.save(prog, ms(now));
        return u.key;
      },
      canUndo: function () { return !!last; },
      counts: function (now) { return queue(o, now == null ? Date.now() : now).counts; }
    };
  }

  // ───────────────────────────── 10. text-to-speech and typed input (PROJECT.md 6.5) ─────────────────────────────
  var tts = {
    voice: undefined,        // undefined: not looked for yet; null: no Turkish voice on this device
    HELP: "No Turkish voice was found on this device, so listening exercises are skipped. To add one, install Turkish in your system's text-to-speech settings (on iPhone and iPad: Settings › Accessibility › Spoken Content › Voices; on a Mac: System Settings › Accessibility › Spoken Content › System voice › Manage Voices), then reload the page.",
    supported: function () { return !!(root && root.speechSynthesis && root.SpeechSynthesisUtterance); },
    find: function () {
      if (!tts.supported()) return null;
      var vs = root.speechSynthesis.getVoices() || [];
      for (var i = 0; i < vs.length; i++) if (/^tr(?:[-_]|$)/i.test(vs[i].lang || "")) return vs[i];
      return null;
    },
    // Resolves with the Turkish voice, or null. Voices load asynchronously in most browsers.
    ready: function () {
      if (tts._ready) return tts._ready;
      tts._ready = new Promise(function (resolve) {
        if (!tts.supported()) { tts.voice = null; return resolve(null); }
        var done = false;
        var finish = function (v) { if (done) return; done = true; tts.voice = v; resolve(v); };
        var v = tts.find();
        if (v) return finish(v);
        var onChange = function () { var w = tts.find(); if (w) finish(w); };
        if (root.speechSynthesis.addEventListener) root.speechSynthesis.addEventListener("voiceschanged", onChange);
        setTimeout(function () { finish(tts.find()); }, C.TTS_WAIT);
      });
      return tts._ready;
    },
    // Speaks Turkish text (markup removed). opts: { slow, rate }. Returns false when there is no Turkish voice.
    speak: function (text, opts) {
      opts = opts || {};
      if (tts.voice === undefined) tts.voice = tts.find() || undefined;
      var v = tts.voice;
      if (!v) { tts.ready(); return false; }
      var u = new root.SpeechSynthesisUtterance(plain(text));
      u.lang = C.TTS_LANG; u.voice = v;
      var rate = opts.rate || (defaultStore ? defaultStore.settings().ttsRate : C.SETTINGS.ttsRate);
      u.rate = opts.slow ? C.TTS_SLOW : rate;
      root.speechSynthesis.cancel();
      root.speechSynthesis.speak(u);
      return u;
    },
    cancel: function () { if (tts.supported()) root.speechSynthesis.cancel(); },
    // On: speech allowed in settings and a Turkish voice found (call after ready()).
    on: function () { return !!tts.voice && (!defaultStore || defaultStore.settings().tts); },
    // A speaker button for Turkish text; hidden until a Turkish voice is found. opts: { slow, label, className }
    button: function (text, opts) {
      opts = opts || {};
      var b = root.document.createElement("button");
      b.type = "button";
      b.className = opts.className || ("trk-say" + (opts.slow ? " trk-say-slow" : ""));
      b.setAttribute("aria-label", opts.label || (opts.slow ? "Listen slowly" : "Listen"));
      b.innerHTML = opts.slow
        ? '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M3 8v4h3l4 3V5L6 8H3z" fill="currentColor"/><path d="M13 8.5c.6.6.6 2.4 0 3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
        : '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M3 8v4h3l4 3V5L6 8H3z" fill="currentColor"/><path d="M13 7.5c1.2 1.2 1.2 3.8 0 5M15.5 5.5c2.3 2.3 2.3 6.7 0 9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
      b.hidden = true;
      b.addEventListener("click", function () { tts.speak(text, { slow: !!opts.slow }); });
      tts.ready().then(function (v) { b.hidden = !v || !(!defaultStore || defaultStore.settings().tts); });
      return b;
    }
  };
  // Typed answers (6.5): Turkish input fields, and inserting a letter from the keyboard bar at the caret.
  function prepInput(el, lang) {
    el.setAttribute("lang", lang || "tr");
    el.setAttribute("autocapitalize", "off");
    el.setAttribute("autocorrect", "off");
    el.setAttribute("autocomplete", "off");
    el.setAttribute("spellcheck", "false");
    return el;
  }
  function insertText(el, text) {
    var a = el.selectionStart, b = el.selectionEnd;
    if (typeof a === "number" && typeof el.setRangeText === "function") el.setRangeText(text, a, b, "end");
    else el.value += text;
    el.dispatchEvent(new root.Event("input", { bubbles: true }));
    el.focus();
  }

  // ───────────────────────────── 11. analytics (PROJECT.md 3) ─────────────────────────────
  var EVENTS = { trk_lesson_complete: ["lesson", "score"], trk_cards_session: ["reviewed"] };
  function track(name, params) {
    if (!EVENTS[name]) return false;
    var p = {};
    EVENTS[name].forEach(function (k) { if (params && has(params, k)) p[k] = params[k]; });
    try { if (root && typeof root.gtag === "function") { root.gtag("event", name, p); return true; } } catch (e) { /* never break a page */ }
    return false;
  }

  // The iPhone app's copies of the pages carry <html data-app="ios"> (app/scripts/build-www.mjs, APP-3): no online
  // profile there, and progress is "on this iPhone". null on the website, on dailyturkish.app and in Node.
  var APP = (root && root.document && root.document.documentElement && root.document.documentElement.getAttribute("data-app")) || null;

  var TRK = {
    C: C, RE: RE, app: APP,
    // helpers
    esc: esc, iso: iso, dayOf: dayOf, today: function (settings, now) { return dayOf(now, hourOf(settings)); },
    dayStart: dayStart, addDays: addDays, daysBetween: daysBetween, trLower: trLower, trUpper: trUpper, fold: fold,
    // 5.1 markup
    rich: rich, trRich: trRich, seg: seg, plain: plain, href: href, guideHref: guideHref, guidePath: guidePath,
    // 6.4 checker
    expand: expand, norm: norm, check: check, answerSpec: answerSpec, checkExercise: checkExercise, distance: distance,
    // data
    data: data,
    // 6.1 path
    path: { flatten: flatten, lessonDone: lessonDone, lessonUnlocked: lessonUnlocked, unitState: unitState, unitDone: unitDone,
            nextLesson: nextLesson, nextPlanned: nextPlanned, testLessons: testLessons },
    // 5.9, 6.3 progress (pure functions on the stored objects)
    progress: { defaults: defaults, finishLesson: finishLesson, finishReview: finishReview, finishTest: finishTest,
                finishPractice: finishPractice, answered: answered, mistakesDue: mistakesDue, markRead: markRead,
                addXp: addXp, creditDay: creditDay, streak: streakView, goal: goalView, validate: validateProgress, repair: repair, SPEC: SPEC,
                achievements: achievements },
    createStore: createStore,
    // 6.6 scheduler
    srs: { answer: answer, preview: preview, format: formatInterval, isDue: isDue, queue: queue, session: session, sibling: siblingKey, GRADES: GRADES,
           suspend: suspend, unsuspend: unsuspend, cardCounts: cardCounts, forecast: forecast, retention: retention },
    // 6.5
    tts: tts, prepInput: prepInput, insertText: insertText,
    track: track
  };
  // TRK.store: the page's store on localStorage, created on first use.
  Object.defineProperty(TRK, "store", {
    enumerable: true,
    get: function () { return defaultStore || (defaultStore = createStore(browserStorage())); }
  });
  return TRK;
});
