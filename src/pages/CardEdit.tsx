import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStore, emptyCard, uid, knownLocations } from "../state/store";
import { SECTIONS, type CardItem, type PrefCard, type SectionKey } from "../types";

// Create or edit a card. Local draft state; nothing is persisted until "Save".
export function CardEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, saveCard, addSurgeon } = useStore();

  const existing = id ? state.cards.find((c) => c.id === id) : undefined;
  const firstSurgeon = state.surgeons[0];

  const [draft, setDraft] = useState<PrefCard>(
    () => existing ?? emptyCard(firstSurgeon?.id ?? "", firstSurgeon?.specialty ?? "General Surgery"),
  );
  // Inline "new surgeon" capture when the library is empty or you pick "+ new".
  const [newSurgeon, setNewSurgeon] = useState(state.surgeons.length === 0);
  const [sgName, setSgName] = useState("");
  const [sgSpecialty, setSgSpecialty] = useState("General Surgery");

  const set = (patch: Partial<PrefCard>) => setDraft((d) => ({ ...d, ...patch }));

  // Locations already used across the library (plus any added in this draft) so
  // they can be reused from a dropdown instead of retyped each time.
  const locationOptions = useMemo(() => {
    const fromDraft = SECTIONS.flatMap((s) => draft[s.key as SectionKey])
      .map((it) => it.location)
      .filter((x): x is string => !!x);
    return Array.from(new Set([...knownLocations(state), ...fromDraft])).sort();
  }, [state, draft]);

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
          locationOptions={locationOptions}
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
  locationOptions,
  onChange,
}: {
  label: string;
  icon: string;
  items: CardItem[];
  locationOptions: string[];
  onChange: (items: CardItem[]) => void;
}) {
  const [name, setName] = useState("");
  const [detail, setDetail] = useState("");
  const [location, setLocation] = useState("");
  const listId = `loc-${label.replace(/\W+/g, "")}`;

  function add() {
    if (!name.trim()) return;
    onChange([
      ...items,
      {
        id: uid("it"),
        name: name.trim(),
        detail: detail.trim() || undefined,
        location: location.trim() || undefined,
      },
    ]);
    setName("");
    setDetail("");
    setLocation("");
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
              {it.location && <span className="item-location">📍 {it.location}</span>}
              <button
                className="info-del"
                aria-label={`Remove ${it.name}`}
                onClick={() => onChange(items.filter((x) => x.id !== it.id))}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <datalist id={listId}>
        {locationOptions.map((loc) => (
          <option key={loc} value={loc} />
        ))}
      </datalist>
      <div className="item-add">
        <input
          placeholder="Add an item…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <input
          placeholder="detail / size / qty (optional)"
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <input
          list={listId}
          placeholder="📍 where to find it (optional)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button className="btn btn-sm" onClick={add} disabled={!name.trim()}>Add</button>
      </div>
    </div>
  );
}
