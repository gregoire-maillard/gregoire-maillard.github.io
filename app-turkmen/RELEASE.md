# Releasing Daily Turkmen to the App Store, without a Mac

Same road as Daily Turkish (`app/RELEASE.md`), shorter: the Apple Developer account, the API key and the four GitHub secrets
are already there and work for every app of the team. What's new is the app's own identifiers, its App Store Connect record,
and its own workflow, `.github/workflows/ios-testflight-turkmen.yml` (**iOS (Daily Turkmen): build and upload to TestFlight**).

## A. Identifiers (once, developer.apple.com/account/resources/identifiers)

1. **App Group.** **+** › App Groups › Continue › Description `Daily Turkmen`, Identifier `group.app.dailyturkmen` › Continue › Register.
2. **The app.** **+** › App IDs › App › Continue › Description `Daily Turkmen`, Bundle ID **Explicit** `app.dailyturkmen` ›
   tick **App Groups** › Continue › Register. Open it again › App Groups › Configure › tick `group.app.dailyturkmen` › Save › Confirm.
3. **The widget.** **+** › App IDs › App › Continue › Description `Daily Turkmen Widget`, Bundle ID **Explicit**
   `app.dailyturkmen.widget` › tick **App Groups** › Continue › Register. Open it again › App Groups › Configure › tick
   `group.app.dailyturkmen` › Save.

Without these, the export stops on "requires a provisioning profile with the App Groups feature".

## B. The App Store Connect record (once)

4. appstoreconnect.apple.com › Apps › **+** › New App: Platforms iOS · Name `Daily Turkmen` (if taken: `Daily Turkmen: A1 to B1`) ·
   Primary language English (U.S.) · Bundle ID `app.dailyturkmen` · SKU `dailyturkmen-ios` · User access: Full Access › Create.

## C. Build, upload and test

5. **Push** the repo (the `app-turkmen/` folder and the new workflow must be on GitHub).
6. **Run the build.** GitHub › Actions › **iOS (Daily Turkmen): build and upload to TestFlight** › Run workflow › Version `1.0` ›
   Run workflow. About 10–15 minutes. A red cross: open the failed step and send Claude the last lines of its log.
7. **Wait for processing** (15–30 minutes, Apple emails you), then App Store Connect › Daily Turkmen › **TestFlight** › Internal
   Testing › **+** › group `Me` › add yourself › add the build.
8. **Install it** from the TestFlight app on the iPhone and check, as for Daily Turkish:
   - the first launch: the foal's welcome (*Salam!*) and Start lesson 1; a lesson with taps and buzzes, and a typing exercise with
     the Turkmen letter bar above the keyboard and Check just above it;
   - the five tabs (Course, Flashcards with its count, Practice, Profile, Settings with Settings | About); Practice › Speed round;
   - the reworded lessons: A1 unit 12 lesson 2 (*Surat çekmäň!*, "No photos!") and B1 unit 10 lesson 2 ("No photos here");
   - the green screen with the logo on the first opening of the day; the reminder offer on the Course tab;
   - the widget: long-press the home screen › **+** › Daily Turkmen; the reminder (time 2 minutes ahead, leave the app);
   - Settings › Backup › Export (share sheet; Files › On My iPhone › Daily Turkmen) and Import;
   - Profile: sign in with email and password (the same account as Daily Turkish), progress synced, Delete profile.

## D. Store listing and submission

9. Everything to paste is in `app-turkmen/store/listing.md`: name, subtitle, category, Content Rights, Age Rating (all None → 4+),
   price (Free, all countries), App Privacy (Privacy Policy URL `https://dailyturkmen.app/privacy.html`; data collected: Email
   Address, Other User Content, User ID, for App Functionality, linked, no tracking), the description, keywords, support URL,
   review notes. EU trader status: as for Daily Turkish.
10. **Screenshots** for the 6.9″ display (1320 × 2868 px, at least 3): see listing.md.
11. **Version 1.0** page › Build › **+** › the TestFlight build › Add for Review › Submit. If it's rejected under guideline 4.2
    (minimum functionality), point to the offline course, the widget, the reminders, the haptics, the backup through Files and
    the synced profile, as for Daily Turkish; under 4.3 (spam, two similar apps), say that each app teaches a different language
    with its own course, written separately.

## Later updates

Push › Actions › **iOS (Daily Turkmen)** › Run workflow with a new version (`1.1`) › App Store Connect › **+ Version** › pick the
build › What's New › submit. After a content change on the website, the build may stop on a 4+ rule that no longer matches its
text, or on a new word the guard catches: `npm run build` in `app-turkmen/` says which; adjust `scripts/content-4plus.mjs`.
