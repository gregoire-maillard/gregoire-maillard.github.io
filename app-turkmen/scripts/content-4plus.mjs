// What the Daily Turkmen app leaves out of the course, or says differently, so the App Store age rating can be 4+.
// A fork of app/scripts/content-4plus.mjs (Daily Turkish, APP-6). The website and dailyturkmen.app keep everything:
// these rules only change the copies in app-turkmen/www, after build-www.mjs has copied them.
//
// 4+ means "None" for every content question of the App Store age rating: no alcohol, tobacco or drug references,
// no profanity, no sexual content, no weapons, no violence, no mature themes. As in Daily Turkish, plain wars,
// battles, sieges and natural deaths stay; killing, a man-eating giant and deaths in political struggles go.
//
// Smoking: the course teaches rules and signs with *çilim çekmek* (to smoke) in a dozen places. The app says
// *surat çekmek* (to take photos) instead: the same verb, so every form, segmentation and accepted answer keeps its
// grammar, and "no photos here" is a sign learners really meet. The Turkmen of these rewrites is AI-written:
// the native reviewer should see it (README.md lists it).
//
// Every rule names the exact text it expects. When the website's content changes and a rule no longer matches,
// the build fails instead of shipping something unreviewed; GUARD fails the build when a new word of these kinds
// appears anywhere in the app's course data.
//
// Rules, applied in this order:
//   EDITS    { file, path, find, replace }  replace `find`, which must occur exactly once in that string
//            { file, path, set }            put `set` (any JSON value) there
//            { file, path, drop: true }     remove that array element (or object key)
//            Paths: "/"-separated keys; "key=value" picks the array element whose key equals value (vocab/tk=şerap).
//   REPLACE  [find, replace, n]  in every string of every course file, `find` must occur exactly n times in all
//            (the count is checked so a new sentence on the website is looked at before it ships).
//   DROP_CARDS, ADD_CARDS: cards out, and the app's own card in, so the deck still holds 1,000 words.

export const DROP_CARDS = [
  "fc-0899", // çilim, cigarette
];

// The app's own card: a word the 1,000-word list lacks, taught by the reworded signs of A2 unit 6 (rank 1001 only
// orders it after the list). AI-written, for the native review.
export const ADD_CARDS = {
  file: "flashcards/tm-fc-1001-1001.json",
  doc: {
    deck: "core-1000", range: [1001, 1001],
    source: "App only (app-turkmen/scripts/content-4plus.mjs): one everyday word added so the app's deck still holds 1,000 words after the 4+ filter leaves one card out. Rank 1001 only orders it after the list; it is not a corpus rank. Gloss, example and note are original.",
    cards: [
      { id: "fc-1001", rank: 1001, tk: "fotosurat", pos: "noun", en: ["photo, photograph"],
        ex: { tk: "Bu ýerde surat çekmek gadagan.", en: "Taking photos isn't allowed here." },
        forms: { acc: "fotosuraty" },
        note: "Everyday speech often says just *surat* (picture, photo). *Surat çekmek* is to take a photo.",
        level: "a2", unit: "a2-u06" },
    ],
  },
};

export const EDITS = [
  // çekmek's note lists the uses of the verb
  { file: "flashcards/tm-fc-0001-0200.json", path: "cards/id=fc-0164/note", find: ", *çilim çekmek* (to smoke)", replace: "" },
  // a word bank: the English answer is built from tiles
  { file: "lessons/a2-u04-l02.json", path: "exercises/id=a2-u04-l02-e10/text", set: "My father sometimes takes photos." },
  { file: "lessons/a2-u04-l02.json", path: "exercises/id=a2-u04-l02-e10/answer", set: ["My", "father", "sometimes", "takes", "photos"] },
  { file: "lessons/a2-u04-l02.json", path: "exercises/id=a2-u04-l02-e10/distractors", set: ["never", "is", "taking"] },
  // Nisa's rhytons: the kings drank from them, no wine
  { file: "culture/b1-u03.json", path: "blocks/4/tk", find: " olardan şerap içendirler.", replace: " olardan içendirler." },
  { file: "culture/b1-u03.json", path: "vocab/tk=şerap", drop: true },
  // Collectivization: the resistance stays, the deaths go
  { file: "culture/b1-u02.json", path: "blocks/4/tk", find: " we bu göreşde köp adam öldi.", replace: "." },
  { file: "culture/b1-u02.json", path: "blocks/4/en", find: ", and armed resistance to Soviet rule, which lasted into the early 1930s, cost many lives.", replace: "." },
  // Merv and the Mongols: the siege stays, the death toll goes
  { file: "culture/a2-u03.json", path: "blocks/4/text", find: "Medieval chroniclers wrote of hundreds of thousands of dead; their figures can't be checked, but the city never recovered.", replace: "The city never recovered." },
  // Dede Korkut: Basat defeats the giant
  { file: "culture/b1-u08.json", path: "blocks/1/en", find: "the young Basat kills Tepegöz, a one-eyed giant who eats people,", replace: "the young Basat defeats Tepegöz, a one-eyed giant," },
  { file: "culture/b1-u08.json", path: "blocks/1/tk", find: "Basat ýigit adam iýýän Ýekegözi ýeňýär", replace: "Basat ýigit Ýekegözi ýeňýär" },
];

// Smoking → taking photos, everywhere in the course (lessons, guides, cards, index, units). Longest first.
export const REPLACE = [
  ["çilim", "surat", 44],
  ["Çilim", "Surat", 12],
  ["no smoking here (literally: here, cigarettes aren't smoked)", "no photos here (literally: here, photos aren't taken)", 1],
  ["**he doesn't smoke here**", "**he doesn't take photos here**", 1],
  ["He doesn't smoke. He isn't smoking.", "He doesn't take photos. He isn't taking photos.", 1],
  ["He doesn't smoke. He'd never smoke.", "He doesn't take photos. He'd never take photos.", 1],
  ["He doesn't smoke", "He doesn't take photos", 2],
  ["My grandfather doesn't smoke.", "My grandfather doesn't take photos.", 1],
  ["Please do not smoke!", "Please do not take photos!", 1],
  ["Do not smoke!", "Do not take photos!", 1],
  ["No smoking", "No photos", 7],
  ["no smoking", "no photos", 4],
  ["can't smoke here", "can't take photos here", 4],
  ["mustn't smoke here", "mustn't take photos here", 2],
  ["Smoking is forbidden here", "Taking photos is forbidden here", 1],
  ["smoking is forbidden here", "taking photos is forbidden here", 3],
  ["smoking is [not allowed|prohibited] here", "taking photos is [not allowed|prohibited] here", 2],
  ["a person who doesn't smoke", "a person who doesn't take photos", 1],
  ["people who don't smoke", "people who don't take photos", 2],
  ["Cigarettes aren't sold here.", "Photos aren't sold here.", 1],
  ["smoking isn't done here", "taking photos isn't done here", 1],
  ["**able** to smoke", "**able** to take photos", 1],
  ["gave up smoking", "gave up taking photos", 1],
  ["to smoke", "to take photos", 2],
];

export const GUARD = /(?<![\p{L}\p{N}])(çilim[\p{L}\p{N}]*|temmäki[\p{L}\p{N}]*|şerap[\p{L}\p{N}]*|arak|araky[\p{L}\p{N}]*|piwo[\p{L}\p{N}]*|serhoş[\p{L}\p{N}]*|neşe[\p{L}\p{N}]*|öldür[\p{L}\p{N}]*|ýarag[\p{L}\p{N}]*|tüpeň[\p{L}\p{N}]*|bomba[\p{L}\p{N}]*|beers?|wines?|alcohol[\p{L}\p{N}]*|drunken|liquor|vodka|whisk(?:e)?y|champagne|cocktails?|taverns?|cigar[\p{L}\p{N}]*|tobacco|smoking|smoked|smokes|cocaine|heroin|marijuana|damn[\p{L}\p{N}]*|sex|sexy|kill[\p{L}\p{N}]*|murder[\p{L}\p{N}]*|guns?|rifles?|pistols?|bombs?|execut[\p{L}\p{N}]*|behead[\p{L}\p{N}]*|violen[\p{L}\p{N}]*|weapons?|genocide|deport[\p{L}\p{N}]*|massacre[\p{L}\p{N}]*|coup|tortur[\p{L}\p{N}]*|suicide|corpse|eats people)(?![\p{L}\p{N}])/iu;

// Harmless matches: [file, word] (the word as it matched, lowercased).
export const GUARD_OK = [
  ["culture/b1-u10.json", "killed"],   // a source's title: "A Soviet sea, killed by an obsession with “white gold”" (the Aral Sea)
  ["culture/a2-u01.json", "coup"],     // the failed coup attempt in Moscow, August 1991, before independence: no violence told
];
