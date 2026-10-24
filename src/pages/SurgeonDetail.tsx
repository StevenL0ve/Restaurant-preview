import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStore, cardsForSurgeon, localDay } from "../state/store";
import { Avatar } from "../components/Avatar";
import { totalItems, type Store } from "../state/store";
import type { Surgeon } from "../types";

export function SurgeonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const store = useStore();
  const { state, deleteSurgeon } = store;
  const [editing, setEditing] = useState(false);

  const sg = state.surgeons.find((s) => s.id === id);
  if (!sg) {
    return (
      <div className="page">
        <div className="empty-state">
          <p>No such surgeon. <Link className="link" to="/surgeons">Back to surgeons</Link>.</p>
        </div>
      </div>
    );
  }
  const cards = cardsForSurgeon(state, sg.id);

  return (
    <div className="page">
      <div className="detail-top">
        <Link className="link" to="/surgeons">← Surgeons</Link>
      </div>

      <div className="page-head">
        <div className="surgeon-header">
          <Avatar surgeon={sg} size={52} />
          <div>
            <h1>{sg.name}</h1>
            <p className="muted">{[sg.specialty, sg.facility].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
        <div className="head-actions">
          <button className="btn" onClick={() => setEditing((v) => !v)}>{editing ? "Close" : "Edit"}</button>
          <button className="btn btn-primary" onClick={() => navigate("/cards/new")}>+ New card</button>
        </div>
      </div>

      {editing ? (
        <SurgeonForm surgeon={sg} store={store} onDone={() => setEditing(false)} />
      ) : (
        <div className="card detail-meta">
          {sg.gloveSize && (
            <div className="meta-row">
              <span className="meta-label">Gloves</span>
              <span className="meta-value"><strong>{sg.gloveSize}</strong>{sg.gloveType ? ` · ${sg.gloveType}` : ""}</span>
            </div>
          )}
          {sg.quirks ? (
            <div className="meta-row note">
              <span className="meta-label">Quirks</span>
              <span className="meta-value">{sg.quirks}</span>
            </div>
          ) : (
            !sg.gloveSize && <p className="muted small" style={{ margin: 0 }}>No glove size or quirks recorded yet. Tap Edit to add them.</p>
          )}
        </div>
      )}

      <div className="page-head" style={{ marginTop: 26, marginBottom: 14 }}>
        <h2 style={{ fontSize: 17 }}>Cards ({cards.length})</h2>
      </div>
      {cards.length === 0 ? (
        <div className="empty-state">
          <p>No cards for {sg.name} yet.</p>
        </div>
      ) : (
        <div className="card-grid">
          {cards.map((c) => (
            <Link key={c.id} to={`/cards/${c.id}`} className="pref-tile-body simple">
              <div className="pref-proc">{c.procedure}{c.favorite ? " ★" : ""}</div>
              <div className="pref-tile-foot">
                <span className="pill">{totalItems(c)} items</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <SurgeonSchedule sgId={sg.id} />

      <DeleteSurgeonZone
        sg={sg}
        cardCount={cards.length}
        onDelete={() => { deleteSurgeon(sg.id); navigate("/surgeons"); }}
      />
    </div>
  );
}

// Deleting a surgeon erases their profile AND every preference card under
// them, so it is deliberately not a one-tap red button: it hides behind a
// quiet link and only arms after the surgeon's last name is typed back.
function DeleteSurgeonZone({ sg, cardCount, onDelete }: { sg: Surgeon; cardCount: number; onDelete: () => void }) {
  const { state } = useStore();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");

  const lastName = sg.name.trim().split(/\s+/).pop() ?? sg.name;
  const armed = typed.trim().toLowerCase() === lastName.toLowerCase();
  const cardIds = new Set(state.cards.filter((c) => c.surgeonId === sg.id).map((c) => c.id));
  const bookedCases = state.cases.filter((c) => cardIds.has(c.cardId)).length;

  if (!open) {
    return (
      <p className="danger-zone-link">
        <button className="link small" onClick={() => { setTyped(""); setOpen(true); }}>
          Delete this surgeon…
        </button>
      </p>
    );
  }

  return (
    <div className="card danger-zone">
      <h2>Delete {sg.name}?</h2>
      <p className="muted small">
        This permanently erases their profile and all {cardCount} of their preference
        {cardCount === 1 ? " card" : " cards"}
        {bookedCases > 0 ? `, and leaves ${bookedCases} scheduled ${bookedCases === 1 ? "case" : "cases"} on the board without a card` : ""}.
        There is no undo. To keep the cards, reassign them to another surgeon first (open a card, Edit, change the surgeon).
      </p>
      <label className="field field-wide"><span>Type the last name "{lastName}" to confirm</span>
        <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={lastName} autoFocus />
      </label>
      <div className="form-actions">
        <button className="btn btn-danger" disabled={!armed} onClick={onDelete}>
          Permanently delete
        </button>
        <button className="btn" onClick={() => setOpen(false)}>Keep {sg.name}</button>
      </div>
    </div>
  );
}

function SurgeonForm({ surgeon, store, onDone }: { surgeon: Surgeon; store: Store; onDone: () => void }) {
  const [name, setName] = useState(surgeon.name);
  const [specialty, setSpecialty] = useState(surgeon.specialty);
  const [facility, setFacility] = useState(surgeon.facility ?? "");
  const [gloveSize, setGloveSize] = useState(surgeon.gloveSize ?? "");
  const [gloveType, setGloveType] = useState(surgeon.gloveType ?? "");
  const [quirks, setQuirks] = useState(surgeon.quirks ?? "");

  function save() {
    store.updateSurgeon(surgeon.id, {
      name: name.trim() || surgeon.name,
      specialty: specialty.trim(),
      facility: facility.trim() || undefined,
      gloveSize: gloveSize.trim() || undefined,
      gloveType: gloveType.trim() || undefined,
      quirks: quirks.trim() || undefined,
    });
    onDone();
  }

  return (
    <div className="card form-card">
      <div className="form-grid">
        <label className="field"><span>Name</span><input value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="field"><span>Specialty</span><input value={specialty} onChange={(e) => setSpecialty(e.target.value)} /></label>
        <label className="field"><span>Facility</span><input value={facility} onChange={(e) => setFacility(e.target.value)} placeholder="Mercy General" /></label>
        <label className="field"><span>Glove size</span><input value={gloveSize} onChange={(e) => setGloveSize(e.target.value)} placeholder="7.0" /></label>
        <label className="field field-wide"><span>Glove type</span><input value={gloveType} onChange={(e) => setGloveType(e.target.value)} placeholder="Biogel, latex-free" /></label>
        <label className="field field-wide"><span>Quirks & preferences</span>
          <textarea rows={3} value={quirks} onChange={(e) => setQuirks(e.target.value)} placeholder="Music, room temp, temperament, count habits…" />
        </label>
      </div>
      <div className="form-actions">
        <button className="btn btn-primary" onClick={save}>Save</button>
        <button className="btn" onClick={onDone}>Cancel</button>
      </div>
    </div>
  );
}

// This doctor's spot on the schedule: cases coming up, and recent past ones,
// pulled from the My day board wherever one of their cards is booked.
function SurgeonSchedule({ sgId }: { sgId: string }) {
  const { state } = useStore();
  const today = localDay(0);
  const cardIds = new Set(state.cards.filter((c) => c.surgeonId === sgId).map((c) => c.id));
  const theirs = state.cases
    .filter((c) => cardIds.has(c.cardId))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "99").localeCompare(b.time ?? "99"));
  const upcoming = theirs.filter((c) => c.date >= today);
  const past = theirs.filter((c) => c.date < today).reverse().slice(0, 20);
  if (upcoming.length === 0 && past.length === 0) return null;

  const fmt = (date: string) => {
    const [y, m, d] = date.split("-").map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  };
  const row = (c: (typeof theirs)[number]) => {
    const card = state.cards.find((k) => k.id === c.cardId);
    return (
      <Link key={c.id} className="card log-row" to={`/today?d=${c.date}`}>
        <span className="log-when">
          <strong>{fmt(c.date)}</strong>
          <span className="muted small">{[c.room, c.time ?? "to follow"].filter(Boolean).join(" · ")}</span>
        </span>
        <span className="log-what"><span className="log-proc">{card?.procedure ?? "Case"}</span></span>
      </Link>
    );
  };

  return (
    <>
      {upcoming.length > 0 && (
        <>
          <div className="page-head" style={{ marginTop: 26, marginBottom: 14 }}>
            <h2 style={{ fontSize: 17 }}>On the schedule ({upcoming.length})</h2>
          </div>
          <div className="case-list">{upcoming.map(row)}</div>
        </>
      )}
      {past.length > 0 && (
        <>
          <div className="page-head" style={{ marginTop: 26, marginBottom: 14 }}>
            <h2 style={{ fontSize: 17 }}>Recent cases</h2>
          </div>
          <div className="case-list">{past.map(row)}</div>
        </>
      )}
    </>
  );
}
