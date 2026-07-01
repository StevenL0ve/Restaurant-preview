import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStore, surgeonOf, setupProgress, groupByArea, locationLabelOf } from "../state/store";
import { accentStyle } from "../lib/accent";
import { SECTIONS, type CardItem, type SectionKey } from "../types";

type GroupMode = "location" | "section";

const CONFETTI_COLORS = ["#0d9488", "#f59e0b", "#e11d48", "#6366f1", "#10b981", "#2dd4bf"];

/** Short celebratory burst rendered when the pull-list hits 100%. */
function Confetti() {
  const pieces = Array.from({ length: 22 }, (_, i) => ({
    left: `${(i * 137.5) % 100}%`, // golden-angle spread, no Math.random needed
    delay: `${(i % 7) * 0.05}s`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    drift: `${((i % 5) - 2) * 34}px`,
    spin: `${(i % 2 ? 1 : -1) * (240 + (i % 4) * 90)}deg`,
  }));
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            left: p.left,
            animationDelay: p.delay,
            background: p.color,
            ["--drift" as string]: p.drift,
            ["--spin" as string]: p.spin,
          }}
        />
      ))}
    </div>
  );
}

// Setup mode turns a card into a live pull-list: big tap targets, check items
// off as you gather them, and a progress bar that hits "Case ready" at 100%.
// Default view groups by **location area**, so you walk to one cart/cabinet and
// grab everything there at once. Toggle to "By section" for the classic view.
export function SetupMode() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, toggleSetupItem, resetSetup } = useStore();
  const [mode, setMode] = useState<GroupMode>("location");

  const card = state.cards.find((c) => c.id === id);

  // Completion state is computed before the not-found return so the
  // celebration hooks below run unconditionally.
  const { done, total } = card ? setupProgress(state, card) : { done: 0, total: 0 };
  const ready = total > 0 && done === total;
  const [burst, setBurst] = useState(false);
  const prevReady = useRef(ready);
  useEffect(() => {
    const was = prevReady.current;
    prevReady.current = ready;
    if (ready && !was) {
      setBurst(true);
      const t = setTimeout(() => setBurst(false), 1700);
      return () => clearTimeout(t);
    }
  }, [ready]);

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

  const sg = surgeonOf(state, card.surgeonId);
  const checked = new Set(state.setups[card.id]?.checked ?? []);
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const Row = ({ it, sub }: { it: CardItem; sub?: string }) => {
    const on = checked.has(it.id);
    const where = locationLabelOf(state, it.locationId);
    return (
      <li className={on ? "done" : ""}>
        <label className="check-row">
          <input type="checkbox" checked={on} onChange={() => toggleSetupItem(card.id, it.id)} />
          <span className="check-main">
            <span className="check-line">
              <span className="check-name">{it.name}</span>
              {it.detail && <span className="item-detail">{it.detail}</span>}
            </span>
            {sub && <span className="row-sub">{sub}</span>}
            {where && mode === "section" && <span className="item-location">📍 {where}</span>}
          </span>
        </label>
      </li>
    );
  };

  const areaGroups = groupByArea(state, card);

  return (
    <div className="page page-narrow setup" style={accentStyle(card.specialty)}>
      {burst && <Confetti />}
      <div className="detail-top">
        <Link className="link" to={`/cards/${card.id}`}>← Done</Link>
        <button className="link" onClick={() => resetSetup(card.id)}>Reset</button>
      </div>

      <div className="page-head">
        <div>
          <h1>{card.procedure}</h1>
          <p className="muted">{sg?.name} · Pull-list setup</p>
        </div>
      </div>

      <div className={"progress-card" + (ready ? " ready" : "")}>
        <div className="progress-top">
          <span className="progress-count">{done} / {total} gathered</span>
          {ready ? <span className="ready-badge">✓ Case ready</span> : <span className="muted">{pct}%</span>}
        </div>
        <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
      </div>

      <div className="seg">
        <button className={"seg-btn" + (mode === "location" ? " active" : "")} onClick={() => setMode("location")}>
          📍 By location
        </button>
        <button className={"seg-btn" + (mode === "section" ? " active" : "")} onClick={() => setMode("section")}>
          🗂️ By section
        </button>
      </div>

      {(card.position || card.prep || sg?.gloveSize) && (
        <div className="card setup-ref">
          {sg?.gloveSize && <div><strong>Gloves</strong> {sg.gloveSize}{sg.gloveType ? ` · ${sg.gloveType}` : ""}</div>}
          {card.position && <div><strong>Position</strong> {card.position}</div>}
          {card.prep && <div><strong>Prep</strong> {card.prep}</div>}
        </div>
      )}

      {mode === "location"
        ? areaGroups.map((g) => {
            const groupDone = g.rows.filter((r) => checked.has(r.item.id)).length;
            return (
              <div className="card section-card" key={g.area || "__none"}>
                <div className="card-head">
                  <h2>
                    <span aria-hidden>📍</span> {g.area || "No location set"}
                  </h2>
                  <span className="pill">{groupDone}/{g.rows.length}</span>
                </div>
                <ul className="check-list">
                  {g.rows.map((r) => (
                    <Row
                      key={r.item.id}
                      it={r.item}
                      sub={`${r.sectionIcon} ${r.sectionLabel}${locationLabelOf(state, r.item.locationId) ? ` · ${locationLabelOf(state, r.item.locationId)}` : ""}`}
                    />
                  ))}
                </ul>
              </div>
            );
          })
        : SECTIONS.map((sec) => {
            const arr = card[sec.key as SectionKey];
            if (!arr.length) return null;
            return (
              <div className="card section-card" key={sec.key}>
                <div className="card-head">
                  <h2><span aria-hidden>{sec.icon}</span> {sec.label}</h2>
                </div>
                <ul className="check-list">
                  {arr.map((it) => <Row key={it.id} it={it} />)}
                </ul>
              </div>
            );
          })}

      {ready && (
        <div className="ready-cta">
          <p>Everything’s pulled. 🎉</p>
          <button className="btn btn-primary" onClick={() => navigate(`/cards/${card.id}`)}>Back to card</button>
        </div>
      )}
    </div>
  );
}
