# Next build (after 1.0.1)

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

## "(Avail)" at the end of an item means hold
Already read as hold: "Bone wax (Avail)", "(avail)", "(Avail.)", "(AVAIL)",
"2 Lap sponges (Avail)", and a wrapped "(REF). (Avail)" line. Spellings that
slip through today (checked against the parser):
- "Fluoro (Available)" -> detail "Available", not a hold
- "Hemoclips ( Avail )" -> detail "Avail" (spaces inside the brackets)
- "Bipolar cord - Avail" -> detail "Avail"
- "Stryker drill (Avail) REF 5400-50" -> "(Avail)" mid-line stays in the name
Make all of these a hold and strip the word.

Found while checking: an item line starting with a section word,
"Suture passer (PRN)", is taken as a SUTURES header. The item is lost and
the items after it land in Sutures. Only treat a line as a header when it
has no item-like tail (brackets, quantities, REF numbers).

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

## Already done on the branch, ships with the next build
- Day sheet lists surgical technologists as "Tech", with role titles in bold.
- Add case: free-text case name that searches cards as you type; surgeon
  search with "add a new surgeon"; matching cards to tick, several combine
  into one case with the overlap settled in the form.
- "Can't start before a set time" for cases that aren't a room's first.
- Schedule upload keeps the schedule's wording as the case name.
- Case log: filter by dates (this month, last 30 days, this year, or From/To)
  and specialty, counts by specialty, then Share PDF, Send as text, or Copy.
