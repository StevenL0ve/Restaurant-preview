import { useMemo, useState } from "react";
import { useAuth } from "../state/auth";
import { useStore, hasWaiver } from "../state/store";
import { VENUES, type SessionClass, type WaiverVenue } from "../types";
import { WAIVER_TEXT } from "../lib/waiverText";
import { money, fullDate, time } from "../lib/format";
import { tapLight, notifySuccess } from "../lib/haptics";

type BookVenue = "yoga" | "zenden" | "massage";
const filters: BookVenue[] = ["yoga", "zenden", "massage"];

export function Book() {
  const { user } = useAuth();
  const { state, bookClass, signWaiver } = useStore();
  const [venue, setVenue] = useState<BookVenue>("yoga");
  // The class the user is trying to book but must sign a waiver for first.
  const [gate, setGate] = useState<SessionClass | null>(null);
  const [sigName, setSigName] = useState(user?.name ?? "");
  const [agree, setAgree] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const classes = useMemo(
    () => state.classes.filter((c) => c.venue === venue).sort((a, b) => a.start.localeCompare(b.start)),
    [state.classes, venue],
  );

  const bookedIds = new Set(
    state.bookings.filter((b) => b.status === "confirmed").map((b) => b.classId),
  );

  function attemptBook(cls: SessionClass) {
    tapLight();
    if (cls.requiresWaiver && !hasWaiver(state, cls.venue)) {
      setSigName(user?.name ?? "");
      setAgree(false);
      setGate(cls);
      return;
    }
    doBook(cls);
  }

  function doBook(cls: SessionClass) {
    bookClass(cls.id);
    notifySuccess();
    setToast(`Booked: ${cls.name} · ${fullDate(cls.start)}`);
    setTimeout(() => setToast(null), 3500);
  }

  function confirmWaiver() {
    if (!gate || !agree || !sigName.trim()) return;
    signWaiver(gate.venue as WaiverVenue, sigName);
    const cls = gate;
    setGate(null);
    doBook(cls);
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Book a Session</h1>
          <p className="page-sub">Yoga classes, Zen Den treatments &amp; massage.</p>
        </div>
      </div>

      <div className="photo-banner">
        <img src="/photos/interior.jpeg" alt="The Common Ground community space" />
      </div>

      <div className="segmented">
        {filters.map((f) => (
          <button key={f} className={"seg" + (venue === f ? " active" : "")} onClick={() => setVenue(f)}>
            {VENUES[f].icon} {VENUES[f].short}
          </button>
        ))}
      </div>

      <div className="venue-banner card">
        <span className="venue-icon" aria-hidden>{VENUES[venue].icon}</span>
        <div>
          <div className="row-title">{VENUES[venue].name}</div>
          <div className="row-sub">{VENUES[venue].blurb}</div>
        </div>
        {hasWaiver(state, venue) && <span className="pill pill-ok">Waiver signed ✓</span>}
      </div>

      <div className="stack">
        {classes.map((cls) => {
          const isBooked = bookedIds.has(cls.id);
          const full = cls.booked >= cls.capacity;
          const spots = cls.capacity - cls.booked;
          return (
            <div key={cls.id} className="card class-card">
              <div className="class-body">
                <div className="menu-item-top">
                  <span className="menu-item-name">{cls.name}</span>
                  <span className="menu-item-price">{money(cls.price)}</span>
                </div>
                <div className="row-sub">{fullDate(cls.start)} · {time(cls.start)} · {cls.durationMin} min</div>
                <p className="menu-item-desc">{cls.description}</p>
                <div className="menu-item-tags">
                  <span className="tag">{cls.instructor}</span>
                  {cls.level && <span className="tag">{cls.level}</span>}
                  {!isBooked && !full && <span className="tag">{spots} spot{spots === 1 ? "" : "s"} left</span>}
                </div>
              </div>
              {isBooked ? (
                <span className="pill pill-ok">Booked ✓</span>
              ) : full ? (
                <span className="pill pill-muted">Full</span>
              ) : (
                <button className="btn btn-add" onClick={() => attemptBook(cls)}>Book</button>
              )}
            </div>
          );
        })}
      </div>

      {gate && (
        <div className="modal-scrim" onClick={() => setGate(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h2 className="modal-title">Sign your {VENUES[gate.venue].short} waiver</h2>
            <p className="modal-sub">Required once before booking {VENUES[gate.venue].name}.</p>
            <div className="waiver-text">{WAIVER_TEXT[gate.venue as WaiverVenue]}</div>
            <label className="field">
              <span>Type your full name to sign</span>
              <input value={sigName} onChange={(e) => setSigName(e.target.value)} placeholder="Alex Rivera" />
            </label>
            <label className="check">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              <span>I have read and agree to the waiver above.</span>
            </label>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setGate(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={!agree || !sigName.trim()} onClick={confirmWaiver}>
                Sign &amp; book
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
