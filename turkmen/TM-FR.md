# Turkmen course in French · Spec

The spec of the French edition of Daily Turkmen (*Daily Turkmen en français*): the same Turkmen course, for French speakers. Every conversation of [TM-FR-PROMPTS.md](TM-FR-PROMPTS.md) reads this file in full first, then what its prompt names, and ends with a row in the log at the bottom (section 16).

**How this file relates to the others.** The English edition stays the source of truth for everything Turkmen: [TM-PROJECT.md](TM-PROJECT.md) (schemas, Turkmen rules, checker, workflow), [TM-CURRICULUM.md](TM-CURRICULUM.md) (registry, scope) and the content in `assets/data/turkmen/`. This file says how the same course reaches French speakers: addresses, pages and interface strings, the French data tree, the French answer checker, the flashcard directions, French style, and the parity check that keeps the Turkmen identical. Where this file says nothing, TM-PROJECT.md applies, reading "English" as "French" wherever it means the learner's language. Where the two differ for the French edition, this file wins.

FR-SPEC (2026-11-26) took every decision below from the code as it stands after TK-AUDIT (`main` at 3aa65ff). FR-BUILD-1 and FR-BUILD-2 build them; a build conversation that finds a decision unworkable changes it here, with its reason, and logs it. Each decision is followed by its reason (**Why**).

**Contents:** 1 Rules · 2 Decisions at a glance · 3 Addresses · 4 Pages and interface strings · 5 Data · 6 What gets translated · 7 French answers · 8 Flashcards · 9 The morphology engine · 10 Validation and parity · 11 Style guide · 12 Glossary · 13 French registry · 14 Notes for French writers · 15 Workflow · 16 Progress log

## 1. Rules

The rules of TM-FR-PROMPTS.md, as this spec applies them:

- **Adapt, don't translate word for word.** Explanations written for English speakers are rewritten for French speakers: sounds compared with French words, grammar explained from French grammar with its school terms, pitfalls that French speakers meet (sections 11 and 14). As in English, Turkmen is never taught by bridging from Turkish.
- **The Turkmen never changes.** Every Turkmen string, ID, exercise structure and Turkmen-side answer key is identical to the English edition. `validate.mjs --lang fr` checks it (10.2), and a Turkmen correction reaches the French files by script (`--sync`, 10.1).
- **French style**: tutoiement, short sentences, French typography, both genders where needed (section 11).
- **French answers are checked leniently** (section 7): case, spaces, apostrophes, *œ*, elision, an article left out or added are right; a missing accent is "almost".
- **Progress is shared**: one progress store, one export file, one account row, the same IDs (5.4); the flashcards keep one schedule per direction (section 8).
- **Nothing French is visible to learners before FR-PUBLISH** (3.4).

## 2. Decisions at a glance

| # | Topic | Decision | Section |
|---|---|---|---|
| 1 | Addresses | `gregoiremaillard.com/turkmen/fr/` and `dailyturkmen.app/fr/`, every page at its English path plus `fr/`; hreflang both ways; a two-letter switch in the header | 3 |
| 2 | Pages | One source per page in `turkmen/`; `scripts/turkmen/pages.mjs` writes `turkmen/fr/*.html` from it and from `assets/data/turkmen/i18n/en.json` and `fr.json`; nobody edits a generated file | 4 |
| 3 | Field names | The French tree says `fr` where the English says `en` (keys and the `"en"` value of `from`, `optionsLang`, table columns, culture `format`) | 5.2 |
| 4 | Untranslated files | No English content on French pages: « Bientôt disponible en français », with a link to the same ID in the English edition; only interface strings fall back to English, key by key | 5.3 |
| 5 | Checker | `check(…, "fr")`: normalization, an article rule, then "almost" for accents, a missing *ne* and one typo | 7 |
| 6 | Flashcards | `tk-fr` and `fr-tk`, scheduled apart from `tk-en` and `en-tk`, on the same card IDs | 8 |
| 7 | Engine | `turkmen-morph.js` shows no English to learners; no change | 9 |
| 8 | Validator | `--lang fr`: the same schema rules on the French tree, parity with the English, French typography; `--sync` and `--fix` | 10 |
| 9 | French | French of France, France's typography, `fr-FR` for numbers and dates | 11 |
| 10 | iPhone app | Stays English for now; its build (`app-turkmen/`) keeps working and leaves the French files out | 4.5 |

## 3. Addresses

### 3.1 The French addresses

| English | French | Made by |
|---|---|---|
| `/turkmen/` (`dailyturkmen.app/`) | `/turkmen/fr/` (`dailyturkmen.app/fr/`) | pages.mjs |
| `lesson.html?id=a1-u01-l01`, `?review=`, `?test=`, `?practice=mistakes` | `fr/lesson.html` with the same query | pages.mjs |
| `guide.html?id=a1-u01-grammar`, `guide.html` (index) | `fr/guide.html…` | pages.mjs |
| `cards.html?view=browse&q=…` | `fr/cards.html…` | pages.mjs |
| `privacy.html` | `fr/privacy.html` | by hand (FR-PUBLISH) |
| mirror: `guides/<id>.html` | `fr/guides/<id>.html` | static.mjs (FR-PUBLISH) |
| mirror: `verbs/`, `words/`, `grammar-cheat-sheet.html` | `fr/verbs/<same file>.html`, `fr/words/…`, `fr/grammar-cheat-sheet.html` | static*.mjs (FR-SEO) |
| mirror: `404.html` | the same page, in French when the path starts with `/fr/` | FR-PUBLISH |

**Decision:** every French page is its English page's path with `fr/` after the course folder, with the same file name and query string. **Why:** the pages link to each other relatively (`lesson.html?id=…`, TM-PROJECT.md 3), so a copy in `fr/` links to its French siblings unchanged, the IDs are shared, and the switch and hreflang are a path edit. (FR-SEO's prompt names the cheat sheet `aide-memoire-grammaire.html`; this spec keeps `grammar-cheat-sheet.html` so the rule has no exception. The French words that searches match go in the page's title and heading.)

There is no `fr/404.html`: GitHub Pages serves only the root `404.html`, so that page reads its path. The mirror moves `turkmen/fr/` to `/fr/` with the rest of `turkmen/` (`sync-dailyturkmen.yml`); nothing at the root is called `fr`, so the move's clash check passes.

### 3.2 Language, canonical, hreflang

- `<html lang="fr">` on every French page; Turkmen keeps `lang="tk"`; an English word inside French text, if one is ever needed, gets `lang="en"`.
- `canonical` and `og:url` point to `https://dailyturkmen.app/fr/…` on both hosts, as the English ones point to `dailyturkmen.app`. A static guide's canonical is `https://dailyturkmen.app/fr/guides/<id>.html`.
- `<link rel="alternate" hreflang="en|fr|x-default">` (x-default = English) on every page that exists in both editions; an English guide gets its French alternate only once the French guide is written (static.mjs knows), and the sitemap lists the French URLs with their alternates. **Why:** an alternate that points to « Bientôt disponible » is a page search engines would drop.
- `og:image:alt`, title and description in French; if the share image `daily-turkmen-share.png` has English words on it, FR-PUBLISH draws a French one (`daily-turkmen-share-fr.png`).

### 3.3 The language switch

- **Decision:** a two-letter link in the header bar of the four pages, « EN » on French pages and "FR" on English ones (`lang` and `hreflang` set, accessible name « English version » / « Version française »), before the hairline and the Daily Turkish mark. It opens the same page with the same query and hash in the other edition. The bar must still fit at 320 px (TM-PROJECT.md 3, QA-TK-2). **Why:** the header is the only place on every page, and two letters are the narrowest label that names both languages.
- The choice is kept in `localStorage` `tkm:v1:edition` (`"en"` or `"fr"`), outside the progress and its export, like `tkm:v1:avatar`. It is read in one place: the English hub, opened from outside the site (no same-site referrer) by a browser whose stored choice is `"fr"`, replaces itself with the French hub. Using the switch updates the stored choice first, so it never bounces. **Why:** a learner who chose French and types dailyturkmen.app lands in French, while links, shared addresses and search engines (which store nothing) always get the page they asked for.
- No redirect from the browser's language. Instead, once French is live, an English page opened by a browser whose first language is French shows a one-line notice, « Ce cours existe en français → », until dismissed. **Why:** redirecting by language hides the English pages from French-language browsers and from crawlers that send such headers.
- The Daily Turkish mark stays on French pages, titled « Daily Turkish, le cours de turc (en anglais) ». **Why:** Daily Turkish has no French edition, and the title says so before the click.

### 3.4 Before FR-PUBLISH

gregoiremaillard.com serves whatever is pushed, so pages pushed after FR-BUILD-2 are reachable at `/turkmen/fr/` before any French unit exists. **Decision:** one switch, `"_live": false` in `i18n/fr.json`, until FR-PUBLISH sets it to `true`: while it is false, pages.mjs writes `noindex` into every French page and leaves the switch, the French-browser notice and the hreflang links out of the English pages. The mirror doesn't copy `turkmen/fr/` until FR-PUBLISH changes `sync-dailyturkmen.yml` (it copies `turkmen/*.html` today). **Why:** the plan keeps French out of learners' sight until the A1 pilot is reviewed, and a flag in one file is one line for FR-PUBLISH to change.

## 4. Pages and interface strings

### 4.1 One source per page

**Decision:** the four pages stay single sources in `turkmen/`: `index.html`, `lesson.html`, `guide.html`, `cards.html`. A new script, `scripts/turkmen/pages.mjs` (FR-BUILD-1; Node, no dependencies), writes the strings into them and writes `turkmen/fr/` from them. Pages are edited only in `turkmen/`, strings only in the two JSON files. **Why:** GitHub Pages serves gregoiremaillard.com straight from the repo with no build step, so every French address needs a real file; generating that file, as `--index` generates `index.json`, keeps one source for the 5,700 lines of the four pages.

**Rejected:** thin wrappers that load the page's code from a shared file. The pages' code is inline (a `<script>` of 500 to 1,050 lines and three or four `<style>` blocks each); moving it into `assets/js/` would rewrite every page, `static.mjs` (which edits the page sources in the mirror) and the SEO pages' frame (taken from `cards.html`), for nothing generation doesn't give.

```
node scripts/turkmen/pages.mjs           # fill the strings into turkmen/*.html and write turkmen/fr/*.html
node scripts/turkmen/pages.mjs --check   # exit 1 if a page or a generated file is out of date (test.mjs runs it)
node scripts/turkmen/pages.mjs --preview <folder>   # write the French pages to another folder, for a look
```

FR-BUILD-1 built the first half: `pages.mjs` fills the strings into `turkmen/*.html` (and `404.html`), checks them, and writes French pages only with `--preview`; FR-BUILD-2 makes it write `turkmen/fr/` (with the French head, `noindex` while `_live` is false, the switch and hreflang).

### 4.2 What each `turkmen/fr/` file contains

| File | Contents | Made by |
|---|---|---|
| `fr/index.html` | The hub: `turkmen/index.html` with `<html lang="fr">`, the French head (title, description, canonical, og, hreflang; `noindex` while `_live` is false), every marked text of the markup in French, and the French strings block | pages.mjs |
| `fr/lesson.html` | The lesson player, made the same way from `turkmen/lesson.html` | pages.mjs |
| `fr/guide.html` | The reader and guide index, from `turkmen/guide.html` | pages.mjs |
| `fr/cards.html` | The flashcards page, from `turkmen/cards.html` | pages.mjs |
| `fr/privacy.html` | The privacy policy in French, saying what `privacy.html` says (the iPhone app included); its frame (head, styles, the brand link) copied from `privacy.html` | by hand (FR-PUBLISH) |

Everything else is the same in both editions: the scripts (`/assets/js/turkmen.js`, `turkmen-account.js`, root-absolute), the styles, the icons, the gtag snippet. In the mirror, static.mjs adds `fr/guides/<id>.html` (FR-PUBLISH), and the SEO scripts add `fr/verbs/`, `fr/words/` and `fr/grammar-cheat-sheet.html` (FR-SEO). A change to what the pages store or send updates both privacy pages (TM-PROJECT.md 3, "Privacy").

### 4.3 How the edition reaches the code

- **Decision:** `turkmen.js` reads the edition from `<html lang>`: `"fr"` is French, anything else English. It sets `C.EDITION` (`"en"` or `"fr"`), the data folder (`/assets/data/turkmen/` or `/assets/data/turkmen/fr/`), the card directions (section 8) and the checker's learner language (section 7). **Why:** the generated page carries the language of its folder, so the path decides, without URL parsing that would differ between `/turkmen/fr/`, `dailyturkmen.app/fr/` and the static guides one folder down.
- `TKM.t(key, vars)` returns a string; `TKM.num(n)` and `TKM.date(day, style)` format with `Intl` in `fr-FR` or `en-CA` (`en-CA` is what the pages use today). Canonical URLs built by the pages (`guidePath()`, the reader's `setMeta`) add `fr/` in French.

### 4.4 The string files

- `assets/data/turkmen/i18n/en.json` and `fr.json`: one flat object each, keys grouped by where they're used: `common.*` (header, footer, notices), `meta.<page>.*` (title, description, og), `core.*` (turkmen.js), `account.*` (turkmen-account.js), `hub.*`, `lesson.*`, `guide.*`, `cards.*`, `ach.<id>.*` (the achievements' names and texts; their Turkmen names stay in turkmen.js), `char.*` (the word after each character's Turkmen greeting), `tag.*` (the 24 card tags), `pos.*` (parts of speech), `form.*` (the card forms: accusative, present…).
- **Values:** plain text, escaped; a key ending in `.html` holds markup (links, `<i lang="tk">`) and is inserted as it is. Placeholders `{name}`. A count is an object `{ "one": "{n} leçon", "other": "{n} leçons" }`, chosen with `Intl.PluralRules` of the edition (in French, 0 and 1 are `one`; where « aucune leçon » reads better than « 0 leçon », that's its own key).
- **Whole sentences only.** No sentence is assembled from translated fragments, since French word order and agreement differ: `plural(n, "card") + " you're learning " + (n === 1 ? "comes" : "come") + " back later today"` (cards.html) becomes one key with a count and a `{time}` placeholder.
- **How pages get them. Decision:** pages.mjs inlines into each page, in both editions, the keys that page's scripts read (from `common`, `core`, `account` and its own) as `<script>window.TKM_STRINGS = {…}</script>` before `turkmen.js`. Markup text carries `data-i18n="key"` (text), `data-i18n-html="key"` or `data-i18n-attr="aria-label:key;title:key"`, and pages.mjs fills it in both editions; `--check` fails if the English page's text differs from `en.json`. A markup string isn't also inlined, so each text appears once in a page; a key of another group that a page's script names is inlined too (`cards.html` sets its title from `meta.cards.title`). **Why:** the strings are there before the first line of script runs, with no request and no English flash on a French page; the English pages keep rendering exactly as before.
- **Fallback.** A key missing from `fr.json` shows the English string, and is an error for `validate.mjs --lang fr`. **Why:** a build conversation that adds an English string never breaks the French pages, and the French conversations see what to translate.
- `fr.json` follows the style guide (section 11) and the interface glossary (12.2). It also holds `"_live"` (3.4).
- **Strings only French pages show** (FR-BUILD-1) are in `en.json` too, in English, so the two files keep the same keys: `core.untranslated` ("This isn't in French yet."), `cards.edition.*` (the cards page's « Bientôt disponible » and « 600 cartes sur 1 000 en français »), `lesson.note.accents`, `lesson.note.negation`, `lesson.note.apostropheLearner`, `lesson.lang.fr`.
- **Placeholders and counts**: `fr.json` uses the placeholders of the English string, except where the code passes more than the English shows (`common.hour.am` and `.pm` get `{h}` and `{H}`, so French writes « 14 h »; `validate.mjs` lists these in `EXTRA_VARS`); a French value may be a count where the English one is a plain string (`hub.wall.gold`, `core.ivl.yr`), counted on `{n}` or the `count` the code passes.

**Where the English is today**, for FR-BUILD-1 (a survey, not a count to the line): about 130 sentences built in the hub's script, 100 in the player's, 60 in the reader's, 80 in the cards page's, 30 in `turkmen-account.js` and 35 in `turkmen.js`; the `plural()` helpers that add an "s" (hub, player, cards page); `toLocaleDateString("en-CA")` and `toLocaleString("en-CA")` (cards page, reader, hub); the player's `NOTES`, `NOTE_TEXT` and `tkName()`; the cards page's `DIR`, `DIR_SHORT`, `FORMS`, `POS`; `turkmen.js`: `achievements()` (English names and texts), `formatInterval()` ("min", "h", "d", "day", "mo", "yr"), `link()`'s "(coming soon)", `validateProgress()`'s Daily Turkish message; the reader's legend and the "English" label over a parallel block; the hub's About prose and Settings help; every page's head. **FR-BUILD-1's prompt lists the four pages and `turkmen.js`; `turkmen-account.js` (its card, its prompts, the errors it shows) and `404.html` need the same treatment.** Errors that come from Supabase are shown as sent, except the few the account card already recognizes, which get keys.

### 4.5 The iPhone app

The Daily Turkmen iPhone app (`app-turkmen/`) is built from these pages by `app-turkmen/scripts/build-www.mjs`, which copies the English pages and all of `assets/data/turkmen/`, then edits the copies: it removes the gtag snippet, the tip links (`<h2>Support Daily Turkmen</h2>`…) and the Daily Turkish mark by pattern, expects the hub's text *in this browser's storage only, and clearing your browsing data erases it* exactly once, and turns every *in this browser* into *on this iPhone*. (TM-PROJECT.md 3 still says the course isn't in the app; that line predates `app-turkmen/`.)

**Decision:** the app stays English until its own French localization (the "later" of TM-FR-PROMPTS.md). FR-BUILD-1 keeps the English markup that build-www.mjs matches as it is (pages.mjs fills the same text in the same place), and runs `npm run build` in `app-turkmen/` to see that it still passes. FR-BUILD-2 makes build-www.mjs leave out the language switch and the French-browser notice, as it leaves out the Daily Turkish mark. FR-BUILD-1 already made it stop copying `assets/data/turkmen/fr/` and `assets/data/turkmen/i18n/` (the strings are inlined; the French tree isn't filtered for the app's 4+ rating, `content-4plus.mjs`): the build's content guard reads every JSON file it copies, and *coup* of « du premier coup » in `fr.json` matched its English word list, so the build failed. **Why:** the app's build reads the English pages' text, so moving that text into JSON could break it silently, and an App Store build shouldn't ship files it doesn't use.

## 5. Data

### 5.1 The French tree

```
assets/data/turkmen/fr/
  index.json                      GENERATED (validate.mjs --lang fr --index)
  levels/a1.json …                units/a1-u01.json …
  lessons/a1-u01-l01.json …       grammar/a1-u01.json …
  culture/a1-u01.json …           flashcards/tm-fc-0001-0200.json …
assets/data/turkmen/i18n/en.json, fr.json
```

**Decision:** the same file names, the same IDs, and the same order of everything that has an ID. **Why:** shared IDs are what make progress shared, and the parity check compares file with file.

The French `index.json` has the English shape (TM-PROJECT.md 5, turkish/PROJECT.md 5.10): level titles, unit titles and interlude titles from the French registry (section 13), lesson titles from the French lessons, grammar-point labels from the French guides' section titles (a point of a unit not yet in French has `ready: false` and the label « Bientôt disponible », and the reader's index shows its unit as such); `titleTk`, IDs and batches as in English; a unit is `ready` once its French unit file exists; `flashcards.files` lists the French card files that exist; `version` hashes the French files.

Levels: FR-A1-1 writes `levels/a1.json` (its prompt says so), FR-A2-1 `levels/a2.json`, FR-B1-1 `levels/b1.json`.

### 5.2 Field names: `fr`

Every place the code reads a learner-language field or value today:

| Field or value | Where in the schemas | Read by |
|---|---|---|
| key `en` of a word entry (`Gloss`, lesson `vocab`) | lesson `vocab`, culture `vocab`, `reading.glossary`, `passage.glossary` | lesson.html (word list, reading glossary), guide.html (glossaries, interlude words), validate.mjs (schema, `--vocab`), review-export.mjs |
| `examples[].en`, `paradigm.rows[].en`, `dialogue.lines[].en`, `parallel.en`, `quote.en` | guide and interlude blocks | guide.html (each block's renderer), validate.mjs (schema, word counts in `blockWords`), review-export.mjs |
| `mcq.context[].en`, `cloze.en` | exercises | lesson.html, validate.mjs |
| `match.pairs[i][1]` (a position, not a key) | `match` | lesson.html (the "English" column), validate.mjs (duplicates on the English side) |
| card `en[]`, `ex.en` | flashcards | cards.html (glosses, example, Browse search), static-words.mjs, static-verbs.mjs (meaning, example), validate.mjs |
| value `"en"` of `from` | `translate`, `wordbank` | turkmen.js `answerSpec()` (which language the answer is in), lesson.html (`tkName()`, `langAttr()`, the input's `lang`), validate.mjs (which side is Turkmen) |
| value `"en"` of `optionsLang` (and `modelsLang`, `sourceLang`, B2 and up) | `mcq`, `reading` questions, interlude questions | lesson.html `options()`, `optHtml()`, guide.html (quiz), validate.mjs (Rich or Tk checks) |
| table column type `"en"` | `table` block | guide.html, validate.mjs |
| culture `format: "en"` | culture | validate.mjs (format per level, word counts) |
| `lang === "en"` in the checker | — | turkmen.js `norm()`, `check()` (contractions, *'d*, the typo step), validate.mjs (its copy), test.mjs |

Every other learner-facing field is named for its role (`title`, `goal`, `summary`, `question`, `why`, `hint`, `explain`, `label`, `gloss`, `prompt`, `accept`, `kicker`, `caption`, `alt`…) and keeps its name.

**Decision:** in the French tree the key `en` becomes `fr`, and the value `"en"` becomes `"fr"` (in `from`, `optionsLang`, `modelsLang`, `sourceLang`, table `cols` and culture `format`). The English tree doesn't change. The code reads the learner-language key as `x[C.EDITION]` and the checker takes `"fr"` as a third language. **Why:** an English file copied into `fr/` fails the schema (`en` is an unknown field) until every field is rewritten, so nothing passes as translated while it is still English; `from: "fr"` says in the data what the checker needs to know; and every reader on the list above has to learn the edition anyway, for the strings.

**Rejected:** keeping `en` (an English file copied into `fr/` validates silently, and `"en"` would mean French); a neutral key such as `gl` (it rewrites the 1,873 exercises, 36 guides and 1,000 cards of the source of truth, and every reader, for nothing the French edition needs).

### 5.3 Untranslated files

**Decision:** French pages never show English content. While a file isn't in French:

- **a unit**: its node on the path, its tile and the links to its guide say « Bientôt disponible en français », with a link « En attendant, en anglais » to the same unit in the English edition, where lessons done count in both (5.4);
- **a lesson, review, test, guide or interlude** opened by its address: the same notice, linking the same ID in English;
- **a flashcard file**: its cards are not in the French deck. The cards page says how much of the deck is in French (« 600 cartes sur 1 000 en français pour l’instant ») and, while there is none, says « Bientôt disponible » and links the English deck. A lesson's link to a card that isn't in French yet isn't shown (`TKM.data.cardReady(index, cardId)`, FR-BUILD-1);
- **a level file**: the level shows without its summary and goals (the hub already treats them as optional);
- **an interface string**: the English string (4.4).

**Why:** a French speaker can't be assumed to read English, and a lesson half in English would teach Turkmen through English; because the IDs are shared, a link to the English page is a fallback that costs nothing and keeps the learner's progress. These links are the "fallback-to-English notices" that FR-QA-2 removes once everything is translated.

**The loader.** In French, `TKM.data.index()` reads `fr/index.json`, and `data.get(id)` rejects with `"untranslated"` (without fetching) an ID the French index doesn't list as ready, so each page shows its notice. The path, unlocking, "Jump here" and mistakes practice run on the French index: they see only translated units, and an exercise of an untranslated unit waits in the mistakes list until it is in French. Titles of untranslated units come from the French registry (section 13), so the whole path reads in French.

### 5.4 Shared progress

| What | Decision | Why |
|---|---|---|
| Storage, export, account | The same keys (`tkm:v1:course`, `tkm:v1:cards`, `tkm:v1:settings`), one export file (`app: "daily-turkmen"`), one Supabase enrollment (`lang = 'tk'`) | One learner, one course: the edition is a way of reading it |
| Lessons, units, mistakes, XP, streak | Keyed by the shared IDs: a lesson done in either edition is done in both | The Turkmen practised is the same |
| Cards | One schedule per direction (section 8) | The prompts differ |
| Settings | Shared; `directions` holds both editions' (8.3) | One settings object, one export |
| `item_stats` | The French edition sends `<exercise id>-fr` (it fits `record_attempts`'s `^[a-z0-9-]{1,80}$`; no SQL change) | A translation into French and one into English are different tasks; their first-try rates shouldn't mix |
| Feedback (`A.report`) | Unchanged: the row's `page` already shows `/fr/` | — |
| Analytics | The same two events, no new parameter; the page address tells the editions apart | TM-PROJECT.md 3 allows only these |
| Supabase redirects | `https://dailyturkmen.app/**` and `https://gregoiremaillard.com/turkmen/**` already cover `/fr/`; the account's `redirectTo()` builds the address from the page, so a French learner comes back to a French page | — |

## 6. What gets translated

Learner-facing text in the learner's language is written in French. IDs, slugs, enum values, numbers, URLs, file names and every Turkmen string stay as they are. In the tables, **FR** = written in French; **=** = identical to the English file (IDs, structure, numbers); **TK** = Turkmen, identical to the English file; **free** = French, and its shape may differ from the English (blocks added, dropped or reordered).

**Common types** (TM-PROJECT.md 5.0, turkish/PROJECT.md 5.1): `Tk`, `TkRich`, `Seg` → TK. `En` → FR (plain French). `Rich` → FR (`*…*` is still Turkmen, `**…**` emphasis, `` `…` `` notation, `[label](ref)` with a French label). `Gloss` → `{ tk: TK, fr: FR }`. `Reject` → `answer` on the answer's side, `why` FR. `Accept` → on the answer's side (section 7).

| Schema | Field | French file |
|---|---|---|
| Level | `id`, `cefr`, `units` | = |
| | `title` | FR, = the French registry (13) |
| | `summary`, `canDo` (3–6) | FR |
| Unit | `id`, `level`, `order`, `grammarPoints`, `lessons`, `grammar`, `culture` | = |
| | `titleTk` | TK |
| | `title` | FR, = the French registry |
| | `summary`, `canDo` (2–5), `vocabThemes` (1–6) | FR |
| Lesson | `id`, `unit`, `order`, `points`, `intro.see` | = |
| | `title`, `goal`, `intro.text` | FR |
| | `vocab` | the same entries in the same order: `tk` TK, `pos` and `card` =, `fr` FR |
| | `exercises` | the same IDs, order and types |
| Every exercise | `id`, `type`, `points`, `diacritics` | = |
| | `hint`, `explain` | FR (`explain` required as in English; a `hint` may be added or left out) |
| `mcq` | `question` | FR |
| | `context` | `who`, `tk` TK; `fr` FR |
| | `options`, `optionsLang` | `"tk"`: TK. `"en"` → `"fr"`: FR, the same count and meanings |
| | `answer` | = |
| | `why` | FR; its keys are wrong options' indexes, and may differ from the English |
| `cloze` | `text`, `blanks` (accept, reject answers, options, answer) | TK |
| | `fr` (the translation), reject `why` | FR |
| `translate` from `tk` | `prompt` | TK |
| | `accept`, reject answers | FR, written for French (7.3) |
| | reject `why` | FR |
| `translate` from `en` → `"fr"` | `prompt` | FR (7.3) |
| | `accept`, reject answers | TK |
| | reject `why` | FR |
| `wordbank` from `tk` | `prompt` | TK |
| | `text`, `answer` (tiles), `distractors`, `accept` | FR |
| `wordbank` from `en` → `"fr"` | `prompt` | FR |
| | `text`, `answer`, `distractors`, `accept` | TK |
| `match` | `pairs[i][0]` | TK, same order |
| | `pairs[i][1]` | FR, all different |
| `conjugate` | `base`, `form`, `cells` | TK / = |
| | `label` | FR |
| `morph` | `base`, `parts`, `distractors`, `result` | TK |
| | `gloss` | FR (« dans le livre ») |
| `reading` | `title`, `passage`, glossary `tk` | TK |
| | glossary `fr`, `translation`, questions' `q` and `explain` | FR |
| | questions' `options` | by their `optionsLang`, as `mcq`; `answer` = |
| `open` (B2 and up, not in the course) | `task`, `checklist` | FR; `source` and `models` by their language |
| Grammar guide | `id`, `unit` | = |
| | `title` | FR, = the French registry |
| | `seoTitle` | FR: the term French speakers search, with « turkmène », 10–48 characters; the page adds « · grammaire A1 » |
| | `intro`, `summary` (3–8) | FR |
| | `sections` | the same grammar points in the same order; `title` FR |
| | Turkmen-bearing blocks: `examples`, `paradigm`, `dialogue`, `parallel`, `passage`, `quote`, and a `table` with a `tk` or `seg` column | kept, in their section and in the English order, with identical Turkmen: `examples` `tk`, `seg`; `paradigm` `p`, `tk`; `dialogue` `who`, `tk`; `parallel` `tk`; `passage` `tk` and glossary `tk`; `quote` `tk`; the table's `tk` and `seg` cells, row for row. Their French parts are FR: `fr`, `note`, `title`, `caption`, `head`, `fr` and `rich` cells, the lexical words of a `gloss` line (*maison-PL-LOC*: Leipzig abbreviations stay) |
| | `p`, `list`, `rule`, `callout`, `see`, `image` | free (rewritten from French; may be added, dropped or reordered within a section), with no new Turkmen (10.3); `see.refs` and `image.src` =, `alt` FR |
| Interlude | `id`, `unit`, `questions[].answer` | = |
| | `format` | `"en"` → `"fr"`; `"parallel"` = |
| | `title` | FR, = the French registry |
| | `kicker` | FR (« Histoire · 1928 ») |
| | `minutes` | the French text's reading time (2–10) |
| | `blocks` | as in a guide: Turkmen-bearing blocks kept with identical Turkmen, prose free |
| | `vocab` | the same entries in the same order: `tk` TK, `fr` FR |
| | `questions` | the same number; `q`, `explain` FR; `options` by `optionsLang` |
| | `sources` | every English source kept (same `url`), except a dead link, which comes out of both editions at once (TM-PROJECT.md 7.7); French-language sources may be added; `title` and `publisher` as the source writes them; `note` FR |
| Flashcard file | `deck`, `range`, card order | = |
| | `source` | FR (the same facts: an editorial order adapted from Daily Turkish's deck, CC BY-SA 4.0) |
| Card | `id`, `rank`, `tk`, `pos`, `sense`, `forms`, `tags`, `level`, `unit` | = / TK |
| | `fr` (1–4 glosses) | FR (8.4) |
| | `ex` | `tk` TK; `fr` FR |
| | `note` | FR, free: a note may be added where a French speaker needs one, or left out |
| `index.json` | generated | French titles and labels (5.1) |
| Progress | — | no text |
| Interface | `i18n/fr.json` | FR; card tags and parts of speech are shown through `tag.*` and `pos.*` |

## 7. French answers

### 7.1 Where French is typed

French is typed only as the answer of a `translate` from Turkmen, and built from tiles in a `wordbank` from Turkmen. Every Turkmen answer is checked exactly as TM-PROJECT.md 6.4 says, in both editions.

### 7.2 The checker

**Decision:** `check(answer, accepted, rejected, "fr", mode)` is a third language beside `"tk"` and `"en"`; `answerSpec()` gives the answer's language as the edition's code when it isn't Turkmen. The English steps that are about English (contractions, *'d* read as **would** and **had**, *'s been*) don't run on French. The steps, numbered like those of turkish/PROJECT.md 6.4 (step 1, expanding the accept entries, doesn't change):

- **Step 2, normalization.** An answer equal to an accepted one after it is **correct**:
   - NFC; the apostrophes ’ ‘ ʼ ´ and the backtick → `'`; the quotation marks « » “ ” „ and `"` → a space; every space, the no-break U+00A0 and narrow no-break U+202F included, → one space (JavaScript's `\s` already covers them);
   - lowercase; `. , ; : ! ? … ( ) ¿ ¡` → a space; hyphens and dashes → a space (*vingt-et-un* = *vingt et un*);
   - *œ* → *oe*, *æ* → *ae*; *î* → *i*, *û* → *u* (the 1990 rectifications allow both: *connaitre*, *aout*);
   - the Turkmen letters French doesn't write, *ä ž ň ö ş ý ü*, folded to their base, so names match (*Aýna* = *Ayna*), as English answers fold all eight; *ç* stays, French writes it;
   - elision undone, typed with or without the apostrophe: *l’* → *le*, *d’* → *de*, *j’* → *je*, *m’* → *me*, *n’* → *ne*, *s’* → *se* (*si* before *il*, *ils*), *t’* → *te*, *c’* → *ce*, *qu’* → *que*, *jusqu’*, *lorsqu’*, *puisqu’* likewise (a lone *l, d, j, m, n, s, t, c* is never a French word);
   - question forms: a leading *est-ce que* (*est-ce qu’*) is dropped, and a subject inverted with a hyphen is put back (*es-tu* → *tu es*, *a-t-il* → *il a*, *allez-vous* → *vous allez*), so *Tu es étudiant ?*, *Es-tu étudiant ?* and *Est-ce que tu es étudiant ?* are one answer (the inversion is read before hyphens become spaces).
- **Step 3, a predictable mistake** (a `reject` entry, normalized) → wrong, with its feedback.
- **Step 4, an accepted answer** → correct.
- **Step 4b, articles** → correct: the answer equals an accepted one except that, in front of a word, an article that the accepted answer has is left out, or one it doesn't have is added (*Livre est sur table* for *Le livre est sur la table*). Articles: *le, la, l’, les, un, une, des, du, de la, de l’*, and the *le, les* inside *au, aux* (*au marché* = *à le marché*). *le, la, l’* count as one article, *un, une* as one (a gender slip is the learner's French, not their Turkmen). **Changing** one article for another (*le* → *un*, *le* → *du*) is not covered: where the Turkmen allows both, the accept list says so (7.3), so the accusative's definite object (a1-u08) keeps its point. **Not articles**, never left out: *le, la, l’, les* as object pronouns, that is, after a subject pronoun, *ne* or another object pronoun (*je le vois*, *je ne la vois pas*, *il me le donne*), before *y, en, moi, toi, lui, leur*, and as the last word (*prends-le*).
- **Step 5, "almost"** (counts as right, shows the canonical spelling), each looser than the one before, each also with the article rule:
   - `accents`: the same give or take accents and the cedilla (NFD, combining marks dropped: *é è ê ë à â ï ô ù ü ÿ ç* → their base letter);
   - `negation`: the same without the *ne* (*n’*) of a negation (*je sais pas* for *je ne sais pas*);
   - `typo`: one typo (an edit, or two neighbouring letters swapped) in one word of five letters or more, as for English (`TYPO_MIN`).
- **Step 6, a rejected answer** give or take the same differences → still wrong, with its feedback. As in English, this is read before the `typo` of step 5 (accents and a missing *ne* first, then the rejects, then one typo), so a rejected answer typed with one typo still gets its feedback (FR-BUILD-1).
- **Step 7**: wrong.

- An exercise's `diacritics` is about the Turkmen letters: French accents are always step 5, in every mode. **Why:** the plan counts a missing accent as "almost" everywhere, and `diacritics` exists for spelling drills in Turkmen.
- The player's notes (`fr.json`): `accents` « Attention aux accents », `negation` « La négation s’écrit ne… pas », `typo` « Attention à l’orthographe », each followed by « Ça compte comme juste. »
- The same normalization and folds are copied into `validate.mjs`, and `test.mjs` checks the two copies agree, as it does today for `norm`, `fold` and `joinParticle`.
- In a `wordbank` from Turkmen, a tile written with an elided word keeps its apostrophe (« l’ », « j’ »), and the player joins it to the next tile without a space (« J’ai »).
- **Why the article rule is written this way:** Turkmen has no articles, so a French speaker's article is a choice of French, not of Turkmen; leaving one out or adding one must not cost them. But a bare noun and an accusative differ in definiteness, and the English edition already accepts **a** and **the** only for the bare noun (TM-PROJECT.md 7.3): swapping articles stays with the accept lists, so the course can still mark *J’achète du pain* wrong for *Çöregi alýaryn*.

Cases for `test.mjs` (FR-BUILD-1), the answer typed → the accepted answer: *Tu es étudiant?* or *Tu es étudiant ?* → *Tu es étudiant ?* right; *L'école* (straight apostrophe) → *L’école* right; *j ai* → *j’ai* right, *jai* wrong; *coeur* → *cœur* and *aout* → *août* right; *Ayna* → *Aýna* right; *Je suis étudiant* → *Je suis un étudiant* right; *Le livre est sur table* → *Le livre est sur la table* right; *Je vais à marché* → *Je vais au marché* right; *J’achète un pain* → *J’achète le pain* **wrong** (article changed); *Je vois* → *Je le vois* **wrong** (a pronoun, not an article); *Es-tu étudiante ?* and *Est-ce que tu es étudiante* → *Tu es étudiante ?* right; *ecole* → *école* **almost** (accents); *Ayna est a Achgabat* → *Aýna est à Achgabat* **almost** (accents); *je sais pas* → *je ne sais pas* **almost** (negation); *Merdan est fatiqué* → *Merdan est fatigué* **almost** (typo in a word of seven letters).

### 7.3 Writing French accept lists

The `accept` syntax of TM-PROJECT.md (`[a|b]` one of, `(a)` optional; at most 200 expansions an entry; `accept[0]` plain).

- **`accept[0]`** is the canonical answer: natural French, French typography (11.3), shown to the learner after a mistake.
- **Don't list** what the checker covers: case, punctuation, spaces, *’* or *'*, *œ* or *oe*, *î* or *i*, an article left out or added, elision, *est-ce que* and inversion, a missing *ne*, accents, one typo.
- **Do list:**
  - **definite and indefinite where the Turkmen allows both**: a bare noun (no accusative, no possessive) → *le* and *un* (or *du*): *Kaka surata seredýär* → *Papa regarde la photo.*, *Papa regarde une photo.*; an accusative object → definite only (*Çöregi alýaryn* → *J’achète le pain.*); *bir* → indefinite;
  - **both genders where the Turkmen doesn't say**: *ol* → *il* and *elle*, with their agreement; write the two sentences, or `(e)` (*Il est étudiant.*, *Elle est étudiante.*); a slip such as *il est étudiante* being accepted too is harmless;
  - **tu and vous exactly as the Turkmen says**: *sen* → *tu*, *siz* → *vous* (plural or polite: *Vous êtes étudiant(e)(s)*);
  - **the tenses** of 14.2, canonical first;
  - word orders and synonyms a learner will type (*maman*, *mère*);
  - numbers in digits and in words;
  - place names in both spellings, the French exonym and the Turkmen one (*Achgabat*, *Aşgabat*), as TM-PROJECT.md 7.3 does for English.
- **`reject`**: the French-side mistakes that teach something (the wrong person or tense; the indefinite where the point is the accusative's definite object), with a `why` in French; the English edition's rejects carried over where they apply.
- **From French to Turkmen**, the Turkmen list doesn't change (section 1). Write the French prompt so that every answer in the list is right and none is missing: where the English "you" accepts *sen* and *siz*, *tu* or *vous* (the list keeps both); "you (singular)" → *tu*; "(plural)" or "(polite)" → *vous*, without the bracket, since French says it. Gender in the prompt (*Elle est fatiguée.*) changes nothing in Turkmen.

## 8. Flashcards

### 8.1 Directions and scheduling

- **Decision:** the French edition's directions are `tk-fr` (« Turkmène → français ») and `fr-tk` (« Français → turkmène »), stored as `fc-0042:tk-fr`, `fc-0042:fr-tk`, each with its own schedule, on the shared card IDs; the English directions are unchanged. A card's French directions are new even when its English ones are mature. **Why:** the two prompts are different cards (a French gloss isn't an English one, and producing Turkmen from *savoir* isn't producing it from "to know"), so an interval earned on one says little about the other; shared IDs keep "words learned" (`achievements()` counts a card once, whatever its directions), the `unit` links and *only words from units I've finished* working across editions. Changing edition is rare, and the Turkmen words a learner knows come back to mature quickly on Easy.
- `fr-tk` starts once `tk-fr` has graduated, as `en-tk` waits for `tk-en`; a card answered in one direction today buries its sibling in the same pair.
- Shared by both editions: `cards.days` (new cards and reviews a day count for the learner, so the daily limits hold across editions), the streak credit (10 cards), the statistics' days.

### 8.2 Code

- `turkmen.js`: `RE.cardKey` takes the four directions; `C.DIRS` is the edition's pair; `siblingKey()` swaps within the pair (it assumes `tk-en`/`en-tk` today, line 1085); the queue's rule that holds back production (line 1196) uses the pair; `SPEC.cards` and `SPEC.settings` (and the validator's `--progress`) accept the four directions.
- `cards.html` and the hub's Settings: `DIR`, `DIR_SHORT`, the two checkboxes (`s-dir-tken`, `s-dir-entk`, renamed for the pair), the `started` count, Browse's states and statistics read the edition's pair.

### 8.3 Settings

**Decision:** `settings.directions` holds the directions of both editions (one to four). Each edition shows and changes only its own pair and keeps the other's entries as they are; if the list holds neither direction of the edition, both are on. The default stays `["tk-en", "en-tk"]`. **Why:** one settings object stays one export file and one Supabase column, and neither old files nor the English edition change. (Today `cards.html` rebuilds the list from its two checkboxes, line 1332: it must keep the other pair's entries.)

### 8.4 The French deck

- **Glosses** (`fr`, 1–4): the most usual sense first; verbs as infinitives (*aller*); nouns without an article, except to tell homonyms apart (*le tour*, *la tour*); adjectives in the masculine; the same sense distinctions as the English card (one French gloss for each English sense, not one for each English word).
- **Unique prompts for `fr-tk`:** where two cards would show the same first gloss, a hint in brackets (*savoir (un fait)*, *connaître (une personne)*); the validator warns about duplicates.
- **Cards and lessons agree:** a lesson's French gloss of a word is among its card's French glosses (`--lang fr --vocab`).
- **Tags** stay identifiers (`places`, `time`… 24 of them) and are shown through `tag.*`; Browse's search folds French accents and *œ* as well as the Turkmen letters (it already drops accents) and also finds the French names of tags.
- **Notes**: a note the English doesn't have where a French speaker needs it (a French word with a wider or narrower sense); none that compares with Turkish.

## 9. The morphology engine

`turkmen-morph.js` builds Turkmen only: words, `seg` strings, lists of variants. Its English is (1) the senses of the two homographs in `LEX.homographs` (*at* "name" and "horse", *ot* "fire" and "grass"), which a `sense` option may name and `readings()` returns, (2) the label of each slug in `forms()` ("General present -Ar"…), read by `morph-test.mjs` and by no page, (3) comments.

**Decision:** no change. Content picks a homograph by number (`"sense": 1`), which is the same in both editions, and the validator's messages stay English (they're for conversations, not learners). **Why:** nothing the engine returns reaches a learner in English. What French does need around it is in the SEO scripts, for FR-SEO: the person glosses of `static-verbs.mjs` (`PERSONS`: *men* "I"…), its section titles and notes, the column labels of `static-cheatsheet.mjs` and `static-words.mjs`.

## 10. Validation and parity

### 10.1 Commands

```
node scripts/turkmen/validate.mjs --lang fr                 # the French tree: schema rules, parity, typography; exit 1 on errors
node scripts/turkmen/validate.mjs --lang fr --batch A1-1    # also what the batch's units still lack in French
node scripts/turkmen/validate.mjs --lang fr --index         # validate, then rewrite assets/data/turkmen/fr/index.json
node scripts/turkmen/validate.mjs --lang fr --vocab         # French glosses of lesson words against their cards
node scripts/turkmen/validate.mjs --lang fr --sync          # copy every Turkmen field of the English files into the French ones
node scripts/turkmen/validate.mjs --lang fr --fix           # French typography: apostrophes, spaces before ; : ! ? and inside « », œ
node scripts/turkmen/validate.mjs --lang all                # both editions
   --strict and --quiet as for English
```

- Without `--lang`, the validator checks the English edition only, as today. **Why:** an English conversation shouldn't fail on French files it didn't touch; `--sync` is how it passes its Turkmen changes on.
- `--batch` takes the English batch IDs (`A1-1` … `B1-5`, `FC-1` … `FC-5`) and the names of TM-FR-PROMPTS.md: `FR-A1-2` is `A1-2`; `FR-FC-1` is `FC-1`, `FC-2` and `FC-3`; `FR-FC-2` is `FC-4` and `FC-5`.
- `--progress <file>` keeps its meaning: it validates an exported progress file, which holds both editions. The translation count is printed on the summary line of every `--lang fr` run (*French: 3 of 36 units translated, 0 of 1,000 cards; interface strings: 1,042 of 1,042*); `--lang fr` reports the English edition's issues as one count (run without `--lang` to see them); FR-QA-2's "--progress (36 of 36 units, 1,000 of 1,000 cards)" means that line. **Why:** the flag already has a meaning that the tests and README rely on.
- `--sync` copies the Turkmen of each field (section 6, TK) from the English file to the French one by its JSON path, and guide and interlude blocks by their order within a section; it never touches French, and lists what it can't place (an exercise added or removed). **Rule for every conversation that changes Turkmen in the English content** (TK-REVIEW applying the native corrections, a content fix): run `--lang fr --sync`, then `--lang fr`. FR-BUILD-1 adds this line to TM-PROJECT.md section 9.
- `--fix` applies 11.3 to French text outside `*…*` and code spans, and to `fr.json`; what it can't decide stays a warning.

### 10.2 Parity: errors

- **Files:** every French file has an English file at the same path; a French unit, once its unit file exists, has its four lessons, guide and interlude in French (as in English).
- **Structure:** every ID and its order (a level's units, a unit's lessons and grammar points, a lesson's points, vocabulary and exercises, a guide's sections, a file's cards and ranks); each exercise's `type`, its `from` and `optionsLang` side (`"tk"` stays `"tk"`, `"en"` becomes `"fr"`), the number of options, `answer` indexes, `diacritics`, the number of blanks and cells; `intro.see`, `see.refs`; a card's `pos`, `sense`, `forms`, `tags`, `level`, `unit`.
- **Turkmen:** every TK field of section 6 identical, after NFC, as written (accept entries compared entry by entry, syntax included); the Turkmen-bearing blocks of guides and interludes in the same order within their section.
- **No English shape:** no `en` key and no `"en"` value (the French schema has `fr`).
- **Titles:** unit, interlude and level titles equal to the French registry (section 13).
- **Sources:** every `url` of an English interlude's sources is in the French one (so a dead link is removed from the English file too: TM-PROJECT.md 7.7).
- **Strings:** `fr.json` has every key of `en.json`, with the same placeholders and the plural forms French needs.
- **The French rules of section 6:** `seoTitle` contains « turkmène » and has 10–48 characters; `accept[0]` plain; French options, glosses and match answers all different.

### 10.3 Parity: warnings

- **Untranslated:** a French field equal to its English counterpart (more than three words, not a name or a number), or with English words outside `*…*` and code (*the, and, of, with, you, is, are, this, that, your, what, which*).
- **New Turkmen:** a `*…*` span in French text that occurs nowhere in the English edition's Turkmen and that the engine doesn't build (FR-BUILD-1: a word of the English files, or a form `TKMMorph.form()` builds from a card's word; noun forms the engine builds only through `build()` are warned about, for the writer to check). **Why:** the native speaker reviews the English edition's Turkmen; French explanations may quote it, not add to it.
- **Typography** (11.3): a straight apostrophe or `"` in French text, an ordinary space or none before `; : ! ?` or inside « », *oe* in a word written with *œ*, `...` for `…`.
- **Flashcards:** two cards with the same first French gloss (`fr-tk` prompts); a lesson gloss not among its card's glosses (`--vocab`).
- **Lengths:** the targets of TM-PROJECT.md 7.6 and 7.7 (and turkish/PROJECT.md), with 20 % more room, since French runs longer than English.
- The English warnings that apply to text in the learner's language (markup in a plain field, internal IDs, the word "Turkish", a link in an option) apply to French, with « turc » for "Turkish".

### 10.4 Tests

`test.mjs` gains: the cases of 7.2; the edition switch of `turkmen.js` (strings, data folder, directions, `item_stats` IDs); the four directions in the scheduler, `siblingKey()` and the export check; `pages.mjs --check`; and, as for English, every French accepted answer marked correct and every French rejected answer wrong with its feedback.

## 11. Style guide

### 11.1 Voice

- **Tutoiement everywhere**: interface, instructions, explanations, feedback (« Traduis », « Choisis la bonne forme », « Tu as fini l’unité 3 »). Short sentences, one idea each; friendly and precise, as TM-PROJECT.md 7.4 asks of the English.
- **French of France**, neutral, with France's typography and `fr-FR` formats. **Why:** the typography the plan sets (spaces before `; : ! ?`, « ») is France's, and most French-speaking learners are in Europe; Québec readers read it without trouble. Words that differ across the Atlantic take the form both understand (*courriel* rather than *mail*; *repas de midi* where *déjeuner* and *dîner* would be read two ways).
- **Grammar** is named with the terms French speakers learned at school first (*sujet*, *complément d’objet direct*, *complément de lieu*, *infinitif*), then the Turkmen term once, in brackets, where it is established (TM-PROJECT.md 7.4). One term per notion: the glossary (12.1).
- **Explain Turkmen on its own terms, from French.** A note that leans on English grammar (*English has no cases*, *like English "the"*) is rewritten from French; `compare` callouts compare with French. Never with Turkish (TM-PROJECT.md 1). English only for a sound French lacks, after a French description and as a second hint (14.1).
- **Gender.** Rephrase so the learner isn't addressed with a gendered word (« Bravo ! » rather than « Tu es prêt(e) ? »); where it can't be avoided, brackets: *prêt(e)*, *étudiant(e)s*. No middle dot. **Why:** brackets are the dictionaries' convention and screen readers read them; the middle dot divides French readers and trips screen readers.
- **Translations of Turkmen sentences** are natural French, not glosses; *ol* is *il* or *elle* as the context or the name says.
- **Anglicisms** are avoided where French has the word: *série* (streak), *cartes* (flashcards), *réglages* (settings), *correction* (feedback); the interface glossary (12.2) fixes them.

### 11.2 Spelling and conventions

- Traditional spelling (*connaître*, *événement*, *île*); the checker accepts the 1990 spellings in answers (7.2).
- Capitals keep their accents (*À bientôt*, *État*, *Ça*); *œ* and *æ* as ligatures (*cœur*, *sœur*, *œil*, *œuvre*, *nœud*, *bœuf*).
- Lowercase for languages and adjectives (*le turkmène*, *un tapis turkmène*), capitals for peoples (*les Turkmènes*); months and days lowercase; titles with one capital (« Le thé vert et la çaýhana »).
- **Place names:** the French exonym where one is established (*Achgabat*, *Turkménistan*, *Merv*, *le Karakoum*, *l’Amou-Daria*, *la mer Caspienne*, *le Kopet-Dag*), otherwise the Turkmen spelling (*Daşoguz*, *Türkmenabat*, *Mary*, *Balkanabat*); accept lists take both (7.3).
- **Turkmen words in French text** are written `*…*` and stay as they are: no French plural *s* (*deux welaýat*), no Gallicized spelling (*çaýhana*, not « tchaïkhana »).
- **Numbers and dates:** *1 000* and *2,5* (thousands with a narrow no-break space), *8 h 30*, *27 octobre 1991*, *XIXe siècle*, *IIIe siècle av. J.-C.*; *20 manats*.

### 11.3 Typography

| Mark | Rule | Character |
|---|---|---|
| `; ! ?` | narrow no-break space before (« Salam ! ») | U+202F |
| `:` | no-break space before (« Exemple : ») | U+00A0 |
| « » | French quotation marks, narrow no-break space inside (`« bonjour »`); “ ” for a quotation inside one; Turkmen text keeps its own “ ” (TM-PROJECT.md 7.1) | U+00AB, U+00BB, U+202F |
| ’ | the apostrophe, everywhere in French, accept lists and `fr.json` included (the checker reads `'` too) | U+2019 |
| … | one character | U+2026 |
| numbers | narrow no-break space between thousands (*1 000*); no-break space between a number and its unit or noun where a break would separate them (*20 manats*) | U+202F, U+00A0 |
| dashes | prefer commas and brackets; an aside in dashes takes « — » with no-break spaces | U+2014 |

Inter Fleet, the pages' font, has every one of these characters, and *é è ê ë à â î ï ô ù û ü ÿ ç œ æ* with their capitals (checked in FR-SPEC).

## 12. Glossary

### 12.1 Grammar terms

One French term for each notion, in guides, lessons, cards and the interface. Content batches add the terms they fix, with the unit that fixed them.

| English | Français | Note |
|---|---|---|
| alphabet, letter | alphabet, lettre | |
| vowel, consonant | voyelle, consonne | |
| front vowel | voyelle antérieure | *e, ä, i, ö, ü*; explained once as « prononcée à l’avant de la bouche » |
| back vowel | voyelle postérieure | *a, o, u, y* |
| rounded / unrounded vowel | voyelle arrondie / non arrondie | |
| vowel harmony | harmonie vocalique | (*sesleriň sazlaşygy*) once, as in the English |
| rounding harmony | harmonie labiale | `gp-harmony-rounding` |
| long vowel | voyelle longue | |
| stress | accent tonique | not *accent* alone, which also means the written accents |
| syllable | syllabe | |
| root, stem | racine, radical | |
| suffix, ending | suffixe, terminaison | |
| linking vowel | voyelle de liaison | the (Y) and (A) of the notation |
| buffer consonant | consonne de liaison | the (n) and (s) |
| voicing (*k → g*, *t → d*) | sonorisation | |
| vowel loss (*ogul → ogly*) | chute de voyelle | |
| plural | pluriel | |
| case | cas | |
| nominative | nominatif (forme de base) | |
| accusative, definite object | accusatif, complément d’objet défini | « COD défini » once per guide |
| dative / locative / ablative / genitive | datif / locatif / ablatif / génitif | |
| possessive suffix | suffixe possessif | not « adjectif possessif », which is *mon, ma* |
| personal ending | terminaison personnelle | |
| personal pronoun, demonstrative | pronom personnel, démonstratif | |
| postposition | postposition | French has prepositions: say so where it helps |
| question particle (-mY) | particule interrogative | |
| negation (*däl*, -mA) | négation | |
| "to be" (copula) | « être » (copule) | the zero form: « sans verbe *être* » |
| present (-ýAr) | présent en -ýAr | |
| general present (-Ar) | présent général en -Ar | « aoriste » once, in brackets |
| past (-dY) | passé en -dY | the French tenses it translates are in 14.2, never its name |
| past continuous (-ýArdY) | passé continu en -ýArdY | |
| pluperfect (-(Y)pdY) | plus-que-parfait en -(Y)pdY | |
| perfect (-(Y)pdYr) | parfait en -(Y)pdYr | with « médiatif » for its meaning |
| evidential, reported (*eken*, -(Y)pdYr) | médiatif | « ce qu’on a appris ou constaté, pas vu » |
| future (-jAk) | futur en -jAk | |
| necessity (-mAlY) | obligation en -mAlY | « nécessitatif » not used |
| ability (-(Y)p bilmek) | capacité : -(Y)p bilmek | « pouvoir », « savoir » |
| imperative, optative | impératif, optatif | |
| conditional (-sA) | forme en -sA (*si…*) | not « conditionnel », which in French is the *would* form (-ArdY in an unreal condition) |
| participle | participe | |
| relative clause | relative | |
| verbal noun (-mAk, -(Y)ş) | nom verbal | |
| fact clause (-dYgY) | complétive | |
| converb | converbe | « ≈ gérondif » once |
| helper verb | verbe auxiliaire | |
| passive / reflexive / causative / reciprocal | passif / réfléchi / causatif / réciproque | « factitif » once beside causatif |
| reported speech | discours rapporté | |
| compound noun | nom composé | |
| word building, diminutive | formation des mots, diminutif | |
| subject, object, word order | sujet, complément d’objet, ordre des mots | « le verbe en fin de phrase » |
| person (*men* … *olar*) | personne : 1re, 2e, 3e du singulier, du pluriel | |
| front / back vowel, in lessons and notes | « une voyelle antérieure », « *a*, voyelle postérieure : *-lar* » | FR-A1-1: never « voyelle de l’avant / de l’arrière » as the term; the a1-u02 guide explains both words once from French (« *i* et *e* se prononcent à l’avant de la bouche : ce sont des voyelles antérieures ») |
| high vowel (*y, i, u, ü*), low vowel (*a, e*) | voyelle haute, voyelle basse | FR-A1-1 (a1-u03): « une voyelle haute, dite aussi fermée » once |
| the suffix notation (A, Y) | la notation : **A**, **Y** | FR-A1-1 (a1-u03): « les guides écrivent avec une majuscule la voyelle qui change » |
| short form of “to be” (*Men talyp*) | forme courte de **être** | FR-A1-1 (a1-u03); the zero copula is still described as « sans verbe *être* » |
| careful style (-dYr in the 3rd person) | registre soigné | FR-A1-1 (a1-u03) |
| formal written form (*Men talypdyryn*) | forme écrite soutenue | FR-A1-1 (a1-u03) |
| letter with a mark (*ä, ç, ž, ň, ö, ş, ü, ý*) | lettre à signe | FR-A1-1 (a1-u01): not « lettre accentuée », since the marks aren’t accents |
| interdental *s*, *z* | *s*, *z* zozotés, « la langue entre les dents » | FR-A1-1 (a1-u01): *zozoter* is « prononcer les s et les z en portant la langue trop en avant » (Wiktionnaire); the English *th* only as a second hint |
| familiar / polite (*sen*, *siz*; *sag bol*, *sag boluň*) | tutoyer / vouvoyer; glosses say « (en vouvoyant) » | FR-A1-1 (a1-u01, a1-u03): « c’est le même système que le tutoiement et le vouvoiement » |

### 12.2 Interface terms

| English | Français |
|---|---|
| Course, Grammar, Flashcards (tabs) | Cours, Grammaire, Cartes |
| About, My Profile, Settings | À propos, Mon profil, Réglages |
| level, unit, lesson, exercise | niveau, unité, leçon, exercice |
| the path | le parcours |
| grammar guide, interlude | guide de grammaire, intermède |
| tile, tile wall, mastered | carreau, mur de carreaux, maîtrisé(e) |
| unit review, "Jump here" test | révision de l’unité, test « Aller directement ici » |
| practice mistakes | revoir mes erreurs |
| streak | série (« 3 jours de suite ») |
| daily goal, XP | objectif du jour, XP |
| Correct, Almost right, Not quite | Correct !, Presque !, Pas tout à fait |
| It counts as right | Ça compte comme juste |
| Check, Continue, See the result | Vérifier, Continuer, Voir le résultat |
| letter bar | barre des lettres turkmènes |
| flashcard, deck, review | carte, paquet, révision |
| Again, Hard, Good, Easy | À revoir, Difficile, Correct, Facile (Anki's French labels; FR-BUILD-1 checks them in Anki) |
| new, learning, relearning, young, mature, suspended, leech | nouvelle, en cours, à réapprendre, jeune, mûre, suspendue, sangsue |
| export, import progress | exporter, importer ma progression |
| account, sign in, create an account | compte, se connecter, créer un compte |
| coming soon | bientôt disponible |
| achievement, achievement unlocked | succès, succès débloqué (FR-BUILD-1; the streak ranks are nouns of stages, *Apprentissage* … *Grande maîtrise*, so no gender) |
| Review, Browse, Stats (the cards page's views) | Révision, Parcourir, Statistiques (FR-BUILD-1) |
| suspend, unsuspend; lapses, ease | suspendre, réactiver; oublis, facilité (FR-BUILD-1) |
| tip, hint, tiles | astuce, indice, étiquettes (FR-BUILD-1) |
| email | courriel (FR-BUILD-1) |

### 12.3 Words and conventions of the content

How recurring words and patterns are rendered in French, so batches and the French cards (FR-FC-1, which checks lesson glosses against card glosses) say them the same way. Content batches add rows, with the unit.

| Turkmen | French | Note |
|---|---|---|
| *mugallym* | professeur, enseignant; *Ol mugallym* : « il est professeur », « elle est professeure » | FR-A1-1 (a1-u03): accept lists also take « elle est professeur », the older usage, and « prof » |
| *talyp*, *okuwçy* | étudiant(e) (à l’université), élève | FR-A1-1 (a1-u03) |
| *sürüji*, *lukman* | chauffeur, conducteur (conductrice); médecin (« docteur » accepted) | FR-A1-1 (a1-u03) |
| *aç* | gloss « affamé (avoir faim) »; *Men aç* : « J’ai faim » | FR-A1-1 (a1-u03): a compare callout says Turkmen has neither « être » nor « avoir » here |
| *şat*, *bagtly*, *tanyşanyma şat* | content, heureux, enchanté(e) | FR-A1-1 (a1-u01, a1-u03) |
| *sag bol*, *sag boluň*; *haýyş edýärin* | merci; merci (en vouvoyant); s’il te plaît, s’il vous plaît | FR-A1-1 (a1-u01) |
| *bagyşlaň*, *bagyşla*; *bolýar* | excusez-moi, pardon; excuse-moi; d’accord | FR-A1-1 (a1-u01) |
| *hoş gal*, *ak ýol* | au revoir (dit par celui qui part), bon voyage | FR-A1-1 (a1-u01) |
| *Ýagdaýlaryň nähili?*, *Ýagdaýlaryňyz nähili?*, *Adyň näme?*, *Siz nireli?* | Comment vas-tu ?, Comment allez-vous ?, Comment tu t’appelles ?, D’où êtes-vous ? | FR-A1-1: an answer in the wrong register (vous for a *sen* form, tu for *siz*) is a `reject` with a why, not accepted |
| *bu*, *şu*, *ol*, *şol* | ceci, ce… -ci; ceci, juste là; cela, ce… -là; celui-là (déjà connu) | FR-A1-1 (a1-u02): a French prompt that wants *ol* says « là-bas » (« Ça, là-bas, c’est une chaise ») |
| -lY on a town (*aşgabatly*) | « de » + ville: « Je suis d’Achgabat » | FR-A1-1 (a1-u03); « je viens de » accepted |
| nationalities (*türkmen*, *iňlis*…) | turkmène, anglais(e)… | FR-A1-1 (a1-u03): a pitfall notes that French capitalizes the noun (« un Turkmène ») and Turkmen never does |
| place names | Achgabat (*Aşgabat*), *Daşoguz*, *Mary*, *Tejen*, *Türkmenabat*, *Balkanabat*, l’Amou-Daria, les monts Kopet-Dag, le Karakoum | FR-A1-1, as 11.2 |
| a link to a unit | « [l’unité 9](a1-u09) » in the same level, « [l’unité 12 du niveau A2](a2-u12) » across levels | FR-A1-1 |
| a source in another language | the note ends with « (en anglais) », « (en turc) » | FR-A1-1: the validator warns about « turc » here; the warning stays |

## 13. French registry

The French titles of levels, units and interludes, which the French files must match (`validate.mjs --lang fr` reads this section, as the English validator reads TM-CURRICULUM.md). They are the starting titles, adapted rather than translated; a batch that wants another title for one of its units edits this table first, then the JSON, and logs it. Keep the table's format: one row per ID, cells separated by `|`.

| Level | Titre |
|---|---|
| a1 | Premiers pas |
| a2 | La vie de tous les jours |
| b1 | Récits et subordonnées |

| Unit | Titre | Intermède |
|---|---|---|
| a1-u01 | Lettres et sons | Trois alphabets en un siècle |
| a1-u02 | L’harmonie vocalique et le pluriel | Le cheval akhal-téké |
| a1-u03 | Dire qui tu es | Les noms turkmènes |
| a1-u04 | Questions et négation | Ependi |
| a1-u05 | Où sont les choses | Achgabat |
| a1-u06 | Le présent | Le thé vert et la çaýhana |
| a1-u07 | Aller et venir | Le Karakoum |
| a1-u08 | Le complément d’objet défini | Le pain et le tamdyr |
| a1-u09 | Ma famille | Le toý |
| a1-u10 | C’est à qui ? | L’ak öý |
| a1-u11 | Les nombres et l’heure | Norouz |
| a1-u12 | Demandes et compagnie | Palaw, dograma et gutap |
| a2-u01 | Le passé | 1991 : indépendance et neutralité |
| a2-u02 | Il était une fois | Les contes populaires turkmènes |
| a2-u03 | Le futur | L’antique Merv |
| a2-u04 | Les habitudes et le présent général | Les tapis turkmènes |
| a2-u05 | Pouvoir et savoir faire | Le göreş et les courses de chevaux |
| a2-u06 | Devoir et avoir besoin | En visite chez des Turkmènes |
| a2-u07 | Allons-y : propositions et souhaits | Le küştdepdi |
| a2-u08 | Comparer | Cinq welaýat |
| a2-u09 | Où et quand : les postpositions | Gonur Depe |
| a2-u10 | Les noms composés et -daky | Le telpek et le costume turkmène |
| a2-u11 | Quand, pendant que, puis | Görogly |
| a2-u12 | La formation des mots | Le bazar de Tolkuçka |
| b1-u01 | L’imparfait et le plus-que-parfait | Les Seldjoukides |
| b1-u02 | J’avais l’habitude, j’allais, j’aurais dû | Éleveurs et paysans des oasis |
| b1-u03 | Découvrir, entendre dire, supposer | L’antique Nisa |
| b1-u04 | Les noms verbaux | Le bagşy et le dutar |
| b1-u05 | Les participes : qui fait l’action | Magtymguly Pyragy |
| b1-u06 | Participes futurs et complétives | Kemine et Mollanepes |
| b1-u07 | Converbes (1) : après, avant, sans, jusqu’à | Köneürgenç |
| b1-u08 | Converbes (2) et verbes auxiliaires | Gorkut Ata |
| b1-u09 | Les conditionnelles | Darvaza |
| b1-u10 | Le passif et le réfléchi | Le canal du Karakoum |
| b1-u11 | Le causatif et le réciproque | La langue turkmène |
| b1-u12 | Le discours rapporté | Les proverbes turkmènes |

The units' Turkmen taglines (`titleTk`) are the English edition's (TM-CURRICULUM.md).

## 14. Notes for French writers

What the English edition's explanations get wrong for a French speaker, as TM-CURRICULUM.md's "Notes for writers" does for the Turkish template. None of it is shown as such to learners.

### 14.1 Sounds, for a French ear

Starting comparisons for FR-A1-1, taken from the English guide of a1-u01 and French phonetics. FR-A1-1 checks each against a description of Turkmen phonology before it goes in a guide, and logs what it changed.

| Letter | For a French speaker | Pitfall for a French reader |
|---|---|---|
| a | *a* de *patte*, bref | |
| ç | *tch* de *tchèque* | |
| e | between *é* and *è* (the English guide says the *e* of *pet*): to check | never silent: *eje* has two syllables, *täze* too |
| ä | more open than *è*, towards *a*; French has none (the English *a* of *cat*) | not a variant of *e*: a letter of its own |
| g | *g* de *gare*, always hard; further back beside *a, o, u, y*, and between two of them close to the French *r* (*aga*; the English guide already says so) | *gelmek*, *gije*: never the *j* sound before *e* or *i* |
| h | breathed, as in English *hello*: French has none | always said |
| i | *i* de *midi*, short | |
| j | *dj* de *djinn* | never the French *j*: that sound is *ž* |
| ž | *j* de *jour* (only in borrowed words) | |
| k | *k*, further back beside *a, o, u, y* | |
| ň | *ng* de *parking*, with no *g* said after it | |
| o | *o* de *porte*, short | |
| ö | *eu* de *peu* or *heure*: to check which | easier than for English speakers |
| r | rolled once, as in Spanish or Italian | not the French *r* |
| s | *s*, or the tongue between the teeth (a lisp, the English *th* of *thin*) for most speakers | never *z* between vowels |
| ş | *ch* de *chat* | French *ch* is written *ş* |
| u | *ou* de *loup* | never the French *u*: that sound is *ü* |
| ü | *u* de *tu* | easier than for English speakers |
| w | *ou* de *oui*, lips only | |
| y | a vowel French doesn't have: say it plainly (the English guide: "oo" with spread lips) | not the *y* of *yeux*: that is *ý* |
| ý | *y* de *yeux*, *ill* de *fille* | |
| z | *z*, or the English *th* of *this* | |

And three habits of French reading that Turkmen breaks, worth a pitfall callout in a1-u01: **no nasal vowels** (*on* « dix » is said like the end of *bonne*, *men* « je » like the end of *antenne*, *san* « nombre » like *Anne*: a vowel, then *n*); **every letter is said**, final consonants and final *e* included (*kitap*, *täze*); **no letter groups**: *ou, eu, ai, au, ch, gn, qu* don't exist, so *aý*, *oý*, *ýu* are read letter by letter.

### 14.2 Turkmen forms in French

The French that accept lists and translations use for each form (canonical first). The English accept lists show the meaning each exercise wants; this table is the starting point, and batches log where they depart from it.

| Turkmen | Canonical French | Also accept where natural |
|---|---|---|
| zero copula, -dYr (*Men talyp*) | présent d’*être* (*Je suis étudiant*) | |
| *bar*, *ýok* | *il y a*, *avoir* (*Meniň kitabym bar*: *J’ai un livre*) | |
| -ýAr | présent | *être en train de* |
| -(Y)p + *otyr, dur, ýatyr, ýör* | *être en train de* | présent |
| -Ar | présent (habit, general truth); futur (promise, likely) | as TM-PROJECT.md 7.3: beside -ýAr for a habit, beside -jAk for *will* |
| -dY | passé composé | |
| past copula (*talypdym*, *bardy*) | imparfait (*j’étais*, *il y avait*) | passé composé where it's an event |
| *eken* | présent or imparfait + *apparemment*, *il paraît que*; tales: *il était une fois* | the conditional of hearsay (*il serait parti*) |
| -(Y)pdYr | passé composé + *apparemment*, *on dirait que* | |
| -jAk | futur simple | futur proche (*aller* + infinitif) |
| -mAlY | *devoir* + infinitif | *il faut que*, *il faut* |
| -(Y)p bilmek | *pouvoir*, *savoir* (a skill) + infinitif | |
| optative (*geleýin*, *geleli*) | *je vais…*, *on y va*, *allons…*; offers as questions (*Je t’aide ?*) | |
| -sYn | *qu’il* + subjonctif | |
| imperative | impératif, *tu* or *vous* as the Turkmen | |
| -ýArdY | imparfait | *être en train de* à l’imparfait |
| -(Y)pdY | plus-que-parfait | |
| -ArdY (used to) | imparfait, *avoir l’habitude de* | |
| -jAkdY | *j’allais* + infinitif | *je devais* |
| -mAlYdY | *j’aurais dû*, *je devais* | |
| -sA (real) | *si* + présent | |
| -sA … -ArdY (unreal) | *si* + imparfait, conditionnel présent; in the past, *si* + plus-que-parfait, conditionnel passé | |
| -AndA | *quand* + indicatif | *lorsque* |
| -kA | *pendant que*, *quand j’étais* (*çagakam*: *quand j’étais petit(e)*) | |

### 14.3 Where French helps, and where it misleads

- **tu and vous** match *sen* and *siz* (familiar; plural or polite): say it plainly, it's easier than in English.
- **No gender** in Turkmen (*ol* is *il*, *elle* and *cela*) and **no articles**: say both early (a1-u01, a1-u02); a definite object is marked by the accusative (a1-u08), which the article rule keeps (7.2).
- **Word order**: subject, object, verb (*Men çaý içýärin*, « moi thé je-bois »); French puts the verb second.
- **Suffixes for French words**: the possessive suffixes do what *mon, ma, mes* do; postpositions what prepositions do; the question particle -mY what *est-ce que* does (a good image, once, for a1-u04).
- **French learners know aspect**: the passé composé and imparfait contrast helps with -dY and -ýArdY (b1-u01).
- **Médiatif** (*eken*, -(Y)pdYr): French has no grammatical form for it; explain it as what one learned or found out rather than saw, with *apparemment*, *il paraît que*, *on dirait que*.
- **The French conditionnel** is the *would* form, not -sA (glossary 12.1); *si* + imparfait → conditionnel is a good frame for b1-u09.
- **Impersonal and passive**: French often uses *on* where Turkmen uses the passive (b1-u10); accept both.

## 15. Workflow

As TM-PROJECT.md 9, for the French edition:

1. Read this file in full, then what the prompt names. Content batches also read the English files of their units and the French files of the batch before them, so terms and tone stay consistent.
2. Check the repo on the Mac (`/Users/gregoire/Documents/GitHub/gregoire-maillard.github.io`, on `main`). If it can't be reached, or has changes the conversation didn't make in files it will touch, say so before writing. Never create a branch, commit or push: Grégoire reviews, commits and pushes, and pushing `main` publishes (after FR-PUBLISH, French content goes live at dailyturkmen.app/fr/).
3. **Content batches** write only French content files (and this file's glossary and registry); they never edit pages, code or English content, except to take a dead link out of both editions (TM-PROJECT.md 7.7). A Turkmen error found in the English edition is logged for a Turkmen conversation, not fixed in French alone. **Build conversations** don't rewrite content except to fix a bug they find, logged.
4. Run `validate.mjs --lang fr --batch <batch>` until there are no errors, and fix the warnings or say why they stay; then `--lang fr --index` and `test.mjs` (build conversations also `validate.mjs`, `morph-test.mjs` after an engine change, and `pages.mjs --check`).
5. Re-read every file written, from disk. A batch that changes what learners see is checked in Chromium at 360 px.
6. Add one row to the log below: date, conversation, what was written, checks, and **the places Grégoire should read first** (term choices, rewritten explanations, uncertain glosses, sound comparisons).
7. If the spec had to change, update the section here (and the validator), and say so in the row.

**Grégoire's review.** He is the native French reviewer: he skims each content batch before pushing it, starting with the places the log row lists. FR-QA-1 (after A2) and FR-QA-2 (after B1) are the full passes.

## 16. Progress log

One row per conversation, newest at the bottom.

| Date | Conversation | What was written | Checks | Open issues |
|---|---|---|---|---|
| 2026-11-26 | FR-SPEC | **This file**, from reading TM-FR-PROMPTS.md, TM-PROJECT.md (sections 1–9 in full; of the log, the rows WORKFLOW, A1-3 follow-up, BETA-OFF, TK-CHARS, ACCT-TK and TK-AUDIT in full, the others by their opening words only), TM-CURRICULUM.md (registry, notes for writers, coverage, batches), turkish/PROJECT.md 5 (the schemas TM-PROJECT.md defers to), scripts/turkmen/README.md, and the code: `turkmen.js` (constants, markup, checker, loader, path, progress schemas, achievements, scheduler), `turkmen-morph.js` (lexicon, `forms()`), `turkmen-account.js` (`redirectTo`, `item_stats`), the four pages, `privacy.html`, `404.html`, `static*.mjs`, `validate.mjs` (schemas, `buildIndex`), `review-export.mjs`, `supabase-turkmen.sql`, `sync-dailyturkmen.yml`, `app-turkmen/scripts/build-www.mjs`. **Decided** (each with its reason in its section): addresses under `fr/` with the same file names (3.1); one source per page, `turkmen/fr/*.html` generated by a new `pages.mjs`, strings inlined from `i18n/en.json` and `fr.json` (4); `fr` for the learner-language key and value in the French tree (5.2); no English content on French pages, links to the English page instead (5.3); shared progress, `item_stats` IDs with `-fr` (5.4); the French checker with an article rule that keeps definiteness (7.2); `tk-fr` and `fr-tk` with their own schedule, `settings.directions` holding both pairs (8); no change to the engine (9); the iPhone app stays English, its build kept working (4.5); `--lang fr`, `--sync`, `--fix`, parity errors and warnings (10); France's French (11.1). **Written:** the style guide, a glossary of 52 grammar entries and 20 interface entries, the French registry of 3 level, 36 unit and 36 interlude titles (13), notes on sounds and tenses for French writers (14). **Deviations from TM-FR-PROMPTS.md**, for the next prompts: FR-BUILD-1 also extracts the strings of `turkmen-account.js` and `404.html` (4.4); accept lists don't list article variants, the checker covers them (7.3); FR-QA-2's `--progress` count is the summary line of `--lang fr` (10.1); FR-SEO keeps `grammar-cheat-sheet.html` under `fr/` (3.1); FR-A2-1 and FR-B1-1 write `levels/a2.json` and `levels/b1.json` (5.1); FR-BUILD-1 and FR-BUILD-2 also check and adjust the app's build (4.5). | No code or data changed; `git status` shows this file as the only addition (TM-FR-PROMPTS.md's uncommitted progress list is Grégoire's and wasn't touched). | **For Grégoire:** (1) the sign-in emails are Supabase templates shared with Daily Turkish and are in English: French versions chosen by a `locale` the sign-up sends, or English for now; (2) until FR-FC-1, the French cards page has no cards (5.3): keep that, run FR-FC-1 before FR-PUBLISH, or show English glosses meanwhile; (3) the registry titles (13) and the glossary (12) are proposals to read. **For FR-A1-1:** the sound comparisons marked "to check" (14.1). Seen in passing, outside the French edition: Inter Fleet has no *ž ň ş* (or their capitals), so those letters are drawn in the fallback font on every Turkmen page; TM-PROJECT.md 3 still says the course isn't in the iPhone app. The mirror copies all of `assets/data/turkmen/`, so French data files reach dailyturkmen.app as soon as they're pushed (unlinked until FR-PUBLISH). |
| 2026-11-27 | FR-BUILD-1 | **Strings, loader, checker, directions, validator, tests.** **Strings:** new `assets/data/turkmen/i18n/en.json` (1,042 keys: common 64, meta 17, core 9, account 36, hub 240, char 43, ach 64, lesson 194, guide 94, cards 231, tag 24, pos 12, form 8, notfound 6) taken from the four pages, `404.html`, `turkmen.js` and `turkmen-account.js`, and `fr.json` (every key, `"_live": false`, tutoiement, France's typography applied by script); the pages mark their texts `data-i18n`, `data-i18n-html`, `data-i18n-attr` (the English stays in place, so build-www.mjs still finds it) and their scripts read `TKM.t()`, `TKM.num()`, `TKM.date()`, `TKM.time()`; every sentence built from pieces became one key with a count (`plural()` and the *s* helpers are gone). New `scripts/turkmen/pages.mjs`: fills the marked texts from `en.json`, inlines each page's strings before `turkmen.js`, `--check`, `--preview <folder>` for the French pages. **turkmen.js:** the edition from `<html lang>` (`EDITION`, `C.LOCALE`, `C.DATA`, `C.DATA_EN`, `C.DIRS`, `C.ALL_DIRS`), `t()` with `Intl.PluralRules`, the French tree with the « untranslated » refusal of 5.3 (`data.get`, `data.ready`, `data.cardReady`), `statId()` (`-fr`), `englishHref()`; the French checker of 7.2 (`check(…, "fr")`, `TKM.fr`); `tk-fr` and `fr-tk` (`RE.cardKey`, `siblingKey()`, the queue's production rule, `srs.directions()` and `srs.withDirections()` for 8.3, `SPEC.settings`). **Pages:** the direction checkboxes are `s-dir-1` and `s-dir-2`; the cards page reads `card[EDITION]`, folds *œ* and finds tags by their French names, and on a French page says how much of the deck is in French or, with none, « Bientôt disponible » with a link to the English deck; a lesson hides its link to a card not in French yet. **validate.mjs:** `--lang fr|all`, the schemas built for `en` or `fr` (`schemaSet()`), the English run leaving out `fr/` and `i18n/`, the parity of 10.2, the warnings of 10.3, `fr.json` against `en.json`, `fr/index.json` (written: an empty French tree, every unit planned with its French title), `--batch` (FR names), `--vocab`, `--sync`, `--fix`, `--progress` with four directions; its copy of the French normalization sits in the region `test.mjs` compares. **test.mjs:** 13 new tests (the cases of 7.2 and more, the parity of the French functions with the validator's, a French page's strings, numbers, data folder, loader, IDs and directions, scheduling and burying by pair, an export with both pairs through `validate.mjs --lang fr --progress`, `pages.mjs --check` and a French render of every page). **Also:** `static.mjs` (its patterns read past the new attributes), `review-export.mjs` (greetings and page Turkmen from `en.json`), `app-turkmen/scripts/build-www.mjs` (leaves out `fr/` and `i18n/`, 4.5), `scripts/turkmen/README.md`, the `--sync` rule in TM-PROJECT.md 9. **Spec updated** (this file): 4.1 (`pages.mjs` writes `turkmen/fr/` from FR-BUILD-2; `--preview` now), 4.4 (keys a script names are inlined; strings only French pages show are in `en.json` too; `{H}` for the hours; French counts for English strings), 4.5 (the app build leaves out the French files already: its content guard read *coup* in « du premier coup »), 5.3 (`data.cardReady`), 7.2 (the rejects before the typo, as in English), 10.1 (the summary line as printed), 10.3 (what the engine part of the new-Turkmen check covers), 12.2 (five interface rows: *succès*, the cards views, *suspendre*/*réactiver*, *oublis*, *facilité*, *astuce*, *indice*, *étiquettes*, *courriel*). | `validate.mjs`: all checks passed, output byte-identical to before; `--lang fr`: 0 errors, 0 warnings, *French: 0 of 36 units translated, 0 of 1,000 cards; interface strings: 1,042 of 1,042*; `--lang all` and `--examples` pass. On a copy with a1-u01 and FC-1 converted to the French shape (English text kept): parity clean, the registry titles, `seoTitle` and every untranslated field reported, a changed Turkmen field an error that `--sync` repairs, `--fix` rewriting the typography. `test.mjs` 100/100 (and the date tests in 2 time zones), `morph-test.mjs` all passed, `pages.mjs --check` up to date. Chromium (Playwright): 749 DOM snapshots of the English hub, lessons (every exercise type, reviews, tests, practice, quit), guide reader and index, cards page (study, browse, stats, settings, import) and `404.html`, with a fixed clock and seeded progress, identical to `main` before the change (the `data-i18n` attributes and the two renamed checkbox IDs aside). `static.mjs` run on a mirror built as the workflow builds it: the same pages as before, scripts and `data-i18n` attributes aside (and the quiz answers' random order). `review-export.mjs a1`: the same 4,072 rows (two locations now point to `en.json`). The French pages (`--preview`) at 360 px and on desktop: French throughout, no script error, no horizontal scroll; a French card session on the fixture tree (`fc-0001:tk-fr` keys, French glosses, « lieux » finding the places, the English pair kept in the settings). The app build (`npm run build`, run on a copy of the repo so that `app-turkmen/www/` stays as it was): it passes, 286 files as before, the French files left out, the pages' markup the same as from `main`. All of it run again on the Mac after copying the files there. | **For Grégoire, read first:** in `fr.json`, the hub's About (rewritten for French speakers: sounds compared with French), the lede, the account card and its messages (*courriel*), the achievements' French names (stage nouns so they carry no gender: *Apprentissage*, *Compagnonnage*, *Maîtrise*, *Grande maîtrise*, *Fidélité*, *Grosse journée*, *Grand voyage*), the characters' French names (*poulain akhal‑téké*, *agneau karakul*, *faucon sacre*, *petit léopard du Kopet-Dag*, *hérisson à grandes oreilles*, *petit koulan de Badkhyz*, *gazelle à goitre* with *jeren*, *tortue des steppes*), the cards page's words (*sangsue*, *mûre*, *À revoir*, *Difficile*, *Correct*, *Facile* as in French Anki), « du premier coup », the 24-hour clock (« 14 h »). Then `assets/js/turkmen.js` (`check()`/`checkFr()`, the loader), the French section of `validate.mjs` and `pages.mjs`. **For FR-BUILD-2:** the hub, player and reader don't yet say « Bientôt disponible » with the English link for a unit, lesson or guide not in French (a French lesson of an untranslated unit says it "isn't written yet"; the loader already refuses with `code: "untranslated"`); the player shows wordbank tiles apart, so « J’ » + « ai » should join without a space (the checker already reads them as one word); `turkmen/fr/` itself, the switch, hreflang. **Seen in passing**, kept so the English renders as before: "1 more cards to count today" on the statistics' streak tile, and "a lesson today keeps your 3 days streak going" in the hub's greeting. |
| 2026-11-27 | FR-A1-1 (pilot) | **Units a1-u01, a1-u02, a1-u03 and `levels/a1.json` in French**: 22 files in `assets/data/turkmen/fr/` (`levels/a1.json`, three unit files, twelve lessons, three guides, three interludes) and `fr/index.json` rewritten; the Turkmen identical to the English edition (parity clean, `--sync` changes nothing). **Adapted, not translated:** a1-u01's alphabet table has a column « Se prononce comme » written from French words, and its guide adds what a French reader gets wrong: *ç* is not the ç of « ça », *j* is not the j of « jour », *h* is never silent, *r* is rolled while the French r is close to *g* between back vowels (*aga*), *s* stays s between vowels (*kesel*), no nasal vowels (*on*, *men*), no letter groups; *aý* ≈ « aïe », *öý* ≈ « œil »; final stress « comme en français ». a1-u02 explains front/back and rounded vowels from French (« i » → « ou », « i » → « u », « é » → « eu »), with a table of the nine vowels and their French cousin, and a compare callout (« un accord de sons »); colours are placed against French word order. a1-u03 maps *sen*/*siz* on tu/vous, says that *Men aç* is « j’ai faim » (compare callout), that nationalities stay lowercase where French capitalizes the noun, and that « je suis professeur » has no article, like *Men mugallym*. Accept lists: both genders (« enchanté(e) », « professeur(e) », il/elle for *ol*), « je viens de », questions with and without inversion, and French-only rejects with a why where the register is wrong (vous for *Ýagdaýlaryň*, *Adyň*; tu for *Siz nireli?*, *Siz mugallym*). **Sounds checked** against the IPA of Wikipedia's *Turkmen alphabet* table and the phonology of *Turkmen language*: *e* between « été » and « mère » (/e/, [ɛ]) as 14.1 proposed; *o* changed from « porte » to « mot » (/o/); *ö* « peu », « fleur » before a consonant (/ø/, [œ]); *y* (/ɯ/), *ä* (/æ/), *ň* (/ŋ/) and the long vowels said plainly to have no French match; *s*, *z* (/θ/, /ð/) as « zozotés », after Wiktionnaire's *zozoter*, with the English *th* as a second hint. **Interludes**: every English source kept; French sources added (Inalco's French page, a1-u01; UNESCO's French page, whose title « L’art de l’élevage du cheval Akhal-Teke et les traditions des ornements pour chevaux » the text quotes, a1-u02; the open DergiPark PDF of the verb-names study, a1-u03). Every URL fetched: all load except `afs.okstate.edu/…/akhalteke`, dead: replaced by `breeds.okstate.edu/horses/akhal-teke-horses.html` in both editions (DEAD-LINK-1, TM-PROJECT.md 10). ResearchGate and Ede Betik refuse the fetcher but open in a browser. The 3,000 years of cavalry and racing are attributed to Oklahoma State (the English said Britannica, corrected in DEAD-LINK-1): Britannica's page is now a short notice that doesn't say it. **Glossary**: 9 rows in 12.1 (front/back vowels in lessons, high/low vowels, the notation, forme courte de **être**, registre soigné, forme écrite soutenue, lettre à signe, *s*/*z* zozotés, tutoyer/vouvoyer) and a new 12.3, words and conventions of the content (15 rows). **Time and batch size:** about 3 h of wall-clock from 12:12, with one break: the conversation stopped after a1-u03-l02 and resumed on « continue ». Three A1 units fit, but at the limit of one conversation: reading the spec and 145 KB of English and writing 150 KB of French uses most of it. **Proposal**: keep three units for A1 and A2 (A2 files are 10–20 % longer), and split FR-B1-1 and FR-B1-2 (three B1 units each, with files 30–60 % longer and parallel interludes) into two conversations each, on the two spare slots (B1: 7 conversations instead of 5). Playwright and Chromium aren't in the Mac's shell; the cloud workspace has them, so later batches copy the repo there for the Chromium run, as this one did. | `validate.mjs --lang fr --batch A1-1`: units complete, 0 errors, 3 warnings kept on purpose (« turc » in three source notes of a1-u03, which say the source is in Turkish; nothing compares the languages); `--lang all`, `--vocab` and the English run pass; `--index` run. `test.mjs` 100/100, including every French accepted and rejected answer. The loader in Node on the Mac: the French index lists a1-u01 to a1-u03 as ready with their French titles, a1-u04 is refused « untranslated » without a request, and a1-u01-l03, a1-u02-l03 and a1-u03-l03 answered right, with French variants (« tu t’appelles comment », « Vous venez d’où ? », « Elles sont russes… ») and wrong (each reject gives its why). Chromium at 360 px (Playwright, cloud workspace, the French pages of `pages.mjs --preview`, which aren't kept): a1-u01-l01, a1-u02-l03 and a1-u03-l03 played to the end with variants, an « almost » for accents and a deliberate mistake each (it comes back at the end); the guides of a1-u01 and a1-u02 and the interlude of a1-u03 in the reader: no horizontal scroll, no script error. Every file re-read from disk on the Mac. | **For Grégoire, read first:** (1) the a1-u01 guide: the « Se prononce comme » column and the paragraphs on *y*/*ý*, *s*/*z*, *ň*, *k*/*g*, *h*/*r*, *w*, and the pitfall « Tes habitudes de lecteur français »; (2) the a1-u02 guide, first section (antérieure/postérieure, the vowel table); (3) the word choices of 12.3, above all *mugallym* → professeur(e) with « elle est professeur » accepted, *aç* → « avoir faim », *sürüji* → chauffeur, *Özüň nähili?* → « Et toi ? »; (4) the tu/vous rejects (a1-u01-l01-e04, a1-u01-l03-e04, a1-u03-l01-e10, a1-u03-l03-e04): is a vous answer to a *sen* form really wrong for a learner?; (5) the prompts written to force *ol* (« Ça, là-bas, c’est une chaise », a1-u02-l01-e07, e11, a1-u02-l04-e13); (6) two sentences added to the interludes that the English doesn’t have: « Le français connaît le procédé : c’est le rôle de la cédille du ç » (a1-u01) and « Dans la presse française, ces noms apparaissent souvent sous leur forme russe, en -ov et -ova » (a1-u03, unsourced); « la Livestock Conservancy » without « The ». **For a Turkmen or English conversation** (not changed here): the English a1-u03 says « the word takes a small letter » (*Ol tejenli*) but its guide's first paragraph and a1-u03-l03-e06 (`result`) write *Tejenli*; the DergiPark abstract of a1-u03's first source doesn't state the naming after elders and grandmothers (full text not checked); 12.1 says *sesleriň sazlaşygy* appears once « as in the English », but the English guide doesn't have it, so the French doesn't either (it would be new Turkmen). |
