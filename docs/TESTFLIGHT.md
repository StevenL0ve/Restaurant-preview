# Getting ORSync onto your iPhone via TestFlight

TestFlight is Apple's beta system: you upload a signed build to App Store
Connect and it becomes installable on your phone through the TestFlight app.

You have an **Apple Developer Program** membership, which is the one thing that
can't be automated. Everything else is set up in this repo. There are two
paths — pick one:

- **Path A — Cloud (no Mac):** a GitHub Actions macOS runner builds and uploads
  for you. ~15 min of one-time secret setup, then it's one click forever.
- **Path B — Your Mac:** one `fastlane beta` command.

> **Why I (the cloud agent) can't push the final button:** iOS builds must be
> code-signed on macOS with *your* Apple credentials. That's the part only you
> can authorize. Paste any error you hit back to me and I'll debug it with you.

---

## First, create the app record (both paths, ~3 min)

1. Sign in to [App Store Connect](https://appstoreconnect.apple.com) → **Apps → +
   New App**.
2. Platform **iOS**, name **ORSync** (if taken, try "ORSync — Prefs"),
   primary language English, bundle ID **`com.stevennelson.orsync`**
   (create it under Certificates, IDs & Profiles → Identifiers first if needed),
   SKU `orsync`.

If you'd rather use a different bundle ID, change it in **three** places and tell
me so I keep them in sync: `capacitor.config.ts`, `fastlane/Appfile`, and the
App Store Connect identifier.

## Create an App Store Connect API key (both paths, ~2 min)

App Store Connect → **Users and Access → Integrations → App Store Connect API →
+**. Role: **App Manager**. Download the `.p8` (you only get one chance). Note
the **Key ID** and the **Issuer ID** shown above the table.

---

## Path A — Cloud build (no Mac)

Set these in the repo: **Settings → Secrets and variables → Actions → New
repository secret**.

| Secret | Value |
| --- | --- |
| `APP_STORE_CONNECT_API_KEY_ID` | the Key ID from the step above |
| `APP_STORE_CONNECT_API_ISSUER_ID` | the Issuer ID |
| `APP_STORE_CONNECT_API_KEY_B64` | the `.p8` file, base64-encoded — run `base64 -i AuthKey_XXXX.p8 \| pbcopy` |
| `MATCH_GIT_URL` | URL of a **private** git repo to hold signing certs (make an empty one) |
| `MATCH_PASSWORD` | any passphrase you choose (encrypts the certs) |
| `MATCH_GIT_BASIC_AUTHORIZATION` | `base64 "<github-username>:<personal-access-token>"` so the runner can clone the certs repo |

Then, once, generate the signing certificates into that repo (needs a Mac **or**
I can guide you through `fastlane match` in a Codespace):

```bash
fastlane match appstore   # creates + stores the distribution cert & profile
```

Now go to the repo's **Actions** tab → **iOS · TestFlight** → **Run workflow**.
It builds on a macOS runner and uploads to TestFlight. Subsequent releases are
just that one click.

> No certs repo yet? Apple requires a distribution certificate that headless
> runners can't mint on their own, so the `match` repo is the reliable route.
> Ping me and I'll walk you through the one-time `match` bootstrap.

## Path B — Your Mac (one command)

```bash
git clone <this repo> && cd Restaurant-preview
# Paste your App Store Connect API key details (created above):
export APP_STORE_CONNECT_API_KEY_ID=XXXXXXXXXX
export APP_STORE_CONNECT_API_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
export APP_STORE_CONNECT_API_KEY_PATH=~/keys/AuthKey_XXXX.p8
export APPLE_TEAM_ID=XXXXXXXXXX   # 10-char Developer Team ID → non-interactive signing
npm run testflight
```

`npm run testflight` (→ `scripts/testflight.sh`) checks your toolchain, installs
deps, builds the web app, generates/refreshes the native iOS project, sets the
export-compliance flag, bumps the build number, archives with automatic signing,
and uploads — then tells you what to do in App Store Connect. First run also does
`npx cap add ios`. (Under the hood it calls `fastlane beta`, which you can also
run directly.)

Prefer the Xcode UI? `npm run build && npx cap add ios && npx cap sync ios && npx
cap open ios`, then **Product → Archive → Distribute App → TestFlight**.

---

## After the upload

- Processing takes a few minutes, then the build shows under **TestFlight** in
  App Store Connect.
- Add yourself as an **internal tester** (up to 100, must be in your team) — they
  get builds immediately, no review.
- Install the **TestFlight** app on your iPhone and accept the invite.
- The export-compliance prompt is pre-answered (the app uses only standard
  HTTPS), so you won't be asked on every upload.

## Android (for parity later)

Google Play's beta is **Internal testing**: build a signed `.aab`
(`fastlane supply` or Android Studio), upload under Testing → Internal testing,
and share the opt-in link. See `docs/PUBLISHING.md`.
