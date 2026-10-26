import { useState } from "react";

// A ✕ that asks before deleting: one tap shows "Delete …? Delete / Cancel"
// in place, so a slip of the thumb can't remove shared facility data.
export function ConfirmDelete({ label, question, onConfirm }: {
  label: string; // accessible name of the ✕, e.g. "Delete location"
  question: string; // e.g. "Delete Lap cart, drawer 2? It's used on 3 card items."
  onConfirm: () => void;
}) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return <button className="info-del" aria-label={label} onClick={() => setAsking(true)}>✕</button>;
  }
  return (
    <span className="confirm confirm-delete" role="alertdialog" aria-label={question}>
      <span className="small">{question}</span>
      <button className="btn btn-danger btn-sm" onClick={() => { setAsking(false); onConfirm(); }} autoFocus>Delete</button>
      <button className="btn btn-sm" onClick={() => setAsking(false)}>Cancel</button>
    </span>
  );
}
