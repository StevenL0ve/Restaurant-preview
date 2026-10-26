import { useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useStore } from "../state/store";
import { NavIcon } from "../components/NavIcon";
import { SECTIONS, locationLabel, spdPlace, type SectionKey } from "../types";

// One supply, piece of equipment, or tray: where it's kept and every card
// that lists it. Reached from search ("Raytec", "Mayo stand", "ortho tray").
export const itemLink = (name: string) => `/item?n=${encodeURIComponent(name)}`;

export const normItem = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export function ItemPage() {
  const { state } = useStore();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const name = params.get("n") ?? "";
  const key = normItem(name);

  const { uses, places, section } = useMemo(() => {
    const loc = new Map(state.locations.map((l) => [l.id, l]));
    const fac = new Map(state.facilities.map((f) => [f.id, f.name]));
    const uses: { cardId: string; procedure: string; surgeon?: string; detail?: string; qty?: number }[] = [];
    const places = new Map<string, string>(); // label -> facility
    let section: string | undefined;
    for (const c of state.cards) {
      for (const sec of SECTIONS) {
        for (const it of c[sec.key as SectionKey]) {
          if (normItem(it.name) !== key) continue;
          section ??= sec.label;
          uses.push({
            cardId: c.id,
            procedure: c.procedure,
            surgeon: state.surgeons.find((s) => s.id === c.surgeonId)?.name,
            detail: it.detail,
            qty: it.qty,
          });
          const l = it.locationId ? loc.get(it.locationId) : undefined;
          if (l) places.set(locationLabel(l), fac.get(l.facilityId) ?? "");
        }
      }
    }
    return { uses, places: [...places.entries()], section };
  }, [state, key]);

  const trays = state.spdTrays.filter((t) => normItem(t.name) === key);
  const catalog = state.catalog.find((c) => normItem(c.name) === key);

  return (
    <div className="page page-narrow">
      <div className="detail-top">
        <button className="link" onClick={() => navigate(-1)}>← Back</button>
      </div>
      <div className="page-head">
        <div>
          <h1 className="page-title"><NavIcon name={trays.length ? "spd" : "cards"} size={40} />{name || "Item"}</h1>
          <p className="muted">{section ?? (trays.length ? "Instrument tray" : "Item")}{catalog?.ref ? ` · REF ${catalog.ref}` : ""}</p>
        </div>
      </div>

      <div className="card form-card">
        <div className="card-head"><h2>Where it's kept</h2></div>
        {trays.map((t) => (
          <div key={t.id} className="resume-row">
            <span className="resume-title">Sterile processing{t.setNumber ? ` · set #${t.setNumber}` : ""}</span>
            <span className="spd-place">{spdPlace(t) || "No cabinet or shelf yet"}</span>
          </div>
        ))}
        {places.map(([label, facility]) => (
          <div key={label} className="resume-row">
            <span className="resume-title">{label}</span>
            <span className="muted small">{facility}</span>
          </div>
        ))}
        {trays.length === 0 && places.length === 0 && (
          <p className="muted small" style={{ margin: 0 }}>
            No location recorded yet. Set one on a card's item, or{" "}
            <Link className="link" to="/spd">add it in Sterile processing</Link> if it's a tray.
          </p>
        )}
      </div>

      <div className="card form-card">
        <div className="card-head"><h2>On {uses.length} {uses.length === 1 ? "card" : "cards"}</h2></div>
        {uses.length === 0 && <p className="muted small" style={{ margin: 0 }}>No preference cards list it.</p>}
        {uses.map((u, i) => (
          <Link key={u.cardId + i} to={`/cards/${u.cardId}`} className="resume-row">
            <span className="resume-title">{u.procedure}</span>
            <span className="muted small">{[u.surgeon, u.qty && u.qty > 1 ? `×${u.qty}` : "", u.detail].filter(Boolean).join(" · ")}</span>
            <span className="resume-go">Open →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
