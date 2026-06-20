import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../state/store";
import { useAuth } from "../state/auth";
import { useTier, setTier } from "../lib/subscription";

export function Settings() {
  const { state, exportAll, resetDemo, deleteAccount } = useStore();
  const { user, signOut, bioAvailable, bioEnabled, setBioEnabled } = useAuth();
  const tier = useTier();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const counts = {
    messages: state.messages.length,
    events: state.events.length,
    expenses: state.expenses.length,
    journal: state.journal.length,
    info: state.info.length,
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p className="muted">Your account, your data, your rules.</p>
        </div>
      </div>

      {user && (
        <section className="card settings-card">
          <h2>Account</h2>
          <div className="account-row">
            <span className="avatar" style={{ background: "var(--brand)" }}>
              {user.name.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <div className="account-name">{user.name}</div>
              <div className="muted small">{user.email}</div>
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
        <h2>Plan</h2>
        {tier === "pro" ? (
          <>
            <p className="muted">
              You're on <strong>CoParent Pro</strong> — one subscription for the
              whole family. Manage or cancel anytime in your App Store / Google
              Play settings.
            </p>
            <div className="form-actions">
              <span className="pill pill-ok">Pro active ⭐️</span>
              <button className="btn btn-sm" onClick={() => setTier("free")}>Switch to Free (demo)</button>
            </div>
          </>
        ) : (
          <>
            <p className="muted">
              Free to use. Upgrade to <strong>Pro</strong> for unlimited history,
              court-ready exports, attachments, and the AI assistant — one price
              per family ($7.99/mo or $59.99/yr), not per parent like the others.
            </p>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={() => navigate("/upgrade")}>
                Upgrade to Pro
              </button>
            </div>
          </>
        )}
      </section>

      <section className="card settings-card">
        <h2>Your data</h2>
        <p className="muted">
          Everything lives on your device. Export a complete copy whenever you
          want — useful for your records or your attorney.
        </p>
        <ul className="data-counts">
          <li><strong>{counts.messages}</strong> messages</li>
          <li><strong>{counts.events}</strong> calendar events</li>
          <li><strong>{counts.expenses}</strong> expenses</li>
          <li><strong>{counts.journal}</strong> journal entries</li>
          <li><strong>{counts.info}</strong> info records</li>
        </ul>
        <div className="form-actions">
          <button className="btn btn-primary" onClick={exportAll}>⤓ Export all my data (JSON)</button>
          <button className="btn" onClick={resetDemo}>Reset demo data</button>
        </div>
      </section>

      <section className="card settings-card danger-zone">
        <h2>Delete account</h2>
        <p className="muted">
          One click. No waiting on hold, no co-parent approval required, no
          "contact support to cancel." Your records are erased from this device
          immediately.
        </p>
        {!confirmDelete ? (
          <button className="btn btn-danger" onClick={() => setConfirmDelete(true)}>
            Delete my account
          </button>
        ) : (
          <div className="confirm">
            <span>This permanently clears your local data. Sure?</span>
            <button className="btn btn-danger" onClick={deleteAccount}>Yes, delete everything</button>
            <button className="btn" onClick={() => setConfirmDelete(false)}>Cancel</button>
          </div>
        )}
      </section>
    </div>
  );
}
