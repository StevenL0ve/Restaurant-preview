import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../state/store";
import { search } from "../lib/search";
import { NotificationsBell } from "./NotificationsBell";

const typeIcon: Record<string, string> = {
  message: "💬", event: "📅", expense: "💵", journal: "📔", info: "🗂️",
};

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
        <span className="search-icon" aria-hidden>🔍</span>
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search everything — messages, calendar, expenses…"
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
                <button key={h.type + h.id} className="search-hit" onMouseDown={() => go(h.to)}>
                  <span className="hit-icon">{typeIcon[h.type]}</span>
                  <span className="hit-text">
                    <span className="hit-title">{h.title}</span>
                    <span className="hit-snippet">{h.snippet}</span>
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
        <NotificationsBell />
        <div className="who">
          <Avatar id={state.coParentId} />
          <div className="who-text">
            <span className="who-label">Co-parenting with</span>
            <span className="who-name">
              {state.people.find((p) => p.id === state.coParentId)?.name}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

function Avatar({ id }: { id: string }) {
  const { state } = useStore();
  const p = state.people.find((x) => x.id === id);
  if (!p) return null;
  return (
    <span className="avatar" style={{ background: p.color }} title={p.name}>
      {p.initials}
    </span>
  );
}
