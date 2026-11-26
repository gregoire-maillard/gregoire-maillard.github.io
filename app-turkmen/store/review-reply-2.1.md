# Daily Turkmen · Reply to App Review (Guideline 2.1, Information Needed)

Paste the block below into App Store Connect › Daily Turkmen › Distribution › iOS App 1.0 ›
App Review Information › **Notes** (it replaces the old notes), attach the screen recording in the
**Attachment** field just below, then **Add for Review / Resubmit**. Also paste it as a reply in
the App Review message (Répondre à l'équipe de vérification).

Replace the two `[...]` placeholders with the demo account you create first (see the French
checklist at the bottom).

```text
Thank you for the review. Here is the information requested.

1. SCREEN RECORDING
Attached in the App Review Information "Attachment" field: recorded on an iPhone running the latest iOS, starting from launching the app. It shows the welcome screen, a full lesson (tap and typing exercises with the Turkmen letter bar), the Flashcards, Practice (speed round), Profile and Settings tabs, the daily reminder, the backup to Files, then creating an optional profile (sign up), signing out, signing in, and deleting the profile (Profile tab > Account & character > Delete profile). The app has no user-generated content shared with other users and no paid content or in-app purchases.

2. PURPOSE AND AUDIENCE
Daily Turkmen is a free, ad-free course to learn Turkmen, the official language of Turkmenistan, from level A1 to B1. Learning resources for Turkmen are very scarce, especially for English speakers; the app gives travellers, students, researchers, aid and business workers, and people with Turkmen family a structured path: 144 short lessons with instant feedback, a grammar guide and a culture interlude per unit, and 1,000 spaced-repetition flashcards. Everything is built into the app and works offline.

3. HOW TO USE IT
No login is needed. On the welcome screen, tap "Start lesson 1" and answer a few exercises. Then open the Flashcards tab, and the Practice tab for the 60-second speed round. Settings > Daily reminder sets a local notification; Settings > Backup exports and imports progress through Files. The home-screen widget shows the streak and the word of the day.
An account is optional (Profile tab, email and password) and only syncs progress with the website dailyturkmen.app. Demo account:
Email: [demo email]
Password: [demo password]
Delete profile is on the Profile tab (Account & character > Delete profile); it deletes the account and its data from our database immediately.

4. EXTERNAL SERVICES
- Supabase (supabase.com): authentication and database for the optional profile only (email, display name, progress).
- No AI services, no payment processor, no advertising, no analytics or tracking SDK in the app.
- Apple frameworks only otherwise: local notifications, WidgetKit, haptics, share sheet / Files.
- The website dailyturkmen.app hosts the privacy policy and the password-reset page.

5. REGIONAL DIFFERENCES
None. The app and its content are identical in every country and region; the interface is in English.

6. REGULATED INDUSTRY / THIRD-PARTY MATERIAL
The app is not in a regulated industry. The lessons, examples, translations, grammar guides and culture notes were written by me, the developer. The order of the flashcard deck is adapted from the FrequencyWords lists by Hermit Dave (CC BY-SA 4.0), credited in the app (Settings > About > Sources); the Lora font is under the SIL Open Font License.

Contact: Grégoire Maillard, gregoire.maillard@yahoo.fr
```

---

## Ce que tu dois faire (checklist)

1. **Créer le compte démo** : sur dailyturkmen.app (ou dans l'app), crée un profil avec une adresse
   à toi (ex. un alias Yahoo `gregoire.maillard+review@…` si ta boîte l'accepte, sinon une
   adresse dédiée), confirme le courriel, fais 1–2 leçons pour qu'il y ait de la progression.
   Ne le supprime pas avant la fin de la vérification. Mets l'adresse et le mot de passe dans les
   `[...]` ci-dessus. Laisse « Connexion requise » décochée (l'app marche sans compte).
2. **Enregistrer la vidéo sur l'iPhone** (iOS à jour — vérifie Réglages › Général › Mise à jour) :
   Centre de contrôle › Enregistrement de l'écran. Commence écran d'accueil iPhone → ouvre
   Daily Turkmen. Parcours, 2–3 min au total :
   - écran de bienvenue › Start lesson 1 › quelques exercices dont une saisie ;
   - onglets Flashcards, Practice (speed round quelques secondes), Settings (reminder, Backup › Export) ;
   - Profile › **créer un nouveau compte** (une autre adresse que le compte démo) › déconnexion ›
     reconnexion › **Delete profile** jusqu'à la confirmation.
   Apple exige explicitement de voir l'inscription, la connexion **et** la suppression.
3. **Téléverser la vidéo** : App Store Connect › Daily Turkmen › Distribution › version 1.0 ›
   Informations sur la vérification de l'app › **Pièce jointe** (glisser le .mov ; si trop lourd,
   AirDrop vers le Mac puis le téléverser depuis le Mac).
4. **Coller le texte** dans **Notes**, Enregistrer, puis **Ajouter pour vérification / Soumettre**
   à nouveau. Réponds aussi dans le message de l'équipe de vérification avec le même texte
   (« Le compte rendu et la vidéo sont dans les notes et la pièce jointe »).
