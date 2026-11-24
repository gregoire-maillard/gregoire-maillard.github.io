# Daily Turkmen – iOS app

The Turkmen course of gregoiremaillard.com (`turkmen/*.html`, `assets/js/turkmen*.js`, `assets/data/turkmen/`), served on its
own at dailyturkmen.app, packaged as an iPhone app with [Capacitor](https://capacitorjs.com) 8. A fork of `app/` (Daily Turkish),
which it loads nothing from. The website stays the only source: the app is rebuilt from it, so nothing has to be edited twice.

## What's in this folder

| Path | What it is |
|---|---|
| `capacitor.config.json` | App id `app.dailyturkmen`, name "Daily Turkmen", white background, edge to edge, dark status bar text, keyboard resizes the web view |
| `scripts/build-www.mjs` | Builds `www/` from the site: the files of the dailyturkmen.app mirror (`sync-dailyturkmen.yml`), the pages of `turkmen/` moved to the root as the mirror does, the Google tag removed, `<html data-app="ios">` on every page (`TKM.app`), `viewport-fit=cover` and the app stylesheet, "Buy me a cup of tea" and the header's Daily Turkish mark left out, links to Daily Turkish sent to dailyturkish.app (Safari), "on this iPhone" for "in this browser", the sign-in library from `vendor/` and emailed links to dailyturkmen.app, the app-only scripts added; then fails if a Google tag or a tip link is left or a page refers to a file that isn't in `www/` |
| `scripts/content-4plus.mjs`, `scripts/content-filter.mjs` | **App only.** The course for a 4+ age rating (below) |
| `src/turkmen-app.js` | **App only.** Tab bar, daily reminder, Export/Import, haptics, status bar, keyboard, widget, rating prompt, Speed round, welcome. A fork of `app/src/turkish-app.js` |
| `src/turkmen-app.css` | **App only.** Notch and home indicator, the tab bar and the app's look of the pages. A fork of `app/src/turkish-app.css`, in the Daily Turkmen green |
| `icon.svg` | Source of the app icon (the favicon's book and *göl*, full bleed) |
| `ios/` | The Xcode project (Swift Package Manager): targets App (`app.dailyturkmen`) and DailyTurkmenWidget (`app.dailyturkmen.widget`), App Group `group.app.dailyturkmen`, green launch screen |
| `store/listing.md` | Everything to paste into App Store Connect |
| `RELEASE.md` | From the Apple identifiers to the App Store, without a Mac |
| `www/`, `node_modules/` | Generated, not committed |

## What the app does (as Daily Turkish's)

Five tabs at the bottom (Course, Flashcards with today's count, Practice, Profile, Settings | About); the course opens on the unit in
progress, one level at a time; a welcome from the foal (*Taý*) on the first launch; a green screen with the logo on the first opening
of the day; Practice with your mistakes and a 60-second Speed round; a daily reminder (word of the day, the course's own proverbs,
streak at risk; off until iOS allows it); haptics; Export and Import through the share sheet and Files; a home-screen widget with
the streak and the word of the day; Apple's rating prompt at a happy moment; sign-in with email and password (the same profile as
Daily Turkish; emailed links open dailyturkmen.app). Keys `tkm:app:…` in `localStorage`, outside the progress and its export.

**The look is Daily Turkish's app.** The Turkish hub draws its phone look itself (its FX-1 and FX-2: chunky buttons, the
unit in progress in the level's colour with its tile pattern, the lessons as a trail of round buttons with the character beside
the next one); the Turkmen hub doesn't yet, so `turkmen-app.js` draws the trail after each redraw of the path (a port of
`turkish.html`'s `trailHtml`) and `turkmen-app.css` carries the rest, with the Turkmen level colours and a white *göl* pattern.
The Profile tab shows your character, kept from the hub (`tkm:app:pic`), and My Profile's menu starts with Account & character
when signed out, as in Daily Turkish.

Differences from Daily Turkish: no speech (the course has no audio), no Conversations or TYS practice, no ferry on the path; the
character in the top bar and the welcome is copied from the hub's greeter (`#hello`), since the Turkmen characters are drawn by
`turkmen/index.html` itself, and the Profile tab shows a person icon; the hub doesn't mark the unit in progress, so
`turkmen-app.js` does (`.is-here`); a unit shown as one row drops the hub's node grid.

## The course for a 4+ age rating (app only)

`build-www.mjs` copies the course into `www/`, then `content-filter.mjs` applies `content-4plus.mjs` to that copy only:

- **Smoking → taking photos.** Every *çilim çekmek* (to smoke) becomes *surat çekmek* (to take photos), with the English to match
  ("No smoking!" → "No photos!", "My father gave up smoking" → "taking photos"): A1 unit 12, A2 units 4, 5, 6 and 9, B1 units 4, 5 and
  10 (guides, lessons, the unit summary, the index). The verb stays *çekmek*, so every form, segmentation and accepted answer keeps
  its grammar. Lesson b1-u10-l02 is titled "No photos here".
- **Cards:** *çilim* (cigarette) left out; *fotosurat* (photo) added as `fc-1001` (`flashcards/tm-fc-1001-1001.json`, A2 unit 6),
  so the deck still holds 1,000 words. *Çekmek*'s note no longer mentions smoking.
- **Interludes:** no wine in the Nisa rhytons (*olardan içendirler*); no death toll in the Mongol sack of Merv; no deaths in the
  resistance to collectivization (B1 unit 2); Basat **defeats** Tepegöz, a one-eyed giant (no killing, no man-eating).
- **Then:** `index.json` is recounted (lesson titles and exercise counts, cards, a version of its own), and the build **fails** if a
  rule no longer finds its text, if a replacement occurs a different number of times, or if `GUARD` finds a word of these kinds
  anywhere in the app's data.

Checked with the course's own tools on the filtered copy: `validate.mjs` passes but for the added card's rank (1001) and file
name, expected; the morphology engine accepts every reworded conjugation; `test.mjs` 87/87.

**For the native review** (AI-written, not yet checked): the reworded sentences above (*Surat çekmäň!*, *Atam surat çekmez*,
*Kakam käte surat çeker*, *Bu ýerde surat çekip bolmaýar*, *Sen bu ýerde surat çekmeli däl*, *Bu ýerde surat çekmek gadagan*,
*Surat çekmeýän adamlar köp*, *Bu ýerde surat çekilmeýär*, *Kakam surat çekmegi taşlady*), the *fotosurat* card, and the app's own
words: *Şu gün azajyk türkmençe?*, *Başla!* (beside the next lesson), *Ajaýyp!*, *Gowy!*, *Ýene bir gezek?*, *Gutlaýarys!* (the proverbs come from B1 unit 12).

## Build and look

```sh
cd app-turkmen
npm install          # first time only
npm run build        # www/ only: open www/index.html through any local web server to see the app's pages
npm run sync         # rebuild www/ and copy it into the Xcode project (the workflow does this on GitHub's Mac)
```

To publish without a Mac, follow [RELEASE.md](RELEASE.md).
