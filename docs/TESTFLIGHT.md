# Getting CGP onto TestFlight

The iOS project is scaffolded and ready in `ios/` (Capacitor shell wrapping the
web build, app id `com.commongroundprojects.cgp`).

## Option A — no Mac needed (GitHub Actions)

`.github/workflows/testflight.yml` builds and uploads from a GitHub macOS
runner with cloud-managed signing. One-time setup:

1. **App Store Connect API key** — appstoreconnect.apple.com → Users and
   Access → Integrations → App Store Connect API → Team Keys → **Generate API
   Key**, role **Admin** (Admin is required for automatic signing). Note the
   **Key ID** and **Issuer ID**, and download the `AuthKey_XXXX.p8` file
   (downloadable only once).
2. **Repo secrets** — GitHub repo → Settings → Secrets and variables →
   Actions → New repository secret, four of them:
   | Secret | Value |
   |---|---|
   | `ASC_KEY_ID` | the Key ID |
   | `ASC_ISSUER_ID` | the Issuer ID |
   | `ASC_KEY_CONTENT` | the `.p8` file base64-encoded (`base64 -i AuthKey_XXXX.p8`) |
   | `APPLE_TEAM_ID` | your 10-char Team ID (developer.apple.com → Membership) |
3. **App record** — App Store Connect → My Apps → “+” → New App: iOS, name
   **CGP**, bundle ID `com.commongroundprojects.cgp`, SKU `cgp-app`. (If the
   name "CGP" is taken, use "CGP — Common Ground".)
4. Run the **TestFlight** workflow from the repo's Actions tab (pick the
   branch). The build lands in TestFlight ~15 minutes after the run finishes.

## Option B — on a Mac with Xcode

Building locally instead: Apple requires a Mac for this path.

## What you need (one-time)

1. **Apple Developer Program** — enroll at
   https://developer.apple.com/programs/enroll ($99/year). Use the Apple ID
   you'll manage the app with.
2. **A Mac with Xcode** (free from the Mac App Store), or a cloud build
   service if you don't have a Mac (Codemagic and Bitrise have free tiers that
   build Capacitor apps; GitHub Actions macOS runners also work).
3. **App Store Connect app record** — at https://appstoreconnect.apple.com →
   My Apps → “+” → New App: platform iOS, name **CGP**, bundle ID
   `com.commongroundprojects.cgp`, SKU `cgp-app`.

## Build & upload (on the Mac)

```bash
git clone <this repo> && cd Restaurant-preview
npm install
npm run build
npx cap sync ios
npx cap open ios          # opens Xcode
```

In Xcode:
1. Select the **App** target → *Signing & Capabilities* → check
   **Automatically manage signing** and pick your team.
2. Product → **Archive**.
3. In the Organizer window: **Distribute App → App Store Connect → Upload**.
4. In App Store Connect → TestFlight, the build appears in ~15 minutes.
   Add yourself as an internal tester and install via the TestFlight app.

## Or let fastlane do it

`fastlane/` is already configured. Fill in `fastlane/Appfile` with your Apple
ID and team IDs, then on the Mac:

```bash
brew install fastlane
fastlane beta   # builds, bumps the build number, uploads to TestFlight
```

## Ongoing costs cheat-sheet

| Thing | Cost |
|---|---|
| Apple Developer Program (TestFlight + App Store) | $99/yr |
| Google Play developer account (Android later) | $25 once |
| Stripe (in-app payments) | no monthly fee; 2.9% + 30¢ per online charge |
| Supabase (accounts, punches, orders, gift cards) | free tier to start; ~$25/mo when busy |
