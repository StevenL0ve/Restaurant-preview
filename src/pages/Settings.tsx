import { useState } from "react";
import { useStore } from "../state/store";

export function Settings() {
  const { state, exportAll, resetDemo, deleteAccount } = useStore();
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

      <section className="card settings-card">
        <h2>Pricing</h2>
        <p className="muted">
          CoParent is <strong>free</strong>. No per-parent subscription, no
          annual renewal traps, no charges after you stop using it. We never
          require your co-parent's permission for you to leave.
        </p>
        <div className="price-row">
          <div className="price-col">
            <span className="price-name">CoParent</span>
            <span className="price-value pos">$0</span>
            <span className="muted small">forever</span>
          </div>
          <div className="price-col faded">
            <span className="price-name">OurFamilyWizard</span>
            <span className="price-value">$99+/yr</span>
            <span className="muted small">per parent, auto-renewing</span>
          </div>
        </div>
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
