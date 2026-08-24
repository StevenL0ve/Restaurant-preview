import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore, missingForDay, missingDayText, localDay, surgeonOf, getPullerName } from "../state/store";
import { copyText } from "../lib/share";
import { MissingRow } from "./CartPullPage";
import { tapLight } from "../lib/haptics";

function dayLabel(offset: number): string {
  if (offset === 0) return "Today";
  if (offset === 1) return "Tomorrow";
  if (offset === -1) return "Yesterday";
  const d = new Date(Date.now() + offset * 86400000);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

// The ops view: every open missing item across every cart for a day, in one
// place — editable comments, one-tap resolve when an item lands, and a
// copyable text rollup to send to SPD / materials / the board runner.
export function MissingDayPage() {
  const { state, setMissingComment, resolveMissing } = useStore();
  const [offset, setOffset] = useState(0);
  const [copied, setCopied] = useState(false);
  const date = localDay(offset);
  const groups = missingForDay(state, date);
  const me = getPullerName() || "Ops";

  async function copyRollup() {
    const ok = await copyText(missingDayText(state, date));
    setCopied(ok);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="page page-narrow">
      <div className="detail-top">
        <Link className="link" to="/carts">← Case carts</Link>
      </div>
      <div className="page-head">
        <div>
          <h1>Missing — all carts</h1>
          <p className="muted">Everything still not in a cart, across the whole day. Comments are live — edit here, pullers see it on the cart.</p>
        </div>
        <div className="head-actions">
          <button className="btn" onClick={copyRollup}>{copied ? "✓ Copied" : "📋 Copy for SPD / email"}</button>
        </div>
      </div>

      <div className="day-stepper">
        <button className="btn btn-sm" onClick={() => setOffset((o) => o - 1)} aria-label="Previous day">←</button>
        <span className="day-label">{dayLabel(offset)} <span className="muted small">{date}</span></span>
        <button className="btn btn-sm" onClick={() => setOffset((o) => o + 1)} aria-label="Next day">→</button>
        {offset !== 0 && <button className="link small" onClick={() => setOffset(0)}>today</button>}
      </div>

      {groups.length === 0 ? (
        <div className="empty-state">
          <span className="empty-emoji">🎉</span>
          <p>No open missing items for {dayLabel(offset).toLowerCase()} — every cart is whole.</p>
        </div>
      ) : (
        groups.map(({ cart, card, missing }) => {
          const sg = card ? surgeonOf(state, card.surgeonId) : undefined;
          return (
            <div className="card form-card" key={cart.id}>
              <div className="card-head">
                <h2>
                  <Link className="missing-cart-link" to={`/carts/${cart.id}`}>
                    {card?.procedure ?? "Unknown card"}{cart.label && <span className="cart-label">{cart.label}</span>}
                  </Link>
                </h2>
                <span className="muted small">{sg?.name}</span>
              </div>
              {missing.map((m) => (
                <MissingRow
                  key={m.itemId}
                  entry={m}
                  onComment={(v) => setMissingComment(cart.id, m.itemId, v)}
                  onResolve={() => { tapLight(); resolveMissing(cart.id, m.itemId, me); }}
                />
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}
