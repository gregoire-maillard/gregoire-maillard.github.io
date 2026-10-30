# Turkmen A1 → B1 · Project spec

The rules for the Turkmen course (working name **Daily Turkmen**), a sister of the Turkish course and built from its code. Every conversation that works on it reads this file in full first, then the parts of [TM-CURRICULUM.md](TM-CURRICULUM.md) it needs, then the sections of [turkish/PROJECT.md](../turkish/PROJECT.md) this file points to, and finishes by adding a line to the progress log at the bottom. [TM-PROMPTS.md](TM-PROMPTS.md) has the opening prompt of each conversation.

**How this file relates to the Turkish spec.** The Turkmen course reuses the Turkish course's design: the same pages, data schemas, exercise types, answer checker, SRS scheduler, progress store and validator, forked into Turkmen files. Where this file says nothing, the Turkish spec applies **with the renames of section 5.0**. Where they differ, this file wins. When the Turkish spec changes later, the Turkmen course does not follow automatically: a conversation that wants a Turkish improvement ports it and logs it here.

**Contents:** 1 Goals · 2 Fixed decisions · 3 Files and pages · 4 IDs · 5 Data schemas · 6 Runtime behaviour · 7 Content style rules · 8 Validation · 9 Workflow for a conversation · 10 Progress log

## 1. Goals

- A Turkmen course from A1 to B1 for English speakers, in the spirit of Daily Turkish: a path of units and short lessons, many small exercises, immediate feedback, XP and a streak.
- **For English speakers starting from zero.** No knowledge of Turkish (or any other Turkic language) is assumed, and nothing is taught by comparison with Turkish. Learner-facing content (lessons, hints, explanations, guides, interludes, flashcards, page text) never mentions Turkish words or Turkish grammar; it explains Turkmen on its own terms, in English. The Turkish course is the model for the design, the code and the workflow only.
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

Verbs give `forms.prs` (-ýAr), `forms.past` (-dY), `forms.aor` (-Ar) and `forms.cvb` (-(Y)p); `fut` (-jAk) only when it isn't regular. Nouns whose stem changes before a vowel give `forms.acc` (*kitap → kitaby*, *at* "name" → *ady*, *ogul → ogly*).

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
- **Written attached**: the question particle -mY (*talypmy?*, *gelýärsiňmi?*, *dälmi?*); the locative-adjective -dAky (*öýdäki*); -ky (*meniňki*). **Written apart**: *bilen*, *üçin*, *ýaly*, *däl*, *hem*, *bar*, *ýok*, *eken*, the helper verbs (*okap otyr*, *gelip bilýärin*). Hyphenated: *ýa-da*, *şeýle-de bolsa*, reduplications (*ap-ak*, *ýuwaş-ýuwaş*). TK-MORPH and A1-1 check the remaining cases (*şu gün*, *hiç kim*, *her kim*) and record them here.
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

Same errors and warnings as turkish/PROJECT.md 8, with the Turkmen letter rules of 7.1 in place of the Turkish ones: errors for the Turkish-only letters (ı, ğ, İ, â, î, û), `listen` exercises, the word "Turkish" in learner-facing text (a warning, so a writer checks it), a malformed `scripts/turkmen/tm-wordlist.tsv` or a card that differs from its row; warnings for a question particle written apart (*talyp my*), an apostrophe in Turkmen text, other non-Turkmen letters (c, q, v, x…), *y*/*ý* patterns that look wrong (a *ý* between two consonants, a *y* starting a word before a vowel, a *y* right after a vowel as in *ay* for *aý*), a future or necessitative sentence with no subject in an `accept[0]` (a rough check: a clause ending in -jAk or -mAlY needs a pronoun, a name of the cast of 7.5 or a capitalized word; a noun subject such as *kakam* is not seen).

The morphology checks of turkish/PROJECT.md 8 (conjugate cells and morph tiles against the engine) are off until TK-MORPH hooks `turkmen-morph.js` into the validator; the summary line says "morphology engine not loaded" and counts the exercises not checked. `--examples` validates the `json lesson`, `json block`, `json flashcards` and `json progress` examples of this file.

## 9. Workflow for a conversation

1. Read this file in full, the TM-CURRICULUM.md sections for your batch, the sections of turkish/PROJECT.md this file points to, and the progress log below. Once the validator exists, run `node scripts/turkmen/validate.mjs --vocab` to see which words have been taught.
2. Find the repo. On Grégoire's Mac it is `/Users/gregoire/Documents/GitHub/gregoire-maillard.github.io`; in a cloud session it is cloned in the container. In a cloud session, work on the branch `turkmen/<conversation-id>`, created from the latest branch that holds the previous Turkmen work (the log says which), and push it at the end.
3. For each unit, write the grammar guide first, then the lessons, then the interlude, then the unit file. Content batches never edit pages or code; build conversations never rewrite content except to fix bugs they find (logged).
4. Run `node scripts/turkmen/validate.mjs --batch <id>` until there are no errors, and fix the warnings or note why they stay. Build conversations also run `test.mjs`, and `morph-test.mjs` after any change to the engine. Give each `conjugate` exercise a `form` slug the engine knows.
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
| 2026-10-30 | TK-BUILD-1 | **Validator, tests and core script.** New `scripts/turkmen/validate.mjs`, a fork of the Turkish validator: the renames of 5.0, levels A1–B1, `listen` rejected, no Turkish markup (and the word "Turkish" in learner-facing English text warned about, the deck's CC BY-SA credit line excepted), the Turkmen letter rules of 7.1 and the warnings of 8, the six-column `tm-wordlist.tsv` with `sense`; morphology checks off ("engine not loaded"). New `assets/js/turkmen.js` (`window.TKM`): keys `tkm:v1:…`, directions `tk-en`/`en-tk`, no speech, page links relative to `/turkmen/`, the checker of 6.4 with the notes `apostrophe`, `Turkmen letters` and `particle`, export `app: "daily-turkmen"` with a Daily Turkish file refused. New `scripts/turkmen/test.mjs` (83 tests), `scripts/turkmen/README.md`, `assets/data/turkmen/levels/a1.json`, `a2.json`, `b1.json` and the generated `index.json` (36 planned units, 200 cards). Turkish course: one line in `assets/js/turkish.js` so its import refuses a Daily Turkmen file. Spec changes: the 5.1 lesson example gets six exercises (it had none, which the schema forbids), the callout example is tagged `json block` so `--examples` checks it, a `json progress` example in 5.9, details in 6.4 (modes, apostrophe, notes, nothing else folded) and 6.7 (the TKM renames), and in 8 the y-after-vowel warning, the subject check's limits and the engine note. Started from the prompt as it was before the TK-PLAN follow-up; rebased onto it, so the `~…~` markup and the Turkish-habit folds first written here were taken out again. | `validate.mjs`: 0 errors, 0 warnings (FC-1 and the word list pass). `--examples`: 4 examples pass. `--index`: written. `test.mjs`: 83/83, and the date tests pass in 2 other time zones. Turkish `validate.mjs`: all checks pass; Turkish `test.mjs`: 72/72. The new checks were tried on broken copies of the data (listen, ı, v, apostrophe, *talyp my*, *öy*, *yaşyl*, *Ertir geljek*, a missing `cvb`, a card that differs from its row, a duplicated lemma without `sense`, "Turkish" in a note and a gloss): each is reported. | Turkmen written here, for the native review: the 32 achievement names in `turkmen.js` (*Ilkinji ädim, On sapak, Ýalňyşsyz, Kämil, Gaýtadan, Ilkinji bölüm, Altyn bölüm, Altyn diwar, Düzediş, Maksat, Erjellik, Wepaly, Zähmetsöýer, Güýçli ýat, Uzak ýol, Kitapsöýer, Syýahatçy*; the streak ranks *Şägirt, Ussa, Halypa, Uly halypa* follow the master–apprentice pair *halypa–şägirt*), chosen as plain words, not checked in a dictionary; the 5.1 example exercises (*mekdepde, mekdebe* "to school", *otagda, Men öýde* for "I am at home", *Mugallym mekdepde*); the level summaries. Checker choices to confirm: ý typed for y is "almost" like y for ý (both fold to y); the particle typed apart is "almost" even in strict mode. The subject check of 8 is a heuristic (a noun subject such as *kakam* isn't seen, so it can warn wrongly). Merging also triggers the dailyturkish.app sync, because `assets/js/turkish.js` changed. Branch `turkmen/tk-build-1`. |
