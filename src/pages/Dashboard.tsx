import { Link } from "react-router-dom";
import { useFacilityAccess } from "../lib/facilityGate";
import { usePendingRequests } from "../lib/approvals";
import { RekeyReminder } from "../components/RekeyReminder";
import {
  useStore,
  surgeonOf,
  totalItems,
  setupProgress,
  loanersSorted,
  isLoanerOverdue,
  isLoanerSoon,
  casesOn,
  localDay,
  currentOnCall,
  telHref,
} from "../state/store";
import { formatPhone } from "../lib/oncall";
import { Avatar } from "../components/Avatar";
import { relativeTime, formatDate } from "../lib/format";

export function Dashboard() {
  const { state } = useStore();
  const access = useFacilityAccess();
  const pending = usePendingRequests();

  const favorites = state.cards.filter((c) => c.favorite);
  const recent = [...state.cards].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);
  // Any card with an in-progress (but not complete) setup.
  const inProgress = state.cards
    .filter((c) => state.setups[c.id]?.checked.length)
    .map((c) => ({ card: c, ...setupProgress(state, c) }))
    .filter((x) => x.done < x.total);

  const loanerWatch = loanersSorted(state)
    .filter((l) => isLoanerOverdue(l) || isLoanerSoon(l))
    .slice(0, 4);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Home</h1>
          <p className="muted">Today at a glance: the lineup, who's on call, and what needs a push.</p>
        </div>
      </div>

      <RekeyReminder />

      {pending.length > 0 && (
        <Link to="/settings" className="card form-card approvals-tile">
          <div className="card-head">
            <h2>{pending.length} {pending.length === 1 ? "person is" : "people are"} waiting to join</h2>
            <span className="link">Review</span>
          </div>
          <p className="muted small" style={{ margin: 0 }}>
            {pending.slice(0, 3).map((m) => `${m.name}${m.position ? ` (${m.position})` : ""}`).join(", ")}
            {pending.length > 3 ? ` and ${pending.length - 3} more` : ""}. Approve or deny in Settings → Facility.
          </p>
        </Link>
      )}

      <TodayLineup />

      {access.open && <OnCallNow />}

      {inProgress.length > 0 && (
        <div className="card form-card">
          <div className="card-head">
            <h2>Setup in progress</h2>
            <img className="mascot-cart" src="brand/mascot-cart.png" alt="" width={92} height={74} />
          </div>
          {inProgress.map(({ card, done, total }) => (
            <Link key={card.id} to={`/cards/${card.id}/setup`} className="resume-row">
              <span className="resume-title">{card.procedure}</span>
              <span className="muted small">{done}/{total} pulled</span>
              <span className="resume-go">Resume →</span>
            </Link>
          ))}
        </div>
      )}

      {access.open && loanerWatch.length > 0 && (
        <div className="card form-card">
          <div className="card-head">
            <h2>Loaner trays to watch</h2>
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
            <h2>Favorites</h2>
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

// Who's reachable right now — the top of the on-call board, one tap to dial.
// Positions with nobody assigned surface first so gaps get noticed early.
function OnCallNow() {
  const { state } = useStore();
  if (state.onCallPositions.length === 0) return null;
  const rows = state.onCallPositions
    .map((pos) => ({ pos, now: currentOnCall(state, pos.id) }))
    .sort((a, b) => Number(!!a.now) - Number(!!b.now));
  const gaps = rows.filter((r) => !r.now).length;
  return (
    <div className="card form-card">
      <div className="card-head">
        <h2 className="oncall-head"><img className="mascot-phone" src="brand/mascot-phone.png" alt="" width={64} height={55} /> On call now</h2>
        <Link className="link" to="/on-call">Full board</Link>
      </div>
      {rows.slice(0, 4).map(({ pos, now }) => (
        <div key={pos.id} className="resume-row oncall-dash-row">
          <span className="resume-title">{pos.name}</span>
          {now ? (
            <>
              <span className="oncall-dash-who">
                {now.person.name}
                {now.person.phone && <span className="muted small"> · {formatPhone(now.person.phone)}</span>}
              </span>
              {telHref(now.person.phone) ? (
                <a className="btn btn-sm" href={telHref(now.person.phone)}>Call</a>
              ) : (
                <Link className="resume-go" to="/on-call">→</Link>
              )}
            </>
          ) : (
            <>
              <span className="small oncall-dash-gap">nobody set</span>
              <Link className="btn btn-sm" to="/on-call">Fix</Link>
            </>
          )}
        </div>
      ))}
      {rows.length > 4 && (
        <Link className="link small" to="/on-call">
          {rows.length - 4} more position{rows.length - 4 === 1 ? "" : "s"}{gaps > 1 ? ` · ${gaps} unfilled` : ""} →
        </Link>
      )}
    </div>
  );
}

// Today's lineup — the first thing to check in the morning. Shows up to three
// cases with time/room and setup state; links through to the full day view.
function TodayLineup() {
  const { state } = useStore();
  const cases = casesOn(state, localDay(0)).slice(0, 3);
  if (cases.length === 0) return null;
  return (
    <div className="card form-card">
      <div className="card-head">
        <h2>Today's lineup</h2>
        <Link className="link" to="/today">My day</Link>
      </div>
      {cases.map((c) => {
        const card = state.cards.find((x) => x.id === c.cardId);
        if (!card) return null;
        const { done, total } = setupProgress(state, card);
        const ready = total > 0 && done === total;
        return (
          <Link key={c.id} to="/today" className="resume-row">
            <span className="case-time">{c.time ?? "to follow"}</span>
            <span className="resume-title">{card.procedure}</span>
            <span className={"small " + (ready ? "pos" : "muted")}>
              {ready ? "Ready" : c.room ?? `${done}/${total}`}
            </span>
            <span className="resume-go">→</span>
          </Link>
        );
      })}
    </div>
  );
}
