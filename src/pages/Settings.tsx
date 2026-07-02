import { useState } from "react";
import { useStore } from "../state/store";
import { useAuth } from "../state/auth";
import { memberId } from "../lib/wallet";

export function Settings() {
  const { state, resetDemo, clearData } = useStore();
  const { user, signOut, bioAvailable, bioEnabled, setBioEnabled } = useAuth();
  const [confirmClear, setConfirmClear] = useState(false);

  const counts = {
    orders: state.orders.length,
    bookings: state.bookings.filter((b) => b.status === "confirmed").length,
    waivers: state.waivers.length,
    punches: state.punch.lifetimePunches,
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Your CGP account &amp; membership.</p>
        </div>
      </div>

      {user && (
        <section className="card settings-card">
          <h2>Account</h2>
          <div className="account-row">
            <span className="avatar">{user.name.slice(0, 2).toUpperCase()}</span>
            <div>
              <div className="account-name">{user.name}</div>
              <div className="muted small">{user.email}</div>
              <div className="muted small">Member {memberId(user.email)}</div>
            </div>
          </div>
          <label className="toggle-row">
            <span>
              Unlock with Face ID
              {!bioAvailable && <span className="muted small"> · not available on this device</span>}
            </span>
            <input
              type="checkbox"
              checked={bioEnabled}
              disabled={!bioAvailable}
              onChange={(e) => setBioEnabled(e.target.checked)}
            />
          </label>
          <div className="form-actions">
            <button className="btn" onClick={signOut}>Sign out</button>
          </div>
        </section>
      )}

      <section className="card settings-card">
        <h2>Your activity</h2>
        <ul className="data-counts">
          <li><strong>{counts.orders}</strong> orders</li>
          <li><strong>{counts.bookings}</strong> upcoming bookings</li>
          <li><strong>{counts.waivers}</strong> waivers signed</li>
          <li><strong>{counts.punches}</strong> lifetime punches</li>
        </ul>
        <div className="form-actions">
          <button className="btn" onClick={resetDemo}>Reset demo data</button>
        </div>
      </section>

      <section className="card settings-card danger-zone">
        <h2>Clear my data</h2>
        <p className="muted">
          Clears your orders, bookings, waivers and punch card from this device.
          This can't be undone.
        </p>
        {!confirmClear ? (
          <button className="btn btn-danger" onClick={() => setConfirmClear(true)}>
            Clear my data
          </button>
        ) : (
          <div className="confirm">
            <span>This permanently clears your local data. Sure?</span>
            <button className="btn btn-danger" onClick={() => { clearData(); setConfirmClear(false); }}>
              Yes, clear everything
            </button>
            <button className="btn" onClick={() => setConfirmClear(false)}>Cancel</button>
          </div>
        )}
      </section>
    </div>
  );
}
