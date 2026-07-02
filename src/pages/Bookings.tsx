import { Link, useLocation } from "react-router-dom";
import { useStore } from "../state/store";
import { VENUES } from "../types";
import { formatSeating } from "../lib/reservations";
import { fullDate, time } from "../lib/format";
import { tapLight } from "../lib/haptics";

export function Bookings() {
  const { state, cancelBooking, cancelReservation } = useStore();
  const location = useLocation();
  const justReserved = (location.state as { justReserved?: boolean } | null)?.justReserved;
  const now = Date.now();
  const tables = state.reservations.filter((r) => r.status === "confirmed");

  const sorted = [...state.bookings].sort((a, b) => b.start.localeCompare(a.start));
  const upcoming = sorted
    .filter((b) => b.status === "confirmed" && new Date(b.start).getTime() >= now - 3600_000)
    .sort((a, b) => a.start.localeCompare(b.start));
  const past = sorted.filter((b) => !upcoming.includes(b));

  if (state.bookings.length === 0 && tables.length === 0) {
    return (
      <div className="page">
        <h1 className="page-title">My Bookings</h1>
        <div className="empty">
          <div className="empty-icon">📅</div>
          <p>No bookings yet.</p>
          <Link to="/book" className="btn btn-primary">Book a session</Link>
          <Link to="/reserve" className="btn btn-ghost">Reserve a table</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">My Bookings</h1>

      {justReserved && <div className="card success-banner">🍽️ Table reserved! See you there.</div>}

      {tables.length > 0 && (
        <section className="section">
          <h2 className="section-title">Table reservations</h2>
          <div className="stack">
            {tables.map((r) => (
              <div key={r.id} className="card class-card">
                <div className="class-body">
                  <div className="row-title">🍽️ {VENUES.restaurant.name}</div>
                  <div className="row-sub">{fullDate(`${r.date}T${r.time}:00`)} · {formatSeating(r.time)} · party of {r.partySize}</div>
                  <span className="tag">Table for {r.name}</span>
                </div>
                <button className="btn btn-ghost btn-danger" onClick={() => { cancelReservation(r.id); tapLight(); }}>
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="section">
          <h2 className="section-title">Upcoming</h2>
          <div className="stack">
            {upcoming.map((b) => (
              <div key={b.id} className="card class-card">
                <div className="class-body">
                  <div className="row-title">{VENUES[b.venue].icon} {b.name}</div>
                  <div className="row-sub">{fullDate(b.start)} · {time(b.start)} · {b.durationMin} min · {b.instructor}</div>
                  <span className="tag">{VENUES[b.venue].name}</span>
                </div>
                <button
                  className="btn btn-ghost btn-danger"
                  onClick={() => { cancelBooking(b.id); tapLight(); }}
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section className="section">
          <h2 className="section-title">Past &amp; cancelled</h2>
          <div className="stack">
            {past.map((b) => (
              <div key={b.id} className="card row-card muted">
                <div>
                  <div className="row-title">{VENUES[b.venue].icon} {b.name}</div>
                  <div className="row-sub">{fullDate(b.start)} · {time(b.start)}</div>
                </div>
                <span className={"status " + (b.status === "cancelled" ? "status-cancelled" : "status-completed")}>
                  {b.status === "cancelled" ? "cancelled" : "attended"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
