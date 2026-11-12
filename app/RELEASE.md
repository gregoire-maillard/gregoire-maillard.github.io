# Releasing Daily Turkish to the App Store, without a Mac

The app is built on a GitHub-hosted Mac (`.github/workflows/ios-testflight.yml`, Xcode 26) and uploaded
to App Store Connect. You test it with TestFlight on your iPhone and submit it from the browser.
Free: macOS runner minutes cost nothing on a public repo. Only the Apple Developer Program costs money.

## A. Apple developer account (once)

1. **Two-factor authentication on your Apple Account.** iPhone › Settings › your name › Sign-In & Security ›
   Two-Factor Authentication must be On.
2. **Enroll.** Install the **Apple Developer** app from the App Store › Account tab › sign in › **Enroll Now** ›
   follow the screens as an **Individual** (your legal name becomes the seller name on the store) › pay
   $99 USD/year with your Apple Account.
3. **Wait** for the email "Welcome to the Apple Developer Program" (a few hours to 2 days).

## B. One-time setup once you're approved

4. **Team ID.** developer.apple.com/account › Membership details › copy the **Team ID** (10 characters).
5. **Register the app's ID.** developer.apple.com/account/resources/identifiers › **+** › App IDs › Continue ›
   App › Continue › Description `Daily Turkish`, Bundle ID **Explicit** `app.dailyturkish` › no capabilities ›
   Continue › Register.
6. **Create the app record.** appstoreconnect.apple.com › Apps › **+** › New App:
   - Platforms: iOS · Name: `Daily Turkish` (if taken: `Daily Turkish: A1 to C2`) · Primary language: English (U.S.)
   - Bundle ID: `app.dailyturkish` · SKU: `dailyturkish-ios` · User access: Full Access › Create
7. **API key for GitHub.** App Store Connect › Users and Access › **Integrations** tab › App Store Connect API ›
   Team Keys (the first time: Request Access and accept) › **+** (Generate API Key):
   - Name `GitHub Actions` · Access **Admin** › Generate
   - Copy the **Issuer ID** (above the list) and the key's **Key ID** (in its row)
   - **Download API Key** › `AuthKey_XXXXXXXXXX.p8`. It can be downloaded only once: keep it somewhere safe.
8. **GitHub secrets.** github.com/gregoire-maillard/gregoire-maillard.github.io › Settings › Secrets and
   variables › Actions › **New repository secret**, four times:

   | Name | Value |
   |---|---|
   | `APPLE_TEAM_ID` | the Team ID from step 4 |
   | `ASC_KEY_ID` | the Key ID from step 7 |
   | `ASC_ISSUER_ID` | the Issuer ID from step 7 |
   | `ASC_KEY_P8` | open the .p8 file in TextEdit and paste **all** of it, `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines included |

   Secrets stay private even though the repo is public.

## B2. The home-screen widget (once, before the first build that has it, APP-9g)

The widget (streak and word of the day) is a second bundle, `app.dailyturkish.widget`, and it shares the app's data
through an App Group. Register both in the browser before running the workflow, or the export stops on
"requires a provisioning profile with the App Groups feature":

- developer.apple.com/account/resources/identifiers › **+** › **App Groups** › Continue › Description `Daily Turkish`,
  Identifier `group.app.dailyturkish` › Continue › Register.
- Identifiers › **app.dailyturkish** › tick **App Groups** › Configure › tick `group.app.dailyturkish` › Continue ›
  Save › Confirm.
- Identifiers › **+** › App IDs › App › Continue › Description `Daily Turkish Widget`, Bundle ID **Explicit**
  `app.dailyturkish.widget` › tick **App Groups** › Continue › Register. Open it again › App Groups › Configure ›
  tick `group.app.dailyturkish` › Save.

The workflow signs both with their profiles itself (step "Add the entitlements" adds the App Group to the unsigned
archive first).

## C. Build, upload and test

9. **Run the build.** GitHub › Actions › **iOS: build and upload to TestFlight** › Run workflow › Version `1.0` ›
   Run workflow. About 10–15 minutes. A green check means the build was uploaded; the build number goes up
   by itself at every run. A red cross: open the failed step and send Claude the last lines of its log.
10. **Wait for processing.** Apple emails "… has completed processing" (15–30 minutes). The build then shows in
   App Store Connect › your app › **TestFlight**.
11. **Make yourself a tester.** TestFlight tab › Internal Testing › **+** › group name `Me` › add yourself ›
   add the build to the group.
12. **Install it.** On the iPhone, install **TestFlight** from the App Store, sign in with the same Apple Account,
   open Daily Turkish › Install. Check:
   - a lesson: a tap on a right answer, a double tap on a wrong one, a buzz at the end; in a typing exercise the
     answer box and the Turkish letters stay visible above the keyboard, with Check just above it;
   - flashcards, and the Turkish voice (Settings › Speech names it; the app can only use the iPhone's built-in voices, not
     ones downloaded in Settings, so with none it says listening exercises are skipped: note which you get);
   - the header's glass behind the clock and the Dynamic Island, nothing hidden under it while scrolling, the
     bottom of each page clear of the home bar; turning the phone doesn't rotate the app;
   - the first opening of the day: a red screen with the logo for about a second; the reminder offer on the
     Course tab (Turn on reminders brings iOS's question); Games (mistakes, Conversations, TYS);
   - Settings › Haptics off: no more taps;
   - the reminder (Settings › Daily reminder, time 2 minutes ahead, leave the app): a word of the day or a nudge;
   - the widget: long-press the home screen › **+** › Daily Turkish › small or medium: your streak and today's word;
   - the first launch (on a fresh install): Tekir's welcome and Start lesson 1; Games › Speed round;
   - the tab bar (Course, Flashcards with its red count, Profile with your character, Settings with a Settings | About switch at the top),
     and on Profile: sign in with email and password, progress synced, Delete my profile.
13. **Fix and repeat.** For any problem: fix (or ask Claude), commit, push, run the workflow again.

## D. Store listing and submission (App Store Connect, in the browser)

14. **App Information** (left sidebar, under General):
    - Subtitle (30 characters max) · Category: **Education**
    - Other languages (language menu at the top right of this page › add): Spanish (Mexico), English (U.K.), German and French,
      each with its own subtitle and keywords, ready in `app/store/listing.md` › Other languages. They only add search words;
      the app stays in English.
    - Content Rights: the deck's word order is adapted from FrequencyWords (CC BY-SA 4.0, credited again in About since APP-9j):
      answer that the app contains third-party content and you have the rights to use it
    - Age Rating › Edit › answer None/No throughout › result 4+ (true for the app's filtered course, see README
      "The course for a 4+ age rating"; the website's course would be 13+). Paste-ready answers: `app/store/listing.md`
15. **Pricing and Availability:** Price Free · Availability: all countries.
16. **App Privacy:** Privacy Policy URL `https://dailyturkish.app/turkishprivacy.html` › Get Started ›
    "Do you or your third-party partners collect data from this app?" **Yes** (the optional profile, APP-9) ›
    tick Email Address, Other User Content and User ID, each for App Functionality, linked to the user, not used for
    tracking (details in `app/store/listing.md`) › Save › Publish.
17. **EU (Digital Services Act):** App Store Connect asks for your trader status before the app can be offered
    in the EU. For a free hobby app you'd normally declare that you are **not a trader**. Declaring "trader"
    publishes your address and phone number on the store page.
18. **Version 1.0 page** (App Store tab › iOS App 1.0):
    - Screenshots for the **6.9″ display**: 1320×2868 px, 3 to 10 of them: the six in `app/store/screenshots/captioned/`, in order
    - Description, Keywords (100 characters, comma-separated), Support URL `https://dailyturkish.app/`,
      Copyright `2026 Grégoire Maillard`
    - **Build:** + › pick the build tested in TestFlight
    - **App Review Information:** sign-in required: **unticked** · your name, phone and email (Apple only) ·
      Notes:

      > A complete offline Turkish course (A1–C2): lessons with instant feedback, a grammar guide per unit and
      > spaced-repetition flashcards, all built into the app. No account needed. Native features:
      > daily study reminders as local notifications (Settings › Daily reminder); haptic feedback on right and
      > wrong answers, finished lessons and the daily goal (Settings › Haptics); an optional profile that syncs
      > the progress (Profile tab). Paste-ready text: `app/store/listing.md`.
    - Version release: Manually (you press Release after approval) or Automatically
19. **Submit.** Add for Review › Submit to App Review. Usually 24–48 hours; the result comes by email. If it's
    rejected under guideline 4.2 ("minimum functionality"), reply in the Resolution Center pointing to the
    offline course, the home-screen widget, the reminders, the haptics, the backup through Files and the synced
    profile.
20. **Release** (if you chose Manually): App Store tab › Release This Version.

## Later updates

Edit the site as usual › push › Actions › Run workflow with a new version (`1.1`) › in App Store Connect,
App Store tab › **+ Version or Platform** › iOS › `1.1` › pick the new build › "What's New" text › submit.
