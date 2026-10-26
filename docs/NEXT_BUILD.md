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

## Already done on the branch, ships with the next build
- Day sheet lists surgical technologists as "Tech".
