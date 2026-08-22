import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PLANS, getTier, setTier, type Plan } from "../lib/subscription";

const PRO_PERKS = [
  "Unlimited message history & court-ready exports",
  "Photo & document attachments",
  "Custody-rotation templates + calendar sync",
  "AI assistant with unlimited questions",
  "Priority support",
];

export function Paywall() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Plan["id"]>("yearly");
  const already = getTier() === "pro";

  function subscribe() {
    // Phase 3: this calls RevenueCat (Apple IAP / Play Billing). For now it
    // flips the local entitlement so the Pro experience can be demoed.
    setTier("pro");
    navigate("/settings");
  }

  return (
    <div className="page page-tight">
      <div className="page-head">
        <div>
          <h1>CoParent Pro</h1>
          <p className="muted">
            One subscription for your whole family — not per parent. Cancel anytime.
          </p>
        </div>
      </div>

      {already ? (
        <div className="card empty-state">
          <span className="empty-emoji">⭐️</span>
          <p>You're on CoParent Pro. Thank you!</p>
        </div>
      ) : (
        <>
          <ul className="perks">
            {PRO_PERKS.map((p) => (
              <li key={p}><span className="perk-check">✓</span> {p}</li>
            ))}
          </ul>

          <div className="plan-row">
            {PLANS.map((p) => (
              <button
                key={p.id}
                className={"plan-card" + (selected === p.id ? " selected" : "")}
                onClick={() => setSelected(p.id)}
              >
                {p.note && <span className="plan-badge">{p.note}</span>}
                <span className="plan-label">{p.label}</span>
                <span className="plan-price">{p.price}<span className="plan-cadence">{p.cadence}</span></span>
              </button>
            ))}
          </div>

          <button className="btn btn-primary paywall-cta" onClick={subscribe}>
            Start CoParent Pro
          </button>
          <p className="muted small paywall-fine">
            Billed through your App Store / Google Play account. Manage or cancel
            anytime in your store settings.
          </p>
        </>
      )}
    </div>
  );
}
