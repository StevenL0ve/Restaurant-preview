import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../state/store";
import { search } from "../lib/search";
import { relativeTime } from "../lib/format";

const typeIcon: Record<string, string> = {
  message: "💬", event: "📅", expense: "💵", journal: "📔", info: "🗂️",
};
const typeLabel: Record<string, string> = {
  message: "Message", event: "Calendar", expense: "Expense", journal: "Journal", info: "Info Bank",
};

export function SearchPage() {
  const { state } = useStore();
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const hits = search(state, q);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Search</h1>
          <p className="muted">One search across every message, event, expense, journal entry, and record.</p>
        </div>
      </div>

      <div className="card search-page-box">
        <input
          className="search-page-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type at least 2 characters…"
          autoFocus
        />
      </div>

      {q.length >= 2 && (
        <p className="muted small" style={{ margin: "4px 4px 12px" }}>
          {hits.length} result{hits.length === 1 ? "" : "s"} for “{q}”
        </p>
      )}

      <div className="search-list">
        {hits.map((h) => (
          <button key={h.type + h.id} className="card search-list-item" onClick={() => navigate(h.to)}>
            <span className="hit-icon big">{typeIcon[h.type]}</span>
            <span className="hit-text">
              <span className="hit-title">
                {h.title} <span className="hit-type">{typeLabel[h.type]}</span>
              </span>
              <span className="hit-snippet">{h.snippet}</span>
            </span>
            <span className="muted small">{relativeTime(h.date)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
