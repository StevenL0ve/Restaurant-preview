import { useState } from "react";
import { useStore, locationsForFacility, areasForFacility } from "../state/store";
import { locationLabel, type Facility, type Location } from "../types";
import type { Store } from "../state/store";

// Manage the per-facility location sets. Editing a location here updates every
// card that references it — that's the whole point of shared locations.
export function FacilitiesPage() {
  const store = useStore();
  const { state, addFacility } = store;
  const [name, setName] = useState("");

  return (
    <div className="page page-narrow">
      <div className="page-head">
        <div>
          <h1>Facilities & locations</h1>
          <p className="muted">
            A location lives in a facility. Edit one here and it updates on every card that uses it —
            no hunting through cards.
          </p>
        </div>
      </div>

      <div className="card form-card">
        <div className="inline-add">
          <input placeholder="Add a facility (e.g. Mercy General)" value={name} onChange={(e) => setName(e.target.value)} />
          <button
            className="btn btn-primary"
            disabled={!name.trim()}
            onClick={() => { addFacility(name.trim()); setName(""); }}
          >
            Add facility
          </button>
        </div>
      </div>

      {state.facilities.length === 0 ? (
        <div className="empty-state">
          <span className="empty-emoji">🏥</span>
          <p>No facilities yet. Add the hospitals you work at, then build their location sets.</p>
        </div>
      ) : (
        state.facilities.map((f) => <FacilityCard key={f.id} facility={f} store={store} />)
      )}
    </div>
  );
}

function FacilityCard({ facility, store }: { facility: Facility; store: Store }) {
  const { state, updateFacility, deleteFacility, addLocation, exportFacilityFile } = store;
  const locations = locationsForFacility(state, facility.id);
  const areas = areasForFacility(state, facility.id);
  const cardCount = state.cards.filter((c) => c.facilityId === facility.id).length;

  const [editing, setEditing] = useState(false);
  const [fname, setFname] = useState(facility.name);
  const [confirmDel, setConfirmDel] = useState(false);
  const [area, setArea] = useState("");
  const [spot, setSpot] = useState("");
  const areaListId = `fa-${facility.id}`;

  return (
    <div className="card section-card">
      <div className="card-head">
        {editing ? (
          <span className="inline-add">
            <input value={fname} onChange={(e) => setFname(e.target.value)} />
            <button className="btn btn-sm btn-primary" onClick={() => { updateFacility(facility.id, fname); setEditing(false); }}>Save</button>
            <button className="btn btn-sm" onClick={() => { setFname(facility.name); setEditing(false); }}>Cancel</button>
          </span>
        ) : (
          <h2>🏥 {facility.name}</h2>
        )}
        <span className="head-actions">
          <span className="pill">{locations.length} loc · {cardCount} cards</span>
          {!editing && <button className="link" onClick={() => setEditing(true)}>Rename</button>}
        </span>
      </div>

      {locations.length === 0 ? (
        <p className="muted small">No locations yet. Add the carts, cabinets, and rooms below.</p>
      ) : (
        <ul className="loc-list">
          {locations.map((l) => <LocationRow key={l.id} loc={l} store={store} areaListId={areaListId} />)}
        </ul>
      )}

      <datalist id={areaListId}>{areas.map((a) => <option key={a} value={a} />)}</datalist>
      <div className="item-add loc-add">
        <input list={areaListId} placeholder="Area (e.g. Lap cart)" value={area} onChange={(e) => setArea(e.target.value)} />
        <input placeholder="Spot (e.g. drawer 2) — optional" value={spot} onChange={(e) => setSpot(e.target.value)} />
        <button
          className="btn btn-sm"
          disabled={!area.trim()}
          onClick={() => { addLocation(facility.id, area.trim(), spot.trim() || undefined); setArea(""); setSpot(""); }}
        >
          Add location
        </button>
      </div>

      <div className="detail-actions" style={{ marginTop: 14 }}>
        {cardCount > 0 && (
          <button className="btn btn-sm" onClick={() => exportFacilityFile(facility.id)}>
            Export {cardCount} cards →
          </button>
        )}
        {confirmDel ? (
          <span className="confirm">
            Delete {facility.name}, its {locations.length} locations, and unlink them from {cardCount} cards?
            <button className="btn btn-danger btn-sm" onClick={() => deleteFacility(facility.id)}>Delete</button>
            <button className="btn btn-sm" onClick={() => setConfirmDel(false)}>Cancel</button>
          </span>
        ) : (
          <button className="link danger" onClick={() => setConfirmDel(true)}>Delete facility</button>
        )}
      </div>
    </div>
  );
}

function LocationRow({ loc, store, areaListId }: { loc: Location; store: Store; areaListId: string }) {
  const { updateLocation, deleteLocation } = store;
  const [editing, setEditing] = useState(false);
  const [area, setArea] = useState(loc.area);
  const [spot, setSpot] = useState(loc.spot ?? "");

  if (editing) {
    return (
      <li className="loc-row editing">
        <input list={areaListId} value={area} onChange={(e) => setArea(e.target.value)} />
        <input value={spot} placeholder="spot (optional)" onChange={(e) => setSpot(e.target.value)} />
        <button className="btn btn-sm btn-primary" onClick={() => { updateLocation(loc.id, { area, spot }); setEditing(false); }}>Save</button>
        <button className="btn btn-sm" onClick={() => { setArea(loc.area); setSpot(loc.spot ?? ""); setEditing(false); }}>Cancel</button>
      </li>
    );
  }
  return (
    <li className="loc-row">
      <span className="loc-name">📍 {locationLabel(loc)}</span>
      <button className="link" onClick={() => setEditing(true)}>Edit</button>
      <button className="info-del" aria-label="Delete location" onClick={() => deleteLocation(loc.id)}>✕</button>
    </li>
  );
}
