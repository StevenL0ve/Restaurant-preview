# Publishing ORSync to the App Store & Google Play

ORSync is a Vite + React web app wrapped natively with **Capacitor**. The web
build in `dist/` is bundled into native iOS/Android shells. For the **beta**
(TestFlight) flow, see [`TESTFLIGHT.md`](TESTFLIGHT.md) — that's the fast path to
trying it on your phone. This doc covers full **store releases**.

## Prerequisites

- **Apple:** Apple Developer Program membership; a Mac with Xcode *or* the cloud
  workflow in `.github/workflows/testflight.yml`.
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

The **Android** workflow (`.github/workflows/android.yml`) builds a signed AAB
and APK on a Linux runner and, with a Play service account secret, uploads
to Internal testing. Step by step, including the one-time keystore and
Data safety answers: [`STORE_RELEASE.md`](STORE_RELEASE.md).

## Where the data lives

Signed-in accounts sync to ORSync Cloud (Firebase); facilities share one
library per hospital OR, gated by membership (see `firestore.rules` and
`docs/cloud-setup.md`). Guests stay on-device. The release checklist for
both stores is [`STORE_RELEASE.md`](STORE_RELEASE.md).
