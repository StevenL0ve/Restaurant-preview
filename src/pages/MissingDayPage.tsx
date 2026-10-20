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
  const { state, setMissingComment, setMissingTurnover, resolveMissing } = useStore();
  const [offset, setOffset] = useState(0);
  const [copied, setCopied] = useState(false);
  const date = localDay(offset);
  const groups = missingForDay(state, date);
  const me = getPullerName() || "Ops";

  // Items coming off another of today's cases, across every cart: the
  // runner's flip list for the day.
  const cartLabel = (cartId: string) => {
    const c = state.carts.find((x) => x.id === cartId);
    const card = c ? state.cards.find((x) => x.id === c.cardId) : undefined;
    return c ? `${card?.procedure ?? "Case"}${c.label ? ` ${c.label}` : ""}` : "another case";
  };
  const turnovers = groups.flatMap(({ cart, card, missing }) =>
    missing
      .filter((m) => m.turnoverFromCartId)
      .map((m) => ({ cart, card, m })),
  );

  const turnoverOptionsFor = (cartId: string) =>
    state.carts
      .filter((c) => c.date === date && c.id !== cartId)
      .map((c) => ({ id: c.id, label: cartLabel(c.id) }));

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
          <h1>Missing items</h1>
          <p className="muted">Everything still not in a cart, across the whole day. Comments are live: edit here and pullers see it on the cart.</p>
        </div>
        <div className="head-actions">
          <button className="btn" onClick={copyRollup}>{copied ? "✓ Copied" : "Copy for SPD / email"}</button>
        </div>
      </div>

      <div className="day-stepper">
        <button className="btn btn-sm" onClick={() => setOffset((o) => o - 1)} aria-label="Previous day">←</button>
        <span className="day-label">{dayLabel(offset)} <span className="muted small">{date}</span></span>
        <button className="btn btn-sm" onClick={() => setOffset((o) => o + 1)} aria-label="Next day">→</button>
        {offset !== 0 && <button className="link small" onClick={() => setOffset(0)}>today</button>}
      </div>

      {turnovers.length > 0 && (
        <div className="card form-card turnover-card">
          <div className="card-head">
            <h2>Turnovers between cases</h2>
            <span className="pill">{turnovers.length}</span>
          </div>
          <p className="muted small">
            These aren't on a shelf: they come off an earlier case and get flipped for the next one.
          </p>
          {turnovers.map(({ cart, card, m }) => (
            <div className="turnover-row" key={`${cart.id}-${m.itemId}`}>
              <span className="missing-name">{m.name}{m.detail && <span className="item-detail"> {m.detail}</span>}</span>
              <span className="muted small">
                from <strong>{cartLabel(m.turnoverFromCartId!)}</strong> to{" "}
                <Link className="link" to={`/carts/${cart.id}`}>{card?.procedure ?? "case"}{cart.label ? ` ${cart.label}` : ""}</Link>
                {m.comment ? ` · ${m.comment}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}

      {groups.length === 0 ? (
        <div className="empty-state">
          <p>No open missing items for {dayLabel(offset).toLowerCase()}. Every cart is whole.</p>
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
                  turnoverOptions={turnoverOptionsFor(cart.id)}
                  onTurnover={(fromId) => setMissingTurnover(cart.id, m.itemId, fromId)}
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
