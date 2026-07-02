import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../state/auth";
import { useStore } from "../state/store";
import { VENUES } from "../types";
import { seatingTimes, formatSeating, isValidParty, MAX_PARTY, RESTAURANT_HOURS_TEXT } from "../lib/reservations";
import { tapLight, notifySuccess } from "../lib/haptics";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function Reserve() {
  const { user } = useAuth();
  const { reserveTable } = useStore();
  const navigate = useNavigate();
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState<string | null>(null);
  const [party, setParty] = useState(2);

  const times = useMemo(() => seatingTimes(date), [date]);

  function confirm() {
    if (!time || !isValidParty(party)) return;
    reserveTable(date, time, party, user?.name ?? "Guest");
    notifySuccess();
    navigate("/bookings", { state: { justReserved: true } });
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Reserve a Table</h1>
          <p className="page-sub">By the Fig &amp; the Olive · {RESTAURANT_HOURS_TEXT}</p>
        </div>
      </div>

      <div className="photo-banner">
        <img src="/photos/figolive-mezze.jpeg" alt="A mezze spread at By the Fig & the Olive" />
      </div>

      <div className="venue-banner card">
        <img className="venue-logo" src={VENUES.restaurant.logo} alt="Fig + Olive logo" />
        <div>
          <div className="row-title">{VENUES.restaurant.name}</div>
          <div className="row-sub">🕐 {VENUES.restaurant.hours}</div>
        </div>
      </div>

      <section className="section">
        <h2 className="section-title">When</h2>
        <div className="card reserve-form">
          <label className="field">
            <span>Date</span>
            <input type="date" min={todayISO()} value={date} onChange={(e) => { setDate(e.target.value); setTime(null); }} />
          </label>
          <div className="stamp-row">
            <span className="row-title">Party size</span>
            <div className="stepper">
              <button onClick={() => setParty((p) => Math.max(1, p - 1))} aria-label="Smaller party">−</button>
              <span>{party}</span>
              <button onClick={() => setParty((p) => Math.min(MAX_PARTY, p + 1))} aria-label="Larger party">+</button>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Seatings</h2>
        {times.length === 0 ? (
          <div className="card menu-note">
            The restaurant is closed that day — open {RESTAURANT_HOURS_TEXT}. Pick a
            Tuesday through Saturday.
          </div>
        ) : (
          <div className="seatings-grid">
            {times.map((t) => (
              <button
                key={t}
                className={"btn seat-btn" + (time === t ? " seat-active" : "")}
                onClick={() => { setTime(t); tapLight(); }}
              >
                {formatSeating(t)}
              </button>
            ))}
          </div>
        )}
      </section>

      <button className="btn btn-primary btn-block" disabled={!time} onClick={confirm}>
        {time ? `Reserve for ${party} · ${formatSeating(time)}` : "Pick a seating time"}
      </button>
      <p className="footnote" style={{ textAlign: "center" }}>
        Reservations are free — you'll get a reminder before your seating.{" "}
        <Link to="/menu" className="link">Browse the menu</Link>
      </p>
    </div>
  );
}
