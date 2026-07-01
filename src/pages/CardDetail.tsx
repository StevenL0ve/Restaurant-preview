import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStore, surgeonOf, locationLabelOf, facilityOf } from "../state/store";
import { Avatar } from "../components/Avatar";
import { shareCard } from "../lib/share";
import { accentStyle } from "../lib/accent";
import { SECTIONS, type SectionKey } from "../types";

export function CardDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, deleteCard, duplicateCard, toggleFavorite, exportCardFile, copyCardToFacility } = useStore();
  const [toast, setToast] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);

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
  const facility = facilityOf(state, card.facilityId);

  async function onShare() {
    const r = await shareCard(card!, sg, (locId) => locationLabelOf(state, locId));
    setToast(r === "copied" ? "Card copied to clipboard" : r === "failed" ? "Couldn’t share" : null);
    if (r) setTimeout(() => setToast(null), 1800);
  }

  function onDuplicate() {
    const copy = duplicateCard(card!.id);
    if (copy) navigate(`/cards/${copy.id}/edit`);
  }

  const meta: [string, string | undefined][] = [
    ["Position", card.position],
    ["Skin prep", card.prep],
    ["Draping", card.draping],
  ];

  return (
    <div className="page card-detail" style={accentStyle(card.specialty)}>
      <div className="detail-top">
        <Link className="link" to="/cards">← Cards</Link>
        <button
          className={"fav big" + (card.favorite ? " on" : "")}
          onClick={() => toggleFavorite(card.id)}
          aria-label="Favorite"
        >
          {card.favorite ? "★" : "☆"}
        </button>
      </div>

      <div className="page-head">
        <div>
          <h1>{card.procedure}</h1>
          <p className="muted detail-sub">
            {sg ? (
              <Link className="link" to={`/surgeons/${sg.id}`}>{sg.name}</Link>
            ) : "Unassigned"}
            <span className="accent-pill">{card.specialty}</span>
            {facility ? <span className="detail-facility">{facility.name}</span> : null}
          </p>
        </div>
        <div className="head-actions">
          <button className="btn btn-primary" onClick={() => navigate(`/cards/${card.id}/setup`)}>
            ▶ Start setup
          </button>
          <button className="btn" onClick={() => navigate(`/cards/${card.id}/edit`)}>Edit</button>
        </div>
      </div>

      {sg && (sg.gloveSize || sg.quirks) && (
        <div className="surgeon-banner" style={{ borderColor: sg.color }}>
          <Avatar surgeon={sg} size={40} />
          <div>
            {sg.gloveSize && (
              <div className="glove-line">
                <strong>Gloves {sg.gloveSize}</strong>
                {sg.gloveType ? ` · ${sg.gloveType}` : ""}
              </div>
            )}
            {sg.quirks && <div className="muted small">{sg.quirks}</div>}
          </div>
        </div>
      )}

      <div className="card detail-meta">
        {meta.filter(([, v]) => v?.trim()).map(([label, v]) => (
          <div className="meta-row" key={label}>
            <span className="meta-label">{label}</span>
            <span className="meta-value">{v}</span>
          </div>
        ))}
        {card.notes?.trim() && (
          <div className="meta-row note">
            <span className="meta-label">Notes</span>
            <span className="meta-value">{card.notes}</span>
          </div>
        )}
        {meta.every(([, v]) => !v?.trim()) && !card.notes?.trim() && (
          <p className="muted small" style={{ margin: 0 }}>No position / prep / notes recorded yet.</p>
        )}
      </div>

      {SECTIONS.map((sec) => {
        const arr = card[sec.key as SectionKey];
        if (!arr.length) return null;
        return (
          <div className="card section-card" key={sec.key}>
            <div className="card-head">
              <h2><span aria-hidden>{sec.icon}</span> {sec.label}</h2>
              <span className="pill">{arr.length}</span>
            </div>
            <ul className="item-list">
              {arr.map((it) => {
                const where = locationLabelOf(state, it.locationId);
                return (
                  <li key={it.id}>
                    <span className="item-name">{it.name}</span>
                    {it.detail && <span className="item-detail">{it.detail}</span>}
                    {where && <span className="item-location">📍 {where}</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      <div className="detail-actions">
        <button className="btn" onClick={onShare}>Share text</button>
        <button className="btn" onClick={() => exportCardFile(card.id)}>Export file</button>
        <button className="btn" onClick={onDuplicate}>Duplicate</button>
        {state.facilities.filter((f) => f.id !== card.facilityId).length > 0 && (
          <select
            className="loc-select"
            value=""
            onChange={(e) => {
              if (!e.target.value) return;
              const copy = copyCardToFacility(card.id, e.target.value);
              if (copy) navigate(`/cards/${copy.id}`);
            }}
            title="Copy this card to another facility"
          >
            <option value="">Copy to facility…</option>
            {state.facilities
              .filter((f) => f.id !== card.facilityId)
              .map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
          </select>
        )}
        {confirmDel ? (
          <span className="confirm">
            Delete this card?
            <button className="btn btn-danger btn-sm" onClick={() => { deleteCard(card.id); navigate("/cards"); }}>
              Delete
            </button>
            <button className="btn btn-sm" onClick={() => setConfirmDel(false)}>Cancel</button>
          </span>
        ) : (
          <button className="btn btn-danger" onClick={() => setConfirmDel(true)}>Delete</button>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
