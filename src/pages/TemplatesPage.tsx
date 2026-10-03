import { useNavigate } from "react-router-dom";
import { useStore, emptyCard, uid } from "../state/store";
import { TEMPLATES, templatesBySpecialty, templateItemCount, type CardTemplate } from "../lib/templates";
import { accentStyle } from "../lib/accent";
import { tapLight } from "../lib/haptics";
import type { CardItem, PrefCard, SectionKey } from "../types";

// Pick a starter card for a common procedure instead of typing from a blank
// page. Opening one lands in the normal editor as an unsaved draft, so the
// tech tunes it to their surgeon before anything is stored.
export function TemplatesPage() {
  const navigate = useNavigate();
  const { state } = useStore();

  function openTemplate(t: CardTemplate) {
    tapLight();
    const toItems = (arr?: CardTemplate["sections"][SectionKey]): CardItem[] =>
      (arr ?? []).map((i) => ({ id: uid("it"), name: i.name, detail: i.detail, qty: i.qty, hold: i.hold }));
    const sgMatch = state.surgeons.find((s) => s.specialty.toLowerCase() === t.specialty.toLowerCase());
    const seed: PrefCard = {
      ...emptyCard(sgMatch?.id ?? state.surgeons[0]?.id ?? "", t.specialty),
      procedure: t.procedure,
      position: t.position ?? "",
      prep: t.prep ?? "",
      draping: t.draping ?? "",
      notes: t.notes ?? "",
      instruments: toItems(t.sections.instruments),
      sutures: toItems(t.sections.sutures),
      supplies: toItems(t.sections.supplies),
      medications: toItems(t.sections.medications),
      equipment: toItems(t.sections.equipment),
    };
    navigate("/cards/new", { state: { seed } });
  }

  return (
    <div className="page page-narrow">
      <div className="detail-top">
        <button className="link" onClick={() => navigate(-1)}>← Back</button>
      </div>
      <div className="page-head">
        <div>
          <h1>Start from a template</h1>
          <p className="muted">
            {TEMPLATES.length} starter cards for common procedures. Pick one, then tune the items,
            quantities, and locations to your surgeon. Nothing is saved until you hit Save.
          </p>
        </div>
      </div>

      {templatesBySpecialty().map(([specialty, templates]) => (
        <section key={specialty} className="tpl-group">
          <h2 className="tpl-specialty">{specialty}</h2>
          <div className="tpl-list">
            {templates.map((t) => (
              <button key={t.procedure} className="tpl-row" style={accentStyle(t.specialty)} onClick={() => openTemplate(t)}>
                <span className="tpl-proc">{t.procedure}</span>
                <span className="muted small">
                  {templateItemCount(t)} items
                  {t.position ? ` · ${t.position.split(",")[0]}` : ""}
                </span>
                <span className="tpl-go" aria-hidden>→</span>
              </button>
            ))}
          </div>
        </section>
      ))}

      <p className="muted small">
        Missing your procedure? Start a <button className="link" onClick={() => navigate("/cards/new")}>blank card</button> or{" "}
        <button className="link" onClick={() => navigate("/cards/scan")}>scan a printed one</button>.
      </p>
    </div>
  );
}
