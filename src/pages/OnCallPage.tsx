import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  useStore,
  currentOnCall,
  poolForPosition,
  upcomingShifts,
  onCallPersonOf,
  positionsByCategory,
  telHref,
} from "../state/store";
import { Avatar } from "../components/Avatar";
import { Icon } from "../components/Icon";
import { tapLight } from "../lib/haptics";
import { describeWindow, presetWindow, PRESETS, toLocalInputValue, fromLocalInputValue, type PresetKind } from "../lib/oncall";
import type { OnCallPerson, OnCallPosition } from "../types";

// The on-call board: who to call, per role, right now. Every position shows the
// current person with one-tap call/text, the full pool as a fallback (in case
// the schedule is blank or someone's covering informally), and an easy way to
// put someone on — search their name, tap, pick a window.
export function OnCallPage() {
  const { state } = useStore();
  const groups = useMemo(() => positionsByCategory(state), [state]);

  return (
    <div className="page page-narrow">
      <div className="page-head">
        <div>
          <h1>On call</h1>
          <p className="muted">Who’s on right now — tap a number to call from your phone.</p>
        </div>
        <div className="head-actions">
          <Link className="btn" to="/on-call/people">Manage people & positions</Link>
        </div>
      </div>

      {state.onCallPositions.length === 0 ? (
        <div className="empty-state">
          <span className="empty-emoji">📟</span>
          <p>No on-call positions yet. Add the roles your OR covers (OR tech, circulator, surgeons…).</p>
          <Link className="btn btn-primary" to="/on-call/people">Set up positions & people</Link>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.category} className="oncall-group">
            <h2 className="oncall-cat">{g.category}</h2>
            {g.positions.map((pos) => <PositionCard key={pos.id} position={pos} />)}
          </section>
        ))
      )}
    </div>
  );
}

function PositionCard({ position }: { position: OnCallPosition }) {
  const store = useStore();
  const { state, deleteOnCallShift } = store;
  const now = currentOnCall(state, position.id);
  const pool = poolForPosition(state, position.id);
  const upcoming = upcomingShifts(state, position.id);
  const [assigning, setAssigning] = useState(false);
  const [showPool, setShowPool] = useState(false);

  return (
    <div className={"card oncall-card" + (now ? "" : " oncall-card-empty")}>
      <div className="oncall-card-head">
        <div className="oncall-pos">
          <span className="oncall-bell" aria-hidden><Icon name="bell" size={18} /></span>
          <h3>{position.name}</h3>
        </div>
        {!assigning && (
          <button className="btn btn-sm" onClick={() => { tapLight(); setAssigning(true); }}>
            {now ? "Change" : "Set on-call"}
          </button>
        )}
      </div>

      {now ? (
        <div className="oncall-current">
          <Avatar surgeon={now.person} size={44} />
          <div className="oncall-who">
            <div className="oncall-name">{now.person.name} {now.person.role && <span className="oncall-role">{now.person.role}</span>}</div>
            <div className="muted small">{describeWindow(now.shift, Date.now())}</div>
            {now.shift.note && <div className="oncall-note small">“{now.shift.note}”</div>}
          </div>
          <div className="oncall-call">
            <CallButtons person={now.person} big />
            <button
              className="link small"
              onClick={() => { if (confirm(`Clear ${now.person.name} from ${position.name}?`)) deleteOnCallShift(now.shift.id); }}
            >
              Clear
            </button>
          </div>
        </div>
      ) : (
        <div className="oncall-none">
          <span className="oncall-none-flag">⚠️ No one is set on call for this position.</span>
          {pool.length > 0 && <span className="muted small">Pick from the {pool.length}-person pool below, or set someone.</span>}
        </div>
      )}

      {assigning && (
        <AssignForm position={position} onDone={() => setAssigning(false)} />
      )}

      {upcoming.length > 0 && (
        <div className="oncall-upcoming small">
          <strong>Next:</strong>{" "}
          {upcoming.slice(0, 2).map((s) => {
            const p = onCallPersonOf(state, s.personId);
            return <span key={s.id} className="oncall-up-item">{p?.name} · {describeWindow(s, Date.now())}</span>;
          })}
        </div>
      )}

      {pool.length > 0 && (
        <div className="oncall-pool">
          <button className="oncall-pool-toggle" onClick={() => setShowPool((v) => !v)}>
            <Icon name={showPool ? "next" : "next"} size={13} />
            <span>{showPool ? "Hide" : "Show"} on-call pool ({pool.length})</span>
          </button>
          {showPool && (
            <ul className="oncall-pool-list">
              {pool.map((p) => {
                const isNow = now?.person.id === p.id;
                return (
                  <li key={p.id} className={isNow ? "is-current" : ""}>
                    <Avatar surgeon={p} size={30} />
                    <div className="oncall-pool-meta">
                      <span className="oncall-pool-name">{p.name}{isNow && <span className="oncall-oncall-tag">on now</span>}</span>
                      {p.role && <span className="muted small">{p.role}</span>}
                    </div>
                    <CallButtons person={p} />
                    {!isNow && (
                      <button
                        className="btn btn-sm"
                        onClick={() => { tapLight(); store.assignOnCall(position.id, p.id, new Date().toISOString()); }}
                        title={`Put ${p.name} on call now`}
                      >
                        Put on call
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function CallButtons({ person, big }: { person: OnCallPerson; big?: boolean }) {
  const tel = telHref(person.phone);
  if (!tel) return <span className="muted small">No number on file</span>;
  const cls = "btn " + (big ? "btn-primary" : "btn-sm");
  return (
    <span className="call-buttons">
      <a className={cls} href={tel} onClick={() => tapLight()}>
        <Icon name="phone" size={big ? 17 : 14} /> {big ? "Call" : ""}
      </a>
      <a className={"btn " + (big ? "" : "btn-sm")} href={`sms:${person.phone!.replace(/[^\d+]/g, "")}`}>
        <Icon name="chat" size={big ? 17 : 14} /> {big ? "Text" : ""}
      </a>
    </span>
  );
}

// Put someone on call: search the whole directory, tap a name, choose a window.
function AssignForm({ position, onDone }: { position: OnCallPosition; onDone: () => void }) {
  const { state, assignOnCall, addOnCallPerson } = useStore();
  const [q, setQ] = useState("");
  const [personId, setPersonId] = useState<string>("");
  const [preset, setPreset] = useState<PresetKind>("now");
  const [start, setStart] = useState(toLocalInputValue(new Date().toISOString()));
  const [end, setEnd] = useState("");
  const [custom, setCustom] = useState(false);
  const [note, setNote] = useState("");
  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const inPool = (p: OnCallPerson) => p.positionIds.includes(position.id);
    return [...state.onCallPeople]
      .filter((p) => !needle || p.name.toLowerCase().includes(needle) || (p.role ?? "").toLowerCase().includes(needle))
      .sort((a, b) => Number(inPool(b)) - Number(inPool(a)) || a.name.localeCompare(b.name))
      .slice(0, 8);
  }, [q, state.onCallPeople, position.id]);

  const chosen = onCallPersonOf(state, personId);

  function applyPreset(kind: PresetKind) {
    setPreset(kind);
    setCustom(false);
    const w = presetWindow(kind, Date.now());
    setStart(toLocalInputValue(w.start));
    setEnd(toLocalInputValue(w.end));
  }

  function save() {
    let id = personId;
    if (addingNew && newName.trim()) {
      const p = addOnCallPerson({ name: newName.trim(), phone: newPhone.trim() || undefined, positionIds: [position.id] });
      id = p.id;
    }
    if (!id) return;
    const startISO = custom ? fromLocalInputValue(start) ?? new Date().toISOString() : presetWindow(preset, Date.now()).start;
    const endISO = custom ? fromLocalInputValue(end) : presetWindow(preset, Date.now()).end;
    assignOnCall(position.id, id, startISO, endISO, note);
    onDone();
  }

  const canSave = !!personId || (addingNew && newName.trim().length > 0);

  return (
    <div className="assign-form">
      <div className="assign-row">
        <label className="field field-wide">
          <span>Who’s on call?</span>
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPersonId(""); setAddingNew(false); }}
            placeholder="Search a name…"
            autoFocus
          />
        </label>
      </div>

      {!chosen && !addingNew && (
        <ul className="assign-results">
          {results.map((p) => (
            <li key={p.id}>
              <button className="assign-pick" onClick={() => { tapLight(); setPersonId(p.id); setQ(p.name); }}>
                <Avatar surgeon={p} size={28} />
                <span className="assign-pick-name">{p.name}</span>
                {p.role && <span className="muted small">{p.role}</span>}
                {p.positionIds.includes(position.id) && <span className="pill pill-pool">in pool</span>}
              </button>
            </li>
          ))}
          <li>
            <button className="assign-pick assign-add-new" onClick={() => { setAddingNew(true); setNewName(q); }}>
              <span className="assign-plus"><Icon name="plus" size={16} /></span>
              <span>Add “{q || "someone new"}” to the pool</span>
            </button>
          </li>
        </ul>
      )}

      {addingNew && (
        <div className="assign-newperson">
          <label className="field"><span>Name</span>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Full name" /></label>
          <label className="field"><span>Phone</span>
            <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+1 512 555 0199" inputMode="tel" /></label>
        </div>
      )}

      {chosen && (
        <div className="assign-chosen">
          <Avatar surgeon={chosen} size={32} />
          <span><strong>{chosen.name}</strong>{chosen.role && ` · ${chosen.role}`}</span>
          <button className="link small" onClick={() => { setPersonId(""); setQ(""); }}>change</button>
        </div>
      )}

      <div className="assign-when">
        <span className="assign-when-label">For how long?</span>
        <div className="chips">
          {PRESETS.map((p) => (
            <button key={p.kind} className={"chip" + (!custom && preset === p.kind ? " active" : "")} onClick={() => applyPreset(p.kind)}>
              {p.label}
            </button>
          ))}
          <button className={"chip" + (custom ? " active" : "")} onClick={() => setCustom(true)}>Custom dates</button>
        </div>
        {custom && (
          <div className="assign-custom">
            <label className="field"><span>Start</span>
              <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} /></label>
            <label className="field"><span>End (blank = until changed)</span>
              <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
          </div>
        )}
      </div>

      <label className="field field-wide"><span>Note (optional)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. covering for Dana" /></label>

      <div className="form-actions">
        <button className="btn btn-primary" disabled={!canSave} onClick={save}>Put on call</button>
        <button className="btn" onClick={onDone}>Cancel</button>
      </div>
    </div>
  );
}
