import { useMemo, useState } from "react";
import { useStore } from "../state/store";
import type { Venue } from "../types";
import { recommendForVenue, type Recommendation } from "../lib/recommend";
import { buildPalate } from "../lib/taste";
import { COLOR_META, vintageLabel } from "../lib/wine";
import { TasteBars } from "../components/TasteBars";

const VENUES: { id: Venue; label: string; icon: string; blurb: string }[] = [
  { id: "restaurant", label: "Restaurant", icon: "🍽️", blurb: "Confident picks to order by the glass or bottle." },
  { id: "wine-store", label: "Wine store", icon: "🛒", blurb: "Buy-worthy matches plus one to discover." },
  { id: "winery", label: "Winery", icon: "🍇", blurb: "Lean into your palate, then stretch it a little." },
];

// Tell the app where you're headed and it recommends bottles to try, drawn from
// the palate it has learned from your rack and cellar — each with a reason and a
// side-by-side comparison to the wine of yours it most resembles.
export function Outings() {
  const { state, addOuting } = useStore();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [place, setPlace] = useState("");

  const palate = useMemo(() => buildPalate(state.wines), [state.wines]);
  const result = useMemo(
    () => (venue ? recommendForVenue(venue, state.wines) : null),
    [venue, state.wines],
  );

  function saveOuting() {
    if (!venue || !result) return;
    addOuting({
      venue,
      place: place.trim() || VENUES.find((v) => v.id === venue)!.label,
      date: new Date().toISOString(),
      suggestionIds: result.recommendations.map((r) => r.wine.id),
      notes: "",
    });
    setPlace("");
    setVenue(null);
  }

  return (
    <div className="page outings-page">
      <p className="lead">Where are you headed? I'll suggest wines to try based on what's in your cellar.</p>

      <div className="venue-grid">
        {VENUES.map((v) => (
          <button
            key={v.id}
            className={"venue" + (venue === v.id ? " on" : "")}
            onClick={() => setVenue(v.id)}
          >
            <span className="venue-icon">{v.icon}</span>
            <span className="venue-label">{v.label}</span>
            <span className="venue-blurb">{v.blurb}</span>
          </button>
        ))}
      </div>

      {venue && (
        <label className="field place-field">
          <span>Name of the {VENUES.find((v) => v.id === venue)!.label.toLowerCase()} (optional)</span>
          <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="e.g. Bottega, Total Wine, Opus One" />
        </label>
      )}

      {palate.confidence === 0 && (
        <div className="callout">
          Log and rate a few wines first so I can learn your palate — then the
          recommendations get personal.
        </div>
      )}

      {result && (
        <>
          <div className="recs-head">
            <h2>For you to try</h2>
            <button className="btn btn-sm" onClick={saveOuting}>Save this outing</button>
          </div>
          <div className="recs">
            {result.recommendations.map((r) => (
              <RecCard key={r.wine.id} rec={r} />
            ))}
          </div>
        </>
      )}

      {state.outings.length > 0 && (
        <section className="past-outings">
          <h2>Past outings</h2>
          <ul>
            {state.outings.map((o) => (
              <li key={o.id}>
                <span className="po-venue">{VENUES.find((v) => v.id === o.venue)?.icon}</span>
                <span className="po-place">{o.place}</span>
                <span className="po-date">{new Date(o.date).toLocaleDateString()}</span>
                <span className="po-count">{o.suggestionIds.length} picks</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function RecCard({ rec }: { rec: Recommendation }) {
  const { wine, score, reason, anchor } = rec;
  const meta = COLOR_META[wine.color];
  return (
    <article className="rec">
      <header className="rec-head">
        <span className="rec-swatch" style={{ background: meta.hex }} aria-hidden />
        <span className="rec-title">
          <span className="rec-name">{wine.name} <span className="rec-vintage">{vintageLabel(wine.vintage)}</span></span>
          <span className="rec-sub">{[wine.producer, wine.region].filter(Boolean).join(" · ")}</span>
        </span>
        <span className="rec-score" title="Palate match">{score}<small>%</small></span>
      </header>

      <p className="rec-reason">{reason}</p>

      <TasteBars taste={wine.taste} compact />

      {anchor && (
        <div className="rec-anchor">
          <span className="anchor-label">Because you loved</span>
          <span className="anchor-wine">
            <span className="anchor-swatch" style={{ background: COLOR_META[anchor.color].hex }} aria-hidden />
            {anchor.name} <em>{vintageLabel(anchor.vintage)}</em>
          </span>
        </div>
      )}

      {wine.pairing && <p className="rec-pairing">🍴 {wine.pairing}</p>}
    </article>
  );
}
