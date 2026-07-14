import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useStore, surgeonOf, facilityOf, locationLabelOf } from "../state/store";
import { SECTIONS, type SectionKey } from "../types";

// A paper-ready view of one card: black-on-white, compact, no app chrome.
// Works anywhere the app runs — on a computer it prints to any printer, on an
// iPhone the print dialog also offers AirPrint and "Save to PDF" (which can
// then be emailed/texted). The on-screen toolbar disappears in print.
export function CardPrint() {
  const { id } = useParams();
  const { state } = useStore();
  const card = state.cards.find((c) => c.id === id);
  const sg = card ? surgeonOf(state, card.surgeonId) : undefined;
  const facility = card ? facilityOf(state, card.facilityId) : undefined;

  // Name the browser tab after the card so "Save as PDF" gets a good filename.
  useEffect(() => {
    if (!card) return;
    const prev = document.title;
    document.title = `${card.procedure} — preference card`;
    return () => { document.title = prev; };
  }, [card]);

  if (!card) {
    return (
      <div className="page">
        <div className="empty-state">
          <span className="empty-emoji">🤔</span>
          <p>That card doesn’t exist. <Link className="link" to="/cards">Back to all cards</Link>.</p>
        </div>
      </div>
    );
  }

  const meta: [string, string | undefined][] = [
    ["Position", card.position],
    ["Skin prep", card.prep],
    ["Draping", card.draping],
    ["Notes", card.notes],
  ];
  const updated = new Date(card.updatedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

  return (
    <div className="print-page">
      <div className="print-toolbar">
        <Link className="btn" to={`/cards/${card.id}`}>← Back to card</Link>
        <span className="muted small">On a phone, Print also offers <strong>Save to PDF</strong> — you can email or text the PDF from there.</span>
        <button className="btn btn-primary" onClick={() => window.print()}>🖨 Print</button>
      </div>

      <div className="print-sheet">
        <header className="print-head">
          <div>
            <h1>{card.procedure}</h1>
            <div className="print-sub">
              {sg && <span><strong>{sg.name}</strong> · {sg.specialty}</span>}
              {facility && <span> · {facility.name}</span>}
            </div>
          </div>
          <div className="print-brand">
            <span className="print-logo">ORSync</span>
            <span className="print-updated">Updated {updated}</span>
          </div>
        </header>

        {sg && (sg.gloveSize || sg.quirks) && (
          <div className="print-gloves">
            {sg.gloveSize && <span><strong>Gloves:</strong> {sg.gloveSize}{sg.gloveType ? ` (${sg.gloveType})` : ""}</span>}
            {sg.quirks && <span className="print-quirks"><strong>Surgeon notes:</strong> {sg.quirks}</span>}
          </div>
        )}

        <table className="print-meta">
          <tbody>
            {meta.filter(([, v]) => v?.trim()).map(([label, v]) => (
              <tr key={label}>
                <th>{label}</th>
                <td>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {SECTIONS.map((sec) => {
          const arr = card[sec.key as SectionKey];
          if (!arr.length) return null;
          return (
            <section className="print-section" key={sec.key}>
              <h2>{sec.label}</h2>
              <table className="print-items">
                <thead>
                  <tr><th className="col-item">Item</th><th className="col-detail">Detail</th><th className="col-loc">Location</th></tr>
                </thead>
                <tbody>
                  {arr.map((it) => (
                    <tr key={it.id}>
                      <td>{it.name}</td>
                      <td>{it.detail ?? ""}</td>
                      <td>{locationLabelOf(state, it.locationId) ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          );
        })}

        <footer className="print-foot">
          Printed from ORSync — the personal preference-card app. No patient information on this card.
        </footer>
      </div>
    </div>
  );
}
