# Daily Turkish – iOS app

The Turkish section of gregoiremaillard.com (`turkish*.html`, `assets/js/turkish*.js`,
`assets/data/turkish/`) packaged as an iPhone app with [Capacitor](https://capacitorjs.com) 8.
The website stays the only source: the app is rebuilt from it, so nothing has to be edited twice.

## What's in this folder

| Path | What it is |
|---|---|
| `capacitor.config.json` | App id `app.dailyturkish`, name "Daily Turkish", white background, web view edge to edge (`contentInset: never`), dark status bar text, keyboard resizes the web view |
| `scripts/build-www.mjs` | Builds `www/` from the site: the same files as the dailyturkish.app mirror, `turkish.html` as the start page, the Google tag removed from every page, `<html data-app="ios">` on every page, `viewport-fit=cover` and the app stylesheet on every page, "Buy me a Turkish coffee" left out, the app-only scripts added; then fails if a Google tag or a coffee link is left or a page refers to a local file that isn't in `www/` |
| `src/turkish-app.js` | **App only.** The daily reminder, Export/Import, haptics, status bar and keyboard (below). Never copied to the website |
| `src/turkish-app.css` | **App only.** Keeps the pages clear of the notch and the home indicator (below). Never copied to the website |
| `ios/` | The Xcode project (Swift Package Manager, no CocoaPods) |
| `www/`, `node_modules/` | Generated, not committed |

## Daily reminder (app only)

A "Daily reminder" card in the hub's Settings: on/off and a time (off by default, 19:00).
Turning it on asks iOS for permission. The app then schedules one local notification a day for the
next 14 days and **skips today once the daily XP goal is met**. It re-plans whenever progress changes
and whenever the app comes back to the foreground, so:

- if a streak is at stake today, the text says so ("Keep your 5-day streak");
- if the goal was met today, the next one is tomorrow;
- if the app isn't opened for 14 days, the reminders stop on their own (no nagging).

The choice is stored in `localStorage` `trk:app:reminder`, outside the course progress and its export.
On the website and dailyturkish.app the script isn't loaded at all.

## Native touches (app only)

So the app isn't just the website in a frame (App Store guideline 4.2), and so everything works on a phone.
The plugins are pinned to versions made for Capacitor 8.5.3: `@capacitor/filesystem` 8.1.5, `share` 8.0.3,
`haptics` 8.0.2, `status-bar` 8.0.4, `keyboard` 8.0.6 (and `local-notifications` 8.3.1). `turkish-app.js` reaches
them through Capacitor's runtime (`Capacitor.registerPlugin`), so `www/` needs no script per plugin; a plugin
missing from a build is skipped. Nothing here runs on the website or dailyturkish.app.

- **Export progress** (hub and flashcards Settings): the pages save files with a download link, which a web view
  can't follow. The app catches it, writes the file to its Documents folder and opens the **share sheet**
  (Save to Files, AirDrop, Mail, Messages…). Closing the sheet is fine: `UIFileSharingEnabled` and
  `LSSupportsOpeningDocumentsInPlace` in `Info.plist` show every export in **Files › On My iPhone › Daily
  Turkish**. "Export a copy first" (before Reset), the storage-full notice and "Download what was found" go the
  same way. The page's own status line ("Exported 12 lessons done, …") is kept.
- **Import progress**: the page's own file input opens the iOS document picker (Files, iCloud Drive, On My
  iPhone). The app also accepts `.txt`, as a file sent by Mail can arrive that way; the page checks the content
  as on the website.
- **Haptics**: a light tap for a right answer (or "almost"), a double tap for a wrong one (retries too), a
  success buzz at the end of a lesson, practice, passed review or passed test, and a longer pattern when the
  **daily goal** is met, on any page (flashcards count). None while a file is imported or progress is reset.
  Switch: Settings › Haptics, **on by default**, kept in `localStorage` `trk:app:haptics`, outside the progress
  and its export. iOS also mutes them when Settings › Sounds & Haptics › System Haptics is off.
- **Status bar and notch**: the web view is drawn edge to edge. `turkish-app.css` (every page, scoped to
  `html[data-app]`) pads the sticky glass header by `env(safe-area-inset-top)`, so it sits behind the clock like
  a native bar; moves the hub's sticky Today column and profile menu down by the same amount; lands anchors
  below the header; and keeps the end of each page, the achievement toast and the lesson's start and end
  screens clear of the home indicator (the lesson's answer dock already pads itself). The privacy page, which
  has no header, starts below the status bar under a glass strip. Status bar text is dark.
- **Keyboard**: the web view shrinks to the space above the keyboard, so the lesson's dock with **Check** rides
  on top of it. The Keyboard plugin replaces WebKit's own scroll-to-field, so the app scrolls the focused field,
  and the Turkish letter bar under it, clear of the header and the dock. The ‹ › Done bar above the keyboard is
  hidden: Check or the return key closes the keyboard.
- **Portrait only** (`Info.plist`).
- **No tip jar**: "Buy me a Turkish coffee" (footer and About section) is left out of the app's pages, since App
  Review wants tips through in-app purchase. The website keeps it.

## Build and run

Needs a Mac with Xcode, Node 20+ and, to install on a phone or publish, an Apple developer account.

```sh
cd app
npm install          # first time only
npm run sync         # rebuild www/ from the site and copy it into the Xcode project
npm run open         # opens ios/App/App.xcodeproj in Xcode
```

In Xcode: select the **App** target › Signing & Capabilities › choose your Team, then pick an
iPhone (or a simulator) and Run. After any change to the Turkish pages or data, run
`npm run sync` again before building.

## App Store readiness (done)

- **App icon:** `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`, 1024×1024, no
  transparency, drawn from the favicon (`app/icon.svg` is the source). The launch screen shows the
  same mark on white.
- **No sign-in in the app:** the build flags every page with `<html data-app="ios">`. `turkish.js` reads it
  as `TRK.app`; `turkish-account.js` then never loads the sign-in library (`TRK.account.disabled`), and the
  pages leave out the welcome card, the sign-in dialog, the account card, the characters and their menu
  entry (their CSS hides the same parts from the first paint) and say "on this iPhone" instead of "in this
  browser". Progress stays on the phone, so the App Privacy answer is **Data not collected**. My Profile
  still shows level, XP, achievements and the study calendar.
- **Privacy policy:** `turkishprivacy.html` at the site root, live at
  `https://gregoiremaillard.com/turkishprivacy.html` and, through the mirror, at
  `https://dailyturkish.app/turkishprivacy.html` once pushed.
- **Export compliance:** `ITSAppUsesNonExemptEncryption = NO` in `Info.plist`, so App Store Connect
  doesn't ask on every upload.
- **iPhone only:** `TARGETED_DEVICE_FAMILY = 1`, so no iPad screenshots are needed.

Still to check on a real phone: Export (share sheet, Files › On My iPhone › Daily Turkish) and Import,
the haptics, the header under the Dynamic Island, and a typing exercise with the keyboard up (see
RELEASE.md step 12). Bump `MARKETING_VERSION` /
`CURRENT_PROJECT_VERSION` in Xcode for each upload. The `ios/` folder is published by GitHub Pages
along with the rest of the repo; it holds nothing private.

To build and publish without a Mac (GitHub Actions + TestFlight), follow [RELEASE.md](RELEASE.md).
