# Daily Turkish · App Store listing (version 1.0)

Ready to paste into App Store Connect (see `app/RELEASE.md`, section D). Every limit below was checked by counting characters
(`len()` in Python, which counts the way App Store Connect does for these texts: ç, ğ, ı, İ, ö, ş, ü and • are one character each).
Figures in the texts come from the app's own `app/www/assets/data/turkish/index.json`, after the 4+ content filter (60 units, 226 lessons,
2,875 exercises, 1,000 cards (985 from the site's deck and 15 added for the app, APP-9); all six levels, A1 to C2, are ready; 12 conversations and 1 practice test; checked in APP-7)
and from the pages themselves (32 achievements, the reminder, haptics, the optional profile).

| Field | Characters | Limit |
|---|---|---|
| App name | 13 | 30 |
| Subtitle | 30 | 30 |
| Promotional text | 162 | 170 |
| Keywords | 94 | 100 |
| Description | 2,568 | 4,000 |
| What's New | 235 | 4,000 |
| App Review notes | 1,235 | 4,000 |

## App Information (General › App Information)

**Name** (13/30). The name must be free on the App Store; if App Store Connect says it is taken, "Daily Turkish: A1 to C2" (23/30) is a fallback.

```text
Daily Turkish
```

**Subtitle** (30/30). Indexed for search, like the name: it covers "learn turkish", "turkish lessons" and "turkish words" (APP-9j; was *Learn Turkish from A1 to C2*).

```text
Learn Turkish: lessons & words
```

**Category:** Education (primary). Secondary: none, or Reference.

### Content Rights

"Does your app contain, show, or access third-party content?" **Yes.**
"Do you have all necessary rights to that content or are you otherwise permitted to use it?" **Yes.**

Why: the order of the words is adapted from FrequencyWords by Hermit Dave (CC BY-SA 4.0); the Lora font
is under the SIL Open Font License (`LORA-OFL.txt` is bundled). Meanings, examples, notes, lessons and guides are your own.
The FrequencyWords credit is back in About › The course since APP-9j (it had left in the 5 November rewrite, 8f26cda), with
links to the list and to CC BY-SA 4.0, so this answer is true. The 15 words the app adds (APP-9) are not from the list.

### Age Rating (Edit, then answer)

Answer **No** or **None** to every question: the result is **4+**.

This is accurate because the app's copy of the course is filtered at build time (`app/scripts/content-4plus.mjs`,
PROJECT.md APP-6). It leaves out or rewords everything that pushed the rating up: alcohol and tobacco (*bira*, *şarap*, *rakı*,
*sigara*…), drugs, swearing (*lanet*, *kahrolası*), the *seks* card, weapons and killing vocabulary, and, in the history interludes,
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
curse on a ruined city in the Hittite interlude, *piyango* (lottery) as a word in one lesson, and a doctor's visit and a pharmacy among the conversations (language practice,
no medical advice). None of these is a depiction of violence, a mature theme, gambling or medical information.

## Pricing and Availability

Price: Free (USD 0). Availability: all countries and regions.

## Version 1.0 page (App Store tab › iOS App 1.0)

**Promotional text** (162/170). Can be changed at any time without a new version.

```text
A Turkish course in short daily lessons, from A1 to C2, with a grammar guide for every unit and 1,000 high-frequency words to review. Works offline. Free, no ads.
```

**Description** (2,568/4,000)

```text
Daily Turkish is a Turkish course for English speakers, built for a few minutes a day. Everything is inside the app: it works offline, needs no account and has no ads.

THE COURSE
• 226 short lessons in 60 units, from your first "merhaba" (A1) up to C2.
• Nearly 2,900 exercises: multiple choice, fill in the blanks, translation both ways, word tiles, building a word from its suffixes, conjugation tables, matching pairs, listening and reading.
• Feedback right after each answer, with explanations for the usual mistakes.
• A letter bar under the text field for ç, ğ, ı, İ, ö, ş and ü.
• The exercises you miss are kept, and a Practice session brings them back until you get them right.
• A review at the end of each unit, and a test to skip ahead if you already know the basics.
• 12 conversations from A1 to B2, in a café, a taxi, a pharmacy, a job interview and more: choose or type your reply, and the conversation follows what you say.

GRAMMAR, EXPLAINED
• A grammar guide for every unit, in plain English with tables and examples: vowel harmony, the cases, the past, present, future and aorist, the conditional, the passive and the causative, participles and much more.
• A culture or history interlude in every unit, such as the 1928 alphabet reform, Turkish coffee fortune-telling, the architect Mimar Sinan and İznik tiles.

1,000 WORDS ON FLASHCARDS
• 1,000 high-frequency words, chosen mostly from a frequency list of Turkish film and TV subtitles.
• Every card has an example sentence with its translation; verbs show their main forms.
• Spaced repetition with the SM-2 algorithm: grade each card Again, Hard, Good or Easy, and the schedule decides when it comes back.
• Study Turkish to English, English to Turkish, or both, and choose how many new words a day.

KEEP GOING
• A daily XP goal, a streak, a study calendar and 32 achievements.
• An optional daily reminder at the time you choose, alternating a word of the day and a nudge to study. It skips the days you've already met your goal.
• Haptic feedback on right and wrong answers, which you can turn off.
• A home-screen widget with your streak and the word of the day.
• Practice: a 60-second speed round, conversations, and the exercises you missed.

YOUR PROGRESS STAYS YOURS
• Your progress is saved on your iPhone. Back it up to Files or through the share sheet, and import it again.
• An optional free profile keeps it online too, so it follows you to dailyturkish.app and other devices. You can delete it at any time.
• No ads, no tracking.

The app and its explanations are in English.
```

**Keywords** (94/100). Comma-separated, no spaces after commas. Apple combines them with the words of the name and
subtitle ("daily", "turkish", "learn", "lessons", "words"), so those aren't repeated; Apple also matches plurals. No other app's
name is used. "tys" (the Turkish proficiency exam the practice test in the Practice tab prepares for) is a niche no one else targets.

```text
speak,language,grammar,vocabulary,flashcards,verbs,phrases,beginner,istanbul,turkey,türkçe,tys
```

**Support URL:** `https://dailyturkish.app/` · **Marketing URL:** leave empty · **Copyright:** `2026 Grégoire Maillard`

**Privacy Policy URL** (App Privacy page): `https://dailyturkish.app/turkishprivacy.html` · data collection: **Yes** since APP-9 (the optional profile). Answers:
- Contact Info › **Email Address**: used for App Functionality · linked to the user: Yes · tracking: No.
- User Content › **Other User Content** (the progress: lessons, XP, flashcard schedules) and Identifiers › **User ID** (the profile's id): App Functionality · linked: Yes · tracking: No.
- Nothing else (no analytics, no usage data, no diagnostics).

**What's New in This Version** (235/4,000). App Store Connect doesn't ask for it on a first version (1.0); keep it for
the record, or reuse it for 1.1.

```text
The first version of Daily Turkish: 226 lessons from A1 to C2, a grammar guide and a culture interlude for every unit, 1,000 flashcards with spaced repetition, conversations to practice, a daily reminder and an optional synced profile.
```

**Screenshots, 6.9-inch display** (1320 × 2868 px, portrait, in this order). Upload the **captioned** ones, from
`app/store/screenshots/captioned/` (APP-9j): a headline over each screen sells it better, and ASO firms report that Apple reads
screenshot captions for search since June 2025 (Apple hasn't confirmed it), so they repeat the search words: learn Turkish, speak,
Turkish words, grammar. The bare screens stay in `app/store/screenshots/`.

1. `01-path.png`: **Learn Turkish in 5 minutes a day** · *From A1 to C2, one short lesson at a time*: the Course tab (XP, streak, Tekir, the level strip, the Continue card, A1's units as short rows, the five tabs)
2. `02-lesson-exercise.png`: **Speak Turkish with confidence** · *Instant feedback on every answer*: a dialogue exercise answered right, 10 in a row
3. `03-lesson-complete.png`: **Keep your streak going** · *Daily goals, XP and 32 achievements*: the end of a lesson, goal met
4. `04-flashcards.png`: **1,000 essential Turkish words** · *Flashcards with spaced repetition*: *getirmek* with its answer and grades
5. `05-grammar-guide.png`: **Turkish grammar, made clear** · *A guide and a culture story in every unit*: the A1 unit 6 guide
6. `06-my-profile.png`: **Watch your Turkish grow** · *Your level, streak and progress, day by day*: My Profile

Layout: the logo and name at the top, the headline (the search word in the brand red) and a line under it, then the screen in a
dark phone frame, on a light tint that changes per screen. They show a made-up learner (demo progress built with the course's own
functions: 22 lessons, 21-day streak, about 130 words started), not real progress. 6.9-inch screenshots are scaled down for the
smaller iPhones, so no other size is needed.

## Other languages (App Information › Localizable Information, then the language menu at the top right › add)

Each language added in App Store Connect has its own name, subtitle, keywords, promotional text and description. Apple searches
several of them in some countries, so each one adds keywords (APP-9j). Words don't combine across languages: "turkish" in English (US)
and "travel" in Spanish (Mexico) don't make "turkish travel", so each set repeats what it needs. Screenshots: leave "use the same
screenshots" for every language. The app itself stays in English; the German and French descriptions say so in their first line.

### Spanish (Mexico): a second English keyword set for the US

The US App Store also searches the Spanish (Mexico) page. Since the course isn't for Spanish speakers, this page is written in
English: Mexico and the rest of Latin America then see the English page, which matches the app. Copy the promotional text and the
description from English (US).

- Name: `Daily Turkish` · Subtitle (28/30): `Turkish course for beginners`
- Keywords (92/100):

```text
travel,conjugation,alphabet,practice,study,quiz,conversation,offline,exam,culture,phrasebook
```

### English (U.K.): the UK, and the many countries that use it

Copy the promotional text and the description from English (US). Same name and subtitle. Keywords (98/100), with "holiday"
for British searches:

```text
speak,language,grammar,vocabulary,flashcards,verbs,phrases,beginner,holiday,turkey,istanbul,türkçe
```

### German: Germany, Austria and Switzerland (the German store also searches English (U.K.))

- Name: `Daily Turkish` · Subtitle (28/30): `Türkisch lernen in Lektionen`
- Keywords (97/100):

```text
sprache,sprachkurs,vokabeln,vokabeltrainer,grammatik,karteikarten,anfänger,sprechen,wörter,türkei
```

- Promotional text (164/170):

```text
Türkisch lernen in kurzen täglichen Lektionen, von A1 bis C2: Grammatik zu jeder Einheit, 1.000 wichtige Wörter, offline. Kostenlos, ohne Werbung. App auf Englisch.
```

- Description (1,284/4,000):

```text
Daily Turkish ist ein Türkischkurs für ein paar Minuten am Tag. Hinweis: Die App und ihre Erklärungen sind auf Englisch.

DER KURS
• 226 kurze Lektionen in 60 Einheiten, vom ersten „merhaba“ (A1) bis C2.
• Fast 2.900 Übungen: Multiple Choice, Lückentexte, Übersetzungen, Wortbausteine, Konjugation, Lesen und Hören.
• Sofortiges Feedback nach jeder Antwort, mit Erklärungen zu typischen Fehlern.
• 12 Alltagsgespräche von A1 bis B2: im Café, im Taxi, in der Apotheke und mehr.

GRAMMATIK, VERSTÄNDLICH
• Zu jeder Einheit ein Grammatikkapitel mit Tabellen und Beispielen: Vokalharmonie, Fälle, Zeiten, Konditional, Passiv und mehr.
• Zu jeder Einheit ein Kapitel über Kultur oder Geschichte.

1.000 WÖRTER MIT KARTEIKARTEN
• Die 1.000 wichtigsten Wörter, jedes mit einem Beispielsatz und seiner Übersetzung.
• Wiederholung im richtigen Moment, nach dem SM-2-Algorithmus (wie Anki).

DRANBLEIBEN
• Tagesziel, Serie, 32 Erfolge und ein Widget für den Home-Bildschirm.
• Eine tägliche Erinnerung, abwechselnd mit einem Wort des Tages.
• Ein Wortspiel gegen die Uhr: 60 Sekunden, 10 Wörter.

DEINE DATEN
• Dein Fortschritt bleibt auf deinem iPhone; Sicherung über die Dateien-App.
• Ein optionales kostenloses Profil synchronisiert ihn mit dailyturkish.app.
• Keine Werbung, kein Tracking.
```

### French: France, Belgium, Switzerland (French (Canada) is a separate language: paste this one there too)

- Name: `Daily Turkish` · Subtitle (27/30): `Apprendre le turc pas à pas`
- Keywords (100/100):

```text
cours,langue,leçons,vocabulaire,grammaire,verbes,mots,débutant,parler,turquie,istanbul,voyage,türkçe
```

- Promotional text (166/170):

```text
Apprenez le turc en courtes leçons quotidiennes, de A1 à C2 : un guide de grammaire par unité, 1 000 mots essentiels, hors ligne. Gratuit, sans pub. Appli en anglais.
```

- Description (1,305/4,000):

```text
Daily Turkish est un cours de turc pour quelques minutes par jour. À noter : l'application et ses explications sont en anglais.

LE COURS
• 226 leçons courtes en 60 unités, du premier « merhaba » (A1) jusqu'au C2.
• Près de 2 900 exercices : QCM, textes à trous, traductions, mots à assembler, conjugaison, lecture et écoute.
• Une correction immédiate après chaque réponse, avec l'explication des erreurs courantes.
• 12 conversations du quotidien, de A1 à B2 : au café, en taxi, à la pharmacie et plus encore.

LA GRAMMAIRE, CLAIREMENT
• Un guide de grammaire par unité, avec tableaux et exemples : harmonie vocalique, cas, temps, conditionnel, passif et bien plus.
• Un intermède culturel ou historique dans chaque unité.

1 000 MOTS EN FLASHCARDS
• Les 1 000 mots les plus utiles, chacun avec une phrase d'exemple et sa traduction.
• Des révisions au bon moment, selon l'algorithme SM-2 (comme Anki).

GARDER LE RYTHME
• Objectif quotidien, série de jours, 32 succès et un widget pour l'écran d'accueil.
• Un rappel quotidien, en alternance avec un mot du jour.
• Un jeu de vitesse : 10 mots en 60 secondes.

VOS DONNÉES
• Votre progression reste sur votre iPhone ; sauvegarde dans l'app Fichiers.
• Un profil gratuit et facultatif la synchronise avec dailyturkish.app.
• Sans publicité, sans pistage.
```

## App Review Information

Sign-in required: **unticked**. Contact: your first and last name, phone and email (seen by Apple only).

**Notes** (1,235/4,000)

```text
Daily Turkish is a complete offline Turkish course (levels A1 to C2): 226 lessons with instant feedback, a grammar guide per unit and 1,000 spaced-repetition flashcards, all built into the app. No account or network needed; an optional profile (Profile tab) saves the progress online, with email and password, and can be deleted in the app (Profile tab > Account & character > Delete my profile).

Native features:
- Daily study reminder as a local notification, alternating a word of the day and a nudge to study (Settings tab > Daily reminder; offered once on the Course tab, then iOS asks for permission).
- Haptic feedback on right and wrong answers, finished lessons and the daily goal (Settings > Haptics; on by default).
- A home-screen widget (WidgetKit) with the streak and the word of the day.
- Progress backup through the iOS share sheet and the Files app, and import from Files (Settings > Backup).
- An optional profile (Profile tab, email and password) that syncs the progress with the website; Delete my profile is on the same tab.

To try it: on the welcome screen, tap Start lesson 1 and answer a few exercises. Then open the Flashcards tab and tap Start studying. Then open the Practice tab and start a conversation.
```

Version release: Manually or Automatically, your choice.
