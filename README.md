# CoParently

A modern, fast, **free** co-parenting app — built as a better answer to
[OurFamilyWizard](https://apps.apple.com/us/app/ourfamilywizard-co-parent-app/id497405393).

Separated and divorced parents use apps like these to coordinate custody,
messages, expenses, and records — often under court order. The category leader,
OurFamilyWizard, sits at **1.5★ on Sitejabber** and **2.1★ on Google**. This
project reads those reviews and fixes the specific things people complain about.

> **Try it:** `npm install && npm run dev`. The app opens pre-loaded with a
> realistic demo family so there are no empty screens. Everything is stored
> locally in your browser — no account, no sign-up, no server.

---

## What reviewers hate about OurFamilyWizard — and what CoParently does instead

| Real complaint about OFW | CoParently's fix |
| --- | --- |
| **"$100+/yr per parent for a 3rd-rate text service."** Auto-renews; charged after they stop using it. | **Free.** No subscription, no per-parent fee, no renewal trap. (`Settings`) |
| **"Clunky, outdated, cumbersome interface."** | Clean, fast single-page UI; color-coded calendar; keyboard-friendly composer. |
| **"Failed message notifications"** — missed messages led to police/lawyer involvement. | Clear **Delivered / Read** receipts on every message and live unread badges. |
| **"Can't save drafts."** | Drafts **auto-save** as you type and reload when you come back. |
| **"Calendar/journal/expense sections are woeful, isolated, cumbersome."** | Tightly integrated: dashboard rolls up unread, schedule requests, and the live expense balance. |
| **"Wish it synced with my phone's calendar."** | One-tap **`.ics` export** that imports into Apple/Google/Outlook calendars. |
| **"Search hardly works."** | One global search across **messages, calendar, expenses, journal, and the Info Bank**, ranked by recency. |
| **"Can't delete my own account — needs co-parent approval."** | **One-click self-service delete.** No approval, no support call. |
| **"They won't give me my data / won't delete it."** | **Export everything to JSON** anytime — your records, your attorney's records. |
| ToneMeter (calmer-wording AI) is a **paid** add-on. | Built-in **tone check is free** and runs **on-device** — it flags heated messages *before* they send and suggests calmer wording. |

## Features

- **Dashboard** — at-a-glance unread count, pending schedule requests, running expense balance, what's next on the calendar.
- **Messages** — immutable, timestamped record (a clean log if it's ever needed in court); free on-device **tone check** with calmer-wording suggestions; auto-saved drafts; per-thread search; read receipts.
- **Calendar** — month view, color-coded categories, parenting-time blocks, **swap/change requests** with accept/decline, and `.ics` export to your phone.
- **Expenses** — log a cost, split it any ratio, attach a receipt, request reimbursement, and track a **running balance** both parents can trust.
- **Journal** — private, timestamped, mood-tagged log; nothing is shared unless you export it.
- **Info Bank** — each child's medical, school, and sizing details in one shared place.
- **Settings** — transparent pricing, full data export, and one-click account deletion.

## The on-device tone checker

`src/lib/tone.ts` scores a draft 0–100 using loaded-language detection, demand
phrasing, all-caps/"shouting" detection, and softener rewards — then offers a
conservative rewrite (e.g. `"you need to"` → `"could we"`, de-shouting, trimming
loaded words). It's deliberately a nudge, not a rewrite of your meaning, and it
runs entirely in the browser so nothing is sent anywhere. A heated message
forces one pass through the suggestion before it can send.

## Tech & structure

Vite + React + TypeScript, no backend. State lives in a small store
(`src/state/store.tsx`) persisted to `localStorage`.

```
src/
  lib/        tone (analyzer + tests), ics export, global search, formatters
  state/      store + seeded demo data
  pages/      Dashboard, Messages, Calendar, Expenses, Journal, InfoBank, Search, Settings
  components/ Sidebar, TopBar (global search)
```

## Commands

```bash
npm install
npm run dev      # local dev server
npm run build    # type-check + production build
npm run test     # unit tests (tone engine) + render smoke tests
```

## Notes & honest limitations

This is a working **single-device demo**. A production release would add a
real-time backend so both parents sync, server-side push notifications, audit
trails, and encrypted storage. The architecture (plain serializable state,
typed domain model) is built to drop a backend in behind. The product
decisions — pricing, data ownership, tone-by-default, integrated modules — are
the point, and they directly answer what OurFamilyWizard's reviewers asked for.
