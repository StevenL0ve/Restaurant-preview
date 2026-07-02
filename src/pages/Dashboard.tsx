import { Link } from "react-router-dom";
import {
  useStore,
  unreadCount,
  pendingRequests,
  expenseBalance,
} from "../state/store";
import { money, relativeTime, fullDate, time } from "../lib/format";

export function Dashboard() {
  const { state, respondToRequest } = useStore();
  const me = state.people.find((p) => p.id === state.meId)!;
  const unread = unreadCount(state);
  const requests = pendingRequests(state);
  const balance = expenseBalance(state);

  const upcoming = [...state.events]
    .filter((e) => new Date(e.start).getTime() >= Date.now() - 86400000)
    .sort((a, b) => +new Date(a.start) - +new Date(b.start))
    .slice(0, 4);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{greeting}</h1>
          <p className="muted">Here's where things stand with {state.people.find((p) => p.id === state.coParentId)?.name}.</p>
        </div>
      </div>

      <div className="stat-grid">
        <Link to="/messages" className="stat-card">
          <span className="stat-emoji">💬</span>
          <span className="stat-value">{unread}</span>
          <span className="stat-label">Unread messages</span>
        </Link>
        <Link to="/calendar" className="stat-card">
          <span className="stat-emoji">📅</span>
          <span className="stat-value">{requests.length}</span>
          <span className="stat-label">Schedule requests</span>
        </Link>
        <Link to="/expenses" className="stat-card">
          <span className="stat-emoji">💵</span>
          <span className={"stat-value " + (balance >= 0 ? "pos" : "neg")}>
            {money(Math.abs(balance))}
          </span>
          <span className="stat-label">
            {balance >= 0 ? "Owed to you" : "You owe"}
          </span>
        </Link>
        <Link to="/journal" className="stat-card">
          <span className="stat-emoji">📔</span>
          <span className="stat-value">{state.journal.length}</span>
          <span className="stat-label">Journal entries</span>
        </Link>
      </div>

      <div className="dash-cols">
        <section className="card">
          <div className="card-head">
            <h2>Up next</h2>
            <Link to="/calendar" className="link">Calendar →</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="muted pad">Nothing scheduled. Enjoy the quiet.</p>
          ) : (
            <ul className="timeline">
              {upcoming.map((e) => (
                <li key={e.id} className={"timeline-item cat-" + e.category}>
                  <span className="timeline-dot" />
                  <div>
                    <div className="timeline-title">{e.title}</div>
                    <div className="muted small">
                      {fullDate(e.start)}
                      {!e.allDay && ` · ${time(e.start)}`}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Needs your attention</h2>
          </div>
          {requests.length === 0 ? (
            <p className="muted pad">You're all caught up. 🎉</p>
          ) : (
            requests.map((r) => (
              <div key={r.id} className="request">
                <div className="request-title">{r.title}</div>
                {r.notes && <div className="muted small">{r.notes}</div>}
                <div className="request-actions">
                  <button className="btn btn-sm btn-primary" onClick={() => respondToRequest(r.id, true)}>
                    Accept
                  </button>
                  <button className="btn btn-sm" onClick={() => respondToRequest(r.id, false)}>
                    Decline
                  </button>
                </div>
              </div>
            ))
          )}

          <div className="card-head" style={{ marginTop: 18 }}>
            <h2>Recent message</h2>
            <Link to="/messages" className="link">Open →</Link>
          </div>
          {state.messages.slice(-1).map((m) => (
            <div key={m.id} className="mini-msg">
              <p>{m.body}</p>
              <span className="muted small">
                {m.fromId === me.id ? "You" : state.people.find((p) => p.id === m.fromId)?.name} · {relativeTime(m.createdAt)}
              </span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
