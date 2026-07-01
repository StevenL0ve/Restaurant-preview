import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../state/store";
import { search } from "../lib/search";
import { ThemeToggle } from "./ThemeToggle";
import { Icon } from "./Icon";

export function TopBar() {
  const { state } = useStore();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const hits = search(state, q).slice(0, 6);

  function go(to: string) {
    setOpen(false);
    setQ("");
    navigate(to);
  }

  return (
    <header className="topbar">
      <div className="search">
        <span className="search-icon" aria-hidden><Icon name="search" size={17} /></span>
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search surgeons, procedures, instruments…"
          aria-label="Search"
        />
        {q && (
          <button className="search-clear" onMouseDown={() => setQ("")} aria-label="Clear">
            ✕
          </button>
        )}
        {open && q.length >= 2 && (
          <div className="search-results">
            {hits.length === 0 ? (
              <div className="search-empty">No matches for “{q}”.</div>
            ) : (
              hits.map((h) => (
                <button
                  key={h.kind + h.id}
                  className="search-hit"
                  onMouseDown={() => go(h.kind === "surgeon" ? `/surgeons/${h.id}` : `/cards/${h.id}`)}
                >
                  <span className="hit-icon"><Icon name={h.kind === "surgeon" ? "surgeon" : "cards"} size={18} /></span>
                  <span className="hit-text">
                    <span className="hit-title">{h.title}</span>
                    <span className="hit-snippet">{h.snippet ?? h.subtitle}</span>
                  </span>
                </button>
              ))
            )}
            <button className="search-all" onMouseDown={() => go("/search")}>
              See all results →
            </button>
          </div>
        )}
      </div>

      <div className="topbar-right">
        <ThemeToggle />
        <button className="btn btn-primary btn-sm topbar-new" onClick={() => navigate("/cards/new")}>
          <Icon name="plus" size={16} /> New card
        </button>
      </div>
    </header>
  );
}
