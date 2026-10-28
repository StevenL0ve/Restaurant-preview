# Next build (after 1.0.1)

Start once 1.0.1 is approved, in this order: 1) photo of the OR board fills
the day, 2) add items to a case (below), 3) phone notifications for
schedule changes and late additions, 4) scan a stack.

Agreed for the next version; not in 1.0.1 (build 127, in App Review).

## Scan a stack: import several preference cards at once
Today Scan/paste brings in one card at a time, and a PDF holding several
cards is read as ONE card (pages are joined). Plan, inside the Scan screen:

- "Scan a stack": several photos, or a PDF with many cards.
  - Each photo is one card.
  - In a PDF, a new card starts where a page opens with a new procedure or
    surgeon header, so a card that runs onto a second page stays whole.
- Review list before saving: procedure, surgeon and item count per card, a
  warning on any that read poorly; untick bad ones, tap one to fix it in
  the editor, then Save all.
- Flag cards that look like ones already in the library; point to
  Clean up items afterwards.
- Test against the QC'd scans (D&C, knee arthroscopy, appendectomy).

## Photo of the OR board fills the day (Keesler's Periop Tracking greaseboard)
Take a picture of the PowerChart "OR Greaseboard" screen and get the same
lineup a schedule upload or Add case makes, with questions where it isn't
sure. Lives in Upload schedule as "Take a photo of the board", reusing that
screen's review list (it already matches surgeons and cards and asks).

Reading the board (on-device OCR, like card scanning; the photo never leaves
the phone):
- Room bars "0073-MOR-01 (2 cases)" -> OR 1; "MOR-05" -> OR 5.
- Columns used: Start, Surgeon, Procedure(s), Stop/Dur, Circulator, Tech.
- Columns ignored on purpose: Patient Type, Pt Rm #, Case #, Comment(s)
  (case numbers and labs/H&P notes are patient-level; ORSync stores none).
- Procedure text wraps over 2-5 lines; joined until the next row's start time.

What it fills, and what it asks:
- Surgeon "PETERSON, J" -> John Peterson; ask when two match or none
  (offer "add new surgeon"). Store names in normal case, not ALL CAPS.
- Case name = the board's procedure text; card = best match (same matcher
  as Add case). Ask when no card fits or several do; allow ticking several
  to combine (the 4-procedure hip case).
- Team from partial names: Circulator "Lindsey" -> RN Lindsey Biss; Tech
  "Angie / Vargas" -> Tech Angie Burks + Trainee tech Areli Vargas; "Fisher
  Moore" -> two people. Match first OR last name against the staff list;
  ask when unsure. "Clarke (appt 1330-EOD)" -> Julia Clarke, with the
  bracket kept as a team note.
- Times: the room's first case keeps its start time; later cases follow
  ("to follow"). Ask whether to keep the board's later start times as
  "not before" times.
- Re-photographing the same day updates cases instead of duplicating them.
- Test with a typed-up copy of the board (no case numbers or comments);
  don't commit photos of the real board.

## Add items to a case: while booking, after booking, even after pulling
Add one or several items to a case from the Add case form, the case tile on
My day, or the cart itself. Each addition asks:
- **Just this case** (that day only; the card isn't touched), or
- **Add to the card going forward** (saved to the preference card, with
  the edit history noting who added it and from which case).
Both land on that case's cart.

When the cart was already printed or pulled (any item pulled, marked done,
QC'd, or Print cards / Share day used for that day):
- The new item goes straight on the cart's **missing** list, flagged "added
  after pulling", until someone checks it off as on the cart (the same
  confirm used by QC today).
- Anyone can comment on it: "In the sterilizer", "Rep bringing it 06:30",
  "Due in on the noon truck". The comment shows who wrote it and when
  (existing missing-item comments).
- A phone notification goes out (with the notifications build): "Added
  after pull · OR 4 Lap Chole, Thu: Ligasure 5mm". Sent to people on that
  day's room team and whoever pulled or QC'd the cart.

On My day, the day before and the day of the case:
- The case tile's missing count turns **red**. Tapping it opens the list:
  each missing item, why ("added after pulling" / not found), and every
  comment with who and when; checking it off clears it.
- Earlier days keep the normal (non-red) count.

## Phone notifications for schedule changes (after the app is live)
Native push notifications, on/off in Settings, for cases **added, canceled,
or rescheduled** that fall within the user's window: the day of plus N days
ahead (default 3; e.g. "day of + 2 days"). Rescheduled counts if either the
old or the new date is in the window.

How it works (it has to be push: the change happens on someone else's phone
while this one is in a pocket):
- Firebase Cloud Messaging for both platforms (APNs underneath on iPhone),
  via @capacitor/push-notifications. Each phone registers its token on the
  member's record in the facility.
- A Cloud Function watches the facility's cases and sends to members whose
  settings match. Never to the person who made the change.
- Message, no patient info: "Added · OR 4, Thu Oct 29 07:30 · Lap Chole,
  Dr. Alvarez". Tapping opens My day on that date.
- Settings: on/off, how many days ahead (day of only, +1, +2, +3...), which
  changes (added / canceled / rescheduled), optionally only cases where
  I'm on the room team.
- Works for facility members (their schedule is shared); a personal library
  has no one else changing it.

Icon / badge:
- iPhone always shows the app icon on a notification (Apple doesn't allow
  a different picture there), so it's the ORSync icon. The mascot can ride
  along as an image inside the notification (needs a small notification
  extension). The red number on the icon can count unseen changes.
- Android: the status-bar icon must be a one-color silhouette; make a
  white Jolie silhouette for it, with the full-color mascot as the large
  icon and ORSync blue as the accent.

Owner to-dos when we build it:
- Firebase: Cloud Functions need the pay-as-you-go (Blaze) plan. At OR
  volumes this stays inside the free allowance (2M calls/month), but
  Google requires a card on file; set a budget alert.
- Apple: an APNs key with Push Notifications enabled for
  com.stevennelson.orsync, uploaded to Firebase (Developer account, Keys).
- New App Store privacy answer: device push token (not linked to
  tracking).

## Already done on the branch, ships with the next build
- Day sheet lists surgical technologists as "Tech", with role titles in bold.
- Add case: free-text case name that searches cards as you type; surgeon
  search with "add a new surgeon"; matching cards to tick, several combine
  into one case with the overlap settled in the form.
- "Can't start before a set time" for cases that aren't a room's first.
- Schedule upload keeps the schedule's wording as the case name.
- Case log: filter by dates (this month, last 30 days, this year, or From/To)
  and specialty, counts by specialty, then Share PDF, Send as text, or Copy.
- My day: lunch & break relief per room (tech lunch, nurse lunch, nurse
  break: start time + who relieves), stamped with who edited it; a "Lunch &
  breaks" list of every room's reliefs in time order; on the day sheet too.
- Scanner: every "(Avail)" spelling is a hold ("(Available)", "( Avail )",
  "- Avail", "(Avail) REF ...", "Avail: ..."); "Suture passer (PRN)" and
  "Suture scissors" stay items instead of becoming a Sutures header; inline
  "REF 5400-50" / "Cat# ..." becomes the catalog number.
- On call: "Pick days" schedules someone for many days at once (month
  calendar, call start/end times, each day or one stretch), and a Call
  schedule screen shows every day of the month, open positions flagged.
- Loaner requests and "Send for pull" share a readable picture and message
  (not just the raw .orsync data, which Messages opened as code).
