# Turkmen A1 → B1 · Curriculum

What the Turkmen course (working name **Daily Turkmen**, served at `dailyturkish.app/turkmen/`) teaches, in which order, and in which conversation each part gets written. [TM-PROJECT.md](TM-PROJECT.md) says *how* content is written (schemas, style rules, workflow); this file says *what* goes where. [TM-PROMPTS.md](TM-PROMPTS.md) holds the prompt to paste into each conversation.

This file is also the **registry** of unit IDs, grammar-point IDs and batches. `scripts/turkmen/validate.mjs` (forked from the Turkish validator in TK-BUILD-1) parses it, and unit files must match it: same unit titles, the same grammar points in the same order. To change the plan, edit this file first, then the JSON, then run the validator.

The course is modelled on the Turkish course (`turkish/CURRICULUM.md`): same path of units and lessons, same exercise types, same batch rhythm. It is **not a translation of it**, and it is not taught by comparison with Turkish: learners are English speakers who start from zero. The order and content of units follow Turkmen grammar (see "Notes for writers" below), and every interlude and cultural reference is about Turkmenistan and the Turkmen.

Scope for now: **A1, A2 and B1** (36 units). B2 to C2 may follow once B1 is finished and reviewed; their unit IDs (`b2-u01`…) stay free.

Line formats the validator reads (keep them exact, as in the Turkish file):

| What | Format |
|---|---|
| Level | `## A1 · First steps` |
| Unit | `#### a1-u01 · English title · Turkmen tagline` |
| Grammar point | two-space indent under `- Grammar:`, then ``- `gp-id` — description`` |
| Interlude | `- Interlude: **Title** — one-line description` |
| Batch | `- Batch: A1-1` |
| Batch table row | `\| A1-1 \| a1-u01, a1-u02, a1-u03 \| focus \|` |

**Suffix notation** (from a1-u03 on; before that, guides spell the variants out, -lar/-ler): **A** = a/e (written ä in the cases the guides explain), **Y** = y/i, or u/ü where rounding applies (`gp-harmony-rounding`), **K** = k/g. Letters in brackets appear only after a consonant or only after a vowel, as the guide for each suffix says: -(Y)m after a consonant gives -ym/-im (*kitabym*), after a vowel just -m (*ejem*); -(n)Yň gives -nyň/-niň after a vowel (*Aýnanyň*). Turkmen suffixes do not alternate d/t or c/ç the way Turkish ones do: the locative is always -dA (*Aşgabatda*), the past always -dY (*gitdi*). Two things the letters A and Y don't show, both settled in TK-MORPH (open questions 1 and 5 below): in -ýAr and -rAk the front form of A is ä (*gelýär*, *kiçiräk*), and a stem's final e becomes ä before some suffixes (*ejä*, *ejäm*, *işläp*). The morphology engine writes the first as Ä (`assets/js/turkmen-morph.js`, TM-PROJECT.md 3).

## Notes for writers: where the Turkish course's habits don't apply

**Who the course is for:** English speakers learning Turkmen from scratch. They know no Turkish, and the course never compares Turkmen with Turkish (TM-PROJECT.md section 1). This section is only for the people and conversations writing the course, who start from the Turkish course's code, schemas and files: it lists what those carry over that is wrong for Turkmen. None of it is shown to learners, and none of it should be phrased as a comparison in the content.

Read this before writing any batch. Every point below changes what a unit teaches or how an exercise is checked.

- **Alphabet.** 30 Latin letters (1993, revised 1999): a b ç d e ä f g h i j ž k l m n ň o ö p r s ş t u ü w y ý z. **y** is the vowel of Turkish ı; **ý** is the consonant of Turkish y; **j** is Turkish c; **w** replaces v; **ň** is the ng of *sing*; **ä** is a distinct open front vowel. No c, ğ, ı, q, v, x. Plain i/I behave as in English (no dotted capital İ).
- **Sounds.** s and z are pronounced as interdentals, like English *th* in *thin* and *this*. Long vowels are not marked in writing but change meaning: *at* "horse" and *at* "name" (long a), *ot* "grass" and *ot* "fire" (long o). Long-vowel words voice their last consonant before a vowel: *adym* "my name" but *atym* "my horse".
- **No apostrophes** on proper nouns: *Aşgabatda*, *Merdanyň*, *1991-nji ýylda*.
- **The question particle -mY is written attached**: *Sen talypmy?*, *Gelýärsiňmi?*, *Bu seniň kitabyň dälmi?*
- **"To be"** is usually zero after a pronoun (*Men talyp.*), with -dYr in the third person in careful style; formal writing uses -dYr with the personal endings (*Men talypdyryn*, open question 2); "not" is *däl*.
- **Locative and ablative never change d to t**: *mekdepde*, *işden*.
- **Dative after a vowel** fuses with the last vowel: *Mary* → *Mara*, *eje* → *ejä*, *okuwçy* → *okuwça*.
- **Pronoun cases**: *maňa, saňa, oňa* (to me, you, him); *muny* "this" (accusative of *bu*).
- **The future -jAk takes no personal ending**: *Men ertir geljek*, *Sen geljek*. The pronoun (or a subject) is required. The same holds for the necessitative -mAlY (*Men gitmeli*).
- **Two presents**: -ýAr (*gelýär*) and the "general" -Ar (*geler*), plus progressive forms built with -(Y)p and the posture verbs *otyr, dur, ýatyr, ýör* (*Ol kitap okap otyr*).
- **Ability** is -(Y)p bilmek (*ýüzüp bilýärin*), not a suffix.
- **Participles**: -An (*gelen*, *okan*) does the work of Turkish -(y)An and -DIk; in object relatives the possessive goes on the noun: *meniň okan kitabym* (the book I read). Fact clauses use -dYgY: *Onuň gelendigini bilýärin*.
- **Converbs**: -AndA "when" (*gelende*), -kA "while, as" (*çagakam*), -Andan soň, -mAzdan öň, -mAn, *diýip*.
- **Vocabulary false friends** with Turkish: *ýapmak* "to close" (not "to do"), *düşünmek* "to understand" (not "to think"), *bile* "together" (not "even"), *gaty* "very; hard", *gyzyl* "red; gold", *ertir* "tomorrow; morning", *mal* "livestock", *ýurt* "country, homeland".

The rounding (labial) harmony of suffix vowels is weaker than in Turkish (`gp-harmony-rounding`). The rule the morphology engine encodes, with tests (TK-MORPH; open question 1 below says what it rests on): a high vowel that a suffix brings, or a stem's final y or i once a suffix follows it, is u or ü when it is the vowel of the **second syllable** and the first syllable has o, ö, u or ü, **unless it is the last letter of the word**: *gözüm, gözüň, öýüne, öňünde, boldum, bolup, boluň, bolsun, dostluk, gowurak, gowumy*, but *gözi, öýi, ogly, dosty, boldy, gowy*. From the third syllable on it is y or i: *öýümiz, ýurdumyz, bolupdyr, oturyň, okuwçy*. Low vowels never round (*göze, gözde, gözler*), and vowels inside a stem are spelt as they are (*uzyn, otyr*).

## Overview

| Level | Title | Units | Lessons per unit | Content batches | Interlude format |
|---|---|---|---|---|---|
| A1 | First steps | 12 | 4 | 4 | English, with a 2–4 sentence Turkmen mini-read |
| A2 | Everyday life | 12 | 4 | 4 | English, with a 4–6 sentence Turkmen mini-read |
| B1 | Stories and clauses | 12 | 4 | 5 | Parallel Turkmen and English paragraphs |
| **Total** | | **36** | **144 lessons** | **13** | **36 interludes** |

Expect about 1,700 exercises, 36 grammar guides, 36 culture interludes and 1,000 flashcards. A grammar point is *introduced* in the unit listed below; any later unit may practise it again.

No `listen` exercises in this version: browsers have no Turkmen text-to-speech voice (TM-PROJECT.md, section 2). Every other exercise type of the Turkish course is used.

## Conjugation and grammar coverage

Every finite verb form taught from A1 to B1, shown on *gelmek* (to come) and, for "to be", on *talyp* (student), with the unit that introduces it. Negative and question forms are taught with each form; the question particle -mY is written attached.

| Form | Example | Introduced in |
|---|---|---|
| Present "to be" | Men talyp; Ol talypdyr | `gp-copula-present` (a1-u03) |
| "Not" with nouns | Men talyp däl; Talyp dälmi? | `gp-dal` (a1-u04) |
| Present -ýAr | gelýärin, gelmeýärin, gelýärsiňmi? | `gp-present-yar` (a1-u06) |
| Imperative, 2nd person | gel, geliň, gelme, gelmäň | `gp-imperative` (a1-u12) |
| Past -dY | geldim, gelmedim, geldiňmi? | `gp-past-dy` (a2-u01) |
| Past "to be" -dY | talypdym, däldim, bardy, ýokdy | `gp-past-copula` (a2-u02) |
| Discovered or reported "to be": eken | talyp eken, bar eken | `gp-eken` (a2-u02) |
| Perfect -(Y)pdYr (first look) | gelipdir | `gp-ypdyr-intro` (a2-u02) |
| Future -jAk (no personal ending) | men geljek, geljek däl, geljekmi? | `gp-future-jak` (a2-u03) |
| General present -Ar | gelerin, geler, gelmerin, gelmez | `gp-aorist-forms`, `gp-aorist-negative` (a2-u04) |
| Ability -(Y)p bilmek | gelip bilýärin, gelip bilmerin | `gp-yp-bilmek` (a2-u05) |
| Necessity -mAlY (no personal ending) | men gelmeli, gelmeli däl | `gp-maly` (a2-u06) |
| Optative | geleýin, geleli, geleliň | `gp-optative` (a2-u07) |
| Imperative, 3rd person -sYn | gelsin, gelsinler | `gp-imperative-3rd` (a2-u07) |
| Progressive with posture verbs | gelip otyr, okap ýör | `gp-yp-progressive` (a2-u11) |
| Past continuous -ýArdY | gelýärdim | `gp-past-continuous` (b1-u01) |
| Pluperfect -(Y)pdY | gelipdim | `gp-pluperfect` (b1-u01) |
| Past habit "used to" -ArdY | gelerdim | `gp-used-to` (b1-u02) |
| Future in the past -jAkdY | geljekdim | `gp-future-in-past` (b1-u02) |
| Past necessity -mAlYdY | gelmelidim | `gp-should-have` (b1-u02) |
| Full perfect -(Y)pdYr | gelipdirin, gelmändir | `gp-ypdyr` (b1-u03) |
| Reported forms with eken | gelýän eken, geljek eken, gelen eken | `gp-eken-compounds` (b1-u03) |
| Assumption -dYr | gelendir, öýdedir | `gp-dyr-assumption` (b1-u03) |
| Conditional -sA | gelsem, gelsek | `gp-conditional-sa` (b1-u09) |
| Real conditions with bolsa | gelýän bolsam, gelen bolsam, geljek bolsam | `gp-conditional-real` (b1-u09) |
| Unreal conditions | gelsem görerdim; gelen bolsam görerdim | `gp-conditional-unreal` (b1-u09) |

The personal endings are taught explicitly: the "to be" and present set (-Yn, -sYň, -∅, -Ys, -sYňYz, -lAr) in `gp-present-yar`, the past set (-m, -ň, -∅, -k, -ňYz, -lAr) in `gp-past-dy`, both compared in `gp-person-endings-types`, and the persons of the imperative and optative in `gp-imperative`, `gp-optative` and `gp-imperative-3rd`. TK-MORPH checks the exact endings of each tense against the orthographic dictionary before A1-2 is written.

| Area | Forms | Introduced in |
|---|---|---|
| Voice | passive, impersonal passive, reflexive, causative, reciprocal | b1-u10, b1-u11 |
| Participles | -ýAn, -An, -jAk, -mAdYk | b1-u05, b1-u06 |
| Verbal nouns | -mAk with cases and possessives, -(Y)ş, -(Y)w, -dYgY | b1-u04, b1-u06 |
| Converbs | -(Y)p, -AndA, -kA, -Andan soň, -mAzdan öň, -mAn, -ýAnçA, -AlY bäri, -dYgY üçin, -An badyna, -A -A | a2-u05, a2-u11, b1-u07, b1-u08 |
| Helper verbs after -(Y)p | otyr, dur, ýatyr, ýör (progressive); bilmek (ability); görmek, bermek, almak, goýmak | a2-u05, a2-u11, b1-u08 |
| Nouns | plural, five cases plus *bilen*, possessives, genitive, compounds, -dAky and -ky, pronominal n, voicing, vowel loss | a1-u02 to a1-u12, a2-u10 |
| Word building | -lY, -sYz, -çY, -lYk, -çA, -jYk, -dAş, -lA, -lAş, -lAn | a2-u12, b1-u11 |

## A1 · First steps

Sounds, harmony and the noun system, the verb "to be" and the present tense. Four lessons per unit, 10–14 short exercises per lesson, 5–10 new words per lesson. Grammar guides spell suffix variants out (-lar/-ler) until the notation is introduced in a1-u03. Interludes are in English with a few Turkmen sentences that use only what has been taught.

#### a1-u01 · Letters and sounds · Salam!
- Grammar:
  - `gp-alphabet` — the 30 letters and their order; the letters an English speaker needs to learn (ä, ç, j, ž, ň, ş, w, y, ý); capitals; no c, q, v, x
  - `gp-pronunciation` — one letter, one sound; y (a vowel) against ý (a consonant); s and z as *th* sounds; ň; g and k beside back vowels
  - `gp-vowel-length` — long vowels are not written but change meaning (*at* horse, *at* name); e against ä; stress usually on the last syllable
  - `gp-sentence-basics` — the big picture: suffixes stack on a root, the verb comes last, no gender, no articles; *Men Merdan.*
- Vocabulary: greetings and goodbyes (*Salam*, *Ýagdaýlaryň nähili?*, *Gowy*, *Sag bol*, *Hoş gal*), courtesy words, yes and no, introducing yourself (*Meniň adym…*, *Tanyşanyma şat*)
- Interlude: **Three alphabets in one century** — Turkmen in the Arabic script, the Latin alphabet of 1928, Cyrillic from 1940, and the Latin alphabet of 1993, whose first version used letters like $ and ¢
- Batch: A1-1

#### a1-u02 · Vowel harmony and plurals · Bu näme?
- Grammar:
  - `gp-vowel-groups` — the nine vowels as front or back, rounded or unrounded
  - `gp-harmony-2way` — two-way harmony: e after front vowels, a after back vowels; the last vowel of the word decides; loanwords
  - `gp-plural` — the plural -lar/-ler, and where Turkmen uses it less than English
  - `gp-demonstratives` — bu, şu, ol and şol as adjectives and pronouns; bular, şular, olar; *Bu näme? Bu kim?*
  - `gp-bir-indefinite` — bir as "a" and "one"; no word for "the"
- Vocabulary: classroom and everyday objects, colours (*ak, gara, gyzyl, gök, ýaşyl, sary*)
- Interlude: **The Akhal-Teke horse** — the golden horse of the oases, on the state emblem, and the UNESCO listing of its breeding art and horse decorations
- Batch: A1-1

#### a1-u03 · Saying who you are · Men talyp
- Grammar:
  - `gp-harmony-rounding` — high suffix vowels y, i, u, ü; where rounding applies and where it doesn't (*gözüm* but *gözi*); the A and Y notation used from now on
  - `gp-personal-pronouns` — men, sen, ol, biz, siz, olar; sen and siz (plural and polite); when the pronoun stays
  - `gp-copula-present` — "to be" in the present: zero after a pronoun (*Men talyp*), -dYr in the third person in careful style (*Ol mugallymdyr*), and the full endings of written Turkmen
  - `gp-nationality-words` — nationalities and where people are from: *türkmen, rus, iňlis*; -lY on country and city names as a fixed phrase (*aşgabatly*), taught in full in a2-u12
- Vocabulary: countries and nationalities, professions (mugallym, lukman, talyp, okuwçy, sürüji), states and feelings (ýadaw, bagtly, aç, kesel)
- Interlude: **Turkmen names** — names that carry a meaning or a wish, surnames in -ow, -ew and -owa, and the forms of address aga, daýza and -jan
- Batch: A1-1

#### a1-u04 · Questions and negation · Sen ýadawmy?
- Grammar:
  - `gp-dal` — *däl* for negating nouns and adjectives (*Men talyp däl*, *Bu kitap däl*)
  - `gp-question-my` — the question particle -mY: written attached, in harmony (*talypmy?*, *gowumy?*), after *däl* (*dälmi?*); its place marks the focus
  - `gp-question-words` — kim, näme, nähili, näçe, haýsy, haçan, näme üçin; no -mY with a question word
  - `gp-answers` — hawa, ýok, elbetde, *şeýle*; the tag *dälmi?*
  - `gp-hem` — *hem* "also, too", its contracted forms (*menem*, *senem*), and *hem … hem* "both … and"
- Vocabulary: common adjectives and their opposites, how-are-you exchanges
- Interlude: **Ependi** — the trickster-sage of Turkmen anecdotes, the local Nasreddin, and some of his best-known stories
- Batch: A1-2

#### a1-u05 · Where things are · Öýde hiç kim ýok
- Grammar:
  - `gp-locative` — the locative -da/-de "in, at, on", always with d (*mekdepde*, *Aşgabatda*); with "to be": *Nirede? Öýde.*
  - `gp-bar-yok` — bar and ýok: "there is" and "there isn't"; *barmy?*, *ýokmy?*
  - `gp-proper-nouns` — capitals and suffixes on names without an apostrophe (*Aşgabatda*, *Aýnada*, *2026-njy ýylda*)
  - `gp-place-words` — bu ýerde, şu ýerde, ol ýerde, nirede; *mende, sende, onda*
- Vocabulary: rooms and furniture, places in the city, here and there
- Interlude: **Ashgabat** — a city rebuilt after the 1948 earthquake, its white marble, and the Kopetdag mountains behind it
- Batch: A1-2

#### a1-u06 · The present tense · Näme edýärsiň?
- Grammar:
  - `gp-infinitive-stem` — the infinitive -mak/-mek and the stem (gelmek → gel-, okamak → oka-, işlemek → işle-)
  - `gp-present-yar` — -ýar/-ýär with the endings -Yn, -sYň, -∅, -Ys, -sYňYz, -lAr (*gelýärin, okaýaryn*); stems that voice t to d (*gidýär, edýär, aýdýar*)
  - `gp-present-negative` — negative -maýar/-meýär (*gelmeýärin*); questions *gelýärsiňmi?* and *gelmeýärsiňmi?*
  - `gp-present-uses` — now, habits and the near future; time words häzir, şu gün, şu wagt
- Vocabulary: about 15 everyday verbs (gelmek, gitmek, etmek, okamak, ýazmak, içmek, iýmek, işlemek, gürlemek, düşünmek, bilmek, islemek, söýmek, garaşmak, ýaşamak)
- Interlude: **Green tea and the çaýhana** — *gök çaý* in a *käse*, the teapot that goes round the cloth, and the teahouse
- Batch: A1-2

#### a1-u07 · To and from · Nirä barýarsyň?
- Grammar:
  - `gp-dative` — the dative -a/-e "to, toward", fused with a final vowel (*Mara, ejä, okuwça*); verbs that take it (seretmek, münmek, başlamak, ynanmak, kömek etmek); *barmak* and *gitmek*
  - `gp-ablative` — the ablative -dan/-den "from, out of"; verbs that take it (gorkmak); -dan … -a çenli "from … to"
  - `gp-pronoun-cases-dat-abl` — maňa, saňa, oňa, bize, size, olara; menden, senden; nirä, nireden; bu ýere, bu ýerden
- Vocabulary: transport (awtobus, otly, uçar, taksi), travel, directions (sag, çep, göni)
- Interlude: **The Karakum** — the black-sand desert that covers most of the country: dunes, wells, saxaul and the oasis towns around it
- Batch: A1-3

#### a1-u08 · Definite objects · Çöregi alýaryn
- Grammar:
  - `gp-accusative` — the accusative -(n)Y for definite objects (*Çaý içýärin* against *Çaýy içdim*); names and pronouns always take it
  - `gp-voicing` — k, p, ç, t become g, b, j, d before a vowel (*çöregi, kitaby, agajy, Aşgabady*); one-syllable words keep theirs (*aty*), except long-vowel ones (*ady*)
  - `gp-pronoun-accusative` — meni, seni, ony, bizi, sizi, olary; *muny* and *şuny*
  - `gp-object-word-order` — the bare object sits right before the verb; definite objects can move
- Vocabulary: food and drink, shopping (*Näçe manat?*, *Bahasy näçe?*)
- Interlude: **Bread and the tamdyr** — Turkmen *çörek* baked against the walls of a clay oven, and the respect bread is shown
- Batch: A1-3

#### a1-u09 · My family · Meniň maşgalam
- Grammar:
  - `gp-possessive-suffixes` — -(Y)m, -(Y)ň, -(s)Y, -(Y)mYz, -(Y)ňYz, -(s)Y or -lArY (*kakam, ejäň, öýüm, kitaby*)
  - `gp-possessive-have` — "to have" with a possessed noun and bar or ýok (*Meniň iki doganym bar*, *Meniň maşynym ýok*)
  - `gp-vowel-loss` — vowel loss before vowel suffixes (ogul → oglum, burun → burnum, agyz → agzym)
  - `gp-possessive-voicing` — voicing with possessives (*kitabym*, *çöregimiz*); *at* name → *adym*, *at* horse → *atym*
- Vocabulary: family, with the Turkmen distinctions (aga, uýa, jigi, dogan; daýy, daýza, bibi; ata, ene), body parts
- Interlude: **The toý** — a Turkmen wedding: the feast, the music, the bride's red dress and silver jewellery
- Batch: A1-3

#### a1-u10 · Whose is it? · Aýnanyň öýi
- Grammar:
  - `gp-genitive` — the genitive -(n)Yň (*öýüň, kitabyň, Aýnanyň*); meniň, seniň, onuň, biziň, siziň, olaryň
  - `gp-genitive-possessive` — the possessive construction (*Aýnanyň kitaby*, *öýüň gapysy*, *meniň adym*); dropping the pronoun
  - `gp-pronominal-n` — the n after a third-person possessive before case endings (*öýünde, kitabyny, gapysyna*)
  - `gp-whose` — kimiň?, kimde?, *Bu kimiň kitaby?*
- Vocabulary: house and neighbourhood, belongings
- Interlude: **The ak öý** — the white felt yurt: its lattice walls, the *tüýnük* at the top, and how a family puts one up
- Batch: A1-4

#### a1-u11 · Numbers and time · Sagat näçe?
- Grammar:
  - `gp-numbers` — cardinal numbers up to the millions; how compounds are built (ýigrimi bäş, iki müň ýigrimi alty)
  - `gp-numbers-singular` — singular nouns after numbers and quantity words (iki kitap, köp adam, birnäçe gün); *sany* as a counter (*üç sany alma*)
  - `gp-ordinals` — ordinals -(Y)njY (birinji, ikinji, üçünji, dördünji, onunjy); written with digits as *5-nji*, *1991-nji*
  - `gp-telling-time` — *Sagat näçe?* and *Sagat näçede?*; ýarym and çärýek; minutes past and to
  - `gp-dates` — days, months and dates (*1991-nji ýylyň 27-nji oktýabry*); lowercase day and month names
  - `gp-age-price` — asking and giving age; prices in manat and teňňe (*Näçe manat?*)
- Vocabulary: numbers, the clock, days, months, seasons, prices
- Interlude: **Nowruz** — the spring new year of 21 March: *sümelek*, swings, visits, and the multinational UNESCO listing that includes Turkmenistan
- Batch: A1-4

#### a1-u12 · Requests and company · Gel, otur!
- Grammar:
  - `gp-imperative` — second-person imperative: the bare stem (*Gel!*), -(Y)ň for plural and polite (*Geliň, Oturyň, Okaň*), negative -ma/-me and -maň/-mäň; *haýyş edýärin*
  - `gp-bilen` — bilen "with, by, and" (*ejäm bilen, awtobus bilen, meniň bilen*), written as a separate word
  - `gp-ucin` — üçin "for" (*seniň üçin, şonuň üçin, Türkmenistan üçin*)
  - `gp-conjunctions-basic` — we, hem, ýöne, emma, ýa-da
- Vocabulary: at table and in a café (*Buýruň*, *Sag boluň*, *Hasap, haýyş edýärin*), household instructions
- Interlude: **Palaw, dograma and gutap** — Turkmen dishes, the cauldron, and who cooks what for a feast
- Batch: A1-4

## A2 · Everyday life

All the simple tenses and moods, comparison, postpositions and the first word-building suffixes. Four lessons per unit, 10–14 exercises per lesson, 5–8 new words per lesson. Interlude mini-reads grow to 4–6 Turkmen sentences.

#### a2-u01 · The past tense · Düýn näme etdiň?
- Grammar:
  - `gp-past-dy` — -dy/-di with the endings -m, -ň, -∅, -k, -ňYz, -lAr (*geldim, okadyk*)
  - `gp-past-dy-negative-question` — gelmedim, geldiňmi?, gelmediňmi?
  - `gp-person-endings-types` — the two sets of personal endings side by side, and which tenses take which
  - `gp-time-past` — düýn, öňňin, geçen hepde, … öň (iki gün öň), entek (not yet), eýýäm (already)
- Vocabulary: weekend activities, time expressions
- Interlude: **1991: independence and neutrality** — the end of the Soviet Union, the referendum and declaration of October 1991, and the UN resolution of 12 December 1995 on permanent neutrality
- Batch: A2-1

#### a2-u02 · Was, were, and once upon a time · Bar eken, ýok eken
- Grammar:
  - `gp-past-copula` — -dY on nouns and adjectives (*talypdym, öýdedik*); bardy, ýokdy, däldi; *talypmydyň?*
  - `gp-eken` — *eken* for something found out or heard (*Ol mugallym eken*), and the tale opening *Bar eken, ýok eken*
  - `gp-ypdyr-intro` — a first look at -(Y)pdYr: what has happened, as found or heard (*Ol gelipdir*), compared with -dY
- Vocabulary: childhood, weather, feelings in the past
- Interlude: **Turkmen folk tales** — *ertekiler*: the opening and closing formulas, clever heroes, and the storytellers who passed them on
- Batch: A2-1

#### a2-u03 · The future · Sen ertir näme etjek?
- Grammar:
  - `gp-future-jak` — -jak/-jek with no personal ending (*Men geljek, Biz geljek*); the subject must be said
  - `gp-future-negative-question` — geljek däl, geljekmi?, geljek dälmi?
  - `gp-future-time-words` — ertir, birigün, geljek hepde, indiki ýyl, … soň; present or future for plans
- Vocabulary: holidays and travel planning
- Interlude: **Ancient Merv** — the oasis city on the Silk Road, Sultan Sanjar's mausoleum, and the UNESCO site
- Batch: A2-1

#### a2-u04 · Habits and the general present · Her gün çaý içerin
- Grammar:
  - `gp-aorist-forms` — the general present -Ar, -r after a vowel (*geler, okar, işlär*) with the endings of `gp-present-yar`
  - `gp-aorist-negative` — negative -mAr in the first and second persons, -mAz in the third (*gelmerin, gelmez*); *gelermiň?*
  - `gp-aorist-uses` — habits, general truths, probable future, offers and promises (*Çaý içersiňizmi?*, *Ertir jaň ederin*)
  - `gp-aorist-vs-yar` — choosing -ýAr or -Ar
- Vocabulary: daily routine, frequency words (her gün, köplenç, käte, adatça, hiç haçan)
- Interlude: **Turkmen carpets** — the *göl* of each tribe, madder red and natural dyes, the five göls on the flag, and Carpet Day
- Batch: A2-2

#### a2-u05 · Can and can't · Ýüzüp bilýärsiňmi?
- Grammar:
  - `gp-yp-bilmek` — the converb -(Y)p (*gelip, okap, görüp*; e-stems *işläp*) with *bilmek* for "can" (*ýüzüp bilýärin, okap bilerin*)
  - `gp-yp-bilmek-negative` — "cannot" (*gelip bilmeýärin, gelip bilmerin, gelip bilmedim*)
  - `gp-ability-uses` — ability, permission (*Girsem bolýarmy?*), possibility; *bolýar*, *mümkin*
  - `gp-negative-polarity` — hiç, hiç kim, hiç zat, hiç ýerde with a negative verb; biri, bir zat, hemme, her kim
- Vocabulary: sports and hobbies, skills, permission
- Interlude: **Göreş and horse races** — belt wrestling at weddings and festivals, and the races of Akhal-Teke horses
- Batch: A2-2

#### a2-u06 · Must and need · Men gitmeli
- Grammar:
  - `gp-maly` — -maly/-meli with no personal ending (*Men gitmeli*), negative *gitmeli däl*, question *gitmelimi?*
  - `gp-gerek` — *gerek* with nouns (*Maňa suw gerek*) and with -mAk (*Ir turmak gerek*); *gerek däl*; *hökman*
  - `gp-maly-bolmak` — -mAlY bolmak "to have to" in other tenses (*gitmeli boldum*, *gitmeli bolar*)
- Vocabulary: health and the doctor (*Başym agyrýar*), rules and signs
- Interlude: **Visiting a Turkmen home** — shoes at the door, the place of honour (*tör*), the cloth spread on the floor, bread and tea first
- Batch: A2-2

#### a2-u07 · Let's: suggestions and wishes · Gideli!
- Grammar:
  - `gp-optative` — -aýyn/-eýin, -aly/-eli and -alyň/-eliň (*geleýin, gideli, gideliň*); offers and suggestions (*Kömek edeýinmi?*)
  - `gp-imperative-3rd` — third-person imperative -sYn and -sYnlAr (*gelsin, otursynlar*)
  - `gp-set-wishes` — wishes built on these forms (*Gutly bolsun!*, *Ak ýol!*, *Işiňiz rowaç bolsun*, *Toýuňyz gutly bolsun*), and when to say them
  - `gp-bolyar` — *bolýar*, *bolýarmy?* and *bolmaz*: agreeing, asking and refusing
- Vocabulary: invitations, making plans, set phrases
- Interlude: **Küştdepdi** — the ring dance and song of the Caspian coast, and its UNESCO listing (2017)
- Batch: A2-3

#### a2-u08 · Comparing · Has uly, iň gowy
- Grammar:
  - `gp-comparative` — -dAn with an adjective (*Myrat Batyrdan uzyn*), *has*, and -rAk (*ulurak, kiçiräk, gowurak*)
  - `gp-superlative` — iň (*iň uly, iň köp*)
  - `gp-equative` — ýaly and deň (*seniň ýaly, men ýaly*); örän, gaty, birneme, azajyk
  - `gp-intensive-reduplication` — ap-ak, gap-gara, gyp-gyzyl, sap-sary, gös-göni
  - `gp-adjectives-as-adverbs` — adjectives used as adverbs (*gowy gürleýär*) and doubled adverbs (*ýuwaş-ýuwaş*)
- Vocabulary: describing people and places, climate and landscape
- Interlude: **Five welaýats** — Ahal, Balkan, Daşoguz, Lebap and Mary, from the Caspian to the Amu Darya, and the city of Ashgabat
- Batch: A2-3

#### a2-u09 · Where and when: postpositions · Öýüň öňünde
- Grammar:
  - `gp-postp-nominative` — bilen, üçin, ýaly, barada, hakda with nouns and with the genitive of pronouns (*meniň üçin, onuň bilen*)
  - `gp-postp-dative` — çenli, görä, tarap, garşy, ýakyn (*agşama çenli, maňa görä*)
  - `gp-postp-ablative` — soň, öň, bäri, başga (*işden soň, 2020-nji ýyldan bäri*)
  - `gp-place-nouns` — üst, aşak, öň, yz, gapdal, ýan, iç, daş, ara with possessive and case (*stoluň üstünde, öýüň yzynda*)
- Vocabulary: positions and furniture, time spans, the city
- Interlude: **Gonur Depe** — the Bronze Age centre of Margiana in the Murgab delta, and what its excavations found
- Batch: A2-3

#### a2-u10 · Compound nouns and -daky · Türkmen halysy
- Grammar:
  - `gp-compound-indefinite` — the noun compound (*türkmen halysy, awtobus duralgasy, Magtymguly köçesi*) and case endings after it (*türkmen halysyny*)
  - `gp-compound-chains` — compounds with possessives (*mekdep sumkam*); genitive or not
  - `gp-daky` — -dAky after the locative (*öýdäki kitap, Aşgabatdaky*) and -ky on time words (*şu günki, düýnki*)
  - `gp-ky-pronoun` — -ky after the genitive (*meniňki, seniňki, Aýnanyňky*)
- Vocabulary: dishes and food names, public places and institutions
- Interlude: **The telpek and Turkmen dress** — the sheepskin hat, long embroidered dresses, the *tahýa* cap and silver jewellery
- Batch: A2-4

#### a2-u11 · When, while and then · Öýe gelende
- Grammar:
  - `gp-anda` — -AndA "when" (*gelende, okanda*) and with personal endings (*gelenimde*)
  - `gp-ka` — -kA "while, as, when being" (*çagakam, öýdekä, barýarkam*)
  - `gp-yp` — -(Y)p to link actions that share tense and person (*Bazara baryp, çörek aldym*)
  - `gp-yp-progressive` — progressive with -(Y)p and *otyr, dur, ýatyr, ýör* (*Ol kitap okap otyr*, *Men işläp ýörün*)
  - `gp-sequence-connectors` — ilki, soňra, ondan soň, iň soňunda, sebäbi, şonuň üçin, şeýle-de bolsa
- Vocabulary: errands, daily sequences, telling a short story
- Interlude: **Görogly** — the epic of the hero Görogly and his horse Gyrat, sung by bagşy, and its UNESCO listing (2015)
- Batch: A2-4

#### a2-u12 · Word building · Aşgabatly mugallym
- Grammar:
  - `gp-ly` — -lY "with, having, from" (*şekerli, bulutly, aşgabatly*)
  - `gp-syz` — -sYz "without" (*şekersiz, işsiz, suwsuz*)
  - `gp-cy` — -çY for jobs and doers (*okuwçy, balykçy, halyçy*)
  - `gp-lyk` — -lYk for abstract nouns and things for a purpose (*dostluk, gözellik, garaşsyzlyk*)
  - `gp-ca` — -çA for languages and manner (*türkmençe, iňlisçe, rusça*); *meniň pikirimçe*
  - `gp-jyk` — diminutives -jYk and -jAgAz (*kiçijik, azajyk, gyzjagaz*)
- Vocabulary: jobs and shops, languages, where people are from
- Interlude: **The Tolkuçka bazaar** — Ashgabat's great market on the edge of the desert: carpets, telpeks, camels and everything else
- Batch: A2-4

## B1 · Stories and clauses

Compound tenses, reported and inferred events, and the non-finite forms (participles, verbal nouns, converbs) that make Turkmen subordinate clauses. Four lessons per unit, 10–14 exercises per lesson, including at least one `reading` exercise per unit. Interludes alternate Turkmen and English paragraphs.

#### b1-u01 · Past continuous and pluperfect · Ýagyş ýagýardy
- Grammar:
  - `gp-past-continuous` — -ýArdY for background and interrupted actions (*ýagýardy*), and *okap otyrdym*; negative and question forms
  - `gp-pluperfect` — -(Y)pdY for an earlier past (*Film eýýäm başlapdy*)
  - `gp-compound-tenses` — how compound forms are built and where -mY goes
  - `gp-narrative-adverbs` — birden, şol wagt, eýýäm, entek, şondan soň
- Vocabulary: incidents and storytelling
- Interlude: **The Seljuks** — from the Oghuz steppe to an empire: the battle of Dandanaqan (1040) near Merv, and Merv as Sultan Sanjar's capital
- Batch: B1-1

#### b1-u02 · Used to, was going to, should have · Öň bu ýerde ýaşardyk
- Grammar:
  - `gp-used-to` — -ArdY for past habits (*Öň köp kitap okardym*)
  - `gp-future-in-past` — -jAkdY "was going to" (*Saňa jaň etjekdim, ýöne…*)
  - `gp-should-have` — -mAlYdY "should have, had to" (*Ir gelmelidiň*)
  - `gp-could-have` — -(Y)p bilerdi and -(Y)p bilmezdi "could have, couldn't have"
- Vocabulary: change over time (öň, indi, heniz, üýtgemek, göçmek)
- Interlude: **Herders and oasis farmers** — semi-nomadic life with flocks and tents, irrigated oases, and the move to settled villages in the 20th century
- Batch: B1-1

#### b1-u03 · Found out, heard, assumed · Ol gelipdir
- Grammar:
  - `gp-ypdyr` — the full -(Y)pdYr paradigm with personal endings, negative and question forms
  - `gp-ypdyr-vs-dy` — choosing -dY or -(Y)pdYr: what you saw against what you found out, heard or inferred
  - `gp-eken-compounds` — reporting with eken after participles (*gelýän eken, geljek eken, gelen eken*)
  - `gp-dyr-assumption` — -dYr for a confident guess (*Ol öýdedir*, *Eýýäm gelendir*)
- Vocabulary: news, rumours and reports
- Interlude: **Ancient Nisa** — the Parthian fortresses at the foot of the Kopetdag, their ivory rhytons, and the UNESCO site (2007)
- Batch: B1-1

#### b1-u04 · Verbal nouns · Ýüzmegi gowy görýärin
- Grammar:
  - `gp-mak-cases` — the infinitive -mAk as a noun with case endings (*ýüzmegi, okamaga, gitmekden*)
  - `gp-mak-possessive` — -mAk with possessive endings (*Meniň gitmegim gerek*, *Onuň gelmegini isleýärin*)
  - `gp-ys-yw` — nouns from verbs in -(Y)ş and -(Y)w (*geliş, ýöreýiş, okuw, ýazuw*)
  - `gp-purpose` — purpose with -mAk üçin and -mAgA (*Men okamaga geldim*)
- Vocabulary: hobbies, preferences, intentions
- Interlude: **Bagşy and the dutar** — the two-stringed dutar, the singers who play it, and the UNESCO listing of dutar making and performance (2021)
- Batch: B1-2

#### b1-u05 · Participles: who does it · Kitap okaýan oglan
- Grammar:
  - `gp-participle-yan` — -ýAn for an action going on or habitual (*kitap okaýan oglan, işleýän ýerim*); negative -mAýAn
  - `gp-participle-an` — -An for a completed action, whether the noun is the subject or the object (*gelen adam*, *meniň okan kitabym*); the possessive goes on the noun
  - `gp-headless-participles` — participles used as nouns (*gelenler, okaýanlar, bilýän biri*)
  - `gp-relative-order` — everything that describes a noun comes before it
- Vocabulary: people and descriptions
- Interlude: **Magtymguly Pyragy** — the 18th-century poet, his life between Etrek and Gürgen, and lines from his poems
- Batch: B1-2

#### b1-u06 · Future participles and fact clauses · Meniň okajak kitabym
- Grammar:
  - `gp-participle-jak` — -jAk for what will or is to happen (*geljek ýyl, okajak kitabym*); negative -mAjAk
  - `gp-participle-madyk` — -mAdYk for what has not happened (*okamadyk kitabym*)
  - `gp-dygy` — fact clauses with -dYgY (*Onuň gelendigini bilýärin*, *Geljekdigini aýtdy*)
  - `gp-relative-subject` — the subject inside the clause: genitive or not (*Aýnanyň okan kitaby*)
- Vocabulary: books, films, memories, recommendations
- Interlude: **Kemine and Mollanepes** — two 19th-century poets: Kemine's satire and Mollanepes's *Zöhre-Tahyr*
- Batch: B1-2

#### b1-u07 · Converbs I: after, before, without, until · Işden soň jaň ederin
- Grammar:
  - `gp-andan-son` — -Andan soň "after" (*Öýe gelenden soň jaň ederin*)
  - `gp-mazdan-on` — -mAzdan öň "before" (*Ýatmazdan öň kitap okaýaryn*)
  - `gp-man` — -mAn "without" (*Hiç zat diýmän gitdi*)
  - `gp-yanca` — -ýAnçA "until" (*Ol gelýänçä garaşaýyn*)
  - `gp-aly-bari` — -AlY bäri "since" (*Bu ýere geleli bäri*)
- Vocabulary: routines and sequences, travel stories
- Interlude: **Köneürgenç** — the capital of Khorezm: the minaret of Gutlug Temir, the mausoleums, and the UNESCO site (2005)
- Batch: B1-3

#### b1-u08 · Converbs II and helper verbs · Okap gör!
- Grammar:
  - `gp-dygy-ucin` — -dYgY üçin "because" (*Wagty ýokdugy üçin gelmedi*)
  - `gp-an-badyna` — -An badyna "as soon as" (*Öýe gelen badyna uklady*)
  - `gp-reduplicated` — repeated converbs (*gide-gide, güle-güle*)
  - `gp-yp-helpers` — -(Y)p with görmek (try), bermek (for someone), almak (for oneself), goýmak (in advance or for good), *goýbermek*
- Vocabulary: feelings and reasons, favours
- Interlude: **Gorkut Ata** — the Oghuz tales of the Book of Dede Korkut and their storyteller-sage, as the Turkmen tell them
- Batch: B1-3

#### b1-u09 · Conditionals · Wagtyň bolsa, gel
- Grammar:
  - `gp-conditional-sa` — -sA with the past endings for hypotheses and suggestions (*Biraz dynç alsaň?*)
  - `gp-conditional-real` — eger; *bolsa* after nouns and participles for real conditions (*öýde bolsaň, gelýän bolsaň, geljek bolsaň*)
  - `gp-conditional-unreal` — unreal present and past: -sA … -ArdY (*Wagtym bolsa, gelerdim*) and -An bolsa … -ArdY
  - `gp-kaski` — *kaşki* with -sA and -sAdY for wishes and regrets
- Vocabulary: plans and possibilities, luck, weather forecasts
- Interlude: **Darvaza** — the gas crater burning in the Karakum: what is documented, what is told, and why accounts differ
- Batch: B1-4

#### b1-u10 · Passive and reflexive · Bu jaý täzeden guruldy
- Grammar:
  - `gp-passive` — -Yl, -Yn, -n (*ýazyldy, guruldy, okaldy*); the agent with *tarapyndan*
  - `gp-impersonal-passive` — passive of intransitive verbs for rules and general statements (*Bu ýerde çilim çekilmeýär*, *Oňa nädip barylýar?*)
  - `gp-reflexive` — -(Y)n reflexive verbs (*ýuwunmak, geýinmek, taýýarlanmak*)
  - `gp-oz` — öz, özüm, özüňi, özüne, öz-özüne; *öz öýüm*
- Vocabulary: buildings and their construction, personal care
- Interlude: **The Karakum Canal** — the canal dug from 1954 to carry Amu Darya water across the desert, and what it changed
- Batch: B1-4

#### b1-u11 · Causative and reciprocal · Saçymy kesdirdim
- Grammar:
  - `gp-causative` — -dYr, -t, -Yr, -Ar, -dYr after a voiceless stem (*ýazdyrmak, okatmak, geçirmek, çykarmak*) and irregular causatives (*görkezmek, getirmek, äkitmek*)
  - `gp-causative-objects` — who does what: *Saçymy kesdirdim*, *Çagany güldürdi*
  - `gp-reciprocal` — -(Y)ş (*görüşmek, tanyşmak, gürleşmek*) and *biri-biri*, *birek-birege*
  - `gp-verb-derivation` — verbs from nouns and adjectives: -lA, -lAş, -lAn, -Al (*arassalamak, gowulaşmak, öýlenmek, azalmak*)
- Vocabulary: services and errands, relationships
- Interlude: **The Turkmen language** — where it is spoken, its main dialects, its long vowels and *th* sounds, and how the written standard took shape
- Batch: B1-5

#### b1-u12 · Reported speech · Ol näme diýdi?
- Grammar:
  - `gp-direct-speech` — *diýmek* and *aýtmak* with quotes, and Turkmen punctuation of quotes
  - `gp-diyip-quotative` — *diýip* after a quote or a thought (*"Gijä galdym" diýip ylgady*)
  - `gp-diyip-purpose` — *diýip* for purpose and reason (*Oýanmasyn diýip ýuwaş gürledik*)
  - `gp-reported-speech` — reporting statements and requests with -dYgY and -mAgY (*Ertir geljekdigini aýtdy*, *Meniň gelmegimi haýyş etdi*)
- Vocabulary: verbs of speaking (aýtmak, diýmek, soramak, jogap bermek, gürrüň bermek, gygyrmak)
- Interlude: **Turkmen proverbs** — *nakyllar*: how they are used in conversation, and a dozen well-known ones with their meaning
- Batch: B1-5

## Batches

One batch = one conversation that writes finished, validated content. Progress is tracked in the log at the bottom of [TM-PROJECT.md](TM-PROJECT.md); `node scripts/turkmen/validate.mjs --batch <id>` reports what a batch still lacks. The prompt for each conversation is in [TM-PROMPTS.md](TM-PROMPTS.md).

### Content batches

| Batch | Units | Focus |
|---|---|---|
| A1-1 | a1-u01, a1-u02, a1-u03 | Letters, harmony, plurals, "to be" (also tests the schemas on real Turkmen content) |
| A1-2 | a1-u04, a1-u05, a1-u06 | Questions, locative, present -ýAr |
| A1-3 | a1-u07, a1-u08, a1-u09 | Dative, ablative, accusative, possessives |
| A1-4 | a1-u10, a1-u11, a1-u12 | Genitive, numbers and time, imperative |
| A2-1 | a2-u01, a2-u02, a2-u03 | Past, past of "to be" and eken, future -jAk |
| A2-2 | a2-u04, a2-u05, a2-u06 | General present, ability, necessity |
| A2-3 | a2-u07, a2-u08, a2-u09 | Optative, comparison, postpositions |
| A2-4 | a2-u10, a2-u11, a2-u12 | Compounds and -dAky, converbs and the progressive, word building |
| B1-1 | b1-u01, b1-u02, b1-u03 | Compound tenses, -(Y)pdYr and eken |
| B1-2 | b1-u04, b1-u05, b1-u06 | Verbal nouns, participles, fact clauses |
| B1-3 | b1-u07, b1-u08 | Converbs and helper verbs |
| B1-4 | b1-u09, b1-u10 | Conditionals, passive and reflexive |
| B1-5 | b1-u11, b1-u12 | Causative and reciprocal, reported speech |

### Flashcard batches

| Batch | Ranks | File |
|---|---|---|
| FC-1 | 1–200 | `assets/data/turkmen/flashcards/tm-fc-0001-0200.json` (written in TK-PLAN) |
| FC-2 | 201–400 | `assets/data/turkmen/flashcards/tm-fc-0201-0400.json` |
| FC-3 | 401–600 | `assets/data/turkmen/flashcards/tm-fc-0401-0600.json` |
| FC-4 | 601–800 | `assets/data/turkmen/flashcards/tm-fc-0601-0800.json` |
| FC-5 | 801–1000 | `assets/data/turkmen/flashcards/tm-fc-0801-1000.json` |

The ranked list for all five batches is `scripts/turkmen/tm-wordlist.tsv`, written in TK-PLAN (see TM-PROJECT.md 7.8).

### Build, review and QA conversations

| ID | What gets built |
|---|---|
| TK-PLAN | This file, TM-PROJECT.md, TM-PROMPTS.md, the word list and FC-1 (done, see the log) |
| TK-BUILD-1 | Fork the validator, the tests and `assets/js/turkish.js` into their Turkmen versions; data skeleton (`levels/`, `index.json`); FC-1 passes |
| TK-MORPH | `assets/js/turkmen-morph.js`: harmony, voicing, cases, possessives and every A1–A2 verb form, with `scripts/turkmen/morph-test.mjs` |
| TK-BUILD-2 | The hub `turkmen/index.html` and the lesson player `turkmen/lesson.html`, forked and rebranded; no speech |
| TK-BUILD-3 | The reader `turkmen/guide.html` and the flashcards page `turkmen/cards.html`, forked |
| TK-PUBLISH | Mirror to `dailyturkish.app/turkmen/`, pre-rendered guides, sitemap, links between the two courses, beta notice |
| TK-REVIEW | Repeatable: export a batch for a native speaker and apply the corrections that come back |
| QA-TK-1 | After A2: play through A1–A2, fix content and accept lists, extend the engine to B1 forms, fill `unit` on cards |
| QA-TK-2 | After B1: full validation, cross-links, mobile and accessibility checks, sitemap |
| SEO-TK | Conjugation pages for the 100 most frequent verbs, the word list pages and a grammar cheat sheet, as SEO-8 did for Turkish |

### Recommended order (26 conversations)

1. TK-PLAN (this conversation)
2. TK-BUILD-1
3. TK-MORPH
4. A1-1
5. TK-BUILD-2
6. TK-BUILD-3
7. TK-PUBLISH (A1-1 and FC-1 live as a beta; later units show "coming soon")
8. A1-2
9. A1-3
10. A1-4
11. FC-2
12. TK-REVIEW (A1)
13. A2-1
14. A2-2
15. A2-3
16. A2-4
17. FC-3
18. QA-TK-1
19. B1-1
20. B1-2
21. B1-3
22. B1-4
23. B1-5
24. FC-4 and FC-5 (one conversation each if needed)
25. QA-TK-2, then TK-REVIEW (A2–B1)
26. SEO-TK

## Open questions for native review

Points this plan states with less certainty than the rest. TK-MORPH and A1-1 settle each one from the orthographic dictionary, a reference grammar or a native speaker, update this file and log the answer.

**What TK-MORPH could reach (2026-10-30).** Only web search worked from that session, and its results are summaries of pages, so every pattern below rests on what search reported from a page, not on reading it. Not reachable: tk.wikipedia.org and en.wikipedia.org (outside the session's network allowlist), the Turkmen news sites azathabar.com, turkmenportal.com and metbugat.gov.tm (refused by the proxy), the orthographic and explanatory dictionaries (no online copy found) and Clark's *Turkmen Reference Grammar*. Reached through search: the Turkmen entries of English Wiktionary (*bolmak*, *gelmek*, *gije*, *je*, *talyp*), the grammar and phonology pages of the SIL Turkmen–English dictionary on webonary.org, Ankara University's open course *Türkmen Türkçesi*, Omniglot's Turkmen phrases, and Turkmen-language text on mejlis.gov.tm, iirmfa.edu.tm and hrw.org. Where a point stays open, the engine accepts both forms and the point is listed for the native review (TK-REVIEW looks here first).

1. **Rounding harmony** (`gp-harmony-rounding`): the exact rule for u/ü in suffixes, including possessive and accusative endings after a rounded root (*gözi* or *gözü*, *öýümiz* or *öýimiz*) and loanwords (*stoluň* or *stolyň*).
   **TK-MORPH: settled as the rule in "Notes for writers"** (second syllable after a rounded first syllable, unless the vowel ends the word; y/i from the third syllable): *gözi*, *gözüm*, *öýümiz*. Based on Wiktionary's Turkmen *bolmak* (*boldum* but *boldy*; *bolupdym*), the webonary grammar (the third-person possessive becomes -üni, -ünde, -ünden after a rounded stem), *ýurdumyz* on mejlis.gov.tm, *Türkmeniň ak öýi*, the Ankara course (*uly → ulurak*, *gök → gögümtik*) and the plan's own set phrases (*Sag boluň*, *Gutly bolsun*). Still open, both accepted by the engine: one-syllable loanwords (*stoluň*, the rule's form, and *stolyň*; the list is `LEX.loanRound`); the question particle, which the engine counts as part of the word as this plan does (*gowumy*, so *boldumy*, *gördümi*) while accepting *boldymy*, *gördimi* (its own vowel never rounds: *ýokmydy*). For the native review: *boldular*, *gördüler*, *bolduňyz* (the rule's forms, not seen in a source), *stoluň*, *boldumy*.
   **A1-1 note**: for a stem-final y before -dYr, search found both spellings in print: *uludyr* (turkmenistan.gov.tm, turkmenstudy.com) and *ulydyr* (a journal on science.gov.tm; *Aşgabat ulydyr!* on webonary.org). The engine gives *uludyr*; A1-1 avoids -dYr after *uly* and *gowy*. For the native review.
   **A2-3 note**: two forms in print disagree with the engine, which no exercise uses: *Goňşyňyz gutly bolsun!* (medeniyet.gov.tm) and *Goňşyň gutly bolsun* (R. Çakır, 2020) against the engine's *goňşuňyz*, *goňşuň* (a stem-final *y* after a rounded first syllable, the same point as *howly*, *ýaşuly*, *otly*); and *Bagt köşgi* (A1-3's interlude) against the engine's *köşki* (*köşk* should probably voice). On the other side, *gowurak* is in print (Baýramow's dictionary of paronyms, 2021) and *ulurak* in the Ankara course, so before `-rAk` the final *y* does round. A2-3 keeps *goňşy*, *howly* and *köşk* with an ending out of its exercises. For the native review.
2. **"To be" in the first and second persons** (`gp-copula-present`): how usual the endings are (*Men talyp* against *Men talybyn* or *Men talypdyryn*), and which forms the course should accept and teach first.
   **TK-MORPH: not settled** (no grammar reached; search found no page with *talypdyryn* or *mugallymdyryn*, nor with *Men talybyn*). The engine accepts, for every person, the form with its ending (*talybyn, talypsyň, talyp, talybys, talypsyňyz, talyplar*) and the zero form (*talyp*), plus *talypdyr* and *talypdyrlar*; it doesn't accept -dYr with a personal ending (*talypdyryn*). Teach the zero form after a pronoun first, as planned, and the endings as the written form. After a predicate ending in a vowel the zero form comes first (*Men öýde*), since *öýden* would read as "from home"; *öýdesiň*, *öýdesiňiz*. Questions: *talypmy?* for every person, and *talypsyňmy?* (with *talypmyň?* accepted). For the native review: the endings after a vowel, *talypmyň?*, and whether *Olar talyp* or *Olar talyplar* is usual.
   **A1-1: settled (2026-10-31).** Sources reached through web search only (fetching was blocked): *Men mugallym* “I am a teacher” in the Peace Corps Turkmen–English dictionary (chagalar-kitaphana.gov.tm), *Ýok, men lukman däl* in Peace Corps *Colloquial Turkmen* (2011, tm.usembassy.gov), *Men talyp* in a phrasebook, Omniglot's *Men …dan*; -dYr with a personal ending in published Turkmen: *minnetdardyryn* “I am grateful” (atavatan-turkmenistan.com, tk.wikipedia.org), *minnetdardyrys* “we are grateful” (an official speech on mfa.gov.tm), *türkmendirin* (an article on Magtymguly); -dYr described as an affirming particle that takes personal markers (a grammatical sketch of Turkmen on ResearchGate) and as used in every person of the present (Çukurova University Journal of Turkology Research, “Türkmen Türkçesinde ek-fiil…”); *Aşgabat ulydyr!* in the SIL grammar on webonary.org. No source showed the bare endings (*talybyn, talypsyň, talybys*). **Decision**: teach the zero form first, in every person, with the subject said (*Men talyp, Sen talyp, Biz talyp*); teach -dYr in the third person as the careful style (*Ol mugallymdyr*, *Olar talypdyr(lar)*); teach -dYr with the personal endings as the formal written form, to recognize and accepted in answers (*talypdyryn, talypdyrsyň, talypdyrys, talypdyrsyňyz, talypdyrlar*; the engine's `copula-dyr` now builds every person in the positive); don't teach or accept the bare endings, which the engine keeps as its last variants for the native review (but not *öýden*, *öýdes*, which read as other words). After *olar*, *talyp* and *talyplar* are both accepted. Questions (for A1-2): the engine now gives *talypmy?* first in every person, with *talypsyňmy?* and *talypmyň?* as variants. For the native review: *talypdyrsyň*, *talypdyrsyňyz* (not seen in print); whether *Biz talyp* or *Biz talyplar* is more natural; the bare endings.
   **A1-2: questions and *däl* settled (2026-11-10).** Sources reached through web search and fetching (fetching worked for webonary, Wikipedia, Britannica and UNESCO, not for the Peace Corps PDFs on web.archive.org): the SIL Turkmen–English dictionary (webonary.work, `files/sozluk.pdf`, read in full as far as the letter E) and its grammar pages, the Five Colleges Turkmen glossary (langmedia.fivecolleges.edu), DLIFLC's Turkmen language survival kits, English Wikipedia's *Turkmen grammar* and *Turkmen language*, Omniglot. **Questions with "to be"**: the zero form with `-mY` is the usual question in every person, with the subject said (*Sen talypmy?*, *Siz talypmy?*): *Sizde kimlik dokumendi barmy?* and *Siz kim?* (DLIFLC), *Ol ýerde kimdir biri barmy?*, *Suw barmy?* (SIL dictionary), *Kofe gyzgyn dälmi?* (Wikipedia), *Siziň okuw kitabyňyz ýerbe-ýermi?* (the Ankara course). With a second-person ending the particle comes **before** the ending: *gurgunmysyňyz?* "are you well?" (Five Colleges), and the SIL grammar's perfect questions *alypmysyň?*, *alypmysyňyz?* beside *alypdyrynmy?*, *alypdyrysmy?*. **Decision**: teach *talypmy?* (and *dälmi?*) in every person; recognize and accept *talypmysyň?*, *talypmysyňyz?*; the engine now orders the variants *talypmy*, *talypmysyň*, *talypmyň*, *talypsyňmy* (sen), *talypmy*, *talypmysyňyz*, *talypsyňyzmy* (siz), and for the first persons *talypmy*, *talypdyrynmy* (formal, by analogy with *alypdyrynmy*), *talybynmy* (bare, not after a vowel: no *öýdenmi*). Not taught or accepted: *talypmyň* (no source shows -mYň on a noun; *bilýärmiň*, *düşýärmiň* are verbs) and *talypsyňmy*. **däl in every person**: the zero form with the subject in every person, as planned (*Men talyp däl*; *Ýok, men lukman däl* in Peace Corps *Colloquial Turkmen*, *Ol aç däl* in Wikipedia, *Çaga at ýa-da it däl* and *Men nahar iýjek däl, men dok* in the SIL dictionary); *däldir* in the third person as careful style, by the rule of `gp-copula-present`; a second-person ending can follow *däl*, *Sen … dälsiň* (SIL dictionary, under *diň*), so the engine gives *dälsiň*, *dälsiňiz* before *däldirsiň*, *däldirsiňiz*; the guide mentions them, lessons accept them nowhere yet. *däldirin*, *däldiris* and *dälin*, *dälis* stay as the engine's last variants, not taught or accepted (no source). For the native review: *talypmysyň* and *talypmyň*; *dälsiň* against *däl* after *sen*; *gowumy* or *gowymy* (the Five Colleges glossary writes *işleriň gowymy?*; this file and the engine prefer *gowumy*, both accepted).
3. **Negative of the general present** (`gp-aorist-negative`): *gelmerin, gelmersiň, gelmez, gelmeris, gelmersiňiz, gelmezler*, and its question forms (*gelermiň?*).
   **TK-MORPH: kept as planned, not confirmed by a source.** Wiktionary's *gelmek* (reached by search) gives only the positive, *gelerin, gelersiň, geler, geleris, gelersiňiz, gelerler*, which the engine matches; no page reached showed the negative. The engine builds the paradigm above (-mAr with the endings in the first and second persons, -mAz in the third) and accepts no other spelling, since no source describes one. Questions: *gelermi?*, and for the second persons both *gelersiňmi?* and *gelermiň?* (this plan writes *gelermiň?* and *Çaý içersiňizmi?* in the same unit; Omniglot's *Türkmençe bilýärmiň?* puts the particle before the ending); negative questions *gelmezmi?*, *gelmersiňmi?*. For the native review: the whole negative paradigm, and which question form to teach first (point 9).
   **A2-2: settled (2026-11-18).** Sources reached through web search and fetching (fetching worked for en.wikipedia.org, tk.wikipedia.org, the SIL grammar page on webonary.work, the SIL Turkmen–English dictionary PDF, DergiPark, altaica.ru and UNESCO; not for omniglot.com). **The negative paradigm as planned**, in three independent sources: English Wikipedia's *Turkmen grammar* (its table of person suffixes has the row “Negative indefinite future: -merin, -meris, -mersiň, -mersiňiz, -mez, -mezler”, and notes that the negative “yields -mez” in the third person); the SIL grammar on webonary.work (*almaryn, almarsyň, almaz, almarys, almarsyňyz*, and *almaz* for *olar*; *etmerin, etmersiň, sürmerin, bolmaryn*; *ol gitmez*, “he won't be going”); and C. Başdaş, “Türkmen Türkçesinde olumsuzluk ve yokluk”, TÜBAR 37 (2015), p. 65 (*almarın, almarsıñ, almaz, almarıs, almarsıñız, almazlar*, in Turkish transcription), who adds that the negative of `-Ar` is little used in written Turkmen; an article on Turkmen dialects (DergiPark, article 257797) says the same of the standard: `-mAr` in the first and second persons, `-mAz` in the third. Third-person negatives in the SIL dictionary's sentences: *getirmez, bolmaz, çykmaz, aglamaz, deňleşip bilmez* and the saying *Işlemedik dişlemez*. **Questions**: no source showed a second-person question of `-Ar` with the ending first; the Peace Corps manual of Tyson and Clark (1993, “Turkmen Language Manual”, altaica.ru) has the particle **before** the full ending, *билер-ми-сиң* (*bilermisiň*, “can you…?”, as in *Meniň ýerime sapak geçirip bilermisiň?*), and the SIL dictionary a third-person *…syryny açarmy?* **Decision**: teach *gelmerin, gelmersiň, gelmez, gelmeris, gelmersiňiz, gelmezler* (and accept *gelmez* for *olar*); teach questions with the ending first, *gelersiňmi?*, *gelersiňizmi?*, *Çaý içersiňizmi?*, as for `-ýAr` (A1-2, question 9), and accept the particle first: *gelermisiň?* (Tyson and Clark), *gelermiň?*, *gelermisiňiz?*. The engine now gives *gelermisiň* (and, for `-ýAr`, *gelýärmisiň*) as a variant for *sen* before the short *-mYň* (`morph-test.mjs`). **Uses**: every source calls the form the indefinite future and illustrates likelihood and promises (*Ol häzir geler*, *Men maşyn alaryn, nesip bolsa* in the SIL grammar; *Elbetde, ol geler*, *Diýmek, biz gijä galarys* in the SIL dictionary; *Ertir gelerin*, probably, and *Otly sagat näçede ugrar?* in Tyson and Clark; *Ertir duşuşarys* on Omniglot), and general truths and sayings (*Hakyky dost kyn günüňde direg bolar*, *Dogruçyl adam diňe hakykaty aýdar*, SIL dictionary). Everyday habits in the same sources use `-ýAr` (*Men mekdebe maşynly gatnaýaryn*, *Her gije … ýatýaryn*), so a2-u04 teaches `-ýAr` as the default for routines and `-Ar` for what is typical, likely, promised or offered, and, as TM-PROJECT.md 7.3 says, accepts both for an English simple present describing a habit. For the native review: the habitual `-Ar` of the unit's tagline and lessons (*Her gün çaý içerin*, *Atam her gün ir turar*, *Olar adatça giç ýatarlar*); *gelersiňmi* against *gelermisiň*; the negatives *iýmerin, içmerin, ýagmaz, diňlemez*.
4. **t → d before -ýAr and vowels**: the closed list of stems that voice (*gidýär, edýär, aýdýar, gaýdýar, seredýär, eşidýär, äkidýär, öýdýär*) against those that don't (*satýar, ýatýar, tutýar*).
   **TK-MORPH: kept as planned, not confirmed by a dictionary.** The engine's closed list (`LEX.verbSoft`) is *git-, et-, aýt-, gaýt-, seret-, eşit-, äkit-, öýt-*, and every compound of *etmek* (*pikir edýär*, *kömek edýär*): t becomes d before a vowel and before -ýAr (*gidýär, gider, gidip, gidiň, gideýin, gidipdir*) and stays before a consonant (*gitdi, gitjek, gitmeli, gitsin, gitme, gitmeýär*). Every other verb keeps its t, k, p or ç: *satýar, ýatýar, tutýar, atýar, ýetýär, ötýär, çykýar, tapýar, geçýär*. It agrees with every form on the FC-1 cards and with *aýdym* "song" (*aýt-* + -ym, Wiktionary). For the native review: whether the list is complete (*ýitmek*, *bitmek*?), and *gitjek*, *etjek*, *aýtjak* (the plan's *Sen ertir näme etjek?*).
   **A1-2**: *öwretmek* "to teach" added to the list: *öwredýär* is in print (*… düşünmegi öwredýär* in a Turkmen article on science.gov.tm) beside *öwretmeli* (a Turkmen dialogue in the Five Colleges materials), so t → d before a vowel and -ýAr, t before a consonant (*öwretdi, öwretjek, öwretmeýär*). Other verbs in -t that a1-u06 uses are on the list (*gitmek, etmek, aýtmak*) or keep their t as the default says (*satmak, ýatmak*, named in the guide). For the native review: other causatives in -t (*okatmak, işletmek, ýatlatmak*) probably voice the same way; none is on the list yet.
   **FC-3**: *ugratmak* "to send, to see off" (*ugramak* + -t) added to the list: *ugradyp* is in print (*wekiliýet ugradyp biljekdigini*, TRT Türkmen; *elektron poçtany ugradyp bilmeýäris* and the button *bellik ugradyň*, infotrade.gov.tm), with *ugradýarlar* and *ugradypdyr* in a collection of folk tales and *ugratdy* before a consonant in a Görogly text (turkmenkultur.com), so the engine gives *ugradýar, ugradyp, ugradar*, and *ugratdy, ugratjak* (`morph-test.mjs`). The first causative in -t confirmed this way, which makes the guess about *okatmak, işletmek, ýatlatmak* likelier; they stay off the list until seen in print. *ýitmek* keeps its t (*ýitýär, ýitdi, ýiter, ýitip*), as the default says; not checked in a source.
5. **e → ä** in e-final verb stems before -(Y)p, -An, -Ar, -mAň (*işläp, işlän, işlär, gelmäň*) and in nouns before the dative (*ejä, kişä*).
   **TK-MORPH: settled for nouns before the dative, accusative and genitive, and for verbs; the possessives partly.** Nouns: a final e becomes ä before the dative, -ny and -nyň: *ejä, ejäni, ejäniň*; *gijä, gijäni, gijäniň* (Wiktionary's *gije*; its *je* gives *jäni, jäniň, jä*); *hepdäniň* (the heading *HEPDÄNIŇ MÖHÜM WAKALARY* in the newsletter of the Foreign Ministry's institute, iirmfa.edu.tm); *nämä, nämäni* (*Ol nämäni arzuw edýärdi?* in a Turkmen reading text). Before -(Y)m, -(Y)ň, -(Y)mYz, -(Y)ňYz it is ä too in the sources found (*ejäm, ejäň, ejämiz, ejäňiz*, the webonary grammar's paradigm of *eje*; *Gijäňiz rahat bolsun*, the usual "good night", Omniglot), so the engine gives *ejäm* first and accepts *ejem*, and FC-1 now writes *ejäm* (fc-0084, fc-0132). Never before -(s)Y or a consonant: *ejesi, ejesinde* (webonary), *ejeler, ejede, ejeden*. Before -kY: *öýdäki*. Verbs: an e-final stem, or the negative -mA, before -(Y)p, -(Y)ň, -An, -Ar and the optative: *işläp, işläň, işlän, işlär, işläýin, işläli, gelmäň, gelmäýin*; never before -ýAr, -dY, -jAk, -mAlY, -sYn, -mAz: *işleýär, işledi, işlejek, işlemeli, işlesin, işlemez* (FC-1; *erkin işläp bilmeýär* in Human Rights Watch's Turkmen-language report, 2024). For the native review: *ejäm* against *ejem*; the negative optative (*gelmäýin, gelmäli*; with back vowels *bolmaly* is spelt like the necessitative).
   **A1-3: checked for every noun the batch uses (2026-11-11).** The dative holds: *ejä*, *gijä*, *kişä* in the a1-u07 guide, *ejä* in its lessons, and the SIL Turkmen–English dictionary (webonary.work, `files/sozluk.pdf`, read from A to *gatnaşmak*) has more: *kişä* (*kişä el galdyrmak*), *gijä* (*Gijä galyp gelenim üçin…*), *ertä*, *tilkä*, *kesekä*. Before -ny and the possessives the sources disagree: the same dictionary writes *Ol meniň ejem*, *ejemden*, *Ejeme içimi döküp…*, *garry enemi* (but *Enäň agysy*), and the grammar page of that site writes *Ejeňe hat ýazypmysyň?*, *Men bedreni goýdum*, *Sen nämeni aldyňmy?* beside its own paradigm *ejäm, ejäň, ejämiz, ejäňiz*. **Decision**: keep the engine's ä (*ejäm, ejäň, ejämiz, enäm*; *ejäni* named once in the a1-u08 guide), accept *ejem*, *enem* wherever an answer has them, and put no -ny on an e-final noun in exercises until the native review settles it (A1-3 replaced *kofeni* with *sürüjini*). For the native review, first: *ejem* or *ejäm*, *bedreni* or *bedräni*, *nämeni* or *nämäni*.
6. **Negative and person forms of -(Y)pdYr** (`gp-ypdyr`): *gelmändir* or *gelmändirin*, and the first and second persons.
   **QA-TK-1: settled (2026-11-19).** Three sources agree. The SIL grammar on webonary.work (`/en/?p=146853`, fetched) tabulates *almak* in every person: *alypdyryn, alypsyň, alypdyr, alypdyrys, alypsyňyz, alypdyr(lar)*; negative *almandyryn, almandyrsyň, almandyr, almandyrys, almandyrsyňyz, almandyr(lar)*; questions *alypdyrynmy?, alypmysyň?, alypdyrmy?, alypdyrysmy?, alypmysyňyz?, alypdyr(lar)my?*; negative questions *almandyrynmy?, almanmysyň?, almandyrmy?, almandyrysmy?, almanmysyňyz?*. D. Gray, *A Short Descriptive Grammar of Turkmen* (SIL, 2011, read as a PDF) has the same positive and negative tables; Wiktionary's *gelmek* (read through a mirror) has the "unwitnessed past" *gelipdirin, gelipsiň, gelipdir, gelipdiris, gelipsiňiz, gelipdirler*, and English Wikipedia's *Turkmen grammar* the pluperfect negative *gelmändi*. **Decision**: the first persons and the third take `-dYr` and the endings of the present (*gelipdirin, gelipdiris*; *gelipdirler* or *gelipdir* for *olar*); **the second persons have no `-dYr`**: *gelipsiň, gelipsiňiz*; the negative is built on `-mAn` and keeps `-dYr` in every person, the second included (*gelmändirin, gelmändirsiň, gelmändir*); in the second persons the question particle comes before the ending (*gelipmisiň?, gelmänmisiň?*), elsewhere at the end (*gelipdirinmi?, gelipdirmi?*). The pluperfect follows: *gelipdim … gelipdiler*, negative *gelmändim* (*almandym* in the SIL grammar), question *gelipmidiň?* (by rule, as below). The engine's `perfect-ypdyr` now builds every person, with `-negative` and `-negative-question` (TM-PROJECT.md 3, `morph-test.mjs`). For the native review: *gelipsiň* against *gelipdirsiň* (the second is not in any source); *gelmändirler* or *gelmändir* for *olar*.
   **The other B1 forms of the engine (QA-TK-1)**, with what each rests on, for B1-1 to B1-5 and the native review. *In a source*: `-ýArdY` (*gelýärdim, gelýärdiň, gelýärdi, gelýärdik, gelýärdiler* among the forms of *gelmek* on enedilim.com; *alýardy(m)* in the SIL grammar) and its question with the particle **before** `-dY`, as for nouns (*Muny bilýärmidiň?*, the Turkmen Bible of 2002 and 2017, also saglyk.org); `-ArdY` (*gelerdim*, Wiktionary; *alardym*, the Bible); `-jAkdY` (*geljekdim*, Wiktionary; *aljakdy(m)*, SIL); `-mAlYdY` (*gelmelidim*, Wiktionary; *bermelidiň*, the Bible); `-sA` (*gelsem … gelseler*, Wiktionary; *alsam … alsalar* and *almasa(m)*, SIL); the participles *alýan, almaýan, alan, almadyk, aljak, almajak* (Gray); *eken* with the past endings, *almaly eken(im)* (Gray), *bermeli ekeniň* (the Bible); the verbal noun *almagy, almagyň, almaga* and *okamagym … okamaklary* (Gray), *okamakdan* (tducentre.edu.tm), the front dative *işletmäge* (the Bible; Wikipedia's "-mäge"); `-dYgY`: *alandygyny, gitjekdigini, gitjekdigimi, işleýändigini, kyndygyny* (Gray), *orýandygymy, biljekdigimi* (the Bible); `-ýAnçA`: *gelýänçäm, gelýänçäň, gelýänçe, gelýänçäk, gelýänçäňiz, gelýänçe(ler)* and *ýazýançaň* (Gray), *gelýänçä* (enedilim.com's forms of *gelmek*, and a history text on turkmenkultur.com), so both *gelýänçä* and *gelýänçe* for the third person; `-kA` after `-ýAr` (*gelýärkäm*, SIL); *edendir* for a guess (the Bible); the passive `-Yl`, `-l` after a vowel, `-Yn` after *l* (Gray: *aýdylmak, okalmak*; in print: *kabul edildi, berilýär, öwrenilýär, çözgüde gelindi, alnyp baryldy*); the causatives *okatmak, okatdyrmak, turuzmak, gorkuzmak, ýatyrmak, öwretmek* (Gray) and the reciprocals *alyşmak, öwrenişmek, ýetişmek* (Gray). *By rule, in no source reached*: the negative of `-ArdY`, *gelmezdim* (the plan's *bilmezdi*); *geljek däldim* and *gelmejekdim*; *gelmeli däldim* and *gelmemelidim*; the question particle before `-dY` in every compound tense (*gelermidiň, geljekmidiň, gelmelimidiň, gelipmidiň*), where a page of machine-translated text has *bilýärdiňmi*; *eken* with the plural endings (*ekenik, ekeniňiz*); `-kA` in the plural persons (left out); `-mAkdA`, `-mAkdAn` with *k*, though Gray also writes *almagda, almagdan*; *alynmak* as the passive of *almak* (print has *alnyp*, with vowel loss, which the engine doesn't build); *düşündirmek* by the rounding rule against Gray's *düşündürmek* (not in the engine's lists). `-(Y)w` (*okuw, ýazuw*) is lexical and left out of the engine.
   **B1-1 (2026-11-20)**: b1-u03 teaches the paradigm settled above: *gelipdirin, gelipsiň, gelipdir, gelipdiris, gelipsiňiz, gelipdirler*, the negative with `-dYr` in every person (*gelmändirsiň*), the question *gelipmisiň?*; plain `-dY` is rejected where the prompt says the speaker didn't see the event. *eken* after `-ýAn`, `-An`, `-jAk` and `-mAlY` is taught with *ekenim* and *ekeniň*; *ekenik* and *ekeniňiz* stand only in the guide's paradigm. The compound pasts of b1-u01 and b1-u02 put the particle before `-dY` (*uklaýarmydyň?*, *ýaşarmydyň?*, *geljekmidiň?*) and reject the other order. The forms not seen in print are listed in the B1-1 row of the progress log (TM-PROJECT.md 10).
   **B1-2 (2026-11-20)**: b1-u04 to b1-u06 teach the verbal noun, the participles and `-dYgY` as the forms above give them: `-mAk` with the cases (*ýüzmegi, okamagy*; the front dative *ýüzmäge, işlemäge*; *okamakdan, ýüzmekden* with k, as the engine writes it) and with the possessive (*gitmegim, gelmegini, okamagymyzy*); `-ýAn`, `-An`, `-jAk` and `-mAdYk` before a noun and alone (*okaýan oglan, okan kitabym, gelenler, görenim, aýtjagym, görmedik ýer*); `-dYgY` in three tenses with the possessive and the accusative or the dative (*gelendigini, gelýändigini, geljekdigini, gelendigine ynanmak*) and after a noun, *ýok* and *däl* (*mugallymdygyny, ýokdugyny, däldigini*). **The subject of a relative clause**: the course teaches the genitive with the possessive on the noun (*meniň okan kitabym*, *Aýnanyň maslahat beren filmi*), as in the print examples found (science.gov.tm); the nominative subject (*Aýna okan kitap*) is neither taught nor accepted nor rejected, for the native review. **Avoided**: the past negative `-mAndYgY` (*gelmändigini*: no source reached; the batch uses *gelmeýändigini* and *däldigini*). The `-(Y)ş` nouns keep their vowel before a possessive (*gülüşi, çalyşyny*), as *goýulyşy* and *inişi* do in print. The forms not seen in print are listed in the B1-2 row of the progress log (TM-PROJECT.md 10).
7. **Telling the time and age** (`gp-telling-time`, `gp-age-price`): the usual spoken patterns for minutes to the hour and for "I am 20".
   **A1-4: settled (2026-11-13).** Sources reached through web search and fetching: fetching worked for the Peace Corps *Colloquial Turkmen* (2nd edition, 2011, on tm.usembassy.gov; unit 1 dialogue 5 and unit 4), the Peace Corps *Introduction to the Turkmen Language* lessons (files.peacecorps.gov), the explanatory dictionary on enedilim.com and the SIL dictionary PDF on webonary.work; not for en.wiktionary.org (its *sagat* entry was read as a search summary). **Time.** *Sagat näçe?* "what time is it?" (Wiktionary's *sagat*; *Colloquial Turkmen* unit 4); the hour on its own, *Sagat bäş* (*Colloquial Turkmen*); **at** a time is the locative on the number, *Sagat näçede?* — *sagat bäşde* (*Colloquial Turkmen*; the SIL dictionary's *Çeper film agşam sagat sekizde başlanýar*, *edil sagat onda*), with the time of day first, *irden sagat ýedide*, *agşam dokuzda* (*Colloquial Turkmen*). **Half hours count toward the coming hour**, with that hour in the genitive and *ýary*: *bäşiň ýary* 4:30, *ýediň ýarynda* at 6:30 (*Colloquial Turkmen*); *Irden sagat dokuzyň ýarynda* (8:30) and 13:30 written *ikiň ýaryna çenli* in a memoir on atavatan-turkmenistan.com; *sagat ikiniň ýarynda*, *agşam sagat ýediniň ýarynda*, *altynyň ýarynda* in the narrative of novels on kitapcy.ru, whose dialogue has *Altyň ýarynda*. So after a vowel the full genitive (*ikiniň, altynyň, ýediniň*) is the written form and the short one (*ikiň, altyň, ýediň*) the spoken. **Minutes to** the hour: the coming hour in the dative and *… minut bar* or *galdy*: *Bire ýigrimi minut bar* (12:40), *ýedä on iki minut bar* (6:48) (*Colloquial Turkmen*); *Alty bolmaga on bäş minut wagt galdy* (Kyýasowa's explanatory dictionary, 2016, under *minut*, on turklehceleri.org); *on bire on bäş minut galanda* "at a quarter to eleven" (SIL dictionary, under *galmak*). **Minutes past** count from the coming hour too, with *işlemek*: *on ikiden on minut işleýä* (11:10), *ikiden on bäş minut işlände* "at 1:15" (*Colloquial Turkmen*, in spoken forms); no written source was found, and none with *geçdi*. *çärýek* "quarter" appears in no time expression reached; a quarter is *on bäş minut*. Timetables and the news write digits, with the suffix after a hyphen: *agşam sagat 20:30-da*, *sagat 08:00-dan 11:00-a çenli* (aoc.gov.tm). *sagat* softens its *t*: *sagady* (enedilim.com's spelling note, "sagat - sagady"; *sagadyny, sagadyňa, sagada* in a story on turkmenteatrlary.gov.tm), so `LEX.tVoice` now has *sagat* (question 9). **Decision**: teach and practise the hour (*Sagat bäş*), **at** with the locative (*sagat bäşde*, *Sagat näçede?*), the half hour with the genitive of the coming hour (*Sagat bäşiň ýary* 4:30, *bäşiň ýarynda* at 4:30), writing the full genitive after a vowel (*ikiniň ýary*) and accepting the short one in answers, minutes to the hour with the dative and *bar* (*Bäşe on minut bar* 4:50; *sagat* in front also accepted), and a quarter as *on bäş minut*. Minutes past the hour are shown in the guide for recognition only, beside digits as the written way (*sagat 8:20-de*), and not practised until the native review confirms *altydan on minut işleýär* (5:10) and says whether *geçdi* is used. **Age.** The possessive of *ýaş* "age" with the locative: *Sen näçe ýaşyňda?* — *Men ýigrimi alty ýaşymda*; *Ol altmyş dört ýaşynda*, and *Ol näçe ýaşynda?*, *Olar näçe ýaşynda?* in its exercise (*Colloquial Turkmen*, unit 1); *Sen näçe ýaşyňda?* also in the Peace Corps lessons. The SIL dictionary has *Meniň ýigrimi ýaşym doldy* "I have turned twenty" and *Onuň ýaşy elliden agdy* "he is over fifty", for later units. **Decision**: teach *näçe ýaşyňda?* and *… ýaşymda* in every person (`possessive-locative` on *ýaş*); accept the answer without the pronoun (*Ýigrimi ýaşymda*); nothing else. **Dates**, for the record: the ordinal with a hyphen, the month in lowercase, and the locative for **on**: *27-nji awgustda* (aoc.gov.tm), *21-nji maýda*, *28-nji fewralda* (trtturkmen.com), *16-njy sentýabrda* (azathabar.com), *2019-njy ýylda*; with the year, *1991-nji ýylyň 27-nji oktýabry* (TM-PROJECT.md 7.1). Speech also says *aýyň ikisi* "the second of the month" and *Fewral aýynyň ikisi* (*Colloquial Turkmen*), not taught. The days of the week are the names restored in 2008, *duşenbe, sişenbe, çarşenbe, penşenbe, anna, şenbe, ýekşenbe* (the word list; English Wikipedia's *2002 renaming of Turkmen months and days of week*); **on Monday** is taught as the set phrase *duşenbe güni*. For the native review: *altydan on minut işleýär* and whether *geçdi* is used; *ikiniň ýary* or *ikiň ýary*; *Sagat bäşe on minut bar* with *sagat*; *duşenbe güni* and *duşenbede*; *oktýabrda* and *oktýabr aýynda*; *Ýigrimi ýaşymda* without *men*.
8. **Set wishes** (`gp-set-wishes`): which formulas are current and when each is said.
   **A2-3: settled (2026-11-18).** Sources reached through web search and fetching (fetching worked for omniglot.com, merw-news.com, the SIL grammar page on webonary.work, DergiPark, UNESCO and Wikipedia; enedilim.com refused). The course teaches only the formulas below, each seen in Turkmen text, with the occasion its source shows. **Congratulations**: the occasion with **your** + *gutly bolsun*: *Toýuňyz gutly bolsun!*, said by neighbours and relatives to the family holding a wedding, together with *Ýaşlar bagtly bolsun!* (both on the Ministry of Culture's page on the *toý çelpegi*, medeniyet.gov.tm; R. Çakır, “Türkmen-Türk düğün törenlerinde söylenen alkış-dileklerin kullanım yerleri”, *Türk Dünyası İncelemeleri Dergisi* 20/2, 2020, has *Toýuňyz mübärek bolsun*, *Goňşyň gutly bolsun*, *Bagtly boluň!*); *Doglan günüň gutly bolsun!* and *Täze ýylyňyz gutly bolsun!* (Omniglot's phrase list); *… baýramyňyz gutly bolsun!* for a holiday (a greeting on ylymly.com; the official *Hasyl toýuňyz gutly bolsun* follows the same pattern). *Gutly bolsun!* on its own was not seen in a source, so the course always names the occasion. **A journey**: *Ýoluňyz ak bolsun!*, *Ýoluň ak bolsun!* (Five Colleges glossary, “good luck, have a safe trip”; an English–Turkmen dictionary on emingharib.persiangig.com, “Have a safe journey!”; A. Berdimyradow on merw-news.com, among the *ýagşy dilegler*, where *ak ýol* is a road without obstacles), beside *Ak ýol!* of a1-u01. **Work and success**: *Işiňiz rowaç bolsun!* (the closing wish of a holiday greeting to a mother on ylymly.com; a Russian–Turkmen dictionary gives it for “желаю вам успеха”). **A meal**: *Işdäňiz açyk bolsun!*, to someone eating (a dialogue on azathabar.com) and at the end of recipes (atavatan-turkmenistan.com, turkmenportal.com, trtturkmen.com). **The time of day**: *Gijäňiz rahat bolsun!*, *Ertiriňiz haýyrly bolsun!*, *Agşamyňyz haýyrly bolsun!* (Omniglot, English Wikipedia's *Turkmen language*). **Long life**: *Ömrüňiz uzak, janyňyz sag bolsun!* in the same greeting on ylymly.com; the course teaches *Ömrüňiz uzak bolsun!* for older people, with birthday and holiday wishes. The reply taught is *Sag boluň!* **Not taught**, no source found: a get-well wish (*tiz sagalyň*), *Gözüňiz aýdyň*, condolences. The same `-sYn` gives the third-person imperative (*garaşsyn*, *garaşsynlar*, *Ol çaý içsin* in the SIL grammar; *kömek etsin*, *etmesin*, *etsinmi* in PAÜ ÇTLE's Turkmen–Turkish dictionary), and the optative is taught as the SIL grammar and M. Erdem (ÇÜTAD 4/1, 2019, after Azimov et al. 1960) describe it: *-AýYn* for **me** (*garaşaýyn*, *kömek edeýin*, question *edeýinmi*, *soraýynmy*), *-AlY* for two people and *-AlYň* for three or more (*Gidelimi?* “shall we (two) go?”, *Biz gaýdalyň!*; *Geliň, … deňeşdireliň* in folk tales); the negative (*kömek etmäýin*, *etmäli*, PAÜ ÇTLE) is shown in the guide, not practised. For the native review: whether *Gutly bolsun!* alone is said; *Işiňiz rowaç bolsun* to someone at work, not only in greetings; *Gijäň rahat bolsun* to a friend; *Bolmaz!* as a firm refusal and *Bolmaýar* as a soft one; *Gowy pikir!*; *Oňa aýt, derrew gelsin*; the negative optative.
9. **Points the morphology engine accepts two ways, or rests on a short list** (TK-MORPH; the lists are `TKMMorph.LEX`, TM-PROJECT.md 3):
   - the question particle with personal endings: *gelýärsiňmi?*, *gelýärsiňizmi?* (this plan's form, given first) or *gelýärmiň?*, *gelýärmisiňiz?* (Omniglot's *bilýärmiň?*); both accepted, for -ýAr and -Ar. **A1-2**: for -ýAr, the ending first is the written form (*bilýärsiňizmi* in Wikipedia's phrases, *gepleýärsiňizmi* in Omniglot's, *sürýärsiňmi* in the SIL grammar, *alýarsyňmy* in the SIL dictionary) and is taught; the particle first (*bilýärmiň*, *düşýärmiň* in the SIL dictionary) is accepted. For the copula, see question 2 (A1-2). **A2-2**: for `-Ar` the ending first is taught too (*gelersiňmi*, *Çaý içersiňizmi?*); the particle before the full ending, *gelermisiň* (Tyson and Clark's *bilermisiň*), is accepted beside *gelermiň*, and the engine gives it for `-ýAr` as well (*gelýärmisiň*); see question 3;
   - voicing of nouns: words of two or more syllables in -k, -p, -ç voice (*kitaby, çöregi, agajy*) except *tarap* (*tarapyndan*); in -t only *Aşgabat*, *umyt*, *ýigit* and, since A1-4, *sagat* (*sagady*, settled from the explanatory dictionary; question 7) (*döwleti, jemgyýeti, suraty* keep it); one-syllable words keep their consonant (*atym* "my horse", *saçym*) except the long-vowel words *at* "name", *ot* "fire", *ýat*, *ýurt*, *dört*, *gök* (*adym, ody, ýadyma, ýurdumyz, dördünji*) and, since FC-2, *güýç* (*güýji*, seen in print on science.gov.tm);
   - vowel loss: *ogul, burun, agyz, boýun, garyn, göwün, köňül, ömür, döwür, ylym, nesil, sabyr, bagyr*, and since FC-2 *uruş* (*urşy*, *urşunda*: *Beýik Watançylyk urşy* in Wikipedia and a medal's name) and *oýun* (*oýny*, *oýnuň*: one Turkmen game page, by analogy with *boýun*); *akyl* is left out (Wiktionary's table has *akyly*), though *ylym* and *sabyr* suggest *akly*;
   - the negative of -jAk and -mAlY: *geljek däl* and *gelmeli däl* as planned, *gelmejek* and *gelmemeli* also accepted; the polite imperative *geliňiz* accepted beside *geliň*;
   - cases after -kY (*öýdäkini*, *öýdäkine*): built with the pronominal n, unchecked.
10. **The posture verbs' present, -kA and the diminutives** (`gp-yp-progressive`, `gp-ka`, `gp-jyk`, a2-u11 and a2-u12): the least documented points of A2.
   **A2-4 (2026-11-19).** Sources reached through web search and fetching: fetching worked for en.wikipedia.org, the grammar pages of the explanatory dictionary on enedilim.com (`turkmen_dili/morfologiya_we_orfografiya/…`), UNESCO and Encyclopaedia Iranica; the SIL grammar page on webonary.work answered only at its `/en/` address (`webonary.work/turkmen/en/?p=146853`); the US Embassy's *501 Turkmen Verbs* was refused (robots); Tyson and Clark's manual (altaica.ru) has none of these points. **The posture verbs.** English Wikipedia's *Turkmen grammar* tabulates the "relic simple present" of *oturmak, ýatmak, durmak, ýöremek* in every person (*otyryn, otyrsyň, otyr, otyrys, otyrsyňyz, otyrlar*; *durun, dursuň, dur, durus, dursuňyz, durlar*; *ýatyryn* …; *ýörün, ýörsüň, ýör, ýörüs, ýörsüňiz*, and *ýörlar*, read here as a slip for *ýörler*) and says the forms stand alone and after `-yp`/`-ip` for a continuous action; the explanatory dictionary's page "Işlikler" calls it the concrete present (*konkret häzirki zaman*) with *Awtobus duralgada du:r*, *Jigim sallançakda ýaty:r*, *durun, dursuňyz*, and gives its negative with `-mAýAr` (*okamaýaryn, bilmeýärin*); the SIL grammar page has *Olar gezip ýörler, Ol uklap ýatyr, Myrat dynç alyp ýatyr, Ýagyş ýagyp dur, Biz garaşyp otyrys, Ol heniz hem okap ýör*. Wikipedia also gives the spoken negative in `-ok` (*bilemok, ylgamok, gelenok*), not taught. **Decision**: teach the present of the four verbs alone and after `-(Y)p`, with the endings of `-ýAr`, positive and question only, and the negative of `-ýAr` for **not**; the engine's new slug `posture-present` builds the forms (TM-PROJECT.md 3, tests in `morph-test.mjs`). The helpers' uses taught (*otyr* for what someone is busy with now, *dur* for something seen going on and the weather, *ýatyr* for lying down and lasting states, *ýör* for a stretch of time or moving about) are drawn from the SIL examples and are a rule of thumb; every exercise also accepts `-ýAr` (TM-PROJECT.md 7.3). For the native review: *Näme edip otyrsyň?*, *Ýagyş ýagyp dur*, *Çaga aglap otyr* (or *ýatyr*?), *Olar gülüp otyrlar*, *Ejäm aşhanada otyr*, *Awtobus duralgada dur*.
   **-kA.** The explanatory dictionary's page on predicate suffixes (*habarlyk goşulmalary*: *-dy, -dyr, -myş, eken, -ka, -kä*) gives `-ka`/`-kä` "for time" with *Sen kiçijikkäň, şuny saňa beripdim*, written attached; Wikipedia says the possessive personal suffixes follow it; the SIL grammar page has `-kä` after the `-ýAr` stem with a personal ending, *Men işden öýe gelýärkäm, Çynar magazinine sowuldym*; a Turkmen text on folk beliefs (multiurok.ru) has *Çileli çaga öýdekä* (no ending in the third person, and no e → ä before `-kä`). **Decision**: teach `-kA` on nouns, adjectives and locatives (*çagakam, talypkam, gyzgynka, öýdekä*) and after `-ýAr` (*gelýärkäm*), with *-m* for **I**, *-ň* for **you** and no ending in the third person; polite *çagakaňyz* is accepted in one exercise; the plural persons are not taught, since no source showed them. *çaga wagtym* is named as the everyday alternative (in print on atavatan-turkmenistan.com). The engine has no `-kA`, so no morph exercise uses it. For the native review: *çagakam, çagakaň, çagakaňyz, talypkam, gyzgynka, Howa ýagtyka öýe gideli, gelýärkäm*.
   **Diminutives.** The explanatory dictionary's page "Goşulmalar we olaryň görnüşleri" lists `-jagaz`, `-jyk` and `-ja` as suffixes of degree (*dereje ýasaýjy*): *gyzjagaz, oglanjyk, akja*; its page "Sypatlar" has *ak+ja guzy* under the lesser degree, and *kiçijik* is in its `-ka` example above; the SIL grammar page has *towşanjyk*. **Decision**: teach `-jYk` and `-jAgAz` on a few words (*kiçijik, çagajyk, oglanjyk, towşanjyk, gyzjagaz, oglanjagaz*), recalling *azajyk* from a2-u08, and say that not every noun takes them; the engine's `JYK` and `JAGAZ` steps follow harmony and the rounding rule (*öýjük*). For the native review: *çagajyk, oglanjagaz, kiçijik düýä* (dative), *kiçijik telpek*.
   **-lY on place names.** The same site's page "Atlar": "Söz ýasaýjy goşulmalary kabul edip, has atlygyny ýitiren sözler setir harplary bilen ýazylýarlar: maryly, tejenli, gökjeli", while a name keeps its capital before `-syz`, `-daky` and `-lar` (*Aşgabatdaky*). a2-u12 writes *aşgabatly, maryly* in lowercase and its guide says you will also see a capital; A1 (a1-u03 and its guide, a1-u05's interlude) writes *Aşgabatly, Maryly, Tejenli* … with a capital in mid-sentence. The checker ignores case, so no answer is affected. **QA-TK-1** lowercased them in A1 (the lessons a1-u03-l03, a1-u03-l04, a1-u09-l01, the guides a1-u03 and a1-u07, the interlude a1-u05, and two grammar-point labels here); the morph exercise a1-u03-l03-e06 still builds *Tejenli* from the tile *Tejen*, since its tiles must join to the result.
   **-rAk.** The page "Sypatlar" (spelling rule 3 of the lesser degree) voices a final voiceless stop before `-rak`/`-räk`: *gök – gögräk, ak – agrak, agsak – agsagrak, oňat – oňadrak*. The engine now does the same (A2-4, with a test); no A2 exercise used such a form.
