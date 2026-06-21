# Corktown Wine &amp; Spirits — Website

A redesigned marketing website for **Corktown Wine &amp; Spirits** — *"Unique
Wine &amp; Spirits"* — a newly opened, hand-curated wine and spirits shop in
downtown **Ocean Springs, Mississippi** (401 Porter Ave, Building A, Unit 3,
opened June 2026).

Fast, fully responsive, playful + animated, and **fully self-contained** — every
image and the video are served locally, so nothing depends on a third-party
host. No build step, no dependencies.

> **Preview:** open `index.html` in a browser. (Deploy by uploading the folder
> to any static host — GitHub Pages, Netlify, Vercel, etc.)

---

## Highlights

- **Real wine imagery, self-hosted.** The hero, about, and tastings photos are
  frames pulled from the shop's own pour video; the cinematic **"The Pour"** band
  plays the full clip. Everything is local — no broken images, ever.
- **Animated experience** — kinetic headline with a rotating word
  (wine → bourbon → agave → champagne → mezcal), a scrolling marquee, a top
  scroll-progress bar, reveal-on-scroll, and animated stat counters. All motion
  respects `prefers-reduced-motion`.
- **Real content** — "Unique Wine & Spirits", June 2026 opening, owner Sean
  Perkins, and links to all four socials (Instagram, Facebook, X, TikTok).
- **Conversion** — sticky nav, repeated CTAs, click-to-call/text/email, an
  "Open in Google Maps" location card, and an Instagram follow band.
- **Found on search** — SEO + Open Graph + `LiquorStore` schema.org data.
- **Verified** — rendered and checked at desktop (1280px) and mobile (390px)
  widths before hand-off.

## Structure

```
index.html
assets/
  css/styles.css        # all styling (design tokens at top)
  js/main.js            # nav, kinetic text, counters, scroll progress, reveal
  img/  logo.svg, favicon.svg, pour-hero.jpg, pour-about.jpg, pour-tasting.jpg
  video/pour.mp4        # the cinematic "The Pour" clip
```

## Brand facts wired in

| | |
|---|---|
| Business | Corktown Wine &amp; Spirits — *Unique Wine &amp; Spirits* |
| Owner | Sean Perkins |
| Opened | June 19, 2026 |
| Address | 401 Porter Ave, Building A, Unit 3, Ocean Springs, MS 39564 |
| Phone | (228) 300-1423 &nbsp;·&nbsp; (228) 244-0004 |
| Email | sean@corktownwine.com |
| Social | [Instagram @corktownwineos](https://www.instagram.com/corktownwineos), Facebook, X, TikTok |

## ⚠️ Placeholders to confirm before going live

1. **Hours** — set to Mon–Thu 10–8, Fri–Sat 10–9, Sun closed; confirm actual
   hours (update the Visit section *and* the schema.org block).
2. **Photography** — the page uses frames from the pour video plus that clip. The
   shop's Instagram has great interior/product shots — drop them into
   `assets/img/` to add variety.
3. **Stats &amp; tastings** — "400+ labels", "Friday flights", etc. are
   suggested; confirm the real numbers and program.
4. **Social links** — Facebook / X / TikTok point to the shop's TikTok and the
   platform homepages; replace with the real profile URLs.
