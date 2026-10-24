import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  useStore,
  casesOn,
  casesByRoom,
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
          <p>Nothing on the board for {labelFor(date).toLowerCase()}. Tap <strong>Add case</strong> to build the lineup.</p>
        </div>
      ) : (
        casesByRoom(state, date).map((g) => {
          const untimed = g.cases.filter((c) => !c.time);
          return (
            <section key={g.room || "no-room"} className="room-group">
              <h2 className="room-head">
                {g.room || "No room set"}
                {g.cases[0]?.time && <span className="muted small"> · first case {g.cases[0].time}</span>}
              </h2>
              <div className="case-list">
                {g.cases.map((c, i) => (
                  <CaseRow
                    key={c.id}
                    entry={c}
                    position={i}
                    canUp={!c.time && untimed.indexOf(c) > 0}
                    canDown={!c.time && untimed.indexOf(c) >= 0 && untimed.indexOf(c) < untimed.length - 1}
                    store={store}
                    onEdit={() => { setAdding(false); setEditing(c); }}
                  />
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}

function CaseRow({ entry, position, canUp, canDown, store, onEdit }: {
  entry: CaseEntry;
  position: number;
  canUp: boolean;
  canDown: boolean;
  store: Store;
  onEdit: () => void;
}) {
  const { state, deleteCase, moveCase } = store;
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
          <span className="case-time">
            {`Case ${position + 1}`}
            {entry.time ? ` · ${entry.time}` : position > 0 ? " · to follow" : ""}
          </span>
          {(canUp || canDown) && (
            <span className="case-reorder">
              <button className="icon-btn" disabled={!canUp} aria-label="Move earlier" onClick={() => moveCase(entry.id, -1)}>↑</button>
              <button className="icon-btn" disabled={!canDown} aria-label="Move later" onClick={() => moveCase(entry.id, 1)}>↓</button>
            </span>
          )}
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

// Add/edit a case the way the board thinks: pick the room, and the app asks
// for a start TIME only when this is the room's first case. Everything else
// is just an order: OR 1 Case 2, OR 1 Case 3. Followers can be slotted into
// any position; they never carry a clock time.
function CaseForm({ store, date, existing, onDone }: { store: Store; date: string; existing?: CaseEntry; onDone: () => void }) {
  const { state, addCase, updateCase, moveCase } = store;
  const [cardId, setCardId] = useState(existing?.cardId ?? state.cards[0]?.id ?? "");
  const [time, setTime] = useState(existing?.time ?? "");
  const [room, setRoom] = useState(existing?.room ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [orderChoice, setOrderChoice] = useState<number | null>(null); // index among the room's followers

  const theDate = existing?.date ?? date;
  const roomKey = room.trim();
  // The room's other cases for that day decide what we ask for.
  const roomCases = state.cases.filter(
    (c) => c.date === theDate && (c.room?.trim() ?? "") === roomKey && c.id !== existing?.id,
  );
  const timedCount = roomCases.filter((c) => c.time).length;
  const untimed = roomCases.filter((c) => !c.time);
  // This case may carry the time when the room has no other timed case
  // (covers an empty room AND a room whose first case was cancelled), or
  // when it already holds a time itself (editing never strips it silently).
  const isFirstCase = timedCount === 0 || !!existing?.time;
  const dayRooms = [...new Set(state.cases.filter((c) => c.date === theDate && c.room?.trim()).map((c) => c.room!.trim()))];

  // Where this case currently sits among the room's followers (array order),
  // when editing one; a new case defaults to the end of the line.
  // Array position decides where it sits among the (possibly new) room's
  // followers after save, so moving rooms still honors the chosen slot.
  const arrayIdx = existing ? state.cases.findIndex((c) => c.id === existing.id) : Number.POSITIVE_INFINITY;
  const currentIdx = existing && !existing.time
    ? untimed.filter((c) => state.cases.indexOf(c) < arrayIdx).length
    : untimed.length;
  const followerIdx = Math.min(orderChoice ?? currentIdx, untimed.length);

  function save() {
    if (!cardId) return;
    const first = isFirstCase;
    const payload = {
      date: theDate,
      time: first ? (time || undefined) : undefined,
      cardId,
      room: roomKey || undefined,
      notes: notes.trim() || undefined,
    };
    let id: string;
    if (existing) {
      updateCase(existing.id, payload);
      id = existing.id;
    } else {
      id = addCase(payload).id;
    }
    // A follower lands at its current (or last) slot; walk it to the chosen one.
    if (!first) {
      const from = existing && !existing.time ? currentIdx : untimed.length;
      const steps = from - followerIdx;
      for (let i = 0; i < steps; i++) moveCase(id, -1);
      for (let i = 0; i < -steps; i++) moveCase(id, 1);
    }
    onDone();
  }

  return (
    <div className="card form-card">
      <div className="form-grid">
        <label className="field field-wide"><span>Procedure card</span>
          <select value={cardId} onChange={(e) => setCardId(e.target.value)}>
            {state.cards.map((c) => {
              const sg = surgeonOf(state, c.surgeonId);
              return <option key={c.id} value={c.id}>{c.procedure} · {sg?.name ?? "?"}</option>;
            })}
          </select>
        </label>
        <label className="field"><span>Room</span>
          <input value={room} onChange={(e) => { setRoom(e.target.value); setOrderChoice(null); }} placeholder="OR 4" list="day-rooms" />
          <datalist id="day-rooms">
            {dayRooms.map((r) => <option key={r} value={r} />)}
          </datalist>
        </label>
        {isFirstCase ? (
          <label className="field"><span>First case start time</span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
        ) : (
          <label className="field"><span>Case order</span>
            <select value={followerIdx} onChange={(e) => setOrderChoice(Number(e.target.value))}>
              {Array.from({ length: untimed.length + 1 }, (_, j) => (
                <option key={j} value={j}>{`${roomKey || "Room"} Case ${timedCount + j + 1}`}</option>
              ))}
            </select>
          </label>
        )}
        <p className="muted small" style={{ gridColumn: "1 / -1", margin: 0 }}>
          {isFirstCase
            ? "This is the room's first case, so it gets the start time."
            : `${roomKey || "This room"} already has a first start. This case just takes its place in line; turnover sets its time.`}
        </p>
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
