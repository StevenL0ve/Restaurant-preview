import { Link, useNavigate } from "react-router-dom";
import {
  useStore,
  surgeonOf,
  totalItems,
  setupProgress,
  loanersSorted,
  loanerStats,
  isLoanerOverdue,
  isLoanerSoon,
} from "../state/store";
import { Avatar } from "../components/Avatar";
import { Icon, type IconName } from "../components/Icon";
import { relativeTime, formatDate } from "../lib/format";

export function Dashboard() {
  const { state } = useStore();
  const navigate = useNavigate();

  const favorites = state.cards.filter((c) => c.favorite);
  const recent = [...state.cards].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);
  // Any card with an in-progress (but not complete) setup.
  const inProgress = state.cards
    .filter((c) => state.setups[c.id]?.checked.length)
    .map((c) => ({ card: c, ...setupProgress(state, c) }))
    .filter((x) => x.done < x.total);

  const lstats = loanerStats(state);
  const loanerWatch = loanersSorted(state)
    .filter((l) => isLoanerOverdue(l) || isLoanerSoon(l))
    .slice(0, 4);

  const stats: { label: string; value: number; to: string; icon: IconName }[] = [
    { label: "Cards", value: state.cards.length, to: "/cards", icon: "cards" },
    { label: "Surgeons", value: state.surgeons.length, to: "/surgeons", icon: "surgeon" },
    { label: "Loaners active", value: lstats.active, to: "/loaners", icon: "truck" },
    { label: "Favorites", value: favorites.length, to: "/cards", icon: "star" },
  ];

  return (
    <div className="page">
      <div className="dash-hero">
        <div className="dash-hero-text">
          <h1>Ready for your next case</h1>
          <p>Your preference cards, your way — no hospital login, works offline.</p>
        </div>
        <button className="btn dash-hero-btn" onClick={() => navigate("/cards/new")}>
          <Icon name="plus" size={17} /> New card
        </button>
      </div>

      <div className="stat-grid">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="stat-card">
            <span className="stat-emoji" aria-hidden><Icon name={s.icon} size={20} /></span>
            <span className="stat-value">{s.value}</span>
            <span className="stat-label">{s.label}</span>
          </Link>
        ))}
      </div>

      {inProgress.length > 0 && (
        <div className="card form-card">
          <div className="card-head"><h2>Setup in progress</h2></div>
          {inProgress.map(({ card, done, total }) => (
            <Link key={card.id} to={`/cards/${card.id}/setup`} className="resume-row">
              <span className="resume-title">{card.procedure}</span>
              <span className="muted small">{done}/{total} pulled</span>
              <span className="resume-go">Resume →</span>
            </Link>
          ))}
        </div>
      )}

      {loanerWatch.length > 0 && (
        <div className="card form-card">
          <div className="card-head">
            <h2>🚚 Loaner trays to watch</h2>
            <Link className="link" to="/loaners">All loaners</Link>
          </div>
          {loanerWatch.map((l) => {
            const overdue = isLoanerOverdue(l);
            return (
              <Link key={l.id} to="/loaners" className="resume-row">
                <span className="resume-title">{l.description}</span>
                <span className={"small " + (overdue ? "neg" : "muted")}>
                  {overdue ? "Overdue" : l.caseDate ? `Case ${formatDate(l.caseDate)}` : "Soon"}
                </span>
                <span className="resume-go">Open →</span>
              </Link>
            );
          })}
        </div>
      )}

      <div className="dash-cols">
        <div className="card">
          <div className="card-head">
            <h2>★ Favorites</h2>
            <Link className="link" to="/cards">All cards</Link>
          </div>
          {favorites.length === 0 ? (
            <p className="muted small">Star the cards you reach for most and they’ll show up here.</p>
          ) : (
            <ul className="dash-list">
              {favorites.map((c) => {
                const sg = surgeonOf(state, c.surgeonId);
                return (
                  <li key={c.id}>
                    <Link to={`/cards/${c.id}`} className="dash-item">
                      {sg && <Avatar surgeon={sg} size={30} />}
                      <span className="dash-item-text">
                        <span className="dash-item-title">{c.procedure}</span>
                        <span className="muted small">{sg?.name} · {totalItems(c)} items</span>
                      </span>
                      <span className="dash-go">→</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="card-head"><h2>Recently updated</h2></div>
          <ul className="dash-list">
            {recent.map((c) => {
              const sg = surgeonOf(state, c.surgeonId);
              return (
                <li key={c.id}>
                  <Link to={`/cards/${c.id}`} className="dash-item">
                    {sg && <Avatar surgeon={sg} size={30} />}
                    <span className="dash-item-text">
                      <span className="dash-item-title">{c.procedure}</span>
                      <span className="muted small">{relativeTime(c.updatedAt)}</span>
                    </span>
                    <span className="dash-go">→</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
