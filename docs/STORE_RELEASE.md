# Getting ORSync into the App Store and Google Play

Everything that can be automated is. This is the short list of things only
the account owner can do, in order, for each store. Builds come from GitHub
Actions (iOS: `TestFlight` workflow, Android: `Android` workflow), both run
from the Actions tab on the `claude/prefcard-app-rebuild-47hgvc` branch.

Links you'll paste into both stores:

- Privacy policy: https://stevenl0ve.github.io/Restaurant-preview/privacy.html
- Support URL: https://github.com/StevenL0ve/Restaurant-preview (or your email)
- Support / sales email: bkborngaraised@gmail.com

## Before either store (10 minutes)

1. **Publish the Firestore rules** from `firestore.rules` (Firebase console →
   Firestore → Rules → paste → Publish). Nothing facility-related works
   until this is done.
2. **Create your flight's facility**: in the app, Settings → Facility → enter
   a name and password → Create. You're its admin. Share the name and
   password with the flight. Block anyone who leaves from the same screen.
3. Screenshots: `docs/store/` has five composed 6.7" frames. Google Play
   wants at least two phone screenshots (any phone size) plus a 1024×500
   feature graphic; `docs/store/store-1-hero.png` cropped works.

## iOS App Store (Apple developer account: bkborngaraised@gmail.com)

The TestFlight pipeline already works, so review is the only new step.

1. App Store Connect → ORSync → **App Information**: category Medical,
   secondary Productivity. Privacy Policy URL above.
2. **App Privacy** (the nutrition label). Declare, all "linked to the user",
   not used for tracking:
   - Contact info: name, email, phone number (optional)
   - User content: other user content (preference cards and OR records)
   - Identifiers: user ID
3. **1.0 Prepare for Submission**: pick the latest TestFlight build, paste
   the copy from `STORE_LISTING.md`, upload the screenshots, age rating 4+.
4. **App Review Information**: give Apple a test account. Create a throwaway
   account in the app (any email you control) and, in notes, a facility name
   and password for a demo facility so they can see carts and on call. Say
   that the app holds no patient data.
5. Export compliance is already declared in the build (standard HTTPS only).
6. Submit. First reviews usually take one to three days.

## Google Play (Our Gym LLC Play Console)

1. Play Console → **Create app**: ORSync, App, Free, accept the declarations.
2. Run the **Android** workflow once. With no keystore secret yet it creates
   one and attaches it as the `upload-keystore` artifact. Download that zip,
   open `upload.jks.b64`, and save its contents as the repository secret
   **ANDROID_KEYSTORE_B64** (GitHub → repo → Settings → Secrets and variables
   → Actions). Every later build then signs with the same key, which Play
   requires. Keep the .jks somewhere safe too.
3. In the `orsync-android-<n>` artifact from the same run:
   - `app-release.apk` can be sent straight to Android testers now (they
     allow "install from unknown sources" once). Good for the flight before
     Play is live.
   - `app-release.aab` is what Play takes.
4. Play Console → ORSync → **Testing → Internal testing → Create release** →
   upload the AAB → add tester emails → roll out. Testers get a link.
5. Fill the store listing (copy from `STORE_LISTING.md`), the **Data safety**
   form (collects name, email, phone optional, app content; encrypted in
   transit; users can request deletion; no sharing with third parties), the
   content rating questionnaire, and the target audience (18+).
6. Optional but worth it: a Play **service account** so the workflow uploads
   builds for you. Play Console → Setup → API access → create a service
   account with "Release manager" on ORSync, download its JSON key, save it
   as the secret **PLAY_SERVICE_ACCOUNT_JSON**. From then on the Android
   workflow pushes each build to Internal testing automatically.
7. Promote Internal → Production when the flight is happy. Google's first
   review of a new app can take up to a week; it's usually faster.

## Shipping updates after launch

Ask for the change in this chat. The flow is: change, test, push, run the
`TestFlight` and `Android` workflows, then in each console promote the new
build. App Store build numbers and Android versionCode both come from the
workflow run number plus 10, so they stay unique.
