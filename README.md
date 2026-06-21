# Corktown Wine &amp; Spirits — Website

A redesigned marketing website for **Corktown Wine &amp; Spirits** — *"Unique
Wine &amp; Spirits"* — a newly opened, hand-curated wine and spirits shop in
downtown **Ocean Springs, Mississippi** (401 Porter Ave, Building A, Unit 3,
opened June 2026).

A fast, fully responsive, **playful + animated** single-page site built as a
pitch-ready replacement for the current corktownwine.com.

> **Preview it:** open `index.html` in any browser — no build step, no
> dependencies, no server. Plain HTML/CSS/JS.

---

## The animated experience (what was requested)

This build leans into motion, per the reference direction:

- **🎬 Video hero background.** A full-screen looping `<video>` sits behind the
  headline. Until the shop's own footage is added it gracefully falls back to an
  animated "Ken Burns" photo poster — so it always looks alive and never breaks.
  *(See "Add the hero video" below.)*
- **✍️ Kinetic / animated text.** The headline rises in line-by-line, and the
  word **wine → bourbon → agave → champagne → mezcal** cycles in place. A
  scrolling marquee ribbon runs beneath the hero.
- **🖱️ Interactive gallery.** A drag-/swipe-/scroll-able horizontal strip of the
  shop and bottles (click-drag, touch, or trackpad — with scroll-snap).
- **📜 Scroll animations.** A top scroll-progress bar, reveal-on-scroll for every
  section, a subtle image parallax, and animated stat counters.

All motion respects `prefers-reduced-motion` for accessibility.

## Why it beats the current page

The current site is a single line of "we're almost finished building the shop"
text. This gives Corktown a real identity, story, merchandising, and contact
funnel — and looks like a destination, not a placeholder.

- **On-brand identity** — the wine-glass "C" wordmark recreated as inline SVG, in
  a warm charcoal + lively gold palette with a wine-berry accent.
- **Clear merchandising** — Wine, Bourbon/Whiskey, Agave/Craft, Champagne.
- **Conversion built in** — sticky nav, repeated CTAs, click-to-call/text/email,
  embedded Google Map, and all four socials (Instagram, Facebook, X, TikTok).
- **Found on search &amp; social** — SEO + Open Graph + `LiquorStore` schema.org
  structured data (address, hours, phone, opening date).

## Structure

```
index.html              # the page
assets/
  css/styles.css        # all styling (design tokens at top)
  js/main.js            # nav, kinetic text, gallery drag, counters, parallax
  img/logo.svg          # recreated wordmark (wine-glass "C")
  img/favicon.svg       # tab icon
  video/                # drop hero.mp4 here (see its README)
```

## Add the hero video

1. Export a short (~8–15s), silent, looping clip of the shop / a pour.
2. Save it as `assets/video/hero.mp4` (1080p, H.264, ideally < 6 MB).
3. Done — it's already wired into the hero `<video>` and starts playing.

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

1. **Hero video** — currently the animated photo fallback; add real footage.
2. **Hours** — set to Mon–Thu 10–8, Fri–Sat 10–9, Sun closed; confirm actual
   hours (update the Visit section *and* the schema.org block).
3. **Photography** — hero, about, and gallery images are tasteful Unsplash stock.
   Swap in real shop/product photos (the IG already has great ones).
4. **Stats &amp; tastings** — "400+ labels", "Friday flights", etc. are suggested;
   confirm real numbers and program.
5. **Social links** — Facebook / X / TikTok point to the platform homepages;
   replace with the shop's actual profile URLs.

## Deploy

Static hosting anywhere — GitHub Pages, Netlify, Vercel, or any web host. Upload
the folder; no build required.
