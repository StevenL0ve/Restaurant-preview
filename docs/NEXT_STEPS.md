# CoParent — What's done & what needs you

A running checklist so we can pick up fast. Items marked **[you]** need an
account, a key, or the Mac — everything else is already built and on the branch.

## ✅ Built & on `claude/ourfamilywizard-analysis-J8t30`
- Full app: dashboard, messages + on-device tone check, calendar + custody
  rotations + `.ics`, expenses + splits + recurring, journal, **info bank
  (editable)**, notifications, global search, JSON/CSV/print exports
- **On-device AI assistant** ("Ask CoParent") — schedule, info, events, messages, packing
- **Packing / exchange checklist** ("never forget the teddy bear")
- **Login / create-account** gate + Face ID affordance
- Real **logo**, custom **bottom-nav icons**, indigo branding, dark mode, mobile layout
- **Paywall** ($59.99/yr · $7.99/mo per family) + Pro entitlement scaffold
- Phase-2 **backend scaffolding**: Supabase schema, Claude edge function, cloud config
- Siri **App Intents** scaffold

## 🔜 Quick wins waiting on you

### 1. Ship the latest to TestFlight (5 min, on the Mac)
```bash
cd ~/CoParent && git pull && npm install && npm run build
npx capacitor-assets generate --ios && npx cap sync ios
```
Then in Xcode: bump **Build** number → **Product → Archive** → **Distribute → TestFlight**.

### 2. Stand up the backend — **[you]** create free accounts, send me keys
- **Supabase:** create a project → SQL editor → paste & run `supabase/schema.sql`
  → Project Settings → API → send me the **Project URL** + **anon/public key**
  (publishable; safe to share). Then I wire real accounts + cross-device sync.
- **Anthropic:** create an API key for the conversational assistant. It goes in
  Supabase as a secret (`supabase secrets set ANTHROPIC_API_KEY=…`), never in the app.

### 3. Subscriptions — **[you]** create accounts; I wire the rest
- **RevenueCat** (free tier) + **App Store Connect**: create the products
  `coparent_yearly` ($59.99) and `coparent_monthly` ($7.99). Send me the
  RevenueCat public SDK key. I'll replace the demo entitlement with real IAP.

### 4. Siri (after the backend) — **[you]** in Xcode
- Add `ios-app-intents/CoParentShortcuts.swift` to the App target, set the
  backend URL + auth token bridge (see the file header).

## Notes
- The remote branch is the source of truth (this sandbox resets periodically).
- Internal storage keys are kept stable so saved data survives updates.
