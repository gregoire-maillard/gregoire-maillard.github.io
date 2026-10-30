// What the app leaves out of the course, or says differently, so the App Store age rating can be 4+
// (PROJECT.md APP-6). The website and dailyturkish.app keep everything: these rules only change the copies in
// app/www, after build-www.mjs has copied them.
//
// 4+ means "None" for every content question of the App Store age rating: no alcohol, tobacco or drug
// references, no profanity, no sexual content, no weapons, no violence, no mature themes. Grégoire chose to
// trim the history interludes as well (executions, killings, political violence, the 1980 coup, 1915–1916).
// Plain wars, sieges and natural deaths stay.
//
// Every rule names the exact text it expects. When the website's content changes and a rule no longer matches,
// the build fails instead of shipping something unreviewed; GUARD below also fails the build when a new
// word of these kinds appears anywhere in the app's course data.
//
// Paths: "/"-separated keys inside the JSON file; "key=value" picks the array element whose key equals value
// (exercises/id=a2-u04-l03-e01, vocab/tr=sigara). Rules:
//   { file, path, find, replace }  replace `find`, which must occur exactly once in that string, by `replace`
//   { file, path, drop: true }     remove that array element (or object key)
// {N} in a page rule is the number of cards left in the app's deck.

// Flashcards whose word is itself the problem. Lesson vocab must not point to them (the build checks).
export const DROP_CARDS = [
  "fc-0103", // öldürmek, to kill
  "fc-0251", // silah, weapon
  "fc-0273", // lanet, curse, damn
  "fc-0433", // cinayet, murder
  "fc-0472", // katil, murderer
  "fc-0506", // içki, alcoholic drink
  "fc-0525", // seks
  "fc-0557", // ceset, corpse
  "fc-0671", // uyuşturucu, illegal drugs
  "fc-0738", // bomba, bomb
  "fc-0783", // bira, beer
  "fc-0804", // bar, pub
  "fc-0818", // sigara, cigarette
  "fc-0833", // sarhoş, drunk
  "fc-0913", // şarap, wine
];

// Exercises left out whole (translations about smoking; the lesson keeps its other exercises).
export const DROP_EXERCISES = [
  "a2-u05-l02-e10", // Artık burada sigara içemezsiniz.
  "a2-u06-l01-e06", // Sigara içmemelisin.
  "a2-u06-l03-e05", // Kural bu: burada sigara içmek yasak.
  "b1-u04-l01-e06", // Sigara içmeyi bıraktı.
];

const L = (id) => "lessons/" + id + ".json";
const G = (id) => "grammar/" + id + ".json";
const U = (id) => "culture/" + id + ".json";
const FC = (n) => "flashcards/fc-" + n + ".json";
const ex = (id, field) => "exercises/id=" + id + (field ? "/" + field : "");

export const EDITS = [
  // ── flashcards: notes, examples and senses that mention what was dropped ──
  { file: FC("0001-0200"), path: "cards/id=fc-0081/note", find: "*Sigarayı bırakmak* = to quit smoking.", replace: "*İşi bırakmak* = to quit one's job." },
  { file: FC("0201-0400"), path: "cards/id=fc-0242/en/1", find: "to shoot", replace: "to knock (at a door)" },
  { file: FC("0201-0400"), path: "cards/id=fc-0242/note", find: " In films, often **to shoot**.", replace: " *Kapıya vurmak* = to knock at the door." },
  { file: FC("0201-0400"), path: "cards/id=fc-0277/en/1", drop: true }, // "to smoke"
  { file: FC("0201-0400"), path: "cards/id=fc-0277/note", find: "Also **to smoke**: *sigara içmek*. Soup is drunk too: *çorba içmek*.", replace: "Soup is drunk too: *çorba içmek*, and medicine taken: *ilaç içmek*." },
  { file: FC("0201-0400"), path: "cards/id=fc-0349/note", find: " *Ateş etmek* = to fire (a gun).", replace: " *Ateş yakmak* = to light a fire." },
  { file: FC("0601-0800"), path: "cards/id=fc-0618/note", find: " *Böcek ilacı* = insecticide; illegal drugs are *uyuşturucu*.", replace: " *Böcek ilacı* = insecticide." },
  { file: FC("0601-0800"), path: "cards/id=fc-0626/note", find: "A living body; a dead one is *ceset*. ", replace: "" },
  { file: FC("0601-0800"), path: "cards/id=fc-0670/ex/tr", find: "Dedektif sonunda katili buldu.", replace: "Dedektif sonunda gerçeği buldu." },
  { file: FC("0601-0800"), path: "cards/id=fc-0670/ex/en", find: "The detective finally found the killer.", replace: "The detective finally found the truth." },
  { file: FC("0801-1000"), path: "cards/id=fc-0811/note", find: "*Silahını indir!* = Put the gun down!", replace: "*Dosyayı indirdim* = I downloaded the file." },
  { file: FC("0801-1000"), path: "cards/id=fc-0842/en/2", drop: true }, // "shot (for a shotgun)"

  // ── lessons ──
  // a2-u04-l03, "I never smoke": the same negative aorist with fish and milk
  { file: L("a2-u04-l03"), path: "title", find: "I never smoke", replace: "I never eat fish" },
  { file: L("a2-u04-l03"), path: "vocab/tr=sigara", drop: true },
  { file: L("a2-u04-l03"), path: "vocab/tr=sigara içmek", drop: true },
  { file: L("a2-u04-l03"), path: ex("a2-u04-l03-e01", "question"), find: "**I don't smoke**", replace: "**I don't drink milk**" },
  { file: L("a2-u04-l03"), path: ex("a2-u04-l03-e01", "options/0"), find: "Sigara içmem.", replace: "Süt içmem." },
  { file: L("a2-u04-l03"), path: ex("a2-u04-l03-e01", "options/1"), find: "Sigara içmezim.", replace: "Süt içmezim." },
  { file: L("a2-u04-l03"), path: ex("a2-u04-l03-e01", "options/2"), find: "Sigara içmez.", replace: "Süt içmez." },
  { file: L("a2-u04-l03"), path: ex("a2-u04-l03-e01", "options/3"), find: "Sigara içmiyor.", replace: "Süt içmiyor." },
  { file: L("a2-u04-l03"), path: ex("a2-u04-l03-e01", "why/2"), find: "doesn't smoke", replace: "doesn't drink it" },
  { file: L("a2-u06-l03"), path: "goal", find: "sigara içmek yasak", replace: "burada park etmek yasak" },
  { file: L("b1-u04-l04"), path: ex("b1-u04-l04-e09", "text"), find: "Sigara içme___ bırakmak istiyorum.", replace: "Şeker yeme___ bırakmak istiyorum." },
  { file: L("b1-u04-l04"), path: ex("b1-u04-l04-e09", "en"), find: "I want to quit smoking.", replace: "I want to give up eating sugar." },
  { file: L("b1-u04-l04"), path: ex("b1-u04-l04-e09", "explain"), find: "*içmeyi bırakmak*", replace: "*yemeyi bırakmak*" },
  { file: L("b1-u10-l02"), path: "intro/text", find: "*Burada sigara içilmez* (No smoking here)", replace: "*Burada fotoğraf çekilmez* (No photographs here)" },
  { file: L("b1-u10-l02"), path: ex("b1-u10-l02-e02", "question"), find: "*Burada sigara içilmez.*", replace: "*Burada fotoğraf çekilmez.*" },
  { file: L("b1-u10-l02"), path: ex("b1-u10-l02-e02", "options/0"), find: "No smoking here.", replace: "No photographs here." },
  { file: L("b1-u10-l02"), path: ex("b1-u10-l02-e02", "options/1"), find: "Cigarettes are not sold here.", replace: "Photographs are not sold here." },
  { file: L("b1-u10-l02"), path: ex("b1-u10-l02-e02", "options/2"), find: "Nobody smoked here.", replace: "Nobody took photographs here." },
  { file: L("b1-u10-l02"), path: ex("b1-u10-l02-e02", "explain"), find: "*iç-il-mez*", replace: "*çek-il-mez*" },
  { file: L("b2-u05-l02"), path: ex("b2-u05-l02-e11", "tr"), find: "Bu alanda sigara içmek yasaktır.", replace: "Bu alanda park etmek yasaktır." },
  { file: L("b2-u05-l02"), path: ex("b2-u05-l02-e11", "en"), find: "Smoking is forbidden in this area.", replace: "Parking is forbidden in this area." },
  { file: L("b2-u05-l02"), path: ex("b2-u05-l02-e11", "options/0"), find: "sigara içmek", replace: "park etmek" },
  { file: L("b2-u05-l02"), path: ex("b2-u05-l02-e11", "options/1"), find: "sigara içmek", replace: "park etmek" },
  { file: L("b2-u05-l02"), path: ex("b2-u05-l02-e11", "options/2"), find: "sigara içmek", replace: "park etmek" },
  // b2-u07: the double causative with pişirtmek instead of öldürtmek
  { file: L("b2-u07-l03"), path: "goal", find: "such as öldürtmek", replace: "such as pişirtmek" },
  { file: L("b2-u07-l03"), path: "intro/text", find: "*öldürtmek* (to have someone killed)", replace: "*pişirtmek* (to have someone cook)" },
  { file: L("b2-u07-l03"), path: ex("b2-u07-l03-e08", "question"), find: "*Padişah veziri öldürttü.* Who killed the vizier?", replace: "*Annem yemeği aşçıya pişirtti.* Who cooked the meal?" },
  { file: L("b2-u07-l03"), path: ex("b2-u07-l03-e08", "options/0"), find: "Someone the sultan sent", replace: "The cook" },
  { file: L("b2-u07-l03"), path: ex("b2-u07-l03-e08", "options/1"), find: "The sultan himself", replace: "My mother herself" },
  { file: L("b2-u07-l03"), path: ex("b2-u07-l03-e08", "options/2"), find: "No one: the vizier died of illness", replace: "No one: the meal was bought ready-made" },
  { file: L("b2-u07-l03"), path: ex("b2-u07-l03-e08", "why/1"), find: "That would be *öldürdü*.", replace: "That would be *pişirdi*." },
  { file: L("b2-u07-l03"), path: ex("b2-u07-l03-e08", "why/2"), find: "*Öldürmek* is **to kill**; the sentence is about a killing ordered by the sultan.", replace: "*Pişirmek* is **to cook**; the second *-t* says she had someone else do it." },
  { file: L("b2-u07-l03"), path: ex("b2-u07-l03-e08", "explain"), find: "*öl-dür-t-tü*: *öldürmek* (to kill) + a second causative: **had him killed**.", replace: "*piş-ir-t-ti*: *pişirmek* (to cook) + a second causative: **had it cooked**." },
  { file: L("c1-u04-l02"), path: ex("c1-u04-l02-e11", "models/0"), find: "eski bayraklar, silahlar ve resmî evrak", replace: "eski bayraklar, haritalar ve resmî evrak" },
  { file: L("c1-u06-l03"), path: ex("c1-u06-l03-e03", "options/3"), find: "okul bokul", replace: "okul pokul" },

  // ── units ──
  { file: "units/b1-u10.json", path: "summary", find: "*Burada sigara içilmez*", replace: "*Burada fotoğraf çekilmez*" },
  { file: "units/b2-u07.json", path: "summary", find: "(*öldürtmek*)", replace: "(*pişirtmek*)" },

  // ── grammar guides ──
  { file: G("a2-u05"), path: "sections/2/blocks/1/items/1", find: "*Burada sigara içemezsiniz* (You can't smoke here)", replace: "*Burada fotoğraf çekemezsiniz* (You can't take photos here)" },
  { file: G("a2-u06"), path: "sections/0/blocks/9/items/tr=Sigara içmemelisin.", drop: true },
  { file: G("a2-u06"), path: "sections/2/blocks/6/text", find: "*Burada sigara içmek yasaktır* (Smoking is forbidden here)", replace: "*Burada park etmek yasaktır* (Parking is forbidden here)" },
  { file: G("b1-u04"), path: "sections/0/blocks/0/text", find: "*Burada sigara içmek yasak*", replace: "*Burada park etmek yasak*" },
  { file: G("b1-u04"), path: "sections/0/blocks/5/rows/4/2", find: "Sigara iç|me|y|i bıraktı.", replace: "Şeker ye|me|y|i bıraktı." },
  { file: G("b1-u04"), path: "sections/0/blocks/5/rows/4/3", find: "She quit smoking.", replace: "She gave up eating sugar." },
  { file: G("b1-u04"), path: "sections/0/blocks/7/items/tr=Sonunda sigarayı bırakmaya karar verdi.", drop: true },
  { file: G("b1-u10"), path: "intro", find: "(*Burada sigara içilmez*, No smoking here)", replace: "(*Burada fotoğraf çekilmez*, No photographs here)" },
  { file: G("b1-u10"), path: "sections/1/title", find: "Burada sigara içilmez", replace: "Burada fotoğraf çekilmez" },
  { file: G("b1-u10"), path: "sections/1/blocks/1/text", find: "*Burada sigara içilmez* (No smoking here)", replace: "*Burada fotoğraf çekilmez* (No photographs here)" },
  { file: G("b1-u10"), path: "sections/1/blocks/3/rows/1", drop: true }, // Sigara içilmez (the table keeps Fotoğraf çekilmez)
  { file: G("b1-u10"), path: "summary/3", find: "*Sigara içilmez*", replace: "*Fotoğraf çekilmez*" },
  { file: G("b1-u12"), path: "sections/3/blocks/1/rows/5/0", find: "“Sigara içmem.”", replace: "“Kahve içmem.”" },
  { file: G("b1-u12"), path: "sections/3/blocks/1/rows/5/1", find: "Ali sigara içmezmiş.", replace: "Ali kahve içmezmiş." },
  { file: G("b1-u12"), path: "sections/3/blocks/1/rows/5/2", find: "Ali says he doesn't smoke.", replace: "Ali says he doesn't drink coffee." },
  { file: G("b2-u04"), path: "sections/3/blocks/6/items/tr=Doktor sigarayı bırakmamı tavsiye etti.", drop: true },
  { file: G("b2-u04"), path: "sections/4/blocks/2/rows/2/0", find: "Burada sigara iç|il|me|s|i", replace: "Burada fotoğraf çek|il|me|s|i" },
  { file: G("b2-u04"), path: "sections/4/blocks/2/rows/2/2", find: "Smoking here is forbidden.", replace: "Taking photos here is forbidden." },
  { file: G("b2-u05"), path: "sections/1/blocks/6/items/tr=Bu alanda sigara içmek yasaktır.", drop: true },
  { file: G("b2-u07"), path: "intro", find: "the double causative *öldürtmek*", replace: "the double causative *pişirtmek*" },
  { file: G("b2-u07"), path: "sections/2/title", find: "Öldürtmek, yaptırtmak", replace: "Pişirtmek, yaptırtmak" },
  { file: G("b2-u07"), path: "sections/2/blocks/1/rows/0/0", find: "*ölmek* (to die)", replace: "*pişmek* (to cook, to be cooked)" },
  { file: G("b2-u07"), path: "sections/2/blocks/1/rows/0/1", find: "*öldürmek* (to kill)", replace: "*pişirmek* (to cook)" },
  { file: G("b2-u07"), path: "sections/2/blocks/1/rows/0/2", find: "*öldürtmek* (to have someone killed)", replace: "*pişirtmek* (to have someone cook something)" },
  { file: G("b2-u07"), path: "sections/2/blocks/2/text", find: "*öldürmek* simply means **to kill**, so **to have someone killed** needs *öldürtmek*: *Padişah veziri öldürttü* (The sultan had the vizier killed), a sentence you will meet in Ottoman history.", replace: "*pişirmek* simply means **to cook**, so **to have someone cook it** needs *pişirtmek*: *Annem yemeği aşçıya pişirtti* (My mother had the cook make the meal)." },
  { file: G("b2-u07"), path: "sections/2/blocks/4/items/0/tr", find: "Padişah veziri öldürttü.", replace: "Annem yemeği aşçıya pişirtti." },
  { file: G("b2-u07"), path: "sections/2/blocks/4/items/0/seg", find: "Padişah veziri öl|dür|t|tü.", replace: "Annem yemeği aşçıya piş|ir|t|ti." },
  { file: G("b2-u07"), path: "sections/2/blocks/4/items/0/en", find: "The sultan had the vizier killed.", replace: "My mother had the cook make the meal." },
  { file: G("b2-u07"), path: "summary/4", find: "(*öldürtmek*)", replace: "(*pişirtmek*)" },

  // ── culture interludes ──
  { file: U("a2-u06"), path: "blocks/3/text", find: " with a high alcohol content, between 60 and 80 per cent,", replace: "" },
  { file: U("a2-u06"), path: "blocks/3/text", find: "others are made with tobacco, lavender or flowers", replace: "others are made with lavender or flowers" },
  { file: U("a2-u06"), path: "sources/1/note", find: "60 to 80 per cent ethyl alcohol; ", replace: "" },
  { file: U("a2-u06"), path: "sources/3/note", find: "a light alcoholic liquid scented with lemon, lavender, tobacco and other plants", replace: "a light scented liquid made with lemon, lavender and other plants" },
  { file: U("a2-u11"), path: "blocks/4/text", find: " During the war, in 1915 and 1916, the Ottoman government deported the Armenians of Anatolia, and hundreds of thousands of them died. Most historians and many states call these events a genocide; the Turkish state rejects that term.", replace: "" },
  { file: U("a2-u11"), path: "sources/title=Armenian Genocide", drop: true },
  { file: U("a2-u11"), path: "sources/title=Armenian genocide", drop: true },
  { file: U("a2-u12"), path: "blocks/1/text", find: "jewels, fine cloth and weapons", replace: "jewels and fine cloth" },
  { file: U("b1-u04"), path: "blocks/7/tr", find: "Sultan kızmış ve iki adamı idam etmiş", replace: "Sultan kızmış ve iki adamı cezalandırmış" },
  { file: U("b1-u04"), path: "blocks/7/en", find: "The angry sultan had both men executed", replace: "The angry sultan had both men punished" },
  { file: U("b1-u04"), path: "questions/2/q", find: "*idam etmiş*", replace: "*cezalandırmış*" },
  { file: U("b1-u08"), path: "sources/6/note", find: "Constantine XI killed, his exact fate uncertain", replace: "the exact fate of Constantine XI uncertain" },
  { file: U("b2-u01"), path: "blocks/3/tr", find: "1553'te Kahire'de idam edildi.", replace: "1553'te Kahire'de hayatını kaybetti." },
  { file: U("b2-u01"), path: "vocab/tr=idam etmek", drop: true },
  { file: U("b2-u01"), path: "sources/3/note", find: "beheaded in Cairo in 1553", replace: "died in Cairo in 1553" },
  { file: U("b2-u09"), path: "blocks/0/text", find: "Television, economic crisis, political violence and the 1980 coup ended the boom", replace: "Television and economic crisis ended the boom" },
  { file: U("b2-u09"), path: "blocks/2/tr", find: "Ekonomik kriz, siyasi şiddet ve 1980 darbesi de eklenince", replace: "Ekonomik kriz de eklenince" },
  { file: U("b2-u09"), path: "blocks/2/glossary/tr=siyasi", drop: true },
  { file: U("b2-u09"), path: "blocks/2/glossary/tr=şiddet", drop: true },
  { file: U("b2-u09"), path: "blocks/2/glossary/tr=darbe", drop: true },
  { file: U("b2-u09"), path: "questions/1/options/0", find: "Television, the economic crisis, political violence and the 1980 coup", replace: "Television and the economic crisis" },
  { file: U("b2-u09"), path: "questions/1/explain", find: "Ekonomik kriz, siyasi şiddet ve 1980 darbesi de eklenince", replace: "Ekonomik kriz de eklenince" },
  { file: U("b2-u09"), path: "vocab/tr=darbe", drop: true },
  { file: U("b2-u09"), path: "vocab/tr=şiddet", drop: true },
  { file: U("b2-u09"), path: "sources/4/note", find: "television and the 1980 coup in the decline", replace: "television in the decline" },
  { file: U("b2-u10"), path: "blocks/1/glossary/tr=bade/en", find: "a cup of wine or drink", replace: "a sacred cup of drink" },
  { file: U("b2-u10"), path: "blocks/3/tr", find: " Yaygın bir anlatıya göre Sivas valisi Hızır Paşa'nın emriyle idam edildi.", replace: "" },
  { file: U("b2-u10"), path: "blocks/3/glossary/tr=vali", drop: true },
  { file: U("b2-u10"), path: "blocks/3/glossary/tr=idam etmek", drop: true },
  { file: U("b2-u10"), path: "sources/4/note", find: "; according to the belief widespread among Alevis, imprisoned and executed on the orders of Deli Hızır Paşa, governor of Sivas", replace: "; a central figure of the Alevi tradition" },
  { file: U("c1-u07"), path: "blocks/2/tr", find: "1948'de Bulgaristan sınırında öldürüldü; ölümünün koşulları bugün de tartışılmaktadır. Onu, sınırı geçmek için para verdiği bir kaçakçının öldürdüğü düşünülür, ancak olayla ilgili başka görüşler de vardır.", replace: "1948'de Bulgaristan sınırında hayatını kaybetti; ölümünün koşulları bugün de tartışılmaktadır." },
  { file: U("c1-u07"), path: "blocks/2/glossary/tr=kaçakçı", drop: true },
  { file: U("c1-u07"), path: "sources/2/note", find: "killed at the Bulgarian border around 1–2 April 1948, most likely by the smuggler Ali Ertekin, whose ties to the intelligence service are debated", replace: "died at the Bulgarian border around 1–2 April 1948" },
  { file: U("c1-u07"), path: "sources/3/note", find: "killed in 1948 during an attempt to cross into Bulgaria; two theories about how he died", replace: "died in 1948 during an attempt to cross into Bulgaria" },

  // ── index.json: the grammar point labels follow the renamed guide sections ──
  { file: "index.json", path: "points/gp-impersonal-passive/label", find: "Burada sigara içilmez", replace: "Burada fotoğraf çekilmez" },
  { file: "index.json", path: "points/gp-double-causative/label", find: "Öldürtmek, yaptırtmak", replace: "Pişirtmek, yaptırtmak" },
];

// The app's pages and turkish.js: the deck's size, once the cards above are gone ({N}).
export const PAGE_EDITS = [
  { file: "turkish.html", find: "and a deck of the 1,000 most useful words on spaced repetition", replace: "and a deck of {N} of the most useful words on spaced repetition" },
  { file: "turkish.html", find: "the deck is the 1,000 most frequent words, in order", replace: "the deck is {N} of the 1,000 most frequent words, in order" },
  { file: "turkish.html", find: "culture notes and 1,000 flashcards", replace: "culture notes and {N} flashcards" },
  { file: "turkish.html", find: "a 1,000-word flashcard deck", replace: "a {N}-word flashcard deck" },
  { file: "turkish.html", find: "A deck of the 1,000 most useful words", replace: "A deck of {N} of the most useful words" },
  { file: "turkishcards.html", find: "the 1,000 most useful words", replace: "{N} of the most useful words", all: true },
  { file: "turkishcards.html", find: "The 1,000 most useful Turkish words", replace: "{N} of the most useful Turkish words", all: true },
  { file: "turkishcards.html", find: "Turkish · 1,000 words", replace: "Turkish · {N} words" },
  { file: "turkishlesson.html", find: "a 1,000-word flashcard deck", replace: "a {N}-word flashcard deck" },
  { file: "assets/js/turkish.js", find: '"Learn all 1,000 words in the flashcards", nWords, 1000, "1000"', replace: '"Learn all {N} words in the flashcards", nWords, {N}, "{N}"' },
];

// Words that must not appear anywhere in the app's course data (any string, any file; URLs are skipped, and the
// pipes of seg strings are removed first). A match fails the build: add a rule above, or, for a harmless use,
// an entry to GUARD_OK.
export const GUARD = /(?<![\p{L}\p{N}])(bira|biralar[\p{L}\p{N}]*|birahane[\p{L}\p{N}]*|şara[pb][\p{L}\p{N}]*|rakı|rakıy[\p{L}\p{N}]*|alkol[\p{L}\p{N}]*|içki[\p{L}\p{N}]*|sarhoş[\p{L}\p{N}]*|meyhane[\p{L}\p{N}]*|votka|viski|beers?|wines?|alcohol[\p{L}\p{N}]*|drunken|liquor|vodka|whisk(?:e)?y|champagne|cocktails?|taverns?|sigara[\p{L}\p{N}]*|tütün[\p{L}\p{N}]*|nargile[\p{L}\p{N}]*|cigar[\p{L}\p{N}]*|tobacco|smoking|smoked|uyuşturucu[\p{L}\p{N}]*|esrar[\p{L}\p{N}]*|cocaine|heroin|marijuana|lanet[\p{L}\p{N}]*|kahrol[\p{L}\p{N}]*|kahret[\p{L}\p{N}]*|damn[\p{L}\p{N}]*|bok|boku[\p{L}\p{N}]*|bokul|seks|seksi|sex|sexy|öldür[\p{L}\p{N}]*|katil|katili[\p{L}\p{N}]*|katiller[\p{L}\p{N}]*|cinayet[\p{L}\p{N}]*|kill[\p{L}\p{N}]*|murder[\p{L}\p{N}]*|silah[\p{L}\p{N}]*|tabanca[\p{L}\p{N}]*|guns?|rifles?|pistols?|bombs?|bomba[\p{L}\p{N}]*|idam[\p{L}\p{N}]*|execut[\p{L}\p{N}]*|behead[\p{L}\p{N}]*|şiddet[\p{L}\p{N}]*|violen[\p{L}\p{N}]*|weapons?|genocide|soykırım[\p{L}\p{N}]*|deport[\p{L}\p{N}]*|massacre[\p{L}\p{N}]*|katliam[\p{L}\p{N}]*|darbe[\p{L}\p{N}]*|coup|tortur[\p{L}\p{N}]*|işkence[\p{L}\p{N}]*|suicide|intihar[\p{L}\p{N}]*|corpse|ceset[\p{L}\p{N}]*)(?![\p{L}\p{N}])/iu;

// Harmless matches: [file, word] (the word as it matched, lowercased).
export const GUARD_OK = [
  ["culture/c1-u02.json", "lanet"],       // Anitta's curse on Hattusa (lanet etmek, to put a curse on), not swearing
  ["grammar/b2-u06.json", "coup"],        // French: "jette un coup d'œil"
  ["grammar/c1-u08.json", "sex"],         // kanka: "a close friend, of either sex"
  ["lessons/c1-u08-l02.json", "sex"],     // the same note in the lesson
];
