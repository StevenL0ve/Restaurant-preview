import { useStore } from "../state/store";
import type { InfoRecord } from "../types";

const KIND_LABEL: Record<InfoRecord["kind"], string> = {
  medical: "Medical",
  school: "School",
  contact: "Contacts",
  clothing: "Sizes",
  other: "Other",
};

export function InfoBank() {
  const { state } = useStore();
  const kids = state.people.filter((p) => p.role === "child");

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
          for (const r of records) {
            grouped.set(r.kind, [...(grouped.get(r.kind) ?? []), r]);
          }
          return (
            <section key={kid.id} className="card kid-card">
              <div className="kid-head">
                <span className="avatar" style={{ background: kid.color }}>{kid.initials}</span>
                <h2>{kid.name}</h2>
              </div>
              {[...grouped.entries()].map(([kind, recs]) => (
                <div key={kind} className="info-group">
                  <h4>{KIND_LABEL[kind]}</h4>
                  {recs.map((r) => (
                    <div key={r.id} className="info-row">
                      <span className="info-label">{r.label}</span>
                      <span className="info-value">{r.value}</span>
                    </div>
                  ))}
                </div>
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}
