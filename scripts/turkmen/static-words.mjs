// © 2026 Grégoire Maillard. All rights reserved, except the order of the words (CC BY-SA 4.0): see /LICENSE.txt
// The word list for dailyturkish.app/turkmen/ (SEO-TK), written by scripts/turkmen/static.mjs (mirror only):
//   turkmen/words/index.html                         an overview of the 1,000 words of the flashcard deck
//   turkmen/words/1-100.html … words/901-1000.html   the deck by hundreds: rank, word, part of speech, meanings, example,
//                                                    forms, note, level and the unit that first teaches it; each of the
//                                                    100 verbs of static-verbs.mjs linked to its conjugation page
// The flashcards page shows the deck only through JavaScript; these pages are plain HTML. The order of the deck is the
// CC BY-SA 4.0 adaptation described in TM-PROJECT.md 7.8 (an editorial estimate, not a corpus count), credited on every page.
// A fork of the word list in scripts/turkish/static.mjs that loads nothing from it (TM-PROJECT.md 2).

const POS_LABEL = { noun: "noun", verb: "verb", adj: "adjective", adv: "adverb", pron: "pronoun", num: "number", postp: "postposition",
  conj: "conjunction", interj: "interjection", det: "determiner", particle: "particle", phrase: "phrase" };
// the forms of a card (TM-PROJECT.md 5.8), labelled as on the flashcards page
const FORM_LABEL = { prs: "present", past: "past", fut: "future", aor: "general present", cvb: "converb", acc: "accusative", poss3: "his, her, its", pl: "plural" };

export const WORDS_CSS = `
      .wl-intro { max-width: 46em; font-size: 15.5px; line-height: 1.6; margin: 0 0 12px; }
      .wl-cta { max-width: 46em; margin: 0 0 22px; font-size: 14.5px; }
      .wl-cta a { font-weight: 600; }
      .wl-pager { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 18px; }
      .wl-pager a { display: inline-flex; align-items: center; min-height: 36px; padding: 0 12px; border: 1px solid var(--line); border-radius: 999px; font-size: 13.5px; color: var(--ink); font-variant-numeric: tabular-nums; white-space: nowrap; text-decoration: none; }
      .wl-pager a:hover { background: var(--blue-tint); color: var(--ink); }
      .wl-pager a[aria-current="page"] { background: var(--ink); border-color: var(--ink); color: #fff; }
      @media (max-width: 599px) { .wl-pager a { min-height: 32px; padding: 0 10px; font-size: 13px; } }
      .wl { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--line); }
      .wl > li { display: grid; grid-template-columns: 40px minmax(140px, 220px) minmax(0, 1fr); gap: 4px 16px; padding: 16px 4px; border-bottom: 1px solid var(--line); scroll-margin-top: 80px; }
      .wl-rk { font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; text-align: right; padding-top: 4px; }
      .wl-w b { display: block; color: var(--ink); font-size: 17px; font-weight: 650; line-height: 1.35; overflow-wrap: anywhere; }
      .wl-pos { display: block; font-size: 12.5px; color: var(--muted); font-style: italic; }
      .wl-d { min-width: 0; display: grid; gap: 8px; }
      .wl-en { color: var(--ink); font-size: 15px; }
      .wl-forms { font-size: 13px; color: var(--muted); }
      .wl-forms span { color: var(--ink); font-style: italic; white-space: nowrap; }
      .wl-note { font-size: 13.5px; }
      .wl-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; font-size: 12.5px; color: var(--muted); }
      @media (max-width: 699px) {
        .wl > li { grid-template-columns: 30px minmax(0, 1fr); gap: 2px 10px; padding: 14px 0; }
        .wl-d { grid-column: 2; margin-top: 4px; }
      }
      .wl-next { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin: 24px 0 0; font-size: 15px; font-weight: 600; }
      .wl-about { max-width: 46em; margin-top: 40px; padding-top: 20px; border-top: 1px solid var(--line); font-size: 13.5px; color: var(--muted); }
      .wl-about h2 { font-size: 16px; margin-bottom: 6px; }
      .wl-about p + p { margin-top: 8px; }
      .wl-grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px; }
      .wl-grid a { display: block; height: 100%; border: 1px solid var(--line); border-radius: 12px; padding: 14px 16px; color: var(--body); text-decoration: none; }
      .wl-grid a:hover { background: var(--blue-tint); border-color: rgb(40 122 158 / 35%); color: var(--body); }
      .wl-grid b { display: block; color: var(--ink); font-size: 16px; font-weight: 650; margin-bottom: 4px; font-variant-numeric: tabular-nums; }
      .wl-grid span { font-size: 13.5px; font-style: italic; }
      .dt-cta { max-width: 46em; margin: 28px 0 0; padding: 16px 18px 14px; border: 1px solid rgb(40 122 158 / 35%); border-radius: 12px; background: var(--blue-tint); }
      .dt-cta-t { margin: 0 0 4px; font-size: 16.5px; font-weight: 650; color: var(--ink); }
      .dt-cta-p { margin: 0; font-size: 14.5px; line-height: 1.55; }
      .dt-cta-b { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin: 12px 0 0; font-size: 14px; }
      .dt-cta-b .btn { text-decoration: none; }
      .dt-cta-p a, .dt-cta-b a:not(.btn) { color: var(--blue-dark); }   /* 4.5:1 and more on the box's tint (the site blue is 4.3) */
    `;

// The box at the end of a generated page: { title, text (html), primary [href, label], secondary, link }
export function courseCta(o, text) {
  const a = (x, cls) => (x ? `<a class="${cls}" href="${x[0]}">${text(x[1])}</a>` : "");
  return `      <aside class="dt-cta" aria-label="Learn it in the course">
        <p class="dt-cta-t">${text(o.title)}</p>
        <p class="dt-cta-p">${o.text}</p>
        <p class="dt-cta-b">${a(o.primary, "btn primary")}${a(o.secondary, "btn")}${o.link ? `<a href="${o.link[0]}">${text(o.link[1])}</a>` : ""}</p>
      </aside>`;
}

// The credit the order of the list needs (CC BY-SA 4.0, LICENSE.txt), and what the ranks are
export const ABOUT_LIST = `<section class="wl-about" aria-labelledby="about-h">
        <h2 id="about-h">About this list</h2>
        <p>These are the 1,000 words of the Daily Turkmen flashcard deck, in the deck's order: roughly how common each word is. The ranks are an editorial estimate, not a count from a Turkmen corpus. Words are listed in their dictionary form (verbs in the infinitive, <span lang="tk">gelmek</span>; nouns in the nominative singular).</p>
        <p>The order is adapted from the deck of Daily Turkish, the sister course, which is itself adapted from the 2018 Turkish list of <a href="https://github.com/hermitdave/FrequencyWords" rel="noopener">FrequencyWords</a> by Hermit Dave, made from the OpenSubtitles2018 corpus: each word was matched by meaning to its usual Turkmen equivalent, then the list was edited by hand. The order is licensed under <a href="https://creativecommons.org/licenses/by-sa/4.0/" rel="license noopener">CC BY-SA 4.0</a>. The meanings, example sentences and notes are original to Daily Turkmen.</p>
      </section>`;

// Writes turkmen/words/; returns { pages: sitemap entries, cards: share cards }.
// ctx: { TM, HOME, deck, notes, frame, crumbs, HOME_CRUMB, text, attr, unitInfo, fileOfRank, verbLinks, lastmod, cta, writeFileSync, mkdirSync, join }
export function writeWordList(ctx) {
  const { TM, HOME, deck, notes, frame, crumbs, HOME_CRUMB, text, attr, unitInfo, verbLinks, writeFileSync, mkdirSync, join } = ctx;
  const up = "../";
  const WORDS_CRUMB = ["Word list", HOME + "words/"];
  const ranges = [];
  for (let from = 1; from <= deck.length; from += 100) ranges.push({ from, to: Math.min(from + 99, deck.length), file: `${from}-${Math.min(from + 99, deck.length)}.html` });
  const tk = (s) => `<span lang="tk">${text(s)}</span>`;
  const cta = `<p class="wl-cta">Learn them with spaced repetition, Anki-style: <a href="${up}cards.html">open the flashcards</a>. Free, no account needed.</p>`;
  const pager = (cur) => `<nav class="wl-pager" aria-label="Pages of the list"><a href="./"${cur ? "" : ' aria-current="page"'}>Overview</a>` +
    ranges.map((r) => `<a href="${r.file}"${r === cur ? ' aria-current="page"' : ""}>${r.from}–${r.to}</a>`).join("") + "</nav>";
  const item = (c, note) => {
    const u = c.unit && unitInfo.get(c.unit);
    const forms = c.forms ? Object.keys(FORM_LABEL).filter((k) => c.forms[k]).map((k) => `${FORM_LABEL[k]} ${tk(c.forms[k])}`).join(" · ") : "";
    const conj = c.pos === "verb" && verbLinks.has(c.tk) ? `<span>· <a href="${up}${verbLinks.get(c.tk)}">Conjugation of <i lang="tk">${text(c.tk)}</i></a></span>` : "";
    return `        <li id="r${c.rank}" data-lvl="${attr(c.level)}">
          <span class="wl-rk">${c.rank}</span>
          <div class="wl-w"><b lang="tk">${text(c.tk)}</b><span class="wl-pos">${text(POS_LABEL[c.pos] || c.pos)}</span></div>
          <div class="wl-d">
            <p class="wl-en">${c.en.map(text).join("; ")}</p>
            <div class="ex"><p class="tk" lang="tk">${text(c.ex.tk)}</p><p class="en">${text(c.ex.en)}</p></div>` +
      (forms ? `\n            <p class="wl-forms">${forms}</p>` : "") + (note ? `\n            <p class="wl-note">${note}</p>` : "") + `
            <p class="wl-meta"><span class="lv-tag">${text(c.level.toUpperCase())}</span>${u ? `<span>First taught in <a href="${up}guides/${u.id}-grammar.html">${text(u.label)}: ${text(u.title)}</a></span>` : ""}${conj}</p>
          </div>
        </li>`;
  };
  const first = (words, n) => words.slice(0, n).map((c) => c.tk);
  mkdirSync(join(TM, "words"), { recursive: true });
  const pages = [], cards = [];
  ranges.forEach((r, k) => {
    const words = deck.slice(r.from - 1, r.to), isFirst = k === 0;
    const prev = ranges[k - 1], next = ranges[k + 1];
    const some = first(words, 3).join(", "), taught = words.filter((c) => unitInfo.has(c.unit)).length;
    const h1 = isFirst ? "The first 100 Turkmen words of the deck" : `Turkmen words ${r.from}–${r.to}`;
    const m = {
      title: isFirst ? "100 common Turkmen words, with examples" : `Common Turkmen words ${r.from}–${r.to}, with examples`, h1, up, tab: "cards",
      description: (isFirst ? `The 100 most common words of the Daily Turkmen deck (${some}…)` : `Turkmen words ${r.from} to ${r.to} of the Daily Turkmen deck (${some}…)`) +
        ": English meanings, an example sentence for each, and verb forms.",
      canonical: `${HOME}words/${r.file}`, image: `words-${r.from}-${r.to}`,
      ld: crumbs([HOME_CRUMB, WORDS_CRUMB, [`Words ${r.from}–${r.to}`, `${HOME}words/${r.file}`]]),
      kicker: `<a href="${up}index.html">Daily Turkmen</a> › <a href="./">1,000 words</a>`,
      body: `      <p class="wl-intro">${isFirst ? "The first 100 words of the Daily Turkmen deck, the most common ones" : `Words ${r.from} to ${r.to} of the Daily Turkmen deck, in the deck's order`}, each with its meaning in English, an example sentence and, for verbs, the main forms (he, she or it).${taught ? ` ${taught === words.length ? "All" : taught} of them are taught in the lessons of the course.` : ""}</p>
      ${cta}
      ${pager(r)}
      <ol class="wl" start="${r.from}">
${words.map((c) => item(c, notes[c.rank - 1])).join("\n")}
      </ol>
      <nav class="wl-next" aria-label="Previous and next">${prev ? `<a href="${prev.file}" rel="prev">← Words ${prev.from}–${prev.to}</a>` : `<a href="./">← Overview</a>`}${next ? `<a href="${next.file}" rel="next">Words ${next.from}–${next.to} →</a>` : ""}</nav>
${ctx.cta(up)}
      ${ABOUT_LIST}`
    };
    writeFileSync(join(TM, "words", r.file), frame(m));
    pages.push({ loc: m.canonical, lastmod: ctx.lastmod([ctx.fileOfRank(r.from), ctx.fileOfRank(r.to), "scripts/turkmen/static-words.mjs"]) });
    cards.push({ name: `words-${r.from}-${r.to}`, level: null, kicker: "Turkmen · Word list", title: isFirst ? "The first 100 Turkmen words" : `Turkmen words ${r.from}–${r.to}`,
      titleTk: false, sub: first(words, 5).join(", ") + "…", subTk: true, alt: `Daily Turkmen · ${isFirst ? "The first 100 Turkmen words" : `Turkmen words ${r.from}–${r.to}`}` });
  });
  const hub = {
    title: "1,000 common Turkmen words, with examples", h1: "1,000 common Turkmen words", up, tab: "cards",
    description: "The 1,000 words of the Daily Turkmen flashcard deck, roughly by how common they are, each with its English meanings, an example sentence and the forms of the verbs.",
    canonical: `${HOME}words/`, image: "words", ld: crumbs([HOME_CRUMB, WORDS_CRUMB]),
    kicker: `<a href="${up}index.html">Daily Turkmen</a> › Word list`,
    body: `      <p class="wl-intro">The 1,000 words of the Daily Turkmen flashcard deck, roughly in order of how common they are. Each one comes with its English meanings, an example sentence and, where it helps, its forms and a short note; the 100 most frequent verbs link to their <a href="${up}verbs/">conjugation tables</a>.</p>
      ${cta}
      <ol class="wl-grid">
${ranges.map((r) => `        <li><a href="${r.file}"><b>Words ${r.from}–${r.to}</b><span lang="tk">${first(deck.slice(r.from - 1, r.to), 8).map(text).join(", ")}…</span></a></li>`).join("\n")}
      </ol>
${ctx.cta(up)}
      ${ABOUT_LIST}`
  };
  writeFileSync(join(TM, "words", "index.html"), frame(hub));
  pages.unshift({ loc: hub.canonical, lastmod: ctx.lastmod([...new Set(deck.map((c) => ctx.fileOfRank(c.rank)))].concat(["scripts/turkmen/static-words.mjs"])) });
  cards.unshift({ name: "words", level: null, kicker: "Turkmen · Word list", title: "1,000 common Turkmen words", titleTk: false, sub: first(deck, 6).join(", ") + "…", subTk: true,
    alt: "Daily Turkmen · 1,000 common Turkmen words" });
  return { pages, cards };
}
