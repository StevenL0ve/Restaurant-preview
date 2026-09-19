# Publishing CoParent to the App Store & Google Play

This is the end-to-end runbook. Steps marked **[you]** require accounts, a Mac,
or store dashboards that only you can operate — I can't do those from here.
Everything else is already wired up in this repo.

CoParent ships as a web app wrapped with **Capacitor**, which produces real
native iOS and Android projects from the `dist` web build.

> **Just want a beta on your phone first?** See [`docs/TESTFLIGHT.md`](TESTFLIGHT.md)
> for the fastest path to TestFlight (iOS) and Play internal testing (Android).

---

## 0. One-time prerequisites **[you]**

- **Apple:** an [Apple Developer Program](https://developer.apple.com/programs/)
  membership ($99/yr) and a **Mac with Xcode** (required to build & sign iOS apps).
- **Google:** a [Google Play Console](https://play.google.com/console/) account
  ($25 one-time) and **Android Studio** (any OS).
- **Hosting** for the privacy policy URL (`docs/PRIVACY.md`).

## 1. Build the web bundle  ✅ automated

```bash
npm install
npm run icons      # regenerate app icons (already committed)
npm run build      # type-checks + outputs dist/ (PWA: manifest + service worker)
```

## 2. Create the native projects  (one-time)

```bash
npm run cap:add:ios       # [you, on a Mac] generates ios/  (runs CocoaPods)
npm run cap:add:android   # generates android/  (works on any OS)
```

`capacitor.config.ts` is already set: appId `com.steven.coparent`, appName `CoParent`,
webDir `dist`. After any web change, re-sync:

```bash
npm run cap:sync          # = npm run build && cap sync
```

> App icons & splash: install `@capacitor/assets` and run
> `npx capacitor-assets generate` with `public/icons/icon-512.png` (regenerate at
> 1024px first) to populate every native icon/splash size.

## 3. Android → Google Play

1. `npx cap open android` → opens Android Studio.
2. **[you]** Set the version, then **Build → Generate Signed Bundle / APK → Android App Bundle (.aab)**. Create/keep an **upload keystore** (back it up — losing it blocks future updates).
3. **[you]** In Play Console: create the app, complete the **Data safety** form
   (this app: data stored on-device, not shared — see `docs/PRIVACY.md`), content
   rating, store listing (`docs/STORE_LISTING.md`), screenshots, privacy URL.
4. **[you]** Upload the `.aab` to **Internal testing** first, then promote to Production. Google review is typically hours–days.

## 4. iOS → App Store  **[you — requires a Mac]**

1. `npx cap open ios` → opens Xcode.
2. Set the **Signing Team** (your Apple Developer account); Xcode manages
   provisioning. Set version & build number.
3. **Product → Archive**, then **Distribute App → App Store Connect**.
4. In [App Store Connect](https://appstoreconnect.apple.com/): create the app
   record (bundle id `com.steven.coparent`), fill the listing (`docs/STORE_LISTING.md`),
   **App Privacy** answers (data not collected / stored on device — see `docs/PRIVACY.md`),
   screenshots, and submit for review (typically 1–3 days).

## 5. Pre-submission checklist

- [ ] Real contact email + support URL in store listings and `docs/PRIVACY.md`
- [ ] Privacy policy hosted at a public URL
- [ ] Screenshots captured for required device sizes
- [ ] App icon at 1024×1024 (Apple) and feature graphic 1024×500 (Play)
- [ ] Version/build numbers bumped
- [ ] Tested on a real device via `cap run ios` / `cap run android`

---

### What's already done in this repo
Installable PWA (manifest + offline service worker), generated app icons,
Capacitor config + scripts, privacy policy, and store listing copy.

### What only you can do
Apple/Google account enrollment, building/signing on the appropriate toolchain,
filling the store dashboards, and submitting for review. There is no way for me
to perform account-bound or signing steps from this environment.
