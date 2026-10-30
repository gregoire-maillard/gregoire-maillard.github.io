# Daily Turkish · App Store listing (version 1.0)

Ready to paste into App Store Connect (see `app/RELEASE.md`, section D). Every limit below was checked by counting characters
(`len()` in Python, which counts the way App Store Connect does for these texts: ç, ğ, ı, İ, ö, ş, ü and • are one character each).
Figures in the texts come from the app's own `app/www/assets/data/turkish/index.json`, after the 4+ content filter (54 units, 208 lessons,
2,695 exercises, 985 cards; C2's 6 units
are "planned") and from the pages themselves (32 achievements, the reminder, haptics, Export/Import).

| Field | Characters | Limit |
|---|---|---|
| App name | 13 | 30 |
| Subtitle | 27 | 30 |
| Promotional text | 160 | 170 |
| Keywords | 99 | 100 |
| Description | 2,198 | 4,000 |
| What's New | 221 | 4,000 |
| App Review notes | 900 | 4,000 |

## App Information (General › App Information)

**Name** (13/30). The name must be free on the App Store; if App Store Connect says it is taken, "Daily Turkish: A1 to C1" (23/30) is a fallback.

```text
Daily Turkish
```

**Subtitle** (27/30)

```text
Learn Turkish from A1 to C1
```

**Category:** Education (primary). Secondary: none, or Reference.

### Content Rights

"Does your app contain, show, or access third-party content?" **Yes.**
"Do you have all necessary rights to that content or are you otherwise permitted to use it?" **Yes.**

Why: the order of the words is adapted from FrequencyWords by Hermit Dave (CC BY-SA 4.0), credited in About; the Lora font
is under the SIL Open Font License (`LORA-OFL.txt` is bundled). Meanings, examples, notes, lessons and guides are your own.

### Age Rating (Edit, then answer)

Answer **No** or **None** to every question: the result is **4+**.

This is accurate because the app's copy of the course is filtered at build time (`app/scripts/content-4plus.mjs`,
PROJECT.md APP-6). It leaves out or rewords everything that pushed the rating up: alcohol and tobacco (*bira*, *şarap*, *rakı*,
*sigara*…), drugs, swearing (*lanet*), the *seks* card, weapons and killing vocabulary, and, in the history interludes,
executions, killings, political violence, the 1980 coup and the 1915–1916 passage. The website keeps all of it. The build fails if
any such word comes back into the app's data, so these answers stay true until the rules change.

| Question | Answer |
|---|---|
| Parental controls · Age assurance | No |
| Unrestricted web access · User-generated content · Messaging and chat · Social media · Advertising | No |
| Profanity or crude humor · Horror or fear themes · Alcohol, tobacco, or drug use or references | None |
| Medical or treatment information · Health or wellness topics | None / No |
| Mature or suggestive themes · Sexual content or nudity · Graphic sexual content and nudity | None |
| Cartoon or fantasy violence · Realistic violence · Prolonged graphic or sadistic realistic violence · Guns or other weapons | None |
| Simulated gambling · Contests · Loot boxes · Gambling | None / No |

What stays, and why it is still "None": plain historical facts (the War of Independence, sieges, the conquest of 1453), natural
deaths, words like *kan* (blood) in medical phrases, the proverb *Ateş olmayan yerden duman çıkmaz* (smoke and fire), a king's
curse on a ruined city in the Hittite interlude, and *piyango* (lottery) as a word in one lesson. None of these is a depiction of
violence, a mature theme or gambling.

## Pricing and Availability

Price: Free (USD 0). Availability: all countries and regions.

## Version 1.0 page (App Store tab › iOS App 1.0)

**Promotional text** (160/170). Can be changed at any time without a new version.

```text
A Turkish course in short daily lessons, from A1 to C1, with a grammar guide for every unit and 985 high-frequency words to review. Works offline. Free, no ads.
```

**Description** (2,198/4,000)

```text
Daily Turkish is a Turkish course for English speakers, built for a few minutes a day. Everything is inside the app: it works offline, needs no account and has no ads.

THE COURSE
• 208 short lessons in 54 units, from your first "merhaba" (A1) up to C1. The C2 level is being written.
• About 2,700 exercises: multiple choice, fill in the blanks, translation both ways, word tiles, building a word from its suffixes, conjugation tables, matching pairs, listening and reading.
• Feedback right after each answer, with explanations for the usual mistakes.
• A letter bar under the text field for ç, ğ, ı, İ, ö, ş and ü.
• The exercises you miss are kept, and a Practise session brings them back until you get them right.
• A review at the end of each unit, and a test to skip ahead if you already know the basics.

GRAMMAR, EXPLAINED
• A grammar guide for every unit, in plain English with tables and examples: vowel harmony, the cases, the past, present, future and aorist, the conditional, the passive and the causative, participles and much more.
• A culture or history interlude in every unit, such as the 1928 alphabet reform, Turkish coffee fortune-telling, the architect Mimar Sinan and İznik tiles.

985 WORDS ON FLASHCARDS
• 985 high-frequency words, ordered by a frequency list of Turkish film and TV subtitles.
• Every card has an example sentence with its translation; verbs show their main forms.
• Spaced repetition with the SM-2 algorithm: grade each card Again, Hard, Good or Easy, and the schedule decides when it comes back.
• Study Turkish to English, English to Turkish, or both, and choose how many new words a day.

KEEP GOING
• A daily XP goal, a streak, a study calendar and 32 achievements.
• A wall of tiles that fills up as you finish units.
• An optional daily reminder at the time you choose. It skips the days you've already met your goal.
• Haptic feedback on right and wrong answers, which you can turn off.

YOUR PROGRESS STAYS YOURS
• Your progress is saved on your iPhone. Export it to Files or through the share sheet, and import it again on another iPhone.
• No account, no ads, no tracking: the app collects no data.

The app and its explanations are in English.
```

**Keywords** (99/100). Comma-separated, no spaces after commas. Words already in the name and subtitle ("daily", "turkish",
"learn", "from", "a1", "to", "c1") are left out, since Apple already indexes them; no other app's name is used.

```text
türkçe,turkce,language,lessons,grammar,vocabulary,flashcards,words,verbs,spaced repetition,beginner
```

**Support URL:** `https://dailyturkish.app/` · **Marketing URL:** leave empty · **Copyright:** `2026 Grégoire Maillard`

**Privacy Policy URL** (App Privacy page): `https://dailyturkish.app/turkishprivacy.html` · data collection: **No**.

**What's New in This Version** (221/4,000). App Store Connect doesn't ask for it on a first version (1.0); keep it for
the record, or reuse it for 1.1.

```text
The first version of Daily Turkish: 208 lessons from A1 to C1, a grammar guide and a culture interlude for every unit, 985 flashcards with spaced repetition, a daily reminder, and progress export and import through Files.
```

**Screenshots, 6.9-inch display** (1320 × 2868 px, portrait, in this order), from `app/store/screenshots/`:

1. `01-path.png`: the course path, unit 6 in progress
2. `02-lesson-exercise.png`: a dialogue exercise, answered correctly
3. `03-lesson-complete.png`: the end-of-lesson screen, daily goal met
4. `04-flashcards.png`: a flashcard with its answer and grading buttons
5. `05-grammar-guide.png`: the grammar guide of A1 unit 6
6. `06-my-profile.png`: My Profile (level, XP, streak, XP chart)

They show a made-up learner (demo progress built with the course's own functions: 22 lessons, 21-day streak, about 200 words started),
not real progress. 6.9-inch screenshots are scaled down for the smaller iPhones, so no other size is needed.

## App Review Information

Sign-in required: **unticked**. Contact: your first and last name, phone and email (seen by Apple only).

**Notes** (900/4,000)

```text
Daily Turkish is a complete offline Turkish course (levels A1 to C1; C2 is in preparation): 208 lessons with instant feedback, a grammar guide per unit and 985 spaced-repetition flashcards, all built into the app. No account, no sign-in, no network needed.

Native features:
- Daily study reminder as a local notification (Course tab, gear icon > Settings > Daily reminder; off by default).
- Haptic feedback on right and wrong answers, finished lessons and the daily goal (Settings > Haptics; on by default).
- Progress export through the iOS share sheet and the Files app, and import from Files (Settings > Export progress / Import progress). Exports also appear in Files > On My iPhone > Daily Turkish.

To try it: on the Course tab, tap Continue to start the first lesson and answer a few exercises. Then open the Flashcards tab and tap Start studying. Then open Settings and tap Export progress.
```

Version release: Manually or Automatically, your choice.
