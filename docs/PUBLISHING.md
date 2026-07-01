# Publishing ORSync to the App Store & Google Play

ORSync is a Vite + React web app wrapped natively with **Capacitor**. The web
build in `dist/` is bundled into native iOS/Android shells. For the **beta**
(TestFlight) flow, see [`TESTFLIGHT.md`](TESTFLIGHT.md) — that's the fast path to
trying it on your phone. This doc covers full **store releases**.

## Prerequisites

- **Apple:** Apple Developer Program membership; a Mac with Xcode *or* the cloud
  workflow in `.github/workflows/ios-testflight.yml`.
- **Google:** Google Play Console account; Android Studio or `fastlane supply`.
- Node 18+ and `npm ci` for the web build.

## Icons & splash

Brand art is generated from a single vector definition — no external image file:

```bash
npm run icons        # writes public/icons/*, public/brand/*, assets/*
```

After `npx cap add ios` / `android`, populate the native catalogs:

```bash
npx capacitor-assets generate
```

## iOS — App Store

1. Ship a build to TestFlight (see `TESTFLIGHT.md`).
2. In App Store Connect, create the **1.0** version, attach the build, paste the
   listing copy from [`STORE_LISTING.md`](STORE_LISTING.md), upload screenshots,
   set the **Medical** category and age rating, and link your published
   [privacy policy](PRIVACY.md).
3. Submit for review.

### Screenshots
**Ready-made marketing frames live in [`docs/store/`](store/)** — five composed
1290×2796 images (the required 6.7" size) with captions: hero, setup pull-list,
cards library, loaner tracking, and dark mode. Drag them straight into App Store
Connect. To regenerate after UI changes:

```bash
npm run preview          # in one shell
npm run screenshots      # raw app captures → docs/screenshots/
npm run store-shots      # composed store frames → docs/store/
```

(Apple also accepts these for the 6.1" slot, or re-capture on a simulator.)

## Android — Google Play

```bash
npm run build
npx cap add android
npx cap sync android
```

Build a signed **AAB** in Android Studio (Build → Generate Signed Bundle) or via
`fastlane supply`. Create the app in Play Console, complete the Data safety form
(declare: **no data collected/shared** — everything is on-device), add the
listing copy and screenshots, and roll out to **Internal testing** first, then
production.

## Notes & honest limitations

This is a polished **single-device** app: your library lives on your phone and
is yours to export. A future version could add optional encrypted cloud backup
and multi-device sync — the state is plain serializable data and the optional
account is already structured to swap a hosted backend in behind it without UI
changes. The product decision — that your cards are *yours*, with no approvals —
is deliberate, and it's the direct answer to what the old app's reviewers asked
for.
