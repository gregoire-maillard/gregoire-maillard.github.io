# Daily Turkish – iOS app

The Turkish section of gregoiremaillard.com (`turkish*.html`, `assets/js/turkish*.js`,
`assets/data/turkish/`) packaged as an iPhone app with [Capacitor](https://capacitorjs.com) 8.
The website stays the only source: the app is rebuilt from it, so nothing has to be edited twice.

## What's in this folder

| Path | What it is |
|---|---|
| `capacitor.config.json` | App id `app.dailyturkish`, name "Daily Turkish", white background, content kept clear of the notch |
| `scripts/build-www.mjs` | Builds `www/` from the site: the same files as the dailyturkish.app mirror, `turkish.html` as the start page, the Google tag removed, the app-only scripts added |
| `src/turkish-app.js` | **App only.** The daily reminder (below). Never copied to the website |
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
- **No sign-in in the app:** `src/turkish-app.js` hides every way into the online profile and never
  loads the sign-in library (the magic link would return to the website, not the app). Progress stays
  on the phone, so the App Privacy answer is **Data not collected**. My Profile still shows level,
  XP, achievements and the study calendar.
- **Privacy policy:** `turkishprivacy.html` at the site root, live at
  `https://gregoiremaillard.com/turkishprivacy.html` and, through the mirror, at
  `https://dailyturkish.app/turkishprivacy.html` once pushed.
- **Export compliance:** `ITSAppUsesNonExemptEncryption = NO` in `Info.plist`, so App Store Connect
  doesn't ask on every upload.
- **iPhone only:** `TARGETED_DEVICE_FAMILY = 1`, so no iPad screenshots are needed.

Still to check on a real phone: Export/Import of progress. Bump `MARKETING_VERSION` /
`CURRENT_PROJECT_VERSION` in Xcode for each upload. The `ios/` folder is published by GitHub Pages
along with the rest of the repo; it holds nothing private.

To build and publish without a Mac (GitHub Actions + TestFlight), follow [RELEASE.md](RELEASE.md).
