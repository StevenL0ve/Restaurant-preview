import { useState } from "react";
import { useStore } from "../state/store";
import type { InfoRecord } from "../types";

const KIND_LABEL: Record<InfoRecord["kind"], string> = {
  medical: "Medical",
  school: "School",
  contact: "Contacts",
  clothing: "Sizes",
  other: "Other",
};
const KINDS = Object.keys(KIND_LABEL) as InfoRecord["kind"][];

export function InfoBank() {
  const { state, addInfo, deleteInfo } = useStore();
  const kids = state.people.filter((p) => p.role === "child");
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Info Bank</h1>
          <p className="muted">
            The important details for each child in one shared place — so you're
            never texting back and forth for an insurance ID or shoe size.
          </p>
        </div>
      </div>

      <div className="info-grid">
        {kids.map((kid) => {
          const records = state.info.filter((r) => r.childId === kid.id);
          const grouped = new Map<InfoRecord["kind"], InfoRecord[]>();
          for (const r of records) grouped.set(r.kind, [...(grouped.get(r.kind) ?? []), r]);
          return (
            <section key={kid.id} className="card kid-card">
              <div className="kid-head">
                <span className="avatar" style={{ background: kid.color }}>{kid.initials}</span>
                <h2>{kid.name}</h2>
              </div>

              {records.length === 0 && (
                <p className="muted small">No details yet — add the first below.</p>
              )}

              {[...grouped.entries()].map(([kind, recs]) => (
                <div key={kind} className="info-group">
                  <h4>{KIND_LABEL[kind]}</h4>
                  {recs.map((r) => (
                    <div key={r.id} className="info-row">
                      <span className="info-label">{r.label}</span>
                      <span className="info-value">
                        {r.value}
                        <button className="info-del" title="Remove" onClick={() => deleteInfo(r.id)}>✕</button>
                      </span>
                    </div>
                  ))}
                </div>
              ))}

              {editing === kid.id ? (
                <InfoForm
                  onCancel={() => setEditing(null)}
                  onSave={(label, value, kind) => {
                    addInfo({ childId: kid.id, label, value, kind });
                    setEditing(null);
                  }}
                />
              ) : (
                <button className="btn btn-sm add-detail" onClick={() => setEditing(kid.id)}>
                  + Add detail
                </button>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function InfoForm({
  onSave,
  onCancel,
}: {
  onSave: (label: string, value: string, kind: InfoRecord["kind"]) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [kind, setKind] = useState<InfoRecord["kind"]>("medical");

  return (
    <div className="info-form">
      <div className="form-grid">
        <label className="field">
          <span>Detail</span>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Shoe size" autoFocus />
        </label>
        <label className="field">
          <span>Value</span>
          <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. Youth 2" />
        </label>
        <label className="field">
          <span>Category</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as InfoRecord["kind"])}>
            {KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
          </select>
        </label>
      </div>
      <div className="form-actions">
        <button
          className="btn btn-sm btn-primary"
          onClick={() => label.trim() && value.trim() && onSave(label.trim(), value.trim(), kind)}
        >
          Save
        </button>
        <button className="btn btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
