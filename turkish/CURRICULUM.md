# Turkish A1 → C2 · Curriculum

What the course teaches, in which order, and in which conversation each part gets written. [PROJECT.md](PROJECT.md) says *how* content is written (schemas, style rules, workflow); this file says *what* goes where.

This file is also the **registry** of unit IDs, grammar-point IDs and batches. `scripts/turkish/validate.mjs` parses it, and unit files must match it: same unit titles, the same grammar points in the same order. To change the plan, edit this file first, then the JSON, then run the validator.

Line formats the validator reads (keep them exact):

| What | Format |
|---|---|
| Level | `## A1 · First steps` |
| Unit | `#### a1-u01 · English title · Turkish tagline` |
| Grammar point | two-space indent under `- Grammar:`, then ``- `gp-id` — description`` |
| Interlude | `- Interlude: **Title** — one-line description` |
| Batch | `- Batch: A1-1` |
| Batch table row | `\| A1-1 \| a1-u01, a1-u02, a1-u03 \| focus \|` |

Suffixes use the usual archiphoneme notation: **A** = e/a, **I** = ı/i/u/ü, **D** = d/t, **C** = c/ç, **K** = k/ğ; letters in brackets are buffer letters that appear only after a vowel, as in -(y)I.

## Overview

| Level | Title | Units | Lessons per unit | Content batches | Interlude format |
|---|---|---|---|---|---|
| A1 | First steps | 12 | 4 | 4 | English, with a 2–4 sentence Turkish mini-read |
| A2 | Everyday life | 12 | 4 | 4 | English, with a 4–6 sentence Turkish mini-read |
| B1 | Stories and clauses | 12 | 4 | 5 | Parallel Turkish and English paragraphs |
| B2 | Nuance and register | 10 | 4 | 4 | Turkish, with glossary and English summary |
| C1 | Fluency and idiom | 8 | 3 | 4 | Turkish, with glossary |
| C2 | Mastery | 6 | 3 | 3 | Turkish, with glossary |
| **Total** | | **60** | **226 lessons** | **24** | **60 interludes** |

Expect about 2,600 exercises, 60 grammar guides, 60 culture interludes and 1,000 flashcards. A grammar point is *introduced* in the unit listed below; any later unit may practise it again.

## Conjugation and grammar coverage

Every finite verb form, mostly in the first person singular, shown on *gelmek* (to come) and, for "to be", on *öğrenci* (student), with the unit that introduces it. Negative and question forms are taught with each form, and the question particle *mI* is always written as a separate word.

| Form | Example | Introduced in |
|---|---|---|
| Present "to be" (copula) | öğrenciyim, öğrencidir | `gp-copula-present` (a1-u03) |
| Present continuous -(I)yor | geliyorum, gelmiyorum, geliyor musun? | `gp-present-continuous` (a1-u06) |
| Imperative, 2nd person | gel, gelin, geliniz, gelme | `gp-imperative` (a1-u12) |
| Past -DI | geldim, gelmedim, geldin mi? | `gp-past-di` (a2-u01) |
| Past "to be" -(y)DI | öğrenciydim, değildim, vardı | `gp-past-copula` (a2-u02) |
| Reported "to be" -(y)mIş | öğrenciymişim, varmış | `gp-idi-imis` (a2-u02) |
| Evidential -mIş (first look) | gelmiş, gelmişim | `gp-mis-intro` (a2-u02) |
| Future -(y)AcAk | geleceğim, gelmeyeceğim | `gp-future` (a2-u03) |
| Aorist -r / -Ar / -Ir | gelirim, gelmem, gelmez misin? | `gp-aorist-forms`, `gp-aorist-irregulars`, `gp-aorist-negative` (a2-u04) |
| Ability -(y)Abil / -(y)AmA | gelebilirim, gelemem, gelemedim | `gp-abil`, `gp-ama-inability` (a2-u05) |
| Necessitative -mAlI | gelmeliyim, gelmemeliyim | `gp-meli` (a2-u06) |
| Optative -(y)A | geleyim, gelelim, gelelim mi? | `gp-optative` (a2-u07) |
| Imperative, 3rd person -sIn | gelsin, gelsinler | `gp-imperative-3rd` (a2-u07) |
| Past continuous -(I)yordu | geliyordum | `gp-past-continuous` (b1-u01) |
| Pluperfect -mIştI | gelmiştim | `gp-pluperfect` (b1-u01) |
| Question particle in compound tenses | geliyor muydun?, gelmiş miydi? | `gp-di-compounds` (b1-u01) |
| Past aorist, "used to" -(I)rdI | gelirdim | `gp-used-to` (b1-u02) |
| Future in the past -(y)AcAktI | gelecektim | `gp-future-in-past` (b1-u02) |
| Past necessitative -mAlIydI | gelmeliydim | `gp-should-have` (b1-u02) |
| Past ability -(y)AbilIrdI | gelebilirdim, gelemezdim | `gp-could-have` (b1-u02) |
| Full evidential -mIş | gelmişim, gelmemiş mi? | `gp-evidential-mis` (b1-u03) |
| Reported compounds | geliyormuşum, gelecekmişim, gelirmişim, gelmişmişim | `gp-mis-compounds` (b1-u03) |
| Conditional -sA | gelsem, gelsek | `gp-conditional-sa` (b1-u09) |
| Real conditionals | gelirsem, geliyorsam, geldiysem, geleceksem, gelmişsem, öğrenciysem | `gp-conditional-real` (b1-u09) |
| Unreal present -sA … -(I)rdI | gelsem görürdüm | `gp-unreal-present` (b2-u01) |
| Unreal past -sAydI | gelseydim | `gp-unreal-past` (b2-u01) |
| Wishes with keşke | keşke gelsem, keşke gelseydim | `gp-keske` (b2-u01) |
| Formal progressive -mAktA | gelmekteyim, gelmektedir | `gp-makta` (b2-u05) |
| Inference about the past | gelmiş olmalıyım, gelmiş olabilirim | `gp-mis-olmali` (c1-u01) |
| Future perfect and future progressive | gelmiş olacağım, geliyor olacağım | `gp-mis-olacak` (c1-u01) |
| "If it came to" | gelecek olsam, gelecek olursam | `gp-acak-olsa` (c1-u01) |
| Counterfactual perfect | gelmiş olsaydım | `gp-mis-olsaydi` (c1-u01) |
| Assumption -DIr | gelmiştir, evdedir | `gp-dir-assumption` (c1-u02) |

The four sets of personal endings are taught explicitly: type I (-(y)Im, -sIn, -∅, -(y)Iz, -sInIz, -lAr) in `gp-copula-present`, type II (-m, -n, -∅, -k, -nIz, -lAr) in `gp-past-di`, both compared in `gp-person-endings-types`, and the imperative and optative persons in `gp-imperative`, `gp-optative` and `gp-imperative-3rd`.

| Area | Forms | Introduced in |
|---|---|---|
| Voice | passive, impersonal passive, reflexive, causative, reciprocal, stacked voices | b1-u10, b1-u11, b2-u07 |
| Participles | -(y)An, -DIk, -(y)AcAk, -mIş, -(I)r / -mAz, -(y)AsI | b1-u05, b1-u06, b1-u03, b1-u05, c2-u02 |
| Verbal nouns | -mAk, -mA, -(y)Iş, -mAzlIk | b1-u04, c1-u03 |
| Converbs | -(y)ken, -(y)Ip, -(y)IncA, -(y)ArAk, -mAdAn, -DIktAn sonra, -(y)AlI, -(y)IncAyA kadar, -DIkçA, -DIğIndA, -DIğI için, -(I)r -mAz, -(y)A -(y)A, -mAksIzIn, -DIğI halde, -mAsInA rağmen, -DIğI sürece, -mAdIkçA, -DIğI takdirde | a2-u11, b1-u07, b1-u08, b2-u03, b2-u10 |
| Compound verbs | -(y)Ivermek, -(y)Akalmak, -(y)Adurmak, -(y)Ayazmak, -(y)Agelmek, -(y)Ip durmak | b2-u06 |
| Nouns | plural, six cases plus instrumental, possessives, genitive, compounds, -ki, pronominal n, buffer letters, softening, vowel loss | a1-u02 to a1-u12, a2-u10 |
| Word building | -lI, -sIz, -CI, -lIk, -CA, -(ş)Ar, -lA, -lAş, -lAn, -Al, -CIk, -CAğIz, -(I)msI, -GAn, -GIn, -sAl, -DAş | a2-u12, b1-u11, b2-u09, c1-u03 |

## A1 · First steps

Sounds, harmony and the noun system, the verb "to be" and one verb tense. Four lessons per unit, 10–14 short exercises per lesson, 5–10 new words per lesson. Grammar guides spell suffix variants out (-lar/-ler) until the archiphoneme notation is introduced in a1-u03. Interludes are in English with a few Turkish sentences that use only what has been taught.

#### a1-u01 · Letters and sounds · Merhaba!
- Grammar:
  - `gp-alphabet` — the 29 letters; the letters that differ from English and French (c, ç, ğ, ı, j, ö, ş, ü); dotted and dotless i in both cases (I/ı, İ/i); â, î, û in a few loanwords
  - `gp-pronunciation` — one letter, one sound; ğ lengthens the vowel before it; the tapped r; reading new words aloud
  - `gp-stress-basics` — stress usually falls on the last syllable; common exceptions such as place names and some adverbs
  - `gp-sentence-basics` — the big picture: suffixes stack on a root, the verb comes last, no grammatical gender, no articles; simple sentences like *Ben Elif.*
- Vocabulary: greetings and goodbyes, courtesy words, yes and no, introducing yourself (*Benim adım…*, *Memnun oldum*)
- Interlude: **The 1928 alphabet reform** — how Turkish moved from the Ottoman Arabic script to a Latin alphabet in a few months, and the literacy campaign that followed
- Batch: A1-1

#### a1-u02 · Vowel harmony and plurals · Bu ne?
- Grammar:
  - `gp-vowel-groups` — the eight vowels as front or back, rounded or unrounded
  - `gp-harmony-2way` — two-way harmony: e after front vowels, a after back vowels; the last vowel of the word decides
  - `gp-plural` — the plural -lAr, and where Turkish uses it less than English
  - `gp-demonstratives` — bu, şu, o as adjectives and pronouns; bunlar, şunlar, onlar; *Bu ne?*
  - `gp-bir-indefinite` — bir as "a" and "one"; its place after the adjective (*güzel bir ev*); no word for "the"
  - `gp-harmony-exceptions` — loanwords with mixed vowels (kitap, otobüs) and loanwords that take front suffixes (saat, harf, rol)
- Vocabulary: classroom and everyday objects, colours
- Interlude: **The nazar boncuğu** — the blue glass bead against the evil eye, where it hangs and how it is made
- Batch: A1-1

#### a1-u03 · Saying who you are · Ben öğrenciyim
- Grammar:
  - `gp-harmony-4way` — four-way harmony (ı, i, u, ü) and the archiphoneme notation used from now on
  - `gp-personal-pronouns` — ben, sen, o, biz, siz, onlar; dropping the pronoun; sen and siz (plural and polite)
  - `gp-copula-present` — the type I personal endings as "to be": -(y)Im, -sIn, -∅, -(y)Iz, -sInIz, -lAr; -DIr as a formal third person
  - `gp-buffer-letters` — why buffer letters exist; y between vowels (öğrenciyim), with a preview of s, n and ş
- Vocabulary: countries and nationalities, professions, states and feelings (yorgun, mutlu, aç, hasta)
- Interlude: **The 1934 Surname Law** — how people were named before family names, Bey and Hanım, and how surnames were chosen
- Batch: A1-1

#### a1-u04 · Questions and negation · Yorgun musun?
- Grammar:
  - `gp-degil` — değil for negating nouns and adjectives, with personal endings (değilim, değilsin)
  - `gp-question-mi` — the question particle mI: a separate word, in harmony, carrying the personal ending (öğrenci misin?); its place marks the focus
  - `gp-question-words` — kim, ne, nasıl, kaç, hangi, neden, niçin, niye; no mI with a question word
  - `gp-answers` — answering yes/no questions: evet, hayır, değil, tabii, öyle; the tag *değil mi?*
  - `gp-de-also` — dA "also, too", written apart (*Ben de*), not to be confused with the suffix -DA of a1-u05
- Vocabulary: common adjectives and their opposites, how-are-you exchanges
- Interlude: **Nasreddin Hoca** — the folk sage of Akşehir and some of his best-known anecdotes
- Batch: A1-2

#### a1-u05 · Where things are · Evde kimse yok
- Grammar:
  - `gp-locative` — the locative -DA "in, at, on", and with "to be": *Neredesin? Evdeyim.*
  - `gp-consonant-assimilation` — D becomes t after a voiceless consonant (f, s, t, k, ç, ş, h, p): parkta, kitapta
  - `gp-var-yok` — var and yok: "there is" and "there isn't"; var mı?, yok mu?
  - `gp-apostrophe` — suffixes on proper nouns after an apostrophe (İstanbul'da, Ayşe'de, 2026'da), never on common nouns
  - `gp-pronoun-n` — n before case endings on o, bu, şu (onda, bunda) and the place words burada, şurada, orada, nerede
- Vocabulary: rooms and furniture, places in the city, here and there
- Interlude: **Istanbul through the ages** — Byzantion, Constantinople, İstanbul: one city, many layers
- Batch: A1-2

#### a1-u06 · The present continuous · Ne yapıyorsun?
- Grammar:
  - `gp-infinitive-stem` — the infinitive -mAk and the verb stem (gelmek → gel-, okumak → oku-)
  - `gp-present-continuous` — -(I)yor with type I endings; stem vowels that drop or narrow (başlıyor, bekliyor, diyor, yiyor); git- and et- soften (gidiyor, ediyor)
  - `gp-present-continuous-negative` — negative -mIyor; questions *geliyor musun?* and *gelmiyor musun?*
  - `gp-present-continuous-uses` — now, these days, and planned near future; time words şimdi, bugün, şu anda
- Vocabulary: about 15 everyday verbs (gelmek, gitmek, yapmak, etmek, okumak, yazmak, içmek, yemek, çalışmak, konuşmak, anlamak, bilmek, istemek, sevmek, beklemek)
- Interlude: **Çay: Turkish tea** — tulip-shaped glasses, the double teapot, the tea gardens of Rize, and tea at every hour
- Batch: A1-2

#### a1-u07 · To and from · Nereye gidiyorsun?
- Grammar:
  - `gp-dative` — the dative -(y)A "to, toward" (eve, okula, Ankara'ya); verbs that take the dative (bakmak, binmek, başlamak, inanmak, yardım etmek)
  - `gp-ablative` — the ablative -DAn "from, out of, through" (evden, parktan); verbs that take it (korkmak, hoşlanmak, nefret etmek); -DAn … -(y)A kadar
  - `gp-pronoun-cases-dat-abl` — bana and sana (irregular), ona, bize, size, onlara; benden, senden; nereye, nereden, buraya, buradan
  - `gp-buffer-y-cases` — buffer y before vowel-initial case endings (arabaya, arabayı), never before the ablative
- Vocabulary: transport, travel, directions (sağ, sol, düz)
- Interlude: **From the steppe to Anatolia** — the westward migrations of the Turkic peoples, from Central Asia to the Mediterranean
- Batch: A1-3

#### a1-u08 · Definite objects · Ekmeği alıyorum
- Grammar:
  - `gp-accusative` — the accusative -(y)I for definite objects (*Kahveyi içiyorum* vs *Kahve içiyorum*); names and pronouns always take it
  - `gp-consonant-softening` — p, ç, t, k become b, c, d, ğ before a vowel (kitabı, ağacı, rengi, çocuğu); exceptions in most one-syllable words (topu, atı, sütü)
  - `gp-pronoun-accusative` — beni, seni, onu, bizi, sizi, onları; bunu, şunu
  - `gp-object-word-order` — the bare object sits right before the verb; definite objects can move
- Vocabulary: food and drink, shopping (*Kaç para?*)
- Interlude: **Kahvaltı: the Turkish breakfast** — from simit to menemen, and why breakfast is a weekend event
- Batch: A1-3

#### a1-u09 · My family · Benim ailem
- Grammar:
  - `gp-possessive-suffixes` — -(I)m, -(I)n, -(s)I, -(I)mIz, -(I)nIz, -lArI; buffer s after vowels (arabası)
  - `gp-possessive-have` — "to have" with a possessed noun and var or yok (*İki kardeşim var*, *Arabam yok*)
  - `gp-vowel-loss` — vowel loss before vowel suffixes (ağzı, burnu, oğlu, ismi, şehri) and doubled consonants in some loanwords (hakkı, hissi)
  - `gp-possessive-softening` — softening with possessives (kitabım, ağacın, çocuğumuz); su → suyu
- Vocabulary: family (including the Turkish distinctions: teyze, hala, amca, dayı, abla, ağabey), body parts
- Interlude: **Bayrams** — Ramazan Bayramı and Kurban Bayramı: family visits, kissing elders' hands, sweets
- Batch: A1-3

#### a1-u10 · Whose is it? · Ayşe'nin evi
- Grammar:
  - `gp-genitive` — the genitive -(n)In (evin, arabanın, Ayşe'nin); benim, senin, onun, bizim, sizin, onların; su → suyun
  - `gp-genitive-possessive` — the possessive construction (*Ayşe'nin kitabı*, *evin kapısı*, *benim adım*); dropping the pronoun
  - `gp-pronominal-n` — the n after a third-person possessive before case endings (evinde, arabasına, kapısını)
  - `gp-whose` — kimin?, kimde?, *Bu kimin?*
- Vocabulary: house and neighbourhood, belongings
- Interlude: **The hamam** — the Turkish bath, its rooms and rituals, and its roots in the Roman bath
- Batch: A1-4

#### a1-u11 · Numbers and time · Saat kaç?
- Grammar:
  - `gp-numbers` — cardinal numbers up to the millions; how compounds are built (yirmi beş, iki bin yirmi altı)
  - `gp-numbers-singular` — singular nouns after numbers and quantity words (iki kitap, çok insan, birkaç gün)
  - `gp-ordinals` — ordinals -(I)ncI (birinci, ikinci, üçüncü, dördüncü); kaçıncı?
  - `gp-telling-time` — *Saat kaç?* and *Saat kaçta?*; buçuk, çeyrek; geçiyor/var and geçe/kala
  - `gp-dates` — days, months and dates (29 Ekim 1923); when day and month names take a capital letter
  - `gp-age-price` — *Kaç yaşındasın?*, *… yaşındayım*; prices and *Kaç lira?*
- Vocabulary: numbers, the clock, days, months, seasons, prices
- Interlude: **National days of the Republic** — 23 Nisan, 19 Mayıs, 30 Ağustos and 29 Ekim: what each date marks and how it is celebrated
- Batch: A1-4

#### a1-u12 · Requests and company · Gel, otur!
- Grammar:
  - `gp-imperative` — second-person imperative: the bare stem (Gel!), -(y)In and -(y)InIz (Gelin, Oturunuz), negative -mA (Gelme!); lütfen
  - `gp-ile` — ile and -(y)lA "with, by, and" (annemle, otobüsle, kalemle; benimle, onunla)
  - `gp-icin` — için "for" (senin için, bunun için, Türkiye için)
  - `gp-conjunctions-basic` — ve, ama, fakat, veya, ya da
- Vocabulary: café and restaurant (*Hesap, lütfen*, *Afiyet olsun*), classroom and household instructions
- Interlude: **Turkish coffee** — the first Istanbul coffeehouses of the 16th century, *sade, orta, şekerli*, and the UNESCO listing (2013)
- Batch: A1-4

## A2 · Everyday life

All the simple tenses and moods, comparison, postpositions and the first word-building suffixes. Four lessons per unit, 10–14 exercises per lesson, 5–8 new words per lesson. Interlude mini-reads grow to 4–6 Turkish sentences.

#### a2-u01 · The past tense · Dün ne yaptın?
- Grammar:
  - `gp-past-di` — -DI with type II endings (-m, -n, -∅, -k, -nIz, -lAr); D becomes t after voiceless consonants (gitti, yaptık)
  - `gp-past-di-negative-question` — gelmedim, geldin mi?, gelmedin mi?
  - `gp-person-endings-types` — the two sets of personal endings side by side, and which tenses take which
  - `gp-time-past` — dün, geçen hafta, … önce (iki gün önce), henüz, daha (not yet), zaten
- Vocabulary: weekend activities, time expressions
- Interlude: **1923: the Republic and Atatürk** — the War of Independence, the Treaty of Lausanne and the proclamation of 29 October 1923
- Batch: A2-1

#### a2-u02 · Was, were, and once upon a time · Bir varmış, bir yokmuş
- Grammar:
  - `gp-past-copula` — -(y)DI on nouns and adjectives (öğrenciydim, evdeydik); vardı, yoktu, değildim; *öğrenci miydin?*
  - `gp-idi-imis` — the two pasts of "to be": -(y)DI (witnessed) and -(y)mIş (reported or inferred); idi and imiş as separate words in formal writing
  - `gp-mis-intro` — a first look at -mIş with verbs: hearsay, inference and surprise (*Ali gelmiş!*), compared with -DI
- Vocabulary: childhood, weather, feelings in the past
- Interlude: **Keloğlan and the folk tale** — the bald boy hero, the storyteller's opening formulas, and where the tales were collected
- Batch: A2-1

#### a2-u03 · The future · Yarın ne yapacaksın?
- Grammar:
  - `gp-future` — -(y)AcAk with type I endings; k becomes ğ before a vowel (geleceğim, gideceğiz); buffer y (okuyacağım)
  - `gp-future-negative-question` — gelmeyeceğim, gelecek misin?, gelmeyecek misiniz?
  - `gp-future-stem-changes` — diyecek, yiyecek; gidecek, edecek
  - `gp-future-vs-present` — future or present continuous for plans; time words yarın, gelecek hafta, seneye, … sonra
- Vocabulary: holidays and travel planning
- Interlude: **Cappadocia** — fairy chimneys, rock-cut churches, underground cities and balloons at dawn
- Batch: A2-1

#### a2-u04 · Habits and truths: the aorist · Her sabah çay içerim
- Grammar:
  - `gp-aorist-forms` — -r after vowels (okur), -Ar after one-syllable stems (yapar, gider), -Ir after longer stems (çalışır, öğrenir)
  - `gp-aorist-irregulars` — the 13 one-syllable verbs that take -Ir (almak, bilmek, bulmak, durmak, gelmek, görmek, kalmak, olmak, ölmek, sanmak, varmak, vermek, vurmak)
  - `gp-aorist-negative` — -mAz, with -mAm and -mAyIz in the first person (gelmem, gelmeyiz); *gelir misin?*, *gelmez misin?*
  - `gp-aorist-uses` — habits, general truths, offers and polite requests (*Çay içer misiniz?*), promises (*Yarın ararım*)
- Vocabulary: daily routine, frequency words (her gün, genellikle, bazen, hiç, asla)
- Interlude: **Tavla, okey and the kahvehane** — backgammon and tile games in the neighbourhood coffeehouse
- Batch: A2-2

#### a2-u05 · Can and can't · Yüzebilir misin?
- Grammar:
  - `gp-abil` — -(y)Abil "can, may" (gelebilirim, okuyabilir); bil never changes its vowel
  - `gp-ama-inability` — -(y)AmA "cannot" in every tense (gelemiyorum, gelemedim, gelemem, gelemez)
  - `gp-abil-uses` — ability, permission (*Girebilir miyim?*), possibility (*Yağmur yağabilir*) and polite requests
  - `gp-negative-polarity` — hiç, hiç kimse, hiçbir şey, kimse with a negative verb; biri, bir şey, herkes, her şey
- Vocabulary: sports and hobbies, skills, permission
- Interlude: **Oil wrestling at Kırkpınar** — Edirne's summer tournament, which tradition dates to the 14th century (UNESCO 2010)
- Batch: A2-2

#### a2-u06 · Must and need · Gitmem lazım
- Grammar:
  - `gp-meli` — -mAlI with type I endings (gitmeliyim, gitmemelisin, gitmeli miyiz?) for obligation and advice
  - `gp-gerek-lazim` — gerek and lazım with nouns (*Bana su lazım*), with -mAk (*Erken kalkmak lazım*), and the set pattern *gitmem lazım* (verbal nouns come in b1-u04)
  - `gp-zorunda` — -mAk zorunda olmak or kalmak "have to"; *-mAk zorunda değilsin*
  - `gp-meli-inference` — -mAlI for a confident guess (*Evde olmalı*)
- Vocabulary: health and the doctor, rules and signs
- Interlude: **Visiting a Turkish home** — slippers at the door, kolonya, tea and the welcome formulas
- Batch: A2-2

#### a2-u07 · Let's: suggestions and wishes · Gidelim mi?
- Grammar:
  - `gp-optative` — the optative -(y)AyIm, -(y)AlIm and the other persons; offers and suggestions (*Kapıyı açayım mı?*, *Gidelim mi?*)
  - `gp-imperative-3rd` — third-person imperative -sIn and -sInlAr (*Gelsin*, *Otursunlar*)
  - `gp-set-wishes` — wishes built on these forms: *Kolay gelsin*, *Geçmiş olsun*, *Afiyet olsun*, *Hayırlı olsun*, *Elinize sağlık*, and when to say them
  - `gp-hadi` — hadi and haydi with the optative and imperative
- Vocabulary: invitations, making plans, set phrases
- Interlude: **Hıdırellez** — the spring festival of 5–6 May, wishes tied to a rose tree, and the UNESCO listing (2017)
- Batch: A2-3

#### a2-u08 · Comparing · Daha büyük, en güzel
- Grammar:
  - `gp-comparative` — -DAn daha "more than" (*Ankara İzmir'den daha büyük*)
  - `gp-superlative` — en (en büyük, en çok)
  - `gp-equative` — kadar and gibi (benim kadar, senin gibi, bu kadar); çok, pek, oldukça, biraz
  - `gp-intensive-reduplication` — bembeyaz, kapkara, masmavi, yemyeşil, sapsarı, upuzun
  - `gp-adjectives-as-adverbs` — adjectives used as adverbs (*iyi konuşuyor*) and doubled adverbs (yavaş yavaş)
- Vocabulary: describing people and places, climate and landscape
- Interlude: **Seven regions** — Turkey's geographical regions from the Black Sea to the Mediterranean, and how they differ
- Batch: A2-3

#### a2-u09 · Where and when: postpositions · Masanın üstünde
- Grammar:
  - `gp-postp-nominative` — gibi, için, kadar, ile with nouns and with the genitive of pronouns (benim gibi, bunun için)
  - `gp-postp-dative` — göre, kadar (until), doğru, karşı, rağmen (*bana göre*, *akşama kadar*)
  - `gp-postp-ablative` — önce, sonra, beri, dolayı, başka, itibaren (*yemekten önce*, *2020'den beri*)
  - `gp-place-nouns` — üst, alt, ön, arka, yan, iç, dış, ara, karşı with possessive and case (*masanın üstünde*, *evin önüne*)
  - `gp-duration-dir` — duration with -DIr and -DAn beri (*Üç yıldır Türkçe öğreniyorum*)
- Vocabulary: positions and furniture, time spans, the city
- Interlude: **Göbekli Tepe** — carved stone pillars raised about 11,600 years ago, and what they changed in archaeology
- Batch: A2-3

#### a2-u10 · Compound nouns and -ki · Türk kahvesi
- Grammar:
  - `gp-compound-indefinite` — the indefinite compound (*Türk kahvesi*, *otobüs durağı*, *İstanbul Üniversitesi*) and case endings after it (*Türk kahvesini*)
  - `gp-compound-chains` — compounds inside compounds and with possessives (*okul çantam*); genitive or not
  - `gp-ki-adjective` — -ki after the locative and time words (evdeki kitap, yarınki toplantı); bugünkü, dünkü; -ki does not harmonize
  - `gp-ki-pronoun` — -ki after the genitive (benimki, seninki, Ali'ninki, oradakiler)
- Vocabulary: dishes and food names, public places and institutions
- Interlude: **Regional cuisines** — Gaziantep, Hatay, the Black Sea, the Aegean: a map of dishes named after places
- Batch: A2-4

#### a2-u11 · While and then · Eve giderken
- Grammar:
  - `gp-ken` — -(y)ken "while, when (being)" (çocukken, evdeyken; giderken, otururken); ken never changes; iken in formal writing
  - `gp-ip` — -(y)Ip to link actions that share tense and person (*Gidip aldım*); negative -mAyIp
  - `gp-sequence-connectors` — önce, sonra, ondan sonra, en sonunda, çünkü, bu yüzden, yine de
- Vocabulary: errands, daily sequences, telling a short story
- Interlude: **The Ottoman Empire** — from a frontier principality around 1300 to the end of the empire in 1922, on one page
- Batch: A2-4

#### a2-u12 · Word building · İstanbullu bir gazeteci
- Grammar:
  - `gp-li` — -lI "with, having, from" (şekerli, bulutlu, İstanbullu)
  - `gp-siz` — -sIz "without" (şekersiz, işsiz, susuz)
  - `gp-ci` — -CI for jobs and enthusiasts (kahveci, gazeteci, kitapçı, futbolcu); C becomes ç after voiceless consonants
  - `gp-lik` — -lIk for abstract nouns, objects for a purpose and durations (güzellik, gözlük, kitaplık, bir haftalık)
  - `gp-ca` — -CA for languages, manner and opinion (Türkçe, yavaşça, bence, sence)
  - `gp-distributive` — distributive numbers -(ş)Ar (birer, ikişer, üçer) and -leyin (sabahleyin, akşamleyin)
- Vocabulary: jobs and shops, languages, where people are from
- Interlude: **The Grand Bazaar** — Kapalıçarşı since the 15th century, its streets named after crafts, and the kuyumcu, halıcı and bakırcı
- Batch: A2-4

## B1 · Stories and clauses

Compound tenses, the evidential, and the non-finite forms (participles, verbal nouns, converbs) that make Turkish subordinate clauses. Four lessons per unit, 10–14 exercises per lesson, including at least one `reading` exercise per unit. Interludes alternate Turkish and English paragraphs.

#### b1-u01 · Past continuous and pluperfect · Yağmur yağıyordu
- Grammar:
  - `gp-past-continuous` — -(I)yordu for background and interrupted actions; negative and question forms
  - `gp-pluperfect` — -mIştI for an earlier past (*Film çoktan başlamıştı*)
  - `gp-di-compounds` — how compound tenses are built (tense + -(y)DI + type II ending) and where mI goes (*geliyor muydun?*)
  - `gp-narrative-adverbs` — çoktan, henüz, o sırada, o zaman, birden, aniden
- Vocabulary: incidents and storytelling
- Interlude: **The Seljuks** — from Central Asia to Anatolia: Malazgirt (1071), Konya and the caravanserais on the trade roads
- Batch: B1-1

#### b1-u02 · Used to, was going to, should have · Eskiden burada otururduk
- Grammar:
  - `gp-used-to` — the past aorist -(I)rdI for past habits (*Eskiden çok kitap okurdum*)
  - `gp-future-in-past` — -(y)AcAktI "was going to" (*Seni arayacaktım ama…*)
  - `gp-should-have` — -mAlIydI "should have" (*Daha erken gelmeliydin*)
  - `gp-could-have` — -(y)AbilIrdI and -(y)AmAzdI "could have, couldn't have"
  - `gp-about-to` — -mAk üzere "about to" (*Tren kalkmak üzere*)
- Vocabulary: change over time (eskiden, artık, hâlâ, değişmek, taşınmak)
- Interlude: **The Tulip Era** — Istanbul in the early 18th century: tulips, gardens, and İbrahim Müteferrika's printing press
- Batch: B1-1

#### b1-u03 · Hearsay and inference · Gelecekmiş
- Grammar:
  - `gp-evidential-mis` — the full -mIş paradigm with personal endings, negative and question forms
  - `gp-mis-vs-di` — choosing -DI or -mIş: what you saw versus what you heard, inferred or discovered
  - `gp-mis-compounds` — reported compound forms -(I)yormuş, -(y)AcAkmIş, -(I)rmIş, -mIşmIş
  - `gp-mis-adjective` — -mIş as an adjective (pişmiş tavuk, kırılmış bardak)
- Vocabulary: news, rumours and reports
- Interlude: **Evliya Çelebi** — the 17th-century traveller, his ten-volume Seyahatname, and the story of Hezârfen Ahmed Çelebi's flight
- Batch: B1-1

#### b1-u04 · Verbal nouns · Yüzmeyi seviyorum
- Grammar:
  - `gp-mak-cases` — the infinitive -mAk as a noun with case endings (-mAyI sevmek, -mAyA başlamak, -mAktAn korkmak)
  - `gp-ma-possessive` — -mA with possessive endings (*Gelmen lazım*, *Gelmesini istiyorum*)
  - `gp-is` — -(y)Iş for the act or manner of doing (*yürüyüşü*), and nouns built on it (giriş, çıkış, alışveriş)
  - `gp-purpose` — purpose with -mAk için, -mAk üzere and -mAyA (*Yüzmeye gittik*)
- Vocabulary: hobbies, preferences, intentions
- Interlude: **Karagöz and Hacivat** — the shadow-puppet pair, the learned Hacivat and the plain-spoken Karagöz (UNESCO 2009)
- Batch: B1-2

#### b1-u05 · The subject participle · Dönen dervişler
- Grammar:
  - `gp-participle-an` — -(y)An relative clauses where the noun is the subject (*kitap okuyan kız*)
  - `gp-headless-an` — participles used as nouns (gelenler, okuyanlar, bilen biri)
  - `gp-an-possessor` — -(y)An with a possessed subject inside the clause (*babası doktor olan çocuk*)
  - `gp-relative-order` — everything that describes a noun comes before it
  - `gp-aorist-participle` — -(I)r and -mAz as adjectives (akar su, çıkmaz sokak, bitmez tükenmez)
- Vocabulary: people and descriptions
- Interlude: **Rumi and the Mevlevi** — Mevlânâ in Konya, the Mesnevî (written in Persian), and the sema of the whirling dervishes
- Batch: B1-2

#### b1-u06 · Object participles · Okuduğum kitap
- Grammar:
  - `gp-participle-dik` — -DIk with a possessive for relatives where the noun is not the subject (*okuduğum kitap*, *oturduğu ev*)
  - `gp-participle-acak` — -(y)AcAk with a possessive for future or potential (*okuyacağım kitap*, *kalacak yer*)
  - `gp-relative-genitive-subject` — the subject of the clause in the genitive (*Ali'nin okuduğu kitap*)
  - `gp-an-or-dik` — choosing between -(y)An and -DIk
- Vocabulary: books, films, memories, recommendations
- Interlude: **Yunus Emre** — the 13th–14th-century poet who wrote in plain Anatolian Turkish
- Batch: B1-2

#### b1-u07 · Converbs I: when, by, without · Eve gelince ararım
- Grammar:
  - `gp-ince` — -(y)IncA "when, once" (*Eve gelince ararım*) and -(y)IncAyA kadar "until"
  - `gp-arak` — -(y)ArAk "by, while" (*Koşarak geldi*)
  - `gp-madan` — -mAdAn "without" and -mAdAn önce "before"
  - `gp-dikten-sonra` — -DIktAn sonra "after"
  - `gp-ali` — -(y)AlI "since" (*Buraya geleli üç yıl oldu*)
- Vocabulary: routines and sequences, travel stories
- Interlude: **Ephesus** — the Greek and Roman city near today's Selçuk: the Library of Celsus, the theatre and the Temple of Artemis
- Batch: B1-3

#### b1-u08 · Converbs II: the more, whenever, because · Okudukça seviyorum
- Grammar:
  - `gp-dikca` — -DIkçA "the more, whenever"
  - `gp-diginda` — -DIğIndA "when" with possessive endings (*Geldiğimde*), compared with -(y)IncA
  - `gp-digi-icin` — -DIğI için and -DIğIndAn "because"
  - `gp-r-maz` — -(I)r -mAz "as soon as" (*Eve gelir gelmez uyudu*)
  - `gp-reduplicated-converb` — -(y)A -(y)A (koşa koşa, güle güle, bile bile)
- Vocabulary: feelings and reasons
- Interlude: **1453: the conquest of Constantinople** — Mehmed II, the walls, the ships moved overland, and what changed after 29 May 1453
- Batch: B1-3

#### b1-u09 · Conditionals · Fincanda kuş görürsen
- Grammar:
  - `gp-conditional-sa` — -sA with type II endings for hypotheses and suggestions (*Biraz dinlensen?*)
  - `gp-conditional-real` — tense + -(y)sA for real conditions (gelirsem, geliyorsan, geldiyse, gelecekse); -(y)sA on nouns (evdeysen)
  - `gp-conditional-questions` — eğer, and question words with -sA (*Ne zaman istersen*)
  - `gp-sa-advice` — advice and polite suggestions (-sA iyi olur, -sAk mı?)
- Vocabulary: plans and possibilities, luck, weather forecasts
- Interlude: **Kahve falı** — reading coffee grounds: the ritual, the symbols, and why it is a social game
- Batch: B1-4

#### b1-u10 · Passive and reflexive · 1557'de tamamlandı
- Grammar:
  - `gp-passive` — -Il, -In, -n (yapıldı, bulundu, okundu); the agent with tarafından
  - `gp-impersonal-passive` — passive of intransitive verbs for rules and general statements (*Burada sigara içilmez*, *Oraya nasıl gidilir?*)
  - `gp-reflexive` — -(I)n reflexive verbs (yıkanmak, giyinmek, hazırlanmak)
  - `gp-kendi` — kendi, kendim, kendini, kendine, kendi kendine; *kendi evim*
- Vocabulary: buildings and their construction, personal care
- Interlude: **Mimar Sinan** — the Ottoman chief architect and his mosques: Şehzade, Süleymaniye, Selimiye
- Batch: B1-4

#### b1-u11 · Causative and reciprocal · Saçımı kestirdim
- Grammar:
  - `gp-causative` — -DIr, -t, -Ir, -Ar, -It (yaptırmak, okutmak, bitirmek, çıkarmak, korkutmak) and irregular causatives (göstermek, getirmek)
  - `gp-causative-objects` — who does what: *Saçımı kestirdim*, *Ali'ye yaptırdım*, *Çocuğu güldürdü*
  - `gp-reciprocal` — -(I)ş (görüşmek, tanışmak, buluşmak, anlaşmak) and birbiri (birbirimizi, birbirlerine)
  - `gp-verb-derivation` — verbs from nouns and adjectives: -lA, -lAş, -lAn, -Al (temizlemek, güzelleşmek, evlenmek, azalmak)
- Vocabulary: services and errands, relationships
- Interlude: **The Orkhon inscriptions** — the 8th-century Göktürk stones raised for Kül Tigin and Bilge Kağan, the oldest known Turkic texts
- Batch: B1-5

#### b1-u12 · Reported speech · Ne dedi?
- Grammar:
  - `gp-direct-speech` — demek and direct quotes (*"Geliyorum," dedi*; *dedi ki*), and Turkish punctuation of quotes
  - `gp-diye-quotative` — diye after a quote or a thought (*"Geç kaldım" diye koştu*)
  - `gp-diye-purpose` — diye for purpose and reason (*Uyanmasın diye sessiz konuştuk*)
  - `gp-reported-mis` — reporting with -mIş (*Yarın gelecekmiş*)
  - `gp-reported-commands-intro` — *Gelmesini söyledi*, a first look at reported requests
- Vocabulary: verbs of speaking (söylemek, demek, sormak, cevap vermek, anlatmak, bağırmak)
- Interlude: **Dede Korkut** — the Book of Dede Korkut, twelve Oghuz tales, and their storyteller-sage
- Batch: B1-5

## B2 · Nuance and register

Unreal conditions, concession, noun clauses, compound verbs and the gap between written and spoken Turkish. Four lessons per unit, 10–14 exercises per lesson, with `reading` and at least one `open` exercise per unit. Interludes are in Turkish with a glossary and a short English summary.

#### b2-u01 · Unreal conditionals and wishes · Keşke bilseydim
- Grammar:
  - `gp-unreal-present` — -sA … -(I)rdI (*Zengin olsam dünyayı gezerdim*)
  - `gp-unreal-past` — -sAydI … -(I)rdI or -(y)AcAktI (*Bilseydim gelirdim*)
  - `gp-keske` — keşke with -sA and -sAydI
  - `gp-even-if` — -sA bile and -sA dA "even if"
  - `gp-wh-ever` — question word + -sA for "whoever, whatever" (*Kim gelirse gelsin*, *Ne olursa olsun*)
- Vocabulary: regrets, chances, exploration and maps
- Interlude: **The Piri Reis map** — the surviving fragment of the 1513 world map and the sailing book Kitab-ı Bahriye
- Batch: B2-1

#### b2-u02 · As if · Hiçbir şey olmamış gibi
- Grammar:
  - `gp-mis-gibi` — -mIş gibi and -(y)AcAkmIş gibi (*Hiçbir şey olmamış gibi davrandı*)
  - `gp-mis-gibi-yapmak` — -mIş gibi yapmak "to pretend", and -(I)yormuş gibi
  - `gp-cesine` — -cAsInA forms: -mIşçAsInA, -(I)rcAsInA, -(y)AcAkmIşçAsInA
  - `gp-gibi-clauses` — -DIğI gibi, -(y)AcAk gibi, -(y)AcAk gibi olmak; sanki
- Vocabulary: appearances, acting, imitation
- Interlude: **The meddah** — the Ottoman storyteller who played every character with a handkerchief and a stick (UNESCO 2008)
- Batch: B2-1

#### b2-u03 · Although, despite, without · Yorgun olmasına rağmen
- Grammar:
  - `gp-digi-halde` — -DIğI halde "although"
  - `gp-masina-ragmen` — -mAsInA rağmen, and noun + rağmen
  - `gp-maksizin` — -mAksIzIn "without" (formal), compared with -mAdAn
  - `gp-contrast-connectors` — ise (whereas), oysa, hâlbuki, buna rağmen, yine de, gerçi … ama
- Vocabulary: argument and contrast, archaeology
- Interlude: **Troy** — Hisarlık near Çanakkale: settlement layers, Schliemann's excavations, legend and evidence
- Batch: B2-1

#### b2-u04 · Noun clauses · Geleceğini biliyorum
- Grammar:
  - `gp-dik-clauses` — -DIğI and -(y)AcAğI as noun clauses with case endings (*Geldiğini biliyorum*, *Gelmediğine üzüldüm*)
  - `gp-ma-or-dik` — -mA for actions and wishes, -DIk for facts and knowledge
  - `gp-indirect-questions` — embedded questions (*Nerede oturduğunu bilmiyorum*, *gelip gelmeyeceğini*)
  - `gp-reported-commands` — -mAsInI söylemek, istemek, rica etmek
  - `gp-clause-as-subject` — clauses as subjects (*Gelmen önemli*)
- Vocabulary: knowing, thinking and doubting; civic life
- Interlude: **Women's suffrage in Turkey** — local elections in 1930, national elections in 1934, the first women deputies in 1935
- Batch: B2-2

#### b2-u05 · Formal Turkish · Toplantı devam etmektedir
- Grammar:
  - `gp-makta` — -mAktA(dIr), the formal progressive of news, notices and writing
  - `gp-dir-formal` — -DIr in definitions, notices and formal statements
  - `gp-formal-connectors` — ayrıca, bununla birlikte, dolayısıyla, ancak, -mAsI nedeniyle, -mAk amacıyla
  - `gp-formal-requests` — formal requests and correspondence (*-mAnızı rica ederim*, *Sayın…*, *Saygılarımla*)
  - `gp-fractions-percent` — yarım, buçuk, üçte bir, yüzde elli; reading figures aloud
- Vocabulary: administration, work and official documents
- Interlude: **Ankara becomes the capital** — from Anatolian town to capital in 1923, and the planned city that followed
- Batch: B2-2

#### b2-u06 · Compound verbs · Kapıyı açıver
- Grammar:
  - `gp-ivermek` — -(y)Ivermek: quickly, casually, unexpectedly (*Bir bakıver*)
  - `gp-akalmak` — -(y)Akalmak: frozen in a state (*bakakaldı*)
  - `gp-adurmak` — -(y)Adurmak: keep on doing (*Siz yiyedurun*)
  - `gp-ayazmak-agelmek` — -(y)Ayazmak "almost" (*düşeyazdım*) and -(y)Agelmek "long-standing" (*süregelen*)
  - `gp-ip-durmak` — -(y)Ip durmak and -(y)Ip kalmak for repeated or stuck actions
- Vocabulary: street life, quick actions
- Interlude: **Street food** — simit, balık ekmek, midye dolma and the carts and stalls that sell them
- Batch: B2-3

#### b2-u07 · Stacked voices · Yaptırılamadı
- Grammar:
  - `gp-voice-order` — the order of voice suffixes (reflexive or reciprocal, then causative, then passive), and reading long verbs from the root out
  - `gp-causative-passive` — causative + passive (yaptırıldı, okutuldu)
  - `gp-double-causative` — öldürtmek, yaptırtmak
  - `gp-voice-modality` — voices with ability and negation (yapılamaz, yaptırılabilir)
- Vocabulary: crafts, workshops, commissions
- Interlude: **İznik tiles** — the 16th-century tiles of mosques and palaces, from cobalt blue to tomato red
- Batch: B2-3

#### b2-u08 · Small words: dA, bile, ki, ya · Ben bile anladım
- Grammar:
  - `gp-da-particle` — dA beyond "also": even, and so, emphasis (*Gel de gör*, *Hem de nasıl!*)
  - `gp-bile` — bile "even" (*Çocuk bile biliyor*)
  - `gp-ki-conjunction` — ki as a conjunction (*dedi ki*, *öyle … ki*); written apart, except in belki, çünkü, sanki, hâlbuki, mademki
  - `gp-ya-particle` — ya (*Ya sen?*, *Biliyorsun ya*) and ya … ya
  - `gp-modal-particles` — hani, işte, acaba, sakın, bari, hele
- Vocabulary: sport and fans
- Interlude: **Football and the Istanbul derbies** — Galatasaray, Fenerbahçe, Beşiktaş and a derby day in the city
- Batch: B2-3

#### b2-u09 · Everyday colloquial Turkish · Bir bakar mısın?
- Grammar:
  - `gp-address-forms` — forms of address (abi, abla, hocam, kardeşim, teyze, amca, beyefendi, hanımefendi)
  - `gp-softeners` — softening requests (*Bir bakar mısın?*, *Gelsene*, *rica etsem*, *zahmet olmazsa*)
  - `gp-fillers` — şey, yani, işte, hani, ya, aslında, falan
  - `gp-diminutives` — -CIk and -CAğIz for smallness, affection or pity (küçücük, adamcağız), -(I)msI and -(I)mtırak (yeşilimsi, ekşimtırak)
  - `gp-register-shift` — the same request in formal, neutral and colloquial Turkish
- Vocabulary: TV, cinema and series
- Interlude: **Yeşilçam and Turkish TV series** — the golden age of Turkish cinema, and today's dizi watched around the world
- Batch: B2-4

#### b2-u10 · As long as, unless, in case · Çalıştığın sürece
- Grammar:
  - `gp-digi-surece` — -DIğI sürece and -DIğI müddetçe "as long as"
  - `gp-madikca` — -mAdIkçA "unless"
  - `gp-digi-takdirde` — -DIğI takdirde, -mAsI halinde, -(y)AcAk olursa
  - `gp-time-clauses` — -DIğI zaman, -DIğI an, -DIğI sırada, -DIğIndAn beri, -(y)AnA kadar
  - `gp-correlatives` — hem … hem, ne … ne, ya … ya, ister … ister, gerek … gerekse
- Vocabulary: music and performance
- Interlude: **The âşık tradition** — minstrel-poets with the bağlama: Karacaoğlan, Pir Sultan Abdal and the atışma duel of verses (UNESCO 2009)
- Batch: B2-4

## C1 · Fluency and idiom

Modality, evidential nuance, dense written Turkish, the Ottoman layer, idiom and the spoken language. Three lessons per unit, 8–12 longer exercises per lesson, built mostly on `reading`, `open`, `translate` and `cloze`. Interludes are in Turkish with a glossary.

#### c1-u01 · Stacked modality · Burada yaşamış olmalılar
- Grammar:
  - `gp-mis-olmali` — inference about the past: -mIş olmalı, -(I)yor olmalı, -mIş olabilir, -mIş olamaz
  - `gp-mis-olacak` — future perfect -mIş olacak and future progressive -(I)yor olacak
  - `gp-acak-olsa` — -(y)AcAk olsa and -(y)AcAk olursa "if it came to"
  - `gp-mis-olsaydi` — the counterfactual perfect -mIş olsaydı
  - `gp-modal-chains` — reading chains like -(y)AbilmIş olmalı and -mAmIş olabilir
- Vocabulary: archaeology and prehistory
- Interlude: **Çatalhöyük** — a Neolithic town of mud-brick houses entered through the roof (UNESCO 2012)
- Batch: C1-1

#### c1-u02 · -DIr: assumption and authority · Yorulmuşlardır
- Grammar:
  - `gp-dir-assumption` — -DIr for a confident assumption (*Yorulmuştur*, *Şimdi evdedir*)
  - `gp-dir-general-truth` — -DIr and -mIştIr in encyclopedic and academic style
  - `gp-epistemic-adverbs` — herhalde, galiba, muhtemelen, büyük ihtimalle, mutlaka, sanırım, belki de
  - `gp-certainty-scale` — -DI, -mIş, -DIr and -mIş olmalı side by side, from certain to guessed
- Vocabulary: ancient history, empires and treaties
- Interlude: **The Hittites and Hattusa** — the Bronze Age capital near Boğazkale and its clay-tablet archives (UNESCO 1986)
- Batch: C1-1

#### c1-u03 · Complex nominalizations · Bilip bilmediğimi sordu
- Grammar:
  - `gp-nested-clauses` — clauses inside clauses (*Gelip gelmeyeceğini bilip bilmediğimi sordu*)
  - `gp-nominal-case-chains` — verbal noun + possessive + case + postposition (*gelmesinden dolayı*, *yapılmasının ardından*)
  - `gp-clause-head-nouns` — clause + head noun (*-DIğI gerçeği*, *-mAsI ihtimali*)
  - `gp-mazlik` — -mAzlIk (*bilmezlikten gelmek*, *anlamamazlık*)
  - `gp-derivation-advanced` — -GAn, -GIn, -(I)m, -(I)ntI, -sAl, -DAş, -(y)IcI, -mAn
- Vocabulary: science, observation and instruments
- Interlude: **Takiyüddin's observatory** — the Istanbul observatory of the late 1570s and its instruments
- Batch: C1-2

#### c1-u04 · Ottoman, Arabic and Persian structures · Aşk-ı memnu
- Grammar:
  - `gp-persian-izafet` — the Persian izafet in fixed phrases (aşk-ı memnu, devr-i âlem, hüsn-ü niyet)
  - `gp-arabic-article` — the Arabic article in fixed words (bilhassa, bilakis, maalesef, fevkalade, Darülfünun)
  - `gp-arabic-plurals` — Arabic plurals (ahval, eşya, ulema, hayvanat)
  - `gp-nisbet-i` — the adjective suffix -î (millî, resmî, askerî) and TDK's circumflex
  - `gp-persian-affixes` — bî-, na-, -hane, -dar, -kâr, -zade, -name, -gâh
  - `gp-arabic-roots` — root families (kitap, kâtip, mektup, mektep; ilim, âlim, malum)
- Vocabulary: literature and the Ottoman court
- Interlude: **Divan poetry** — the Ottoman court poets Fuzuli, Baki and Nedim, and the gazel form
- Batch: C1-2

#### c1-u05 · Idioms and proverbs · Damlaya damlaya göl olur
- Grammar:
  - `gp-body-idioms` — idioms with göz, el, kulak, ağız, baş, yüz, burun (*göz atmak*, *kulak vermek*)
  - `gp-proverbs` — proverbs: their grammar (aorist, -(y)An subjects), meaning and use
  - `gp-idiom-grammar` — frozen grammar inside idioms and set phrases
  - `gp-similes` — gibi similes (kuzu gibi, buz gibi, su gibi)
- Vocabulary: weddings and family events
- Interlude: **Weddings and the kına gecesi** — asking for the bride's hand, the salted coffee, the henna night and the wedding
- Batch: C1-3

#### c1-u06 · Word order and focus · Gördüm onu!
- Grammar:
  - `gp-focus-position` — the focus slot right before the verb
  - `gp-postverbal` — inverted sentences and background after the verb (*Geldi mi Ayşe?*)
  - `gp-topic-marking` — topics with ise, -sA and gelince (*Bana gelince…*)
  - `gp-m-reduplication` — m-doubling and echo words (kitap mitap, ıvır zıvır)
  - `gp-emphasis` — emphatic ta, hem de, de mi, işte
- Vocabulary: folk poetry and song
- Interlude: **Mani** — the four-line folk verse, improvised, rhymed and often exchanged in dialogue
- Batch: C1-3

#### c1-u07 · Discourse and argument · Kaldı ki…
- Grammar:
  - `gp-argument-markers` — öncelikle, bir yandan … öte yandan, üstelik, kaldı ki, hatta, aksine, nitekim, zira
  - `gp-concluding-markers` — sonuç olarak, kısacası, demek ki, özetle
  - `gp-hedging` — bana kalırsa, kanımca, diyebiliriz ki, bir bakıma
  - `gp-meger` — meğer … -mIş: discovering what was true all along
  - `gp-cohesion` — söz konusu, adı geçen, bu bağlamda, yukarıda belirtildiği gibi
- Vocabulary: literature and criticism
- Interlude: **Modern Turkish literature** — Halide Edib, Sabahattin Ali, Sait Faik, Yaşar Kemal and Orhan Pamuk (Nobel Prize 2006), described rather than quoted
- Batch: C1-4

#### c1-u08 · Spoken Turkish · N'apıyosun?
- Grammar:
  - `gp-spoken-yor` — -(I)yor in speech (geliyo, biliyo musun, napıyosun)
  - `gp-spoken-future` — -(y)AcAk in speech (gelicem, yapcaz)
  - `gp-spoken-reductions` — bi, n'aber, bi dakka, baya
  - `gp-informal-vocabulary` — informal words and texting abbreviations (kanka, aynen, harbiden, slm, tşk)
  - `gp-spoken-vs-written` — when to write it as it is said, and when not to
- Vocabulary: city transport, street talk
- Interlude: **The dolmuş** — shared taxis that leave when full, and passing the fare forward
- Batch: C1-4

## C2 · Mastery

Recognizing and handling the varieties of written and spoken Turkish: press, literature, the Ottoman lexicon, regional speech, humour and translation. Three lessons per unit, 6–10 substantial exercises per lesson, with `open` exercises checked against model answers. Interludes are in Turkish with a glossary.

#### c2-u01 · The language of the press · Manşetler
- Grammar:
  - `gp-headlines` — headline grammar: missing copula and tense, -DI and -mIş in leads
  - `gp-news-reporting` — reporting verbs and attribution (-DIğInI belirtti, ifade etti, kaydetti; *-mAsI bekleniyor*)
  - `gp-news-passive` — passive and impersonal structures in the news (açıklandı, bildirildi, kabul edildi)
  - `gp-numbers-in-print` — dates, figures, abbreviations and suffixes in print (2026'da, %15'lik, TBMM'de)
- Vocabulary: the press and public life
- Interlude: **A short history of the Turkish press** — Takvim-i Vekâyi (1831), Tercüman-ı Ahvâl (1860), and newspapers after the alphabet reform
- Batch: C2-1

#### c2-u02 · Literary style · Bir zamanlar
- Grammar:
  - `gp-narrative-tenses` — tense in narration: -DI, -mIş, the historical present, chains of -(y)Ip and -(y)ArAk
  - `gp-literary-forms` — literary and older forms (-(y)AsI as in *gidesi geldi*, -(y)ArAktAn, -cAsInA)
  - `gp-literary-word-order` — inversion and rhythm in prose and poetry
  - `gp-free-indirect` — free indirect speech and the narrator's voice
- Vocabulary: literary vocabulary (hüzün, özlem, gurbet, sitem)
- Interlude: **The birth of the Turkish novel** — Şemsettin Sami, Namık Kemal, Ahmet Mithat and Halit Ziya's Aşk-ı Memnu (1900), with public-domain extracts
- Batch: C2-1

#### c2-u03 · Ottoman vocabulary · Lügat ve sözlük
- Grammar:
  - `gp-ottoman-pairs` — Ottoman and Öz Türkçe pairs (mektep/okul, talebe/öğrenci, lügat/sözlük, mesele/sorun, hürriyet/özgürlük)
  - `gp-ottoman-domains` — administration, law and daily life (sadrazam, vezir, ferman, kadı, hane, peder, valide)
  - `gp-ottoman-register` — what an Ottoman-flavoured word signals today: formality, law, religion, nostalgia, irony
  - `gp-transliteration` — reading Ottoman Turkish in Latin transliteration
- Vocabulary: Ottoman everyday and administrative words
- Interlude: **The language reform** — the Turkish Language Association (1932), word surveys and the Öz Türkçe movement
- Batch: C2-2

#### c2-u04 · Regional varieties and the Turkic world · Ağızlar
- Grammar:
  - `gp-dialect-areas` — the main dialect areas of Anatolia and Thrace, and how Istanbul speech became the standard
  - `gp-dialect-features` — well-documented regional features, to recognize rather than produce (for example Aegean *geliyon*)
  - `gp-turkic-relatives` — Turkish beside Azerbaijani, Turkmen, Uzbek, Kazakh, Kyrgyz, Tatar, Uyghur and Sakha: shared words and sound correspondences
  - `gp-varieties-respect` — talking about regional speech without stereotypes
- Vocabulary: regional words and their standard equivalents
- Interlude: **Kaşgarlı Mahmud and the Turkic world** — the 11th-century Dîvânu Lugâti't-Türk, the first comparative dictionary of Turkic dialects
- Batch: C2-2

#### c2-u05 · Wordplay and humour · Söz oyunları
- Grammar:
  - `gp-homonyms` — homonyms behind puns (yüz, gül, çay, dolu, yaz, ben, at, düş)
  - `gp-cinas-tekerleme` — cinas in folk and divan poetry; tekerleme tongue twisters
  - `gp-fikra` — the fıkra: setup, turn and punchline; Nasreddin Hoca's logic
  - `gp-irony` — irony, understatement and teasing in conversation
- Vocabulary: humour and satire
- Interlude: **Satire and caricature** — from Teodor Kasap's Diyojen, the first Ottoman satirical paper, to the weekly humour magazines of the late 20th century
- Batch: C2-3

#### c2-u06 · Translation and style · Çeviri ve üslup
- Grammar:
  - `gp-translation-structure` — unpacking long words and left-branching clauses into English, and back
  - `gp-translating-evidentiality` — rendering -mIş, -DIr and dropped pronouns in English
  - `gp-style-analysis` — sentence length, word origin, register and rhythm
  - `gp-untranslatables` — hüzün, gurbet, kolay gelsin, keyif, nazar, hayırlı olsun
- Vocabulary: translation and editing
- Interlude: **The Translation Bureau** — the Tercüme Bürosu of 1940 and its programme of world classics in Turkish
- Batch: C2-3

## Batches

One batch = one conversation that writes finished, validated content. Progress is tracked in the log at the bottom of [PROJECT.md](PROJECT.md); `node scripts/turkish/validate.mjs --batch <id>` reports what a batch still lacks.

### Content batches

| Batch | Units | Focus |
|---|---|---|
| A1-1 | a1-u01, a1-u02, a1-u03 | Letters, harmony, plurals, "to be" (also tests the schemas on real content) |
| A1-2 | a1-u04, a1-u05, a1-u06 | Questions, locative, present continuous |
| A1-3 | a1-u07, a1-u08, a1-u09 | Dative, ablative, accusative, possessives |
| A1-4 | a1-u10, a1-u11, a1-u12 | Genitive, numbers and time, imperative |
| A2-1 | a2-u01, a2-u02, a2-u03 | Past, past of "to be", future |
| A2-2 | a2-u04, a2-u05, a2-u06 | Aorist, ability, necessity |
| A2-3 | a2-u07, a2-u08, a2-u09 | Optative, comparison, postpositions |
| A2-4 | a2-u10, a2-u11, a2-u12 | Compounds and -ki, -(y)ken and -(y)Ip, word building |
| B1-1 | b1-u01, b1-u02, b1-u03 | Compound tenses and the evidential |
| B1-2 | b1-u04, b1-u05, b1-u06 | Verbal nouns and participles |
| B1-3 | b1-u07, b1-u08 | Converbs |
| B1-4 | b1-u09, b1-u10 | Conditionals, passive and reflexive |
| B1-5 | b1-u11, b1-u12 | Causative and reciprocal, reported speech |
| B2-1 | b2-u01, b2-u02, b2-u03 | Unreal conditions, as if, concession |
| B2-2 | b2-u04, b2-u05 | Noun clauses, formal Turkish |
| B2-3 | b2-u06, b2-u07, b2-u08 | Compound verbs, stacked voices, particles |
| B2-4 | b2-u09, b2-u10 | Colloquial Turkish, linking clauses |
| C1-1 | c1-u01, c1-u02 | Modality and certainty |
| C1-2 | c1-u03, c1-u04 | Nominalizations and the Ottoman layer |
| C1-3 | c1-u05, c1-u06 | Idiom and word order |
| C1-4 | c1-u07, c1-u08 | Discourse and speech |
| C2-1 | c2-u01, c2-u02 | Press and literature |
| C2-2 | c2-u03, c2-u04 | Ottoman vocabulary and dialects |
| C2-3 | c2-u05, c2-u06 | Humour and translation |

Three A1 or A2 units fit in one conversation because their exercises are short. From B1 onward, exercises and guides get longer, so batches hold two units, or three related ones.

### Flashcard batches

| Batch | Ranks | File |
|---|---|---|
| FC-1 | 1–200 | `assets/data/turkish/flashcards/fc-0001-0200.json` |
| FC-2 | 201–400 | `assets/data/turkish/flashcards/fc-0201-0400.json` |
| FC-3 | 401–600 | `assets/data/turkish/flashcards/fc-0401-0600.json` |
| FC-4 | 601–800 | `assets/data/turkish/flashcards/fc-0601-0800.json` |
| FC-5 | 801–1000 | `assets/data/turkish/flashcards/fc-0801-1000.json` |

FC-1 also settles the word list and its source for all five batches (see PROJECT.md, "Flashcards").

### Build and QA conversations

| ID | What gets built |
|---|---|
| UI-1 | `assets/js/turkish.js` (data loading, progress store, answer checker, SRS scheduler) with a Node test script, and the hub `turkish.html`. Adding an entry to `index.html` is proposed to Grégoire first. |
| UI-2 | Lesson player `turkishlesson.html`: all ten exercise types, TTS, the Turkish keyboard bar, unit reviews, "jump here" tests, mistakes practice |
| UI-3 | Guide reader `turkishguide.html`: grammar guides and interludes, inline markup, segmented examples, grammar-point index and cross-links |
| UI-4 | Flashcards `turkishcards.html`: review session, deck browser, stats, settings, export and import of progress |
| QA-1 | After A2: play through A1–A2, fix content and accept lists, tune the player, fill `unit` on flashcards taught so far, update PROJECT.md with lessons learned |
| QA-2 | Final pass: full validation, cross-links, mobile and accessibility checks, sitemap, README |

### Recommended order (35 conversations)

1. A1-1, the first real content, which shakes down the schemas
2. UI-1
3. UI-2
4. UI-3
5. FC-1
6. UI-4
7. A1-2
8. A1-3
9. A1-4
10. FC-2
11. A2-1
12. A2-2
13. A2-3
14. A2-4
15. FC-3
16. QA-1
17. B1-1
18. B1-2
19. B1-3
20. B1-4
21. B1-5
22. FC-4
23. B2-1
24. B2-2
25. B2-3
26. B2-4
27. FC-5
28. C1-1
29. C1-2
30. C1-3
31. C1-4
32. C2-1
33. C2-2
34. C2-3
35. QA-2
