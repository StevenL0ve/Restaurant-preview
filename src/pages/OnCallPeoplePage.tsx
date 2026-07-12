import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore, onCallPositionOf, telHref } from "../state/store";
import { Avatar } from "../components/Avatar";
import { Icon } from "../components/Icon";
import { ON_CALL_CATEGORIES, type OnCallCategory, type OnCallPerson, type OnCallPosition } from "../types";

// Manage the on-call directory: the positions your OR covers and the pool of
// people who can take call for each. Kept separate from the board so the board
// stays a fast "who do I call right now" view.
export function OnCallPeoplePage() {
  const { state, addOnCallPosition } = useStore();
  const [posName, setPosName] = useState("");
  const [posCat, setPosCat] = useState<OnCallCategory>("OR Staff");
  const [editingPerson, setEditingPerson] = useState<string | "new" | null>(null);

  return (
    <div className="page page-narrow">
      <div className="detail-top">
        <Link className="link" to="/on-call">← On-call board</Link>
      </div>
      <div className="page-head">
        <div>
          <h1>People & positions</h1>
          <p className="muted">The roles you cover and everyone who can take call for them.</p>
        </div>
      </div>

      <div className="card settings-card">
        <h2>Positions</h2>
        <p className="muted small">The on-call roles staff need to reach — OR tech, circulator, surgeons, anesthesia.</p>
        {ON_CALL_CATEGORIES.map((cat) => {
          const list = state.onCallPositions.filter((p) => p.category === cat);
          if (!list.length) return null;
          return (
            <div key={cat} className="pos-group">
              <h3 className="pos-cat">{cat}</h3>
              <ul className="pos-list">
                {list.map((pos) => <PositionRow key={pos.id} position={pos} />)}
              </ul>
            </div>
          );
        })}
        <div className="pos-add">
          <input value={posName} onChange={(e) => setPosName(e.target.value)} placeholder="New position (e.g. Perfusionist — On call)" />
          <select value={posCat} onChange={(e) => setPosCat(e.target.value as OnCallCategory)}>
            {ON_CALL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            className="btn btn-sm btn-primary"
            disabled={!posName.trim()}
            onClick={() => { addOnCallPosition(posName.trim(), posCat); setPosName(""); }}
          >
            Add
          </button>
        </div>
      </div>

      <div className="card settings-card">
        <div className="card-head">
          <h2>People ({state.onCallPeople.length})</h2>
          {editingPerson !== "new" && (
            <button className="btn btn-sm btn-primary" onClick={() => setEditingPerson("new")}>+ Add person</button>
          )}
        </div>
        {editingPerson === "new" && (
          <PersonForm onDone={() => setEditingPerson(null)} />
        )}
        <ul className="people-list">
          {state.onCallPeople.length === 0 && editingPerson !== "new" && (
            <li className="muted small">No people yet — add the folks who take call.</li>
          )}
          {state.onCallPeople.map((p) =>
            editingPerson === p.id ? (
              <li key={p.id}><PersonForm existing={p} onDone={() => setEditingPerson(null)} /></li>
            ) : (
              <PersonRow key={p.id} person={p} onEdit={() => setEditingPerson(p.id)} />
            ),
          )}
        </ul>
      </div>
    </div>
  );
}

function PositionRow({ position }: { position: OnCallPosition }) {
  const { updateOnCallPosition, deleteOnCallPosition, state } = useStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(position.name);
  const [confirmDel, setConfirmDel] = useState(false);
  const poolCount = state.onCallPeople.filter((p) => p.positionIds.includes(position.id)).length;

  if (editing) {
    return (
      <li className="pos-row">
        <input value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn btn-sm btn-primary" onClick={() => { updateOnCallPosition(position.id, { name }); setEditing(false); }}>Save</button>
        <button className="btn btn-sm" onClick={() => { setName(position.name); setEditing(false); }}>Cancel</button>
      </li>
    );
  }
  return (
    <li className="pos-row">
      <span className="pos-name">{position.name}</span>
      <span className="muted small">{poolCount} in pool</span>
      <button className="icon-btn" title="Rename" onClick={() => setEditing(true)}><Icon name="edit" size={15} /></button>
      {confirmDel ? (
        <span className="confirm small">
          Remove?
          <button className="btn btn-danger btn-sm" onClick={() => deleteOnCallPosition(position.id)}>Yes</button>
          <button className="btn btn-sm" onClick={() => setConfirmDel(false)}>No</button>
        </span>
      ) : (
        <button className="icon-btn" title="Remove" onClick={() => setConfirmDel(true)}><Icon name="trash" size={15} /></button>
      )}
    </li>
  );
}

function PersonRow({ person, onEdit }: { person: OnCallPerson; onEdit: () => void }) {
  const { state, deleteOnCallPerson } = useStore();
  const [confirmDel, setConfirmDel] = useState(false);
  const tel = telHref(person.phone);
  return (
    <li className="person-row">
      <Avatar surgeon={person} size={38} />
      <div className="person-meta">
        <div className="person-name">{person.name} {person.role && <span className="muted small">{person.role}</span>}</div>
        <div className="person-positions">
          {person.positionIds.map((id) => {
            const pos = onCallPositionOf(state, id);
            return pos ? <span key={id} className="pill pill-pool">{pos.name}</span> : null;
          })}
          {person.positionIds.length === 0 && <span className="muted small">Not in any pool yet</span>}
        </div>
        {person.phone && <div className="muted small">{person.phone}</div>}
      </div>
      <div className="person-actions">
        {tel && <a className="btn btn-sm" href={tel}><Icon name="phone" size={14} /></a>}
        <button className="icon-btn" title="Edit" onClick={onEdit}><Icon name="edit" size={15} /></button>
        {confirmDel ? (
          <span className="confirm small">
            Delete?
            <button className="btn btn-danger btn-sm" onClick={() => deleteOnCallPerson(person.id)}>Yes</button>
            <button className="btn btn-sm" onClick={() => setConfirmDel(false)}>No</button>
          </span>
        ) : (
          <button className="icon-btn" title="Delete" onClick={() => setConfirmDel(true)}><Icon name="trash" size={15} /></button>
        )}
      </div>
    </li>
  );
}

function PersonForm({ existing, onDone }: { existing?: OnCallPerson; onDone: () => void }) {
  const { state, addOnCallPerson, updateOnCallPerson } = useStore();
  const [name, setName] = useState(existing?.name ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [role, setRole] = useState(existing?.role ?? "");
  const [positionIds, setPositionIds] = useState<string[]>(existing?.positionIds ?? []);
  const [notes, setNotes] = useState(existing?.notes ?? "");

  const toggle = (id: string) =>
    setPositionIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  function save() {
    if (!name.trim()) return;
    const payload = { name: name.trim(), phone: phone.trim() || undefined, role: role.trim() || undefined, positionIds, notes: notes.trim() || undefined };
    if (existing) updateOnCallPerson(existing.id, payload);
    else addOnCallPerson(payload);
    onDone();
  }

  return (
    <div className="assign-form">
      <div className="form-grid">
        <label className="field"><span>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" autoFocus /></label>
        <label className="field"><span>Phone</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 512 555 0199" inputMode="tel" /></label>
        <label className="field"><span>Role (optional)</span>
          <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="CST, RN, MD, CRNA…" /></label>
      </div>
      <div className="person-pos-pick">
        <span className="assign-when-label">In the pool for:</span>
        <div className="pos-checks">
          {state.onCallPositions.map((pos) => (
            <label key={pos.id} className={"pos-check" + (positionIds.includes(pos.id) ? " on" : "")}>
              <input type="checkbox" checked={positionIds.includes(pos.id)} onChange={() => toggle(pos.id)} />
              <span>{pos.name}</span>
            </label>
          ))}
          {state.onCallPositions.length === 0 && <span className="muted small">Add a position first.</span>}
        </div>
      </div>
      <label className="field field-wide"><span>Notes (optional)</span>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. prefers text, backup only" /></label>
      <div className="form-actions">
        <button className="btn btn-primary" disabled={!name.trim()} onClick={save}>{existing ? "Save" : "Add person"}</button>
        <button className="btn" onClick={onDone}>Cancel</button>
      </div>
    </div>
  );
}
