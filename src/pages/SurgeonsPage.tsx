import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore, cardsForSurgeon } from "../state/store";
import { Avatar } from "../components/Avatar";

export function SurgeonsPage() {
  const { state, addSurgeon } = useStore();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [facility, setFacility] = useState("");

  function add() {
    if (!name.trim()) return;
    addSurgeon({ name: name.trim(), specialty: specialty.trim() || "General Surgery", facility: facility.trim() || undefined });
    setName(""); setSpecialty(""); setFacility(""); setAdding(false);
  }

  const surgeons = [...state.surgeons].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Surgeons</h1>
          <p className="muted">{state.surgeons.length} surgeons in your library.</p>
        </div>
        <div className="head-actions">
          <button className="btn btn-primary" onClick={() => setAdding((v) => !v)}>
            {adding ? "Close" : "+ Add surgeon"}
          </button>
        </div>
      </div>

      {adding && (
        <div className="card form-card">
          <div className="form-grid">
            <label className="field"><span>Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. Patel" autoFocus />
            </label>
            <label className="field"><span>Specialty</span>
              <input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Orthopedics" />
            </label>
            <label className="field"><span>Facility (optional)</span>
              <input value={facility} onChange={(e) => setFacility(e.target.value)} placeholder="Mercy General" />
            </label>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={add} disabled={!name.trim()}>Add surgeon</button>
            <button className="btn" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      {surgeons.length === 0 ? (
        <div className="empty-state">
          <span className="empty-emoji">🧑‍⚕️</span>
          <p>No surgeons yet. Add the surgeons you scrub for, then build their cards.</p>
        </div>
      ) : (
        <div className="surgeon-grid">
          {surgeons.map((s) => {
            const count = cardsForSurgeon(state, s.id).length;
            return (
              <Link key={s.id} to={`/surgeons/${s.id}`} className="surgeon-tile">
                <Avatar surgeon={s} size={44} />
                <div className="surgeon-tile-meta">
                  <div className="surgeon-name">{s.name}</div>
                  <div className="muted small">{[s.specialty, s.facility].filter(Boolean).join(" · ")}</div>
                </div>
                <span className="pill">{count} {count === 1 ? "card" : "cards"}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
