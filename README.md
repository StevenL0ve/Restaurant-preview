# My Cellar 🍷

**Your wine collection, beautifully kept.**

Photograph a bottle, jot down what you love about it, and My Cellar logs it into
an elegant digital wine cellar. Mark a bottle as bought and it goes in your
**wine rack**; keep it as a wish and it rests in the **cellar**. Tell the app
you're heading to a restaurant, wine store, or winery and it recommends bottles
to try — drawn from the palate it learns from the wines you love, each with a
reason and a side-by-side comparison to a bottle you already enjoy.

This is a fast, installable PWA (React + TypeScript + Vite) that also packages as
a native iOS/Android app via Capacitor. Everything runs locally — your cellar
lives in the browser and can be exported as JSON anytime; you own your data.

## Features

- **Snap & log** — take a photo of a bottle (or pick from your library), add
  tasting notes, flavour tags, a taste profile, and a star rating in seconds.
- **What you love** — capture *why* you like a wine; that's what powers the
  recommendations.
- **The cellar** — an elegant, low-lit view of every bottle, racked by style
  (sparkling → white → rosé → red → dessert → fortified).
- **The wine rack** — the bottles you actually own, as a sortable inventory with
  a running cellar value. Wishlist bottles stay in the cellar until you buy them.
- **Outings** — pick a restaurant, wine store, or winery and get palate-matched
  recommendations, each scored and explained ("because you loved your Barolo").
- **Yours to keep** — local accounts (or a guest demo), one-tap JSON export, and
  no tracking.

## How the recommendations work

The app builds a **palate** from the wines you own and rate highly — averaging
their taste profile (body, sweetness, tannin, acidity), favourite styles, and
flavour tags, weighted toward the bottles you love most. Candidate wines are
scored 0–100 against that palate and tilted by venue (a restaurant leans into
safe matches; a winery reserves a couple of discovery picks). See
`src/lib/taste.ts` and `src/lib/recommend.ts`.

## Run it

```bash
npm install
npm run dev        # start the dev server
npm run build      # type-check + production build
npm test           # run the unit tests (palate + recommendation engine)
npm run icons      # regenerate app icons from the brand mark
```

### Native shells (optional)

```bash
npm run cap:add:ios      # add the iOS project
npm run cap:add:android  # add the Android project
npm run cap:sync         # build the web app and sync into the native shells
```

## Project layout

```
src/
  pages/        Cellar, Rack, AddWine, WineDetail, Outings, Settings, Login
  components/   BottleCard, TasteBars, StarRating, BottomNav, TopBar, Logo
  lib/          taste (palate engine), recommend, catalog, wine (presentation)
  state/        store (wines + outings), auth, seed (demo cellar)
  types.ts      domain model
```

## Status

Preview build. Data is stored locally in the browser; a hosted backend (sync
across devices, sharing) is the natural next step and the auth/store layers are
written to swap in cleanly.
