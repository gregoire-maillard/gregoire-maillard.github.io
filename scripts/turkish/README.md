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
- **Answers**: the `[a|b]`, `(a)` syntax of accepted answers, the plain canonical `accept[0]`, duplicates, rejected answers that are also accepted, `cloze` blanks, `wordbank` tiles, `morph` parts, `match` pairs, `listen` options.
- **Turkish text**: NFC, no U+0307 (from lowercasing İ without the Turkish locale), the `'` apostrophe, inline markup, `seg` segmentation; warnings for a likely mistyped dotless *I* (*Istanbul*), a question particle glued to its verb, non-Turkish letters, and sentences that start in lowercase.
- **Targets** (warnings): lesson sizes and exercise mixes, guide and interlude lengths, interlude sources, flashcard examples that don't contain their word.
- **index.json**: up to date with the content (rewrite it with `--index`, which refuses while there are errors).

## Tests for turkish.js

`test.mjs` tests `assets/js/turkish.js`, the script every page of the section shares: the answer checker (PROJECT.md 6.4), the flashcard scheduler (6.6) and the progress logic around them (5.9, 6.1, 6.3). Node 18 or later, no dependencies:

```
node scripts/turkish/test.mjs            # exit 1 on a failure
node scripts/turkish/test.mjs --verbose  # also list the tests that pass
```

Besides hand-written cases it marks every accepted answer in the content correct and every rejected one wrong with its feedback, renders every Rich text and every `seg` (which must read back as its own text) and resolves every link, compares the checker's normalization with this validator's (taken from its source), runs `validate.mjs --progress` on an exported file, and repeats the date tests under America/Toronto and Australia/Lord_Howe.

A content conversation is done when `--batch <id>` reports its units complete with no errors and `--index` has been run. See `turkish/PROJECT.md`, section 9.
