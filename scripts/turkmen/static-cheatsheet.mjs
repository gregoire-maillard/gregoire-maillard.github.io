// © 2026 Grégoire Maillard. All rights reserved. Not open source: see /LICENSE.txt
// The Turkmen grammar cheat sheet for dailyturkish.app/turkmen/ (turkmen/grammar-cheat-sheet.html, SEO-TK), written by
// scripts/turkmen/static.mjs (mirror only). Every Turkmen example is built by the morphology engine,
// assets/js/turkmen-morph.js, so the tables can't drift from what the course teaches; each section links to the guide
// section that explains it. Words the native review hasn't settled are left out (TM-PROJECT.md log: e-final nouns with
// their possessives, oba as its own dative, the bare copula endings). A fork of scripts/turkish/static-cheatsheet.mjs that
// loads nothing from it (TM-PROJECT.md 2).
import { GROUPS } from "./static-verbs.mjs";

export const CHEAT_CSS = `
      .cs-toc { columns: 2 240px; column-gap: 32px; margin: 0 0 8px; padding-left: 20px; font-size: 14.5px; }
      .cs-toc li { break-inside: avoid; margin-bottom: 4px; }
      .cs { margin-top: 34px; scroll-margin-top: 80px; }
      .cs > h2 { font-size: 21px; font-weight: 650; letter-spacing: -0.01em; }
      .cs-lede { max-width: 46em; margin: 6px 0 12px; font-size: 15px; }
      .cs-learn { font-size: 13.5px; color: var(--muted); margin: 8px 0 0; }
      table.cs-t { border-collapse: collapse; font-size: 14.5px; width: 100%; }
      table.cs-t th, table.cs-t td { text-align: left; padding: 7px 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
      table.cs-t th { font-size: 11.5px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
      table.cs-t td { color: var(--body); }
      table.cs-t td [lang="tk"] { color: var(--ink); }
      table.cs-t th [lang="tk"] { text-transform: none; letter-spacing: 0; font-style: italic; font-size: 13px; }
      table.cs-t td.k { color: var(--ink); font-weight: 600; }
      table.cs-t td.k small { display: block; font-weight: 400; font-size: 12.5px; color: var(--muted); }
      table.cs-t td.k code { display: block; font-weight: 400; margin-top: 2px; }
      table.cs-t code { font-size: 13px; }
      .cs-pair { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 32px; }
      @media (max-width: 899px) { .cs-pair { grid-template-columns: minmax(0, 1fr); } }
      .cs-rules span[lang="tk"], .cs-lede span[lang="tk"], .cs-learn span[lang="tk"] { font-style: italic; white-space: nowrap; }
      .cs-rules { max-width: 46em; padding-left: 20px; margin: 6px 0 0; font-size: 14.5px; }
      .cs-rules li + li { margin-top: 6px; }
      @media (max-width: 599px) { table.cs-t th, table.cs-t td { padding: 6px 4px; } table.cs-t { font-size: 13.5px; } table.cs-t th { letter-spacing: .03em; } table.cs-t .hide-s { display: none; } }
      @media (max-width: 399px) { table.cs-t th, table.cs-t td { padding: 6px 3px; } }
    `;

// ctx: { M, text, guideLink(gp, up), verbLinks: Map(tk → "verbs/x.html") }
export function cheatSheetBody(ctx) {
  const { M, text, verbLinks } = ctx;
  const up = "";
  // a soft hyphen at each morpheme boundary, so a word that must wrap on a phone breaks between suffixes, with a hyphen
  const tkSeg = (t, seg) => `<span lang="tk">${seg && seg.replace(/\|/g, "") === t ? seg.split("|").map(text).join("&shy;") : text(t)}</span>`;
  const tk = (s) => `<span lang="tk">${text(s)}</span>`;
  const r2h = (r) => tkSeg(r.text, r.seg);
  const code = (s) => `<code>${text(s)}</code>`;
  const P = M.PERSONS;
  const learn = (...gps) => {
    const ls = gps.map((gp) => ctx.guideLink(gp, up)).filter(Boolean);
    return ls.length ? `<p class="cs-learn">Learn more: ${ls.map((g) => `<a href="${g.href}">${text(g.label)}</a>`).join(" · ")}</p>` : "";
  };
  // a table; hide: the index of a column left out on phones (the third verb of the tenses)
  const tbl = (head, rows, hide) => `<table class="cs-t"><thead><tr>${head.map((h, i) => `<th${i === hide ? ' class="hide-s"' : ""}>${h}</th>`).join("")}</tr></thead><tbody>` +
    rows.map((r) => `<tr>${r.map((c, i) => `<td${i === 0 ? ' class="k"' : i === hide ? ' class="hide-s"' : ""}>${c}</td>`).join("")}</tr>`).join("") + "</tbody></table>";
  const sec = (id, title, html) => ({ id, title, html: `      <section class="cs" id="${id}" aria-labelledby="h-${id}">
        <h2 id="h-${id}">${text(title)}</h2>
${html}
      </section>` });
  const verb = (v) => (verbLinks.has(v) ? `<a href="${up}${verbLinks.get(v)}" lang="tk">${text(v)}</a>` : tk(v));
  const form = (slug, v, p) => { const r = M.form(slug, v, p); if (!r) throw new Error(`cheat sheet: no ${slug} of ${v} for ${p}`); return r; };
  const d = (noun, o) => M.decline(noun, o || {});
  const S = [];

  S.push(sec("harmony", "Vowel harmony and rounding", `        <p class="cs-lede">A suffix takes its vowel from the last vowel of the word: front (e, ä, i, ö, ü) or back (a, o, u, y). In the course, ${code("A")} is a or e and ${code("Y")} is y or i. After a rounded vowel (o, ö, u, ü) in the first syllable, a ${code("Y")} in the second syllable is u or ü, unless it ends the word.</p>
        ${tbl(["Last vowel", "Plural", "my …", "his, her …"], [
          ["a, y<small>A is a, Y is y</small>", r2h(d("kitap", { pl: true })), r2h(d("kitap", { poss: "men" })), r2h(d("kitap", { poss: "ol" }))],
          ["o, u<small>A is a, Y is y or u</small>", r2h(d("dost", { pl: true })), r2h(d("dost", { poss: "men" })), r2h(d("dost", { poss: "ol" }))],
          ["e, ä, i<small>A is e, Y is i</small>", r2h(d("mekdep", { pl: true })), r2h(d("mekdep", { poss: "men" })), r2h(d("mekdep", { poss: "ol" }))],
          ["ö, ü<small>A is e, Y is i or ü</small>", r2h(d("göz", { pl: true })), r2h(d("göz", { poss: "men" })), r2h(d("göz", { poss: "ol" }))]])}
        <p class="cs-learn">Two endings have ä in front words: ${code("-ýÄr")} (${r2h(form("present", "gelmek", "ol"))}, but ${r2h(form("present", "almak", "ol"))}) and ${code("-rÄk")} (${r2h(M.build("kiçi", ["RAK"]))}).</p>
        ${learn("gp-vowel-groups", "gp-harmony-2way", "gp-harmony-rounding")}`));

  S.push(sec("sounds", "Sound changes and buffer letters", `        <ul class="cs-rules">
          <li><b>Voicing:</b> before a vowel, a final k, p or ç of a word of two or more syllables becomes g, b or j: ${tk("kitap")} → ${r2h(d("kitap", { case: "acc" }))}, ${tk("çörek")} → ${r2h(d("çörek", { case: "acc" }))}, ${tk("agaç")} → ${r2h(d("agaç", { case: "acc" }))}. Most one-syllable words keep theirs (${r2h(d("top", { case: "acc" }))}), but those with a long vowel voice: ${tk("at")} (name) → ${r2h(d("at", { poss: "men", sense: 1 }))}, while ${tk("at")} (horse) → ${r2h(d("at", { poss: "men", sense: 2 }))}. A final t voices in a few words: ${r2h(d("Aşgabat", { case: "dat" }))}.</li>
          <li><b>Vowel loss:</b> some words lose their second vowel before a vowel: ${tk("ogul")} → ${r2h(d("ogul", { poss: "men" }))}, ${tk("burun")} → ${r2h(d("burun", { poss: "men" }))}, ${tk("agyz")} → ${r2h(d("agyz", { poss: "ol" }))}.</li>
          <li><b>The dative after a vowel</b> merges with it: ${tk("Mary")} → ${r2h(d("Mary", { case: "dat" }))}, ${tk("okuwçy")} → ${r2h(d("okuwçy", { case: "dat" }))}, ${tk("eje")} → ${r2h(d("eje", { case: "dat" }))}.</li>
          <li><b>e becomes ä</b> at the end of a word before some endings: ${tk("eje")} → ${r2h(d("eje", { case: "dat" }))}; ${tk("işlemek")} → ${r2h(M.converb("işlemek"))}, ${r2h(form("aorist", "işlemek", "ol"))}.</li>
          <li><b>Buffer letters:</b> after a vowel, ${code("-(n)Y")}, ${code("-(n)Yň")} and ${code("-(s)Y")} take n or s: ${r2h(d("okuwçy", { case: "acc" }))}, ${r2h(d("okuwçy", { case: "gen" }))}, ${r2h(d("okuwçy", { poss: "ol" }))}; and a case after his, her or its takes an n: ${r2h(d("öý", { poss: "ol", case: "loc" }))}, ${r2h(d("kitap", { poss: "ol", case: "dat" }))}.</li>
          <li><b>No apostrophe</b>, names included: ${r2h(d("Aşgabat", { case: "loc" }))}, ${r2h(d("Merdan", { case: "gen" }))}. A number takes a hyphen: ${tk("1991-nji ýylda")}.</li>
        </ul>
        ${learn("gp-voicing", "gp-vowel-loss", "gp-dative", "gp-pronominal-n", "gp-proper-nouns")}`));

  const NOUNS = ["öý", "kitap", "mekdep", "okuwçy"];
  const CASES = [["Nominative", null, "—", "the subject; an object that isn't specific", "gp-sentence-basics"], ["Genitive", "gen", "-(n)Yň", "of, …'s", "gp-genitive"],
    ["Dative", "dat", "-A", "to, toward", "gp-dative"], ["Accusative", "acc", "-(n)Y", "the (a specific object)", "gp-accusative"],
    ["Locative", "loc", "-dA", "in, at, on", "gp-locative"], ["Ablative", "abl", "-dAn", "from, out of", "gp-ablative"]];
  S.push(sec("cases", "The cases", `        <p class="cs-lede">Turkmen has no words for in, to or from: an ending on the noun does the job, and the d of ${code("-dA")} and ${code("-dAn")} never changes. The plural ${code("-lAr")} comes first, then the possessive, then the case: ${r2h(d("öý", { pl: true, poss: "biz", case: "loc" }))} (in our houses). With is the word ${tk("bilen")}, after the noun: ${tk("Aýna bilen")}.</p>
        ${tbl(["Case"].concat(NOUNS.map((w) => `<span lang="tk">${text(w)}</span>`)), CASES.map(([name, c, suf, mean]) => [`${text(name)}<small>${text(mean)}</small><code>${text(suf)}</code>`].concat(NOUNS.map((w) => (c ? r2h(d(w, { case: c })) : tk(w))))))}
        ${learn(...CASES.map((c) => c[4]).slice(1), "gp-bilen")}`));

  const PN = ["öý", "kitap", "ogul", "okuwçy"];
  S.push(sec("possessive", "Possessive endings: my, your, his", `        ${tbl(["Owner", "Ending"].concat(PN.map((w) => `<span lang="tk">${text(w)}</span>`)), P.map((p, i) => [p,
          code(["-(Y)m", "-(Y)ň", "-(s)Y", "-(Y)mYz", "-(Y)ňYz", "-(s)Y, -lArY"][i])].concat(PN.map((w) => {
            const r = d(w, { poss: p });
            return r2h(r) + (p === "olar" ? `, ${r2h(d(w, { pl: true, poss: "ol" }))}` : "");
          }))))}
        <p class="cs-learn">To say **I have**: the possessive and ${tk("bar")}: ${tk(form("possessive-bar", "kitap", "men").text)} (I have a book); **not**: ${tk(form("possessive-yok", "kitap", "men").text)}. “Of”: the genitive, then the possessive: ${r2h(d("Aýna", { case: "gen" }))} ${r2h(d("öý", { poss: "ol" }))} (Aýna's house).</p>
        ${learn("gp-possessive-suffixes", "gp-possessive-voicing", "gp-possessive-have", "gp-genitive-possessive")}`.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")));

  S.push(sec("pronouns", "Personal pronouns", `        <div class="cs-pair">
          ${tbl(["", "of (genitive)", "to (dative)", "the object"], P.map((p) => [p].concat(["genitive", "dative", "accusative"].map((c) => r2h(form("pronoun-" + c, "", p))))))}
          ${tbl(["", "at (locative)", "from (ablative)", "mine…"], P.map((p) => [p].concat(["locative", "ablative", "genitive-ky"].map((c) => r2h(form("pronoun-" + c, "", p))))))}
        </div>
        ${learn("gp-personal-pronouns", "gp-genitive", "gp-pronoun-cases-dat-abl", "gp-pronoun-accusative", "gp-ky-pronoun")}`));

  S.push(sec("to-be", "“To be”", `        <p class="cs-lede">In the present, “to be” is usually not said: put the two words side by side, with the subject. ${tk("däl")} makes it negative; the question ending ${code("-mY")} is written onto the word. In careful style the third person takes ${code("-dYr")}: ${tk("ol " + form("copula-dyr", "talyp", "ol").text)}; formal writing gives the other persons ${code("-dYr")} with the endings too: ${["men", "sen"].map((p) => tk(form("copula-dyr", "talyp", p).text)).join(", ")}…</p>
        ${tbl(["Person", "I'm a student", "I'm not", "Am I?", "I was"], P.map((p) => [p, tk(p + " " + form("copula-present", "talyp", p).text),
          tk(p + " " + form("copula-present-negative", "talyp", p).text), tk(p + " " + form("copula-present-question", "talyp", p).text + "?"), tk(p + " " + form("past-copula", "talyp", p).text)]))}
        <p class="cs-learn">There is, there isn't: ${tk("bar")}, ${tk("ýok")}; in the past ${tk(form("past-copula", "bar", "ol").text)}, ${tk(form("past-copula", "ýok", "ol").text)}. So it is, I hear: ${tk("Ol talyp eken")}.</p>
        ${learn("gp-copula-present", "gp-dal", "gp-question-my", "gp-bar-yok", "gp-past-copula", "gp-eken")}`));

  S.push(sec("personal-endings", "The personal endings of verbs", `        <p class="cs-lede">The present ${code("-ýAr")}, the general present ${code("-Ar")} and “to be” take one set of endings; the past ${code("-dY")} and the conditional ${code("-sA")} take a shorter one. The future ${code("-jAk")} and ${code("-mAlY")} take none, so the subject is said: ${tk("men " + form("future", "gelmek", "men").text)}.</p>
        ${tbl(["Person", "Set 1", "Example", "Set 2", "Example"], P.map((p, i) => [p, code(["-(Y)n", "-sYň", "—", "-(Y)s", "-sYňYz", "-lAr"][i]), r2h(form("present", "gelmek", p)),
          code(["-m", "-ň", "—", "-k", "-ňYz", "-lAr"][i]), r2h(form("past", "gelmek", p))]))}
        ${learn("gp-present-yar", "gp-past-dy", "gp-person-endings-types")}`));

  // every tense of the verb pages, for men (the imperative for sen, a guess for ol), on three verbs
  const VS = ["gelmek", "okamak", "gitmek"];
  const rows = [];
  for (const g of GROUPS) for (const [id, name, suf, , gps, cols, o = {}] of g.sections) {
    const slug = cols[0][1], p = o.rows ? "sen" : o.persons ? o.persons[0] : "men";
    const gl = ctx.guideLink(gps[0], up);
    rows.push([`${gl ? `<a href="${gl.href}">${text(name)}</a>` : text(name)}<small>${gl ? gl.unit.split(" · ")[0] : ""}${p === "men" ? "" : " · " + p}</small><code>${text(suf.split(" · ")[0])}</code>`]
      .concat(VS.map((v) => r2h(form(slug, v, p)))));
  }
  S.push(sec("tenses", "Tenses and moods at a glance", `        <p class="cs-lede">The forms for ${tk("men")} (I), unless the row says otherwise. The negative ${code("-mA")} comes right after the stem: ${r2h(form("present-negative", "gelmek", "men"))}, ${r2h(form("past-negative", "gelmek", "men"))}; the general present has its own, ${code("-mAr")} and ${code("-mAz")}: ${r2h(form("aorist-negative", "gelmek", "men"))}, ${r2h(form("aorist-negative", "gelmek", "ol"))}. Each table in full, for 100 verbs: <a href="${up}verbs/">Turkmen verbs</a>.</p>
        ${tbl(["Tense", ...VS.map(verb)], rows, 3)}
        <p class="cs-learn">Questions: ${r2h(form("present-question", "gelmek", "sen"))}, ${r2h(form("past-question", "gelmek", "sen"))}, ${r2h(form("future-question", "gelmek", "sen"))}; in a compound past the question ending comes before ${code("-dY")}: ${r2h(form("past-continuous-question", "gelmek", "sen"))}. Conjugated in full: ${["gelmek", "okamak", "gitmek", "etmek", "işlemek", "bolmak"].map(verb).join(", ")}.</p>`));

  S.push(sec("moods", "Commands and suggestions", `        <p class="cs-lede">Let me, come!, let him: one form for each person.</p>
        ${tbl(["Person", "Positive", "Negative"], P.map((p) => [p, form("moods", "gelmek", p).variants.map((t, i) => tkSeg(t, form("moods", "gelmek", p).segs[i])).join(", "),
          form("moods-negative", "gelmek", p).variants.map((t, i) => tkSeg(t, form("moods-negative", "gelmek", p).segs[i])).join(", ")]))}
        ${learn("gp-imperative", "gp-optative", "gp-imperative-3rd")}`));

  const conv = [["-(Y)p", "and (then)", (v) => M.converb(v), "gp-yp"], ["-AndA", "when", (v) => M.build(v, ["AN", "LOC"]), "gp-anda"],
    ["-Andan soň", "after", (v) => M.build(v, ["AN", "ABL"]), "gp-andan-son", " soň"], ["-mAzdAn öň", "before", (v) => M.build(v, ["MAZDAN"]), "gp-mazdan-on", " öň"],
    ["-mAn", "without", (v) => M.negativeConverb(v), "gp-man"], ["-ýAnçA", "until", (v) => M.build(v, ["YANCA"]), "gp-yanca"],
    ["-dYgY üçin", "because", (v) => M.form("dygy-an", v, "ol"), "gp-dygy-ucin", " üçin"]];
  S.push(sec("converbs", "Linking clauses: -(Y)p, -AndA, -mAn…", `        ${tbl(["Suffix", "Meaning", "gelmek", "okamak"], conv.map(([suf, mean, f, , after]) =>
          [code(suf), text(mean)].concat(["gelmek", "okamak"].map((v) => r2h(f(v)) + (after ? tk(after) : ""))))) }
        ${learn(...conv.map((c) => c[3]))}`));

  const kitabym = d("kitap", { poss: "men" });
  S.push(sec("participles", "Participles: the boy who is reading, the book I read", `        <p class="cs-lede">Everything that describes a noun comes before it, with the participle last. When someone else does the action, the possessive goes on the noun.</p>
        ${tbl(["Suffix", "Example", "Meaning"], [
          [code("-ýAn"), tk(`kitap ${M.participle("okamak", "yan").text} oglan`), "the boy who is reading a book"],
          [code("-An"), tk(`düýn ${M.participle("gelmek", "an").text} myhman`), "the guest who came yesterday"],
          [code("-An") + " + possessive", tk(`meniň ${M.participle("okamak", "an").text} ${kitabym.text}`), "the book I read"],
          [code("-jAk") + " + possessive", tk(`meniň ${M.participle("okamak", "jak").text} ${kitabym.text}`), "the book I'm going to read"],
          [code("-mAdYk"), tk(`${M.participle("görmek", "an", true).text} ýer`), "a place I haven't seen"],
          [code("-dYgY"), tk(`Onuň ${form("dygy-an-accusative", "gelmek", "ol").text} bilýärin.`), "I know that he came."]])}
        ${learn("gp-participle-yan", "gp-participle-an", "gp-participle-jak", "gp-participle-madyk", "gp-dygy")}`));

  const vo = (v, k) => r2h(M.voice(v, k));
  S.push(sec("voices", "Voices: passive, reflexive, causative, each other", `        ${tbl(["Voice", "Suffix", "Examples"], [
          ["Passive", code("-Yl, -l, -Yn, -n"), [["ýazmak", "pass"], ["okamak", "pass"], ["bilmek", "pass"], ["arassalamak", "pass"]].map(([v, k]) => vo(v, k)).join(", ")],
          ["Reflexive", code("-(Y)n"), [["ýuwmak", "refl"], ["geýmek", "refl"]].map(([v, k]) => vo(v, k)).join(", ")],
          ["Causative", code("-dYr, -t"), [["gülmek", "caus"], ["kesmek", "caus"], ["okamak", "caus"]].map(([v, k]) => vo(v, k)).join(", ") + `; irregular: ${vo("görmek", "caus")}`],
          ["Each other", code("-(Y)ş"), [["görmek", "recip"], ["gürlemek", "recip"]].map(([v, k]) => vo(v, k)).join(", ")]])}
        <p class="cs-learn">A voice makes a new verb, which takes every tense: ${r2h(form("past", M.voice("ýazmak", "pass").text, "ol"))} (it was written), ${r2h(form("past", M.voice("kesmek", "caus").text, "men"))} (I had it cut).</p>
        ${learn("gp-passive", "gp-reflexive", "gp-causative", "gp-reciprocal")}`));

  S.push(sec("word-order", "Word order", `        <ul class="cs-rules">
          <li>The verb comes last: subject, object, verb. ${tk(`Men çaý ${form("present", "içmek", "men").text}.`)} (I drink tea.)</li>
          <li>Time and place come before an object without an ending, which sits right before the verb: ${tk(`Men her gün çörek ${form("present", "almak", "men").text}.`)} (I buy bread every day.)</li>
          <li>The word right before the verb is in focus: ${tk(`${d("çörek", { case: "acc" }).text.replace(/^./, (x) => x.toUpperCase())} men ${form("present", "almak", "men").text}.`)} (I'm the one buying the bread.)</li>
          <li>Adjectives, possessors and descriptions come before the noun: ${tk(`${d("bazar", { case: "loc" }).text} haly ${M.participle("satmak", "yan").text} adam`)} (the man who sells carpets at the bazaar).</li>
          <li>Postpositions come after their noun, and after a pronoun in the genitive: ${tk(form("pronoun-genitive", "", "men").text + " bilen")} (with me), ${tk(form("pronoun-genitive", "", "sen").text + " üçin")} (for you).</li>
        </ul>
        ${learn("gp-sentence-basics", "gp-object-word-order", "gp-relative-order", "gp-postp-nominative")}`));

  return { toc: S.map((s) => [s.id, s.title]), html: S.map((s) => s.html).join("\n") };
}
