# Turkmen course (Daily Turkmen) — validator and tests

`validate.mjs` checks the content of the Turkmen course (`assets/data/turkmen/`, the French tree `fr/` and the strings `i18n/` apart: see "The French edition" below) against the schemas of `turkish/PROJECT.md` section 5 with the renames of `turkmen/TM-PROJECT.md` 5.0, and against the registry of units, grammar points and batches in `turkmen/TM-CURRICULUM.md`. It also generates `assets/data/turkmen/index.json`, the manifest the hub reads. It is a fork of `scripts/turkish/validate.mjs` (TK-BUILD-1) and loads nothing from the Turkish course. Node 18 or later, no dependencies. Run it from the repo root:

```
node scripts/turkmen/validate.mjs                    # validate everything; exit 1 on errors
node scripts/turkmen/validate.mjs --batch A1-1       # also report what batch A1-1 still lacks
node scripts/turkmen/validate.mjs --index            # validate, then rewrite assets/data/turkmen/index.json
node scripts/turkmen/validate.mjs --examples         # validate the JSON examples in turkmen/TM-PROJECT.md
node scripts/turkmen/validate.mjs --vocab            # list the words taught so far, unit by unit
node scripts/turkmen/validate.mjs --progress f.json  # validate a progress file exported from the course
node scripts/turkmen/validate.mjs --lang fr          # the French edition instead (below); --lang all for both
   add --strict to turn warnings into errors, --quiet to hide warnings
```

What it checks, as the Turkish validator does, with these Turkmen rules:

- **Structure**: every file against its schema (unknown fields are errors), with the Turkmen field names: `tk` for `tr`, `titleTk`, `optionsLang` and `from` `"tk"`, the persons *men, sen, ol, biz, siz, olar*, table columns `"tk"`, culture formats `en` and `parallel`, flashcard `forms` `acc, poss3, pl, prs, past, fut, aor, cvb`; levels A1, A2 and B1 only. A `listen` exercise is an error: the course has no audio.
- **Registry**: units, titles, Turkmen taglines and grammar-point lists equal to TM-CURRICULUM.md; grammar points never used before the unit that introduces them; one guide section per grammar point, in order; the batch table and the units' `Batch:` lines agree.
- **Answers**: the `[a|b]`, `(a)` syntax of accepted answers, the plain canonical `accept[0]`, duplicates, rejected answers that are also accepted (or that differ from an accepted one only by the marks the checker folds), `cloze` blanks, `wordbank` tiles, `morph` parts, `match` pairs. A warning when the canonical Turkmen answer has a clause in -jAk or -mAlY with no subject (TM-PROJECT.md 7.3), and when an English entry writes *'d* (write **had** or **would**; the checker tries both for a learner's *'d*).
- **Turkmen text** (TM-PROJECT.md 7.1): NFC, no combining marks; **errors** for ı, ğ, İ, â, î, û, which are not Turkmen letters; **warnings** for other non-Turkmen letters (c, q, v, x…, with a hint for c and v), any apostrophe, the question particle written apart (*talyp my*), *y* and *ý* that look swapped (*ý* between two consonants, *y* before a vowel at the start of a word, *y* right after a vowel), and sentences that start in lowercase. The wrong options of an `mcq` or a cloze blank and the distractors of a `wordbank` are checked only for the Turkish-only letters, since spelling drills misspell them on purpose (*yok*, *hava*). Options follow `optionsLang`: Turkmen options as plain Turkmen, English options as Rich (they render as Rich), with a warning for a link in one. Markup (`*`, `` ` ``, `[label](ref)`) in a plain-text field, which the pages would show as typed, is a warning: `Tk`, `En`, accept and reject lists, tiles, `tk` and `en` table cells, a `parallel` block's `en`, a card's glosses (QA-TK-2, from Daily Turkish's QA-2).
- **Markup**: `*…*` is Turkmen (checked as such); `**…**`, `` `…` `` and `[label](ref)` as in the Turkish course. There is no markup for Turkish words: the course is for English speakers starting from zero and never compares Turkmen with Turkish, so the word "Turkish" in learner-facing English text is a warning for the writer to check (TM-PROJECT.md 1 and 8).
- **Targets** (warnings): lesson sizes and exercise mixes (four types, translation in both directions), guide and interlude lengths, interlude sources, flashcard examples that don't contain their word or one of its forms, a flashcard `level` that differs from its unit's level, a lesson vocab `card` link to a card with no `unit` or with a later `unit` than the lesson's (QA-TK-1), internal IDs in learner-facing text, `wordbank` alternatives without final punctuation.
- **Flashcards**: verbs as infinitives in -mak/-mek with `forms.prs`, `past`, `aor` and `cvb`; files named `tm-fc-NNNN-NNNN.json` after their rank range.
- **index.json**: up to date with the content (rewrite it with `--index`, which refuses while there are errors). Units without a unit file are `planned`.
- **Morphology** (warnings, as in the Turkish course): every `conjugate` cell against the paradigm `assets/js/turkmen-morph.js` builds for its `form` slug (the cell must accept the engine's form, and accept nothing the engine doesn't build), every `morph` exercise's tiles against the base and its suffixes cut at morpheme boundaries, and every flashcard's `forms` (`prs`, `past`, `aor`, `cvb`, `fut`, `acc`, `poss3`, `pl`) against the third-person forms the engine builds, with the card's `sense` for a homograph (*at* "name" → *ady*). Unknown slugs and tiles the engine can't analyse are listed as not checked; the summary line counts what was checked. They stay warnings after QA-TK-2, which found that the engine QA-TK-1 left disagreed 27 times with the content written after it, each time because the engine was wrong (TM-PROJECT.md 8); `--strict` makes them errors.
- **Word list**: `tm-wordlist.tsv` well formed (below), and every flashcard's `tk`, `pos` and `sense` equal to its rank's row.
- **Progress files** (`--progress`): the export format of TM-PROJECT.md 5.9 (`app: "daily-turkmen"`, card keys `fc-0042:tk-en` and `fc-0042:en-tk`, and `fc-0042:tk-fr`, `fc-0042:fr-tk` of the French edition; settings without speech, `directions` holding one to four of them, TM-FR.md 8.3). A Daily Turkish file is refused with its own message.

## The French edition (FR-BUILD-1, `turkmen/TM-FR.md`)

The French edition reads the same Turkmen course for French speakers: its content is the French tree `assets/data/turkmen/fr/` (the English file names, with `fr` where the English says `en`: TM-FR.md 5.2), and its interface strings are `assets/data/turkmen/i18n/fr.json`. Without `--lang`, the validator checks the English edition only, as before; `--lang fr` checks the French one (and loads the English files it is compared with, reporting their errors on one line), `--lang all` both:

```
node scripts/turkmen/validate.mjs --lang fr                 # the French tree, its parity with the English, fr.json; exit 1 on errors
node scripts/turkmen/validate.mjs --lang fr --batch FR-A1-1 # what the batch's units still lack in French (A1-1 works too)
node scripts/turkmen/validate.mjs --lang fr --index         # validate, then rewrite assets/data/turkmen/fr/index.json
node scripts/turkmen/validate.mjs --lang fr --vocab         # the French glosses of each lesson's words, against their cards'
node scripts/turkmen/validate.mjs --lang fr --sync          # copy every Turkmen field of the English files into the French ones
node scripts/turkmen/validate.mjs --lang fr --fix           # French typography in the French files and fr.json
node scripts/turkmen/validate.mjs --lang fr --progress f.json  # a progress file, and the French counts
```

Every `--lang fr` run ends with the translation count, *French: 3 of 36 units translated, 200 of 1,000 cards; interface strings: 1,042 of 1,042*. `--batch` takes the English batch IDs (`A1-1` … `B1-5`, `FC-1` … `FC-5`) and the names of TM-FR-PROMPTS.md (`FR-A1-2` is `A1-2`; `FR-FC-1` is `FC-1` to `FC-3`, `FR-FC-2` is `FC-4` and `FC-5`).

- **Schema**: every French file against the same schemas, with `fr` for `en` (`Gloss`, `examples`, `paradigm`, `dialogue`, `parallel`, `quote`, `context`, `cloze`, `vocab`, card glosses and examples) and `"fr"` for the value `"en"` (`from`, `optionsLang`, `modelsLang`, `sourceLang`, table `cols`, culture `format`): an English file copied into `fr/` fails until every field is rewritten. A French `seoTitle` contains « turkmène », 10–48 characters.
- **Parity** (errors, TM-FR.md 10.2): every French file has its English file; a French unit, once its unit file exists, has its lessons, guide and interlude in French; the same IDs in the same order (a level's units, a lesson's points, vocabulary and exercises, a guide's sections, a file's cards); each exercise's `type`, `from` and `optionsLang` side, number of options, `answer`, `diacritics`, blanks and cells; every Turkmen field identical after NFC (prompts, accept and reject lists on the Turkmen side, options, tiles, `tk` of words, examples, dialogues, passages, quotes, the Turkmen columns of tables, card forms); the Turkmen-bearing blocks of guides and interludes (`examples`, `paradigm`, `dialogue`, `parallel`, `passage`, `quote`, a table with a `tk` or `seg` column) in their section and in the English order, while prose blocks are free; level, unit and interlude titles equal to TM-FR.md 13; every English source URL kept; French options, glosses and match answers all different; French accept lists (`expand`, `accept[0]` plain, a rejected answer also accepted) under the French checker, which takes an article left out or added, so an entry that differs from another only by that is a warning.
- **Warnings** (10.3): a French field equal to its English one (more than three words, not a name) or with English words (*the, and, of, with, you…*); a `*…*` span with Turkmen that the English edition doesn't have and the engine doesn't build from a deck word; French typography (11.3: `'`, `"`, `...`, no narrow no-break space before `; ! ?`, no no-break space before `:`, « » without U+202F inside, *oe* for *œ*, *1,000* for *1 000*); « turc » in learner text; two cards with the same first French gloss; with `--vocab`, a lesson gloss that isn't among its card's.
- **Interface strings**: `fr.json` has every key of `en.json` (a missing one shows the English string on French pages, and is an error), `_live` true or false (TM-FR.md 3.4), the same placeholders (French may use `{H}` where English shows `{h}`: the code passes both), `one` and `other` for every count (French may make a count of an English string), the same markup in `.html` keys (`lang="fr"` for `lang="en"`), none in the others, and French typography.
- **`fr/index.json`**: the English shape (TM-FR.md 5.1) with the French titles of TM-FR.md 13; a unit is `ready` once its French unit file exists; grammar points of units not in French have `ready: false` and the label « Bientôt disponible »; `flashcards.files` lists the French card files. Rewrite it with `--lang fr --index` after any French file changes.
- **`--sync`** copies each Turkmen field of an English file into its French file by its path (blocks by their order within a section) and lists what it can't place; it never touches French. **Rule for every conversation that changes Turkmen in the English content**: run `--lang fr --sync`, then `--lang fr` (TM-PROJECT.md 9). **`--fix`** rewrites the French text (outside `*…*`, code, markup and placeholders) and `fr.json` with French typography: ’, … , U+202F before `; ! ?` and inside « », U+00A0 before `:`, *œ*, thousands with U+202F. Both write files; run `--lang fr` afterwards.

The French checker (TM-FR.md 7.2) and the validator's copy of it are in the region of `validate.mjs` that `test.mjs` compares with `turkmen.js` (`norm(s, "fr")`, `frAccents`, `frNoNe`, `frSame`).

## Interface strings (`pages.mjs`, `i18n/en.json`, `i18n/fr.json`)

Every text the pages show is in `assets/data/turkmen/i18n/en.json` and `fr.json` (TM-FR.md 4.4): flat keys grouped by where they are used (`common.*`, `meta.<page>.*`, `core.*` for `turkmen.js`, `account.*` for `turkmen-account.js`, `hub.*`, `lesson.*`, `guide.*`, `cards.*`, `ach.*`, `char.*`, `tag.*`, `pos.*`, `form.*`, `notfound.*` for `404.html`). A key ending in `.html` holds markup; placeholders are `{name}`; a count is `{ "one": …, "other": … }`, chosen with `Intl.PluralRules` of the edition. Whole sentences only: a sentence is never put together from translated pieces.

- **In the markup**, a text carries `data-i18n="key"` (the element's own text, beside its child elements), `data-i18n-html="key"` (all its content) or `data-i18n-attr="aria-label:key;title:key"`. The English text stays in the page as it is, so the pages render with no script and `app-turkmen/scripts/build-www.mjs` finds the text it edits.
- **In the scripts**, `TKM.t(key, vars)` (plain strings are escaped by the caller, `.html` ones are inserted as they are), `TKM.num(n)`, `TKM.date(d, opts)` and `TKM.time(d, opts)` in `en-CA` or `fr-FR`. A page's scripts read the strings that `pages.mjs` inlines before `turkmen.js` (`<script id="tkm-strings">window.TKM_STRINGS = {…}</script>`): the keys of the page's groups and any other key its scripts name, minus those only its markup uses.
- **`pages.mjs`** writes the strings into the pages: it fills every marked text and attribute of `turkmen/*.html` from `en.json` and rewrites the inline block. Run it after changing `en.json` or a page; `--check` (run by `test.mjs`) exits 1 when a page is out of date or a key a page uses isn't in `en.json`. `--preview <folder>` writes the French pages there (`<html lang="fr">`, the French strings over the English ones) for a look; FR-BUILD-2 writes them to `turkmen/fr/`.

```
node scripts/turkmen/pages.mjs                  # fill the strings into turkmen/*.html
node scripts/turkmen/pages.mjs --check          # exit 1 if a page is out of date
node scripts/turkmen/pages.mjs --preview /tmp/fr  # also write the French pages there
```

To add or change a text: edit `en.json` (and the page's markup or script), add the French to `fr.json`, run `pages.mjs`, then `validate.mjs --lang fr`. Never edit the inline block by hand.

## The word list

`tm-wordlist.tsv` is the ranked list of the 1,000 lemmas of the flashcard deck, in the order the five flashcard batches follow: UTF-8, LF line endings, a header row and one tab-separated row per rank with `rank`, `lemma`, `pos`, `sense` (empty, or 1, 2… when the same lemma and part of speech appear twice, as *at* "name" and *at* "horse"), `gloss` (short, for reviewers) and `tr` (the Turkish lemma the row was matched to, or `+` for an added word). Its order is adapted from the Daily Turkish deck, itself adapted from the 2018 Turkish list of [FrequencyWords](https://github.com/hermitdave/FrequencyWords) by Hermit Dave (OpenSubtitles2018), so it is licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) like its source. The ranks are an editorial estimate, not a Turkmen corpus count; how the list was made is in `turkmen/TM-PROJECT.md`, section 7.8.

## Tests for the morphology engine

`morph-test.mjs` tests `assets/js/turkmen-morph.js` (`window.TKMMorph`, TM-PROJECT.md 3) on 2,143 forms typed by hand, never generated by the engine, and 56 other checks: harmony and the rounding rule, the five cases of 40 nouns (voicing, vowel loss, the long-vowel homographs *at* and *ot* in both readings, the dative fused with a final vowel, e → ä, names), possessive paradigms and the pronominal n, pronouns, plural, -dAky and -kY, ordinals and word building, "to be" with its endings, *däl*, *bar*, *ýok* and the question particle, every A1–A2 verb form with its negative and question, the B1 forms (the compound tenses, the full -(Y)pdYr, the conditionals, *eken* and -dYr after participles, participles, verbal nouns, -dYgY, the converbs and the voices; QA-TK-1, with their sources), the closed list of verbs that voice t to d, the forms on the FC-1 cards typed again, and the analysis of morph tiles. Run it after any change to the engine:

```
node scripts/turkmen/morph-test.mjs            # exit 1 on a failure
node scripts/turkmen/morph-test.mjs --verbose  # also list the forms that pass
```

Where a form is still an open question (TM-CURRICULUM.md, "Open questions for native review"), the test checks the form the engine gives first and, marked "(variant)", the other spelling it accepts.

## Tests for turkmen.js

`test.mjs` tests `assets/js/turkmen.js`, the script every page of the course will share (`window.TKM`): the answer checker (TM-PROJECT.md 6.4), the flashcard scheduler with its undo, suspending and statistics (6.6, unchanged from the Turkish course), and the progress logic around them (5.9, 6.1, 6.3). Node 18 or later, no dependencies:

```
node scripts/turkmen/test.mjs            # exit 1 on a failure
node scripts/turkmen/test.mjs --verbose  # also list the tests that pass
```

The checker cases cover what is particular to Turkmen (and, for French answers, the cases of TM-FR.md 7.2: elision, *œ*, inversion and *est-ce que*, the article rule, accents, a missing *ne* and a typo as "almost"): plain lowercasing (no dotted and dotless i pair; a stray U+0307 is still removed), the eight Turkmen letters typed without their marks (*cay* for *çaý*, *yok* for *ýok*), which is "almost" in lenient mode and wrong in strict mode; e and ä, ç and j never folded together; letters outside the Turkmen alphabet never folded (*yıl*, *dağ*, *cogap* are wrong); the question particle typed apart (*talyp my*, *talyp mydyň*), "almost" in both modes; an apostrophe left in (*Aşgabat'da*), "almost"; an English *'d* read as **would** and as **had**, each on its own (*If I'd known, I'd have told you*), the contractions in *'ve* and *'d* after *it, that, there, who*, and *'s been* as **has been** (QA-TK-2). The checker's notes are `apostrophe`, `Turkmen letters`, `particle` and, for English, `typo`.

Besides hand-written cases it marks every accepted answer in the content correct and every rejected one wrong with its feedback, renders every Rich text (flashcard notes included) and every `seg` (which must read back as its own text) and resolves every link, compares the checker's normalization, fold and particle joining with this validator's (taken from its source), runs `validate.mjs --progress` on an exported file and on a Daily Turkish one, and repeats the date tests under America/Toronto and Australia/Lord_Howe. For the French edition it loads `turkmen.js` as a French page does (`<html lang="fr">` and the inlined strings) and checks the strings, plurals, numbers, the data folder, the loader's « untranslated » refusal, the `-fr` item IDs, the two pairs of card directions (scheduled apart, `fr-tk` after `tk-fr`, settings keeping the other pair) and an export with both pairs, which `validate.mjs --lang fr --progress` takes; it also runs `pages.mjs --check` and renders every page in French. While units are unwritten, the path and link tests use a copy of `index.json` with the first three units marked ready.

`turkmen.js` reads the edition from `<html lang>` (TM-FR.md 4.3): `TKM.EDITION` (`"en"` or `"fr"`), `C.DATA` (`assets/data/turkmen/` or its `fr/`), `C.DIRS` (`tk-en`, `en-tk` or `tk-fr`, `fr-tk`), `statId()` (an exercise ID, with `-fr` in French for `item_stats`) and `englishHref()`. In French, `data.get()` refuses an ID the French index doesn't list as ready with `error.code === "untranslated"`, without a request, and `data.cardReady()` says whether a card's file is in French. It has the members of the Turkish `TRK` minus speech, renamed for Turkmen: `tkLower`, `tkUpper`, `tkRich`, the CSS classes `tkm-nw`, `tkm-seg` and `tkm-soon`, achievements with a `tk` name, plus `joinParticle`. Its page links are relative to `/turkmen/` (`index.html`, `lesson.html`, `guide.html`, `cards.html`), prefixed with `window.TKM_BASE` on a page one folder down (the mirror's `guides/<id>.html`).

## Pre-rendering for dailyturkmen.app

`static.mjs` runs in `.github/workflows/sync-dailyturkmen.yml` on the mirror folder it is about to publish (the workflow first puts an empty `sitemap.xml` at its root, then moves `turkmen/` to the root of dailyturkmen.app). It needs Playwright with Chromium (the workflow installs them), so it isn't run by hand day to day:

```
node scripts/turkmen/static.mjs <mirror folder>   # exit 1 if a page doesn't render: the workflow then publishes nothing
```

It renders each guide and interlude in headless Chromium where it will be published (`turkmen/guides/<id>.html`, with `TKM_BASE = "../"`), and copies the result into the page: the 72 pages of the 36 units, `noindex` for units not written yet. It fills the guide index (`turkmen/guide.html`) and the hub's path (`turkmen/index.html`), sets `TKM_STATIC_GUIDES` on every Turkmen page so links lead to the static guides, adds a breadcrumb (schema.org JSON-LD) to the guides and the index, points the links to Daily Turkish at dailyturkish.app (`/turkish.html` becomes `https://dailyturkish.app/`), and writes `turkmen/sitemap.xml`, which ends up as `dailyturkmen.app/sitemap.xml` (the script stops if the root `sitemap.xml` it was given lists a Turkmen URL). It loads nothing from the Turkish course.

It also writes three sets of plain HTML pages, built from the deck and the morphology engine (SEO-TK), with the frame of `turkmen/cards.html` (Google tag, icons, styles, header bar, footer), a breadcrumb, a share image and a sitemap entry each:

- `static-verbs.mjs`: `turkmen/verbs/index.html` and `turkmen/verbs/<verb>.html` for the 100 most frequent verbs of the deck (the first 100 cards with `pos: "verb"`), the file name in plain letters (ş, ç, ž as sh, ch, zh: `ishlemek.html`, `pikir-etmek.html`). Each page: the key forms; notes worked out from the engine (a compound verb, t → d, e → ä, a stem ending in a vowel or in ý, rounding, the posture verbs, `bilmek`), skipped where the card's note already says it, then the card's note; the card's example; a table for every finite form of the coverage table of TM-CURRICULUM.md, A1 to B1 (persons × positive, negative, question; one row for `-jAk` and `-mAlY`, which take no ending), each linked to its guide section; the participles and converbs; the previous and next verb. The posture verbs show their own present (`otyr`) instead of the progressive, and a few verbs of knowing, liking and seeming (`NO_PROGRESSIVE`) a line saying to use `-ýAr`. Where the engine gives two forms, the course's first, the others after "or". Morpheme boundaries carry a soft hyphen, so a long form wraps on a phone between two suffixes.
- `static-words.mjs`: `turkmen/words/index.html` and `turkmen/words/1-100.html` … `901-1000.html`: rank, word, part of speech, meanings, example, forms, note (rendered by `TKM.rich` in the hub just drawn), level, the unit that first teaches it, and for the 100 verbs a link to their conjugation; the CC BY-SA 4.0 credit for the order (7.8) on every page.
- `static-cheatsheet.mjs`: `turkmen/grammar-cheat-sheet.html`: harmony and rounding, sound changes, the cases, possessives, pronouns, "to be", the personal endings, every tense on three verbs, commands, converbs, participles, voices and word order, every Turkmen example built by the engine; forms the native review hasn't settled (e-final nouns with their possessives, *oba* as its own dative, the bare copula endings) are left out.

The pages' head tags and some texts carry `data-i18n` attributes (above); the pages it generates drop those of the head and keep the others, which nothing reads. Share images (1200 × 630 JPEG, in the level's colour) go to `assets/img/og/turkmen/`. In the mirror only, the footers of the hub, the guide index, the guides and the flashcards page get a line linking the three, and Browse's note on ranks links the word list. `sync-dailyturkmen.yml` triggers on `scripts/turkmen/static*.mjs` and `assets/js/turkmen*.js`, so a change to a page module or to the engine republishes the pages.

## Review export for the native speaker (TK-REVIEW)

`review-export.mjs` puts the Turkmen of one level into a sheet a native speaker can check without knowing the site (TM-PROJECT.md 9). It reads the content, `turkmen/TM-PROJECT.md` and `turkmen/TM-CURRICULUM.md` and changes none of them; no dependencies (it writes the .xlsx itself).

```
node scripts/turkmen/review-export.mjs a1            # write turkmen/review/a1-review.xlsx and a1-review-note.md
node scripts/turkmen/review-export.mjs a1 --csv      # also a1-review.csv (same columns)
node scripts/turkmen/review-export.mjs a1 --list     # print the "Check first" rows
node scripts/turkmen/review-export.mjs a1 --out dir  # write elsewhere
```

The sheet has two tabs. **Read me** is the note for the reviewer, English beside Turkmen, with a place for their initials and the date (the same text as `<level>-review-note.md`; edit it in the script). **Review** has one row per distinct string (the same Turkmen with the same English and the same verdict is one row, listing all its places) with the columns No., Part, Flag, Kind, Turkmen, English, What to check, then the reviewer's OK? (a list: Yes, No, Not sure), Correction and Comment, then Location: file, JSON path, exercise or card ID, and which expansion of an accept entry it is, for the conversation that applies the corrections. In order:

- **Check first** (yellow): the forms the progress log lists for the native review (the passages "for the native review", "not sure of", "Kept out", "Engine points", "to check first"), from the rows of the level's batches and, from other rows, those whose Turkmen occurs in the level; then the open questions of TM-CURRICULUM.md (question 9 one row per point); then the single words of the writers' lists of uncertain words. Each says in which rows its Turkmen is used, and a content row that uses an uncertain form or phrase found in eight rows or fewer is flagged "See row N".
- **Unit 1 …**: per written unit, its Turkmen tagline, the guide (examples, paradigms, table rows, dialogues), the lessons (new words; prompts and sentences; every expansion of every accepted answer, the first shown as **Answer**, the others **Also accepted**; **Marked wrong** answers, in pink, with the feedback learners get; right choices with the wrong ones beside them; match pairs; built words; verb tables, a row per cell), the interlude (mini-reads, dialogues, tables, quotes, word list, questions).
- **Flashcards**: the cards whose `level` is the level: word, example, forms, the Turkmen of the note.
- **Pages**, A1 only: achievement names and streak ranks (`TKM.progress.achievements`), the greeting lines and the other Turkmen of the pages (in the pages and in the strings their scripts read from `i18n/en.json`), the level summaries.
- **Explanations**, optional: Turkmen inside English text (hints, feedback, guide and interlude prose, rule lines, summaries), one row per text, leaving out texts whose Turkmen is all in the rows above.

A content conversation is done when `--batch <id>` reports its units complete with no errors and `--index` has been run. See `turkmen/TM-PROJECT.md`, section 9.
