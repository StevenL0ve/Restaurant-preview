import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../state/store";
import { search } from "../lib/search";

export function SearchPage() {
  const { state } = useStore();
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const hits = search(state, q);

  return (
    <div className="page page-narrow">
      <div className="page-head"><h1>Search</h1></div>

      <div className="card search-page-box">
        <input
          className="search-page-input"
          placeholder="Surgeon, procedure, instrument, suture…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
      </div>

      {q.trim().length < 2 ? (
        <p className="muted small" style={{ padding: "0 4px" }}>
          Type at least two characters. Try “knee”, “Vicryl”, “tourniquet”, or a surgeon’s name.
        </p>
      ) : hits.length === 0 ? (
        <div className="empty-state">
          <span className="empty-emoji">🔍</span>
          <p>No matches for “{q}”.</p>
        </div>
      ) : (
        <div className="search-list">
          {hits.map((h) => (
            <button
              key={h.kind + h.id}
              className="card search-list-item"
              onClick={() => navigate(h.kind === "surgeon" ? `/surgeons/${h.id}` : `/cards/${h.id}`)}
            >
              <span className="hit-icon big" aria-hidden>{h.kind === "surgeon" ? "🧑‍⚕️" : "🗂️"}</span>
              <span className="hit-text">
                <span className="hit-title">{h.title} <span className="hit-type">{h.kind}</span></span>
                <span className="hit-snippet">{h.snippet ?? h.subtitle}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
