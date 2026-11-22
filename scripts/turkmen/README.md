# Turkmen course (Daily Turkmen) — validator and tests

`validate.mjs` checks the content of the Turkmen course (all of `assets/data/turkmen/`) against the schemas of `turkish/PROJECT.md` section 5 with the renames of `turkmen/TM-PROJECT.md` 5.0, and against the registry of units, grammar points and batches in `turkmen/TM-CURRICULUM.md`. It also generates `assets/data/turkmen/index.json`, the manifest the hub reads. It is a fork of `scripts/turkish/validate.mjs` (TK-BUILD-1) and loads nothing from the Turkish course. Node 18 or later, no dependencies. Run it from the repo root:

```
node scripts/turkmen/validate.mjs                    # validate everything; exit 1 on errors
node scripts/turkmen/validate.mjs --batch A1-1       # also report what batch A1-1 still lacks
node scripts/turkmen/validate.mjs --index            # validate, then rewrite assets/data/turkmen/index.json
node scripts/turkmen/validate.mjs --examples         # validate the JSON examples in turkmen/TM-PROJECT.md
node scripts/turkmen/validate.mjs --vocab            # list the words taught so far, unit by unit
node scripts/turkmen/validate.mjs --progress f.json  # validate a progress file exported from the course
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
- **Progress files** (`--progress`): the export format of TM-PROJECT.md 5.9 (`app: "daily-turkmen"`, card keys `fc-0042:tk-en` and `fc-0042:en-tk`, settings without speech). A Daily Turkish file is refused with its own message.

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

The checker cases cover what is particular to Turkmen: plain lowercasing (no dotted and dotless i pair; a stray U+0307 is still removed), the eight Turkmen letters typed without their marks (*cay* for *çaý*, *yok* for *ýok*), which is "almost" in lenient mode and wrong in strict mode; e and ä, ç and j never folded together; letters outside the Turkmen alphabet never folded (*yıl*, *dağ*, *cogap* are wrong); the question particle typed apart (*talyp my*, *talyp mydyň*), "almost" in both modes; an apostrophe left in (*Aşgabat'da*), "almost"; an English *'d* read as **would** and as **had**, each on its own (*If I'd known, I'd have told you*), the contractions in *'ve* and *'d* after *it, that, there, who*, and *'s been* as **has been** (QA-TK-2). The checker's notes are `apostrophe`, `Turkmen letters`, `particle` and, for English, `typo`.

Besides hand-written cases it marks every accepted answer in the content correct and every rejected one wrong with its feedback, renders every Rich text (flashcard notes included) and every `seg` (which must read back as its own text) and resolves every link, compares the checker's normalization, fold and particle joining with this validator's (taken from its source), runs `validate.mjs --progress` on an exported file and on a Daily Turkish one, and repeats the date tests under America/Toronto and Australia/Lord_Howe. While units are unwritten, the path and link tests use a copy of `index.json` with the first three units marked ready.

`turkmen.js` has the members of the Turkish `TRK` minus speech, renamed for Turkmen: `tkLower`, `tkUpper`, `tkRich`, the CSS classes `tkm-nw`, `tkm-seg` and `tkm-soon`, achievements with a `tk` name, plus `joinParticle`. Its page links are relative to `/turkmen/` (`index.html`, `lesson.html`, `guide.html`, `cards.html`), prefixed with `window.TKM_BASE` on a page one folder down (the mirror's `guides/<id>.html`).

## Pre-rendering for dailyturkish.app

`static.mjs` runs in `.github/workflows/sync-dailyturkish.yml`, after `scripts/turkish/static.mjs`, on the mirror folder it is about to publish. It needs Playwright with Chromium (the workflow installs them), so it isn't run by hand day to day:

```
node scripts/turkmen/static.mjs <mirror folder>   # exit 1 if a page doesn't render: the workflow then publishes nothing
```

It renders each guide and interlude in headless Chromium where it will be published (`turkmen/guides/<id>.html`, with `TKM_BASE = "../"`), and copies the result into the page: the 72 pages of the 36 units, `noindex` for units not written yet. It fills the guide index (`turkmen/guide.html`) and the hub's path (`turkmen/index.html`), sets `TKM_STATIC_GUIDES` on every Turkmen page so links lead to the static guides, adds a breadcrumb (schema.org JSON-LD) to the guides and the index, makes links to `/turkish.html` `/` (Daily Turkish's hub on dailyturkish.app), and writes `turkmen/sitemap.xml` (since SEO-9 of the Turkish course the site's `sitemap.xml` lists Daily Turkish only; the script stops if it finds a Turkmen URL there). It loads nothing from the Turkish course.

It also writes three sets of plain HTML pages, built from the deck and the morphology engine (SEO-TK), with the frame of `turkmen/cards.html` (Google tag, icons, styles, header bar, footer), a breadcrumb, a share image and a sitemap entry each:

- `static-verbs.mjs`: `turkmen/verbs/index.html` and `turkmen/verbs/<verb>.html` for the 100 most frequent verbs of the deck (the first 100 cards with `pos: "verb"`), the file name in plain letters (ş, ç, ž as sh, ch, zh: `ishlemek.html`, `pikir-etmek.html`). Each page: the key forms; notes worked out from the engine (a compound verb, t → d, e → ä, a stem ending in a vowel or in ý, rounding, the posture verbs, `bilmek`), skipped where the card's note already says it, then the card's note; the card's example; a table for every finite form of the coverage table of TM-CURRICULUM.md, A1 to B1 (persons × positive, negative, question; one row for `-jAk` and `-mAlY`, which take no ending), each linked to its guide section; the participles and converbs; the previous and next verb. The posture verbs show their own present (`otyr`) instead of the progressive, and a few verbs of knowing, liking and seeming (`NO_PROGRESSIVE`) a line saying to use `-ýAr`. Where the engine gives two forms, the course's first, the others after "or". Morpheme boundaries carry a soft hyphen, so a long form wraps on a phone between two suffixes.
- `static-words.mjs`: `turkmen/words/index.html` and `turkmen/words/1-100.html` … `901-1000.html`: rank, word, part of speech, meanings, example, forms, note (rendered by `TKM.rich` in the hub just drawn), level, the unit that first teaches it, and for the 100 verbs a link to their conjugation; the CC BY-SA 4.0 credit for the order (7.8) on every page.
- `static-cheatsheet.mjs`: `turkmen/grammar-cheat-sheet.html`: harmony and rounding, sound changes, the cases, possessives, pronouns, "to be", the personal endings, every tense on three verbs, commands, converbs, participles, voices and word order, every Turkmen example built by the engine; forms the native review hasn't settled (e-final nouns with their possessives, *oba* as its own dative, the bare copula endings) are left out.

Share images (1200 × 630 JPEG, in the level's colour) go to `assets/img/og/turkmen/`. In the mirror only, the footers of the hub, the guide index, the guides and the flashcards page get a line linking the three, and Browse's note on ranks links the word list. The workflow's trigger paths need `scripts/turkmen/static*.mjs` (in place of `static.mjs`) and `assets/js/turkmen-morph.js`, so that a change to a page module or to the engine republishes the pages (SEO-TK couldn't write `.github/`; its log row in TM-PROJECT.md has the change).

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
- **Pages**, A1 only: achievement names and streak ranks (`TKM.progress.achievements`), the greeting lines and the other Turkmen of the pages, the level summaries.
- **Explanations**, optional: Turkmen inside English text (hints, feedback, guide and interlude prose, rule lines, summaries), one row per text, leaving out texts whose Turkmen is all in the rows above.

A content conversation is done when `--batch <id>` reports its units complete with no errors and `--index` has been run. See `turkmen/TM-PROJECT.md`, section 9.
