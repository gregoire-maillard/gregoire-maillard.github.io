// © 2026 Grégoire Maillard. All rights reserved. Not open source: see /LICENSE.txt
// Conjugation pages for dailyturkish.app/turkmen/ (SEO-TK), written by scripts/turkmen/static.mjs (mirror only):
//   turkmen/verbs/index.html     the 100 most frequent verbs of the flashcard deck, with their key forms
//   turkmen/verbs/<verb>.html    one page per verb: key forms, notes, the card's example and note, a table for every
//                                finite form of the coverage table in turkmen/TM-CURRICULUM.md (A1 to B1), each linked to the
//                                section of the guide that teaches it, then the participles and converbs
// Every form comes from the morphology engine, assets/js/turkmen-morph.js (tested on 2,100+ forms typed by hand in
// scripts/turkmen/morph-test.mjs, and checked against the course's conjugate exercises and the cards' forms by validate.mjs);
// the meaning, example and note come from the card. A fork of scripts/turkish/static-verbs.mjs that loads nothing from it
// (TM-PROJECT.md 2). Links between Turkmen pages are relative (TM-PROJECT.md 3): `up` is "../" on these pages.

export const VERB_COUNT = 100;
export const PERSONS = [["men", "I"], ["sen", "you"], ["ol", "he, she, it"], ["biz", "we"], ["siz", "you (plural, polite)"], ["olar", "they"]];

// The progressive with a posture verb is for actions going on: verbs of knowing, liking and seeming take -ýAr for "now"
// instead (SEO-TK's choice, for the native review: TM-PROJECT.md log)
const NO_PROGRESSIVE = ["bilmek", "görünmek", "meňzemek", "ýaramak", "ynanmak", "söýmek", "gowy görmek", "ölmek"];
const POSTURE = ["oturmak", "durmak", "ýatmak", "ýöremek"];

// The tables, in the order the course teaches them. A section: [id, title, suffix (course notation), what it's for
// (html, or a function of the verb's forms), grammar points it links to, columns [header, slug], options]
// options: persons (only these), same (one row: the form doesn't change with the person), alt (a section to show instead
// for some verbs: { when(v), ... })
const P_N_Q = (s) => [["Positive", s], ["Negative", s + "-negative"], ["Question", s + "-question"]];
export const GROUPS = [
  { id: "a1-a2", level: "a1", title: "A1 and A2: the everyday forms", sections: [
    ["present", "Present", "-ýAr · negative -mAýAr", "What is happening now, what you do regularly, and plans for soon.", ["gp-present-yar", "gp-present-negative"], P_N_Q("present")],
    ["imperative", "Imperative", "sen: the stem · siz: -(Y)ň · ol, olar: -sYn", "Orders, requests and instructions; -sYn for **let him**, **let her**, **let them**.",
      ["gp-imperative", "gp-imperative-3rd"], [["Positive", "imperative"], ["Negative", "imperative-negative"]], { rows: [["sen", "imperative"], ["siz", "imperative"], ["ol", "imperative-3rd"], ["olar", "imperative-3rd"]] }],
    ["past", "Past", "-dY · negative -mAdY", "A finished action.", ["gp-past-dy", "gp-past-dy-negative-question"], P_N_Q("past")],
    ["future", "Future", "-jAk · negative -jAk däl", (f) => `What will happen, or what you mean to do. The form is the same for everyone, so say who: ${f.tk("men " + f.one("future"))}, ${f.tk("olar " + f.one("future"))}.`,
      ["gp-future-jak", "gp-future-negative-question"], P_N_Q("future"), { same: true }],
    ["aorist", "General present", "-Ar, -r after a vowel · negative -mAr, -mAz", "Habits and what is typical, the likely future, promises and offers.", ["gp-aorist-forms", "gp-aorist-negative"], P_N_Q("aorist")],
    ["ability", "Can", "-(Y)p bilýär · negative -(Y)p bilmeýär", "Being able to, now; also permission.", ["gp-yp-bilmek", "gp-yp-bilmek-negative"], P_N_Q("ability")],
    ["ability-past", "Could, managed to", "-(Y)p bildi · negative -(Y)p bilmedi", "Being able to in the past: was able to, couldn't.", ["gp-yp-bilmek", "gp-yp-bilmek-negative"], P_N_Q("ability-past")],
    ["ability-aorist", "Can, will be able to", "-(Y)p biler · negative -(Y)p bilmez", "Being able to in general or later on; also **may**, **might**.", ["gp-yp-bilmek-negative", "gp-ability-uses"], P_N_Q("ability-aorist")],
    ["necessitative", "Must", "-mAlY · negative -mAlY däl", (f) => `Obligation and advice. The form is the same for everyone, so say who: ${f.tk("men " + f.one("necessitative"))}.`,
      ["gp-maly"], P_N_Q("necessitative"), { same: true }],
    ["optative", "Let me, let's", "men: -AýYn · biz: -AlY, -AlYň", (f) => `Offers and suggestions: ${f.tk(f.one("optative", "men"))} (let me…), ${f.tk(f.vars("optative", "biz")[0])} (let's, the two of us), ${f.tk(f.vars("optative", "biz")[1] || f.vars("optative", "biz")[0])} (let's, a group).`,
      ["gp-optative"], P_N_Q("optative"), { persons: ["men", "biz"] }],
    ["progressive", "Going on now", "-(Y)p + otyr, dur, ýatyr, ýör", (f) => `Something going on right now, with a posture verb as helper: here *otyr*; *dur*, *ýatyr* and *ýör* suit some actions better, as the guide explains. -ýAr is always right too: ${f.tk(f.one("present", "men"))}. For **not**, use the negative of -ýAr: ${f.tk(f.one("present-negative", "men"))}. The last column is the B1 past progressive.`,
      ["gp-yp-progressive", "gp-past-continuous"], [["Now", "progressive-otyr"], ["Question", "progressive-otyr-question"], ["Then (B1)", "progressive-past-otyr"]],
      { alt: [
        { when: (v) => POSTURE.includes(v), title: "Its own present", suf: "otyr, dur, ýatyr, ýör + the endings of -ýAr", gps: ["gp-yp-progressive"],
          what: (f) => `One of the four posture verbs: besides ${f.tk(f.one("present"))}, it has a present of its own for what is going on right now, ${f.tk(f.one("posture-present"))}, which is also the helper of the progressive after -(Y)p.`,
          cols: [["Positive", "posture-present"], ["Question", "posture-present-question"]] },
        { when: (v) => NO_PROGRESSIVE.includes(v), gps: ["gp-yp-progressive"], none: (f) => `The progressive with a posture verb is for actions going on. With a verb like ${f.tk(f.v)}, use the present -ýAr for **now**: ${f.tk(f.one("present", "men"))}.` }] }]
  ] },
  { id: "b1", level: "b1", title: "B1: more pasts, reports and conditions", sections: [
    ["past-continuous", "Past continuous", "-ýArdY · negative -mAýArdY", "What was going on at some moment in the past. The question particle comes before -dY.", ["gp-past-continuous", "gp-compound-tenses"], P_N_Q("past-continuous")],
    ["pluperfect", "Pluperfect", "-(Y)pdY · negative -mAndY", "What had already happened before another past event.", ["gp-pluperfect"], P_N_Q("pluperfect")],
    ["past-habitual", "Used to", "-ArdY · negative -mAzdY", "Past habits; also the result of an unreal condition (**would**…).", ["gp-used-to", "gp-conditional-unreal"], P_N_Q("past-habitual")],
    ["future-past", "Was going to", "-jAkdY · negative -jAk däldi", "A plan in the past, often one that didn't happen.", ["gp-future-in-past"], P_N_Q("future-past")],
    ["necessitative-past", "Should have, had to", "-mAlYdY · negative -mAlY däldi", "What was necessary, or should have happened.", ["gp-should-have"], P_N_Q("necessitative-past")],
    ["ability-past-habitual", "Could have", "-(Y)p bilerdi · negative -(Y)p bilmezdi", "What could or couldn't have happened.", ["gp-could-have"], P_N_Q("ability-past-habitual")],
    ["perfect", "It has happened, I see", "-(Y)pdYr · negative -mAndYr", "A past event you didn't see happen but found out about, heard of or can see the result of. No -dYr in the second persons.",
      ["gp-ypdyr-intro", "gp-ypdyr", "gp-ypdyr-vs-dy"], P_N_Q("perfect-ypdyr")],
    ["eken", "So it is, I hear: eken", "-ýAn, -An, -jAk + eken", (f) => `Something you've just found out or heard: is doing, did, is going to. With -mAlY too: ${f.tk(f.one("eken-maly"))} (he has to, it seems).`,
      ["gp-eken-compounds"], [["-ýAn eken", "eken-yan"], ["-An eken", "eken-an"], ["-jAk eken", "eken-jak"]]],
    ["assumption", "Must be, probably: -dYr", "-Andyr, -ýAndyr, -jAkdyr", "A guess about someone else: has done, is doing, will do.", ["gp-dyr-assumption"],
      [["-Andyr", "assumption-an"], ["-ýAndyr", "assumption-yan"], ["-jAkdyr", "assumption-jak"]], { persons: ["ol", "olar"] }],
    ["conditional", "If", "-sA · negative -mAsA", "If…, with the past endings. For something unreal, the other clause takes -ArdY (see **Used to**).", ["gp-conditional-sa", "gp-conditional-unreal"],
      [["Positive", "conditional"], ["Negative", "conditional-negative"]]],
    ["conditional-real", "If it is so: bolsa", "-ýAn, -An, -jAk + bolsa", "A real condition: if you are doing it, have done it, are going to do it.", ["gp-conditional-real"],
      [["-ýAn bolsa", "conditional-yan"], ["-An bolsa", "conditional-an"], ["-jAk bolsa", "conditional-jak"]]]
  ] }
];

// The participles and converbs of the second coverage table (TM-CURRICULUM.md): [suffix, meaning, grammar point, build(M, v)]
const OTHER = [
  ["-(Y)p", "and (then); joins two actions", "gp-yp", (M, v) => M.converb(v)],
  ["-AndA", "when", "gp-anda", (M, v) => M.build(v, ["AN", "LOC"])],
  ["-ýArkA", "while (he, she)", "gp-ka", (M, v) => M.form("while-ka", v, "ol")],
  ["-Andan soň", "after", "gp-andan-son", (M, v) => M.build(v, ["AN", "ABL"]), " soň"],
  ["-mAzdAn öň", "before", "gp-mazdan-on", (M, v) => M.build(v, ["MAZDAN"]), " öň"],
  ["-mAn", "without", "gp-man", (M, v) => M.negativeConverb(v)],
  ["-ýAnçA", "until", "gp-yanca", (M, v) => M.build(v, ["YANCA"])],
  ["-ýAn", "who is doing, which is", "gp-participle-yan", (M, v) => M.participle(v, "yan")],
  ["-An", "who did; that … did", "gp-participle-an", (M, v) => M.participle(v, "an")],
  ["-jAk", "who will; that … will", "gp-participle-jak", (M, v) => M.participle(v, "jak")],
  ["-mAdYk", "who didn't; that … didn't", "gp-participle-madyk", (M, v) => M.participle(v, "an", true)],
  ["-mAk", "the verbal noun: doing, to do", "gp-mak-cases", (M, v) => M.verbalNoun(v, {})],
  ["-mAk + my", "my doing", "gp-mak-possessive", (M, v) => M.form("verbal-noun-possessive", v, "men")],
  ["-dYgY", "that he did (with the accusative)", "gp-dygy", (M, v) => M.form("dygy-an-accusative", v, "ol")]
];

// The file name in plain letters: ş, ç and ž as sh, ch and zh (so işlemek and islemek, ýaşamak and ýasamak stay apart),
// the other Turkmen letters without their marks: gelmek.html, ishlemek.html, pikir-etmek.html, yatdan-chykarmak.html
export const verbSlug = (s) => s.toLowerCase().replace(/ş/g, "sh").replace(/ç/g, "ch").replace(/ž/g, "zh").replace(/ä/g, "a").replace(/ň/g, "n")
  .replace(/ö/g, "o").replace(/ü/g, "u").replace(/ý/g, "y").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const VERBS_CSS = `
      .vb-facts { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1px; background: var(--line); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; margin: 0 0 18px; }
      .vb-facts div { background: #fff; padding: 10px 14px; min-width: 0; }
      .vb-facts span { display: block; font-size: 11.5px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
      .vb-facts b { display: block; font-size: 16.5px; font-weight: 600; color: var(--ink); overflow-wrap: break-word; }
      @media (max-width: 699px) { .vb-facts { grid-template-columns: repeat(2, minmax(0, 1fr)); } .vb-facts div { padding: 9px 12px; } }
      .vb-notes { max-width: 46em; margin: 0 0 14px; padding-left: 20px; font-size: 14.5px; }
      .vb-notes li + li { margin-top: 6px; }
      .vb-ex { max-width: 46em; margin: 0 0 18px; }
      .vb-group { margin-top: 34px; }
      .vb-group > h2 { display: flex; align-items: center; gap: 10px; font-size: 21px; font-weight: 650; letter-spacing: -0.01em; padding-bottom: 8px; border-bottom: 1px solid var(--line); }
      .vb-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 36px; }
      @media (max-width: 899px) { .vb-grid { grid-template-columns: minmax(0, 1fr); } }
      .vb-sec { margin-top: 22px; scroll-margin-top: 80px; min-width: 0; }
      .vb-sec h3 { font-size: 18px; font-weight: 650; letter-spacing: -0.01em; }
      .vb-sec h3 code { font-size: 13px; font-weight: 500; color: var(--muted); margin-left: 6px; }
      .vb-what { font-size: 13.5px; color: var(--muted); margin: 3px 0 8px; }
      .vb-what a { white-space: nowrap; }
      table.vb { width: 100%; border-collapse: collapse; font-size: 15px; table-layout: fixed; }
      table.vb th:first-child { width: 17%; }
      table.vb.other th:first-child { width: 30%; }
      table.vb th.sx { text-transform: none; letter-spacing: 0; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; font-weight: 500; }
      table.vb th, table.vb td { text-align: left; padding: 7px 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
      table.vb th { font-size: 11.5px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
      table.vb td { color: var(--ink); }
      table.vb td.p { color: var(--muted); width: 17%; white-space: nowrap; }
      table.vb td.p small { display: block; font-size: 11.5px; color: #767672; white-space: normal; }
      table.vb .alt { display: block; font-size: 13px; color: var(--muted); }
      table.vb.other td:first-child { white-space: nowrap; }
      @media (max-width: 599px) {
        table.vb { font-size: 14px; } table.vb th, table.vb td { padding: 6px 4px; } table.vb th { letter-spacing: .03em; } table.vb th:first-child { width: 42px; } table.vb td.p small { display: none; }
        table.vb th:first-child span { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
        table.vb.other th:first-child { width: 30%; }
        .vb-sec h3 code { display: block; margin: 2px 0 0; }
      }
      table.vl { width: 100%; border-collapse: collapse; font-size: 15px; }
      table.vl th, table.vl td { text-align: left; padding: 9px 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
      table.vl th { font-size: 11.5px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
      table.vl td.n { color: var(--muted); font-variant-numeric: tabular-nums; width: 36px; }
      table.vl td.v a { font-weight: 650; }
      table.vl td.f { color: var(--ink); }
      @media (max-width: 699px) { table.vl .hide-s { display: none; } table.vl th, table.vl td { padding: 9px 4px; } }
      @media (max-width: 399px) { table.vl { font-size: 14px; } table.vl th { letter-spacing: .02em; } table.vl td.n { width: 28px; } table.vl th, table.vl td { padding: 8px 3px; } }
    `;

// Writes turkmen/verbs/; returns { pages: sitemap entries, links: Map(tk → "verbs/x.html", relative to turkmen/), cards: share cards }.
// ctx: { TM, HOME, M, deck, notes, frame, crumbs, HOME_CRUMB, text, guideLink(gp, up), lastmod, fileOfRank,
//        cta(card, up), writeFileSync, mkdirSync, join }
export function writeVerbPages(ctx) {
  const { TM, HOME, M, frame, crumbs, HOME_CRUMB, text, writeFileSync, mkdirSync, join } = ctx;
  const up = "../";
  const seen = new Set(), verbs = [];
  for (const c of ctx.deck) {
    if (c.pos !== "verb" || seen.has(c.tk)) continue;
    seen.add(c.tk); verbs.push(c);
    if (verbs.length === VERB_COUNT) break;
  }
  if (verbs.length !== VERB_COUNT) throw new Error(`verbs: the deck has ${verbs.length} verbs, not ${VERB_COUNT}`);
  const slugs = verbs.map((c) => verbSlug(c.tk));
  if (new Set(slugs).size !== slugs.length) throw new Error("verbs: two verbs share an address");
  const links = new Map(verbs.map((c, i) => [c.tk, `verbs/${slugs[i]}.html`]));
  const VERBS_CRUMB = ["Turkmen verbs", HOME + "verbs/"];

  // A form as HTML: lang="tk", with a soft hyphen at each morpheme boundary, so a long word that must wrap on a phone breaks
  // between two suffixes and shows a hyphen (the engine's seg, which reads back as its text: checked here)
  const tkSeg = (t, seg) => `<span lang="tk">${seg && seg.replace(/\|/g, "") === t ? seg.split("|").map(text).join("&shy;") : text(t)}</span>`;
  const tk = (s) => `<i lang="tk">${text(s)}</i>`;
  const form = (slug, v, p) => M.form(slug, v, p);
  const cell = (r) => {
    if (!r) return "—";
    const alts = r.variants.slice(1).map((t, i) => tkSeg(t, r.segs[i + 1]));
    return tkSeg(r.variants[0], r.segs[0]) + (alts.length ? `<span class="alt">or ${alts.join(", ")}</span>` : "");
  };
  const gloss = (c) => c.en[0].replace(/\s*\([^)]*\)/g, "").trim();
  const forms = (v) => ({
    v, tk,
    one: (slug, p = "ol") => { const r = form(slug, v, p); if (!r) throw new Error(`verbs: no ${slug} of ${v} for ${p}`); return r.text; },
    vars: (slug, p = "ol") => { const r = form(slug, v, p); if (!r) throw new Error(`verbs: no ${slug} of ${v} for ${p}`); return r.variants; }
  });
  // "Learn it: A1 · Unit 6, A2 · Unit 7": one link per unit, to the section of the first of its points
  const learn = (gps) => {
    const ls = [], units = new Set();
    for (const g of gps.map((gp) => ctx.guideLink(gp, up)).filter(Boolean)) if (!units.has(g.unit)) { units.add(g.unit); ls.push(g); }
    return ls.length ? ` Learn it: ${ls.map((g) => `<a href="${g.href}">${text(g.unit)}</a>`).join(", ")}.` : "";
  };
  // the what-for lines are written here, with *Turkmen* and **bold** as in the course's Rich text
  const md = (s) => s.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/\*([^*]+)\*/g, '<i lang="tk">$1</i>');

  // a column header: a suffix (-ýAn eken) keeps its letters as written; other headers are small capitals
  const th = (h) => (h.startsWith("-") ? `<th class="sx">${text(h)}</th>` : `<th>${text(h)}</th>`);
  function table(cols, v, o) {
    if (o.rows) {
      return `<table class="vb"><thead><tr><th><span>Person</span></th>${cols.map(([h]) => th(h)).join("")}</tr></thead><tbody>` +
        o.rows.map(([p, s]) => `<tr><td class="p">${p}<small>${PERSONS.find((x) => x[0] === p)[1]}</small></td>${cols.map(([, base]) => `<td>${cell(form(base.replace(/^imperative/, s), v, p))}</td>`).join("")}</tr>`).join("") +
        "</tbody></table>";
    }
    const persons = PERSONS.filter(([p]) => (!o.persons || o.persons.includes(p)) && cols.some(([, s]) => form(s, v, p)));
    if (o.same) {
      // one row: the same form for every person (checked)
      for (const [, s] of cols) {
        const f0 = form(s, v, "men");
        if (f0 && PERSONS.some(([p]) => { const f = form(s, v, p); return !f || f.variants.join("|") !== f0.variants.join("|"); })) throw new Error(`verbs: ${s} of ${v} changes with the person`);
      }
      return `<table class="vb"><thead><tr><th><span>Person</span></th>${cols.map(([h]) => th(h)).join("")}</tr></thead><tbody>` +
        `<tr><td class="p">all<small>men, sen, ol, biz, siz, olar</small></td>${cols.map(([, s]) => `<td>${cell(form(s, v, "men"))}</td>`).join("")}</tr></tbody></table>`;
    }
    return `<table class="vb"><thead><tr><th><span>Person</span></th>${cols.map(([h]) => th(h)).join("")}</tr></thead><tbody>` +
      persons.map(([p, en]) => `<tr><td class="p">${p}<small>${text(en)}</small></td>${cols.map(([, s]) => `<td>${cell(form(s, v, p))}</td>`).join("")}</tr>`).join("") +
      "</tbody></table>";
  }

  function section(sec, v) {
    let [id, title, suf, what, gps, cols, o = {}] = sec;
    const f = forms(v);
    const alt = (o.alt || []).find((a) => a.when(v));
    if (alt && alt.gps) gps = alt.gps;
    let body;
    if (alt && alt.none) body = `<p class="vb-what">${md(alt.none(f))}${learn(gps)}</p>`;
    else {
      if (alt) { title = alt.title; suf = alt.suf; what = alt.what; cols = alt.cols; o = {}; }
      const w = typeof what === "function" ? what(f) : what;
      body = `<p class="vb-what">${md(w)}${learn(gps)}</p>\n          ${table(cols, v, o)}`;
    }
    return `        <section class="vb-sec" id="${id}" aria-labelledby="h-${id}">
          <h3 id="h-${id}">${text(title)}<code>${text(suf)}</code></h3>
          ${body}
        </section>`;
  }

  function otherTable(v) {
    return `<table class="vb other"><thead><tr><th>Suffix</th><th>Form</th><th>Meaning</th></tr></thead><tbody>` +
      OTHER.map(([suf, mean, gp, build, after]) => {
        const r = build(M, v);
        if (!r || !r.text) throw new Error(`verbs: no ${suf} of ${v}`);
        const g = ctx.guideLink(gp, up);
        return `<tr><td><code>${text(suf)}</code></td><td>${tkSeg(r.text, r.seg)}${after ? `<span lang="tk">${text(after)}</span>` : ""}</td><td>${g ? `<a href="${g.href}">${text(mean)}</a>` : text(mean)}</td></tr>`;
      }).join("") + "</tbody></table>";
  }

  // notes worked out from the engine's forms; skipped when the card's note already says it
  function notesFor(c) {
    const v = c.tk, words = v.split(" "), last = words[words.length - 1], stem = last.replace(/m[ae]k$/, ""), f = forms(v), out = [];
    // does the card's note already give this form (its last word, as a whole word)?
    const said = (c.note || "").toLowerCase(), L = "a-zäçňöşüýž";
    const says = (w) => new RegExp(`(^|[^${L}])${w.split(" ").pop()}($|[^${L}])`).test(said);
    const prs = f.one("present"), cvb = M.converb(v).text, aor = f.one("aorist"), past = f.one("past");
    if (words.length > 1) out.push(`Only ${tk(last)} changes; ${tk(words.slice(0, -1).join(" "))} stays as it is: ${tk(past)}, ${tk(prs)}.`);
    const lastOf = (s) => s.split(" ").pop();
    if (/t$/.test(stem) && lastOf(prs).startsWith(stem.slice(0, -1) + "d") && !says(prs))
      out.push(`The t of the stem becomes d before a vowel and before -ýAr: ${tk(prs)}, ${tk(aor)}, ${tk(cvb)}; it stays t before a consonant: ${tk(past)}, ${tk(f.one("future"))}.`);
    if (/e$/.test(stem) && /äp$/.test(cvb) && !says(cvb))
      out.push(`The e at the end of the stem becomes ä before -p, -r and -n and in the optative: ${tk(cvb)}, ${tk(aor)}, ${tk(M.participle(v, "an").text)}, ${tk(f.one("optative", "men"))}; elsewhere it stays e: ${tk(prs)}, ${tk(past)}.`);
    else if (M.isVowel(stem.slice(-1)) && !says(aor))
      out.push(`The stem ends in a vowel, so the general present is just -r: ${tk(aor)}, ${tk(f.one("aorist", "men"))}.`);
    if (/ý$/.test(stem)) out.push(`The stem ends in ý, and -ýAr adds another: ${tk(prs)}.`);
    if (M.syllables(stem) === 1 && /[oöuü]/.test(stem) && !POSTURE.includes(last))
      out.push(`The stem's vowel is rounded, so the vowel of an ending in the second syllable is rounded too: ${tk(f.one("past", "men"))}, ${tk(cvb)}; not when it ends the word: ${tk(past)}.`);
    if (POSTURE.includes(v) && !says(f.one("posture-present"))) out.push(`One of the four posture verbs: besides ${tk(prs)}, it has a present of its own, ${tk(f.one("posture-present"))}, which also builds the progressive after -(Y)p (see below).`);
    if (v === "bilmek" && !/-yp/.test(said)) out.push(`After -(Y)p it is the helper of ability: ${tk(M.form("ability", "gelmek", "men").text)} (I can come).`);
    return out;
  }

  mkdirSync(join(TM, "verbs"), { recursive: true });
  const pages = [], cards = [];
  verbs.forEach((c, i) => {
    const v = c.tk, slug = slugs[i], en = gloss(c), prev = verbs[i - 1], next = verbs[i + 1], f = forms(v);
    const cap = v.charAt(0).toUpperCase() + v.slice(1);
    let title = `${cap} conjugation in Turkmen (${en})`;
    if (title.length > 60) title = `${cap} conjugation (${en})`;
    if (title.length > 60) title = `${cap} conjugation in Turkmen`;
    const key = { present: f.one("present"), past: f.one("past"), future: f.one("future"), aorist: f.one("aorist") };
    // the card's forms are the engine's (validate.mjs checks them): say so if one ever differs
    for (const [k, slugF] of [["prs", "present"], ["past", "past"], ["aor", "aorist"], ["fut", "future"]])
      if (c.forms && c.forms[k] && c.forms[k] !== f.one(slugF)) console.warn(`turkmen-static: ${c.id} ${v}: card ${k} ${c.forms[k]}, engine ${f.one(slugF)}`);
    const facts = [["Infinitive", v], ["Stem", v.replace(/m[ae]k$/, "-")], ["Present", key.present], ["Past", key.past], ["Future", key.future],
      ["General present", `${key.aorist} · ${f.one("aorist-negative")}`], ["Converb", M.converb(v).text], ["Imperative", `${f.one("imperative", "sen")} · ${f.one("imperative", "siz")}`]];
    const groups = GROUPS.map((g) => `      <section class="vb-group" id="${g.id}" aria-labelledby="h-${g.id}" data-lvl="${g.level}">
        <h2 id="h-${g.id}">${text(g.title)}</h2>
        <div class="vb-grid">
${g.sections.map((s) => section(s, v)).join("\n")}
        </div>
      </section>`).join("\n");
    const others = `      <section class="vb-group" id="other" aria-labelledby="h-other">
        <h2 id="h-other">Participles and converbs</h2>
        <div class="vb-sec"><p class="vb-what">The forms that join clauses, or turn the verb into a word that describes a noun: here for ${tk(v)}, with the guide section for each.</p>
          ${otherTable(v)}
        </div>
      </section>`;
    const note = ctx.notes[c.rank - 1];
    const notes = notesFor(c).map((n) => `<li>${n}</li>`).join("") + (note ? `<li>${note}</li>` : "");
    const q = `${up}cards.html?view=browse&amp;q=${encodeURIComponent(v)}`;
    const body = `      <p class="wl-intro"><b lang="tk">${text(v)}</b>: ${c.en.map(text).join("; ")}. Below, every verb form the course teaches from A1 to B1, built on ${tk(v)}, with the six persons in the positive, the negative and the question.</p>
      <div class="vb-facts">${facts.map(([k, x]) => `<div><span>${k}</span><b lang="tk">${text(x)}</b></div>`).join("")}</div>
      <div class="ex vb-ex"><p class="tk" lang="tk">${text(c.ex.tk)}</p><p class="en">${text(c.ex.en)}</p></div>
${notes ? `      <ul class="vb-notes">${notes}</ul>\n` : ""}      <p class="wl-cta">Practise ${tk(v)} with the <a href="${q}">flashcards</a>, or see every ending on one page in the <a href="${up}grammar-cheat-sheet.html">grammar cheat sheet</a>.</p>
      <nav class="wl-pager" aria-label="Forms on this page">${GROUPS.flatMap((g) => g.sections).map(([s, name, , , , , o = {}]) => {
        const a = (o.alt || []).find((x) => x.when(v));
        return `<a href="#${s}">${text(a && a.title ? a.title : name)}</a>`;
      }).join("")}<a href="#other">Participles and converbs</a></nav>
${groups}
${others}
      <nav class="wl-next" aria-label="Previous and next verb">${prev ? `<a href="${slugs[i - 1]}.html" rel="prev">← <span lang="tk">${text(prev.tk)}</span></a>` : `<a href="./">← All 100 verbs</a>`}${next ? `<a href="${slugs[i + 1]}.html" rel="next"><span lang="tk">${text(next.tk)}</span> →</a>` : `<a href="./">All 100 verbs →</a>`}</nav>
${ctx.cta ? ctx.cta(c, up) : ""}
      <section class="wl-about" aria-labelledby="about-h">
        <h2 id="about-h">About these tables</h2>
        <p>Endings are written as in the course: A stands for a or e (ä in some endings, written Ä), Y for y or i (u or ü after a rounded vowel, as the rounding rule says), and letters in brackets are used only after a consonant, like the Y of -(Y)p, or only after a vowel. The question ending -mY is written onto the word it asks about. Where a cell gives two forms, the course teaches the first and accepts the others.</p>
        <p>The forms are built by Daily Turkmen's own conjugation engine, which is tested against more than 2,000 forms typed by hand and checked against the course's exercises and flashcards.</p>
      </section>`;
    const m = {
      title, h1: `${v}: conjugation`, h1Html: `<span lang="tk">${text(v)}</span>: conjugation`, up, tab: "guide", imageAlt: `Daily Turkmen · ${v} (${en}): conjugation`,
      kicker: `<a href="${up}index.html">Daily Turkmen</a> › <a href="./">Turkmen verbs</a>`,
      description: `Conjugation of ${v} (${en}) in Turkmen: present ${key.present}, past ${key.past}, future ${key.future}, general present ${key.aorist}, with can, must, if, let's, the imperative and the B1 pasts.`,
      canonical: `${HOME}verbs/${slug}.html`, css: VERBS_CSS, image: `verb-${slug}`,
      ld: crumbs([HOME_CRUMB, VERBS_CRUMB, [v, `${HOME}verbs/${slug}.html`]]), body
    };
    writeFileSync(join(TM, "verbs", slug + ".html"), frame(m));
    pages.push({ loc: m.canonical, lastmod: ctx.lastmod([ctx.fileOfRank(c.rank), "assets/js/turkmen-morph.js", "scripts/turkmen/static-verbs.mjs"]) });
    cards.push({ name: `verb-${slug}`, level: c.level, kicker: "Turkmen verb · conjugation", title: v, titleTk: true, sub: en, subTk: false,
      alt: `Daily Turkmen · ${v} (${en}): conjugation` });
  });

  const rows = verbs.map((c, i) => `          <tr><td class="n">${i + 1}</td><td class="v"><a href="${slugs[i]}.html" lang="tk">${text(c.tk)}</a></td><td>${text(gloss(c))}</td>` +
    `<td class="f hide-s"><span lang="tk">${text(forms(c.tk).one("present"))}</span></td><td class="f hide-s"><span lang="tk">${text(forms(c.tk).one("past"))}</span></td><td class="f"><span lang="tk">${text(forms(c.tk).one("aorist"))}</span></td></tr>`).join("\n");
  const hub = {
    title: "100 common Turkmen verbs, conjugated", h1: "100 common Turkmen verbs, conjugated", up, tab: "guide",
    description: "The 100 most frequent verbs of the Daily Turkmen deck with full conjugation tables: present, past, future, general present, can, must, if, the imperative and the B1 pasts.",
    canonical: `${HOME}verbs/`, kicker: `<a href="${up}index.html">Daily Turkmen</a> › Verbs`, css: VERBS_CSS, image: "verbs",
    ld: crumbs([HOME_CRUMB, VERBS_CRUMB]),
    body: `      <p class="wl-intro">The 100 most frequent verbs of the Daily Turkmen flashcard deck, in the deck's order: roughly how common each verb is. Each page has the key forms, notes on what changes, the card's example and a table for every verb form the course teaches from A1 to B1, positive, negative and question. The forms below are for <i lang="tk">ol</i> (he, she, it).</p>
      <p class="wl-cta">Every ending on one page: the <a href="${up}grammar-cheat-sheet.html">grammar cheat sheet</a>. All 1,000 words of the deck: the <a href="${up}words/">word list</a>.</p>
      <table class="vl">
        <thead><tr><th>#</th><th>Verb</th><th>Meaning</th><th class="hide-s">Present</th><th class="hide-s">Past</th><th>General present</th></tr></thead>
        <tbody>
${rows}
        </tbody>
      </table>
${ctx.cta ? ctx.cta(null, up) : ""}`
  };
  writeFileSync(join(TM, "verbs", "index.html"), frame(hub));
  pages.unshift({ loc: hub.canonical, lastmod: ctx.lastmod([...new Set(verbs.map((c) => ctx.fileOfRank(c.rank)))].concat(["assets/js/turkmen-morph.js", "scripts/turkmen/static-verbs.mjs"])) });
  cards.unshift({ name: "verbs", level: null, kicker: "Turkmen verbs", title: "100 common Turkmen verbs, conjugated", titleTk: false,
    sub: verbs.slice(0, 6).map((c) => c.tk).join(", ") + "…", subTk: true, alt: "Daily Turkmen · 100 common Turkmen verbs, conjugated" });
  return { pages, links, cards };
}
