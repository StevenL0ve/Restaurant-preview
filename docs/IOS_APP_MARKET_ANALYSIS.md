# iOS App Store Opportunity Analysis

**Goal:** Find apps making significant monthly revenue ($20k+/mo) despite being poorly built, user-hostile, ugly, or overpriced — then rank them by how fast a small team could ship a better competitor and start collecting recurring (subscription) revenue.

**Date:** June 2026
**Method:** 5 parallel research passes (utilities, identifier apps, health/lifestyle, fleeceware teardowns, AI-wrapper apps) using Sensor Tower / Appfigures public estimates, press coverage, founder revenue claims, and App Store review evidence (via JustUseApp/Trustpilot mirrors — Apple's review RSS feed was blocked from this environment, so quotes are from indexed mirrors of the same reviews).

**Confidence caveats:**
- Sensor Tower / Appfigures figures are *modeled estimates*, not publisher-confirmed. Figures marked ✅ trace to a public Sensor Tower overview page or named press coverage; ⚠️ = stale or secondary.
- App Store ratings are inflated by review prompts; the real quality signal is the gap vs. Trustpilot (e.g., Gauth: 4.9 App Store vs 2.1 Trustpilot).

---

## TL;DR — Top 2 picks

**Pick #1: Coin Identifier & Value (beat CoinSnap, ~$1M/mo iOS)**
**Pick #2: Rock & Crystal Identifier (beat Rock Identifier, ~$300k/mo iOS)**

These two share ~80% of a codebase (camera → vision model → result card + collection + paywall), so pick #2 ships days after pick #1. Both incumbents come from the same Hong Kong app factory (Next Vision Ltd, affiliated with Glority — ~24 identifier apps, ~$3M/mo combined), and both are publicly failing at their core promise: professional numismatists call CoinSnap "not fit for purpose" and a geologist's viral TikTok is literally titled "ROCK IDENTIFIER APPS ARE SCAMS." Demand is App Store *search-driven* ("coin identifier", "rock identifier"), so you don't need a TikTok influencer budget to get first revenue — ASO + a genuinely better product + honest pricing against incumbents with 1-star billing-complaint walls.

---

## Prioritized list (fastest build → fastest recurring revenue first)

| # | Opportunity | Incumbent (App ID) | Est. revenue | MVP build | Why beatable |
|---|---|---|---|---|---|
| 1 | **Rock/crystal identifier** | Rock Identifier (1546796934) | ~$300k/mo iOS ✅ | **1–2 wks** | Incumbent misidentifies constantly; $4.99/wk + trial traps |
| 2 | **Coin identifier + value** | CoinSnap (1634551626) | ~$1M/mo iOS ✅ | **2–3 wks** | Experts call it "not fit for purpose"; valuation is wrong |
| 3 | **Photo cleaner / storage** | Cleaner Guru (1476380919) | ~$3–5M/mo ✅ | 2–3 wks | $7.99/wk; charged users 13 months w/o consent; deleted contacts |
| 4 | **Calorie photo scanner** | Cal AI (6480417616) | ~$1.4M/mo net ✅ | 1–2 wks | Pulled by Apple Apr 2026 for deceptive billing; 61.5% recent 1-star |
| 5 | **Universal TV remote** | TV Remote (1539090879) | ~$1M/mo ✅ | 2–4 wks | Wraps free/open protocols (Roku ECP etc.); paywall on every button |
| 6 | **QR scanner/generator** | QR Code Reader (1200318119), QR Air (1226650677) | $400–600k/mo each ✅ | **< 1 wk** | Pure fleeceware ($7.99/mo for what iOS does free) — but see caveat |
| 7 | **Habit/routine tracker** | Me+ (1596403446) | ~$400k/mo ✅ | 1–2 wks | Stealth subscription enrollment; tech = notifications + lists |
| 8 | **Invoice maker** | Invoice Maker Tofu (1314873764) | ~$900k/mo ✅ | 3–4 wks | $99 + $299 simultaneous charges; crashes; deleted invoices |
| 9 | **Plant identifier (budget tier)** | Plantum (1476047194) | ~$200k/mo ⚠️ declining | 1–2 wks | $6.99/wk; uploads fail; inconsistent results. (Do NOT fight PictureThis) |
| 10 | **Sleep sounds / white noise** | BetterSleep (314498713) | ~$600k/mo ✅ | 1–2 wks tech | Moved free sounds behind paywall — but moat is content catalog |
| 11 | **Screen mirroring** | TV Cast Air (1494564197) etc. | ~$100–200k/mo ⚠️ | 4–6 wks | "Doesn't work, charges $30" — but protocol edge cases eat dev time |

### Deliberately excluded
- **Mushroom identifier** (Picture Mushroom, ~$50k/mo): best app in a 2022 study was right only 49% of the time; documented poisonings/hospitalizations. Existential liability — avoid.
- **Baby monitor** (Annie, ~$30k/mo): hardest tech on the list (real-time A/V streaming with background reliability) for the smallest revenue.
- **PictureThis head-on** (~$5M/mo): its identification is actually *good*; the moat is a best-in-class classifier + care content. The 1-star wall is purely billing — not enough wedge for an indie.
- **Astrology (Nebula, ~$300k/mo)**: revenue depends on a human-psychic marketplace + web-subscription traps you shouldn't replicate.
- **GPT chat wrappers** (ChatOn ~$6.6M peak month, Genie ~$600k/mo): revenue is ASO arbitrage on "AI/ChatGPT" keywords against giant ad budgets; Apple is actively policing the category.

---

## Detailed cases for the top picks

### Pick #1 — Coin Identifier & Value (vs. CoinSnap)

**Incumbent:** CoinSnap, Next Vision Ltd. ~$1M/mo iOS + ~$400k/mo Android (Sensor Tower overview, Mar 2026). Free download → hard paywall → 7-day trial → ~$30–40/yr auto-renew.

**Evidence of weakness:**
- American Numismatic Association review: "identified more than a dozen quarters as 200th-anniversary $1 coins worth $12 apiece."
- Coin dealer review (Sterling & Currency): "a fantastic app that's not fit for purpose" — can't detect counterfeits, grading unreliable.
- Apple Communities thread titled "CoinSnap App is a Scam"; JustUseApp reviews: charged the yearly sub despite cancelling inside the trial window.

**Why it's fast to revenue:**
- The *reason people download it* (what is this coin worth?) is the thing it does worst. A clone using a frontier vision LLM for ID + real eBay-sold-listings comps for valuation directly attacks the core complaint.
- Demand is search-driven ASO ("coin identifier", "coin value scanner") — no influencer budget needed for first dollars.
- Category norms (hard paywall + trial + ~$30–40/yr) mean honest pricing at $19.99–29.99/yr still has ~99% gross margin (vision API ≈ $0.005–0.02/scan).

**MVP scope (2–3 weeks):** camera capture → vision-LLM ID (denomination/country/year/mint) → eBay sold-price range → collection tracker → paywall (3-day trial, annual + weekly). Hard part is valuation data plumbing, not ML.

### Pick #2 — Rock & Crystal Identifier (vs. Rock Identifier)

**Incumbent:** Rock Identifier, Next Vision Ltd. ~$300k/mo iOS + ~$100k/mo Android (Sensor Tower). $4.99/wk / ~$24.99–32.99/yr / $74.99 lifetime; premium users still rate-limited to ~2 IDs.

**Evidence of weakness:**
- ComplaintsBoard/JustUseApp: "couldn't identify any of my crystals correctly, from moldavite to common selenite"; sapphire ID'd as tanzanite; charged $29.99–32.99 despite cancelling the trial "the next day"; subscription invisible in the App Store subscriptions page.
- Geologist TikTok: "ROCK IDENTIFIER APPS ARE SCAMS."

**Why it's fast to revenue:**
- Rock ID is *intrinsically* ambiguous from photos — even geologists need hardness/streak tests. That's the wedge: an app that gives honest top-3 candidates with confidence levels and guides the user through a 30-second physical test ("scratch it with a key") will *feel* dramatically more trustworthy than the incumbent's confidently-wrong single answer.
- Shares the identifier engine, paywall, collection UI, and ASO playbook with Pick #1 — ships days later, and starts the same multi-app portfolio strategy the incumbent factory itself proved (24 apps, ~$3M/mo).

**MVP scope (1–2 weeks on top of Pick #1's codebase):** swap prompt/domain pack, add the guided-physical-test flow, crystal-collection gallery.

---

## Why not the others first (quick reasoning)

- **Photo cleaner (#3):** biggest revenue pool and zero API costs, but the category is won with paid UA at scale (Appfigures: "a multi-million-dollar industry no one's talking about") and Apple ships more of it natively each year. Strong second wave after the identifier portfolio funds an ad budget.
- **Cal AI clone (#4):** fastest tech build, but there are already dozens of ranked clones (CalApp, Calz, SnapCal), the niche leader just got acquired by MyFitnessPal, and revenue in this category is bought on TikTok (~$5 CPM creator seeding, 12-account farms) — speed-to-revenue depends on marketing budget, not build speed. Also: Apple removed Cal AI in April 2026 for deceptive billing, which signals enforcement risk across the whole quiz-paywall pattern.
- **TV remote (#5):** great economics (no per-use API cost, evergreen search demand), genuinely beatable UX — solid #3 candidate if you want a non-AI play.
- **QR (#6):** fastest possible build, but the honest version of this product is "a thing iOS already does free" — the incumbents' revenue *is* the dark pattern. Hard to monetize ethically; skip despite the tempting numbers.
- **Sleep/white-noise (#10):** trivial tech but the real moat is a licensed content catalog and brand trust.

---

## Category-level monetization data (RevenueCat State of Subscription Apps 2025/2026)

- Utilities have the **highest 12-month LTV per trial user ($68.90)**, the highest weekly-subscription revenue share (73.6%), and the best first-renewal retention (58.1%) of any category — i.e., exactly the identifier/utility pattern monetizes fastest.
- **Hard paywalls convert 10.7% trial-to-paid vs 2.1% freemium** and produce ~8x revenue-per-install at day 60 ($3.09 vs $0.38). For utility/photo apps, 3-day trials convert 10–15% better than longer ones.
- Weekly subscriptions now drive **55.5% of all iOS app revenue** (Adapty via TechCrunch, July 2025).
- Sobering base rate: only 17.3% of new subscription apps reach $1k MRR within 2 years; 4.6% reach $10k. Distribution (ASO + reviews), not build difficulty, is the moat.

## Strategic note: out-execute, don't out-fleece

Every incumbent above earns its 1-star wall from billing dark patterns (hidden trials, uncancellable subs, charges after deletion), and Apple is now enforcing — it pulled Cal AI (a ~$30M/yr app) in April 2026 for deceptive billing. The durable play is the incumbents' *pricing structure* (hard paywall, 3-day trial, annual + weekly tiers) **without** the deception: honest trial disclosure, one-tap cancel, generous-enough free taste to earn the review-score gap. The review pages of these apps are effectively a public roadmap of what to do differently.

---

## Appendix: full candidate data

### Utilities
| App | ID | Publisher | Est. revenue | Pricing | Top complaints |
|---|---|---|---|---|---|
| Cleaner Guru | 1476380919 | GM UniverseApps | ~$3–5M/mo US ✅ | $7.99/wk | Charged 13 mo w/o consent; dedupe deleted all contacts; $20 "cancellation fee" form |
| iScanner | 1040093707 | BP Mobile | ~$4M/mo ✅ | ~$4–5/wk (≈$208/yr) | Trial toggle ignored; free tier = 1 page; BBB ad-practices decision |
| TV Remote Universal | 1539090879 | — | ~$1M/mo ✅ | ~$5.99/mo+ | "Every button redirects to a subscription screen"; won't connect |
| QR Code Reader | 1200318119 | App Lock LLC | ~$400k/mo ✅ | $7.99/mo, 3-day trial | "Most scammy and sleazy app"; charges survive deletion |
| QR Code Reader Air | 1226650677 | Air Apps (~30-app bundle funnel) | ~$600k/mo ✅ | $4.99/wk | Accidental weekly subs; hidden cancel |
| Screen Mirroring TV Cast Air | 1494564197 | EVOLLY | ~$100k/mo ⚠️ (Jun 2024) | ~$30/yr | "Doesn't work, charges $30"; JustUseApp safety 0/100 |
| Invoice Maker Tofu | 1314873764 | GetPaid Inc | ~$900k/mo ✅ | $5.99/wk–$299 | $99+$299 double charge after cancel; crashes; data loss |

### Identifiers (Next Vision / Glority factory ≈ $3M/mo across ~24 apps)
| App | ID | Est. revenue | Pricing | Top complaints |
|---|---|---|---|---|
| PictureThis (plants) | 1252497129 | ~$5M/mo iOS US ✅ | ~$29.99/yr, 7-day trial | Dark-pattern trial → annual; ID quality actually good |
| CoinSnap | 1634551626 | ~$1M/mo iOS ✅ | ~$30–40/yr | Wrong IDs/values; "not fit for purpose" (dealer review) |
| Rock Identifier | 1546796934 | ~$300k/mo iOS ✅ | $4.99/wk; $74.99 lifetime | Misidentifies common crystals; charged after cancel |
| Plantum (AIBY) | 1476047194 | ~$200k/mo ⚠️ declining | $6.99/wk, 3-day trial | $42.79 surprise charges; uploads fail |
| PlantIn | 1527399597 | ~$800k/mo ✅ | sub | (#2 plant app — competitive but crowded) |
| Picture Insect | 1461694973 | ~$70k/mo ✅ | ~$29.99/yr | Same photo → two different wrong species |
| Picture Mushroom | 1474578078 | ~$50k/mo ✅ | sub | 49% accuracy (2022 study); poisoning liability — AVOID |

### Health / lifestyle / AI
| App | ID | Est. revenue | Pricing | Top complaints |
|---|---|---|---|---|
| Cal AI | 6480417616 | ~$1.4M/mo net ✅ (sold to MyFitnessPal) | ~$29.99/yr after quiz | Pulled by Apple Apr 2026; trial-to-annual trap; inaccurate counts |
| ShutEye | 1490078804 | ~$700k/mo ✅ | $59.99/yr, 7-day trial | Charged during trial; fake "excellent sleep" scores; data loss |
| BetterSleep | 314498713 | ~$600k/mo ✅ | $59.99/yr; $249.99 lifetime | Paywalled formerly-free sounds; unauthorized charges |
| Gauth (ByteDance) | 1542571008 | ~$1M/mo ✅ | ~$11.99/mo | "Cancel always errors" — one user charged 27 months ($323) |
| RIZZ | 1663430725 | ~$500k/mo ⚠️ founder-claim | $6.99/wk | Charged after cancel; free tier throttled to uselessness |
| Genie (AppNation) | 1658377526 | ~$600k/mo ✅ | $12.99/wk | Weekly-sub surprise billing |
| Me+ Routine | 1596403446 | ~$400k/mo ✅ | $39.99/yr | "No way to check if it enrolled me in a subscription" |
| Nebula | 1459969523 | ~$300k/mo ✅ | $5 trial → $49.99 charges | Web-sub can't be cancelled in-app; charges after cancel |
| Fastic | 1459260306 | ~$200k/mo ✅ | quiz funnel; €99.99 "challenge" penalty | Uncancellable subs; unresponsive support |
| Umax | 6471026798 | ~$350–500k/mo ⚠️ founder-claim, collapsed post-marketing | $4.99/wk or refer 3 friends | Pay-to-see-results gate; crashes; no support |

**Key sources:** Sensor Tower public overview pages (per-app links in research notes), Appfigures insights (QR category: 63 apps > $4M net/30 days; storage cleaners; subscription share 45.4%), RevenueCat State of Subscription Apps 2025/2026, TechCrunch (Cal AI, weekly-subs report), CNBC (Cal AI), Fortune (Umax), Avast/Sophos fleeceware research ($400M+ across 204 apps), ANA Reading Room, Sterling & Currency, Public Citizen (mushroom-app study), Kosta Eleftheriou exposés (AmpMe), Johnny Lin ($80k/mo App Store scam teardown).
