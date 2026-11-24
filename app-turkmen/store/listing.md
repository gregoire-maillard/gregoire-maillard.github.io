# Daily Turkmen · App Store listing (version 1.0)

Ready to paste into App Store Connect (see `app-turkmen/RELEASE.md`, section D). A fork of `app/store/listing.md` (Daily Turkish).
Every limit below was checked by counting characters (`len()` in Python, which counts the way App Store Connect does for these
texts: ä, ç, ň, ö, ş, ü, ý, ž and • are one character each). Figures come from the app's own
`app-turkmen/www/assets/data/turkmen/index.json`, after the 4+ content filter: 36 units (A1, A2 and B1, all written), 144 lessons,
1,873 exercises, 1,000 cards (999 from the site's deck and *fotosurat* added for the app), 32 achievements.

| Field | Characters | Limit |
|---|---|---|
| App name | 13 | 30 |
| Subtitle | 30 | 30 |
| Promotional text | 154 | 170 |
| Keywords | 97 | 100 |
| Description | 2,662 | 4,000 |
| What's New | 223 | 4,000 |
| App Review notes | 1,230 | 4,000 |

## App Information (General › App Information)

**Name** (13/30). If App Store Connect says it is taken, "Daily Turkmen: A1 to B1" (23/30) is a fallback.

```text
Daily Turkmen
```

**Subtitle** (30/30). Indexed for search, like the name: "learn turkmen", "turkmen lessons", "turkmen words".

```text
Learn Turkmen: lessons & words
```

**Category:** Education (primary). Secondary: none, or Reference.

### Content Rights

"Does your app contain, show, or access third-party content?" **Yes.**
"Do you have all necessary rights to that content or are you otherwise permitted to use it?" **Yes.**

Why: the order of the deck is adapted from the Daily Turkish deck, whose order comes from FrequencyWords by Hermit Dave
(CC BY-SA 4.0), credited in About › Sources; the Lora font is under the SIL Open Font License. Meanings, examples, notes,
lessons and guides are your own.

### Age Rating (Edit, then answer)

Answer **No** or **None** to every question: the result is **4+**.

This is accurate because the app's copy of the course is filtered at build time (`app-turkmen/scripts/content-4plus.mjs`). It
rewords every smoking example (*çilim çekmek*, to smoke, becomes *surat çekmek*, to take photos: "No photos here" instead of
"No smoking here"), leaves out the *çilim* card and the wine in the Nisa interlude, and, in the history interludes, the death toll of
Merv in 1221, the deaths in the resistance to collectivization and the man-eating giant of the Dede Korkut tale. The website keeps
all of it. The build fails if any such word comes back into the app's data, so these answers stay true until the rules change.

| Question | Answer |
|---|---|
| Parental controls · Age assurance | No |
| Unrestricted web access · User-generated content · Messaging and chat · Social media · Advertising | No |
| Profanity or crude humor · Horror or fear themes · Alcohol, tobacco, or drug use or references | None |
| Medical or treatment information · Health or wellness topics | None / No |
| Mature or suggestive themes · Sexual content or nudity · Graphic sexual content and nudity | None |
| Cartoon or fantasy violence · Realistic violence · Prolonged graphic or sadistic realistic violence · Guns or other weapons | None |
| Simulated gambling · Contests · Loot boxes · Gambling | None / No |

What stays, and why it is still "None": plain historical facts (the Seljuks' victory at Dandanaqan in 1040, the Mongols taking
Merv, a sultan taken prisoner), the 1948 Ashgabat earthquake, natural deaths (an old dog, a poet), words like *gan* (blood, a
nosebleed), *uruş* (war) and *derman* (medicine) on cards, the failed coup in Moscow in 1991 as the backdrop to independence, and a
doctor's visit in a lesson (language practice, no medical advice). None of these is a depiction of violence, a mature theme or
medical information.

## Pricing and Availability

Price: Free (USD 0). Availability: all countries and regions.

## Version 1.0 page (App Store tab › iOS App 1.0)

**Promotional text** (154/170). Can be changed at any time without a new version.

```text
A Turkmen course in short daily lessons, from A1 to B1, with a grammar guide for every unit and 1,000 useful words to review. Works offline. Free, no ads.
```

**Description** (2,662/4,000)

```text
Daily Turkmen is a Turkmen course for English speakers, built for a few minutes a day. It teaches standard Turkmen in the Latin alphabet used in Turkmenistan today, starting from zero. Everything is inside the app: it works offline, needs no account and has no ads.

THE COURSE
• 144 short lessons in 36 units, from your first "salam" (A1) up to B1.
• Nearly 1,900 exercises: multiple choice, fill in the blanks, translation both ways, word tiles, building a word from its suffixes, conjugation tables, matching pairs and reading.
• Feedback right after each answer, with explanations for the usual mistakes.
• A letter bar under the text field for ä, ç, ň, ö, ş, ü, ý and ž.
• The exercises you miss are kept, and a Practice session brings them back until you get them right.
• A review at the end of each unit, and a test to skip ahead if you already know the basics.

GRAMMAR, EXPLAINED
• A grammar guide for every unit, in plain English with tables and examples: vowel harmony, the cases, the possessive endings, the present, past and future, the converbs, participles, the passive and more. Suffixes are coloured so you see how each word is built.
• A culture or history interlude in every unit: the Akhal-Teke horses, the Karakum desert, the yurt, carpets and their göls, Merv, Magtymguly and more.

1,000 WORDS ON FLASHCARDS
• 1,000 useful Turkmen words, the most common first.
• Every card has an example sentence with its translation; verbs show their main forms.
• Spaced repetition with the SM-2 algorithm, as in Anki: grade each card Again, Hard, Good or Easy, and the schedule decides when it comes back.
• Study Turkmen to English, English to Turkmen, or both, and choose how many new words a day.

KEEP GOING
• A daily XP goal, a streak, a study calendar, 32 achievements and animal characters from Turkmenistan to collect.
• An optional daily reminder at the time you choose, alternating a word of the day and a nudge to study. It skips the days you've already met your goal.
• Haptic feedback on right and wrong answers, which you can turn off.
• A home-screen widget with your streak and the word of the day.
• Practice: a 60-second speed round and the exercises you missed.

YOUR PROGRESS STAYS YOURS
• Your progress is saved on your iPhone. Back it up to Files or through the share sheet, and import it again.
• An optional free profile keeps it online too, so it follows you to dailyturkmen.app and other devices. It is the same profile as Daily Turkish's, and you can delete it at any time.
• No ads, no tracking.

There is no audio: the guides describe each sound with comparisons from English. The app and its explanations are in English.
```

**Keywords** (97/100). Comma-separated, no spaces after commas. Apple combines them with the words of the name and
subtitle ("daily", "turkmen", "learn", "lessons", "words"), so those aren't repeated.

```text
turkmenistan,language,grammar,vocabulary,flashcards,verbs,phrases,beginner,speak,ashgabat,türkmen
```

**Support URL:** `https://dailyturkmen.app/` · **Marketing URL:** leave empty · **Copyright:** `2026 Grégoire Maillard`

**Privacy Policy URL** (App Privacy page): `https://dailyturkmen.app/privacy.html` (it covers the app since this release) · data
collection: **Yes** (the optional profile). Answers:
- Contact Info › **Email Address**: used for App Functionality · linked to the user: Yes · tracking: No.
- User Content › **Other User Content** (the progress: lessons, XP, flashcard schedules) and Identifiers › **User ID** (the profile's id): App Functionality · linked: Yes · tracking: No.
- Nothing else (no analytics, no usage data, no diagnostics).

**What's New in This Version** (223/4,000). Not asked on a first version; keep it for the record.

```text
The first version of Daily Turkmen: 144 lessons from A1 to B1, a grammar guide and a culture interlude for every unit, 1,000 flashcards with spaced repetition, a speed round, a daily reminder and an optional synced profile.
```

**Screenshots, 6.9-inch display** (1320 × 2868 px, portrait, 3 to 10). Not made yet: take them from the first TestFlight build
(side button + volume up on an iPhone 16 Pro Max or 17 Pro Max gives exactly 1320 × 2868), or ask Claude to make captioned ones like
Daily Turkish's (`app/store/screenshots/captioned/`). Suggested order: the Course tab, an exercise answered right, the end of a
lesson, a flashcard, a grammar guide with coloured suffixes, My Profile with the characters.

## Other languages (optional, App Information › the language menu › add)

Each extra language adds keywords for search. The app stays in English. Copy the promotional text and the description from English (US).

- **English (U.K.)**: same name and subtitle. Keywords (99/100): `turkmenistan,language,grammar,vocabulary,flashcards,verbs,phrases,beginner,holiday,ashgabat,türkmen`
- **Spanish (Mexico)**, searched by the US store too, written in English: name `Daily Turkmen`, subtitle (28/30) `Turkmen course for beginners`, keywords (96/100): `travel,conjugation,alphabet,practice,study,quiz,offline,culture,central asia,silk road,türkmençe`

## App Review Information

Sign-in required: **unticked**. Contact: your first and last name, phone and email (seen by Apple only).

**Notes** (1,230/4,000)

```text
Daily Turkmen is a complete offline Turkmen course (levels A1 to B1): 144 lessons with instant feedback, a grammar guide and a culture interlude per unit, and 1,000 spaced-repetition flashcards, all built into the app. No account or network needed; an optional profile (Profile tab) saves the progress online, with email and password, and can be deleted in the app (Profile tab > Account & character > Delete profile).

Native features:
- Daily study reminder as a local notification, alternating a word of the day and a nudge to study (Settings tab > Daily reminder; offered once on the Course tab, then iOS asks for permission).
- Haptic feedback on right and wrong answers, finished lessons and the daily goal (Settings > Haptics; on by default).
- A home-screen widget (WidgetKit) with the streak and the word of the day.
- Progress backup through the iOS share sheet and the Files app, and import from Files (Settings > Backup).
- An optional profile (Profile tab, email and password) that syncs the progress with the website; Delete profile is on the same tab.

To try it: on the welcome screen, tap Start lesson 1 and answer a few exercises. Then open the Flashcards tab, and the Practice tab for the 60-second speed round.
```

Version release: Manually or Automatically, your choice.
