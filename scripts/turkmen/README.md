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
- **Answers**: the `[a|b]`, `(a)` syntax of accepted answers, the plain canonical `accept[0]`, duplicates, rejected answers that are also accepted (or that differ from an accepted one only by the marks the checker folds), `cloze` blanks, `wordbank` tiles, `morph` parts, `match` pairs. A warning when the canonical Turkmen answer has a clause in -jAk or -mAlY with no subject (TM-PROJECT.md 7.3).
- **Turkmen text** (TM-PROJECT.md 7.1): NFC, no combining marks; **errors** for ı, ğ, İ, â, î, û, which are not Turkmen letters; **warnings** for other non-Turkmen letters (c, q, v, x…, with a hint for c and v), any apostrophe, the question particle written apart (*talyp my*), *y* and *ý* that look swapped (*ý* between two consonants, *y* before a vowel at the start of a word, *y* right after a vowel), and sentences that start in lowercase.
- **Markup**: `*…*` is Turkmen (checked as such); `**…**`, `` `…` `` and `[label](ref)` as in the Turkish course. There is no markup for Turkish words: the course is for English speakers starting from zero and never compares Turkmen with Turkish, so the word "Turkish" in learner-facing English text is a warning for the writer to check (TM-PROJECT.md 1 and 8).
- **Targets** (warnings): lesson sizes and exercise mixes (four types, translation in both directions), guide and interlude lengths, interlude sources, flashcard examples that don't contain their word or one of its forms, a flashcard `level` that differs from its unit's level, internal IDs in learner-facing text, `wordbank` alternatives without final punctuation.
- **Flashcards**: verbs as infinitives in -mak/-mek with `forms.prs`, `past`, `aor` and `cvb`; files named `tm-fc-NNNN-NNNN.json` after their rank range.
- **index.json**: up to date with the content (rewrite it with `--index`, which refuses while there are errors). Units without a unit file are `planned`.
- **Morphology**: not yet. The Turkish validator compares every `conjugate` cell and `morph` tile with its morphology engine; TK-MORPH writes `assets/js/turkmen-morph.js` and hooks it in here. Until then the summary line says "morphology engine not loaded" and counts the exercises it didn't check.
- **Word list**: `tm-wordlist.tsv` well formed (below), and every flashcard's `tk`, `pos` and `sense` equal to its rank's row.
- **Progress files** (`--progress`): the export format of TM-PROJECT.md 5.9 (`app: "daily-turkmen"`, card keys `fc-0042:tk-en` and `fc-0042:en-tk`, settings without speech). A Daily Turkish file is refused with its own message.

## The word list

`tm-wordlist.tsv` is the ranked list of the 1,000 lemmas of the flashcard deck, in the order the five flashcard batches follow: UTF-8, LF line endings, a header row and one tab-separated row per rank with `rank`, `lemma`, `pos`, `sense` (empty, or 1, 2… when the same lemma and part of speech appear twice, as *at* "name" and *at* "horse"), `gloss` (short, for reviewers) and `tr` (the Turkish lemma the row was matched to, or `+` for an added word). Its order is adapted from the Daily Turkish deck, itself adapted from the 2018 Turkish list of [FrequencyWords](https://github.com/hermitdave/FrequencyWords) by Hermit Dave (OpenSubtitles2018), so it is licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) like its source. The ranks are an editorial estimate, not a Turkmen corpus count; how the list was made is in `turkmen/TM-PROJECT.md`, section 7.8.

## Tests for turkmen.js

`test.mjs` tests `assets/js/turkmen.js`, the script every page of the course will share (`window.TKM`): the answer checker (TM-PROJECT.md 6.4), the flashcard scheduler with its undo, suspending and statistics (6.6, unchanged from the Turkish course), and the progress logic around them (5.9, 6.1, 6.3). Node 18 or later, no dependencies:

```
node scripts/turkmen/test.mjs            # exit 1 on a failure
node scripts/turkmen/test.mjs --verbose  # also list the tests that pass
```

The checker cases cover what is particular to Turkmen: plain lowercasing (no dotted and dotless i pair; a stray U+0307 is still removed), the eight Turkmen letters typed without their marks (*cay* for *çaý*, *yok* for *ýok*), which is "almost" in lenient mode and wrong in strict mode; e and ä, ç and j never folded together; letters outside the Turkmen alphabet never folded (*yıl*, *dağ*, *cogap* are wrong); the question particle typed apart (*talyp my*, *talyp mydyň*), "almost" in both modes; an apostrophe left in (*Aşgabat'da*), "almost". The checker's notes are `apostrophe`, `Turkmen letters`, `particle` and, for English, `typo`.

Besides hand-written cases it marks every accepted answer in the content correct and every rejected one wrong with its feedback, renders every Rich text (flashcard notes included) and every `seg` (which must read back as its own text) and resolves every link, compares the checker's normalization, fold and particle joining with this validator's (taken from its source), runs `validate.mjs --progress` on an exported file and on a Daily Turkish one, and repeats the date tests under America/Toronto and Australia/Lord_Howe. While units are unwritten, the path and link tests use a copy of `index.json` with the first three units marked ready.

`turkmen.js` has the members of the Turkish `TRK` minus speech, renamed for Turkmen: `tkLower`, `tkUpper`, `tkRich`, the CSS classes `tkm-nw`, `tkm-seg` and `tkm-soon`, achievements with a `tk` name, plus `joinParticle`. Its page links are relative to `/turkmen/` (`index.html`, `lesson.html`, `guide.html`, `cards.html`).

A content conversation is done when `--batch <id>` reports its units complete with no errors and `--index` has been run. See `turkmen/TM-PROJECT.md`, section 9.
