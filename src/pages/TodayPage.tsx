import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  useStore,
  casesOn,
  casesByRoom,
  localDay,
  surgeonOf,
  setupProgress,
  pendingLoanersForCard,
  cartForCase,
  dayNotesFor,
  getPullerName,
  onCallPersonRole,
} from "../state/store";
import type { Store } from "../state/store";
import { Avatar } from "../components/Avatar";
import { Icon } from "../components/Icon";
import { accentStyle } from "../lib/accent";
import { TEAM_ROLES, teamMemberLabel } from "../types";
import { stampLine } from "../lib/user";
import type { CaseEntry, TeamMember, TeamRole } from "../types";

// My day — the 6 AM screen: today's lineup in order, each case linked to its
// preference card with live setup progress and loaner readiness at a glance.

function labelFor(date: string): string {
  if (date === localDay(0)) return "Today";
  if (date === localDay(1)) return "Tomorrow";
  if (date === localDay(-1)) return "Yesterday";
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

// "OR 4" → the numeric field holding "4"; "Hybrid" → the named field.
export function parseRoomInput(room?: string): { named: boolean; value: string } {
  const t = (room ?? "").trim();
  if (!t) return { named: false, value: "" };
  const m = /^OR\s*(\d+[A-Za-z]?)$/i.exec(t);
  return m ? { named: false, value: m[1] } : { named: true, value: t };
}

function shiftDay(date: string, delta: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d + delta);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export function TodayPage() {
  const store = useStore();
  const { state } = store;
  // Search results land here with ?d=2026-10-26 to open that day's board.
  const [params] = useSearchParams();
  const paramDate = params.get("d");
  const validParam = paramDate && /^\d{4}-\d{2}-\d{2}$/.test(paramDate) ? paramDate : null;
  const [date, setDate] = useState(() => validParam ?? localDay(0));
  useEffect(() => { if (validParam) setDate(validParam); }, [validParam]);
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
          <Link className="btn" to="/case-log">My case log</Link>
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

      {adding && (
        <CaseForm store={store} date={date} onDone={() => setAdding(false)} />
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
                  // The edit form opens right where the case sits, so tapping
                  // Edit visibly does something even mid-scroll.
                  editing?.id === c.id ? (
                    <CaseForm key={c.id} store={store} date={date} existing={editing} onDone={() => setEditing(null)} />
                  ) : (
                    <CaseRow
                      key={c.id}
                      entry={c}
                      position={i}
                      canUp={!c.time && untimed.indexOf(c) > 0}
                      canDown={!c.time && untimed.indexOf(c) >= 0 && untimed.indexOf(c) < untimed.length - 1}
                      store={store}
                      onEdit={() => { setAdding(false); setEditing(c); }}
                    />
                  )
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
  const { state, deleteCase, moveCase, ensureCart, addDayNote, saveCard, updateCase } = store;
  const navigate = useNavigate();
  const [confirmDel, setConfirmDel] = useState(false);
  const [noting, setNoting] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [teamDraft, setTeamDraft] = useState<TeamMember[] | null>(null); // null = panel closed
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

  // Where this case's cart stands in the day's pull pipeline.
  const cart = cartForCase(state, card.id, entry.date);
  const pulledCount = cart ? Object.keys(cart.pulls).length : 0;
  const openMissing = cart ? cart.missing.filter((m) => !m.resolvedAt).length : 0;
  const cartStage: "queue" | "queued" | "pulling" | "needs-qc" | "qcd" =
    !cart ? "queue"
    : cart.qcDone ? "qcd"
    : cart.donePulling ? "needs-qc"
    : pulledCount > 0 ? "pulling"
    : "queued";
  const cartText = {
    queue: "Not in pull queue",
    queued: "In pull queue, not pulled",
    pulling: "Cart being pulled",
    "needs-qc": "Cart pulled, needs QC",
    qcd: "Cart QC'd",
  }[cartStage];
  const cartBtn = { queue: "Pull cart", queued: "Pull cart", pulling: "Keep pulling", "needs-qc": "QC cart", qcd: "View cart" }[cartStage];
  function openCart() {
    const k = cart ?? ensureCart(card!.id, entry.date);
    navigate(`/carts/${k.id}`);
  }

  const caseNotes = dayNotesFor(state, card.id, entry.date);
  function saveNote(permanent: boolean) {
    const t = noteText.trim();
    if (!t) return;
    if (permanent) {
      const prev = card!.specialConsiderations?.trim();
      const stamp = stampLine(getPullerName() || undefined, new Date().toISOString());
      const line = stamp ? `${t} (${stamp})` : t;
      saveCard({ ...card!, specialConsiderations: prev ? `${prev}\n${line}` : line });
    } else {
      addDayNote(card!.id, entry.date, t, getPullerName() || undefined);
    }
    setNoteText("");
    setNoting(false);
  }

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

      {(entry.team?.length ?? 0) > 0 && (
        <div className="case-team">
          {entry.team!.map((m) => (
            <span key={m.id} className="team-chip">{teamMemberLabel(m)}</span>
          ))}
        </div>
      )}

      {caseNotes.length > 0 && (
        <div className="case-day-notes">
          {caseNotes.map((n) => (
            <p key={n.id} className="case-day-note">
              <span className="today-pill">this case</span> {n.text}
              <span className="muted small"> · {stampLine(n.by, n.createdAt) || "unsigned"}</span>
            </p>
          ))}
        </div>
      )}

      <button className={`cart-status cs-${cartStage}`} onClick={openCart} title="Open this case's cart">
        <span className="cart-chip">{cartText}</span>
        {openMissing > 0 && <span className="cart-missing">{openMissing} missing</span>}
        {cartStage === "pulling" && <span className="muted small">{pulledCount} pulled</span>}
      </button>

      {pendingLoaners.length > 0 && (
        <Link to="/loaners" className="case-loaner-flag">
          <Icon name="truck" size={15} /> {pendingLoaners.length === 1
            ? `Loaner not ready: ${pendingLoaners[0].description}`
            : `${pendingLoaners.length} loaners not ready`}
        </Link>
      )}

      <div className="progress-track case-progress"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>

      <div className="loaner-actions">
        <button className="btn btn-sm btn-primary" onClick={openCart}>{cartBtn}</button>
        <button className="btn btn-sm" onClick={() => navigate(`/cards/${card.id}/setup`)}>
          {ready ? "Review setup" : "Start setup"}
        </button>
        <button className="btn btn-sm" onClick={onEdit}>Edit</button>
        {teamDraft === null && (
          <button className="btn btn-sm" onClick={() => setTeamDraft(entry.team ?? [])}>Team</button>
        )}
        <button className="btn btn-sm" onClick={() => setNoting((v) => !v)}>Team note</button>
        {confirmDel ? (
          <span className="confirm">
            Cancel this case?
            <button className="btn btn-danger btn-sm" onClick={() => deleteCase(entry.id)}>Yes, cancel it</button>
            <button className="btn btn-sm" onClick={() => setConfirmDel(false)}>Keep it</button>
          </span>
        ) : (
          <button className="btn btn-sm" onClick={() => setConfirmDel(true)}>Cancel case</button>
        )}
      </div>

      {teamDraft !== null && (
        <div className="case-note-form">
          {/* Edits stay a draft until saved, so changing your mind is free. */}
          <TeamEditor team={teamDraft} onChange={setTeamDraft} />
          <div className="form-actions">
            <button
              className="btn btn-sm btn-primary"
              onClick={() => {
                updateCase(entry.id, { team: teamDraft.length ? teamDraft : undefined });
                setTeamDraft(null);
              }}
            >
              Save team
            </button>
            <button className="btn btn-sm" onClick={() => setTeamDraft(null)}>Cancel</button>
          </div>
        </div>
      )}

      {noting && (
        <div className="case-note-form">
          <textarea
            rows={2}
            value={noteText}
            autoFocus
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="For the puller or the room team: open the smaller trials, extra Raytecs up, rep bringing…"
          />
          <div className="form-actions">
            <button className="btn btn-sm btn-primary" disabled={!noteText.trim()} onClick={() => saveNote(false)}>
              This case only
            </button>
            <button className="btn btn-sm" disabled={!noteText.trim()} onClick={() => saveNote(true)}>
              On the card going forward
            </button>
            <button className="btn btn-sm" onClick={() => { setNoting(false); setNoteText(""); }}>Cancel</button>
          </div>
          <p className="muted small" style={{ margin: 0 }}>
            "This case only" shows on the cart and setup just for {labelFor(entry.date).toLowerCase()}. "Going forward" adds it to the preference card's special considerations.
          </p>
        </div>
      )}
    </div>
  );
}

// Add/edit a case the way the board thinks: pick the room, and the app asks
// for a start TIME only when this is the room's first case. Everything else
// is just an order: OR 1 Case 2, OR 1 Case 3. Followers can be slotted into
// any position; they never carry a clock time.
function CaseForm({ store, date, existing, onDone }: { store: Store; date: string; existing?: CaseEntry; onDone: () => void }) {
  const { state, addCase, updateCase, moveCase, ensureCart, deleteCart } = store;
  const [cardId, setCardId] = useState(existing?.cardId ?? state.cards[0]?.id ?? "");
  const [caseDate, setCaseDate] = useState(existing?.date ?? date);
  const [time, setTime] = useState(existing?.time ?? "");
  // Rooms are "OR" + a number for almost everyone, so the form supplies the
  // "OR" and the user just types the number. Named rooms (Hybrid, Cysto)
  // flip to a free-text field.
  const initialRoom = parseRoomInput(existing?.room);
  const [namedRoom, setNamedRoom] = useState(initialRoom.named);
  const [roomVal, setRoomVal] = useState(initialRoom.value);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [team, setTeam] = useState<TeamMember[]>(existing?.team ?? []);
  const [orderChoice, setOrderChoice] = useState<number | null>(null); // index among the room's followers

  const theDate = /^\d{4}-\d{2}-\d{2}$/.test(caseDate) ? caseDate : (existing?.date ?? date);
  const roomKey = namedRoom ? roomVal.trim() : roomVal.trim() ? `OR ${roomVal.trim()}` : "";
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
      team: team.length ? team : undefined,
    };
    let id: string;
    if (existing) {
      updateCase(existing.id, payload);
      // Rescheduling or switching cards keeps the queue honest: queue a cart
      // for the new card+day, and drop the old one if it was never touched
      // and no other case still needs it.
      ensureCart(cardId, theDate);
      if (existing.date !== theDate || existing.cardId !== cardId) {
        const old = state.carts.find((k) => k.cardId === existing.cardId && k.date === existing.date);
        const othersUse = state.cases.some(
          (c) => c.id !== existing.id && c.cardId === existing.cardId && c.date === existing.date,
        );
        const untouched = old && Object.keys(old.pulls).length === 0 && !old.donePulling && old.missing.length === 0;
        if (old && untouched && !othersUse) deleteCart(old.id);
      }
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
        <label className="field"><span>{existing ? "Date (move to reschedule)" : "Date"}</span>
          <input
            type="date"
            value={caseDate}
            onChange={(e) => { setCaseDate(e.target.value); setOrderChoice(null); }}
          />
        </label>
        <div className="field"><span>Room</span>
          {namedRoom ? (
            <input
              value={roomVal}
              onChange={(e) => { setRoomVal(e.target.value); setOrderChoice(null); }}
              placeholder="Hybrid, Cysto, …"
              list="day-rooms"
            />
          ) : (
            <span className="prefix-input">
              <span className="input-prefix">OR</span>
              <input
                value={roomVal}
                inputMode="numeric"
                onChange={(e) => { setRoomVal(e.target.value); setOrderChoice(null); }}
                placeholder="1"
                aria-label="OR number"
              />
            </span>
          )}
          <button
            type="button"
            className="link small room-mode-toggle"
            onClick={() => { setNamedRoom((v) => !v); setRoomVal(""); setOrderChoice(null); }}
          >
            {namedRoom ? "It's a numbered OR" : "Room has a name (Hybrid, Cysto…)"}
          </button>
          <datalist id="day-rooms">
            {dayRooms.map((r) => <option key={r} value={r} />)}
          </datalist>
        </div>
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
        <TeamEditor team={team} onChange={setTeam} />
      </div>
      <div className="form-actions">
        <button className="btn btn-primary" disabled={!cardId} onClick={save}>{existing ? "Save" : "Add to lineup"}</button>
        <button className="btn" onClick={onDone}>Cancel</button>
      </div>
      {existing?.updatedBy && (
        <p className="muted small" style={{ margin: "8px 0 0" }}>
          Last changed: {stampLine(existing.updatedBy, existing.updatedAt)}
        </p>
      )}
    </div>
  );
}

// The room team, filled in as assignments are known: surgeons, nurses,
// techs, trainees (with a level), Phase II students, anesthesia.
function TeamEditor({ team, onChange }: { team: TeamMember[]; onChange: (t: TeamMember[]) => void }) {
  const { state, upsertStaff } = useStore();
  const [role, setRole] = useState<TeamRole>("nurse");
  const [level, setLevel] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");

  // Known staff for this role first, then everyone else: pick from the list
  // or free-type a new person, who joins the directory for next time.
  const suggestions = [...state.staff]
    .sort((a, b) => (a.role === role === (b.role === role) ? a.name.localeCompare(b.name) : a.role === role ? -1 : 1))
    .map((m) => m.name)
    .filter((n, i, arr) => arr.indexOf(n) === i);

  // Live matches as the name is typed (datalist gets no UI on iOS, so the
  // search has to be visible). Tapping one adds that person, with the role
  // the directory knows them by.
  const q = name.trim().toLowerCase();
  const onTeam = new Set(team.map((t) => t.name.toLowerCase()));
  // Everyone the app already knows: the staff directory plus the on-call
  // people (their typed role, or one read from their "RN"/"CST" label).
  const known = new Map<string, { name: string; role: TeamRole; level?: 1 | 2 | 3 }>();
  for (const p of state.onCallPeople) {
    const r = onCallPersonRole(p);
    if (r) known.set(p.name.toLowerCase(), { name: p.name, role: r });
  }
  for (const m of state.staff) known.set(m.name.toLowerCase(), { name: m.name, role: m.role, level: m.level });
  const matches = q
    ? [...known.values()]
        .filter((m) => m.name.toLowerCase().includes(q) && !onTeam.has(m.name.toLowerCase()))
        .sort((a, b) => (a.role === role === (b.role === role) ? a.name.localeCompare(b.name) : a.role === role ? -1 : 1))
        .slice(0, 6)
    : [];

  function addKnown(m: { name: string; role: TeamRole; level?: 1 | 2 | 3 }) {
    onChange([
      ...team,
      {
        id: `tm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        role: m.role,
        name: m.name,
        level: m.role === "trainee" ? m.level : undefined,
      },
    ]);
    upsertStaff(m.name, m.role, m.role === "trainee" ? m.level : undefined);
    setName("");
  }

  function add() {
    const n = name.trim();
    if (!n) return;
    const known = state.staff.find((m) => m.name.toLowerCase() === n.toLowerCase() && m.role === "trainee");
    const lvl = role === "trainee" ? (known?.level ?? level) : undefined;
    onChange([
      ...team,
      {
        id: `tm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        role,
        name: n,
        level: lvl,
      },
    ]);
    upsertStaff(n, role, lvl);
    setName("");
  }

  return (
    <div className="field field-wide"><span>Room team (when known)</span>
      {team.length > 0 && (
        <div className="team-chips">
          {team.map((m) => (
            <span key={m.id} className="team-chip">
              {teamMemberLabel(m)}
              <button
                type="button"
                className="chip-del"
                aria-label={`Remove ${m.name}`}
                onClick={() => onChange(team.filter((x) => x.id !== m.id))}
              >✕</button>
            </span>
          ))}
        </div>
      )}
      <div className="team-add">
        <select value={role} onChange={(e) => setRole(e.target.value as TeamRole)} aria-label="Role">
          {TEAM_ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
        </select>
        {role === "trainee" && (
          <select value={level} onChange={(e) => setLevel(Number(e.target.value) as 1 | 2 | 3)} aria-label="Trainee level">
            <option value={1}>Level I</option>
            <option value={2}>Level II</option>
            <option value={3}>Level III</option>
          </select>
        )}
        <input
          value={name}
          placeholder="Name"
          list="staff-names"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        />
        <datalist id="staff-names">
          {suggestions.map((n) => <option key={n} value={n} />)}
        </datalist>
        <button type="button" className="btn btn-sm" disabled={!name.trim()} onClick={add}>Add</button>
      </div>
      {matches.length > 0 && (
        <div className="staff-suggest">
          {matches.map((m) => (
            <button
              key={`${m.name}|${m.role}`}
              type="button"
              className="chip chip-sm"
              onClick={() => addKnown(m)}
            >
              + {teamMemberLabel(m as TeamMember)}
            </button>
          ))}
        </div>
      )}
      <p className="muted small" style={{ margin: "6px 0 0" }}>
        {matches.length > 0
          ? "Tap a match to add them, or finish typing for someone new."
          : "New names are remembered for next time. Import a whole roster in Settings."}
      </p>
    </div>
  );
}
