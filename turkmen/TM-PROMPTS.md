# Turkmen course · Prompts

One prompt per conversation, in the recommended order of [TM-CURRICULUM.md](TM-CURRICULUM.md) ("Recommended order"). Paste the whole block into a new Claude Code conversation that has the `gregoire-maillard/gregoire-maillard.github.io` repo attached (a cloud session, or a local one on the Mac).

**How to run them**

1. Start a new conversation for each prompt, in order. Don't run two content batches at the same time: each one builds on the vocabulary the previous ones taught.
2. Each conversation works on its own branch (`turkmen/<id>`), pushes it and opens a pull request into `main`. Review it, then merge it before starting the next conversation, so the next one starts from `main` with everything before it.
3. Until TK-PUBLISH, merging to `main` publishes nothing on dailyturkish.app (the sync workflow only copies Turkish paths). From TK-BUILD-2 on, `gregoiremaillard.com/turkmen/` shows the pages, which is fine for testing.
4. After A1 and again after B1, run the two TK-REVIEW prompts with a native Turkmen speaker in between.

Every prompt points the conversation to `turkmen/TM-PROJECT.md`, which holds the rules; the prompts only add what is specific to each conversation.

---

## 1 · TK-BUILD-1 · Validator, tests and core script

```text
This conversation is TK-BUILD-1 of the Turkmen course (Daily Turkmen), a sister of the Daily Turkish course in this repo.

Read turkmen/TM-PROJECT.md in full, then turkmen/TM-CURRICULUM.md, then turkish/PROJECT.md sections 3 to 8 and scripts/turkish/README.md. The Turkmen spec says how the Turkmen course differs; where it says nothing, the Turkish spec applies with the renames of turkmen/TM-PROJECT.md 5.0.

Goal: the Turkmen course gets its own validator, tests and core script, forked from the Turkish ones, and the existing Turkmen data (the word list and FC-1) passes.

1. Create scripts/turkmen/validate.mjs by forking scripts/turkish/validate.mjs: paths to assets/data/turkmen/, turkmen/TM-CURRICULUM.md and turkmen/TM-PROJECT.md; the renames of 5.0 (tk, titleTk, Lang, Person, column types, forms keys, the `~…~` Turkish markup in compare callouts and card notes); levels a1, a2, b1; `listen` rejected; the Turkmen letter rules and warnings of TM-PROJECT.md 7.1 and 8 instead of the Turkish ones (drop the İ/ı checks, the apostrophe rules and the Turkish question-particle rule; add the Turkmen ones); the six-column tm-wordlist.tsv with `sense`. Keep --batch, --index, --examples, --vocab, --progress, --strict, --quiet. The morphology checks stay switched off until TK-MORPH (say "engine not loaded" in the summary).
2. Create assets/js/turkmen.js by forking assets/js/turkish.js: window.TKM, storage keys tkm:v1:…, card directions tk-en and en-tk, no speech, the answer checker's Turkmen normalization and "almost" folds of TM-PROJECT.md 6.4, export `app: "daily-turkmen"` with import refusing a Daily Turkish file (and make the Turkish import refuse a Turkmen file, a one-line change in assets/js/turkish.js; run the Turkish tests after it).
3. Create scripts/turkmen/test.mjs by forking scripts/turkish/test.mjs, with Turkmen cases for the checker (missing marks, y/ý, the particle written apart, Turkish habits ı, ğ, v, c) and the scheduler unchanged.
4. Create assets/data/turkmen/levels/a1.json, a2.json and b1.json (titles and units from TM-CURRICULUM.md, summary and canDo written for Turkmen) and generate assets/data/turkmen/index.json with --index. Units not written yet are "planned", as in the Turkish index.
5. Write scripts/turkmen/README.md.
6. Run: node scripts/turkmen/validate.mjs, --examples, --index, node scripts/turkmen/test.mjs, node scripts/turkish/validate.mjs and node scripts/turkish/test.mjs (the Turkish course must be unchanged). Fix what fails; FC-1 must pass with zero errors.

Don't create pages, don't touch Turkish content. Work on the branch turkmen/tk-build-1 from main, commit, push it and open a pull request into main; don't merge it. Finish with a row in the progress log of turkmen/TM-PROJECT.md.
```

## 2 · TK-MORPH · Turkmen morphology engine

```text
This conversation is TK-MORPH of the Turkmen course (Daily Turkmen).

Read turkmen/TM-PROJECT.md in full, turkmen/TM-CURRICULUM.md (especially "How Turkmen differs", the coverage tables and "Open questions for native review"), and the "Morphology engine" part of turkish/PROJECT.md section 3, then assets/js/turkish-morph.js and scripts/turkish/morph-test.mjs to see how the Turkish engine is built.

Goal: assets/js/turkmen-morph.js (window.TKMMorph, also usable with require() in Node), a rule-based model of written Turkmen, and scripts/turkmen/morph-test.mjs with forms typed by hand.

Scope for now: everything A1 and A2 need. Front/back harmony and the Turkmen rounding rule; voicing of k, p, ç, t before vowels (with the long-vowel monosyllables, *at* → *ady*, from a word list); vowel loss (*ogul* → *ogly*) from a list; the five cases with the dative fusion after vowels (*Mara, ejä, okuwça*), the accusative and genitive after vowels (-ny, -nyň), the pronominal n, the pronoun irregulars (*maňa, saňa, oňa, muny*); possessives; plural; -dAky and -ky; the copula (zero, -dYr, the full endings), *däl*, the attached -mY; the verb forms -ýAr, -dY, -jAk, -Ar with -mAr/-mAz, -mAlY, -(Y)p, -(Y)p bilmek, the imperatives and optatives, -sYn, -(Y)p otyr/dur/ýatyr/ýör, -(Y)pdYr (first look) and the past copula; the stems that voice t to d (*gidýär, edýär, aýdýar, seredýär, eşidýär, äkidýär, öýdýär, gaýdýar*) from a closed list; e → ä in e-stems before -(Y)p, -An, -Ar, -mAň (*işläp, işlär, gelmäň*). Give every form a slug, as TRKMorph.form() does, so conjugate exercises can name it.

Settle the open questions 1 to 5 at the end of turkmen/TM-CURRICULUM.md as far as you can: check the orthographic and explanatory dictionaries and grammars you can reach, look for patterns in real Turkmen text you can reach (news sites in Turkmen, the Turkmen Wikipedia), and say plainly when you couldn't reach a source. Record each answer in TM-CURRICULUM.md and the spec, with what it was based on. Where you can't settle a point, make the engine accept both forms and list it for the native review.

Then hook the engine into scripts/turkmen/validate.mjs (conjugate and morph checks, as warnings, as in Turkish) and check the forms on the FC-1 cards (prs, past, aor, cvb, acc) against it: fix the cards or the engine, and log every disagreement.

Run morph-test.mjs, validate.mjs and test.mjs. Work on the branch turkmen/tk-morph from main, commit, push, open a pull request into main; don't merge. Finish with a row in the progress log.
```

## 3 · A1-1 · First content batch

```text
This conversation is content batch A1-1 of the Turkmen course (Daily Turkmen): units a1-u01, a1-u02 and a1-u03.

Read turkmen/TM-PROJECT.md in full, the A1 part and "How Turkmen differs" of turkmen/TM-CURRICULUM.md, the sections of turkish/PROJECT.md the Turkmen spec points to (5 schemas, 7 style rules), and the progress log. Look at one finished Turkish unit for the shape and level of detail (assets/data/turkish/units/a1-u02.json, its four lessons, grammar/a1-u02.json and culture/a1-u02.json), but write Turkmen content from scratch: don't translate Turkish lessons.

Write, for each unit: the grammar guide, then the four lessons, then the interlude, then the unit file, following turkmen/TM-PROJECT.md section 9. This is the first real Turkmen content, so it also tests the schemas: if a schema or validator rule turns out wrong for Turkmen, fix the spec and the validator together and log it.

Specific to this batch:
- a1-u01 teaches the alphabet with no audio: explain sounds with plain English comparisons (TM-PROJECT.md 7.2), and use exercises that train reading and spelling (y against ý, e against ä, ň, ž) instead of listening.
- Settle open question 2 (the copula in the first and second persons) before writing a1-u03, with the sources you can reach; teach what is most usual first, accept the other forms, and record the decision in TM-CURRICULUM.md.
- The interludes: Three alphabets in one century; The Akhal-Teke horse; Turkmen names. At least two reliable sources each, URLs checked.
- Set `unit` and `level` on the FC-1 cards these lessons teach first, and `card` on the matching vocab entries (turkish/PROJECT.md 7.8).

Run node scripts/turkmen/validate.mjs --batch A1-1 until there are no errors, then --index and test.mjs. Re-read every file from disk. In the log row, list every Turkmen form or word you weren't sure of, for the native review. Work on the branch turkmen/a1-1 from main, commit, push, open a pull request into main; don't merge.
```

## 4 · TK-BUILD-2 · Hub and lesson player

```text
This conversation is TK-BUILD-2 of the Turkmen course (Daily Turkmen).

Read turkmen/TM-PROJECT.md in full (sections 2, 3 and 6 above all), turkish/PROJECT.md sections 3 and 6, and the progress log. Then read turkish.html and turkishlesson.html.

Goal: turkmen/index.html (the hub) and turkmen/lesson.html (the lesson player), forked from turkish.html and turkishlesson.html, working with the Turkmen data already in assets/data/turkmen/.

- Fork, don't share: the pages load /assets/js/turkmen.js, never turkish.js. Relative links between Turkmen pages (lesson.html?id=…), root-absolute links to assets.
- Rebrand to Daily Turkmen: logo, favicon and share image (assets/img/daily-turkmen-*), title, meta, canonical and og tags for gregoiremaillard.com/turkmen/ (TK-PUBLISH adjusts for the mirror).
- Level colours, carpet göl pattern, tile wall of 36 units, and one character per level as proposed in TM-PROJECT.md section 3; check colour contrast in both themes and on the end screen. The characters' Turkmen lines are short and simple; list them in the log for the native review.
- Remove speech entirely (buttons, settings, autoplay) and the listen exercise type; add the Turkmen letter bar.
- No accounts: drop the sign-in dialog, the welcome card's account buttons and every call into turkish-account.js; keep export and import.
- A one-line beta notice on the hub (TM-PROJECT.md section 2), and a small link back to Daily Turkish in the header.

Test in Chromium with Playwright at 360 px and on desktop: a full lesson of a1-u01 with right, almost and wrong answers, the letter bar, a unit review, export and import, reduced motion, no console errors, no horizontal scroll, and the Turkish pages unchanged. Run validate.mjs and test.mjs. Work on the branch turkmen/tk-build-2 from main, commit, push, open a pull request into main with screenshots; don't merge. Finish with a row in the progress log.
```

## 5 · TK-BUILD-3 · Guide reader and flashcards page

```text
This conversation is TK-BUILD-3 of the Turkmen course (Daily Turkmen).

Read turkmen/TM-PROJECT.md in full, turkish/PROJECT.md sections 3 and 6, and the progress log. Then read turkishguide.html and turkishcards.html, and the Turkmen hub and player that TK-BUILD-2 made.

Goal: turkmen/guide.html (grammar guides, interludes, index of grammar points) and turkmen/cards.html (flashcard review, browse, stats, settings), forked from the Turkish pages, in the look TK-BUILD-2 set.

- The reader renders the `~…~` Turkish markup only in compare callouts, with lang="tr"; Turkmen with lang="tk". Segmented examples with the harmony colours; check that the colours read right for Turkmen's nine vowels (ä included).
- The flashcards page: directions tk-en and en-tk, no speech, the deck browser's search folds the Turkmen letters (searching "yok" finds "ýok"), the beta notice.
- Same tests as TK-BUILD-2 (360 px and desktop, both themes, reduced motion, no console errors, no horizontal scroll), plus a full review session of new FC-1 cards with Undo and Suspend, the stats view, and a guide and an interlude of A1-1 read to the end (marked read on the hub).

Run validate.mjs and test.mjs. Work on the branch turkmen/tk-build-3 from main, commit, push, open a pull request into main with screenshots; don't merge. Finish with a row in the progress log.
```

## 6 · TK-PUBLISH · Live at dailyturkish.app/turkmen/

```text
This conversation is TK-PUBLISH of the Turkmen course (Daily Turkmen).

Read turkmen/TM-PROJECT.md in full, the progress log, .github/workflows/sync-dailyturkish.yml, scripts/turkish/static.mjs (and the modules it imports) and scripts/sitemap/make-sitemap.mjs.

Goal: the Turkmen course goes live as a beta at dailyturkish.app/turkmen/ (and gregoiremaillard.com/turkmen/).

1. Extend the sync workflow: trigger on the Turkmen paths (turkmen/*.html, assets/js/turkmen*.js, assets/data/turkmen/**, assets/img/daily-turkmen-*, scripts/turkmen/static*.mjs) and copy them into the mirror at the same paths. The Turkish mirror must come out byte-identical for every Turkish file.
2. scripts/turkmen/static.mjs: pre-render each Turkmen guide and interlude to turkmen/guides/<id>.html and fill the hub, as the Turkish static.mjs does, so search engines read them without JavaScript; add the Turkmen URLs to the mirror's sitemap.xml. Canonical and og URLs on the mirror point to dailyturkish.app/turkmen/….
3. Links between the courses: a "Learn Turkmen" link on the Turkish hub (proposed to Grégoire in the pull request, one line, easy to remove) and the link back from the Turkmen header. The privacy page: link the Turkish one, adding a sentence that it covers both courses.
4. LICENSE.txt: a line for scripts/turkmen/tm-wordlist.tsv (CC BY-SA 4.0, adapted from the Turkish list, TM-PROJECT.md 7.8).
5. Run the workflow's build steps locally into a temporary folder and check: every Turkmen page renders, no broken links, the Turkish files unchanged, the sitemap valid.

Work on the branch turkmen/tk-publish from main, commit, push, open a pull request into main that explains what will happen on merge; don't merge. Finish with a row in the progress log.
```

## 7 · A1-2

```text
This conversation is content batch A1-2 of the Turkmen course (Daily Turkmen): units a1-u04, a1-u05 and a1-u06.

Read turkmen/TM-PROJECT.md in full, the A1 part and "How Turkmen differs" of turkmen/TM-CURRICULUM.md, the sections of turkish/PROJECT.md the Turkmen spec points to, and the progress log (especially what earlier batches decided and left open). Run node scripts/turkmen/validate.mjs --vocab to see which words are taught. Write from scratch in Turkmen; don't translate Turkish lessons.

For each unit write the grammar guide, the four lessons, the interlude and the unit file (TM-PROJECT.md section 9). Give every conjugate exercise a form slug the engine knows.

Specific to this batch: the question particle -mY is written attached, and the checker's "almost" for it written apart must be tested by at least one exercise; the present -ýAr (a1-u06) uses the engine's list of t → d stems, and any verb you need that isn't on the list is checked and added to the engine with a test. Interludes: Ependi; Ashgabat; Green tea and the çaýhana.

Set `unit` and `level` on the cards these lessons teach first, and `card` on the vocab entries. Run --batch A1-2 until clean, then --index, test.mjs and morph-test.mjs. Re-read every file. In the log row, list every Turkmen form you weren't sure of. Work on the branch turkmen/a1-2 from main, commit, push, open a pull request into main; don't merge.
```

## 8 · A1-3

```text
This conversation is content batch A1-3 of the Turkmen course (Daily Turkmen): units a1-u07, a1-u08 and a1-u09.

Read turkmen/TM-PROJECT.md in full, the A1 part and "How Turkmen differs" of turkmen/TM-CURRICULUM.md, the sections of turkish/PROJECT.md the Turkmen spec points to, and the progress log. Run node scripts/turkmen/validate.mjs --vocab. Write from scratch in Turkmen.

For each unit write the grammar guide, the four lessons, the interlude and the unit file (TM-PROJECT.md section 9).

Specific to this batch: the dative fusion after vowels (a1-u07) and voicing (a1-u08) are where learners from Turkish go wrong; give each a `compare` callout and `reject` entries with a why for the predictable mistakes (*Marya*, *mekdepe*, *kitapy*). The family words of a1-u09 (aga, uýa, jigi, daýy, daýza, bibi) need a clear table. Settle open question 5 (e → ä) for nouns before the dative if TK-MORPH didn't. Interludes: The Karakum; Bread and the tamdyr; The toý.

Set `unit` and `level` on the cards these lessons teach first, and `card` on the vocab entries. Run --batch A1-3 until clean, then --index, test.mjs and morph-test.mjs. Re-read every file. List uncertain forms in the log row. Work on the branch turkmen/a1-3 from main, commit, push, open a pull request into main; don't merge.
```

## 9 · A1-4

```text
This conversation is content batch A1-4 of the Turkmen course (Daily Turkmen): units a1-u10, a1-u11 and a1-u12, the end of A1.

Read turkmen/TM-PROJECT.md in full, the A1 part and "How Turkmen differs" of turkmen/TM-CURRICULUM.md, the sections of turkish/PROJECT.md the Turkmen spec points to, and the progress log. Run node scripts/turkmen/validate.mjs --vocab. Write from scratch in Turkmen.

For each unit write the grammar guide, the four lessons, the interlude and the unit file (TM-PROJECT.md section 9).

Specific to this batch: settle open question 7 (telling the time and age) before writing a1-u11, with the sources you can reach, and record it in TM-CURRICULUM.md; dates use ordinals with a hyphen (*27-nji*) and lowercase month names; prices in manat and teňňe. The imperative of a1-u12 includes the polite -(Y)ň and negative -mAň with e → ä (*gelmäň*). Interludes: The ak öý; Nowruz; Palow, dograma and gutap.

Set `unit` and `level` on the cards these lessons teach first, and `card` on the vocab entries. Run --batch A1-4 until clean, then --index, test.mjs and morph-test.mjs. Re-read every file. List uncertain forms in the log row. Work on the branch turkmen/a1-4 from main, commit, push, open a pull request into main; don't merge.
```

## 10 · FC-2 (and FC-3, FC-4, FC-5)

```text
This conversation is flashcard batch FC-2 of the Turkmen course (Daily Turkmen): ranks 201–400 of the deck.

Read turkmen/TM-PROJECT.md in full (5.8 and 7.8 above all), turkish/PROJECT.md 7.8, the progress log, and assets/data/turkmen/flashcards/tm-fc-0001-0200.json to match its style. The order is fixed by scripts/turkmen/tm-wordlist.tsv: write one card per row 201–400 into assets/data/turkmen/flashcards/tm-fc-0201-0400.json, with the same `source` text as FC-1.

Each card: up to four glosses, most common first; an original, natural example of at most 10 words in A1–A2 grammar, using the word in its most common sense; forms (verbs: prs, past, aor, cvb, checked against the morphology engine; nouns whose stem changes: acc); a note only for irregularities, register or a false friend with Turkish. Set `unit` and `level` for the words that the units already written teach (validate.mjs --vocab), and `card` on their vocab entries. If a row of the word list is wrong (spelling, part of speech, a word that shouldn't be in the deck), fix the row and the card together and log it; never renumber.

Run validate.mjs and --index until clean. Re-read the file. List uncertain forms and examples in the log row. Work on the branch turkmen/fc-2 from main, commit, push, open a pull request into main; don't merge.
```

For FC-3, FC-4 and FC-5, paste the same prompt with the batch name and ranks changed: FC-3 = ranks 401–600 (`tm-fc-0401-0600.json`), FC-4 = 601–800 (`tm-fc-0601-0800.json`), FC-5 = 801–1000 (`tm-fc-0801-1000.json`).

## 11 · TK-REVIEW, part 1 · Review pack for a native speaker

```text
This conversation is TK-REVIEW (export) of the Turkmen course (Daily Turkmen), for level <A1, A2 or B1>.

Read turkmen/TM-PROJECT.md in full (section 9, "Native review") and the progress log, especially the uncertain forms each batch listed.

Goal: a review pack a native Turkmen speaker can work through without knowing the site. Write a script, scripts/turkmen/review-export.mjs, that collects every Turkmen string of the level: lesson sentences and their accept lists (expanded), reject entries, guide examples and paradigms, interlude mini-reads, unit taglines, and the flashcards whose `level` is this level. One row per string, with its location (file and JSON path, hidden in a column the reviewer can ignore), the English beside it, and empty columns "OK?", "Correction" and "Comment". Put the uncertain forms from the log first, flagged. Output a .xlsx (or .csv if no library is available) in turkmen/review/, plus a one-page note in English and Turkmen for the reviewer explaining what to check (spelling, naturalness, whether an accepted answer is really right, register) and what not to bother with.

Don't change content. Work on the branch turkmen/review-<level>-export from main, commit, push, open a pull request into main; don't merge. Finish with a row in the progress log.
```

## 12 · TK-REVIEW, part 2 · Apply the corrections

```text
This conversation is TK-REVIEW (apply) of the Turkmen course (Daily Turkmen), for level <A1, A2 or B1>.

Read turkmen/TM-PROJECT.md in full and the progress log. The reviewer's filled-in sheet is attached to this message (or at turkmen/review/<file>).

Apply every correction to the content at the location in the sheet, and every "not OK" without a correction as a question for Grégoire at the end. When a correction reveals a rule (not a one-off), fix it everywhere it occurs, update the spec, the curriculum's open questions and the morphology engine with a test, and log it. When a correction would change an ID, don't: fix the content in place. Then run validate.mjs --index, test.mjs and morph-test.mjs.

If the whole level has now been reviewed, remove the beta notice for that level only (or tell Grégoire what to change if the notice is site-wide), and record the review (date, level, reviewer's initials) in the log. Work on the branch turkmen/review-<level>-apply from main, commit, push, open a pull request into main; don't merge.
```

## 13 · A2-1

```text
This conversation is content batch A2-1 of the Turkmen course (Daily Turkmen): units a2-u01, a2-u02 and a2-u03.

Read turkmen/TM-PROJECT.md in full, the A2 part and "How Turkmen differs" of turkmen/TM-CURRICULUM.md, the sections of turkish/PROJECT.md the Turkmen spec points to, and the progress log. Run node scripts/turkmen/validate.mjs --vocab. Write from scratch in Turkmen. A2 lessons have 5–8 new words each, and interlude mini-reads of 4–6 Turkmen sentences.

For each unit write the grammar guide, the four lessons, the interlude and the unit file (TM-PROJECT.md section 9).

Specific to this batch: the future -jAk has no personal ending, so the subject is required; apply the accept rule of TM-PROJECT.md 7.3 and reject subjectless answers with a why. *Eken* and the first look at -(Y)pdYr (a2-u02) are shown positive only, as the Turkish course did for -mIş; the full paradigm comes in b1-u03. The 1991 interlude is strictly factual and names no leaders. Interludes: 1991: independence and neutrality; Turkmen folk tales; Ancient Merv.

Set `unit` and `level` on the cards these lessons teach first, and `card` on the vocab entries. Run --batch A2-1 until clean, then --index, test.mjs and morph-test.mjs. Re-read every file. List uncertain forms in the log row. Work on the branch turkmen/a2-1 from main, commit, push, open a pull request into main; don't merge.
```

## 14 · A2-2

```text
This conversation is content batch A2-2 of the Turkmen course (Daily Turkmen): units a2-u04, a2-u05 and a2-u06.

Read turkmen/TM-PROJECT.md in full, the A2 part and "How Turkmen differs" of turkmen/TM-CURRICULUM.md, the sections of turkish/PROJECT.md the Turkmen spec points to, and the progress log. Run node scripts/turkmen/validate.mjs --vocab. Write from scratch in Turkmen.

For each unit write the grammar guide, the four lessons, the interlude and the unit file (TM-PROJECT.md section 9).

Specific to this batch: settle open question 3 (the negative of the general present -Ar and its question forms) before writing a2-u04, with the sources you can reach, and record it; a2-u04 must make the choice between -ýAr and -Ar clear with many contrasting pairs. The necessity -mAlY (a2-u06) has no personal ending, like -jAk. Interludes: Turkmen carpets; Göreş and horse races; Visiting a Turkmen home.

Set `unit` and `level` on the cards these lessons teach first, and `card` on the vocab entries. Run --batch A2-2 until clean, then --index, test.mjs and morph-test.mjs. Re-read every file. List uncertain forms in the log row. Work on the branch turkmen/a2-2 from main, commit, push, open a pull request into main; don't merge.
```

## 15 · A2-3

```text
This conversation is content batch A2-3 of the Turkmen course (Daily Turkmen): units a2-u07, a2-u08 and a2-u09.

Read turkmen/TM-PROJECT.md in full, the A2 part and "How Turkmen differs" of turkmen/TM-CURRICULUM.md, the sections of turkish/PROJECT.md the Turkmen spec points to, and the progress log. Run node scripts/turkmen/validate.mjs --vocab. Write from scratch in Turkmen.

For each unit write the grammar guide, the four lessons, the interlude and the unit file (TM-PROJECT.md section 9).

Specific to this batch: settle open question 8 (which set wishes are current, and when each is said) before writing a2-u07, and teach only formulas you can confirm. The place nouns of a2-u09 combine possessive, pronominal n and case (*öýüň öňünde*, *stoluň üstüne*): check each form with the engine, including the rounding rule. Interludes: Küştdepdi; Five welaýats; Gonur Depe.

Set `unit` and `level` on the cards these lessons teach first, and `card` on the vocab entries. Run --batch A2-3 until clean, then --index, test.mjs and morph-test.mjs. Re-read every file. List uncertain forms in the log row. Work on the branch turkmen/a2-3 from main, commit, push, open a pull request into main; don't merge.
```

## 16 · A2-4

```text
This conversation is content batch A2-4 of the Turkmen course (Daily Turkmen): units a2-u10, a2-u11 and a2-u12, the end of A2.

Read turkmen/TM-PROJECT.md in full, the A2 part and "How Turkmen differs" of turkmen/TM-CURRICULUM.md, the sections of turkish/PROJECT.md the Turkmen spec points to, and the progress log. Run node scripts/turkmen/validate.mjs --vocab. Write from scratch in Turkmen.

For each unit write the grammar guide, the four lessons, the interlude and the unit file (TM-PROJECT.md section 9).

Specific to this batch: the progressive with otyr, dur, ýatyr and ýör (a2-u11) needs the engine's support for the posture verbs' own present forms; from this unit on, accept lists for English present continuous take both -ýAr and the progressive where natural (TM-PROJECT.md 7.3). -kA (a2-u11) and the diminutives (a2-u12) are the least documented points of the level: say what you based them on. Interludes: The telpek and Turkmen dress; Görogly; The Tolkuçka bazaar.

Set `unit` and `level` on the cards these lessons teach first, and `card` on the vocab entries. Run --batch A2-4 until clean, then --index, test.mjs and morph-test.mjs. Re-read every file. List uncertain forms in the log row. Work on the branch turkmen/a2-4 from main, commit, push, open a pull request into main; don't merge.
```

## 17 · QA-TK-1 · After A2

```text
This conversation is QA-TK-1 of the Turkmen course (Daily Turkmen), after A1 and A2 are written.

Read turkmen/TM-PROJECT.md in full, turkmen/TM-CURRICULUM.md, and the whole progress log; read what QA-1 did for the Turkish course in turkish/PROJECT.md's log and section 7.3 (the gaps it found).

1. Play through every A1 and A2 lesson in Chromium with Playwright, answering each exercise with its canonical answer, with one common variant (pronoun added or dropped, sen/siz, -ýAr/-Ar, word order) and with one predictable mistake; list every verdict that is wrong and fix the accept and reject lists.
2. Check the pronoun rule of TM-PROJECT.md 7.3 on every -jAk and -mAlY sentence, and the "almost" folds on a sample of typed answers.
3. Extend assets/js/turkmen-morph.js to the B1 forms of the coverage table (compound tenses, the full -(Y)pdYr, eken after participles, -dYr, the conditionals, participles, verbal nouns, converbs, voices), with tests; settle open question 6.
4. Fill `unit` and `level` on every card the A1–A2 lessons teach, and `card` on their vocab entries.
5. Update TM-PROJECT.md with what this pass taught (as QA-1 did for Turkish).

Run validate.mjs --strict, test.mjs and morph-test.mjs. Work on the branch turkmen/qa-tk-1 from main, commit, push, open a pull request into main; don't merge. Finish with a row in the progress log.
```

## 18 · B1-1

```text
This conversation is content batch B1-1 of the Turkmen course (Daily Turkmen): units b1-u01, b1-u02 and b1-u03.

Read turkmen/TM-PROJECT.md in full, the B1 part and "How Turkmen differs" of turkmen/TM-CURRICULUM.md, the sections of turkish/PROJECT.md the Turkmen spec points to, and the progress log. Run node scripts/turkmen/validate.mjs --vocab. Write from scratch in Turkmen. From B1, each unit has at least one `reading` exercise, guides run 1,200–2,500 words, and interludes are parallel Turkmen and English paragraphs (300–500 words in each language).

For each unit write the grammar guide, the four lessons, the interlude and the unit file (TM-PROJECT.md section 9).

Specific to this batch: b1-u03 gives the full -(Y)pdYr paradigm (open question 6, settled in QA-TK-1) and the contrast with -dY through short scenes where the speaker saw or didn't see the event. Interludes: The Seljuks; Herders and oasis farmers; Ancient Nisa; history needs two reliable sources and attributed views where accounts differ.

Set `unit` and `level` on the cards these lessons teach first, and `card` on the vocab entries. Run --batch B1-1 until clean, then --index, test.mjs and morph-test.mjs. Re-read every file. List uncertain forms in the log row. Work on the branch turkmen/b1-1 from main, commit, push, open a pull request into main; don't merge.
```

## 19 · B1-2

```text
This conversation is content batch B1-2 of the Turkmen course (Daily Turkmen): units b1-u04, b1-u05 and b1-u06.

Read turkmen/TM-PROJECT.md in full, the B1 part and "How Turkmen differs" of turkmen/TM-CURRICULUM.md, the sections of turkish/PROJECT.md the Turkmen spec points to, and the progress log. Run node scripts/turkmen/validate.mjs --vocab. Write from scratch in Turkmen.

For each unit write the grammar guide, the four lessons, the interlude and the unit file (TM-PROJECT.md section 9).

Specific to this batch: the participles are where Turkmen differs most from Turkish (-An for both subject and object relatives, the possessive on the noun: *meniň okan kitabym*); give learners who know Turkish a compare callout and reject the Turkish-style forms with a why. Fact clauses with -dYgY (b1-u06) need many examples with *bilmek*, *eşitmek*, *aýtmak*. Interludes: Bagşy and the dutar; Magtymguly Pyragy; Kemine and Mollanepes. Quote only public-domain poetry (TM-PROJECT.md 7.7), with our own translations.

Set `unit` and `level` on the cards these lessons teach first, and `card` on the vocab entries. Run --batch B1-2 until clean, then --index, test.mjs and morph-test.mjs. Re-read every file. List uncertain forms in the log row. Work on the branch turkmen/b1-2 from main, commit, push, open a pull request into main; don't merge.
```

## 20 · B1-3

```text
This conversation is content batch B1-3 of the Turkmen course (Daily Turkmen): units b1-u07 and b1-u08.

Read turkmen/TM-PROJECT.md in full, the B1 part and "How Turkmen differs" of turkmen/TM-CURRICULUM.md, the sections of turkish/PROJECT.md the Turkmen spec points to, and the progress log. Run node scripts/turkmen/validate.mjs --vocab. Write from scratch in Turkmen.

For each unit write the grammar guide, the four lessons, the interlude and the unit file (TM-PROJECT.md section 9).

Specific to this batch: converbs are best taught through short connected stories; each lesson's last exercises use a `reading` passage that strings several of them together. The helper verbs of b1-u08 (-(Y)p görmek, bermek, almak, goýmak, goýbermek) change meaning subtly: give each a table of examples with English that shows the nuance, and accept answers fairly where English can't show it. Interludes: Köneürgenç; Gorkut Ata.

Set `unit` and `level` on the cards these lessons teach first, and `card` on the vocab entries. Run --batch B1-3 until clean, then --index, test.mjs and morph-test.mjs. Re-read every file. List uncertain forms in the log row. Work on the branch turkmen/b1-3 from main, commit, push, open a pull request into main; don't merge.
```

## 21 · B1-4

```text
This conversation is content batch B1-4 of the Turkmen course (Daily Turkmen): units b1-u09 and b1-u10.

Read turkmen/TM-PROJECT.md in full, the B1 part and "How Turkmen differs" of turkmen/TM-CURRICULUM.md, the sections of turkish/PROJECT.md the Turkmen spec points to, and the progress log. Run node scripts/turkmen/validate.mjs --vocab. Write from scratch in Turkmen.

For each unit write the grammar guide, the four lessons, the interlude and the unit file (TM-PROJECT.md section 9).

Specific to this batch: real conditions in Turkmen go through *bolsa* after participles (*gelýän bolsaň*), unlike Turkish tense + -sA; unreal conditions and *kaşki* complete the picture since B2 isn't planned yet. The Darvaza interlude separates what is documented from what is told, with attributed accounts; the Karakum Canal interlude states its effects (including on the Aral Sea basin) factually, with sources. Interludes: Darvaza; The Karakum Canal.

Set `unit` and `level` on the cards these lessons teach first, and `card` on the vocab entries. Run --batch B1-4 until clean, then --index, test.mjs and morph-test.mjs. Re-read every file. List uncertain forms in the log row. Work on the branch turkmen/b1-4 from main, commit, push, open a pull request into main; don't merge.
```

## 22 · B1-5

```text
This conversation is content batch B1-5 of the Turkmen course (Daily Turkmen): units b1-u11 and b1-u12, the end of B1.

Read turkmen/TM-PROJECT.md in full, the B1 part and "How Turkmen differs" of turkmen/TM-CURRICULUM.md, the sections of turkish/PROJECT.md the Turkmen spec points to, and the progress log. Run node scripts/turkmen/validate.mjs --vocab. Write from scratch in Turkmen.

For each unit write the grammar guide, the four lessons, the interlude and the unit file (TM-PROJECT.md section 9).

Specific to this batch: the causative suffixes are partly lexical; check every causative you use with the engine and a dictionary, and add the ones it lacks with tests. The interlude on Turkmen among the Turkic languages is written for learners who may know Turkish: a table of look-alike words with different meanings is welcome, and every claim about sound history needs a source. The proverbs interlude quotes only traditional proverbs, with our own translations and an explanation of use. Interludes: Turkmen among the Turkic languages; Turkmen proverbs.

Set `unit` and `level` on the cards these lessons teach first, and `card` on the vocab entries. Run --batch B1-5 until clean, then --index, test.mjs and morph-test.mjs. Re-read every file. List uncertain forms in the log row. Work on the branch turkmen/b1-5 from main, commit, push, open a pull request into main; don't merge.
```

## 23 · QA-TK-2 · After B1

```text
This conversation is QA-TK-2 of the Turkmen course (Daily Turkmen), after B1 is written.

Read turkmen/TM-PROJECT.md in full, turkmen/TM-CURRICULUM.md and the whole progress log.

1. Repeat the play-through of QA-TK-1 for every B1 lesson (canonical answer, a common variant, a predictable mistake per exercise) and fix the accept and reject lists.
2. Full validation with --strict; every cross-link between units, guides, grammar points and cards resolves; every card has `unit` and `level` where a lesson teaches it.
3. Mobile and accessibility pass over the four Turkmen pages (360 px, keyboard only, screen-reader labels, contrast in both themes, reduced motion), as QA-2 did for Turkish.
4. The sitemap and the pre-rendered guides include every B1 guide and interlude.
5. Turn the morphology engine's warnings into errors if no batch since QA-TK-1 produced one (as the Turkish spec planned).
6. Update the README and TM-PROJECT.md with what this pass taught, and list what the native review of A2–B1 should look at first.

Work on the branch turkmen/qa-tk-2 from main, commit, push, open a pull request into main; don't merge. Finish with a row in the progress log.
```

## 24 · SEO-TK · Conjugation pages, word lists and cheat sheet

```text
This conversation is SEO-TK of the Turkmen course (Daily Turkmen).

Read turkmen/TM-PROJECT.md in full, the progress log, and the SEO rows of turkish/PROJECT.md's log (SEO-8 above all); then scripts/turkish/static-verbs.mjs, scripts/turkish/static-cheatsheet.mjs and the word-list pages the Turkish static build makes.

Goal: the same three things for Turkmen, built at mirror time by scripts/turkmen/static*.mjs from the data and the engine:
- turkmen/verbs/<verb>.html for the 100 most frequent verbs of the deck: key forms, notes (t → d, e → ä, irregulars), the card's example, and tables for every A1–B1 form of the coverage table, each linked to its guide section. Titles like "Gelmek conjugation in Turkmen (to come)".
- turkmen/words/ pages of the 1,000-word deck by hundreds, each verb linked to its conjugation page.
- turkmen/grammar-cheat-sheet.html: cases, possessives, the copula, every tense, with examples built by the engine.

Breadcrumbs, share images, sitemap entries, no broken links, no horizontal scroll at 390 px. Check a sample of verb tables against the cards and against the native review's corrections. Work on the branch turkmen/seo-tk from main, commit, push, open a pull request into main; don't merge. Finish with a row in the progress log.
```

---

Later, when the course has proven itself: accounts and sync (port ACCT-1 with a separate progress column, so one account carries both courses), recorded audio with a native speaker (adds an `audio` field and the `listen` exercise type back), B2 and up (plan them in TM-CURRICULUM.md first), and the iOS app. Each needs its own planning conversation; ask for a prompt when the time comes.
