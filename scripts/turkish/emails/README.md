# Daily Turkish emails to learners

Supabase only sends the sign-in emails (confirm signup, reset password, magic link). An email to
every learner goes through **Resend Broadcasts** instead: Resend already sends the sign-in emails
(Supabase's SMTP is set to Resend), and a Broadcast adds a personal unsubscribe link and skips
anyone who has unsubscribed. The free plan includes 1,000 marketing contacts.

## "Daily Turkish is now on iPhone" (app launch)

| File | What it is |
|---|---|
| `app-launch.html` | The email, in the same style as the sign-in emails |
| `app-launch-users.sql` | The Supabase query that exports who gets it |
| `send-app-launch.mjs` | Sends a test, uploads the learners to Resend, sends the Broadcast |

1. **App Store link.** In App Store Connect → the app → App Information, copy the **Apple ID** (a
   number) and put `https://apps.apple.com/app/id<that number>` in `APP_STORE_URL` at the top of
   `send-app-launch.mjs`. Link straight to it: another app called "Daily Turkish" exists, so
   "search the App Store" could send people to the wrong one.
2. **API key.** Resend → API Keys → Create API key, **Full access** (the Supabase key only has
   sending access). Delete it in Resend when you're done.
3. **Test.** In Terminal, from the repo folder:
   ```
   RESEND_API_KEY=re_xxx node scripts/turkish/emails/send-app-launch.mjs test you@example.com Grégoire
   ```
   Check it on your iPhone and in Gmail or Yahoo: the logo, the button, the layout.
4. **Export the learners.** Supabase → SQL Editor → paste `app-launch-users.sql` → Run → Export →
   Download CSV. Leave the CSV in Downloads, never in this repo (it's public).
5. **Upload them to Resend.**
   ```
   RESEND_API_KEY=re_xxx node scripts/turkish/emails/send-app-launch.mjs upload ~/Downloads/<the file>.csv
   ```
   Safe to run again: people already there are just kept in the segment.
6. **Send.**
   ```
   RESEND_API_KEY=re_xxx node scripts/turkish/emails/send-app-launch.mjs send
   ```
   It shows what will go out and waits until you type `send`. Deliveries, opens and clicks are in
   Resend → Broadcasts. Then delete the CSV and the API key.

Personalisation: Resend fills `{{{contact.first_name|arkadaşım}}}` with the first word of the
learner's display name, or "arkadaşım" (my friend) when there is none, and
`{{{RESEND_UNSUBSCRIBE_URL}}}` with that learner's unsubscribe link. Keep both exactly as written.
