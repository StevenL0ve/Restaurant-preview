# Getting CGP onto TestFlight

The iOS project is scaffolded and ready in `ios/` (Capacitor shell wrapping the
web build, app id `com.commongroundprojects.cgp`). Building and uploading to
TestFlight has to happen on a Mac with Xcode — Apple does not allow iOS builds
from Linux/Windows.

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
