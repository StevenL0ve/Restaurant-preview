import { useStore, dayNotesFor } from "../state/store";
import type { PrefCard } from "../types";

// The surgeon's special requests, surfaced wherever the card is worked:
// the standing (permanent) considerations plus any "today only" notes for
// the date being worked. Read-only here; editing lives on the card page.
export function ConsiderationsBanner({ card, date }: { card: PrefCard; date: string }) {
  const { state } = useStore();
  const todays = dayNotesFor(state, card.id, date);
  const standing = card.specialConsiderations?.trim();
  if (!standing && todays.length === 0) return null;
  return (
    <div className="considerations-banner">
      <span className="considerations-title">Special considerations</span>
      {standing && <p className="considerations-text">{standing}</p>}
      {todays.map((n) => (
        <p key={n.id} className="considerations-text today">
          <span className="today-pill">today only</span> {n.text}{n.by ? <span className="muted small"> · {n.by}</span> : null}
        </p>
      ))}
    </div>
  );
}
