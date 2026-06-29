import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStore, cardsForSurgeon } from "../state/store";
import { Avatar } from "../components/Avatar";
import { totalItems, type Store } from "../state/store";
import type { Surgeon } from "../types";

export function SurgeonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const store = useStore();
  const { state, deleteSurgeon } = store;
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const sg = state.surgeons.find((s) => s.id === id);
  if (!sg) {
    return (
      <div className="page">
        <div className="empty-state">
          <span className="empty-emoji">🤔</span>
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
            !sg.gloveSize && <p className="muted small" style={{ margin: 0 }}>No glove size or quirks recorded yet — tap Edit to add them.</p>
          )}
        </div>
      )}

      <div className="page-head" style={{ marginTop: 26, marginBottom: 14 }}>
        <h2 style={{ fontSize: 17 }}>Cards ({cards.length})</h2>
      </div>
      {cards.length === 0 ? (
        <div className="empty-state">
          <span className="empty-emoji">🗂️</span>
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

      <div className="detail-actions" style={{ marginTop: 24 }}>
        {confirmDel ? (
          <span className="confirm">
            Delete {sg.name} and all {cards.length} of their cards?
            <button className="btn btn-danger btn-sm" onClick={() => { deleteSurgeon(sg.id); navigate("/surgeons"); }}>Delete</button>
            <button className="btn btn-sm" onClick={() => setConfirmDel(false)}>Cancel</button>
          </span>
        ) : (
          <button className="btn btn-danger" onClick={() => setConfirmDel(true)}>Delete surgeon</button>
        )}
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
