# Turkmen A1 → B1 · Project spec

The rules for the Turkmen course (working name **Daily Turkmen**), a sister of the Turkish course and built from its code. Every conversation that works on it reads this file in full first, then the parts of [TM-CURRICULUM.md](TM-CURRICULUM.md) it needs, then the sections of [turkish/PROJECT.md](../turkish/PROJECT.md) this file points to, and finishes by adding a line to the progress log at the bottom. [TM-PROMPTS.md](TM-PROMPTS.md) has the opening prompt of each conversation.

**How this file relates to the Turkish spec.** The Turkmen course reuses the Turkish course's design: the same pages, data schemas, exercise types, answer checker, SRS scheduler, progress store and validator, forked into Turkmen files. Where this file says nothing, the Turkish spec applies **with the renames of section 5.0**. Where they differ, this file wins. When the Turkish spec changes later, the Turkmen course does not follow automatically: a conversation that wants a Turkish improvement ports it and logs it here.

**Contents:** 1 Goals · 2 Fixed decisions · 3 Files and pages · 4 IDs · 5 Data schemas · 6 Runtime behaviour · 7 Content style rules · 8 Validation · 9 Workflow for a conversation · 10 Progress log

## 1. Goals

- A Turkmen course from A1 to B1 for English speakers, in the spirit of Daily Turkish: a path of units and short lessons, many small exercises, immediate feedback, XP and a streak.
- **For English speakers starting from zero.** No knowledge of Turkish (or any other Turkic language) is assumed. **Lessons are never built as a bridge from Turkish**: lessons, hints, feedback, guides, interludes and flashcards explain Turkmen on its own terms, in English, and every explanation must work for someone who has never heard Turkish. A short factual remark that Turkmen and Turkish are related or alike is allowed where it is interesting (*Turkmen sentence structure works like Turkish: the verb comes last*), at most once in a guide or interlude, never in lessons, hints or feedback, and never as the way a point is taught (no Turkish forms to translate from, no "where Turkish has X, Turkmen has Y").
- **Structure and format may follow Daily Turkish, and say so.** The course deliberately mirrors Daily Turkish in structure (levels, units, lessons, exercise types, guides, interludes, flashcards), layout and formatting, and the pages may present it as Daily Turkish's sister (the shared look, the link between the two sites, "from the makers of Daily Turkish"). Writers and build conversations compare with the Turkish course freely: its code, schemas, files and formats are the template, and the notes for writers in TM-CURRICULUM.md compare the two languages to say what the template gets wrong for Turkmen.
- Every point of Turkmen grammar up to B1 (scope in TM-CURRICULUM.md), explained in a grammar guide per unit and practised in that unit's lessons.
- One culture or history interlude per unit, about Turkmenistan and the Turkmen, factual and neutral.
- A deck of 1,000 useful Turkmen words, reviewed with Anki-style spaced repetition.
- Correct content: standard written Turkmen as in the official orthographic dictionary, accepted-answer lists that are fair to the learner, and a native speaker's review of every batch before the beta label comes off (section 9).

**Not in scope for now:** B2 to C2, audio of any kind, accounts and sync (local progress with export and import, as the Turkish course had before ACCT-1), the iOS app, any content copied from other courses or textbooks.

## 2. Fixed decisions

| Topic | Decision |
|---|---|
| Name and address | Working name **Daily Turkmen**. Served from `dailyturkish.app/turkmen/` (and `gregoiremaillard.com/turkmen/`); no domain of its own for now |
| Hosting | Static files on GitHub Pages in the `gregoire-maillard.github.io` repo, mirrored to `dailyturkish` by the sync workflow (TK-PUBLISH adds the Turkmen paths); no backend |
| Code | Forked from the Turkish course, not shared: Turkmen files never `import` or load Turkish ones, so the Turkish course can change without breaking this one |
| Progress | `localStorage` under `tkm:v1:…`, with export to and import from a JSON file. No accounts in this version |
| Interface language | English only. No Turkish anywhere in learner-facing content (section 1) |
| Audio | **None.** Browsers have no Turkmen speech voice and Turkish voices mispronounce Turkmen. No speaker buttons, no `listen` exercises, no speech settings. The data leaves room for recordings later (section 5.0) |
| Flashcard algorithm | Identical to the Turkish course (turkish/PROJECT.md 6.6) |
| Validation | `node scripts/turkmen/validate.mjs`, no dependencies (section 8) |
| Beta | Until a batch has had its native review (section 9), the pages say the course is in beta and written with AI assistance |
| Git | On Grégoire's Mac: never commit or push; he reviews and pushes. In a cloud session: commit to a branch named `turkmen/<conversation-id>` (for example `turkmen/a1-1`) and push that branch only, never `main` |

## 3. Files and pages

```
turkmen/index.html                  hub (fork of turkish.html)
turkmen/lesson.html                 lesson player: ?id=a1-u01-l01 | ?review=a1-u01 | ?test=a1-u05 | ?practice=mistakes
turkmen/guide.html                  reader: ?id=a1-u01-grammar | ?id=a1-u01-culture | no id: index
turkmen/cards.html                  flashcards: review | ?view=browse (&q=) | ?view=stats | ?view=settings
turkmen/TM-PROJECT.md                  this file
turkmen/TM-CURRICULUM.md               scope, registry of IDs, batches
turkmen/TM-PROMPTS.md                  the opening prompt of each conversation
assets/js/turkmen.js                shared: data loading, progress store, answer checker, SRS scheduler, text markup renderer (fork of turkish.js, window.TKM)
assets/js/turkmen-morph.js          morphology engine (window.TKMMorph), used by the validator and the SEO pages
assets/data/turkmen/
  index.json                        GENERATED by the validator (--index)
  levels/a1.json … b1.json
  units/a1-u01.json …
  lessons/a1-u01-l01.json …
  grammar/a1-u01.json …
  culture/a1-u01.json …
  flashcards/tm-fc-0001-0200.json …    five files of 200 cards
assets/img/daily-turkmen-*          logo, favicon, share image (TK-BUILD-2)
scripts/turkmen/
  validate.mjs                      the validator (fork of scripts/turkish/validate.mjs)
  test.mjs                          tests for turkmen.js
  morph-test.mjs                    tests for turkmen-morph.js
  tm-wordlist.tsv                      the ranked 1,000 lemmas of the deck (7.8)
  static.mjs                        pre-renders guides and the hub for the mirror (TK-PUBLISH)
  README.md                         how to run them
```

The pages live in the `turkmen/` folder (not at the site root like the Turkish ones) so that the same relative paths work on `gregoiremaillard.com/turkmen/` and `dailyturkish.app/turkmen/`. Links between Turkmen pages are relative (`lesson.html?id=…`); links to shared assets are root-absolute (`/assets/…`). A pre-rendered guide lands at `turkmen/guides/<id>.html` in the mirror.

### Page conventions

As in turkish/PROJECT.md section 3, "Page conventions", with these differences:

- `<html lang="en">`, and every element holding Turkmen text gets `lang="tk"`.
- Header tabs: **Course** (`index.html`), **Grammar** (`guide.html`), **Flashcards** (`cards.html`), plus a small link back to Daily Turkish. The Turkish hub gets a link to the Turkmen course (TK-PUBLISH).
- **Level colours** from Turkmen carpets and jewellery, distinct from the Turkish İznik set so a learner of both never confuses them. Proposal for TK-BUILD-2 to test for contrast: A1 carnelian `#b23a2e`, A2 indigo `#2e4a8a`, B1 malachite green `#1f7a55`; "mastered" stays the shiny gold. The level colour marks identity only; buttons and selected options keep the site blue.
- **Pattern**: a faint SVG of a carpet *göl* (the octagonal medallion) instead of the İznik tile, in the same places.
- **Tile wall**: one tile per unit (36), a row per level.
- **Characters**: the Turkish course's critters are replaced by Turkmen ones, one per level, drawn in the same style. Proposal: an Akhal-Teke foal (A1), an Alabay puppy (A2), a camel (B1). The A1 greeter says *Salam!*, *Hoş geldiň!*, *Görmeýärin!* (while the password is typed, if accounts come later) and so on; TK-BUILD-2 writes these lines and gets them checked.
- **No speech**: no speaker buttons, no slow button, no autoplay, no speech settings, no `listen` exercises.
- **Typing**: the letter bar holds `ä ç ž ň ö ş ü ý`, with a shift key for `Ä Ç Ž Ň Ö Ş Ü Ý`. Inputs use `lang="tk"`, `autocapitalize="off"`, `autocorrect="off"`, `spellcheck="false"`.
- **Beta notice**: a one-line notice on the hub and at the top of each guide while the content is in beta (section 2).
- Analytics: the site's gtag snippet, plus at most `tkm_lesson_complete` {lesson, score} and `tkm_cards_session` {reviewed}. Never send typed answers.

### Morphology engine (`assets/js/turkmen-morph.js`)

A rule-based model of how written Turkmen builds its words (TK-MORPH), built like the Turkish engine (turkish/PROJECT.md 3) but not loading it. The validator checks every `conjugate` and `morph` exercise and the forms on the flashcards against it (section 8), and `scripts/turkmen/morph-test.mjs` tests it on forms typed by hand. It is a classic script like `turkmen.js`: in a page it exposes `window.TKMMorph` (and `TKM.morph` when it loads after `turkmen.js`); in Node, `require()` returns the same object. No page loads it yet; one that needs it adds `<script defer src="/assets/js/turkmen-morph.js"></script>` after `turkmen.js`. No dependencies. Scope: everything A1 and A2 need; QA-TK-1 extends it to B1.

**What it knows.** Suffixes are written in the notation of TM-CURRICULUM.md (A = a/e, Y = y/i, (Y) and (A) linking vowels after a consonant, (n) and (s) buffer letters after a vowel), plus Ä = a/ä for the suffixes whose front form has ä (-ýÄr *gelýär*, -rÄk *kiçiräk*), and attached one at a time, with:

- front/back harmony on the last vowel (ä is front), and the **rounding rule** of TM-CURRICULUM.md: the vowel of the second syllable rounds after a rounded first syllable unless it ends the word (*gözüm, öýüne, boldum, gowurak*, but *gözi, boldy*), y/i from the third syllable on (*öýümiz, bolupdyr*); -mY counts as part of the word (*gowumy*) but its own vowel never rounds (*ýokmydy*);
- voicing of a noun's final k, p, ç before a vowel when it has two or more syllables (*kitaby, çöregi, agajy*), of t only from a list (*Aşgabady*, but *döwleti*), and of one-syllable words only when their vowel is long, from a list with the homographs told apart by sense (*at* "name" → *adym*, *at* "horse" → *atym*); the closed list of verbs that voice t to d before a vowel and before -ýAr (*gidýär, gider, gidip*, but *gitdi, gitjek*);
- vowel loss from a list (*ogly, burnum, agzy*); the dative fused with a final vowel (*Mara, okuwça, ejä, kişä, oba*); -ny and -nyň after a vowel (*Aýnany, Aýnanyň*); the pronominal n after a third-person possessive and after -kY (*öýüne, kitabynda*); the pronouns and demonstratives written out (*maňa, oňa, muny, şonuň*);
- **e → ä**: a final e before the dative, -ny, -nyň, the possessives -(Y)m, -(Y)ň, -(Y)mYz, -(Y)ňYz and -kY (*ejä, nämäni, hepdäniň, ejäm, öýdäki*), and an e-final verb stem or the negative -mA before -(Y)p, -(Y)ň, -An, -Ar and the optative (*işläp, işlär, gelmäň, işläýin*);
- "to be": the zero form first, -dYr with the personal endings, the formal written form (*talypdyryn, talypdyrsyň, talypdyr*), and last the bare endings (*talybyn*), *däl* with the same endings, *bar* and *ýok*, the past -dY (*talypdym, öýdedik, bardy*), the question particle written attached (*talypmy, talypmydyň*);
- verbs: -ýAr, -dY, -jAk and -mAlY without endings, -Ar with -mAr and -mAz, the imperatives and optatives, -sYn, -(Y)p, -(Y)p bilmek in three tenses, -(Y)p with *otyr, dur, ýatyr, ýör*, -(Y)pdYr in the third person; compound verbs change only their last word (*pikir edýär*).

The word lists are `TKMMorph.LEX`: long-vowel monosyllables and homographs, nouns in -t that voice, words that keep their consonant, vowel loss, the verbs that voice t, one-syllable loanwords whose rounding is unsure. When the validator flags a correct form, the fix usually belongs there, with a test. TM-CURRICULUM.md ("Open questions for native review", 1–5 and 9) says what each rule rests on and which points are open.

**Forms by name.** `TKMMorph.form(slug, base, person, { sense })` returns `{ text, seg, variants, segs }`: the usual form, the same with "|" between morphemes as in `seg` (turkish/PROJECT.md 5.1), and every form the engine counts as right, the usual one first; or `null` where the form doesn't exist. `base` is an infinitive (*gelmek*; in *pikir etmek* only the last word changes) or a noun or nominal predicate (*talyp*, *öýde*, *talyp däl*), `person` *men* … *olar*; `sense` picks a homograph's reading (1, 2 or its gloss). Each slug has `-negative`, `-question` and `-negative-question` where the form has them:

| Slugs | Forms |
|---|---|
| `copula-present`, `copula-dyr`, `past-copula` | "to be" in the present (zero form first, then -dYr with the endings, then the bare endings), with -dYr (every person in the positive; ol and olar in the negative and question), in the past |
| `present`, `past`, `future`, `aorist`, `necessitative` | -ýAr, -dY, -jAk, -Ar (-mAr, -mAz), -mAlY |
| `imperative` (sen, siz), `optative` (men, biz), `imperative-3rd` (ol, olar), `moods` (all six) | the imperatives and optatives; no question of the 2nd-person imperative |
| `ability`, `ability-aorist`, `ability-past` | -(Y)p bilmek with -ýAr, -Ar, -dY |
| `progressive-otyr`, `progressive-dur`, `progressive-yatyr`, `progressive-yor` | -(Y)p with the posture verbs; positive and question only |
| `perfect-ypdyr` (ol, olar) | -(Y)pdYr, the first look of a2-u02; positive and question |
| `possessive`, `possessive-locative`, `-dative`, `-accusative`, `possessive-bar`, `possessive-yok` | possessive endings, with a case or with *bar*, *ýok* |
| `pronoun-accusative`, `-dative`, `-locative`, `-ablative`, `-genitive`, `pronoun-genitive-ky` | the personal pronouns in each case, and *meniňki* … |

Aliases name the same forms by their grammar point (`present-yar`, `past-dy`, `future-jak`, `general-present`, `maly`, `yp-bilmek`, `ypdyr`, `copula`, `dal`, with their `-negative` and `-question`). `TKMMorph.forms()` lists all 104 names with their row and grammar points.

Variants it counts as right (TM-CURRICULUM.md, open questions): for the present copula, the zero form first in every person (*Men talyp*), then -dYr with the ending (*talypdyryn*), then the ending alone (*talybyn*, not after a vowel in the first persons: no *öýden*), which the course doesn't teach (open question 2, settled in A1-1); for olar, -lAr or not (the validator also accepts the ol form, as in Turkish); the question particle after or before the ending in the second persons (*gelýärsiňmi*, *gelýärmiň*); *ejem* beside *ejäm*; *geljek däl* and *gelmejek*, *gelmeli däl* and *gelmemeli*; *geliňiz* beside *geliň*; *geleli* and *geleliň*; for olar, -(s)Y or -lArY (*kitaby*, *kitaplary*); one-syllable loanwords rounded or not (*stoluň*, *stolyň*); the host of -mY rounded or not (*boldumy*, *boldymy*).

**Other calls.** `conjugate(base, { tense, neg, q, p, ability, aux })` and `copula(pred, { tense, neg, q, p })` build any of these forms; `decline(noun, { pl, poss, case, ky, sense })` declines a noun (*kitaplarymda*); `converb(verb)` gives -(Y)p; `build(base, ["LOC", "KY"])` applies suffixes by id (`TKMMorph.SUFFIXES`); `analyze(base, tiles)` says whether morph tiles are the base and its suffixes cut at morpheme boundaries, and if not, what the same suffixes build (*mekdepde*, not *mekdepda*; *Mara*, not *Marya*) or where the engine would cut; `readings(base)` lists a homograph's senses; `noun`, `verb`, `attach(word, "(Y)m")`, `text` and `seg` are the building blocks.

**Limits.** Written standard Turkmen only, A1 and A2 forms; no stress, no long vowels (they aren't written), no spoken forms. A word missing from the lists follows the default rules. The analysis checks letters and boundaries, not meaning.

## 4. IDs

Exactly as turkish/PROJECT.md section 4: levels `a1`, `a2`, `b1`; units `a1-u05`; lessons `a1-u05-l01`; exercises `a1-u05-l01-e07`; guides `a1-u05-grammar`; interludes `a1-u05-culture`; grammar points `gp-<slug>`, defined only in TM-CURRICULUM.md; flashcards `fc-0042`; batches `A1-1` … `B1-5`, `FC-1` … `FC-5`. **IDs are frozen once a batch is logged as done.** The two courses keep their progress under different storage keys, so the same ID in both never collides.

## 5. Data schemas

### 5.0 Renames and differences from the Turkish schemas

Every schema of turkish/PROJECT.md section 5 applies, with these changes. The validator fork (TK-BUILD-1) makes them; its `--examples` runs on the JSON examples below.

| Turkish course | Turkmen course |
|---|---|
| field `tr` (in `Gloss`, `examples`, `paradigm` rows, `dialogue` lines, `parallel`, `passage`, `quote`, lesson `vocab`, `context`, flashcards, `ex`) | field `tk` |
| `titleTr` (unit) | `titleTk` |
| types `Tr`, `TrRich` | `Tk`, `TkRich` (checked against section 7.1) |
| `Lang = "tr" \| "en"` | `Lang = "tk" \| "en"`; `optionsLang` and `from` take `"tk"` |
| `Person = "ben" \| "sen" \| "o" \| "biz" \| "siz" \| "onlar"` | `Person = "men" \| "sen" \| "ol" \| "biz" \| "siz" \| "olar"` |
| table column type `"tr"` | `"tk"` |
| culture `format: "en" \| "parallel" \| "tr"` | `"en" \| "parallel"` (B2 and up would add `"tk"`) |
| `LevelId` six levels | `"a1" \| "a2" \| "b1"` (keep the type open for later levels) |
| exercise type `listen` | **not allowed**: the validator rejects it |
| flashcard `forms` (`acc, poss3, pl, aor, prog, past, fut`) | `forms?: { acc?, poss3?, pl?, prs?, past?, fut?, aor?, cvb? }` (5.8) |
| `*…*` marks Turkish inside English | `*…*` marks **Turkmen** inside English (`<i lang="tk">`) |

Room for audio later: no `audio` field exists yet. When recordings are made, a conversation adds an optional `audio` field to the schemas, the `listen` type and the player's speaker buttons together.

### 5.1 Examples

A lesson start, to show the renames (the rest of the lesson schema is unchanged; a real lesson has 10–14 exercises):

```json lesson
{
  "id": "a1-u05-l01",
  "unit": "a1-u05",
  "order": 1,
  "title": "At home, at school",
  "goal": "Say where someone is with -da and -de.",
  "points": ["gp-locative"],
  "intro": {
    "text": "Add `-da` or `-de` to a noun to say where: *öýde* (at home), *mekdepde* (at school). The d never changes, whatever sound the word ends in.",
    "see": "gp-locative"
  },
  "vocab": [
    { "tk": "öý", "en": "house, home", "pos": "noun", "card": "fc-0073" },
    { "tk": "mekdep", "en": "school", "pos": "noun" },
    { "tk": "otag", "en": "room", "pos": "noun" },
    { "tk": "nirede", "en": "where", "pos": "adv" }
  ],
  "exercises": [
    {
      "id": "a1-u05-l01-e01",
      "type": "mcq",
      "points": ["gp-locative"],
      "question": "How do you say **at school**?",
      "options": ["mekdepde", "mekdepda", "mekdepte", "mekdebe"],
      "optionsLang": "tk",
      "answer": 0,
      "why": {
        "1": "The last vowel of *mekdep* is e, a front vowel, so the suffix takes e.",
        "2": "The d of the locative never changes: *mekdepde*.",
        "3": "*Mekdebe* means **to school**; you will meet it in unit 7."
      },
      "explain": "Front vowel e: *mekdep* + *-de* = *mekdepde*."
    },
    {
      "id": "a1-u05-l01-e02",
      "type": "cloze",
      "points": ["gp-locative"],
      "text": "Aýna otag___, Merdan öý___.",
      "en": "Aýna is in the room, Merdan is at home.",
      "blanks": [
        { "accept": ["da"], "reject": [{ "answer": "de", "why": "The last vowel of *otag* is a, a back vowel, so the suffix takes a: *otagda*." }] },
        { "options": ["de", "da"], "answer": 0 }
      ],
      "explain": "*otag* has the back vowel a → *-da*; *öý* has the front vowel ö → *-de*."
    },
    {
      "id": "a1-u05-l01-e03",
      "type": "translate",
      "points": ["gp-locative", "gp-copula-present"],
      "from": "en",
      "prompt": "I am at home.",
      "accept": ["Men öýde."],
      "reject": [{ "answer": "Öýde.", "why": "Nothing in *öýde* says who is at home, so keep the subject: *Men öýde*." }],
      "explain": "*öý* + *-de* (at home); after *men*, **to be** is not written."
    },
    {
      "id": "a1-u05-l01-e04",
      "type": "translate",
      "points": ["gp-locative"],
      "from": "tk",
      "prompt": "Mugallym mekdepde.",
      "accept": ["The teacher is at school.", "The teacher is [at|in] the school", "The teacher's at (the) school"]
    },
    {
      "id": "a1-u05-l01-e05",
      "type": "wordbank",
      "from": "en",
      "prompt": "Where is the school?",
      "text": "Mekdep nirede?",
      "answer": ["mekdep", "nirede"],
      "distractors": ["öý", "bar", "otagda"]
    },
    {
      "id": "a1-u05-l01-e06",
      "type": "match",
      "pairs": [["öý", "house, home"], ["mekdep", "school"], ["otag", "room"], ["nirede", "where"]]
    }
  ]
}
```

A `tip` callout in a grammar guide:

```json block
{ "type": "callout", "kind": "tip", "title": "One word, not two", "text": "The question ending is written onto the word it asks about: *Sen talypmy?* (Are you a student?), *Gelýärsiňmi?* (Are you coming?)" }
```

### 5.8 Flashcards

```ts
interface FlashcardFile {
  deck: "core-1000";
  range: [number, number];   // [1, 200] for tm-fc-0001-0200.json
  source: En;                // how the list and its ranks were made (7.8)
  cards: Card[];             // one card per rank in the range, sorted by rank
}
interface Card {
  id: string;                // "fc-0042"
  rank: number;
  tk: Tk;                    // lemma: verbs as infinitive (gitmek), nouns in the nominative singular
  pos: Pos;
  sense?: number;            // 1, 2… when the same tk and pos have two meanings (at: name, horse)
  en: En[];                  // [1–4] glosses, most common first; verbs as "to go"
  ex: { tk: Tk; en: En };    // a natural example sentence, A1–A2 grammar where possible
  forms?: { acc?: Tk; poss3?: Tk; pl?: Tk; prs?: Tk; past?: Tk; fut?: Tk; aor?: Tk; cvb?: Tk };  // third person singular forms
  note?: Rich;               // irregularities, register, words easily confused
  tags?: string[];
  level?: LevelId;
  unit?: string;             // first unit that teaches it (filled in by content batches)
}
```

Verbs give `forms.prs` (-ýAr), `forms.past` (-dY), `forms.aor` (-Ar) and `forms.cvb` (-(Y)p); `fut` (-jAk) only when it isn't regular. Nouns whose stem changes before a vowel give `forms.acc` (*kitap → kitaby*, *at* "name" → *ady*, *ogul → ogly*). The validator checks every form against the morphology engine, with the card's `sense` for a homograph (section 8).

```json flashcards
{
  "deck": "core-1000",
  "range": [1, 200],
  "source": "Example only.",
  "cards": [
    {
      "id": "fc-0021",
      "rank": 21,
      "tk": "gitmek",
      "pos": "verb",
      "en": ["to go", "to leave"],
      "ex": { "tk": "Ertir Mara gidýärin.", "en": "I'm going to Mary tomorrow." },
      "forms": { "prs": "gidýär", "past": "gitdi", "aor": "gider", "cvb": "gidip" },
      "note": "t becomes d before a vowel and before -ýär: *gidýär*, *gider*, *gidip*.",
      "level": "a1"
    }
  ]
}
```

Card notes never mention Turkish (section 1). They may point out two Turkmen words easily confused: *at* (name) and *at* (horse).

### 5.9 User progress

As turkish/PROJECT.md 5.9, under the keys `tkm:v1:course`, `tkm:v1:cards` and `tkm:v1:settings`, with the card directions `tk-en` and `en-tk`. Settings drop everything about speech (`tts`, `ttsRate`). The export file's `app` field is `"daily-turkmen"`, and import refuses a Daily Turkish file with a clear message (and the Turkish course refuses a Turkmen one).

```json progress
{
  "app": "daily-turkmen",
  "schema": 1,
  "exported": "2026-10-13T21:40:00.000Z",
  "course": {
    "schema": 1,
    "updated": "2026-10-13T21:35:12.000Z",
    "lessons": { "a1-u01-l01": { "first": "2026-10-12", "last": "2026-10-13T21:30:00.000Z", "runs": 2, "best": 0.9, "xp": 23 } },
    "units": { "a1-u01": { "guide": "2026-10-12T20:00:00.000Z" } },
    "mistakes": { "a1-u01-l01-e04": { "n": 1, "ok": 1, "last": "2026-10-13T21:28:00.000Z" } },
    "xp": { "total": 23, "days": { "2026-10-12": 13, "2026-10-13": 10 } },
    "streak": { "current": 2, "best": 2, "last": "2026-10-13" }
  },
  "cards": {
    "schema": 1,
    "updated": "2026-10-13T21:35:12.000Z",
    "cards": {
      "fc-0001:tk-en": { "s": "review", "due": 1792195200000, "ivl": 1, "ease": 2.5, "step": 0, "reps": 3, "lapses": 0, "last": 1792100000000 },
      "fc-0002:tk-en": { "s": "learning", "due": 1792100600000, "ivl": 0, "ease": 2.5, "step": 1, "reps": 1, "lapses": 0, "last": 1792100000000 }
    },
    "days": { "2026-10-13": { "new": 2, "reviews": 4, "again": 1, "lapses": 1, "mature": 0, "matureLapses": 0 } }
  },
  "settings": {
    "schema": 1,
    "dailyGoal": 20,
    "newPerDay": 15,
    "reviewsPerDay": 200,
    "directions": ["tk-en", "en-tk"],
    "dayStartHour": 4,
    "keyboardBar": true,
    "unlockAll": false,
    "onlyTaughtWords": false
  }
}
```

## 6. Runtime behaviour

As turkish/PROJECT.md section 6 (path and unlocking, lesson flow, XP and streak, answer checking, flashcard scheduling), with these differences:

- **6.4 Answer checking.** Normalization lowercases with plain `toLowerCase()` (Turkmen has no dotted/dotless i pair), applies NFC, and for the "almost" verdict folds the eight Turkmen letters to their base (ä→a, ç→c, ž→z, ň→n, ö→o, ş→s, ü→u, ý→y), so an answer right except for missing marks is "almost": shown the right spelling, not counted wrong in a lenient exercise. The question particle typed apart (*talyp my*) is "almost", with the note that Turkmen writes it attached. As in turkish/PROJECT.md 6.4, the letter fold applies in lenient mode only (`translate` by default; `cloze` and `conjugate` are strict), and an answer right but for an apostrophe (*Aşgabat'da*) is "almost" (step 5); the particle typed apart is "almost" in both modes. No other letters are folded: e and ä stay apart, ç and j, and letters outside the Turkmen alphabet (ı, ğ, c, v…) make an answer wrong. The checker's notes are `apostrophe`, `Turkmen letters` and `particle` (and `typo` for English answers).
- **6.5 Speech and typing.** No speech (section 2). Typing as in section 3.
- **6.6 Flashcards.** Identical, with directions `tk-en` and `en-tk`; nothing is read aloud.
- **6.7 `turkmen.js`** exposes `window.TKM` with the same members as `TRK`, minus speech (no `tts`), renamed for Turkmen: `tkLower`, `tkUpper` and `tkRich` (for `trLower`, `trUpper`, `trRich`), the CSS classes `tkm-nw`, `tkm-seg` and `tkm-soon`, and an achievement's Turkmen name in `tk`. It adds `joinParticle`, the checker's joining of a particle typed apart. Its page links are relative (`index.html`, `lesson.html`, `guide.html`, `cards.html`, section 3); a page that sets `window.TKM_STATIC_GUIDES = true` before loading it links guides to `guides/<id>.html` instead (for TK-PUBLISH).

## 7. Content style rules

### 7.1 Turkmen orthography

- Standard written Turkmen in the Latin alphabet of 1993, as revised in 1999, spelled as in the official orthographic dictionary (*Türkmen diliniň orfografik sözlügi*) and explanatory dictionary (*Türkmen diliniň düşündirişli sözlügi*). When unsure about a spelling, check a dictionary rather than guessing, and log what was checked. No Cyrillic Turkmen.
- Only the 30 letters: a b ç d e ä f g h i j ž k l m n ň o ö p r s ş t u ü w y ý z. c, q, v and x only in foreign names written in their own spelling, and only in English text. The validator rejects ı, ğ, İ, â, î, û in Turkmen text.
- **y and ý are different letters**: *y* is a vowel (*gyz*, *ýyl*), *ý* a consonant (*ýok*, *aý*, *öý*). Check every word for both.
- **No apostrophe** before suffixes, on any word: *Aşgabatda*, *Merdanyň*, *2026-njy ýylda*, *BMG-niň*. Numerals take a hyphen before their suffix (*27-nji*, *1991-nji ýylda*, *5-e*).
- **Written attached**: the question particle -mY (*talypmy?*, *gelýärsiňmi?*, *dälmi?*); the locative-adjective -dAky (*öýdäki*); -ky (*meniňki*). **Written apart**: *bilen*, *üçin*, *ýaly*, *däl*, *hem*, *bar*, *ýok*, *eken*, the helper verbs (*okap otyr*, *gelip bilýärin*). Hyphenated: *ýa-da*, *şeýle-de bolsa*, reduplications (*ap-ak*, *ýuwaş-ýuwaş*). **Written as two words** (A1-1, from the explanatory dictionary on enedilim.com, reached through search): *şu gün* (in its examples under *bildiriş* and *aýak*), *hiç kim* (a sub-entry of *hiç*), *her bir* (in its examples under *ara*, *kese*, *watan*); *her kim* is written apart by the same pattern (not seen in a source).
- Day and month names in lowercase (*duşenbe*, *oktýabr*), also in full dates: *1991-nji ýylyň 27-nji oktýabry*.
- Sentences start with a capital letter and end with punctuation. Dialogue quotes in Turkmen text use “ ”. No apostrophe in Turkmen text at all (the validator warns on `'` and `’`).
- Text is NFC. ň is U+0148, ý U+00FD, ž U+017E, ä U+00E4.

### 7.2 Sounds the writing doesn't show

Guides and hints help the learner with what spelling hides, since there is no audio:

- Long vowels: say so when a word has one that matters (*at* name, *ot* fire, *üç*, *dört*, *ýaş*), and show the voicing it causes (*adym*).
- s and z as *th* sounds; ň as in *sing*; g and k with back vowels.
- e and ä: never interchangeable; *ä* is more open, like the a of *cat*.

When a guide gives a pronunciation, it uses plain English comparisons, never IPA alone.

### 7.3 Accepted answers

As turkish/PROJECT.md 7.3, with these Turkmen rules:

- **Pronouns.** With forms that carry a personal ending (-ýAr, -dY, -Ar, -sA, the copula with endings), accept the sentence with and without the pronoun. With the **future -jAk, the necessity -mAlY and the zero copula**, which carry no ending, the subject must be there: *Men ertir geljek* is right, *Ertir geljek* is wrong for "I will come tomorrow" (reject it with a why), unless the prompt is a question whose subject is already clear.
- **-ýAr and the progressive.** From a2-u11 on, accept the progressive with *otyr, dur, ýatyr, ýör* beside -ýAr for an English present continuous where both are natural.
- **-ýAr and -Ar.** For an English simple present describing a habit, accept both from a2-u04 on; for "will", accept -jAk and -Ar.
- **The question particle** written apart is never accepted; the checker makes it "almost" (6.4).
- **you**: *sen* and *siz* forms unless the prompt says "(singular)", "(plural)" or "(polite)", as in Turkish.
- Everything else (articles, word order, spellings of English, digits, full forms) as in Turkish.

### 7.4 Tone and English

As turkish/PROJECT.md 7.4: friendly, precise, short, Canadian spelling, the same length limits. Name grammar in plain English first and give the Turkmen term once in brackets (vowel harmony (*sesleriň sazlaşygy*) where the term is well established; leave it out rather than guess). Never compare with Turkish (section 1). A `compare` callout may compare with English, and only when it really helps.

### 7.5 Lessons and exercises

As turkish/PROJECT.md 7.5, except:

- No `listen`. Every lesson still has at least four exercise types and translation in both directions; the slot `listen` filled in Turkish goes to an extra `translate` from English or a `wordbank`.
- **People in sentences**: a varied cast of Turkmen first names (Aýna, Merjen, Jeren, Maral, Aýgül, Bahar, Mähri, Selbi, Gülşat, Myrat, Batyr, Merdan, Döwran, Arslan, Kerim, Begenç, Atajan, Kakajan, Rahman, Dowlet), sometimes foreign visitors. No names of heads of state, past or present, and no real living people.
- **Places**: Turkmen towns and places (Aşgabat, Mary, Daşoguz, Türkmenabat, Balkanabat, Türkmenbaşy, Tejen, Baýramaly, the Kopetdag, the Garagum, the Amyderýa, the Hazar deňzi). Prices in manat.
- **Politics**: none. No current or former leaders, no state ideology, no praise or criticism of the government, no national-security topics. State holidays and symbols appear only as cultural facts (the flag's carpet göls, Neutrality Day, Nowruz). Religion only as neutral cultural fact.
- No stereotypes about regions, tribes, ethnic groups or genders. Tribal names (Teke, Ýomut, Ärsary, Salyr, Saryk) appear only for carpet designs and history.

### 7.6 Grammar guides

As turkish/PROJECT.md 7.6 (length, one section per grammar point in TM-CURRICULUM.md order, at least four examples with `seg`, pitfalls, a full `paradigm` for each new verb form, a summary). Guides explain Turkmen on its own terms, for a learner who knows no other Turkic language: from the sound and the meaning to the rule, with plenty of examples, and pitfalls that English speakers actually meet. Paradigms use the persons *men, sen, ol, biz, siz, olar*.

### 7.7 Interludes, history and copyright

As turkish/PROJECT.md 7.7 (lengths per level, factual and neutral, at least two reliable sources with URLs for history and archaeology, legends labelled as legends), with these rules:

- **Copyright.** Quote only traditional texts (folk tales, proverbs, *ertekiler*, songs of the oral epic) and authors who died before 1956 **and** published before 1931: Magtymguly Pyragy, Döwletmämmet Azady, Andalyp, Şabende, Mätäji, Seýdi, Zelili, Kemine, Mollanepes. Soviet and modern authors (for example Berdi Kerbabaýew) are described and summarized, never quoted. Translations are our own. Every `quote` block carries `source` and `pd: true`.
- **Sources** for Turkmenistan are thinner than for Turkey: prefer UNESCO, encyclopedias (Britannica, Encyclopaedia Iranica for history), museums and academic works; official Turkmen sources only for dates and names, never for claims of record or praise. Where accounts differ (Darvaza, dates of monuments), say so and attribute.
- No images except Grégoire's own photos in `/assets/img/`.

### 7.8 Flashcards

As turkish/PROJECT.md 7.8 (one card per lemma, examples ≤ 10 words in A1–A2 grammar, up to four glosses, notes for false friends and irregularities), except for the source of the order.

**The word list.** `scripts/turkmen/tm-wordlist.tsv` holds the 1,000 lemmas in deck order: UTF-8, LF line endings, a header row and one tab-separated row per rank with `rank`, `lemma`, `pos`, `sense` (empty or 1, 2), `gloss` (short, for reviewers) and `tr` (the Turkish lemma it was matched to, or `+` for an added word). The card of rank 42 is `fc-0042` and takes its `tk`, `pos` and `sense` from row 42; the validator checks every card against its row. FC-2 to FC-5 write ranks 201–1000 in this order. A wrong row (lemma, spelling, part of speech) is fixed with its card and logged; IDs never change.

**Source and method (TK-PLAN).** No Turkmen word-frequency list was reachable from the session that made the deck (the Leipzig Corpora Collection and Wikipedia dumps were blocked, and FrequencyWords has no Turkmen list), so the order is **adapted from the Daily Turkish deck**: each of the Turkish course's 1,000 ranked lemmas (`scripts/turkish/wordlist.tsv`, itself adapted from the 2018 Turkish list of FrequencyWords by Hermit Dave, CC BY-SA 4.0, built from OpenSubtitles2018) was matched by meaning to its usual Turkmen equivalent. Then, by hand: words of film dialogue that a Turkmen learner rarely needs were dropped or moved down (crime and dubbing words), several Turkish lemmas that share one Turkmen word were merged, Turkmen words with no Turkish counterpart in the list were added where their everyday frequency would put them (*oglan, haçan, çörek, oba, çöl, düýe, haly, telpek*, days of the week…), and a few were moved up for learners (*türkmen, dil, çaý, mugallym, talyp*, the colours). **Ranks are an editorial estimate, not a Turkmen corpus count**, and every `source` says so. Because the order derives from a CC BY-SA list, `tm-wordlist.tsv` is shared under CC BY-SA 4.0 with that credit (LICENSE.txt gets a line in TK-PUBLISH). Glosses, examples and notes are our own. If a Turkmen corpus becomes reachable later, a conversation may re-rank the list; card IDs stay.

**Part of speech decisions:** *bar* and *ýok* are adj (as in the Turkish deck); *ýok* also carries "no" as its second gloss; *däl* and *-mY* are particles (the card's `tk` is `-my`); quantifiers (*her, ähli, käbir, birnäçe*) are det; *bolýar* "OK" and *salam* are interj; phrase cards for fixed formulas (*sag bol, haýyş edýärin, hoş gal, hoş geldiňiz*); compound verbs as one lemma (*pikir etmek, dowam etmek, gowy görmek, satyn almak, jaň etmek, ýatdan çykarmak*); noun + *etmek* goes to the noun card when the noun stands alone (*kömek*).

**`unit` and `level`**, and the vocab links (`card`), follow turkish/PROJECT.md 7.8 ("unit, level and vocab links") unchanged: content batches set `unit` on the cards their lessons teach first and `card` on their vocab entries.

## 8. Validation

```
node scripts/turkmen/validate.mjs                    # validate everything; exit 1 on errors
node scripts/turkmen/validate.mjs --batch A1-1       # also report what batch A1-1 still lacks
node scripts/turkmen/validate.mjs --index            # validate, then rewrite assets/data/turkmen/index.json
node scripts/turkmen/validate.mjs --examples         # validate the JSON examples in this file
node scripts/turkmen/validate.mjs --vocab            # list the words taught so far, unit by unit
node scripts/turkmen/validate.mjs --progress f.json  # validate an exported progress file
   add --strict to turn warnings into errors, --quiet to hide warnings
node scripts/turkmen/test.mjs                        # test turkmen.js
node scripts/turkmen/morph-test.mjs                  # test turkmen-morph.js on known-correct forms
```

Same errors and warnings as turkish/PROJECT.md 8, with the Turkmen letter rules of 7.1 in place of the Turkish ones: errors for the Turkish-only letters (ı, ğ, İ, â, î, û), `listen` exercises, the word "Turkish" in lesson, guide, interlude or card text (a warning, so a writer checks that it is a brief factual remark in a guide or interlude, not a bridge from Turkish), a malformed `scripts/turkmen/tm-wordlist.tsv` or a card that differs from its row; warnings for a question particle written apart (*talyp my*), an apostrophe in Turkmen text, *y*/*ý* patterns that look wrong (a *ý* between two consonants, a *y* starting a word before a vowel), a future or necessitative sentence with no subject in an `accept[0]`. **Wrong options are exempt** (A1-1): spelling drills show misspellings on purpose (*yok*, *hava*, *neme*), so the wrong options of an `mcq` or of a cloze blank with options, and the distractors of a `wordbank`, are checked only for the Turkish-only letters (errors); the right option, the tiles of the answer and everything else get every check.

**The morphology engine** (section 3), as in turkish/PROJECT.md 8: for each `conjugate` exercise whose `form` it knows, the validator builds every cell's form from `base` and checks that the cell accepts it, and that everything the cell accepts is a form the engine builds (one of its variants, the ol form for olar, or a variant with words in front, as in *Men talyp*); a `base` with two readings (*at*) is checked with the reading that fits. For each `morph` exercise it checks that the tiles are `base` and its suffixes, cut at morpheme boundaries; if not, the warning gives the word the same suffixes build (*mekdepde*, not *mekdepda*) or the engine's cut (*öý\|ümiz*). For each flashcard it checks `forms` (`prs`, `past`, `aor`, `cvb`, `fut`, `acc`, `poss3`, `pl`) against the third-person forms the engine builds. A `form` slug it doesn't know, or tiles it can't analyse, are listed as not checked above the summary line, which counts what was checked. These are warnings, as in Turkish, while the engine meets new content. `morph-test.mjs` runs over 1,300 forms typed by hand: run it after any change to the engine. `--examples` validates the `json lesson`, `json block`, `json flashcards` and `json progress` examples of this file.

## 9. Workflow for a conversation

1. Read this file in full, the TM-CURRICULUM.md sections for your batch, the sections of turkish/PROJECT.md this file points to, and the progress log below. Once the validator exists, run `node scripts/turkmen/validate.mjs --vocab` to see which words have been taught.
2. Find the repo. On Grégoire's Mac it is `/Users/gregoire/Documents/GitHub/gregoire-maillard.github.io`; in a cloud session it is cloned in the container. In a cloud session, work on the branch `turkmen/<conversation-id>`, created from the latest branch that holds the previous Turkmen work (the log says which), and push it at the end.
3. For each unit, write the grammar guide first, then the lessons, then the interlude, then the unit file. Content batches never edit pages or code; build conversations never rewrite content except to fix bugs they find (logged).
4. Run `node scripts/turkmen/validate.mjs --batch <id>` until there are no errors, and fix the warnings or note why they stay. Build conversations also run `test.mjs`, and `morph-test.mjs` after any change to the engine. Give each `conjugate` exercise a `form` slug the engine knows (`TKMMorph.forms()`, section 3); if no slug fits, add the paradigm to the engine with tests, or name the gap in the log. When the engine disagrees with an exercise or a card, find out which is right: fix the content, or the engine's rules or word lists (`TKMMorph.LEX`) with a test in `morph-test.mjs`, and log it.
5. Run `node scripts/turkmen/validate.mjs --index`.
6. Re-read every file you wrote from disk.
7. List, in the log row, every Turkmen form or word you were not sure of and how you decided, so the native review (TK-REVIEW) knows where to look first.
8. Add one row to the progress log: date, conversation, what was written, validator result, open issues, and the branch it is on.
9. If the spec had to change, update the relevant section of this file and the validator together, run `--examples`, and say so in the log.

**Native review.** Turkmen is written here with AI assistance and checked against dictionaries where they can be reached; that is not enough to call it finished. After each level, a TK-REVIEW conversation exports the level's Turkmen text (sentences, accept lists, guide examples, card examples) into a review sheet for a native speaker, and a second TK-REVIEW conversation applies the corrections. The beta notice stays until a level is reviewed. The log records who reviewed what (initials only).

Definition of done for a content batch: as in Turkish (every unit complete, `--batch` reports it complete, zero errors, `index.json` regenerated, files re-read, log updated), plus the list of uncertain forms in the log row.

## 10. Progress log

One row per conversation, newest at the bottom.

| Date | Conversation | What was written | Checks | Open issues and branch |
|---|---|---|---|---|
| 2026-10-30 | TK-PLAN | **The plan, asked by Grégoire**: a Turkmen sister of Daily Turkish, A1–B1 first, served at `dailyturkish.app/turkmen/`, no audio, interludes and references about Turkmenistan. New `turkmen/TM-CURRICULUM.md` (36 units, 149 grammar points, 13 content batches, interlude list, open questions), this file, `turkmen/TM-PROMPTS.md` (a prompt per conversation), `scripts/turkmen/tm-wordlist.tsv` (1,000 ranked lemmas adapted from the Turkish deck, 7.8) and FC-1, `assets/data/turkmen/flashcards/tm-fc-0001-0200.json` (200 cards with glosses, examples, forms and notes). No code, no pages. | No validator yet: a throwaway script checked the cards' shape, that every card matches its word-list row, the Turkmen letter set, no apostrophes, and that each example contains its word or a form of it. | Every Turkmen form in the cards and the curriculum is AI-written and needs native review, first of all the eight open questions at the end of TM-CURRICULUM.md, the verb forms on the cards (`prs`, `aor`, `cvb` of the t-stems and e-stems) and the example sentences. Push from the cloud session was refused (GitHub App access): branch `claude/turkmen-curriculum`, delivered to Grégoire as a patch if the push stays blocked. |
| 2026-10-30 | TK-PLAN (follow-up) | **No Turkish in the course, asked by Grégoire**: Daily Turkmen is for English speakers learning Turkmen from scratch, not a comparison with Turkish. Added the principle to section 1; removed the `compare` callouts with Turkish, the `~…~` Turkish markup, the Turkish-habit answer folds and the Turkish mentions in four FC-1 card notes; the b1-u11 interlude becomes **The Turkmen language**; the prompts updated to match. TM-CURRICULUM.md keeps a notes-for-writers section on where the Turkish course's habits don't apply, never shown to learners. | Throwaway checker: FC-1 still clean. | Branch `turkmen/no-turkish-comparison`. |
| 2026-10-30 | TK-PLAN (follow-up 2) | **Scope of the no-comparison rule, clarified by Grégoire**: explanations never compare with Turkish, but the course's structure and formatting follow Daily Turkish openly, the pages may present it as its sister, and writer-facing notes compare freely. Section 1 split into those two rules; the validator warning narrowed to content text. Then refined: a brief factual remark that Turkmen is like Turkish ("Turkmen sentence structure works like Turkish") is allowed in a guide or interlude, but lessons are never built as a bridge from Turkish. | — | Branch `turkmen/comparison-scope`. |
| 2026-10-30 | TK-BUILD-1 | **Validator, tests and core script.** New `scripts/turkmen/validate.mjs`, a fork of the Turkish validator: the renames of 5.0, levels A1–B1, `listen` rejected, no Turkish markup (and the word "Turkish" in learner-facing English text warned about, the deck's CC BY-SA credit line excepted), the Turkmen letter rules of 7.1 and the warnings of 8, the six-column `tm-wordlist.tsv` with `sense`; morphology checks off ("engine not loaded"). New `assets/js/turkmen.js` (`window.TKM`): keys `tkm:v1:…`, directions `tk-en`/`en-tk`, no speech, page links relative to `/turkmen/`, the checker of 6.4 with the notes `apostrophe`, `Turkmen letters` and `particle`, export `app: "daily-turkmen"` with a Daily Turkish file refused. New `scripts/turkmen/test.mjs` (83 tests), `scripts/turkmen/README.md`, `assets/data/turkmen/levels/a1.json`, `a2.json`, `b1.json` and the generated `index.json` (36 planned units, 200 cards). Turkish course: one line in `assets/js/turkish.js` so its import refuses a Daily Turkmen file. Spec changes: the 5.1 lesson example gets six exercises (it had none, which the schema forbids), the callout example is tagged `json block` so `--examples` checks it, a `json progress` example in 5.9, details in 6.4 (modes, apostrophe, notes, nothing else folded) and 6.7 (the TKM renames), and in 8 the y-after-vowel warning, the subject check's limits and the engine note. Started from the prompt as it was before the TK-PLAN follow-up; rebased onto it, so the `~…~` markup and the Turkish-habit folds first written here were taken out again. | `validate.mjs`: 0 errors, 0 warnings (FC-1 and the word list pass). `--examples`: 4 examples pass. `--index`: written. `test.mjs`: 83/83, and the date tests pass in 2 other time zones. Turkish `validate.mjs`: all checks pass; Turkish `test.mjs`: 72/72. The new checks were tried on broken copies of the data (listen, ı, v, apostrophe, *talyp my*, *öy*, *yaşyl*, *Ertir geljek*, a missing `cvb`, a card that differs from its row, a duplicated lemma without `sense`, "Turkish" in a note and a gloss): each is reported. | Turkmen written here, for the native review: the 32 achievement names in `turkmen.js` (*Ilkinji ädim, On sapak, Ýalňyşsyz, Kämil, Gaýtadan, Ilkinji bölüm, Altyn bölüm, Altyn diwar, Düzediş, Maksat, Erjellik, Wepaly, Zähmetsöýer, Güýçli ýat, Uzak ýol, Kitapsöýer, Syýahatçy*; the streak ranks *Şägirt, Ussa, Halypa, Uly halypa* follow the master–apprentice pair *halypa–şägirt*), chosen as plain words, not checked in a dictionary; the 5.1 example exercises (*mekdepde, mekdebe* "to school", *otagda, Men öýde* for "I am at home", *Mugallym mekdepde*); the level summaries. Checker choices to confirm: ý typed for y is "almost" like y for ý (both fold to y); the particle typed apart is "almost" even in strict mode. The subject check of 8 is a heuristic (a noun subject such as *kakam* isn't seen, so it can warn wrongly). Merging also triggers the dailyturkish.app sync, because `assets/js/turkish.js` changed. Branch `turkmen/tk-build-1`. |
| 2026-10-30 | TK-MORPH | **Morphology engine, asked by Grégoire.** New `assets/js/turkmen-morph.js` (689 lines, no dependencies; `window.TKMMorph`, also `TKM.morph` after `turkmen.js`, `require()` in Node; no page loads it yet), section 3: front/back harmony with A, Y and Ä (*gelýär*, *kiçiräk*), the rounding rule (second syllable after a rounded first syllable unless the vowel ends the word: *gözüm, öýüne, boldum, gowurak*, but *gözi, boldy*; y/i from the third: *öýümiz, bolupdyr*), voicing of nouns (k, p, ç by rule, t from a list, long-vowel monosyllables and the homographs *at*, *ot* by sense), the closed list of t → d verbs, vowel loss, the dative fused with a final vowel, -ny and -nyň, the pronominal n, the pronouns written out, e → ä in nouns and verbs, possessives, plural, -dAky and -kY, ordinals and the A2 word-building suffixes, "to be" (endings, zero, -dYr, *däl*, *bar*/*ýok*, past -dY, -mY attached), and the verb forms -ýAr, -dY, -jAk, -Ar/-mAr/-mAz, -mAlY, -(Y)p, -(Y)p bilmek (three tenses), the imperatives and optatives, -sYn, -(Y)p *otyr/dur/ýatyr/ýör*, -(Y)pdYr (ol, olar); 104 slug names (`TKMMorph.forms()`), `decline`, `conjugate`, `copula`, `converb`, `build`, `analyze` for morph tiles, `readings` for homographs. New `scripts/turkmen/morph-test.mjs`: 1,328 forms typed by hand (the five cases of 40 nouns, possessive paradigms, pronouns, -kY, ordinals, the copula, every A1–A2 verb form with negative and question, the ten t → d verbs beside 14 that keep their consonant, the 56 verbs and 5 nouns of FC-1 typed again) and 53 other checks. **validate.mjs**: conjugate cells, morph tiles and flashcard `forms` checked against the engine as warnings, as in Turkish (a homograph base is checked under the reading that fits); unknown slugs listed as not checked; the summary line counts what was checked. **Open questions 1–5** answered in TM-CURRICULUM.md with what each rests on, and a new item 9 for the points the engine accepts two ways; "Notes for writers" and the suffix notation updated. **FC-1** (prs, past, aor, cvb, acc): no disagreement, 229 forms on 61 cards; after question 5, fc-0084 (example and note) and fc-0132 (example) now write *ejäm, ejäň* for *ejem, ejeň*, and two grammar-point labels in TM-CURRICULUM.md likewise (*ejäň*, *ejäm bilen*; index.json regenerated). Spec: section 3 (engine subsection), 5.8, 7.1 (TK-MORPH reached no dictionary for *şu gün*, *hiç kim*, *her kim*; left to A1-1), 8, 9 step 4; `scripts/turkmen/README.md`. TK-BUILD-1's log row, lost when its branch was merged with main (merge 056eb2c), restored above from commit 4d3c444. | `morph-test.mjs`: 1,328 forms and 53 checks, all pass. `validate.mjs --strict`: all pass, 0 warnings; the engine checks 229 forms on 61 cards (no lessons yet, so 0 conjugate and 0 morph exercises). `--examples`: pass. `--index`: rewritten for the two labels. `test.mjs`: 83/83, date tests also pass in 2 other time zones. Turkish course unchanged: `morph-test.mjs` 1,196/1,196, `test.mjs` 72/72, `validate.mjs` passes. Negative tests on a scratch copy: three corrupted card forms (*gitýär*, *görip*, *aty* for "name"), a conjugate cell accepting *gelýersiň*, an unknown slug, tiles *mekdep\|da* and *öý\|üm\|iz*: all reported; an *at* paradigm with *adym* passed under the "name" reading, and tiles *Mar\|a* passed. | **Sources**: only web search worked (its results are summaries of pages); tk.wikipedia.org and en.wikipedia.org were outside the session's network allowlist, azathabar.com, turkmenportal.com and metbugat.gov.tm were refused by the proxy, and no online copy of the orthographic or explanatory dictionary or of Clark's grammar was found. Reached through search: English Wiktionary's Turkmen entries, the webonary.org SIL Turkmen–English dictionary's grammar pages, Ankara University's *Türkmen Türkçesi* course, Omniglot, and Turkmen text on mejlis.gov.tm, iirmfa.edu.tm and hrw.org (details in TM-CURRICULUM.md). **Settled**: rounding (q1) and e → ä (q5) except the points below. **Not settled, both accepted by the engine**: the copula endings (q2: *talybyn* and *talyp*; zero first after a vowel, *öýde*); the negative general present (q3: *gelmerin, gelmersiň, gelmez, gelmeris, gelmersiňiz, gelmezler*, kept as planned, no source showed it); the t → d list (q4, kept as planned); and item 9. **For the native review first**: *ejäm* against *ejem* (FC-1 changed to *ejäm*); *boldular, gördüler, bolduňyz*; *boldumy* or *boldymy*; *stoluň* or *stolyň*; *gelýärsiňmi* or *gelýärmiň*, *gelersiňmi* or *gelermiň*; *Men talybyn*, *Men öýde*, *talypmyň*; the negative optative (*gelmäýin, gelmäli*; *bolmaly* is spelt like the necessitative); *gitjek*, *etjek*; *sagady* or *sagaty*; cases after -kY (*öýdäkini*). For content batches: give each `conjugate` exercise a slug from `TKMMorph.forms()`. Branch `turkmen/tk-morph`, pull request into main (the first push was refused until the repository was attached to the session). |
| 2026-10-31 | A1-1 | **Units a1-u01, a1-u02, a1-u03, the first Turkmen content.** 3 unit files, 12 lessons (154 exercises: 55 translate, 46 mcq, 19 cloze, 15 wordbank, 10 match, 7 morph, 2 conjugate; no listening), 3 grammar guides and 3 interludes (*Three alphabets in one century*, *The Akhal-Teke horse*, *Turkmen names*). a1-u01 teaches the alphabet with English comparisons only and drills reading and spelling: y against ý, e against ä, ň, ş, ç and j, w for v, long vowels (*at*, *adym*). 91 vocab entries; `card` on 32 of them, and `unit` and `level` on those 32 FC-1 cards (*şol* and *gamgyn* move from a2 to a1). **Open question 2 settled** (TM-CURRICULUM.md): the zero form first in every person, with the subject said (*Men talyp*); -dYr in the third person as the careful style; -dYr with the personal endings as the formal written form, recognized and accepted (*talypdyryn*; *minnetdardyryn*, *minnetdardyrys* in print); the bare endings (*talybyn*) neither taught nor accepted, since no source shows them. **Engine** (`turkmen-morph.js`): the present copula gives the zero form first, then -dYr with the ending, then the bare ending (none after a vowel in the first persons: no *öýden*, *öýdes*); the question gives *talypmy?* first; `copula-dyr` now has every person in the positive (negative and question stay ol and olar). `morph-test.mjs`: the copula tests rewritten, 1,374 forms and 54 checks. **Validator and spec** (a rule wrong for Turkmen): spelling drills misspell their wrong options on purpose, so the wrong options of an `mcq` or a cloze blank and the `wordbank` distractors are now checked only for the Turkish-only letters (TM-PROJECT.md 8, `scripts/turkmen/README.md`). **7.1 settled**: *şu gün*, *hiç kim*, *her bir* written apart in the explanatory dictionary's own entries and examples (enedilim.com, through search); *her kim* apart by the same pattern. TM-PROJECT.md 3 (copula forms and slugs), 7.1, 8; TM-CURRICULUM.md notes for writers, questions 1 (an *uludyr*/*ulydyr* note) and 2. | `validate.mjs --batch A1-1`: the three units complete, 0 errors, 0 warnings (`--strict` passes); the engine checks 12 cells of 2 conjugate exercises and 7 morph exercises, no disagreement. `--examples`: pass. `--index`: rewritten. `test.mjs`: 83/83 (every accept and reject of the new content checked), date tests pass in 2 other time zones. `morph-test.mjs`: all pass. Turkish course untouched: `validate.mjs` passes, `test.mjs` 72/72. Every file re-read from disk. | **Sources**: only web search worked; fetching failed for en.wikipedia.org, britannica.com, tm.usembassy.gov and enedilim.com (not in the session's network allowlist), so every interlude URL was confirmed as a live search result, not opened. Interlude facts rest on what search reported from those pages; the Akhal-Teke's 1935 distance and the 1927/1928 date of the first Latin alphabet differ between sources and are attributed. **Turkmen I was not sure of, for the native review (TK-REVIEW looks here first)**: *Ýagdaýlaryň nähili?* and *Ýagdaýlaryňyz nähili?* (webonary has the first), *Özüň nähili?* and *Özüňiz nähili?* (Omniglot has the first), *sag boluň*, *hoş galyň*, *Ak ýol!* as the reply of the one who stays, *bagyşla* beside *bagyşlaň*, *Hawa, haýyş edýärin* for “yes, please” and *Bir çaý, haýyş edýärin*, *tanyşanyma şat* (one travel guide; DLIFLC has *Siziň bilen tanyşanym üçin örän şat*), *hoş geldiň*, *erbet däl*, *Adym Aýna* without *meniň*, *Adyňyz näme?*; the pronunciation notes of a1-u01 (s and z as th, k and g further back beside back vowels, g between back vowels close to a French r in *aga*, w after a vowel as in “now”, final stress); words: *ruçka*, *depder*, *oturgyç*, *sumka*, *kagyz*, *sözlük*, *surat*, *reňk*, *harp*, *söz*, *mekdep*, *gök* (blue; green in *gök çaý*), *sary* for a golden horse, *bedew*, *ýaryş*, *elipbiý*, *ýazuw*, *kiril*, *latyn*, *arap*, *familiýa*, *nemes*, *fransuz*, *özbek*, *gazak*, *Russiýa*, *Angliýa*, *Germaniýa*, *Fransiýa*, *Özbegistan*, and in the a1-u01 guide *jaý*, *teňňe*, *telewizor*, *kompýuter*, *žurnal*, *futbol*; plural predicate nouns (*Bular kitaplar*, *Olar ruçkalar*, *Olar okuwçylar* beside *Olar okuwçy*, *Bular harplar*) and the singular after *biz* (*Biz talyp*, *Biz lukman*, *Biz aç*; *Biz talyplar* not accepted); *şolar*; *bir* with an adjective (*Bu bir köne kitap*, *Ol bir kiçi öý*); no *bir* with jobs (*Men mugallym*); -dYr forms (*mugallymdyr, keseldir, bagtlydyr, okuwçydyr, sürüjidir, nemesdir, täzedir, lukmandyrlar, Türkmenabatlydyr*) and the formal ones not seen in print (*talypdyrsyň, talypdyrsyňyz, ýadawdyrsyň, ýadawdyrsyňyz, açdyrys, lukmandyrys, türkmendirsiň, türkmendirsiňiz*); -lY on towns and its capital (*Aşgabatly, Maryly, Daşoguzly, Tejenli, Balkanabatly, Türkmenabatly*, kept capitalized as in this file and the curriculum); *nireli*, *Siz nireli?*; *aga* and *daýza* after a name as respectful address, and *-jan* (*Aýnajan*), from the dictionary meanings and the word list, not seen described in a source; the names interlude's meanings (*Myrat* wish, *Begenç* joy, *Batyr*, *Aýgül*), *Durdy* from *durmak*, *-ýew* after a vowel (*Durdyýew*). Open for A1-2: the engine's question order (*talypmy?* first) and the copula with *däl* in every person. Branch `turkmen/a1-1`. |
