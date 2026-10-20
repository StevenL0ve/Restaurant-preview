import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore, surgeonOf, facilityOf } from "../state/store";
import { planCombine, buildCombinedCard, type DupGroup } from "../lib/combineCards";
import { tapLight } from "../lib/haptics";
import type { PrefCard } from "../types";

// Combine cards for procedures running as one case. Pick the surgeon's
// cards, settle the overlapping items (keep the multiplied count or step it
// down), then decide: a one-case combo, or a permanent combined card for
// this doctor going forward.
export function CombineCardsPage() {
  const navigate = useNavigate();
  const { state, saveCard } = useStore();

  const surgeonsWithCards = useMemo(
    () => state.surgeons.filter((s) => state.cards.filter((c) => c.surgeonId === s.id).length >= 2),
    [state],
  );
  const [surgeonId, setSurgeonId] = useState(surgeonsWithCards[0]?.id ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [nameEdited, setNameEdited] = useState(false);
  const [name, setName] = useState("");

  const surgeonCards = state.cards.filter((c) => c.surgeonId === surgeonId);
  const chosen = surgeonCards.filter((c) => selected.has(c.id));
  const plan = useMemo(() => (chosen.length >= 2 ? planCombine(chosen) : null), [chosen]);
  const autoName = chosen.map((c) => c.procedure).join(" + ");
  const title = nameEdited && name.trim() ? name : autoName;
  const facility = facilityOf(state, chosen[0]?.facilityId);
  const mixedFacilities = new Set(chosen.map((c) => c.facilityId ?? "none")).size > 1;

  function toggle(id: string) {
    tapLight();
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setOverrides({});
  }

  function create(oneCase: boolean) {
    if (!plan || chosen.length < 2 || !title.trim()) return;
    const card: PrefCard = buildCombinedCard(chosen, {
      procedure: oneCase ? `${title} (one case)` : title,
      qtyOverrides: overrides,
      oneCase,
    });
    saveCard(card);
    navigate(`/cards/${card.id}`);
  }

  return (
    <div className="page page-narrow">
      <div className="detail-top">
        <button className="link" onClick={() => navigate(-1)}>← Back</button>
      </div>
      <div className="page-head">
        <div>
          <h1>Combine cards</h1>
          <p className="muted">
            Two procedures, one case? Merge their cards: overlapping items are found for you, you
            decide how many of each to pull, and nothing is double-set-up by accident.
          </p>
        </div>
      </div>

      <div className="card form-card">
        <h2>1. Whose case?</h2>
        {surgeonsWithCards.length === 0 ? (
          <p className="muted small">You need at least two cards for the same surgeon to combine.</p>
        ) : (
          <>
            <select
              value={surgeonId}
              onChange={(e) => { setSurgeonId(e.target.value); setSelected(new Set()); setOverrides({}); }}
            >
              {surgeonsWithCards.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.specialty}</option>)}
            </select>
            <p className="muted small" style={{ margin: "10px 0 6px" }}>Pick the procedures being done together (2 or more):</p>
            <div className="combine-pick">
              {surgeonCards.map((c) => (
                <label key={c.id} className={"combine-card-row" + (selected.has(c.id) ? " on" : "")}>
                  <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                  <span className="combine-proc">{c.procedure}</span>
                  <span className="muted small">{facilityOf(state, c.facilityId)?.name ?? ""}</span>
                </label>
              ))}
            </div>
          </>
        )}
      </div>

      {plan && (
        <>
          <div className="card form-card">
            <h2>2. Settle the overlap</h2>
            {plan.dups.length === 0 ? (
              <p className="muted small">No overlapping items between these cards; everything carries straight over.</p>
            ) : (
              <>
                <p className="muted small">
                  These items are on more than one of the cards. Each starts at the multiplied
                  total; step it down if one is enough for the whole case.
                </p>
                <div className="dup-list">
                  {plan.dups.map((d) => (
                    <DupRow
                      key={d.key}
                      dup={d}
                      value={overrides[d.key] ?? d.combinedQty}
                      onChange={(n) => setOverrides((o) => ({ ...o, [d.key]: n }))}
                    />
                  ))}
                </div>
              </>
            )}
            {mixedFacilities && (
              <p className="muted small">
                These cards are at different facilities, so item locations are kept only for{" "}
                {facility?.name ?? "the first card's facility"}.
              </p>
            )}
          </div>

          <div className="card form-card">
            <h2>3. Name it and create</h2>
            <label className="field field-wide"><span>Combined card name</span>
              <input
                value={title}
                onChange={(e) => { setName(e.target.value); setNameEdited(true); }}
                placeholder="Cysto + Hernia Repair"
              />
            </label>
            <p className="muted small">
              {plan.itemCount} items total · {plan.dups.length} overlapping ·{" "}
              {surgeonOf(state, surgeonId)?.name}
            </p>
            <div className="form-actions">
              <button className="btn btn-primary" disabled={!title.trim()} onClick={() => create(false)}>
                Save for this doctor going forward
              </button>
              <button className="btn" disabled={!title.trim()} onClick={() => create(true)}>
                Use for this one case only
              </button>
            </div>
            <p className="muted small">
              A one-case combo gets a badge and an easy delete when the day's done. A saved combo
              lives in the library like any other card.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function DupRow({ dup, value, onChange }: { dup: DupGroup; value: number; onChange: (n: number) => void }) {
  const multiplied = dup.combinedQty;
  return (
    <div className="dup-row">
      <div className="dup-main">
        <span className="stock-name">{dup.name}</span>
        <span className="muted small">
          {dup.sources.map((s) => `${s.qty}× on ${s.procedure}`).join(", ")}
        </span>
      </div>
      <div className="dup-controls">
        <span className="stock-qty-controls">
          <button className="btn btn-sm" aria-label={`One fewer ${dup.name}`} disabled={value <= 1} onClick={() => onChange(Math.max(1, value - 1))}>−</button>
          <span className="stock-qty">{value}</span>
          <button className="btn btn-sm" aria-label={`One more ${dup.name}`} onClick={() => onChange(value + 1)}>+</button>
        </span>
        {value !== multiplied ? (
          <button className="link small" onClick={() => onChange(multiplied)}>keep multiplied ({multiplied})</button>
        ) : (
          <span className="muted small">multiplied total</span>
        )}
      </div>
    </div>
  );
}
