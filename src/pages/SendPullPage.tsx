import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useStore, surgeonOf, localDay, getPullerName } from "../state/store";

// Send a preference card to someone so THEY can pull the case cart(s).
// The card travels as a small file (share sheet → AirDrop / text / email);
// when they import it, ORSync merges the card into their library AND creates
// the carts for the chosen date — they land ready to pull, count and all.
export function SendPullPage() {
  const { state, sendCardForPull } = useStore();
  const location = useLocation();
  const preset = (location.state as { cardId?: string } | null)?.cardId ?? "";

  const [cardId, setCardId] = useState(preset);
  const [dayOffset, setDayOffset] = useState(0);
  const [customDate, setCustomDate] = useState("");
  const [count, setCount] = useState("1");
  const [note, setNote] = useState("");
  const [from, setFrom] = useState(getPullerName());
  const [result, setResult] = useState<"shared" | "downloaded" | null>(null);

  const cardOptions = useMemo(
    () =>
      [...state.cards]
        .map((c) => ({ c, sg: surgeonOf(state, c.surgeonId) }))
        .sort((a, b) => a.c.procedure.localeCompare(b.c.procedure)),
    [state],
  );
  const card = state.cards.find((c) => c.id === cardId);
  const date = customDate || localDay(dayOffset);

  async function send() {
    if (!card) return;
    const r = await sendCardForPull(card.id, date, parseInt(count, 10) || 1, note, from);
    setResult(r);
  }

  return (
    <div className="page page-narrow">
      <div className="detail-top">
        <Link className="link" to="/carts">← Case carts</Link>
      </div>
      <div className="page-head">
        <div>
          <h1>Send a card to pull</h1>
          <p className="muted">
            Need someone else to pull this cart? Send them the card — importing it gives them the
            full card <strong>and</strong> the carts for that day, ready to check off.
          </p>
        </div>
      </div>

      <div className="card form-card">
        <div className="form-grid">
          <label className="field field-wide">
            <span>Preference card</span>
            <select value={cardId} onChange={(e) => setCardId(e.target.value)} autoFocus={!preset}>
              <option value="">Pick a card…</option>
              {cardOptions.map(({ c, sg }) => (
                <option key={c.id} value={c.id}>{c.procedure} — {sg?.name ?? "Unassigned"}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Pull for</span>
            <select
              value={customDate ? "custom" : String(dayOffset)}
              onChange={(e) => {
                if (e.target.value === "custom") setCustomDate(localDay(2));
                else { setCustomDate(""); setDayOffset(parseInt(e.target.value, 10)); }
              }}
            >
              <option value="0">Today</option>
              <option value="1">Tomorrow</option>
              <option value="custom">Pick a date…</option>
            </select>
          </label>
          {customDate && (
            <label className="field">
              <span>Date</span>
              <input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} />
            </label>
          )}

          <label className="field">
            <span>How many carts?</span>
            <input type="number" min={1} max={20} value={count} onChange={(e) => setCount(e.target.value)} />
          </label>

          <label className="field field-wide">
            <span>Note for the puller (optional)</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. staged by 06:30, OR 5 — no patient info" />
          </label>

          <label className="field">
            <span>From</span>
            <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Your name" />
          </label>
        </div>
      </div>

      <div className="form-actions">
        <button className="btn btn-primary" disabled={!card} onClick={send}>
          📤 Share the pull file
        </button>
        {!card && <span className="muted small">Pick a card first.</span>}
      </div>

      {result && (
        <div className="card form-card send-result">
          {result === "shared" ? (
            <p>✅ Sent. When they open the file in ORSync (Settings → <strong>Import cards…</strong>),
              the card merges into their library and <strong>{parseInt(count, 10) || 1} cart{(parseInt(count, 10) || 1) === 1 ? "" : "s"}</strong> for {date} appear on their Carts tab.</p>
          ) : (
            <p>💾 File saved. Send it however you like (text, email, chat) — importing it via Settings →
              <strong> Import cards…</strong> gives them the card and the ready-to-pull carts.</p>
          )}
        </div>
      )}
    </div>
  );
}
