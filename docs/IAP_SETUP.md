# Individual Pro: App Store and Google Play subscriptions

ORSync sells individual Pro through Apple and Google (their rules require it
for subscriptions sold inside the app). Facility accounts and vendor rep
links are sold directly: the app shows "Contact us for facility pricing",
which emails bkborngaraised@gmail.com, and you invoice through Stripe.

RevenueCat (free up to $2,500/month in revenue) connects both stores to one
"pro" entitlement. The app logs in to RevenueCat with the person's ORSync
account id, so a subscription follows them to any phone they sign in on.
The code is in `src/lib/iap.ts`; the Plans page is `src/pages/Paywall.tsx`.

## 1. App Store Connect (about 15 minutes)

1. **Agreements, Tax, and Banking**: accept the Paid Apps agreement and add
   bank and tax info. Apple won't sell subscriptions until this is done.
   Enroll in the App Store Small Business Program (15% instead of 30%).
2. ORSync → **Subscriptions** → create a subscription group named
   `ORSync Pro`, then two subscriptions in it:
   - Product ID `orsync_pro_monthly`, duration 1 month, price $4.99
   - Product ID `orsync_pro_annual`, duration 1 year, price $39.99
   For each: a display name ("ORSync Pro Monthly"), a short description
   ("Your preference cards backed up and synced on every device"), and a
   review screenshot (the Plans screen works).
3. On the 1.0 version page, under **In-App Purchases and Subscriptions**,
   add both so they're reviewed with the app.
4. **Users and Access → Integrations → In-App Purchase**: generate an
   In-App Purchase key (.p8) for RevenueCat.

## 2. Google Play Console

1. **Monetize → Subscriptions**: create `orsync_pro_monthly` ($4.99,
   monthly base plan) and `orsync_pro_annual` ($39.99, yearly base plan).
   Play only lets you create subscriptions after an app bundle with the
   billing library has been uploaded; any build from the Android workflow
   from now on has it.
2. **Setup → API access**: link a Google Cloud service account with
   "View financial data" and "Manage orders and subscriptions" so
   RevenueCat can check purchases.

## 3. RevenueCat

1. Create a project named ORSync at app.revenuecat.com.
2. Add an **App Store app** (bundle id `com.stevennelson.orsync`, upload the
   In-App Purchase key from step 1.4) and a **Play Store app** (package
   `com.stevennelson.orsync`, upload the service account JSON).
3. **Entitlements**: create `pro` and attach all four products.
4. **Offerings**: in the `default` offering, add a Monthly package
   (`orsync_pro_monthly` on both stores) and an Annual package
   (`orsync_pro_annual`).
5. **Project settings → API keys**: copy the two public SDK keys
   (`appl_...` and `goog_...`) and send them to Claude. They go into
   `REVENUECAT_IOS_KEY` and `REVENUECAT_ANDROID_KEY` in `src/lib/iap.ts`;
   until then the Plans page says "Pro subscriptions are coming soon".

## What the app does

- Plans shows the store's own localized prices, a Subscribe button, Restore
  purchases, Manage subscription (after buying), and the auto-renewal terms
  with Terms of Use and Privacy Policy links that Apple requires.
- Buying Pro turns on the person's personal cloud library (synced across
  every device they sign in to). The entitlement is refreshed at launch.
- On the web, Plans tells people to subscribe in the iPhone or Android app.

## Known limit to close later

The Pro flag is checked on the phone through RevenueCat. Recognizing a
phone purchase on the web, and enforcing Pro server-side, needs
RevenueCat's webhook writing the entitlement to Firestore (a Cloud
Function, which needs the Firebase Blaze plan).
