# Turkish course — validator and tests

`validate.mjs` checks the content behind `/turkish.html` (all of `assets/data/turkish/`) against the schemas in `turkish/PROJECT.md` and the registry of units, grammar points and batches in `turkish/CURRICULUM.md`. It also generates `assets/data/turkish/index.json`, the manifest the hub reads. Node 18 or later, no dependencies. Run it from the repo root:

```
node scripts/turkish/validate.mjs                    # validate everything; exit 1 on errors
node scripts/turkish/validate.mjs --batch A1-1       # also report what batch A1-1 still lacks
node scripts/turkish/validate.mjs --index            # validate, then rewrite assets/data/turkish/index.json
node scripts/turkish/validate.mjs --examples         # validate the JSON examples in turkish/PROJECT.md
node scripts/turkish/validate.mjs --vocab            # list the words taught so far, unit by unit
node scripts/turkish/validate.mjs --progress f.json  # validate a progress file exported from the site
   add --strict to turn warnings into errors, --quiet to hide warnings
```

What it checks:

- **Structure**: every file against its schema (unknown fields are errors), IDs and file names, unique IDs, references between files (unit ↔ lessons, guide, interlude; lesson vocab ↔ flashcards; links inside text).
- **Registry**: units, titles, taglines and grammar-point lists equal to CURRICULUM.md; grammar points never used before the unit that introduces them; one guide section per grammar point, in order; the batch table and the units' `Batch:` lines agree.
- **Answers**: the `[a|b]`, `(a)` syntax of accepted answers, the plain canonical `accept[0]`, duplicates, rejected answers that are also accepted, `cloze` blanks, `wordbank` tiles, `morph` parts, `match` pairs, `listen` options; a warning for an English accepted answer with *'d*, which can mean **had** or **would** (write it out).
- **Turkish text**: NFC, no U+0307 (from lowercasing İ without the Turkish locale), the `'` apostrophe, inline markup, `seg` segmentation; warnings for a likely mistyped dotless *I* (*Istanbul*), a question particle glued to its verb, non-Turkish letters, sentences that start in lowercase, and a quotation closed with a comma before the verb of saying (`,” dedi`; TDK style is `“Geliyorum.” dedi`).
- **Plain fields** (warnings, added in QA-2): asterisks, backticks or link syntax where the pages show the text as typed (`Tr` and `En` fields, accept lists, `tr` and `en` table cells, Turkish options), and a link inside an English option (options follow `optionsLang`: English ones are Rich, Turkish ones plain).
- **Targets** (warnings): lesson sizes and exercise mixes, guide and interlude lengths, interlude sources, flashcard examples that don't contain their word, a flashcard `level` that differs from its unit's level, internal IDs (*a1-u07-l02*) in learner-facing text, `wordbank` alternatives without final punctuation.
- **index.json**: up to date with the content (rewrite it with `--index`, which refuses while there are errors).
- **Morphology** (warnings for now): every `conjugate` cell and every `morph` exercise against the morphology engine, `assets/js/turkish-morph.js`: the cell must accept the engine's form and accept nothing it doesn't build; the tiles must be the base and its suffixes, cut at morpheme boundaries. Slugs and words the engine doesn't model are listed as not checked.
- **Word list**: `wordlist.tsv` well formed (header `rank`, `lemma`, `pos`, ranks 1–1000 in order, no duplicates), and every flashcard's `tr` and `pos` equal to its rank's row.
- **Culture page** (`timeline.json`, `regions.json`, PROJECT.md 5.11 and 5.12): one event per interlude, in course order; eras that follow on from each other; a `date` that agrees with `year` and `end`, and (a warning) whose years, decades or centuries appear in the interlude itself; provinces that exist; pins within 10 km of their provinces, one position per place name; the seven regions in order and the 81 provinces, each in its region's list, with closed rings inside `bbox`.
- **Dialogues** (`dialogues/dlg-*.json`, PROJECT.md 5.14 and 7.10): each conversation as a graph: every `who`, `to`, `start` and `next` points to a node or a cast member, every node can be reached from `start` and can reach an end, lines linked by `next` don't loop; each turn has an `ok` reply in its person's register (or with none), and no typed answer is accepted by two of its replies; wrong replies have a `why`; `after` is a unit of the dialogue's level; each level's dialogues are numbered 1, 2, 3… by `order`. Warnings when a conversation doesn't branch, offers no reply in the wrong register, has no wrong reply with consequences, has a path shorter than 4 turns or longer than 12 (8 at A1–A2), when a reply's words say *siz* or *sen* (a pronoun, *misiniz*, *-sInIz*) but its `register` doesn't, and for lines, replies and notes over their length. `--index` lists the dialogues in `index.json`.
- **TYS practice test** (`exams/tys-1.json`, PROJECT.md 5.13 and 7.9): the four sections in order and the shape each skill needs (texts with items for reading and listening, tasks and a rubric for writing and speaking); minutes, points and task points that add up; gaps that match their gap items, with the filled-in text checked as Turkish; answers that point at an option (true or false for tf); `review` links to units and grammar points that exist. Warnings when a section's minutes, points, item count or task points drift from the official test's proportions, when a writing model is outside its `words`, or when every right answer sits in the same position.

## The word list

`wordlist.tsv` is the ranked list of the 1,000 lemmas of the flashcard deck, in the order the five flashcard batches follow. It is adapted from the 2018 Turkish list of [FrequencyWords](https://github.com/hermitdave/FrequencyWords) by Hermit Dave, built from the OpenSubtitles2018 corpus (OPUS, subtitles from [opensubtitles.org](https://www.opensubtitles.org)), and is licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) like its source. How it was made is in `turkish/PROJECT.md`, section 7.8.

## Tests for turkish.js

`test.mjs` tests `assets/js/turkish.js`, the script every page of the section shares: the answer checker (PROJECT.md 6.4), the flashcard scheduler with its undo, suspending and statistics (6.6), and the progress logic around them (5.9, 6.1, 6.3). Node 18 or later, no dependencies:

```
node scripts/turkish/test.mjs            # exit 1 on a failure
node scripts/turkish/test.mjs --verbose  # also list the tests that pass
```

Besides hand-written cases it marks every accepted answer in the content correct and every rejected one wrong with its feedback, renders every Rich text and every `seg` (which must read back as its own text) and resolves every link, compares the checker's normalization with this validator's (taken from its source), runs `validate.mjs --progress` on an exported file, and repeats the date tests under America/Toronto and Australia/Lord_Howe.

## Tests for turkish-morph.js

`morph-test.mjs` tests `assets/js/turkish-morph.js`, the rule-based morphology engine described in `turkish/PROJECT.md`, section 3: over 1,100 forms typed by hand from the written standard, never generated by the engine (every row of the conjugation table in CURRICULUM.md for all six persons, positive, negative and question; the 13 aorists in -Ir; nouns with softening, vowel loss, doubled consonants, loanword harmony and proper names; pronouns, *-ki*, numbers, word building, voices, compound verbs, participles, verbal nouns and converbs), plus checks of the tile analysis behind the validator's `morph` warnings. Node 18 or later, no dependencies:

```
node scripts/turkish/morph-test.mjs            # exit 1 on a failure
node scripts/turkish/morph-test.mjs --verbose  # also list the forms that pass
```

A content conversation is done when `--batch <id>` reports its units complete with no errors and `--index` has been run. See `turkish/PROJECT.md`, section 9.

## The regions map

`regions.mjs` writes `assets/data/turkish/regions.json`, the provinces and regions the Culture page (`turkishculture.html`) draws and the validator checks pins against. Its input is Natural Earth's *Admin 1 – States, Provinces* at 1:10m, version 5.1.2, which is in the public domain: download `geojson/ne_10m_admin_1_states_provinces.geojson` from tag v5.1.2 of [natural-earth-vector](https://github.com/nvkelso/natural-earth-vector) (about 40 MB, not kept in the repo), then `node scripts/turkish/regions.mjs <that file>`. It keeps the 81 Turkish provinces by their ISO 3166-2 code, puts each in one of the seven regions of 1941 (the list is in the script), simplifies the shapes with mapshaper 0.7.101 through `npx` (shared borders stay shared) and dissolves the regions. Rerun `validate.mjs --index` afterwards, since the file is part of the content's version.

## Static pages for dailyturkish.app

`static.mjs` makes the course readable without JavaScript, for search engines. The workflow `.github/workflows/sync-dailyturkish.yml` runs it on the mirror folder before publishing dailyturkish.app; it needs Playwright with Chromium (the workflow installs them). It opens every page in headless Chromium and saves what it renders:

- `guides/<unit>-grammar.html` and `guides/<unit>-culture.html`: one page per grammar guide and interlude, with its own title, description and canonical URL. Units not written yet get a "coming soon" page marked `noindex`.
- `turkishguide.html` (the index) and the hub (`turkish.html`, `index.html`) with the path filled in.
- `words/index.html` and `words/1-100.html` … `words/901-1000.html`: the 1,000 flashcard words as a list, 100 per page, built from `assets/data/turkish/flashcards/` (rank, word, part of speech, meanings, example, forms, note, level, the unit that first teaches it), in the frame of `turkishcards.html`, with the CC BY-SA credit for the order of the list. The footers of the hub, the guides and the flashcards page, and Browse's note on ranks, link to it (in the mirror only).
- `sitemap.xml`: the hub, the index, the flashcards, the Culture page, the privacy page, every written guide and the word list.
- `verbs/index.html` and `verbs/<verb>.html` (`static-verbs.mjs`): the 100 most common verbs of the deck, each with key forms, notes worked out from the engine's lexicon (aorist type, t → d, de-/ye-) unless the card's note already says it, the card's example and note, and 13 tables (6 persons × positive, negative, question) built by `turkish-morph.js`, each linked to its guide section.
- `grammar-cheat-sheet.html` (`static-cheatsheet.mjs`): harmony, consonant changes, cases, possessives, pronouns, personal endings, tenses, converbs, participles, voices and word order on one page, every example built by the engine.
- `404.html`, the page GitHub Pages shows for addresses that don't exist (noindex), with links into the course.
- Share images: `assets/img/og/<page>.jpg`, a 1200×630 card drawn in the headless browser for every written guide and word-list page (level colour, logo, title, Turkish subtitle), `daily-turkish.jpg` for the other pages; every page but the 404 gets `og:image` and `twitter:card` (summary_large_image).
- Structured data (schema.org JSON-LD): `WebSite` + `Organization` on the hub (the site name Google shows: Daily Turkish), `BreadcrumbList` on the guides, the guide index and the word list.
- Every `href="/turkish.html…"` in the mirror becomes `"/…"`, since `index.html` is the hub (turkish.js does the same for the links it writes, on dailyturkish.app).

The pages keep their scripts, so in a browser they render again with the learner's progress. Links go to `guides/…` on dailyturkish.app only (`TRK.guideHref`); gregoiremaillard.com and the iPhone app keep `turkishguide.html?id=`, and every guide's canonical URL is its dailyturkish.app page. If a page fails to render, the script exits 1 and the workflow publishes nothing. To try it locally, build the mirror folder as the workflow does, then `npm install --no-save playwright && npx playwright install chromium && node scripts/turkish/static.mjs out`.

