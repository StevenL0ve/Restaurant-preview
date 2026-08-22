# CoParent — What's done & what needs you

A running checklist so we can pick up fast. Items marked **[you]** need an
account or a key — but **none of these require a Mac anymore** (see §1).

## ✅ Built & on `claude/ourfamilywizard-analysis-J8t30`
- Full app: dashboard, messages + on-device tone check, calendar + custody
  rotations + `.ics`, expenses + splits + recurring, journal, **info bank
  (editable)**, packing list, notifications, global search, JSON/CSV/print exports
- **On-device AI assistant** ("Ask CoParent") — schedule, kids' info, events,
  messages, packing, and money ("who owes who?")
- **Family setup wizard** (new accounts + Settings → "Set up my family")
- **Swap requests**: full round-trip (request → waiting → cancel / accept / decline)
- **Login / create-account** gate + Face ID affordance
- Real **logo**, custom claymation **nav icons**, playful clay design + **haptics**
- **Paywall** ($59.99/yr · $7.99/mo per family) + Pro entitlement scaffold
- **Cloud build workflows** (TestFlight + Play Store) — no local machine needed
- Phase-2 **backend scaffolding**: Supabase schema, Claude edge function, cloud config
- Siri **App Intents** scaffold

## 🔜 What needs you

### 0. See the whole app on your phone in ~2 min (web preview, zero secrets)
A **Deploy preview to GitHub Pages** Action is ready — it builds a live,
phone-openable copy of the app (uses HashRouter + base-aware assets, verified
loading on the project subpath). One-time enablement:

1. GitHub → repo → **Settings → Pages** → **Source: GitHub Actions**.
2. GitHub → **Settings → Environments → github-pages** → Deployment branches →
   add `claude/ourfamilywizard-analysis-J8t30` (or "No restriction").
3. **Actions** tab → **Deploy preview to GitHub Pages** → **Run workflow**.

Live at **https://stevenl0ve.github.io/Restaurant-preview/** — open it in Safari,
tap Share → Add to Home Screen for a full-screen app-like preview. (No offline
service worker or native haptics in the web preview; those are iOS-only.)

### 1. Ship a new TestFlight build — from your phone, no Mac 🎉
The repo has a **TestFlight** GitHub Action that builds + signs + uploads on a
cloud macOS runner. One-time: add 4 repository secrets (all creatable in a phone
browser), then run it from the Actions tab whenever you want to ship.

**Create an App Store Connect API key** (appstoreconnect.apple.com → Users and
Access → Integrations → App Store Connect API → **＋**, role **Admin**). Download
the `AuthKey_XXXX.p8`. Note the **Key ID** and **Issuer ID** on that page.

**Add secrets** (GitHub → repo → Settings → Secrets and variables → Actions → New):
| Secret | Value |
| --- | --- |
| `ASC_KEY_ID` | the Key ID (e.g. `2X9R4HXF34`) |
| `ASC_ISSUER_ID` | the Issuer ID (a UUID) |
| `ASC_KEY_CONTENT` | paste the whole `.p8` file text (begins `-----BEGIN PRIVATE KEY-----`) |
| `APPLE_TEAM_ID` | your 10-char Apple Developer Team ID (developer.apple.com → Membership) |

**Run it:** GitHub → **Actions** tab → **TestFlight** → **Run workflow** →
branch `claude/ourfamilywizard-analysis-J8t30`. ~15–20 min later the build shows
up in TestFlight (bundle id `com.steven.coparent`, app "Co-Parently").

> A **Play Store** workflow exists too — needs `ANDROID_KEYSTORE_BASE64` +
> `ANDROID_KEYSTORE_PASSWORD` (and optionally `GOOGLE_PLAY_JSON`). Same idea.

### 2. Stand up the backend — **[you]** create free accounts, send me keys
- **Supabase:** create a project → SQL editor → run `supabase/schema.sql` →
  Project Settings → API → send me the **Project URL** + **anon/public key**
  (publishable; safe to share). Then I wire real accounts + cross-device sync.
- **Anthropic:** create an API key for the conversational assistant. It's stored
  as a Supabase Edge Function secret, never shipped in the app.

### 3. Subscriptions — **[you]** create accounts; I wire the rest
- **App Store Connect + RevenueCat** (free): create the products
  `coparent_yearly` ($59.99) and `coparent_monthly` ($7.99), send me the
  RevenueCat public SDK key → I replace the demo entitlement with real IAP.

### 4. Siri (after the backend) — one-time in the native project
- Add `ios-app-intents/CoParentShortcuts.swift`, set the backend URL + auth
  bridge (see the file header).

## Notes
- **Bundle ID is `com.steven.coparent`** everywhere — matches the live App
  Store record. Don't let anything reintroduce `com.stevennelson.coparent`.
- The remote branch is the source of truth (this sandbox resets periodically).
- Internal storage keys are kept stable so saved data survives updates.
- Icon/asset generation needs `npm i -D sharp @capacitor/assets` on demand;
  they're intentionally not committed deps (native binaries don't install
  everywhere). CI fetches them via `npx`.
