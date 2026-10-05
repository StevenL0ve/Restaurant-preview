import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../state/store";
import type { Store } from "../state/store";
import { REP_LOCATION_KINDS, type Facility, type RepLocation, type RepLocationKind } from "../types";
import { getCurrentCoords, haversineMiles, formatMiles, mapsHref } from "../lib/geo";
import { tapLight } from "../lib/haptics";

// The rep's home base: storage sites (your unit, the company warehouse, the
// trunk) with GPS tags, and how many of each set type sits at each one.
// Tag a hospital's GPS too and every site shows its distance, so "which
// stock is closest to St. David's" is a glance, not a guess.
export function RepStoragePage() {
  const navigate = useNavigate();
  const store = useStore();
  const { state } = store;
  const [adding, setAdding] = useState(false);

  // Total of each set type across every site.
  const totals = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of state.repStock) map.set(s.name, (map.get(s.name) ?? 0) + s.qty);
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [state.repStock]);

  const taggedFacilities = state.facilities.filter((f) => f.lat != null && f.lng != null);

  return (
    <div className="page page-narrow">
      <div className="detail-top">
        <button className="link" onClick={() => navigate(-1)}>← Back</button>
      </div>
      <div className="page-head">
        <div>
          <h1>Storage & stock</h1>
          <p className="muted">
            Your sets when they're not out on loan: where they live, how many you have, and how far
            each site is from your hospitals.
          </p>
        </div>
        <div className="head-actions">
          <button className="btn btn-primary" onClick={() => setAdding((v) => !v)}>
            {adding ? "Close" : "+ New site"}
          </button>
        </div>
      </div>

      {adding && <NewSiteForm store={store} onDone={() => setAdding(false)} />}

      {totals.length > 0 && (
        <div className="card stock-totals">
          <h2>All stock</h2>
          <ul className="stock-total-list">
            {totals.map(([name, qty]) => (
              <li key={name}><strong>{qty}</strong> {name}</li>
            ))}
          </ul>
        </div>
      )}

      {state.repLocations.length === 0 && !adding ? (
        <div className="empty-state">
          <p>No storage sites yet. Add your storage unit, the company warehouse, or your trunk stock, then count your sets into it.</p>
        </div>
      ) : (
        state.repLocations.map((loc) => (
          <SiteCard key={loc.id} loc={loc} store={store} facilities={taggedFacilities} />
        ))
      )}

      <div className="card settings-card">
        <h2>Hospitals & distances</h2>
        <p className="muted small">
          Tag a hospital's GPS while you're there (or at its dock) and every storage site above shows
          how far it is. Facilities come from the Facilities screen.
        </p>
        {state.facilities.length === 0 ? (
          <p className="muted small">No facilities yet. Add them under Facilities.</p>
        ) : (
          <ul className="geo-facility-list">
            {state.facilities.map((f) => <FacilityGeoRow key={f.id} facility={f} store={store} />)}
          </ul>
        )}
      </div>
    </div>
  );
}

function kindLabel(kind: RepLocationKind): string {
  return REP_LOCATION_KINDS.find((k) => k.key === kind)?.label ?? kind;
}

function TagButton({ onTag, tagged }: { onTag: (lat: number, lng: number) => void; tagged: boolean }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function tag() {
    tapLight();
    setBusy(true);
    setErr(null);
    try {
      const { lat, lng } = await getCurrentCoords();
      onTag(lat, lng);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't get your location.");
      setTimeout(() => setErr(null), 4000);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button className="btn btn-sm" disabled={busy} onClick={tag}>
        {busy ? "Locating…" : tagged ? "Re-tag GPS" : "Tag GPS here"}
      </button>
      {err && <span className="neg small">{err}</span>}
    </>
  );
}

function SiteCard({ loc, store, facilities }: { loc: RepLocation; store: Store; facilities: Facility[] }) {
  const { state, updateRepLocation, deleteRepLocation, addRepStock, updateRepStock, deleteRepStock } = store;
  const [confirmDel, setConfirmDel] = useState(false);
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");

  const stock = state.repStock.filter((s) => s.locationId === loc.id);
  const hasGps = loc.lat != null && loc.lng != null;

  // Nearest hospitals first; only facilities that are themselves tagged.
  const distances = hasGps
    ? facilities
        .map((f) => ({ f, mi: haversineMiles(loc.lat!, loc.lng!, f.lat!, f.lng!) }))
        .sort((a, b) => a.mi - b.mi)
        .slice(0, 4)
    : [];

  function add() {
    const n = parseInt(qty, 10) || 1;
    if (!name.trim()) return;
    tapLight();
    addRepStock(name, loc.id, Math.max(1, n));
    setName("");
    setQty("1");
  }

  return (
    <div className="card site-card">
      <div className="loaner-top">
        <div>
          <div className="loaner-desc">{loc.name}</div>
          <div className="muted small">
            {kindLabel(loc.kind)}
            {loc.address ? ` · ${loc.address}` : ""}
            {hasGps && <> · <a className="link" href={mapsHref(loc.lat!, loc.lng!)} target="_blank" rel="noreferrer">map</a></>}
          </div>
        </div>
        <TagButton tagged={hasGps} onTag={(lat, lng) => updateRepLocation(loc.id, { lat, lng })} />
      </div>

      {distances.length > 0 && (
        <div className="geo-distances">
          {distances.map(({ f, mi }) => (
            <span key={f.id} className="geo-chip">{f.name}: {formatMiles(mi)}</span>
          ))}
        </div>
      )}
      {hasGps && facilities.length === 0 && (
        <p className="muted small">Tag a hospital below and distances show up here.</p>
      )}

      <div className="stock-rows">
        {stock.length === 0 && <p className="muted small">Nothing counted in here yet.</p>}
        {stock.map((s) => (
          <div key={s.id} className="stock-row">
            <span className="stock-name">{s.name}</span>
            <span className="stock-qty-controls">
              <button className="btn btn-sm" aria-label={`One fewer ${s.name}`} onClick={() => updateRepStock(s.id, { qty: s.qty - 1 })}>−</button>
              <span className="stock-qty">{s.qty}</span>
              <button className="btn btn-sm" aria-label={`One more ${s.name}`} onClick={() => updateRepStock(s.id, { qty: s.qty + 1 })}>+</button>
            </span>
            <button className="info-del" aria-label={`Remove ${s.name}`} onClick={() => deleteRepStock(s.id)}>✕</button>
          </div>
        ))}
        <div className="set-add">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Set type: Triathlon Primary set"
          />
          <input
            className="stock-qty-input"
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            aria-label="How many"
          />
          <button className="btn btn-sm" disabled={!name.trim()} onClick={add}>Add</button>
        </div>
      </div>

      <div className="loaner-actions">
        {confirmDel ? (
          <span className="confirm">
            Delete this site and its counts?
            <button className="btn btn-danger btn-sm" onClick={() => deleteRepLocation(loc.id)}>Yes</button>
            <button className="btn btn-sm" onClick={() => setConfirmDel(false)}>No</button>
          </span>
        ) : (
          <button className="btn btn-sm btn-danger" onClick={() => setConfirmDel(true)}>Delete site</button>
        )}
      </div>
    </div>
  );
}

function FacilityGeoRow({ facility: f, store }: { facility: Facility; store: Store }) {
  const { state, setFacilityCoords } = store;
  const tagged = f.lat != null && f.lng != null;
  // The closest tagged storage site, so the row answers "what's near this hospital".
  const nearest = tagged
    ? state.repLocations
        .filter((l) => l.lat != null && l.lng != null)
        .map((l) => ({ l, mi: haversineMiles(f.lat!, f.lng!, l.lat!, l.lng!) }))
        .sort((a, b) => a.mi - b.mi)[0]
    : undefined;
  return (
    <li className="geo-facility-row">
      <span className="stock-name">{f.name}</span>
      {nearest && <span className="muted small">nearest stock: {nearest.l.name} ({formatMiles(nearest.mi)})</span>}
      <TagButton tagged={tagged} onTag={(lat, lng) => setFacilityCoords(f.id, lat, lng)} />
    </li>
  );
}

function NewSiteForm({ store, onDone }: { store: Store; onDone: () => void }) {
  const { addRepLocation } = store;
  const [name, setName] = useState("");
  const [kind, setKind] = useState<RepLocationKind>("warehouse");
  const [address, setAddress] = useState("");

  function save() {
    if (!name.trim()) return;
    addRepLocation({ name: name.trim(), kind, address: address.trim() || undefined });
    onDone();
  }

  return (
    <div className="card form-card">
      <div className="form-grid">
        <label className="field field-wide"><span>Site name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="North Austin storage, unit B14" autoFocus />
        </label>
        <label className="field"><span>Type</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as RepLocationKind)}>
            {REP_LOCATION_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
          </select>
        </label>
        <label className="field"><span>Address (optional)</span>
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="9200 N Lamar Blvd" />
        </label>
      </div>
      <p className="muted small">After saving, tap <strong>Tag GPS here</strong> on the site while you're at it, and distances to your tagged hospitals appear.</p>
      <div className="form-actions">
        <button className="btn btn-primary" disabled={!name.trim()} onClick={save}>Add site</button>
        <button className="btn" onClick={onDone}>Cancel</button>
      </div>
    </div>
  );
}
