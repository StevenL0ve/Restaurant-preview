import { useMemo, useState } from "react";
import { useStore, surgeonOf, emptyCard } from "../state/store";
import { searchSurgeons, suggestCards, surgeonNamed } from "../lib/casePick";
import { planCombine } from "../lib/combineCards";
import { getWorkspace } from "../lib/workspace";
import { DupRow } from "../pages/CombineCardsPage";

// The top of the Add case form. The case name is typed the way the schedule
// says it, and doubles as a search for preference cards; the surgeon is a
// search too (or a new surgeon added on the spot). Matching cards show up
// to tick, and ticking two or more combines them for this case, with the
// overlapping items settled right here.

export interface CasePick {
  name: string;
  surgeonId: string;
  cardIds: string[]; // pick order: the first is the combo's base
  overrides: Record<string, number>; // overlap counts, by dup key
  keepCombo: boolean; // save the combined card for the surgeon going forward
}

export function initialPick(cardId?: string, caseName?: string, surgeonId?: string): CasePick {
  return { name: caseName ?? "", surgeonId: surgeonId ?? "", cardIds: cardId ? [cardId] : [], overrides: {}, keepCombo: false };
}

export function CaseCardPicker({ value, onChange }: { value: CasePick; onChange: (v: CasePick) => void }) {
  const { state, addSurgeon, saveCard } = useStore();
  const [nameFocus, setNameFocus] = useState(false);
  const [surgeonQuery, setSurgeonQuery] = useState("");
  const [newSpecialty, setNewSpecialty] = useState<string | null>(null); // open = adding a surgeon
  const [showAll, setShowAll] = useState(false); // all of the surgeon's cards, not just matches
  const set = (patch: Partial<CasePick>) => onChange({ ...value, ...patch });

  const surgeon = value.surgeonId ? surgeonOf(state, value.surgeonId) : undefined;
  const picked = value.cardIds.map((id) => state.cards.find((c) => c.id === id)).filter((c): c is NonNullable<typeof c> => !!c);
  const autoName = (ids: string[]) => ids.map((id) => state.cards.find((c) => c.id === id)?.procedure ?? "").filter(Boolean).join(" + ");

  // While typing the name: cards to pick straight from the field.
  const typed = nameFocus && value.name.trim()
    ? suggestCards(state.cards, value.name, value.surgeonId || undefined, 6).filter((c) => !value.cardIds.includes(c.id))
    : [];
  // Below: the cards that fit the name and surgeon, picked ones first, then
  // (on request, or when nothing fits) the rest of the surgeon's cards.
  const matches = suggestCards(state.cards, value.name, value.surgeonId || undefined, 10).filter((c) => !value.cardIds.includes(c.id));
  const rest = value.surgeonId
    ? state.cards
        .filter((c) => c.surgeonId === value.surgeonId && !value.cardIds.includes(c.id) && !matches.includes(c))
        .sort((a, b) => a.procedure.localeCompare(b.procedure))
    : [];
  const listRest = showAll || matches.length === 0;
  const fallback = !!value.name.trim() && matches.length === 0 && rest.length > 0 && picked.length === 0;
  const offered = [...picked, ...matches, ...(listRest ? rest : [])];

  const surgeonHits = surgeon ? [] : searchSurgeons(state.surgeons, surgeonQuery).slice(0, 6);
  const exact = surgeonNamed(state.surgeons, surgeonQuery);
  const specialties = useMemo(() => [...new Set(state.surgeons.map((s) => s.specialty).filter(Boolean))].sort(), [state.surgeons]);

  const plan = picked.length >= 2 ? planCombine(picked) : null;

  function pickFromName(id: string) {
    // Picking from the name field fills the name and the surgeon.
    const cardIds = [...value.cardIds, id];
    const card = state.cards.find((c) => c.id === id);
    onChange({ ...value, cardIds, name: autoName(cardIds), surgeonId: value.surgeonId || card?.surgeonId || "", overrides: {} });
  }

  function toggle(id: string) {
    const on = value.cardIds.includes(id);
    const cardIds = on ? value.cardIds.filter((x) => x !== id) : [...value.cardIds, id];
    const card = state.cards.find((c) => c.id === id);
    set({
      cardIds,
      overrides: {},
      name: value.name.trim() ? value.name : autoName(cardIds),
      surgeonId: value.surgeonId || (!on && card?.surgeonId) || "",
    });
  }

  function chooseSurgeon(id: string) {
    setSurgeonQuery("");
    setNewSpecialty(null);
    set({ surgeonId: id });
  }

  function addNewSurgeon() {
    const name = surgeonQuery.trim();
    if (!name) return;
    const s = addSurgeon({
      name,
      specialty: (newSpecialty ?? "").trim() || "General Surgery",
      facility: getWorkspace()?.name ?? state.facilities[0]?.name,
    });
    chooseSurgeon(s.id);
  }

  function newCardForCase() {
    if (!surgeon || !value.name.trim()) return;
    const facilityId = state.cards.find((c) => c.surgeonId === surgeon.id)?.facilityId ?? state.facilities[0]?.id;
    const card = { ...emptyCard(surgeon.id, surgeon.specialty, facilityId), procedure: value.name.trim() };
    saveCard(card);
    set({ cardIds: [...value.cardIds, card.id], overrides: {} });
  }

  return (
    <div className="case-pick field-wide">
      <div className="field case-pick-name">
        <span>Case (as it reads on the schedule)</span>
        <input
          value={value.name}
          onChange={(e) => set({ name: e.target.value })}
          onFocus={() => setNameFocus(true)}
          onBlur={() => setNameFocus(false)}
          placeholder="Repair Umbilical Hernia Robot-Assisted"
          autoCapitalize="words"
          aria-label="Case name"
        />
        {typed.length > 0 && (
          <div className="case-pick-drop" role="listbox">
            {typed.map((c) => (
              <button
                key={c.id}
                type="button"
                role="option"
                className="case-pick-opt"
                // mousedown, so the pick lands before the field loses focus
                onMouseDown={(e) => { e.preventDefault(); pickFromName(c.id); }}
              >
                <span className="suggest-name">{c.procedure}</span>
                <span className="muted small">{surgeonOf(state, c.surgeonId)?.name ?? "No surgeon"}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="field case-pick-surgeon">
        <span>Surgeon</span>
        {surgeon ? (
          <div className="case-pick-chip">
            <span><strong>{surgeon.name}</strong> <span className="muted">· {surgeon.specialty}</span></span>
            <button type="button" className="link small" onClick={() => set({ surgeonId: "" })}>Change</button>
          </div>
        ) : (
          <>
            <input
              value={surgeonQuery}
              onChange={(e) => { setSurgeonQuery(e.target.value); setNewSpecialty(null); }}
              placeholder="Search surgeons"
              autoCapitalize="words"
              aria-label="Surgeon"
            />
            {surgeonQuery.trim() && newSpecialty === null && (
              <div className="case-pick-drop static">
                {surgeonHits.map((s) => (
                  <button key={s.id} type="button" className="case-pick-opt" onClick={() => chooseSurgeon(s.id)}>
                    <span className="suggest-name">{s.name}</span>
                    <span className="muted small">{s.specialty}</span>
                  </button>
                ))}
                {!exact && (
                  <button type="button" className="case-pick-opt case-pick-add" onClick={() => setNewSpecialty("")}>
                    + Add “{surgeonQuery.trim()}” as a new surgeon
                  </button>
                )}
              </div>
            )}
            {newSpecialty !== null && (
              <div className="case-pick-new">
                <input
                  value={newSpecialty}
                  onChange={(e) => setNewSpecialty(e.target.value)}
                  placeholder="Specialty (General Surgery, Orthopedics…)"
                  list="case-pick-specialties"
                  autoCapitalize="words"
                  aria-label="New surgeon's specialty"
                  autoFocus
                />
                <datalist id="case-pick-specialties">{specialties.map((s) => <option key={s} value={s} />)}</datalist>
                <div className="form-actions">
                  <button type="button" className="btn btn-sm btn-primary" onClick={addNewSurgeon}>Add {surgeonQuery.trim()}</button>
                  <button type="button" className="btn btn-sm" onClick={() => setNewSpecialty(null)}>Cancel</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {(value.name.trim() || surgeon || picked.length > 0) && (
        <div className="field case-pick-cards">
          <span>Preference cards {picked.length > 1 ? `(${picked.length}, combined for this case)` : "(tick one, or several to combine)"}</span>
          {fallback && <p className="muted small" style={{ margin: 0 }}>No card matches that name yet. {surgeon?.name}'s cards:</p>}
          {offered.length === 0 ? (
            <p className="muted small" style={{ margin: 0 }}>
              {surgeon ? `${surgeon.name} has no cards yet.` : "No card matches yet. Pick the surgeon to see their cards."}
            </p>
          ) : (
            <div className="cleanup-variants">
              {offered.map((c) => {
                const on = value.cardIds.includes(c.id);
                const who = c.surgeonId !== value.surgeonId ? surgeonOf(state, c.surgeonId)?.name : undefined;
                return (
                  <label key={c.id} className={"pos-check" + (on ? " on" : "")}>
                    <input type="checkbox" checked={on} onChange={() => toggle(c.id)} />
                    <span>{c.procedure || "Untitled card"}{who && <span className="muted"> · {who}</span>}</span>
                  </label>
                );
              })}
            </div>
          )}
          {!listRest && rest.length > 0 && (
            <button type="button" className="link small case-pick-blank" onClick={() => setShowAll(true)}>
              Show {surgeon?.name}'s other {rest.length} {rest.length === 1 ? "card" : "cards"}
            </button>
          )}
          {surgeon && value.name.trim() && picked.length === 0 && !state.cards.some((c) => c.surgeonId === surgeon.id && c.procedure.trim().toLowerCase() === value.name.trim().toLowerCase()) && (
            <button type="button" className="link small case-pick-blank" onClick={newCardForCase}>
              + New blank card “{value.name.trim()}” for {surgeon.name}
            </button>
          )}
        </div>
      )}

      {plan && (
        <div className="field case-pick-combine">
          <span>Combining {picked.length} cards: settle the overlap</span>
          {plan.dups.length === 0 ? (
            <p className="muted small" style={{ margin: 0 }}>No items overlap; everything carries straight over.</p>
          ) : (
            <>
              <p className="muted small" style={{ margin: 0 }}>
                These are on more than one card. Each starts at the doubled-up total; step it down if one is enough.
              </p>
              <div className="dup-list">
                {plan.dups.map((d) => (
                  <DupRow
                    key={d.key}
                    dup={d}
                    value={value.overrides[d.key] ?? d.combinedQty}
                    onChange={(n) => set({ overrides: { ...value.overrides, [d.key]: n } })}
                  />
                ))}
              </div>
            </>
          )}
          <label className="toggle-row">
            <span>Also save the combined card for {surgeonOf(state, picked[0].surgeonId)?.name ?? "this surgeon"} going forward</span>
            <input type="checkbox" checked={value.keepCombo} onChange={(e) => set({ keepCombo: e.target.checked })} />
          </label>
        </div>
      )}
    </div>
  );
}
