import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../components/Icon";
import { Mascot } from "../components/Mascot";
import {
  BETA_UNLOCKED,
  PRICE_ANNUAL,
  PRICE_MONTHLY,
  ANNUAL_SAVINGS,
  PRO_PERKS,
  FREE_PERKS,
  FACILITY_PERKS,
  FACILITY_PRICE_MONTHLY,
  FACILITY_PRICE_ANNUAL,
  hasPersonalCloud,
  grantProLocally,
} from "../lib/tier";
import { SALES_EMAIL } from "../lib/facilityGate";

// The Pro paywall. During beta it's informational (everything's already
// unlocked); at launch the CTA becomes a real StoreKit purchase.
export function Paywall() {
  const navigate = useNavigate();
  const [plan, setPlan] = useState<"annual" | "monthly">("annual");
  const [pro, setPro] = useState(hasPersonalCloud());

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
        <Mascot size={96} className="paywall-logo" />
        <h1>Plans</h1>
        <p className="muted">ORSync is free on your phone. Pay only for storage beyond it.</p>
      </div>

      <div className="card plan-section">
        <h2>Free <span className="pill">on this phone</span></h2>
        <ul className="perks">
          {FREE_PERKS.map((p) => (
            <li key={p}><span className="perk-check"><Icon name="check" size={16} /></span> {p}</li>
          ))}
        </ul>
      </div>

      <div className="card plan-section">
        <h2>Pro <span className="pill pill-brand">your library in the cloud</span></h2>
        {BETA_UNLOCKED && (
          <div className="beta-banner">
            <strong>Beta:</strong> the limits below are lifted for free while ORSync is in testing.
            Off-device storage of your personal library is the one thing that's Pro-only, beta included.
          </div>
        )}
        <ul className="perks">
          {PRO_PERKS.map((p) => (
            <li key={p}><span className="perk-check"><Icon name="check" size={16} /></span> {p}</li>
          ))}
        </ul>
      </div>

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
          Continue: {plan === "annual" ? `${PRICE_ANNUAL}/yr` : `${PRICE_MONTHLY}/mo`}
        </button>
      )}

      <p className="muted small paywall-fine">
        Billed through the App Store or Google Play. Cancel anytime in your store subscriptions.
        Your cards stay on your phone either way.
      </p>

      <div className="card plan-section">
        <h2>Facility <span className="pill">for a whole OR</span></h2>
        <ul className="perks">
          {FACILITY_PERKS.map((p) => (
            <li key={p}><span className="perk-check"><Icon name="check" size={16} /></span> {p}</li>
          ))}
        </ul>
        <p className="plan-price-line"><strong>{FACILITY_PRICE_MONTHLY}</strong>/month or <strong>{FACILITY_PRICE_ANNUAL}</strong>/year per OR</p>
        <p className="muted small">
          Members don't need Pro: everything they keep in the facility's library is stored and synced
          under the facility's package. Their own phone keeps its copy too.
        </p>
        <a className="btn" href={`mailto:${SALES_EMAIL}?subject=${encodeURIComponent("ORSync facility account")}`}>Email {SALES_EMAIL}</a>
      </div>
    </div>
  );
}
