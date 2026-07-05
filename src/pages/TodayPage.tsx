import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  useStore,
  casesOn,
  localDay,
  surgeonOf,
  setupProgress,
  pendingLoanersForCard,
} from "../state/store";
import type { Store } from "../state/store";
import { Avatar } from "../components/Avatar";
import { Icon } from "../components/Icon";
import { accentStyle } from "../lib/accent";
import type { CaseEntry } from "../types";

// My day — the 6 AM screen: today's lineup in order, each case linked to its
// preference card with live setup progress and loaner readiness at a glance.

function labelFor(date: string): string {
  if (date === localDay(0)) return "Today";
  if (date === localDay(1)) return "Tomorrow";
  if (date === localDay(-1)) return "Yesterday";
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

function shiftDay(date: string, delta: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d + delta);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export function TodayPage() {
  const store = useStore();
  const { state } = store;
  const [date, setDate] = useState(() => localDay(0));
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<CaseEntry | null>(null);

  const cases = casesOn(state, date);

  return (
    <div className="page page-narrow">
      <div className="page-head">
        <div>
          <h1>My day</h1>
          <p className="muted">{cases.length === 0 ? "No cases scheduled." : `${cases.length} ${cases.length === 1 ? "case" : "cases"} lined up.`}</p>
        </div>
        <div className="head-actions">
          <button className="btn btn-primary" onClick={() => { setEditing(null); setAdding((v) => !v); }}>
            {adding ? "Close" : "+ Add case"}
          </button>
        </div>
      </div>

      <div className="day-nav">
        <button className="icon-btn" onClick={() => setDate((d) => shiftDay(d, -1))} aria-label="Previous day">
          <Icon name="back" size={18} />
        </button>
        <button className="day-label" onClick={() => setDate(localDay(0))} title="Jump to today">
          {labelFor(date)}
        </button>
        <button className="icon-btn" onClick={() => setDate((d) => shiftDay(d, 1))} aria-label="Next day">
          <Icon name="next" size={18} />
        </button>
      </div>

      {(adding || editing) && (
        <CaseForm store={store} date={date} existing={editing ?? undefined} onDone={() => { setAdding(false); setEditing(null); }} />
      )}

      {cases.length === 0 && !adding ? (
        <div className="empty-state">
          <span className="empty-emoji">🗓️</span>
          <p>Nothing on the board for {labelFor(date).toLowerCase()}. Tap <strong>Add case</strong> to build the lineup.</p>
        </div>
      ) : (
        <div className="case-list">
          {cases.map((c) => (
            <CaseRow key={c.id} entry={c} store={store} onEdit={() => { setAdding(false); setEditing(c); }} />
          ))}
        </div>
      )}
    </div>
  );
}

function CaseRow({ entry, store, onEdit }: { entry: CaseEntry; store: Store; onEdit: () => void }) {
  const { state, deleteCase } = store;
  const navigate = useNavigate();
  const [confirmDel, setConfirmDel] = useState(false);
  const card = state.cards.find((c) => c.id === entry.cardId);
  if (!card) {
    return (
      <div className="card case-row">
        <p className="muted small" style={{ margin: 0 }}>
          This case pointed at a deleted card.{" "}
          <button className="link" onClick={() => deleteCase(entry.id)}>Remove it</button>
        </p>
      </div>
    );
  }
  const sg = surgeonOf(state, card.surgeonId);
  const { done, total } = setupProgress(state, card);
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const ready = total > 0 && done === total;
  const pendingLoaners = pendingLoanersForCard(state, card.id);

  return (
    <div className="card case-row" style={accentStyle(card.specialty)}>
      <div className="case-top">
        <div className="case-when">
          <span className="case-time">{entry.time ?? "—"}</span>
          {entry.room && <span className="case-room">{entry.room}</span>}
        </div>
        {ready ? (
          <span className="status status-settled">Ready</span>
        ) : done > 0 ? (
          <span className="status status-reimbursement-requested">{pct}% pulled</span>
        ) : null}
      </div>

      <Link to={`/cards/${card.id}`} className="case-main">
        {sg && <Avatar surgeon={sg} size={34} />}
        <span className="case-text">
          <span className="case-proc">{card.procedure}</span>
          <span className="muted small">{sg?.name} · {card.specialty}</span>
        </span>
      </Link>

      {entry.notes && <p className="loaner-notes">{entry.notes}</p>}

      {pendingLoaners.length > 0 && (
        <Link to="/loaners" className="case-loaner-flag">
          <Icon name="truck" size={15} /> {pendingLoaners.length === 1
            ? `Loaner not ready: ${pendingLoaners[0].description}`
            : `${pendingLoaners.length} loaners not ready`}
        </Link>
      )}

      <div className="progress-track case-progress"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>

      <div className="loaner-actions">
        <button className="btn btn-sm btn-primary" onClick={() => navigate(`/cards/${card.id}/setup`)}>
          {ready ? "Review setup" : "Start setup"}
        </button>
        <button className="btn btn-sm" onClick={onEdit}>Edit</button>
        {confirmDel ? (
          <span className="confirm">
            Remove?
            <button className="btn btn-danger btn-sm" onClick={() => deleteCase(entry.id)}>Yes</button>
            <button className="btn btn-sm" onClick={() => setConfirmDel(false)}>No</button>
          </span>
        ) : (
          <button className="btn btn-sm" onClick={() => setConfirmDel(true)}>Remove</button>
        )}
      </div>
    </div>
  );
}

function CaseForm({ store, date, existing, onDone }: { store: Store; date: string; existing?: CaseEntry; onDone: () => void }) {
  const { state, addCase, updateCase } = store;
  const [cardId, setCardId] = useState(existing?.cardId ?? state.cards[0]?.id ?? "");
  const [time, setTime] = useState(existing?.time ?? "");
  const [room, setRoom] = useState(existing?.room ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");

  function save() {
    if (!cardId) return;
    const payload = { date: existing?.date ?? date, time: time || undefined, cardId, room: room.trim() || undefined, notes: notes.trim() || undefined };
    if (existing) updateCase(existing.id, payload);
    else addCase(payload);
    onDone();
  }

  return (
    <div className="card form-card">
      <div className="form-grid">
        <label className="field field-wide"><span>Procedure card</span>
          <select value={cardId} onChange={(e) => setCardId(e.target.value)}>
            {state.cards.map((c) => {
              const sg = surgeonOf(state, c.surgeonId);
              return <option key={c.id} value={c.id}>{c.procedure} — {sg?.name ?? "?"}</option>;
            })}
          </select>
        </label>
        <label className="field"><span>Time</span>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
        <label className="field"><span>Room</span>
          <input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="OR 4" />
        </label>
        <label className="field field-wide"><span>Notes</span>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Rep bringing trials, patient latex allergy flag, etc." />
        </label>
      </div>
      <div className="form-actions">
        <button className="btn btn-primary" disabled={!cardId} onClick={save}>{existing ? "Save" : "Add to lineup"}</button>
        <button className="btn" onClick={onDone}>Cancel</button>
      </div>
    </div>
  );
}
