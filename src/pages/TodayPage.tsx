import { useEffect, useState } from "react";
import { NavIcon } from "../components/NavIcon";
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
  uid,
  onCallPersonRole,
  facilityOf,
  locationLabelOf,
} from "../state/store";
import type { Store } from "../state/store";
import { Avatar } from "../components/Avatar";
import { Icon } from "../components/Icon";
import { accentStyle } from "../lib/accent";
import { TEAM_ROLES, teamMemberLabel } from "../types";
import { stampLine } from "../lib/user";
import { RecentChanges } from "../components/RecentChanges";
import { useFacilityReps } from "../lib/reps";
import { loanerStatusLabel } from "../types";
import { cardsPdfBlob, cardsPdfFilename, type CardPdfEntry } from "../lib/cardPdf";
import { cartLink } from "../lib/links";
import { shareBlobFile } from "../lib/share";
import type { CaseEntry, TeamMember, TeamRole } from "../types";
import { PhiNote } from "../components/PhiNote";
import { useAuth } from "../state/auth";
import { usePermissions } from "../lib/permissions";

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
  const { user: me } = useAuth();
  const perms = usePermissions(me?.uid, me?.email);
  const store = useStore();
  const { state, updateCase, deleteCase, ensureCart } = store;
  // Search results land here with ?d=2026-10-26 to open that day's board.
  const [params] = useSearchParams();
  const paramDate = params.get("d");
  const validParam = paramDate && /^\d{4}-\d{2}-\d{2}$/.test(paramDate) ? paramDate : null;
  const [date, setDate] = useState(() => validParam ?? localDay(0));
  useEffect(() => { if (validParam) setDate(validParam); }, [validParam]);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<CaseEntry | null>(null);

  const cases = casesOn(state, date);

  const pendingApprovals = state.cases.filter((c) => c.approval);
  return (
    <div className="page page-narrow">
      <div className="page-head">
        <div>
          <h1 className="page-title"><NavIcon name="myday" size={40} />My day</h1>
          <p className="muted">{cases.length === 0 ? "No cases scheduled." : `${cases.length} ${cases.length === 1 ? "case" : "cases"} lined up.`}</p>
        </div>
        <div className="head-actions">
          {perms.canAddCase && (
            <button className="btn btn-primary" onClick={() => { setEditing(null); setAdding((v) => !v); }}>
              {adding ? "Close" : perms.needsApproval ? "+ Request a case" : "+ Add case"}
            </button>
          )}
          <Link className="btn" to="/case-log">My case log</Link>
          {cases.length > 0 && <PrintDayButton date={date} />}
        </div>
      </div>

      {perms.isAdmin && pendingApprovals.length > 0 && (
        <div className="card form-card approvals-tile">
          <div className="card-head"><h2>Awaiting your approval ({pendingApprovals.length})</h2></div>
          {pendingApprovals.map((c) => {
            const card = state.cards.find((k) => k.id === c.cardId);
            return (
              <div key={c.id} className="member-row">
                <div className="member-main">
                  <strong>{c.approval!.kind === "add" ? "Add" : "Cancel"}: {card?.procedure ?? "case"}</strong>
                  <div className="muted small">{c.date}{c.time ? ` ${c.time}` : ""}{c.room ? ` · ${c.room}` : ""} · asked by {c.approval!.by ?? "someone"}</div>
                </div>
                <div className="member-actions">
                  <button className="btn btn-sm btn-primary" onClick={() => {
                    if (c.approval!.kind === "add") { updateCase(c.id, { approval: undefined }); ensureCart(c.cardId, c.date); }
                    else deleteCase(c.id);
                  }}>Approve</button>
                  <button className="btn btn-sm" onClick={() => {
                    if (c.approval!.kind === "add") deleteCase(c.id);
                    else updateCase(c.id, { approval: undefined });
                  }}>Reject</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

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

      <RecentChanges kinds={["schedule"]} title="Who changed the schedule" />
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
  const { state, deleteCase, moveCase, ensureCart, addDayNote, saveCard, updateCase, deleteCart, moveCart } = store;
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const perms = usePermissions(me?.uid, me?.email);
  const [confirmDel, setConfirmDel] = useState(false);
  const [resched, setResched] = useState<string | null>(null); // new date while the panel is open
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
  // Is the cart pulled, and does another case that day still need it?
  const cartPulled = !!cart && (pulledCount > 0 || !!cart.donePulling || !!cart.qcDone);
  const cartShared = state.cases.some((c) => c.id !== entry.id && c.cardId === entry.cardId && c.date === entry.date);
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
        {perms.canAddCase && !entry.approval && resched === null && (
          <button className="btn btn-sm" onClick={() => setResched(entry.date)}>Reschedule</button>
        )}
        {perms.canCancelCase && !entry.approval && (confirmDel ? (
          <span className="confirm">
            {perms.needsApproval ? "Ask an admin to cancel this case?" : "Cancel this case?"}
            {perms.needsApproval ? (
              <button className="btn btn-danger btn-sm" onClick={() => { updateCase(entry.id, { approval: { kind: "cancel", by: getPullerName() || undefined, at: new Date().toISOString() } }); setConfirmDel(false); }}>Send request</button>
            ) : cartPulled && !cartShared ? (
              <>
                <button className="btn btn-danger btn-sm" onClick={() => { deleteCase(entry.id); deleteCart(cart!.id); }}>Cancel, put cart away</button>
                <button className="btn btn-sm" onClick={() => deleteCase(entry.id)}>Cancel, keep pulled cart</button>
              </>
            ) : (
              <button className="btn btn-danger btn-sm" onClick={() => { deleteCase(entry.id); if (cart && !cartShared) deleteCart(cart.id); }}>Yes, cancel it</button>
            )}
            <button className="btn btn-sm" onClick={() => setConfirmDel(false)}>Keep it</button>
          </span>
        ) : (
          <button className="btn btn-sm" onClick={() => setConfirmDel(true)}>Cancel case</button>
        ))}
      </div>

      {entry.approval && (
        <p className="muted small" style={{ margin: "6px 0 0" }}>
          {entry.approval.kind === "add" ? "Requested, waiting for an admin to approve." : "Cancellation requested, waiting for an admin."}
        </p>
      )}

      {resched !== null && (
        <div className="case-note-form">
          <label className="field"><span>New date</span>
            <input type="date" value={resched} onChange={(e) => setResched(e.target.value)} />
          </label>
          {cartPulled ? (
            <>
              <p className="muted small" style={{ margin: "4px 0" }}>This case's cart is already pulled. What happens to it?</p>
              <div className="form-actions">
                <button className="btn btn-sm btn-primary" disabled={!resched || resched === entry.date} onClick={() => {
                  updateCase(entry.id, { date: resched! });
                  if (cart && !cartShared) moveCart(cart.id, resched!); else ensureCart(card.id, resched!);
                  setResched(null);
                }}>Keep the pulled cart for the new date</button>
                <button className="btn btn-sm" disabled={!resched || resched === entry.date} onClick={() => {
                  updateCase(entry.id, { date: resched! });
                  if (cart && !cartShared) deleteCart(cart.id);
                  ensureCart(card.id, resched!);
                  setResched(null);
                }}>Put it away, repull later</button>
                <button className="btn btn-sm" onClick={() => setResched(null)}>Never mind</button>
              </div>
            </>
          ) : (
            <div className="form-actions">
              <button className="btn btn-sm btn-primary" disabled={!resched || resched === entry.date} onClick={() => {
                updateCase(entry.id, { date: resched! });
                if (cart && !cartShared) deleteCart(cart.id);
                ensureCart(card.id, resched!);
                setResched(null);
              }}>Move case</button>
              <button className="btn btn-sm" onClick={() => setResched(null)}>Never mind</button>
            </div>
          )}
        </div>
      )}

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
          <PhiNote />
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
  const { state, addCase, updateCase, moveCase, ensureCart, deleteCart, addLoaner } = store;
  const { user: me } = useAuth();
  const perms = usePermissions(me?.uid, me?.email);
  // Booking the same card on a day whose cart is already pulled (say, a
  // cancelled case being rebooked): ask before reusing it.
  const [reusePrompt, setReusePrompt] = useState<null | "ask" | "reuse" | "fresh">(null);
  const [cardId, setCardId] = useState(existing?.cardId ?? state.cards[0]?.id ?? "");
  // Rep set requests: company, rep, and the sets/implants/supplies needed.
  // Each becomes a loaner request linked to this case, tracked on Loaners.
  const reps = useFacilityReps();
  const [repDrafts, setRepDrafts] = useState<{ company: string; rep: string; items: string }[]>([]);
  const [repOpen, setRepOpen] = useState(false);
  const [repCompany, setRepCompany] = useState("");
  const [repWho, setRepWho] = useState("");
  const [repItems, setRepItems] = useState("");
  const knownVendors = [...new Set([...state.loaners.map((l) => l.vendor).filter(Boolean) as string[], ...reps.map((r) => r.position?.replace(/^vendor rep\s*/i, "") ?? "").filter(Boolean)])];
  const existingRequests = existing ? state.loaners.filter((l) => l.caseId === existing.id) : [];
  function addRepDraft() {
    if (!repCompany.trim()) return;
    setRepDrafts((d) => [...d, { company: repCompany.trim(), rep: repWho.trim(), items: repItems.trim() }]);
    setRepCompany(""); setRepWho(""); setRepItems(""); setRepOpen(false);
  }
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

  function save(choice?: "reuse" | "fresh") {
    if (!cardId) return;
    if (!existing && !choice) {
      const leftover = state.carts.find((k) => k.cardId === cardId && k.date === theDate);
      const inUse = state.cases.some((c) => c.cardId === cardId && c.date === theDate);
      const pulled = leftover && (Object.keys(leftover.pulls).length > 0 || leftover.donePulling || leftover.qcDone);
      if (leftover && pulled && !inUse) { setReusePrompt("ask"); return; }
    }
    if (choice === "fresh") {
      const leftover = state.carts.find((k) => k.cardId === cardId && k.date === theDate);
      if (leftover) deleteCart(leftover.id);
    }
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
      id = addCase(perms.needsApproval
        ? { ...payload, approval: { kind: "add" as const, by: getPullerName() || undefined, at: new Date().toISOString() } }
        : payload).id;
    }
    // Each rep set request becomes a loaner request tied to this case, so
    // the rep (when they have an account) sees it and the OR tracks it.
    const card = state.cards.find((c) => c.id === cardId);
    for (const d of repDrafts) {
      const rep = reps.find((r) => r.uid === d.rep || r.name === d.rep);
      const now = new Date().toISOString();
      addLoaner({
        description: `${d.company} sets for ${card?.procedure ?? "case"}`,
        vendor: d.company,
        repName: rep?.name ?? (d.rep || undefined),
        repPhone: rep?.phone ?? undefined,
        repEmail: rep?.email ?? undefined,
        repUid: rep?.uid,
        caseId: id,
        cardId,
        surgeonId: card?.surgeonId,
        procedure: card?.procedure,
        caseDate: theDate,
        requestedBy: getPullerName() || undefined,
        sets: d.items.split(/\n+/).map((t) => t.trim()).filter(Boolean).map((name) => ({ id: uid("set"), name, photos: [], status: "requested" as const, history: [{ status: "requested" as const, at: now }] })),
      });
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
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Rep bringing trials, latex-free setup, etc." />
          <PhiNote />
        </label>
        <TeamEditor team={team} onChange={setTeam} />
      </div>
    <div className="field field-wide"><span>Rep sets needed (optional)</span>
        {existingRequests.map((l) => (
          <div key={l.id} className="rep-draft">
            <strong>{l.vendor ?? l.description}</strong>{l.repName ? ` · ${l.repName}` : ""} · {loanerStatusLabel(l.status)}
            {l.sets.length > 0 && <div className="muted small">{l.sets.map((x) => x.name).join(", ")}</div>}
            <Link className="link small" to="/loaners">Track</Link>
          </div>
        ))}
        {repDrafts.map((d, i) => (
          <div key={i} className="rep-draft">
            <strong>{d.company}</strong>{d.rep ? ` · ${reps.find((r) => r.uid === d.rep)?.name ?? d.rep}` : ""}
            {d.items && <div className="muted small">{d.items.split(/\n+/).filter(Boolean).join(", ")}</div>}
            <button type="button" className="link small" onClick={() => setRepDrafts((x) => x.filter((_, j) => j !== i))}>Remove</button>
          </div>
        ))}
        {repOpen ? (
          <div className="rep-form">
            <input value={repCompany} onChange={(e) => setRepCompany(e.target.value)} placeholder="Company (Stryker, Zimmer, Arthrex…)" list="rep-vendors" autoCapitalize="words" />
            <datalist id="rep-vendors">{knownVendors.map((v) => <option key={v} value={v} />)}</datalist>
            {reps.length > 0 ? (
              <select value={repWho} onChange={(e) => setRepWho(e.target.value)}>
                <option value="">Rep (optional)</option>
                {reps.map((r) => <option key={r.uid} value={r.uid}>{r.name}{r.position ? ` · ${r.position}` : ""}</option>)}
                <option value="__other">Someone else…</option>
              </select>
            ) : null}
            {(reps.length === 0 || repWho === "__other") && (
              <input value={repWho === "__other" ? "" : repWho} onChange={(e) => setRepWho(e.target.value)} placeholder="Rep's name (optional)" autoCapitalize="words" />
            )}
            <textarea value={repItems} onChange={(e) => setRepItems(e.target.value)} rows={3} placeholder={"Sets, implants, supplies, or equipment, one per line\nTriathlon primary set\nTibial trials"} />
            <div className="form-actions">
              <button type="button" className="btn btn-sm btn-primary" disabled={!repCompany.trim()} onClick={addRepDraft}>Add request</button>
              <button type="button" className="btn btn-sm" onClick={() => setRepOpen(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="form-actions"><button type="button" className="btn btn-sm" onClick={() => setRepOpen(true)}>+ Rep set request</button></div>
        )}
        <span className="muted small">Each request shows on Loaners with its status. A rep with an ORSync account linked to this facility sees it on their phone.</span>
        </div>

      <div className="form-actions">
        {reusePrompt === "ask" ? (
          <span className="confirm">
            A cart for this card on this day was already pulled. Reuse it?
            <button className="btn btn-primary btn-sm" onClick={() => { setReusePrompt(null); save("reuse"); }}>Reuse the pulled cart</button>
            <button className="btn btn-sm" onClick={() => { setReusePrompt(null); save("fresh"); }}>Start a fresh cart</button>
          </span>
        ) : (
          <button className="btn btn-primary" disabled={!cardId} onClick={() => save()}>{existing ? "Save" : perms.needsApproval ? "Send for approval" : "Add to lineup"}</button>
        )}
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

// Print the whole day: every case's preference card as ONE document, in
// room-and-case order, each page carrying a QR code that opens that exact
// case's live cart. Tape them to the carts; scans stay current.
function PrintDayButton({ date }: { date: string }) {
  const store = useStore();
  const { state, ensureCart } = store;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setErr(null);
    try {
      const entries: CardPdfEntry[] = [];
      for (const g of casesByRoom(state, date)) {
        g.cases.forEach((c, i) => {
          const card = state.cards.find((k) => k.id === c.cardId);
          if (!card) return;
          const cart = cartForCase(state, card.id, c.date) ?? ensureCart(card.id, c.date);
          entries.push({
            card,
            surgeon: surgeonOf(state, card.surgeonId),
            facility: facilityOf(state, card.facilityId),
            locationName: (id) => locationLabelOf(state, id),
            dayConsiderations: dayNotesFor(state, card.id, date).map((n) => n.text),
            link: { url: cartLink(cart.id), label: "Scan for this case's live cart" },
            caseLine: `${g.room || "No room"} · Case ${i + 1}${c.time ? ` · ${c.time}` : i > 0 ? " · to follow" : ""}`,
          });
        });
      }
      if (!entries.length) return;
      const blob = await cardsPdfBlob(entries);
      await shareBlobFile(
        cardsPdfFilename(date),
        blob,
        `Preference cards for ${date}: ${entries.length} ${entries.length === 1 ? "case" : "cases"}, in case order. Scan any page's code for that case's live cart.`,
        "application/pdf",
      );
    } catch {
      setErr("Couldn't build the PDF. Try again.");
      setTimeout(() => setErr(null), 4000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="btn" disabled={busy} onClick={go}>{busy ? "Building…" : "Print day"}</button>
      {err && <span className="neg small">{err}</span>}
    </>
  );
}
