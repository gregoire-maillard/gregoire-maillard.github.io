# Turkmen course in French · Prompts

The plan for a French edition of Daily Turkmen (*Daily Turkmen en français*), so French speakers can learn Turkmen too. One prompt per conversation, in the order below. It works like [TM-PROMPTS.md](TM-PROMPTS.md): paste the whole block into a new conversation in the My website project, with the repo folder on the Mac linked (`/Users/gregoire/Documents/GitHub/gregoire-maillard.github.io`, Mac awake, Claude desktop app open).

**How to run them**

1. Start a new conversation for each prompt, in order. Don't run two content batches at the same time: each one builds on the French terms and glossary the earlier ones fixed.
2. Each conversation works directly in the repo on `main` and never creates a branch, commits or pushes. Review its changes in GitHub Desktop or VS Code, then commit and push to `main` yourself before starting the next one.
3. Nothing French is visible to learners until FR-PUBLISH (prompt 5). After that, each push puts the newly translated units live, and untranslated units show « Bientôt disponible ».
4. Grégoire is the native French reviewer: skim each content batch before pushing (the log row lists what to check). There is a full QA pass after A1+A2 and another after B1.

**The rules every prompt relies on** (FR-SPEC writes them into `turkmen/TM-FR.md`; later prompts point there):

- **Adapt, don't translate word for word.** Explanations written for English speakers get rewritten for French speakers. Sound comparisons use French words (*ý* = le *y* de *yeux*; *ü/ö* ≈ *u/eu* in French, which makes them *easier*). Notes that lean on English grammar ("English has no cases…") are redone from French grammar, with standard French terms (*harmonie vocalique*, *accusatif*, *suffixe possessif*). As in English, Turkmen is never taught by bridging from Turkish.
- **The Turkmen never changes.** Every Turkmen string, ID, exercise structure and answer key on the Turkmen side stays identical to the English edition, which remains the source of truth. A parity check in the validator enforces this.
- **French style:** tutoiement, short sentences, French typography (narrow non-breaking spaces before `: ; ? !`, guillemets « », proper accents and capitals, *œ*), and both genders shown where needed (*content·e* or *content(e)*, applied consistently).
- **French answers are checked leniently, like the English ones.** A missing or extra article (*le/la/un*) is accepted, and a missing accent counts as "almost". Genders and alternative phrasings are listed in the accept lists.
- **Progress is shared:** same unit, lesson and card IDs, so switching language keeps a learner's progress.

**Count:** 22 conversations plus 2 spare. That's 1 spec, 2 build, 1 publish, 13 unit batches (the first one is the pilot), 2 flashcard batches, 2 QA passes and 1 SEO pass. French A1 is live after prompt 8. At one or two prompts a day, it takes about three to four weeks.


## Progress

Tick a box once that conversation's changes are reviewed and pushed. The effort level is the suggested Opus setting.

- [ ] 1 · FR-SPEC · Extra
- [ ] 2 · FR-BUILD-1 · Extra
- [ ] 3 · FR-A1-1 (pilot) · Extra
- [ ] 4 · FR-BUILD-2 · Extra
- [ ] 5 · FR-PUBLISH · Medium
- [ ] 6 · FR-A1-2 · Medium
- [ ] 7 · FR-A1-3 · Medium
- [ ] 8 · FR-A1-4 · Medium
- [ ] 9 · FR-FC-1 · Medium
- [ ] 10 · FR-FC-2 · Medium
- [ ] 11 · FR-A2-1 · Medium
- [ ] 12 · FR-A2-2 · Medium
- [ ] 13 · FR-A2-3 · Medium
- [ ] 14 · FR-A2-4 · Medium
- [ ] 15 · FR-QA-1 · Extra
- [ ] 16 · FR-B1-1 · Extra
- [ ] 17 · FR-B1-2 · Extra
- [ ] 18 · FR-B1-3 · Extra
- [ ] 19 · FR-B1-4 · Extra
- [ ] 20 · FR-B1-5 · Extra
- [ ] 21 · FR-QA-2 · Extra
- [ ] 22 · FR-SEO · Medium
- [ ] 23 · Spare · —
- [ ] 24 · Spare · —

After prompt 6, read its log row and a lesson or two. If it reads like a word-for-word translation, switch the remaining medium content batches to extra.

---

## 1 · FR-SPEC · Decisions and spec

```text
This conversation is FR-SPEC of the French edition of Daily Turkmen: a version of the Turkmen course for French speakers.

Read turkmen/TM-FR-PROMPTS.md (this plan and its rules), turkmen/TM-PROJECT.md in full, turkmen/TM-CURRICULUM.md, scripts/turkmen/README.md, then skim assets/js/turkmen.js, assets/js/turkmen-morph.js, the four pages in turkmen/, scripts/turkmen/static*.mjs and .github/workflows/sync-dailyturkmen.yml to see where the English is assumed.

Goal: turkmen/TM-FR.md, the spec for the French edition, with each decision made and its reason in one line. Decide, looking at the code:
1. URLs: gregoiremaillard.com/turkmen/fr/ and dailyturkmen.app/fr/ (recommended), with hreflang between the editions and a language switch in the header.
2. Pages: one source per page with the language taken from the path and the interface strings in assets/data/turkmen/i18n/en.json and fr.json (recommended, so 7,800 lines aren't forked); or, if the code makes that impractical, thin turkmen/fr/*.html wrappers. Say what each turkmen/fr/ file contains.
3. Data: a parallel tree assets/data/turkmen/fr/ (lessons, grammar, culture, units, levels, flashcards, index.json) with the same IDs. Pick how the learner-language fields are named (keep `en`, rename to `fr`, or a neutral key) after listing every place the code reads them, and pick how a French file falls back to the English one while it isn't translated yet.
4. Which strings are learner-facing (to translate) and which aren't (IDs, slugs, Turkmen); the list per schema of TM-PROJECT.md section 5.
5. The French answer checker: the normalization and "almost" folds (articles, accents, elision l', typographic apostrophes and spaces, œ/oe), and how accept lists are written.
6. Flashcards: tk-fr and fr-tk directions, and whether scheduling is shared with tk-en/en-tk per card (recommended: separate per direction, shared card IDs).
7. Whether turkmen-morph.js produces English text anywhere, and what that needs.
8. The French style guide (from the rules in TM-FR-PROMPTS.md), a starter glossary of grammar terms (EN → FR, about 40 entries), and the parity check the validator will run.
9. A French progress log at the end of TM-FR.md, with this conversation's row.

Change no code and no data in this conversation. Ask Grégoire, in the final reply, only about decisions where the code leaves a real choice. Work in the repo on main; don't create a branch, commit or push: Grégoire reviews and pushes.
```

## 2 · FR-BUILD-1 · Strings, checker, validator, tests

```text
This conversation is FR-BUILD-1 of the French edition of Daily Turkmen.

Read turkmen/TM-FR.md in full (decisions and log), turkmen/TM-PROJECT.md sections 3, 5, 6 and 8, and scripts/turkmen/README.md.

Goal: the machinery for a second learner language, with the English edition unchanged.
1. Extract every interface string from the four pages in turkmen/ and from assets/js/turkmen.js into assets/data/turkmen/i18n/en.json, and write fr.json (tutoiement, French typography, TM-FR.md style guide). Pages and the core script read the strings through one helper; the English pages must render exactly as before.
2. The data loader in assets/js/turkmen.js: learner language from the path as TM-FR.md decides, the French tree with fallback to English per file.
3. The answer checker: French normalization and "almost" folds of TM-FR.md; new cases in scripts/turkmen/test.mjs.
4. Flashcard directions tk-fr and fr-tk as TM-FR.md decides; export and import keep working across editions.
5. scripts/turkmen/validate.mjs gets --lang fr: it validates assets/data/turkmen/fr/ with the same schema rules, plus the parity check (same IDs, same exercise types and counts, every Turkmen string identical to the English source, no English left in a learner-facing field, French typography warnings). Make --batch and --progress work with --lang fr.
6. Update scripts/turkmen/README.md.

Run validate.mjs (English must pass as before), validate.mjs --lang fr (empty tree: zero errors, "0 of 36 units translated"), test.mjs and morph-test.mjs. Check in Chromium with Playwright that the English hub, a lesson, the guide and the cards page look and behave as before. Work in the repo on main; don't create a branch, commit or push: Grégoire reviews and pushes. Finish with a row in the TM-FR.md log.
```

## 3 · FR-A1-1 · Pilot batch

```text
This conversation is content batch FR-A1-1 of the French edition of Daily Turkmen: units a1-u01, a1-u02 and a1-u03, plus levels/a1.json.

Read turkmen/TM-FR.md in full (style guide, glossary, log), turkmen/TM-PROJECT.md sections 5 and 7, the A1 part and "Notes for writers" of turkmen/TM-CURRICULUM.md, then the English files of these units in assets/data/turkmen/ (unit, four lessons, grammar, culture).

For each unit, write the French files in assets/data/turkmen/fr/: grammar guide, the four lessons, interlude, unit file. Adapt, don't translate word for word (TM-FR.md). Specific to this batch:
- a1-u01 teaches the alphabet and sounds: redo every sound comparison from French, and check each one is right for a French ear (*ý* as in *yeux*, *ž* as in *jour*, *ş* as *ch*, *ç* as *tch*, *ü* as *u*, *ö* as *eu*; and say plainly where French has no match: *ň*, *y*, *ä*, the long vowels).
- a1-u02 vowel harmony: explain front and rounded vowels with French examples.
- Interludes: keep the facts and sources, add French-language sources where good ones exist, and check every URL.
- Accept lists: add the French variants a learner will type (with or without article, both genders, tu/vous where the Turkmen allows both).
- Extend the glossary in TM-FR.md with every term you fix.

This is the pilot: at the end, write in the log how long the batch took and whether three units per batch is the right size; propose a change to the plan if not. Run validate.mjs --lang fr --batch A1-1 until clean, then test.mjs. Play one lesson of each unit in French in Chromium with Playwright (if FR-BUILD-2 hasn't run yet, through the loader in Node instead). Re-read every file from disk. In the log row, list the places Grégoire should read first. Work in the repo on main; don't create a branch, commit or push: Grégoire reviews and pushes.
```

## 4 · FR-BUILD-2 · French pages and language switch

```text
This conversation is FR-BUILD-2 of the French edition of Daily Turkmen.

Read turkmen/TM-FR.md in full and turkmen/TM-PROJECT.md sections 2, 3 and 6, then the four pages in turkmen/ as FR-BUILD-1 left them.

Goal: the hub, lesson player, guide reader and cards page work in French at the URLs TM-FR.md decides.
- The turkmen/fr/ pages (or path detection) as decided; <html lang="fr">, French title, meta, canonical, og and hreflang tags; Turkmen text keeps lang="tk".
- A language switch in the header (English / Français) that keeps the learner on the same page and lesson; the choice is remembered.
- Units with no French files yet show « Bientôt disponible » in French, not the English content.
- The characters' Turkmen lines stay as they are; their French translations come from fr.json.
- French numbers, dates and plurals in the interface (1 leçon, 2 leçons; « 3 jours de suite »).
- Flashcards in tk-fr and fr-tk, browser search folding French accents as well as Turkmen letters.

Test in Chromium with Playwright at 360 px and on desktop, both themes: a full French lesson of a1-u01 with right, almost and wrong answers (article missing, accent missing, wrong word), a unit review, the French guide and interlude of a1-u01 read to the end, a French card session, switching language mid-course (progress kept), export and import, reduced motion, no console errors, no horizontal scroll, long French strings not overflowing buttons. The English pages must be unchanged. Run validate.mjs, validate.mjs --lang fr and test.mjs. Work in the repo on main; don't create a branch, commit or push: Grégoire reviews and pushes. Finish with a row in the TM-FR.md log.
```

## 5 · FR-PUBLISH · Live at dailyturkmen.app/fr/

```text
This conversation is FR-PUBLISH of the French edition of Daily Turkmen.

Read turkmen/TM-FR.md in full, .github/workflows/sync-dailyturkmen.yml and scripts/turkmen/static*.mjs (and what they import).

Goal: the French edition goes live as a beta at dailyturkmen.app/fr/ and gregoiremaillard.com/turkmen/fr/.
1. The sync workflow: trigger on and copy the French paths (turkmen/fr/**, assets/data/turkmen/fr/**, assets/data/turkmen/i18n/**). The English mirror must come out byte-identical for every English file.
2. scripts/turkmen/static.mjs pre-renders the French guides and interludes that exist (turkmen/fr/guides/<id>.html) and the French hub, with French titles and descriptions written for French searches ("apprendre le turkmène", "cours de turkmène gratuit"); French URLs in the sitemap with hreflang alternates.
3. A one-line French beta notice on the French hub, and a French lede (« Pour les francophones qui partent de zéro… »).
4. The privacy page in French (turkmen/fr/ or a French section), saying the same thing as the English one.
5. Run the workflow's build steps locally into a temporary folder and check: every French page renders, untranslated units say « Bientôt disponible », no broken links, the English files unchanged, the sitemap valid.

Work in the repo on main; don't create a branch, commit or push: Grégoire reviews and pushes, which publishes. In the final reply, say exactly what goes live on push. Finish with a row in the TM-FR.md log.
```

## 6–8 · FR-A1-2, FR-A1-3, FR-A1-4

Send one per conversation, changing the batch name and units:

| Prompt | Batch | Units |
|---|---|---|
| 6 | FR-A1-2 | a1-u04, a1-u05, a1-u06 |
| 7 | FR-A1-3 | a1-u07, a1-u08, a1-u09 |
| 8 | FR-A1-4 | a1-u10, a1-u11, a1-u12 |

```text
This conversation is content batch FR-A1-2 of the French edition of Daily Turkmen: units a1-u04, a1-u05 and a1-u06.

Read turkmen/TM-FR.md in full (style guide, glossary, and the log: what earlier batches decided and left open), turkmen/TM-PROJECT.md sections 5 and 7, the part of turkmen/TM-CURRICULUM.md for these units, then their English files in assets/data/turkmen/. Look at the French files of the previous batch so terms and tone stay consistent.

For each unit, write the French grammar guide, four lessons, interlude and unit file in assets/data/turkmen/fr/, adapting rather than translating word for word (TM-FR.md). Rewrite any explanation that leans on English grammar or English sounds from French; use the glossary terms and add new ones; add the French variants learners will type to the accept lists; keep or add sources to the interludes and check every URL.

Run validate.mjs --lang fr --batch <this batch> until clean (parity included), then test.mjs. Play one lesson per unit in French in Chromium with Playwright, answering once right, once with a French variant, once wrong. Re-read every file from disk. In the TM-FR.md log row, list the places Grégoire should read first (choices of term, rewritten explanations, uncertain glosses). Work in the repo on main; don't create a branch, commit or push: Grégoire reviews and pushes.
```

## 9–10 · FR-FC-1, FR-FC-2 · Flashcards

| Prompt | Batch | Cards |
|---|---|---|
| 9 | FR-FC-1 | tm-fc-0001-0200, tm-fc-0201-0400, tm-fc-0401-0600 |
| 10 | FR-FC-2 | tm-fc-0601-0800, tm-fc-0801-1000 |

```text
This conversation is FR-FC-1 of the French edition of Daily Turkmen: the French deck for flashcard files tm-fc-0001-0200, tm-fc-0201-0400 and tm-fc-0401-0600.

Read turkmen/TM-FR.md in full, turkmen/TM-PROJECT.md 5.8 and 7.8, and the English card files. Write the French files in assets/data/turkmen/fr/flashcards/: glosses (most usual French sense first, gender of nouns where useful, the same sense distinctions as the English), example translations, notes. Where a French learner needs a note the English doesn't have (a false friend, a French word with a different range), add it. The gloss of a card must match how the French lessons gloss the same word: run validate.mjs --lang fr --vocab and fix either side.

For the fr-tk direction, check that no two cards in the deck have the same French prompt; where they do, add a hint in brackets.

Run validate.mjs --lang fr until clean, then test.mjs. Run a French card session of 20 new cards in Chromium with Playwright. In the TM-FR.md log row, list the glosses you weren't sure of. Work in the repo on main; don't create a branch, commit or push: Grégoire reviews and pushes.
```

## 11–14 · FR-A2-1 to FR-A2-4

Same prompt as 6–8, with the batch name and units changed:

| Prompt | Batch | Units |
|---|---|---|
| 11 | FR-A2-1 | a2-u01, a2-u02, a2-u03 |
| 12 | FR-A2-2 | a2-u04, a2-u05, a2-u06 |
| 13 | FR-A2-3 | a2-u07, a2-u08, a2-u09 |
| 14 | FR-A2-4 | a2-u10, a2-u11, a2-u12 |

## 15 · FR-QA-1 · After A2

```text
This conversation is FR-QA-1 of the French edition of Daily Turkmen, after A1, A2 and the deck are in French.

Read turkmen/TM-FR.md in full and the whole TM-FR.md log.

1. Play through every French A1 and A2 lesson in Chromium with Playwright, answering each exercise with its canonical answer, with a common French variant (article, gender, word order, tu/vous) and with a predictable mistake; list every wrong verdict and fix the accept and reject lists.
2. Consistency: one term per grammar point across lessons, guides, cards and the interface (compare with the glossary); the same word glossed the same way in lessons and cards; French typography everywhere (run the validator's warnings with --strict and fix them).
3. Read every guide's opening and every sound comparison as a French learner would; rewrite what still reads like a translation from English.
4. Apply the corrections Grégoire left in the log rows of earlier batches.
5. Update TM-FR.md with what this pass taught (style guide, glossary, checker rules).

Run validate.mjs --lang fr --strict, test.mjs and morph-test.mjs. Work in the repo on main; don't create a branch, commit or push: Grégoire reviews and pushes. Finish with a row in the TM-FR.md log.
```

## 16–20 · FR-B1-1 to FR-B1-5

Same prompt as 6–8, with the batch name and units changed. They follow the B1 batches of TM-CURRICULUM.md:

| Prompt | Batch | Units |
|---|---|---|
| 16 | FR-B1-1 | b1-u01, b1-u02, b1-u03 |
| 17 | FR-B1-2 | b1-u04, b1-u05, b1-u06 |
| 18 | FR-B1-3 | b1-u07, b1-u08 |
| 19 | FR-B1-4 | b1-u09, b1-u10 |
| 20 | FR-B1-5 | b1-u11, b1-u12 |

At B1 the interludes are longer and more cultural. Add this line to each of these prompts: « For the interludes, prefer French-language sources where reliable ones exist, and keep the English ones otherwise. »

## 21 · FR-QA-2 · After B1

```text
This conversation is FR-QA-2 of the French edition of Daily Turkmen, after every unit is in French.

Do what FR-QA-1 did (turkmen/TM-FR-PROMPTS.md prompt 15) for the B1 lessons, then for the whole course: run validate.mjs --lang fr --strict and --progress (36 of 36 units, 1,000 of 1,000 cards), remove the fallback-to-English notices that no longer apply, check every French page in Chromium at 360 px and on desktop, both themes, and check that the French index.json marks every unit ready. Update TM-FR.md. Work in the repo on main; don't create a branch, commit or push: Grégoire reviews and pushes. Finish with a row in the TM-FR.md log.
```

## 22 · FR-SEO · Conjugation pages, word lists and cheat sheet in French

```text
This conversation is FR-SEO of the French edition of Daily Turkmen.

Read turkmen/TM-FR.md in full, the SEO-TK row of turkmen/TM-PROJECT.md's log, and scripts/turkmen/static-verbs.mjs, static-words.mjs and static-cheatsheet.mjs.

Goal: the same pages in French, built at mirror time from the French data and the engine: turkmen/fr/verbs/<verb>.html (titles like « Conjugaison de gelmek en turkmène (venir) »), turkmen/fr/words/ by hundreds, and turkmen/fr/aide-memoire-grammaire.html, each linked to the French guide sections, with hreflang to the English pages, breadcrumbs, share images and sitemap entries. No broken links, no horizontal scroll at 390 px. Check a sample of verb pages against the French cards. Work in the repo on main; don't create a branch, commit or push: Grégoire reviews and pushes. Finish with a row in the TM-FR.md log.
```

## 23–24 · Spare

Two spare slots: one batch will probably run long and need a second conversation (likely a1-u01, or the longest B1 unit), and Grégoire's review of the A1 pilot may call for a correction pass before FR-A1-2. If neither happens, the plan ends at 22.

---

Later, if the French edition finds learners: the iOS app in French (an App Store localization of the Capacitor app), and the same treatment for Daily Turkish (the machinery of FR-BUILD-1 is reusable; the content would need its own batches).
