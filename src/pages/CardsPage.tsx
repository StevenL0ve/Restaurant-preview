import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore, surgeonOf, totalItems } from "../state/store";
import { Avatar } from "../components/Avatar";
import { relativeTime } from "../lib/format";
import { accentStyle } from "../lib/accent";
import type { PrefCard } from "../types";

// The library: every preference card, filterable by specialty and searchable,
// favorites pinned to the top.
export function CardsPage() {
  const { state, toggleFavorite } = useStore();
  const navigate = useNavigate();
  const [specialty, setSpecialty] = useState<string>("all");
  const [q, setQ] = useState("");

  const specialties = useMemo(
    () => ["all", ...Array.from(new Set(state.cards.map((c) => c.specialty))).sort()],
    [state.cards],
  );

  const cards = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return state.cards
      .filter((c) => specialty === "all" || c.specialty === specialty)
      .filter((c) => {
        if (!needle) return true;
        const sg = surgeonOf(state, c.surgeonId);
        return (
          c.procedure.toLowerCase().includes(needle) ||
          (sg?.name.toLowerCase().includes(needle) ?? false)
        );
      })
      .sort((a, b) => {
        if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
        return b.updatedAt.localeCompare(a.updatedAt);
      });
  }, [state, specialty, q]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Cards</h1>
          <p className="muted">{state.cards.length} preference cards across {specialties.length - 1} specialties.</p>
        </div>
        <div className="head-actions">
          <button className="btn btn-primary" onClick={() => navigate("/cards/new")}>+ New card</button>
        </div>
      </div>

      <div className="filter-bar">
        <input
          className="search-page-input"
          placeholder="Filter by procedure or surgeon…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="chips">
          {specialties.map((s) => (
            <button
              key={s}
              className={"chip" + (specialty === s ? " active" : "")}
              onClick={() => setSpecialty(s)}
            >
              {s === "all" ? "All specialties" : s}
            </button>
          ))}
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="empty-state">
          <span className="empty-emoji">🗂️</span>
          <p>No cards yet. Tap <strong>New card</strong> to add your first preference card.</p>
        </div>
      ) : (
        <div className="card-grid">
          {cards.map((c) => (
            <CardTile key={c.id} card={c} onFav={() => toggleFavorite(c.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function CardTile({ card, onFav }: { card: PrefCard; onFav: () => void }) {
  const { state } = useStore();
  const sg = surgeonOf(state, card.surgeonId);
  return (
    <div className="pref-tile" style={accentStyle(card.specialty)}>
      <button
        className={"fav" + (card.favorite ? " on" : "")}
        onClick={onFav}
        aria-label={card.favorite ? "Unfavorite" : "Favorite"}
        title={card.favorite ? "Unfavorite" : "Favorite"}
      >
        {card.favorite ? "★" : "☆"}
      </button>
      <Link to={`/cards/${card.id}`} className="pref-tile-body">
        <div className="pref-tile-head">
          {sg && <Avatar surgeon={sg} size={34} />}
          <div className="pref-tile-meta">
            <div className="pref-proc">{card.procedure}</div>
            <div className="pref-sub">{sg?.name ?? "Unassigned"} · {card.specialty}</div>
          </div>
        </div>
        <div className="pref-tile-foot">
          <span className="pill">{totalItems(card)} items</span>
          <span className="muted small">Updated {relativeTime(card.updatedAt)}</span>
        </div>
      </Link>
    </div>
  );
}
