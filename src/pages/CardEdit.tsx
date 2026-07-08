import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { gateNewCard, gateNewFacility } from "../lib/tier";
import {
  useStore,
  emptyCard,
  uid,
  locationsForFacility,
  areasForFacility,
} from "../state/store";
import { SECTIONS, locationLabel, type CardItem, type Location, type PrefCard, type SectionKey } from "../types";

// Create or edit a card. Local draft state; nothing is persisted until "Save"
// — except newly-created facilities/locations, which are shared resources and
// commit immediately so they're reusable everywhere.
export function CardEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const store = useStore();
  const { state, saveCard, addSurgeon, addFacility, addLocation } = store;

  // A draft handed in from the scan/paste flow: a prefilled card plus, when the
  // scanned surgeon wasn't matched to one you already have, their name.
  const seedState = location.state as { seed?: PrefCard; surgeonName?: string } | null;
  const seed = seedState?.seed;
  const seedSurgeonName = seedState?.surgeonName;

  const existing = id ? state.cards.find((c) => c.id === id) : undefined;
  const firstSurgeon = state.surgeons[0];

  // Free-tier gate on NEW cards only (never blocks editing). No-op during beta.
  const newCardGate = gateNewCard(state);
  useEffect(() => {
    if (!existing && !newCardGate.allowed) navigate("/upgrade", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [draft, setDraft] = useState<PrefCard>(() => {
    if (existing) return existing;
    if (seed) return seed;
    // Prefill facility from the surgeon's facility name if one matches.
    const fac = firstSurgeon?.facility
      ? state.facilities.find((f) => f.name === firstSurgeon.facility)
      : undefined;
    return emptyCard(firstSurgeon?.id ?? "", firstSurgeon?.specialty ?? "General Surgery", fac?.id);
  });

  // Start on the "new surgeon" path when scanning turned up a surgeon we
  // couldn't match, or when there are no surgeons yet.
  const [newSurgeon, setNewSurgeon] = useState(!!seedSurgeonName || state.surgeons.length === 0);
  const [sgName, setSgName] = useState(seedSurgeonName ?? "");
  const [sgSpecialty, setSgSpecialty] = useState(seed?.specialty || "General Surgery");
  // Inline "add facility" capture.
  const [newFacilityName, setNewFacilityName] = useState("");
  const [addingFacility, setAddingFacility] = useState(false);

  const set = (patch: Partial<PrefCard>) => setDraft((d) => ({ ...d, ...patch }));

  const facilityLocations = locationsForFacility(state, draft.facilityId);
  const facilityAreas = areasForFacility(state, draft.facilityId);

  // Changing facility invalidates item locations (they belong to a facility).
  function changeFacility(facilityId: string | undefined) {
    setDraft((d) => {
      const clear = (arr: CardItem[]) => arr.map((it) => ({ ...it, locationId: undefined }));
      return {
        ...d,
        facilityId,
        instruments: clear(d.instruments),
        sutures: clear(d.sutures),
        supplies: clear(d.supplies),
        medications: clear(d.medications),
        equipment: clear(d.equipment),
      };
    });
  }

  const canSave = useMemo(
    () => draft.procedure.trim().length > 0 && (newSurgeon ? sgName.trim().length > 0 : !!draft.surgeonId),
    [draft.procedure, draft.surgeonId, newSurgeon, sgName],
  );

  function onSave() {
    let surgeonId = draft.surgeonId;
    let specialty = draft.specialty;
    if (newSurgeon && sgName.trim()) {
      const sg = addSurgeon({ name: sgName.trim(), specialty: sgSpecialty.trim() || "General Surgery" });
      surgeonId = sg.id;
      specialty = specialty || sg.specialty;
    }
    saveCard({ ...draft, surgeonId, specialty: specialty || "General Surgery" });
    navigate(`/cards/${draft.id}`);
  }

  return (
    <div className="page page-narrow">
      <div className="detail-top">
        <button className="link" onClick={() => navigate(-1)}>← Cancel</button>
      </div>
      <div className="page-head">
        <h1>{existing ? "Edit card" : "New card"}</h1>
      </div>

      <div className="card form-card">
        <div className="form-grid">
          <label className="field field-wide">
            <span>Procedure</span>
            <input
              value={draft.procedure}
              onChange={(e) => set({ procedure: e.target.value })}
              placeholder="e.g. Laparoscopic Cholecystectomy"
              autoFocus
            />
          </label>

          {!newSurgeon ? (
            <label className="field">
              <span>Surgeon</span>
              <select
                value={draft.surgeonId}
                onChange={(e) => {
                  if (e.target.value === "__new") { setNewSurgeon(true); return; }
                  const sg = state.surgeons.find((s) => s.id === e.target.value);
                  set({ surgeonId: e.target.value, specialty: sg?.specialty ?? draft.specialty });
                }}
              >
                {state.surgeons.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} — {s.specialty}</option>
                ))}
                <option value="__new">+ Add a new surgeon…</option>
              </select>
            </label>
          ) : (
            <>
              <label className="field">
                <span>New surgeon</span>
                <input value={sgName} onChange={(e) => setSgName(e.target.value)} placeholder="Dr. Smith" />
              </label>
              <label className="field">
                <span>Their specialty</span>
                <input value={sgSpecialty} onChange={(e) => setSgSpecialty(e.target.value)} placeholder="Orthopedics" />
              </label>
              {state.surgeons.length > 0 && (
                <button className="link" type="button" onClick={() => setNewSurgeon(false)} style={{ justifySelf: "start" }}>
                  ← pick an existing surgeon
                </button>
              )}
            </>
          )}

          {/* Facility — drives which location set the items draw from. */}
          {!addingFacility ? (
            <label className="field">
              <span>Facility</span>
              <select
                value={draft.facilityId ?? ""}
                onChange={(e) => {
                  if (e.target.value === "__new") { setAddingFacility(true); return; }
                  changeFacility(e.target.value || undefined);
                }}
              >
                <option value="">— none —</option>
                {state.facilities.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
                <option value="__new">+ Add a facility…</option>
              </select>
            </label>
          ) : (
            <label className="field">
              <span>New facility</span>
              <span className="inline-add">
                <input
                  value={newFacilityName}
                  onChange={(e) => setNewFacilityName(e.target.value)}
                  placeholder="Mercy General"
                  autoFocus
                />
                <button
                  className="btn btn-sm btn-primary"
                  type="button"
                  disabled={!newFacilityName.trim()}
                  onClick={() => {
                    if (!gateNewFacility(state).allowed) { navigate("/upgrade"); return; }
                    const f = addFacility(newFacilityName.trim());
                    changeFacility(f.id);
                    setNewFacilityName("");
                    setAddingFacility(false);
                  }}
                >
                  Add
                </button>
                <button className="btn btn-sm" type="button" onClick={() => setAddingFacility(false)}>Cancel</button>
              </span>
            </label>
          )}

          <label className="field">
            <span>Specialty</span>
            <input value={draft.specialty} onChange={(e) => set({ specialty: e.target.value })} placeholder="General Surgery" />
          </label>

          <label className="field field-wide">
            <span>Position</span>
            <input value={draft.position ?? ""} onChange={(e) => set({ position: e.target.value })} placeholder="Supine, arms tucked" />
          </label>
          <label className="field">
            <span>Skin prep</span>
            <input value={draft.prep ?? ""} onChange={(e) => set({ prep: e.target.value })} placeholder="ChloraPrep" />
          </label>
          <label className="field">
            <span>Draping</span>
            <input value={draft.draping ?? ""} onChange={(e) => set({ draping: e.target.value })} placeholder="Laparotomy drape" />
          </label>
          <label className="field field-wide">
            <span>Notes & surgeon quirks</span>
            <textarea
              rows={2}
              value={draft.notes ?? ""}
              onChange={(e) => set({ notes: e.target.value })}
              placeholder="Anything that makes setup go smoothly…"
            />
          </label>
        </div>
      </div>

      {SECTIONS.map((sec) => (
        <ItemEditor
          key={sec.key}
          label={sec.label}
          icon={sec.icon}
          items={draft[sec.key as SectionKey]}
          locations={facilityLocations}
          areas={facilityAreas}
          hasFacility={!!draft.facilityId}
          onAddLocation={(area, spot) => addLocation(draft.facilityId!, area, spot)}
          onChange={(items) => set({ [sec.key]: items } as Partial<PrefCard>)}
        />
      ))}

      <div className="form-actions">
        <button className="btn btn-primary" disabled={!canSave} onClick={onSave}>Save card</button>
        <button className="btn" onClick={() => navigate(-1)}>Cancel</button>
        {!canSave && <span className="muted small">A procedure name and a surgeon are required.</span>}
      </div>
    </div>
  );
}

function ItemEditor({
  label,
  icon,
  items,
  locations,
  areas,
  hasFacility,
  onAddLocation,
  onChange,
}: {
  label: string;
  icon: string;
  items: CardItem[];
  locations: Location[];
  areas: string[];
  hasFacility: boolean;
  onAddLocation: (area: string, spot?: string) => Location;
  onChange: (items: CardItem[]) => void;
}) {
  const [name, setName] = useState("");
  const [detail, setDetail] = useState("");
  const [locId, setLocId] = useState("");
  // Inline "new location" creator (shared by this section's rows).
  const [newLoc, setNewLoc] = useState<{ open: boolean; area: string; spot: string; target: string }>(
    { open: false, area: "", spot: "", target: "new" },
  );
  const areaListId = `area-${label.replace(/\W+/g, "")}`;

  function add() {
    if (!name.trim()) return;
    onChange([...items, { id: uid("it"), name: name.trim(), detail: detail.trim() || undefined, locationId: locId || undefined }]);
    setName("");
    setDetail("");
    setLocId("");
  }
  const setItemLoc = (itemId: string, value: string) =>
    onChange(items.map((it) => (it.id === itemId ? { ...it, locationId: value || undefined } : it)));

  function LocationSelect({ value, onPick, target }: { value: string; onPick: (v: string) => void; target: string }) {
    return (
      <select
        className="loc-select"
        value={value}
        disabled={!hasFacility}
        onChange={(e) => {
          if (e.target.value === "__new") { setNewLoc({ open: true, area: "", spot: "", target }); return; }
          onPick(e.target.value);
        }}
      >
        <option value="">{hasFacility ? "📍 location…" : "set a facility first"}</option>
        {locations.map((l) => (
          <option key={l.id} value={l.id}>{locationLabel(l)}</option>
        ))}
        {hasFacility && <option value="__new">+ New location…</option>}
      </select>
    );
  }

  return (
    <div className="card section-card">
      <div className="card-head">
        <h2><span aria-hidden>{icon}</span> {label}</h2>
        <span className="pill">{items.length}</span>
      </div>

      {items.length > 0 && (
        <ul className="edit-item-list">
          {items.map((it) => (
            <li key={it.id}>
              <span className="item-name">{it.name}</span>
              {it.detail && <span className="item-detail">{it.detail}</span>}
              <LocationSelect value={it.locationId ?? ""} onPick={(v) => setItemLoc(it.id, v)} target={it.id} />
              <button className="info-del" aria-label={`Remove ${it.name}`} onClick={() => onChange(items.filter((x) => x.id !== it.id))}>✕</button>
            </li>
          ))}
        </ul>
      )}

      <datalist id={areaListId}>
        {areas.map((a) => <option key={a} value={a} />)}
      </datalist>

      <div className="item-add">
        <input placeholder="Add an item…" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <input placeholder="detail / size / qty (optional)" value={detail} onChange={(e) => setDetail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <LocationSelect value={locId} onPick={setLocId} target="new" />
        <button className="btn btn-sm" onClick={add} disabled={!name.trim()}>Add</button>
      </div>

      {newLoc.open && (
        <div className="newloc-form">
          <span className="newloc-title">New location</span>
          <input list={areaListId} placeholder="Area (e.g. Lap cart)" value={newLoc.area} onChange={(e) => setNewLoc((n) => ({ ...n, area: e.target.value }))} />
          <input placeholder="Spot (e.g. drawer 2) — optional" value={newLoc.spot} onChange={(e) => setNewLoc((n) => ({ ...n, spot: e.target.value }))} />
          <button
            className="btn btn-sm btn-primary"
            disabled={!newLoc.area.trim()}
            onClick={() => {
              const loc = onAddLocation(newLoc.area.trim(), newLoc.spot.trim() || undefined);
              if (newLoc.target === "new") setLocId(loc.id);
              else setItemLoc(newLoc.target, loc.id);
              setNewLoc({ open: false, area: "", spot: "", target: "new" });
            }}
          >
            Create & use
          </button>
          <button className="btn btn-sm" onClick={() => setNewLoc((n) => ({ ...n, open: false }))}>Cancel</button>
        </div>
      )}
    </div>
  );
}
