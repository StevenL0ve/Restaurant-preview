import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  useStore,
  loanersSorted,
  loanersByFacility,
  loanerStats,
  isLoanerOverdue,
  isLoanerSoon,
  getRepMode,
  surgeonOf,
  facilityOf,
} from "../state/store";
import type { Store } from "../state/store";
import {
  LOANER_STATUSES,
  loanerStatusIndex,
  loanerStatusLabel,
  type LoanerSet,
  type LoanerStatus,
  type LoanerTray,
} from "../types";
import { formatDate, daysUntil } from "../lib/format";
import { filesToDataUrls } from "../lib/photos";
import { tapLight, tapMedium } from "../lib/haptics";

// Loaner-tray tracking, LoanerLink style: the clinic requests sets from a rep
// (with the case context the rep needs), the rep confirms with named sets,
// layer photos, and an ETA, and each set is tracked through the full SPD
// pipeline: checked in, decon, assembly, sterilizer, cooling, case cart, room,
// checked out. The request travels between clinic and rep as a .orsync file,
// the same way shared cards do. Rep mode regroups this page by facility.
export function LoanersPage() {
  const store = useStore();
  const { state } = store;
  const repMode = getRepMode();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<LoanerTray | null>(null);
  const [filter, setFilter] = useState<"active" | "all">("active");

  const stats = loanerStats(state);
  const loaners = useMemo(() => {
    const all = loanersSorted(state);
    return filter === "all" ? all : all.filter((l) => l.status !== "checked-out");
  }, [state, filter]);

  const byFacility = useMemo(() => {
    if (!repMode) return null;
    const keep = new Set(loaners.map((l) => l.id));
    return loanersByFacility(state)
      .map(([name, list]) => [name, list.filter((l) => keep.has(l.id))] as const)
      .filter(([, list]) => list.length > 0);
  }, [state, loaners, repMode]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Loaner trays</h1>
          <p className="muted">
            {repMode ? "Rep view: your sets, grouped by facility. " : ""}
            {stats.active} active
            {stats.overdue > 0 && <> · <span className="neg">{stats.overdue} overdue</span></>}
            {stats.soon > 0 && <> · {stats.soon} arriving soon</>}
          </p>
        </div>
        <div className="head-actions">
          {repMode && <Link className="btn" to="/loaners/storage">Storage & stock</Link>}
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
            {f === "active" ? "Active" : "All (incl. checked out)"}
          </button>
        ))}
      </div>

      {loaners.length === 0 ? (
        <div className="empty-state">
          <p>
            No loaner trays here.{" "}
            {repMode
              ? "When a clinic sends you a request file, open it and it lands on this screen."
              : <>Tap <strong>New request</strong> to track vendor sets for a case, then send the request to your rep.</>}
          </p>
        </div>
      ) : byFacility ? (
        byFacility.map(([name, list]) => (
          <section key={name} className="rep-facility-group">
            <h2 className="tpl-specialty">{name} · {list.length} request{list.length === 1 ? "" : "s"}</h2>
            <div className="loaner-list">
              {list.map((l) => (
                <LoanerCard key={l.id} loaner={l} store={store} repMode onEdit={() => { setAdding(false); setEditing(l); }} />
              ))}
            </div>
          </section>
        ))
      ) : (
        <div className="loaner-list">
          {loaners.map((l) => (
            <LoanerCard key={l.id} loaner={l} store={store} repMode={false} onEdit={() => { setAdding(false); setEditing(l); }} />
          ))}
        </div>
      )}
    </div>
  );
}

function statusSelect(value: LoanerStatus, onPick: (s: LoanerStatus) => void, label: string) {
  return (
    <select
      className="loc-select status-select"
      value={value}
      aria-label={label}
      onChange={(e) => { tapMedium(); onPick(e.target.value as LoanerStatus); }}
    >
      {LOANER_STATUSES.map((s) => (
        <option key={s.key} value={s.key}>{s.label}</option>
      ))}
    </select>
  );
}

function LoanerCard({ loaner: l, store, repMode, onEdit }: { loaner: LoanerTray; store: Store; repMode: boolean; onEdit: () => void }) {
  const { state, setLoanerStatus, deleteLoaner, sendLoanerFile } = store;
  const [confirmDel, setConfirmDel] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const surgeon = surgeonOf(state, l.surgeonId ?? "");
  const facility = facilityOf(state, l.facilityId);
  const surgeonName = surgeon?.name ?? l.surgeonName;
  const facilityName = facility?.name ?? l.facilityName;
  const overdue = isLoanerOverdue(l);
  const soon = isLoanerSoon(l);
  const dNeeded = daysUntil(l.neededBy);

  async function send() {
    tapLight();
    const r = await sendLoanerFile(l.id);
    setSent(r === "downloaded" ? "File saved. Send it by text, email, or chat." : null);
    setTimeout(() => setSent(null), 3000);
  }

  return (
    <div className={"card loaner-card" + (overdue ? " overdue" : "")}>
      <div className="loaner-top">
        <div>
          <div className="loaner-desc">{l.description}</div>
          <div className="muted small">
            {[l.vendor, l.quantity ? `${l.quantity} ${l.quantity === 1 ? "set" : "sets"} expected` : null, l.poNumber]
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
        {(surgeonName || l.procedure) && (
          <span>
            {surgeonName}{surgeonName && l.procedure ? " · " : ""}
            {l.cardId ? <Link className="link" to={`/cards/${l.cardId}`}>{l.procedure}</Link> : l.procedure}
          </span>
        )}
        {facilityName && <span>{facilityName}</span>}
        {l.caseDate && <span>Case {formatDate(l.caseDate)}</span>}
        {l.neededBy && (
          <span className={overdue ? "neg" : ""}>
            Needed {formatDate(l.neededBy)}
            {dNeeded !== null && (dNeeded < 0 ? ` (${-dNeeded}d late)` : dNeeded === 0 ? " (today)" : ` (${dNeeded}d)`)}
          </span>
        )}
        {l.estimatedDelivery && <span>ETA {formatDate(l.estimatedDelivery)}</span>}
        {l.clinicContact && <span>Clinic contact: {l.clinicContact}</span>}
        {l.requestedBy && <span>Requested by {l.requestedBy}</span>}
      </div>

      {/* Rep contact: everything needed to reach them in one tap. */}
      {(l.repName || l.repPhone || l.repEmail || l.altContact) && (
        <div className="rep-contact">
          <span className="rep-contact-name">
            {l.repName ?? "Rep"}{l.vendor ? ` · ${l.vendor}` : ""}
          </span>
          <span className="rep-contact-actions">
            {l.repPhone && <a className="btn btn-sm" href={`tel:${l.repPhone}`}>Call</a>}
            {l.repPhone && <a className="btn btn-sm" href={`sms:${l.repPhone}`}>Text</a>}
            {l.repEmail && <a className="btn btn-sm" href={`mailto:${l.repEmail}`}>Email</a>}
          </span>
          {l.altContact && <span className="muted small">Alternate: {l.altContact}</span>}
        </div>
      )}

      {l.notes && <p className="loaner-notes"><strong>Special considerations:</strong> {l.notes}</p>}

      <div className="loaner-status-row">
        <span className="muted small">Request status</span>
        {statusSelect(l.status, (s) => setLoanerStatus(l.id, s), "Request status")}
      </div>

      <SetList loaner={l} store={store} />

      <div className="loaner-actions">
        <button className="btn btn-sm btn-primary" onClick={send}>
          {repMode ? "Send update to clinic" : "Send request to rep"}
        </button>
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
      {sent && <p className="muted small">{sent}</p>}
    </div>
  );
}

// ---- Sets: named trays with layer photos and their own pipeline ------------

function SetList({ loaner: l, store }: { loaner: LoanerTray; store: Store }) {
  const { addLoanerSet } = store;
  const [name, setName] = useState("");

  function add() {
    if (!name.trim()) return;
    tapLight();
    addLoanerSet(l.id, name);
    setName("");
  }

  return (
    <div className="set-list">
      <div className="set-list-head">
        <h3>Sets ({l.sets.length})</h3>
        {l.sets.length > 0 && (
          <span className="muted small">
            Furthest behind: {loanerStatusLabel(
              l.sets.reduce((min, s) => (loanerStatusIndex(s.status) < loanerStatusIndex(min) ? s.status : min), l.sets[0].status,
            ))}
          </span>
        )}
      </div>
      {l.sets.map((s) => <SetRow key={s.id} loaner={l} set={s} store={store} />)}
      <div className="set-add">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Add a set: Triathlon Primary, tray 2 of 4"
        />
        <button className="btn btn-sm" disabled={!name.trim()} onClick={add}>Add set</button>
      </div>
    </div>
  );
}

function SetRow({ loaner: l, set: s, store }: { loaner: LoanerTray; set: LoanerSet; store: Store }) {
  const { setLoanerSetStatus, deleteLoanerSet, addLoanerSetPhotos, removeLoanerSetPhoto } = store;
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null);
  const stepIdx = loanerStatusIndex(s.status);
  const next = LOANER_STATUSES[stepIdx + 1];

  async function onPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    e.target.value = "";
    if (!files?.length) return;
    setBusy(true);
    try {
      const urls = await filesToDataUrls(files);
      if (urls.length) addLoanerSetPhotos(l.id, s.id, urls);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="set-row">
      <div className="set-row-top">
        <span className="set-name">{s.name}</span>
        <span className="set-step muted small">step {stepIdx + 1}/{LOANER_STATUSES.length}</span>
        <button className="info-del" aria-label={`Remove set ${s.name}`} onClick={() => deleteLoanerSet(l.id, s.id)}>✕</button>
      </div>
      <div className="set-row-status">
        {statusSelect(s.status, (v) => setLoanerSetStatus(l.id, s.id, v), `Status of ${s.name}`)}
        {next && (
          <button className="btn btn-sm" onClick={() => { tapMedium(); setLoanerSetStatus(l.id, s.id, next.key); }}>
            → {next.label}
          </button>
        )}
      </div>
      <div className="set-photos">
        {s.photos.map((p, i) => (
          <span key={i} className="set-thumb">
            <button className="set-thumb-open" onClick={() => setViewing(i)} aria-label={`View photo ${i + 1} of ${s.name}`}>
              <img src={p} alt={`${s.name}, layer ${i + 1}`} loading="lazy" />
            </button>
            <button className="set-thumb-del" aria-label={`Delete photo ${i + 1}`} onClick={() => removeLoanerSetPhoto(l.id, s.id, i)}>✕</button>
          </span>
        ))}
        <button className="btn btn-sm" disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? "Adding…" : s.photos.length ? "+ Photos" : "+ Layer photos"}
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onPhotos} />
      </div>
      {viewing !== null && s.photos[viewing] && (
        <button className="lightbox" onClick={() => setViewing(null)} aria-label="Close photo">
          <img src={s.photos[viewing]} alt={`${s.name}, layer ${viewing + 1}`} />
          <span className="muted small">{s.name} · layer {viewing + 1} of {s.photos.length} · tap to close</span>
        </button>
      )}
    </div>
  );
}

// ---- Request form -----------------------------------------------------------

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
    repEmail: existing?.repEmail ?? "",
    altContact: existing?.altContact ?? "",
    clinicContact: existing?.clinicContact ?? "",
    requestedBy: existing?.requestedBy ?? "",
    quantity: existing?.quantity?.toString() ?? "",
    poNumber: existing?.poNumber ?? "",
    surgeonId: existing?.surgeonId ?? "",
    facilityId: existing?.facilityId ?? "",
    cardId: existing?.cardId ?? "",
    procedure: existing?.procedure ?? "",
    caseDate: dateInput(existing?.caseDate),
    neededBy: dateInput(existing?.neededBy),
    estimatedDelivery: dateInput(existing?.estimatedDelivery),
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
      repEmail: f.repEmail.trim() || undefined,
      altContact: f.altContact.trim() || undefined,
      clinicContact: f.clinicContact.trim() || undefined,
      requestedBy: f.requestedBy.trim() || undefined,
      quantity: f.quantity ? Number(f.quantity) : undefined,
      poNumber: f.poNumber.trim() || undefined,
      surgeonId: f.surgeonId || undefined,
      facilityId: f.facilityId || undefined,
      cardId: f.cardId || undefined,
      procedure: f.procedure.trim() || undefined,
      caseDate: f.caseDate || undefined,
      neededBy: f.neededBy || undefined,
      estimatedDelivery: f.estimatedDelivery || undefined,
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
        <label className="field"><span>Company / vendor</span>
          <input value={f.vendor} onChange={(e) => set("vendor", e.target.value)} placeholder="Stryker" />
        </label>
        <label className="field"><span># sets expected</span>
          <input type="number" min="1" value={f.quantity} onChange={(e) => set("quantity", e.target.value)} placeholder="3" />
        </label>
        <label className="field"><span>Rep name</span>
          <input value={f.repName} onChange={(e) => set("repName", e.target.value)} placeholder="Mike R." />
        </label>
        <label className="field"><span>Rep phone</span>
          <input type="tel" value={f.repPhone} onChange={(e) => set("repPhone", e.target.value)} placeholder="+1 512 555 0112" />
        </label>
        <label className="field"><span>Rep email</span>
          <input type="email" value={f.repEmail} onChange={(e) => set("repEmail", e.target.value)} placeholder="mike@vendor.com" />
        </label>
        <label className="field"><span>Alternate contact</span>
          <input value={f.altContact} onChange={(e) => set("altContact", e.target.value)} placeholder="Sam K. +1 512 555 0177" />
        </label>
        <label className="field"><span>Clinic contact (for the rep)</span>
          <input value={f.clinicContact} onChange={(e) => set("clinicContact", e.target.value)} placeholder="SPD desk +1 512 555 0190" />
        </label>
        <label className="field"><span>Requested by</span>
          <input value={f.requestedBy} onChange={(e) => set("requestedBy", e.target.value)} placeholder="Steven" />
        </label>
        <label className="field"><span>Surgeon</span>
          <select value={f.surgeonId} onChange={(e) => set("surgeonId", e.target.value)}>
            <option value="">(none)</option>
            {state.surgeons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="field"><span>Facility</span>
          <select value={f.facilityId} onChange={(e) => set("facilityId", e.target.value)}>
            <option value="">(none)</option>
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
              <option value="">(or type below)</option>
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
        <label className="field"><span>Estimated delivery (rep's ETA)</span>
          <input type="date" value={f.estimatedDelivery} onChange={(e) => set("estimatedDelivery", e.target.value)} />
        </label>
        <label className="field"><span>PO #</span>
          <input value={f.poNumber} onChange={(e) => set("poNumber", e.target.value)} placeholder="PO-44821" />
        </label>
        <label className="field field-wide"><span>Special considerations</span>
          <textarea rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Implant sizes to confirm, count sheets, dock time limits…" />
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
