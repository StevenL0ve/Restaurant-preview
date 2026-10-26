# Getting ORSync into the App Store and Google Play

Everything that can be automated is. This is the short list of things only
the account owner can do, in order, for each store. Builds come from GitHub
Actions (iOS: `TestFlight` workflow, Android: `Android` workflow), both run
from the Actions tab on the `claude/prefcard-app-rebuild-47hgvc` branch.

Links you'll paste into both stores:

- Privacy policy: https://stevenl0ve.github.io/Restaurant-preview/privacy.html
- Support URL: https://github.com/StevenL0ve/Restaurant-preview (or your email)
- Support / sales email: admin@ourgymapp.com (Settings → Help & contact; support page public/support.html)

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

The TestFlight pipeline already works. The listing goes up through Apple's
API too, so the console work is three clicks.

1. Add one repository secret, **ASC_CONTACT_PHONE**, with the phone number
   Apple's reviewers may call (GitHub → Settings → Secrets and variables →
   Actions). Then run the **App Store metadata** workflow from the Actions
   tab. It fills in the name, subtitle, description, keywords, screenshots,
   categories (Medical, Productivity), age rating, privacy URL, and the App
   Review contact + demo account from `fastlane/metadata/`.
2. **App Privacy** (the nutrition label) can't be set by API. In App Store
   Connect → ORSync → App Privacy declare, all "linked to the user", not
   used for tracking:
   - Contact info: name, email, phone number (optional)
   - User content: photos (optional profile photo), other user content
     (preference cards and OR records)
   - Identifiers: user ID
3. **1.0 Prepare for Submission**: pick the latest TestFlight build under
   Build, check the listing the workflow filled in, and Submit.
4. **App Review Information** is filled in by the workflow. Sign-in required: yes.
   - Username: `bkborngaraised@gmail.com`
   - Password: `appleteam`
   Create that account in the app first (Create account, name "Apple Review")
   and, signed in as it, create a facility named **Apple Review OR** with
   password **appleteam** so the reviewer is its admin and sees carts, QC,
   on call, loaners, and the catalog without waiting for approval.
   Notes to paste:

   > ORSync is a preference-card and case-cart app for surgical teams. It
   > holds no patient information (every free-text field reminds users not
   > to enter any). Sign in with the test account. The Carts and On call tabs
   > work with a facility: the test account is already an admin of the
   > facility "Apple Review OR" (password "appleteam"); if asked, enter that
   > in Settings → Facility, or tap "Try the demo" on either tab. Face ID is
   > optional and can be enabled in Settings.
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
   form (collects name, email, phone optional, optional profile photo, app content; encrypted in
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
