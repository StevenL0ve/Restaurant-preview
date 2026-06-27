import { Link, useNavigate, useParams } from "react-router-dom";
import { useStore, surgeonOf, setupProgress } from "../state/store";
import { SECTIONS, type SectionKey } from "../types";

// Setup mode turns a card into a live pull-list: big tap targets, check items
// off as you gather them, and a progress bar that hits "Case ready" at 100%.
// State is persisted, so locking the phone mid-setup keeps your checkmarks.
export function SetupMode() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, toggleSetupItem, resetSetup } = useStore();

  const card = state.cards.find((c) => c.id === id);
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
  const { done, total } = setupProgress(state, card);
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const ready = total > 0 && done === total;

  return (
    <div className="page page-narrow setup">
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

      {(card.position || card.prep || sg?.gloveSize) && (
        <div className="card setup-ref">
          {sg?.gloveSize && <div><strong>Gloves</strong> {sg.gloveSize}{sg.gloveType ? ` · ${sg.gloveType}` : ""}</div>}
          {card.position && <div><strong>Position</strong> {card.position}</div>}
          {card.prep && <div><strong>Prep</strong> {card.prep}</div>}
        </div>
      )}

      {SECTIONS.map((sec) => {
        const arr = card[sec.key as SectionKey];
        if (!arr.length) return null;
        return (
          <div className="card section-card" key={sec.key}>
            <div className="card-head">
              <h2><span aria-hidden>{sec.icon}</span> {sec.label}</h2>
            </div>
            <ul className="check-list">
              {arr.map((it) => {
                const on = checked.has(it.id);
                return (
                  <li key={it.id} className={on ? "done" : ""}>
                    <label className="check-row">
                      <input type="checkbox" checked={on} onChange={() => toggleSetupItem(card.id, it.id)} />
                      <span className="check-main">
                        <span className="check-line">
                          <span className="check-name">{it.name}</span>
                          {it.detail && <span className="item-detail">{it.detail}</span>}
                        </span>
                        {it.location && <span className="item-location">📍 {it.location}</span>}
                      </span>
                    </label>
                  </li>
                );
              })}
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
