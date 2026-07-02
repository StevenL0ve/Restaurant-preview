# CGP — The Common Ground Projects

One app for everything under the Common Ground roof:

- 🍽️ **By the Fig & the Olive** (restaurant) — Mediterranean lunch: mezze, flatbreads, shawarma & kabobs
- ☕️ **Common Grounds Café** — order coffee, earn a **punch card** stamp on
  every drink (10 punches = a free drink), and add the card to
  **Apple Wallet / Google Wallet**
- 🧘 **The Studio** (yoga) — see the class schedule and book a spot
- 🌿 **The Zen Den** (wellness spa) — book saunas, soaks, facials & contrast therapy
- 💆 **Massage** — book therapeutic and relaxation sessions

Plus **digital waivers**: yoga, Zen Den, and massage each require a one-time
signed liability waiver, collected in-app before the first booking (or from the
Waivers screen anytime).

## Feature notes

- **Ordering** — a shared cart across café + kitchen, pickup or dine-in,
  live order history with punch/reward accounting per order.
- **Punch card** — every café drink earns a punch; a full card converts to a
  free-drink reward automatically. Rewards are redeemed at checkout and apply
  to the priciest café drink in the cart (the free drink doesn't earn a punch).
- **Wallet passes** — the Rewards screen offers *Add to Apple Wallet* and
  *Save to Google Wallet*. Signed passes require a pass-signing service
  (Apple pass certificate / Google Wallet issuer keys live server-side); set
  `VITE_WALLET_ENDPOINT` to enable one-tap adding. Without it, the app
  downloads the pass payload instead of faking success.
- **Booking** — capacity-aware sessions; booking a waiver-required venue for
  the first time opens the waiver right in the flow.
- **Accounts** — local email/password accounts with optional Face ID unlock,
  structured to swap to a hosted backend without UI changes.

## Stack

React 18 + TypeScript + Vite. State in React context, persisted to
`localStorage`. Installable PWA (service worker + manifest) and Capacitor
config for native iOS/Android shells.

## Develop

```bash
npm install
npm run dev        # local dev server
npm test           # vitest unit + smoke tests
npm run build      # type-check + production build
npm run cap:sync   # rebuild + sync the native shells
```

## Brand

Real Common Ground assets throughout: the gooey white-on-sage logo
(`public/brand/logo.jpeg`, sage `#657e69`) drives the app icons, login,
sidebar, hero, and loyalty card; lifestyle photos live in `public/photos/`.
The café menu is the real printed drinks menu (Signature / Tea / Coffee /
Kids + Fur Babies, with syrup & alt-milk add-on notes). Display type is
Bagel Fat One (Google Fonts) as a stand-in for the hand-lettered brand
style. Light & dark themes.
