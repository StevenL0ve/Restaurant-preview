import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useStore } from "../state/store";
import { NavIcon } from "../components/NavIcon";
import { RecentChanges } from "../components/RecentChanges";
import { spdPlace, type SpdTray } from "../types";
import { stampLine } from "../lib/user";

// Sterile processing: where every instrument tray and set is kept. Grouped
// by cabinet, searchable, editable by anyone at the facility, with every
// move logged ("Major Ortho Tray #2 moved to Cabinet B · Shelf 3").
export function SpdPage() {
  const { state, saveSpdTray, deleteSpdTray } = useStore();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [editing, setEditing] = useState<SpdTray | "new" | null>(null);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return state.spdTrays
      .filter((t) => !needle || [t.name, t.setNumber, t.cabinet, t.shelf, t.notes].some((v) => v?.toLowerCase().includes(needle)))
      .sort((a, b) => (a.cabinet ?? "~").localeCompare(b.cabinet ?? "~", undefined, { numeric: true })
        || (a.shelf ?? "~").localeCompare(b.shelf ?? "~", undefined, { numeric: true })
        || a.name.localeCompare(b.name));
  }, [state.spdTrays, q]);

  const groups = useMemo(() => {
    const m = new Map<string, SpdTray[]>();
    for (const t of shown) {
      const k = t.cabinet ? `Cabinet ${t.cabinet}` : "No cabinet yet";
      m.set(k, [...(m.get(k) ?? []), t]);
    }
    return [...m.entries()];
  }, [shown]);

  return (
    <div className="page page-narrow">
      <div className="page-head">
        <div>
          <h1 className="page-title"><NavIcon name="spd" size={40} />Sterile processing</h1>
          <p className="muted">Where every tray and set lives in SPD: cabinet and shelf. Search it, or tap one to update its spot.</p>
        </div>
        <div className="head-actions">
          <button className="btn btn-primary" onClick={() => setEditing("new")}>+ Add tray</button>
        </div>
      </div>

      <div className="card form-card">
        <input className="search-page-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a tray, set, cabinet, or shelf…" />
      </div>

      {editing === "new" && (
        <TrayForm onSave={(t) => { saveSpdTray(t); setEditing(null); }} onCancel={() => setEditing(null)} />
      )}

      {state.spdTrays.length === 0 && editing !== "new" ? (
        <div className="empty-state">
          <p>No trays yet. Add each instrument tray or set with its cabinet and shelf, and the whole OR can find it from search.</p>
          <button className="btn btn-primary" onClick={() => setEditing("new")}>Add the first tray</button>
        </div>
      ) : (
        groups.map(([cab, trays]) => (
          <section key={cab} className="oncall-group">
            <h2 className="oncall-cat">{cab}</h2>
            <div className="card">
              {trays.map((t) => editing && editing !== "new" && editing.id === t.id ? (
                <TrayForm key={t.id} initial={t} onSave={(n) => { saveSpdTray({ ...n, id: t.id }); setEditing(null); }}
                  onCancel={() => setEditing(null)} onDelete={() => { deleteSpdTray(t.id); setEditing(null); }} />
              ) : (
                <button key={t.id} className="resume-row spd-row" onClick={() => setEditing(t)}>
                  <span className="resume-title">
                    {t.name}{t.setNumber ? <span className="pill spd-set">#{t.setNumber}</span> : null}
                    {t.notes && <span className="muted small spd-notes">{t.notes}</span>}
                    <span className="muted small spd-notes">{stampLine(t.updatedBy, t.updatedAt)}</span>
                  </span>
                  <span className="spd-place">{t.shelf ? `Shelf ${t.shelf}` : "No shelf"}</span>
                </button>
              ))}
            </div>
          </section>
        ))
      )}
      {shown.length === 0 && state.spdTrays.length > 0 && <p className="muted">No trays match “{q}”.</p>}

      {state.spdTrays.length > 0 && (
        <p className="muted small">Search any tray name from the top bar to see its spot and every preference card that lists it.</p>
      )}

      <RecentChanges kinds={["spd"]} title="Who moved what in SPD" />
    </div>
  );
}

function TrayForm({ initial, onSave, onCancel, onDelete }: {
  initial?: SpdTray;
  onSave: (t: Omit<SpdTray, "id" | "updatedAt" | "updatedBy">) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [setNumber, setSetNumber] = useState(initial?.setNumber ?? "");
  const [cabinet, setCabinet] = useState(initial?.cabinet ?? "");
  const [shelf, setShelf] = useState(initial?.shelf ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [confirmDel, setConfirmDel] = useState(false);
  return (
    <div className="card form-card">
      <div className="form-grid">
        <label className="field field-wide"><span>Tray or set name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Major Ortho Tray" autoCapitalize="words" />
        </label>
        <label className="field"><span>Set number (if there are several)</span>
          <input value={setNumber} onChange={(e) => setSetNumber(e.target.value)} placeholder="2" />
        </label>
        <label className="field"><span>Cabinet</span>
          <input value={cabinet} onChange={(e) => setCabinet(e.target.value)} placeholder="B" autoCapitalize="characters" />
        </label>
        <label className="field"><span>Shelf</span>
          <input value={shelf} onChange={(e) => setShelf(e.target.value)} placeholder="3" />
        </label>
        <label className="field field-wide"><span>Notes</span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Heavy: 2-person lift" />
        </label>
      </div>
      <div className="form-actions">
        <button className="btn btn-primary" disabled={!name.trim()} onClick={() => onSave({ name, setNumber, cabinet, shelf, notes })}>{initial ? "Save" : "Add tray"}</button>
        <button className="btn" onClick={onCancel}>Cancel</button>
        {onDelete && (confirmDel ? (
          <span className="confirm">Remove {initial?.name}?
            <button className="btn btn-danger btn-sm" onClick={onDelete}>Remove</button>
            <button className="btn btn-sm" onClick={() => setConfirmDel(false)}>Keep</button>
          </span>
        ) : <button className="btn btn-danger-outline" onClick={() => setConfirmDel(true)}>Remove</button>)}
      </div>
    </div>
  );
}

export { spdPlace };
