# Corktown Wine &amp; Spirits — Website

A redesigned marketing website for **Corktown Wine &amp; Spirits**, a newly
opened, hand-curated wine and spirits shop in downtown **Ocean Springs,
Mississippi** (401 Porter Ave, Building A, Unit 3).

This is a fast, fully responsive, single-page site built as a pitch-ready
replacement for the current corktownwine.com — designed to look premium on
the first scroll and convert browsers into walk-ins.

> **Preview it:** open `index.html` in any browser — no build step, no
> dependencies, no server. Everything is plain HTML/CSS/JS.

---

## Why it's better than the current page

- **Distinct, on-brand identity.** Carries the business card's black-and-silver
  wordmark into a warmer charcoal + champagne-gold palette with an elegant serif
  display face, so the shop reads as boutique rather than big-box.
- **A real story, not a placeholder.** Owner-led "neighborhood cellar" narrative
  (Sean Perkins, curator) that gives the shop a personality and a reason to visit.
- **Clear merchandising.** Selection is broken into the four pillars a shopper
  actually searches for — Wine, Bourbon/Whiskey, Agave/Craft Spirits, and
  Champagne/Sparkling.
- **Conversion built in.** Sticky nav, repeated "Visit / Call / Directions"
  CTAs, click-to-call phone numbers, click-to-email, and an embedded Google Map.
- **Found on search & social.** SEO meta tags, Open Graph preview, and
  `LiquorStore` schema.org structured data (address, hours, phone) so Google can
  surface the shop in local results.
- **Tastings section** to drive recurring foot traffic and an events calendar hook.
- **Accessible & polished:** keyboard-friendly, reduced-motion support, semantic
  HTML, lazy-loaded imagery, and graceful mobile menu.

## Structure

```
index.html              # the page
assets/
  css/styles.css        # all styling (design tokens at the top)
  js/main.js            # nav, mobile menu, scroll reveal, footer year
  img/logo.svg          # recreated wordmark (wine-glass "C")
  img/favicon.svg       # browser tab icon
```

## Brand facts wired in (from the business card)

| | |
|---|---|
| Business | Corktown Wine &amp; Spirits |
| Owner | Sean Perkins |
| Address | 401 Porter Ave, Building A, Unit 3, Ocean Springs, MS 39564 |
| Phone | (228) 244-0004 &nbsp;·&nbsp; (228) 300-1423 |
| Email | sean@corktownwine.com |
| Instagram | [@corktownwineos](https://www.instagram.com/corktownwineos) |

## ⚠️ Placeholders to confirm before going live

These were reasonable assumptions for the demo — swap them for real details:

1. **Hours** (currently Mon–Thu 10–8, Fri–Sat 10–9, Sun closed) — confirm actual
   hours; update both the Visit section and the schema.org block.
2. **Photography** — the hero, shelf, and tasting images are tasteful stock
   placeholders loaded from Unsplash. Replace with real interior/product photos
   for the final site (drop them in `assets/img/` and update the paths).
3. **Tastings schedule** — "Friday flights / monthly spotlights" is a suggested
   program; adjust to whatever Corktown actually runs.
4. **Selection copy** — confirm the categories and example regions match the
   real inventory.

## Deploy

Static hosting, anywhere: GitHub Pages, Netlify, Vercel, or any web host —
just upload the folder. No build required.
