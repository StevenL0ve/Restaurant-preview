import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../state/auth";
import { useStore } from "../state/store";
import { addToWallet, memberId, preferredWallet, type WalletKind } from "../lib/wallet";
import { tapLight, notifySuccess } from "../lib/haptics";

export function Rewards() {
  const { user } = useAuth();
  const { state } = useStore();
  const { punch } = state;
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<WalletKind | null>(null);

  const id = memberId(user?.email ?? "guest@cgp");
  const name = user?.name ?? "CGP Member";
  const preferred = preferredWallet();

  async function add(kind: WalletKind) {
    setBusy(kind);
    setStatus(null);
    tapLight();
    const res = await addToWallet(kind, {
      memberId: id,
      memberName: name,
      punches: punch.punches,
      goal: punch.goal,
      rewards: punch.rewards,
      lifetime: punch.lifetimePunches,
    });
    if (res.opened) notifySuccess();
    setStatus(res.message);
    setBusy(null);
  }

  const stamps = Array.from({ length: punch.goal }, (_, i) => i < punch.punches);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Café Punch Card</h1>
          <p className="page-sub">Every coffee earns a punch. {punch.goal} punches = a free drink.</p>
        </div>
      </div>

      {/* Digital loyalty card */}
      <div className="loyalty-card">
        <div className="loyalty-top">
          <span className="loyalty-brand">Common Grounds Café</span>
          <img className="loyalty-logo" src="/brand/logo.jpeg" alt="" aria-hidden />
        </div>
        <div className="loyalty-name">{name}</div>
        <div className="loyalty-id">{id}</div>
        <div className="loyalty-strip" aria-hidden>
          {Array.from({ length: 42 }, (_, i) => (
            <span key={i} style={{ opacity: (id.charCodeAt(i % id.length) % 3) ? 1 : 0.35 }} />
          ))}
        </div>
        <div className="loyalty-foot">
          <span>{punch.punches} / {punch.goal} punches</span>
          <span>{punch.rewards} reward{punch.rewards === 1 ? "" : "s"}</span>
        </div>
      </div>

      {/* Add to Wallet */}
      <div className="wallet-actions">
        <button
          className={"btn wallet-btn wallet-apple" + (preferred === "apple" ? " wallet-primary" : "")}
          onClick={() => add("apple")}
          disabled={busy !== null}
        >
          {busy === "apple" ? "Adding…" : " Add to Apple Wallet"}
        </button>
        <button
          className={"btn wallet-btn wallet-google" + (preferred === "google" ? " wallet-primary" : "")}
          onClick={() => add("google")}
          disabled={busy !== null}
        >
          {busy === "google" ? "Adding…" : "Save to Google Wallet"}
        </button>
      </div>
      {status && <p className="wallet-status">{status}</p>}

      {/* Stamp grid */}
      <section className="section">
        <h2 className="section-title">Your punches</h2>
        <div className="punch-grid">
          {stamps.map((filled, i) => (
            <div key={i} className={"punch-stamp" + (filled ? " filled" : "")}>
              {filled ? "☕️" : i + 1}
            </div>
          ))}
        </div>
      </section>

      {punch.rewards > 0 ? (
        <div className="card reward-banner">
          <div>
            <div className="row-title">🎉 You have {punch.rewards} free drink{punch.rewards > 1 ? "s" : ""}!</div>
            <div className="row-sub">Redeem at checkout — just add a café drink to your cart.</div>
          </div>
          <Link to="/menu" className="btn btn-primary">Order</Link>
        </div>
      ) : (
        <div className="card reward-banner">
          <div>
            <div className="row-title">{punch.goal - punch.punches} to go</div>
            <div className="row-sub">Order {punch.goal - punch.punches} more drink{punch.goal - punch.punches === 1 ? "" : "s"} to earn a free coffee.</div>
          </div>
          <Link to="/menu" className="btn btn-ghost">Order coffee</Link>
        </div>
      )}

      <div className="stat-row">
        <div className="stat">
          <div className="stat-num">{punch.lifetimePunches}</div>
          <div className="stat-label">Lifetime punches</div>
        </div>
        <div className="stat">
          <div className="stat-num">{punch.redeemed}</div>
          <div className="stat-label">Free drinks claimed</div>
        </div>
      </div>
    </div>
  );
}
