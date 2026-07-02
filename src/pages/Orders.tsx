import { Link, useLocation } from "react-router-dom";
import { useStore } from "../state/store";
import { money, fullDate, time } from "../lib/format";

const statusLabel: Record<string, string> = {
  received: "Received",
  preparing: "Preparing",
  ready: "Ready for pickup",
  completed: "Completed",
};

export function Orders() {
  const { state } = useStore();
  const location = useLocation();
  const justOrdered = (location.state as { justOrdered?: string } | null)?.justOrdered;

  if (state.orders.length === 0) {
    return (
      <div className="page">
        <h1 className="page-title">My Orders</h1>
        <div className="empty">
          <div className="empty-icon">🧾</div>
          <p>No orders yet.</p>
          <Link to="/menu" className="btn btn-primary">Order something</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">My Orders</h1>

      {justOrdered && (
        <div className="card success-banner">
          🎉 Order placed! We'll have it ready shortly.
        </div>
      )}

      <div className="stack">
        {state.orders.map((o) => (
          <div key={o.id} className={"card order-card" + (o.id === justOrdered ? " highlight" : "")}>
            <div className="order-head">
              <div>
                <div className="row-title">Order #{o.id.slice(-4).toUpperCase()}</div>
                <div className="row-sub">{fullDate(o.createdAt)} · {time(o.createdAt)} · {o.method === "pickup" ? "Pickup" : "Dine-in"}</div>
              </div>
              <span className={`status status-${o.status}`}>{statusLabel[o.status]}</span>
            </div>
            <ul className="order-lines">
              {o.lines.map((l, i) => (
                <li key={i}>
                  <span>{l.qty}× {l.name}</span>
                  <span>{money(l.price * l.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="order-foot">
              <div className="order-meta">
                {o.usedReward && <span className="tag tag-punch">🎟️ Free drink redeemed</span>}
                {o.punchesEarned > 0 && <span className="tag">+{o.punchesEarned} punch{o.punchesEarned === 1 ? "" : "es"}</span>}
              </div>
              <div className="order-total">{money(o.total)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
