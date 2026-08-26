import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore, cartsOn, cartProgress, openMissing, surgeonOf, localDay, missingForDay } from "../state/store";
import { Avatar } from "../components/Avatar";
import { accentStyle } from "../lib/accent";
import { tapLight } from "../lib/haptics";
import type { CaseCart } from "../types";

function dayLabel(offset: number): string {
  if (offset === 0) return "Today";
  if (offset === 1) return "Tomorrow";
  if (offset === -1) return "Yesterday";
  const d = new Date(Date.now() + offset * 86400000);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

// Case carts for a day: every cart being pulled, its progress, and its missing
// count. The same card shows up once per case — five cataracts, five carts.
export function CartsPage() {
  const { state, addCarts } = useStore();
  const navigate = useNavigate();
  const [offset, setOffset] = useState(0);
  const [adding, setAdding] = useState(false);
  const [cardId, setCardId] = useState("");
  const [count, setCount] = useState("1");

  const date = localDay(offset);
  const carts = cartsOn(state, date);
  const missingCount = missingForDay(state, date).reduce((n, g) => n + g.missing.length, 0);

  const cardOptions = useMemo(
    () =>
      [...state.cards]
        .map((c) => ({ c, sg: surgeonOf(state, c.surgeonId) }))
        .sort((a, b) => a.c.procedure.localeCompare(b.c.procedure)),
    [state],
  );

  function create() {
    if (!cardId) return;
    tapLight();
    const made = addCarts(cardId, date, parseInt(count, 10) || 1);
    setAdding(false);
    setCardId("");
    setCount("1");
    if (made.length === 1) navigate(`/carts/${made[0].id}`);
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Case carts</h1>
          <p className="muted">Pull together, see who pulled what, and hand ops the missing list.</p>
        </div>
        <div className="head-actions">
          <Link className="btn" to="/carts/send">📤 Send to a puller</Link>
          {!adding && <button className="btn btn-primary" onClick={() => setAdding(true)}>+ New carts</button>}
        </div>
      </div>

      <div className="day-stepper">
        <button className="btn btn-sm" onClick={() => setOffset((o) => o - 1)} aria-label="Previous day">←</button>
        <span className="day-label">{dayLabel(offset)} <span className="muted small">{date}</span></span>
        <button className="btn btn-sm" onClick={() => setOffset((o) => o + 1)} aria-label="Next day">→</button>
        {offset !== 0 && <button className="link small" onClick={() => setOffset(0)}>today</button>}
      </div>

      {missingCount > 0 && (
        <Link to="/carts/missing" className="missing-banner">
          ⚠️ <strong>{missingCount}</strong> missing item{missingCount === 1 ? "" : "s"} across {dayLabel(offset).toLowerCase()}’s carts — open the ops list →
        </Link>
      )}

      {adding && (
        <div className="card form-card">
          <h2>New carts for {dayLabel(offset).toLowerCase()}</h2>
          <p className="muted small">
            Pulling the same procedure for several cases? Set the count and each case gets its own
            cart — five cataracts means five carts, pulled and tracked separately.
          </p>
          <div className="newcart-form">
            <select value={cardId} onChange={(e) => setCardId(e.target.value)} autoFocus>
              <option value="">Pick a preference card…</option>
              {cardOptions.map(({ c, sg }) => (
                <option key={c.id} value={c.id}>{c.procedure} — {sg?.name ?? "Unassigned"}</option>
              ))}
            </select>
            <label className="cart-count">
              <span>How many?</span>
              <input type="number" min={1} max={20} value={count} onChange={(e) => setCount(e.target.value)} />
            </label>
            <button className="btn btn-primary" disabled={!cardId} onClick={create}>Create</button>
            <button className="btn" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      {carts.length === 0 && !adding ? (
        <div className="empty-state">
          <span className="empty-emoji">🛒</span>
          <p>No carts for {dayLabel(offset).toLowerCase()}. Tap <strong>New carts</strong> to start pulling.</p>
        </div>
      ) : (
        <div className="cart-list">
          {carts.map((cart) => <CartRow key={cart.id} cart={cart} />)}
        </div>
      )}
    </div>
  );
}

function CartRow({ cart }: { cart: CaseCart }) {
  const { state } = useStore();
  const card = state.cards.find((c) => c.id === cart.cardId);
  if (!card) return null;
  const sg = surgeonOf(state, card.surgeonId);
  const { pulled, total } = cartProgress(state, cart);
  const missing = openMissing(cart);
  const pct = total ? Math.round((pulled / total) * 100) : 0;
  const pullers = [...new Set(Object.values(cart.pulls).map((p) => p.by))];

  return (
    <Link to={`/carts/${cart.id}`} className="cart-row" style={accentStyle(card.specialty)}>
      <div className="cart-row-top">
        {sg && <Avatar surgeon={sg} size={34} />}
        <div className="cart-row-title">
          <span className="cart-proc">{card.procedure}{cart.label && <span className="cart-label">{cart.label}</span>}</span>
          <span className="muted small">{sg?.name}{pullers.length ? ` · pulling: ${pullers.join(", ")}` : ""}</span>
        </div>
        {cart.donePulling ? (
          missing.length > 0 ? (
            <span className="cart-badge cart-badge-missing">{missing.length} missing</span>
          ) : (
            <span className="cart-badge cart-badge-done">✓ Complete</span>
          )
        ) : (
          <span className="cart-badge">{pulled}/{total}</span>
        )}
      </div>
      <div className="progress-track cart-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
    </Link>
  );
}
