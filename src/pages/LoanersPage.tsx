import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  useStore,
  loanersSorted,
  loanerStats,
  isLoanerOverdue,
  isLoanerSoon,
  surgeonOf,
  facilityOf,
} from "../state/store";
import type { Store } from "../state/store";
import { LOANER_STATUSES, type LoanerStatus, type LoanerTray } from "../types";
import { formatDate, daysUntil } from "../lib/format";

// Loaner-tray request + tracking — the Casechek-style workflow: request vendor
// sets for a case and track them through delivery, sterilization, and return,
// with delivery-deadline alerts so nothing shows up too late to process.
export function LoanersPage() {
  const store = useStore();
  const { state } = store;
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<LoanerTray | null>(null);
  const [filter, setFilter] = useState<"active" | "all" | LoanerStatus>("active");

  const stats = loanerStats(state);
  const loaners = useMemo(() => {
    const all = loanersSorted(state);
    if (filter === "all") return all;
    if (filter === "active") return all.filter((l) => l.status !== "returned");
    return all.filter((l) => l.status === filter);
  }, [state, filter]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Loaner trays</h1>
          <p className="muted">
            {stats.active} active
            {stats.overdue > 0 && <> · <span className="neg">{stats.overdue} overdue</span></>}
            {stats.soon > 0 && <> · {stats.soon} arriving soon</>}
          </p>
        </div>
        <div className="head-actions">
          <button className="btn btn-primary" onClick={() => { setEditing(null); setAdding((v) => !v); }}>
            {adding ? "Close" : "+ New request"}
          </button>
        </div>
      </div>

      {(adding || editing) && (
        <LoanerForm
          store={store}
          existing={editing ?? undefined}
          onDone={() => { setAdding(false); setEditing(null); }}
        />
      )}

      <div className="chips" style={{ marginBottom: 16 }}>
        {(["active", "all"] as const).map((f) => (
          <button key={f} className={"chip" + (filter === f ? " active" : "")} onClick={() => setFilter(f)}>
            {f === "active" ? "Active" : "All"}
          </button>
        ))}
        {LOANER_STATUSES.map((s) => (
          <button key={s.key} className={"chip" + (filter === s.key ? " active" : "")} onClick={() => setFilter(s.key)}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {loaners.length === 0 ? (
        <div className="empty-state">
          <span className="empty-emoji">🚚</span>
          <p>No loaner requests here. Tap <strong>New request</strong> to track a vendor tray for a case.</p>
        </div>
      ) : (
        <div className="loaner-list">
          {loaners.map((l) => (
            <LoanerCard key={l.id} loaner={l} store={store} onEdit={() => { setAdding(false); setEditing(l); }} />
          ))}
        </div>
      )}
    </div>
  );
}

function LoanerCard({ loaner: l, store, onEdit }: { loaner: LoanerTray; store: Store; onEdit: () => void }) {
  const { state, setLoanerStatus, deleteLoaner } = store;
  const [confirmDel, setConfirmDel] = useState(false);
  const surgeon = surgeonOf(state, l.surgeonId ?? "");
  const facility = facilityOf(state, l.facilityId);
  const overdue = isLoanerOverdue(l);
  const soon = isLoanerSoon(l);
  const dNeeded = daysUntil(l.neededBy);

  return (
    <div className={"card loaner-card" + (overdue ? " overdue" : "")}>
      <div className="loaner-top">
        <div>
          <div className="loaner-desc">{l.description}</div>
          <div className="muted small">
            {[l.vendor, l.quantity ? `${l.quantity} ${l.quantity === 1 ? "tray" : "trays"}` : null, l.poNumber]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
        {overdue ? (
          <span className="status status-disputed">Overdue</span>
        ) : soon ? (
          <span className="status status-reimbursement-requested">Soon</span>
        ) : null}
      </div>

      <div className="loaner-meta">
        {(surgeon || l.procedure) && (
          <span>
            🧑‍⚕️ {surgeon?.name}{surgeon && l.procedure ? " · " : ""}
            {l.cardId ? <Link className="link" to={`/cards/${l.cardId}`}>{l.procedure}</Link> : l.procedure}
          </span>
        )}
        {facility && <span>🏥 {facility.name}</span>}
        {l.caseDate && <span>🗓️ Case {formatDate(l.caseDate)}</span>}
        {l.neededBy && (
          <span className={overdue ? "neg" : ""}>
            ⏰ Needed {formatDate(l.neededBy)}
            {dNeeded !== null && (dNeeded < 0 ? ` (${-dNeeded}d late)` : dNeeded === 0 ? " (today)" : ` (${dNeeded}d)`)}
          </span>
        )}
      </div>

      {l.notes && <p className="loaner-notes">{l.notes}</p>}

      {/* Status pipeline — tap a step to set it. */}
      <div className="pipeline">
        {LOANER_STATUSES.map((s) => {
          const active = s.key === l.status;
          return (
            <button
              key={s.key}
              className={"pipe-step" + (active ? " active" : "")}
              onClick={() => setLoanerStatus(l.id, s.key)}
              title={`Mark ${s.label}`}
            >
              <span aria-hidden>{s.icon}</span>
              <span className="pipe-label">{s.label}</span>
            </button>
          );
        })}
      </div>

      <div className="loaner-actions">
        {l.repPhone && (
          <a className="btn btn-sm" href={`tel:${l.repPhone}`}>📞 Call {l.repName ?? "rep"}</a>
        )}
        {l.repPhone && (
          <a className="btn btn-sm" href={`sms:${l.repPhone}`}>💬 Text</a>
        )}
        <button className="btn btn-sm" onClick={onEdit}>Edit</button>
        {confirmDel ? (
          <span className="confirm">
            Delete?
            <button className="btn btn-danger btn-sm" onClick={() => deleteLoaner(l.id)}>Yes</button>
            <button className="btn btn-sm" onClick={() => setConfirmDel(false)}>No</button>
          </span>
        ) : (
          <button className="btn btn-sm btn-danger" onClick={() => setConfirmDel(true)}>Delete</button>
        )}
      </div>
    </div>
  );
}

function dateInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

function LoanerForm({ store, existing, onDone }: { store: Store; existing?: LoanerTray; onDone: () => void }) {
  const { state, addLoaner, updateLoaner } = store;
  const [f, setF] = useState({
    description: existing?.description ?? "",
    vendor: existing?.vendor ?? "",
    repName: existing?.repName ?? "",
    repPhone: existing?.repPhone ?? "",
    quantity: existing?.quantity?.toString() ?? "",
    poNumber: existing?.poNumber ?? "",
    surgeonId: existing?.surgeonId ?? "",
    facilityId: existing?.facilityId ?? "",
    cardId: existing?.cardId ?? "",
    procedure: existing?.procedure ?? "",
    caseDate: dateInput(existing?.caseDate),
    neededBy: dateInput(existing?.neededBy),
    notes: existing?.notes ?? "",
  });
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  // Offer the chosen surgeon's cards to link a procedure quickly.
  const surgeonCards = state.cards.filter((c) => c.surgeonId === f.surgeonId);

  function save() {
    if (!f.description.trim()) return;
    const payload = {
      description: f.description.trim(),
      vendor: f.vendor.trim() || undefined,
      repName: f.repName.trim() || undefined,
      repPhone: f.repPhone.trim() || undefined,
      quantity: f.quantity ? Number(f.quantity) : undefined,
      poNumber: f.poNumber.trim() || undefined,
      surgeonId: f.surgeonId || undefined,
      facilityId: f.facilityId || undefined,
      cardId: f.cardId || undefined,
      procedure: f.procedure.trim() || undefined,
      caseDate: f.caseDate || undefined,
      neededBy: f.neededBy || undefined,
      notes: f.notes.trim() || undefined,
    };
    if (existing) updateLoaner(existing.id, payload);
    else addLoaner(payload);
    onDone();
  }

  return (
    <div className="card form-card">
      <div className="form-grid">
        <label className="field field-wide"><span>What's needed</span>
          <input value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="Stryker Triathlon total knee set" autoFocus />
        </label>
        <label className="field"><span>Vendor</span>
          <input value={f.vendor} onChange={(e) => set("vendor", e.target.value)} placeholder="Stryker" />
        </label>
        <label className="field"><span># trays</span>
          <input type="number" min="1" value={f.quantity} onChange={(e) => set("quantity", e.target.value)} placeholder="3" />
        </label>
        <label className="field"><span>Rep name</span>
          <input value={f.repName} onChange={(e) => set("repName", e.target.value)} placeholder="Mike R." />
        </label>
        <label className="field"><span>Rep phone</span>
          <input type="tel" value={f.repPhone} onChange={(e) => set("repPhone", e.target.value)} placeholder="+1 512 555 0112" />
        </label>
        <label className="field"><span>Surgeon</span>
          <select value={f.surgeonId} onChange={(e) => set("surgeonId", e.target.value)}>
            <option value="">—</option>
            {state.surgeons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="field"><span>Facility</span>
          <select value={f.facilityId} onChange={(e) => set("facilityId", e.target.value)}>
            <option value="">—</option>
            {state.facilities.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </label>
        <label className="field"><span>Procedure</span>
          {surgeonCards.length > 0 ? (
            <select
              value={f.cardId}
              onChange={(e) => {
                const card = surgeonCards.find((c) => c.id === e.target.value);
                setF((s) => ({ ...s, cardId: e.target.value, procedure: card?.procedure ?? s.procedure }));
              }}
            >
              <option value="">— (or type below)</option>
              {surgeonCards.map((c) => <option key={c.id} value={c.id}>{c.procedure}</option>)}
            </select>
          ) : (
            <input value={f.procedure} onChange={(e) => set("procedure", e.target.value)} placeholder="Total Knee Arthroplasty" />
          )}
        </label>
        <label className="field"><span>Case date</span>
          <input type="date" value={f.caseDate} onChange={(e) => set("caseDate", e.target.value)} />
        </label>
        <label className="field"><span>Needed by (delivery)</span>
          <input type="date" value={f.neededBy} onChange={(e) => set("neededBy", e.target.value)} />
        </label>
        <label className="field"><span>PO #</span>
          <input value={f.poNumber} onChange={(e) => set("poNumber", e.target.value)} placeholder="PO-44821" />
        </label>
        <label className="field field-wide"><span>Notes</span>
          <textarea rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Confirm implant sizes, count sheets, etc." />
        </label>
      </div>
      <div className="form-actions">
        <button className="btn btn-primary" disabled={!f.description.trim()} onClick={save}>
          {existing ? "Save changes" : "Add request"}
        </button>
        <button className="btn" onClick={onDone}>Cancel</button>
      </div>
    </div>
  );
}
