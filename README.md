# Bosmon

An original monster-catching RPG built with Next.js App Router, React, TypeScript, Canvas, and Firebase. Designed for deployment on Vercel.

## Run

```sh
npm install
npm run dev
```

Open http://localhost:3000. Local play works without Firebase.

The world fills the browser viewport, with no dashboard or page scrolling. Move with **WASD / arrow keys**, the touch D-pad, or by clicking a direction on the map. Hold a direction to keep moving. Press **J** to talk to a nearby guide, advance dialogue, or confirm the selected menu/battle action. Press **K** to open the game menu or go back; during a battle, K selects Run away and J confirms it. E and Escape remain aliases for J and K. Directional keys also move focus through menu actions. These shortcuts do not intercept typing in account fields.

On phones, portrait mode puts the world above a handheld D-pad and J/K controls. Short landscape screens put compact controls in the lower corners. The layout uses dynamic viewport height and safe-area insets, following the mobile-control patterns in the `../arcade.twiswua.com` source. Releasing a direction, cancelling a touch, leaving the window, or opening a menu stops held movement.

Walk through dark grass to encounter monsters. Attack to weaken them, throw capture orbs, and earn experience by catching or winning battles. Town keepers heal your companions when you interact within two tiles. Open **Menu → Companions** to change your lead. The menu also contains the bag, field guide, world map, journal/research reward, fellow explorers, and account settings.

The connected Solara region contains 10 towns and 15 routes on a 160 × 120 tile world. There are eight original species, a collection quest, a supply shop, a field guide, and automatic browser saves. Buildings and water are obstacles; interiors, swimming, PvP, trading, evolution, and a full campaign are not implemented. The region is a playable foundation, not equivalent to the first Pokémon game's authored content.

## Firebase

1. Create or choose a Firebase project and register a web app.
2. Enable Authentication → Sign-in method → **Email/Password** and **Google**. Set the support email requested by the Google provider setup. Anonymous sign-in is no longer required for new players.
3. Create a Cloud Firestore database.
4. Copy `.env.example` to `.env.local`, and fill in the four public web configuration values from Firebase project settings.
5. Configure the GitHub Actions deployment below to publish `firestore.rules`. For a one-off local deployment, use `firebase deploy --only firestore:rules --project YOUR_PROJECT_ID`.
6. Add your localhost and production domain to Firebase Authentication's authorized domains if needed.
7. Restart the development server after changing environment variables.

Open **Menu → Sign in** (or **Account** when already signed in) to register with email/password, sign in with Google, reset a password, or sign out. Google sign-in uses a popup; allow popups for the site.

Once signed in, the client writes its private save under `saves/{uid}`, and publishes its trainer name, world position, species count, highest level, and heartbeat under `trainers/{uid}`. Active trainers appear on the map and in the explorer list. Changed state syncs at most once per 1.5 seconds, with a heartbeat every 30 seconds. Trainers are considered active for two minutes after their last heartbeat. The list is limited to the 30 most recently updated trainers.

Guest play remains available locally without authentication. Guest saves and each Firebase account use separate browser storage keys. Signing into an account loads that account’s adventure; signing out returns to the local guest adventure. Guest progress is not automatically merged into another account. Account saves can be restored on other devices by signing into the same account.

Save selection uses the save's client timestamp; newer account-local progress wins over older cloud progress. Gameplay waits for the initial cloud read; if that read fails, retry or sign out instead of risking replacement of an unread cloud save. Subsequent cloud failures retain browser saves. Progress from the last sync interval may only exist locally when signing out.

Existing anonymous sessions can be upgraded using **Create account** or **Continue with Google**, preserving the Firebase UID and save. If the credential already belongs to another account, the app reports the conflict rather than merging or replacing either save. Sign out of the anonymous account before signing in to an existing Google account. Keep Anonymous enabled until any legacy accounts have been upgraded.

Provider setup references: [Firebase email/password authentication](https://firebase.google.com/docs/auth/web/password-auth) and [Google authentication](https://firebase.google.com/docs/auth/web/google-signin).

This is a cooperative prototype with client-authoritative gameplay. Rules isolate private saves and validate public trainer records, but they do not provide anti-cheat validation for XP, captures, or movement. Competitive play requires authoritative server-side game actions.

## GitHub Actions: Firestore rules

The workflow `.github/workflows/deploy-firestore-rules.yml` follows the deployment pattern in `../life`.

In the Bosmon GitHub repository, open **Settings → Secrets and variables → Actions** and add:

- **Secret** `FIREBASE_TOKEN`: a Firebase CLI CI token with access to Bosmon’s Firebase project, following the same setup as `life`.

The Firebase project ID is hardcoded in the workflow as `bosmon-boseriko-com`; no repository variable is needed.

Push changes to `firestore.rules`, `firebase.json`, or the workflow itself to `main` to deploy automatically. For the first deployment or a retry, open **Actions → Deploy Firestore rules → Run workflow**. The workflow validates that the token secret exists before deploying. It only deploys Firestore rules; it does not deploy the website or configure authentication providers.

## Vercel

Import this directory as a Next.js project. Use `npm run build` and the default Next.js output settings. Add the four `NEXT_PUBLIC_FIREBASE_*` values to Vercel's environment variables before building. Deploy Firestore rules separately using the instructions above. No paid Vercel add-ons are required by the code.

## Checks

```sh
npm test
npm run typecheck
npm run build
```

Tests also cover account storage separation, local/cloud save selection, and authentication error messages. Tests cover world reachability, collision, discoveries, save validation, XP, level caps, catching, combat rewards, healing, defeat recovery, fleeing, and exhausted supplies.

## Art

`public/art/monsters.png` is an original generated transparent monster atlas, used directly with CSS sprite positioning. It was created using the built-in image generation tool. The generation prompt is preserved in `public/art/PROMPT.md`. World terrain and NPC/remote trainer sprites are drawn in Canvas by `components/World.tsx`. The main player uses `public/art/player.png`, a generated four-direction sprite atlas with walking frames and directional idle poses. Its generation prompt is saved in `public/art/PLAYER-PROMPT.md`. Walking uses WASD, arrow keys, and the touch D-pad; reduced-motion preferences disable the frame cycle while preserving facing direction.

## Current verification limits

Automated logic tests, TypeScript checks, and production compilation are available locally. Live multiplayer requires a configured Firebase project. Desktop/mobile visual and input checks require a connected browser; no browser was available during this implementation. No production deployment has been made.
