import { Link } from "react-router-dom";
import { useStore, upcomingBookings, activeOrders, upcomingEvents } from "../state/store";
import { orderStatus } from "../lib/orders";
import { VENUES, type Venue } from "../types";
import { money, fullDate, time } from "../lib/format";

const orderVenues: Venue[] = ["restaurant", "cafe"];
const bookVenues: Venue[] = ["yoga", "zenden", "massage"];

export function Home() {
  const { state } = useStore();
  const { punch } = state;
  const upcoming = upcomingBookings(state).slice(0, 3);
  const active = activeOrders(state).slice(0, 2);
  const events = upcomingEvents(state).slice(0, 2);
  const pct = Math.round((punch.punches / punch.goal) * 100);

  return (
    <div className="page home">
      <section className="hero">
        <img className="hero-logo" src="/brand/logo.jpeg" alt="Common Ground logo" />
        <div className="hero-eyebrow">The Common Ground Projects</div>
        <h1 className="hero-title">Everything under one roof.</h1>
        <p className="hero-sub">
          Order from the café &amp; kitchen, earn a free coffee on your punch card,
          and book yoga, spa &amp; massage — all in one app.
        </p>
        <div className="hero-actions">
          <Link to="/menu" className="btn btn-primary">Order food &amp; coffee</Link>
          <Link to="/book" className="btn btn-ghost">Book a session</Link>
        </div>
      </section>

      {/* Punch card summary */}
      <Link to="/rewards" className="card punch-mini">
        <div className="punch-mini-top">
          <span className="punch-mini-label">☕️ Café punch card</span>
          {punch.rewards > 0 ? (
            <span className="pill pill-reward">{punch.rewards} free drink{punch.rewards > 1 ? "s" : ""} ready</span>
          ) : (
            <span className="punch-mini-count">{punch.punches} / {punch.goal}</span>
          )}
        </div>
        <div className="progress">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="punch-mini-foot">
          {punch.rewards > 0
            ? "Redeem at checkout on your next coffee."
            : `${punch.goal - punch.punches} more drink${punch.goal - punch.punches === 1 ? "" : "s"} until a free coffee.`}
        </div>
      </Link>

      {active.length > 0 && (
        <section className="section">
          <h2 className="section-title">Active orders</h2>
          <div className="stack">
            {active.map((o) => (
              <Link key={o.id} to="/orders" className="card row-card">
                <div>
                  <div className="row-title">Order #{o.id.slice(-4).toUpperCase()}</div>
                  <div className="row-sub">{o.lines.reduce((n, l) => n + l.qty, 0)} items · {money(o.total)}</div>
                </div>
                <span className={`status status-${orderStatus(o)}`}>{orderStatus(o)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2 className="section-title">Upcoming bookings</h2>
            <Link to="/bookings" className="link">See all</Link>
          </div>
          <div className="stack">
            {upcoming.map((b) => (
              <div key={b.id} className="card row-card">
                <div>
                  <div className="row-title">{VENUES[b.venue].icon} {b.name}</div>
                  <div className="row-sub">{fullDate(b.start)} · {time(b.start)} · {b.instructor}</div>
                </div>
                <span className="status status-confirmed">confirmed</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {events.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2 className="section-title">Happening soon</h2>
            <Link to="/community" className="link">Community</Link>
          </div>
          <div className="stack">
            {events.map((e) => (
              <Link key={e.id} to="/community" className="card row-card">
                <div>
                  <div className="row-title">{VENUES[e.venue].icon} {e.title}</div>
                  <div className="row-sub">{fullDate(e.start)} · {time(e.start)} · {VENUES[e.venue].name}</div>
                </div>
                <span className="pill pill-ok">Event</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Seasonal specials</h2>
          <Link to="/menu" className="link">Full menu</Link>
        </div>
        <div className="specials-row">
          {state.menu.filter((m) => m.image).map((m) => (
            <Link key={m.id} to="/menu" className="special-card" aria-label={`${m.name} — ${money(m.price)}`}>
              <img src={m.image} alt={m.name} />
              <span className="special-price">{money(m.price)}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Order &amp; sip</h2>
        <div className="venue-grid">
          {orderVenues.map((v) => (
            <Link key={v} to="/menu" className="card venue-card">
              <span className="venue-icon" aria-hidden>{VENUES[v].icon}</span>
              <div className="venue-name">{VENUES[v].name}</div>
              <div className="venue-blurb">{VENUES[v].blurb}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Move &amp; unwind</h2>
        <div className="venue-grid">
          {bookVenues.map((v) => (
            <Link key={v} to="/book" className="card venue-card">
              <span className="venue-icon" aria-hidden>{VENUES[v].icon}</span>
              <div className="venue-name">{VENUES[v].name}</div>
              <div className="venue-blurb">{VENUES[v].blurb}</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
