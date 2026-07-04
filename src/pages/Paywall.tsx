import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../components/Icon";
import {
  BETA_UNLOCKED,
  PRICE_ANNUAL,
  PRICE_MONTHLY,
  ANNUAL_SAVINGS,
  PRO_PERKS,
  hasPro,
  grantProLocally,
} from "../lib/tier";

// The Pro paywall. During beta it's informational (everything's already
// unlocked); at launch the CTA becomes a real StoreKit purchase.
export function Paywall() {
  const navigate = useNavigate();
  const [plan, setPlan] = useState<"annual" | "monthly">("annual");
  const [pro, setPro] = useState(hasPro());

  function subscribe() {
    // Scaffold: real IAP (RevenueCat/StoreKit) replaces this at launch.
    grantProLocally();
    setPro(true);
  }

  return (
    <div className="page page-narrow">
      <div className="detail-top">
        <button className="link" onClick={() => navigate(-1)}>← Back</button>
      </div>

      <div className="paywall-hero">
        <img src={`${import.meta.env.BASE_URL}brand/logo-mark.png`} alt="" width={64} height={64} className="paywall-logo" />
        <h1>ORSync Pro</h1>
        <p className="muted">Your whole career's worth of cards — every surgeon, every facility.</p>
      </div>

      {BETA_UNLOCKED && (
        <div className="beta-banner">
          🎉 <strong>Free during beta.</strong> Everything below is unlocked while ORSync is in
          TestFlight — enjoy Pro on us and tell us what to improve.
        </div>
      )}

      <ul className="perks">
        {PRO_PERKS.map((p) => (
          <li key={p}>
            <span className="perk-check"><Icon name="check" size={16} /></span> {p}
          </li>
        ))}
      </ul>

      <div className="plan-row">
        <button className={"plan-card" + (plan === "annual" ? " selected" : "")} onClick={() => setPlan("annual")}>
          <span className="plan-badge">Save {ANNUAL_SAVINGS}</span>
          <span className="plan-label">Annual</span>
          <span className="plan-price">{PRICE_ANNUAL}</span>
          <span className="plan-cadence">per year</span>
        </button>
        <button className={"plan-card" + (plan === "monthly" ? " selected" : "")} onClick={() => setPlan("monthly")}>
          <span className="plan-label">Monthly</span>
          <span className="plan-price">{PRICE_MONTHLY}</span>
          <span className="plan-cadence">per month</span>
        </button>
      </div>

      {pro ? (
        <button className="btn btn-primary paywall-cta" disabled>
          <Icon name="check" size={18} /> {BETA_UNLOCKED ? "Unlocked for beta" : "You're Pro"}
        </button>
      ) : (
        <button className="btn btn-primary paywall-cta" onClick={subscribe}>
          Continue — {plan === "annual" ? `${PRICE_ANNUAL}/yr` : `${PRICE_MONTHLY}/mo`}
        </button>
      )}

      <p className="muted small paywall-fine">
        Billed through the App Store. Cancel anytime in Settings → Subscriptions.
        The free plan keeps your first 10 cards and 1 facility forever.
      </p>
    </div>
  );
}
