import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../state/auth";
import { useStore } from "../state/store";
import { addToWallet, memberId, preferredWallet, type WalletKind } from "../lib/wallet";
import { verifyStampPin, isValidStampCount, MAX_STAMPS_PER_VISIT } from "../lib/stamp";
import { tapLight, notifySuccess } from "../lib/haptics";

export function Rewards() {
  const { user } = useAuth();
  const { state, stampPunches } = useStore();
  const { punch } = state;
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<WalletKind | null>(null);

  // Barista counter stamp
  const [stampOpen, setStampOpen] = useState(false);
  const [drinks, setDrinks] = useState(1);
  const [pin, setPin] = useState("");
  const [stampError, setStampError] = useState<string | null>(null);
  const [stamped, setStamped] = useState<string | null>(null);

  function doStamp() {
    if (!verifyStampPin(pin)) {
      setStampError("Wrong staff PIN.");
      return;
    }
    if (!isValidStampCount(drinks)) {
      setStampError(`1–${MAX_STAMPS_PER_VISIT} drinks per visit.`);
      return;
    }
    const res = stampPunches(drinks);
    notifySuccess();
    setStampOpen(false);
    setPin("");
    setDrinks(1);
    setStampError(null);
    setStamped(
      res.newRewards > 0
        ? `+${res.punchesEarned} punch${res.punchesEarned === 1 ? "" : "es"} — card complete, free drink unlocked! 🎉`
        : `+${res.punchesEarned} punch${res.punchesEarned === 1 ? "" : "es"} stamped. ☕️`,
    );
    setTimeout(() => setStamped(null), 4000);
  }

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
          <img className="loyalty-logo" src="/brand/logo.png" alt="" aria-hidden />
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

      {stamped && <div className="card success-banner">{stamped}</div>}

      {/* Counter purchases: the barista stamps the card right on your phone. */}
      <div className="card row-card">
        <div>
          <div className="row-title">☕️ Ordering at the counter?</div>
          <div className="row-sub">Show this card — the barista stamps it with the staff PIN.</div>
        </div>
        <button className="btn btn-add" onClick={() => { tapLight(); setStampOpen(true); }}>
          Stamp
        </button>
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

      {stampOpen && (
        <div className="modal-scrim" onClick={() => setStampOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h2 className="modal-title">Barista stamp</h2>
            <p className="modal-sub">
              Staff only — hand the phone to your barista. They'll confirm the
              drinks and stamp with the café PIN.
            </p>
            <div className="stamp-row">
              <span className="row-title">Drinks purchased</span>
              <div className="stepper">
                <button onClick={() => setDrinks((d) => Math.max(1, d - 1))} aria-label="Fewer drinks">−</button>
                <span>{drinks}</span>
                <button onClick={() => setDrinks((d) => Math.min(MAX_STAMPS_PER_VISIT, d + 1))} aria-label="More drinks">+</button>
              </div>
            </div>
            <label className="field">
              <span>Staff PIN</span>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => { setPin(e.target.value); setStampError(null); }}
                placeholder="••••"
                aria-label="Staff PIN"
              />
            </label>
            {stampError && <div className="auth-error">{stampError}</div>}
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => { setStampOpen(false); setPin(""); setStampError(null); }}>Cancel</button>
              <button className="btn btn-primary" disabled={!pin} onClick={doStamp}>
                Stamp {drinks} punch{drinks === 1 ? "" : "es"}
              </button>
            </div>
          </div>
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
