import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore, cartSubtotal } from "../state/store";
import type { OrderMethod } from "../types";
import { money } from "../lib/format";
import { tapLight, notifySuccess } from "../lib/haptics";

export function Cart() {
  const { state, setQty, removeFromCart, placeOrder } = useStore();
  const navigate = useNavigate();
  const [method, setMethod] = useState<OrderMethod>("pickup");
  const [useReward, setUseReward] = useState(state.punch.rewards > 0);

  const lines = state.cart
    .map((l) => {
      const item = state.menu.find((m) => m.id === l.itemId);
      return item ? { item, qty: l.qty } : null;
    })
    .filter((x): x is { item: (typeof state.menu)[number]; qty: number } => x !== null);

  const subtotal = cartSubtotal(state);
  const hasDrink = lines.some(({ item }) => item.earnsPunch);
  const canRedeem = useReward && state.punch.rewards > 0 && hasDrink;
  const freeDrink = canRedeem
    ? Math.max(...lines.filter(({ item }) => item.earnsPunch).map(({ item }) => item.price))
    : 0;
  const total = Math.max(0, subtotal - freeDrink);

  function checkout() {
    const res = placeOrder(method, useReward);
    if (res) {
      notifySuccess();
      navigate("/orders", { state: { justOrdered: res.order.id } });
    }
  }

  if (lines.length === 0) {
    return (
      <div className="page">
        <h1 className="page-title">Your cart</h1>
        <div className="empty">
          <div className="empty-icon">🛒</div>
          <p>Your cart is empty.</p>
          <Link to="/menu" className="btn btn-primary">Browse the menu</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">Your cart</h1>

      <div className="stack">
        {lines.map(({ item, qty }) => (
          <div key={item.id} className="card cart-line">
            <div className="cart-line-body">
              <div className="row-title">{item.name}</div>
              <div className="row-sub">{money(item.price)} each{item.earnsPunch ? " · earns a punch" : ""}</div>
            </div>
            <div className="stepper">
              <button onClick={() => { setQty(item.id, qty - 1); tapLight(); }} aria-label="Decrease">−</button>
              <span>{qty}</span>
              <button onClick={() => { setQty(item.id, qty + 1); tapLight(); }} aria-label="Increase">+</button>
            </div>
            <div className="cart-line-price">{money(item.price * qty)}</div>
            <button className="cart-line-remove" onClick={() => removeFromCart(item.id)} aria-label="Remove">✕</button>
          </div>
        ))}
      </div>

      <section className="section">
        <h2 className="section-title">Pickup or dine-in?</h2>
        <div className="segmented">
          <button className={"seg" + (method === "pickup" ? " active" : "")} onClick={() => setMethod("pickup")}>Pickup</button>
          <button className={"seg" + (method === "dine-in" ? " active" : "")} onClick={() => setMethod("dine-in")}>Dine-in</button>
        </div>
      </section>

      {state.punch.rewards > 0 && (
        <label className={"card reward-toggle" + (hasDrink ? "" : " disabled")}>
          <input
            type="checkbox"
            checked={useReward && hasDrink}
            disabled={!hasDrink}
            onChange={(e) => setUseReward(e.target.checked)}
          />
          <span>
            <span className="row-title">🎟️ Redeem a free drink</span>
            <span className="row-sub">
              {hasDrink
                ? `You have ${state.punch.rewards} reward${state.punch.rewards > 1 ? "s" : ""}. Applies to your priciest café drink.`
                : "Add a café drink to redeem your free-drink reward."}
            </span>
          </span>
        </label>
      )}

      <div className="card totals">
        <div className="totals-row"><span>Subtotal</span><span>{money(subtotal)}</span></div>
        {canRedeem && (
          <div className="totals-row totals-discount"><span>Free drink reward</span><span>−{money(freeDrink)}</span></div>
        )}
        <div className="totals-row totals-total"><span>Total</span><span>{money(total)}</span></div>
      </div>

      <button className="btn btn-primary btn-block" onClick={checkout}>
        Place order · {money(total)}
      </button>
    </div>
  );
}
