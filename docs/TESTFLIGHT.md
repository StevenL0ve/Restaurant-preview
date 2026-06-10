# Getting CoParent into TestFlight

TestFlight is Apple's beta system: you upload a signed build to App Store
Connect, and it becomes installable on your phone via the TestFlight app.

> **Why this can't be done from the cloud agent:** iOS apps can only be built
> and code-signed on **macOS with Xcode**, and the upload must come from your
> authenticated Apple account. Both steps run on **your Mac**. Everything below
> is set up in this repo already — you run the commands; paste any error here
> and I'll debug it with you.

---

## Prerequisites (on your Mac)

- macOS with **Xcode** installed (from the Mac App Store), opened once to accept the license.
- **CocoaPods** and **Node**: `sudo gem install cocoapods` and Node 18+.
- Your **Apple Developer Program** membership active (you have this).
- **Fastlane** (optional but recommended): `brew install fastlane`.

## Path A — Fastlane (one command after setup) ✅ recommended

1. **Clone & install**
   ```bash
   git clone <this repo> && cd Restaurant-preview
   npm install
   ```
2. **Generate the native iOS project** (one-time):
   ```bash
   npm run build
   npx cap add ios
   npx cap sync ios
   ```
3. **Create an App Store Connect record** for bundle id `com.stevennelson.coparent`
   (App Store Connect → Apps → +). Name: **CoParent**.
4. **Create an App Store Connect API key** (Users and Access → Integrations →
   App Store Connect API → +). Download the `.p8`. This lets Fastlane upload
   without interactive 2FA.
5. **Fill in `fastlane/Appfile`** with your `apple_id` and team IDs, and export
   the API key env vars (see the key's Issuer ID / Key ID):
   ```bash
   export APP_STORE_CONNECT_API_KEY_PATH=~/keys/AuthKey_XXXX.p8
   export APP_STORE_CONNECT_API_KEY_ID=XXXXXXXXXX
   export APP_STORE_CONNECT_API_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```
6. **Ship it:**
   ```bash
   fastlane beta
   ```
   This builds the app, bumps the build number, and uploads to TestFlight.
   Processing takes a few minutes, then it appears under TestFlight in App
   Store Connect.

## Path B — Xcode UI (no Fastlane)

1. `npm run build && npx cap add ios && npx cap sync ios`
2. `npx cap open ios` (opens Xcode).
3. Select the **App** target → **Signing & Capabilities** → check *Automatically
   manage signing* and pick your **Team**.
4. Set a **version** (e.g. 1.0.0) and **build** number (e.g. 1).
5. Choose **Any iOS Device** as the destination → **Product → Archive**.
6. In the Organizer: **Distribute App → TestFlight (Internal Only) → Upload**.
7. In App Store Connect → your app → **TestFlight**: add yourself as an internal
   tester. Install the **TestFlight** app on your iPhone and accept the invite.

## Skip the export-compliance prompt on every upload

CoParent only uses standard HTTPS (exempt encryption), so set this once and
TestFlight stops asking. Run after `npx cap add ios`:

```bash
PLIST=ios/App/App/Info.plist
/usr/libexec/PlistBuddy -c "Add :ITSAppUsesNonExemptEncryption bool false" "$PLIST" 2>/dev/null \
  || /usr/libexec/PlistBuddy -c "Set :ITSAppUsesNonExemptEncryption false" "$PLIST"
```

Re-run it if you ever regenerate the `ios/` project. (The native folder is
created on your Mac, so this can't live in the cross-platform repo.)

## After upload

- First upload requires completing **Export Compliance** (CoParent uses only
  standard encryption / HTTPS → typically "no" to the custom-encryption question).
  The plist flag above removes this prompt entirely.
- Internal testers (up to 100, must be in your team) get builds immediately.
- External testers require a short Beta App Review.

## Android equivalent (for parity)

Google Play's beta is **Internal testing**. Build a signed `.aab` in Android
Studio (or `fastlane supply`), upload under Testing → Internal testing, and share
the opt-in link. See `docs/PUBLISHING.md`.
