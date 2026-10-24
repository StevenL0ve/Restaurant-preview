import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore, casesForPerson, surgeonOf, localDay, getPullerName } from "../state/store";
import { teamMemberLabel } from "../types";
import type { CaseEntry } from "../types";

// Everyone's personal case history: the cases you were part of, and the ones
// you're scheduled into. Type any name to see a teammate's log instead —
// useful for "what rooms was Lee in this week?"

function fmtDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  return Number.isNaN(dt.getTime())
    ? date
    : dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

export function CaseLogPage() {
  const { state } = useStore();
  const [who, setWho] = useState(() => getPullerName());
  const today = localDay(0);

  const all = casesForPerson(state, who);
  const upcoming = all.filter((c) => c.date >= today).reverse(); // soonest first
  const past = all.filter((c) => c.date < today); // newest first already

  const names = [...new Set(state.staff.map((m) => m.name))].sort();

  const row = (c: CaseEntry) => {
    const card = state.cards.find((k) => k.id === c.cardId);
    const sg = card ? surgeonOf(state, card.surgeonId) : undefined;
    const me = (c.team ?? []).find((m) => m.name.toLowerCase().includes(who.trim().toLowerCase()));
    return (
      <Link key={c.id} className="card log-row" to={`/today?d=${c.date}`}>
        <span className="log-when">
          <strong>{fmtDay(c.date)}</strong>
          <span className="muted small">{[c.room, c.time ?? "to follow"].filter(Boolean).join(" · ")}</span>
        </span>
        <span className="log-what">
          <span className="log-proc">{card?.procedure ?? "Case"}</span>
          <span className="muted small">
            {[sg?.name, me ? `as ${teamMemberLabel(me)}` : null].filter(Boolean).join(" · ")}
          </span>
        </span>
      </Link>
    );
  };

  return (
    <div className="page page-narrow">
      <div className="detail-top">
        <Link className="link" to="/today">← My day</Link>
      </div>
      <div className="page-head">
        <div>
          <h1>Case log</h1>
          <p className="muted">
            Every case this person is on the room team for: what's coming up and what's done.
          </p>
        </div>
      </div>

      <div className="card form-card">
        <label className="field field-wide"><span>Whose log?</span>
          <input
            value={who}
            list="log-names"
            placeholder="Your name, or any teammate's"
            onChange={(e) => setWho(e.target.value)}
          />
          <datalist id="log-names">
            {names.map((n) => <option key={n} value={n} />)}
          </datalist>
        </label>
        {!who.trim() && (
          <p className="muted small" style={{ margin: 0 }}>
            Set your name in Settings and your own log opens here automatically.
          </p>
        )}
      </div>

      {who.trim() && (
        <>
          <h2 className="room-head">Scheduled {upcoming.length > 0 && <span className="muted small">· {upcoming.length}</span>}</h2>
          {upcoming.length === 0 ? (
            <p className="muted small">Nothing on the schedule yet.</p>
          ) : (
            <div className="case-list">{upcoming.map(row)}</div>
          )}

          <h2 className="room-head">Past cases {past.length > 0 && <span className="muted small">· {past.length}</span>}</h2>
          {past.length === 0 ? (
            <p className="muted small">
              No past cases recorded. Cases count once this person is added to a case's room team.
            </p>
          ) : (
            <div className="case-list">{past.slice(0, 100).map(row)}</div>
          )}
        </>
      )}
    </div>
  );
}
