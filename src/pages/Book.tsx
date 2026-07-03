import { useMemo, useState } from "react";
import { useAuth } from "../state/auth";
import { useStore, hasWaiver } from "../state/store";
import { postableVenues } from "../lib/roles";
import { VENUES, type SessionClass, type WaiverVenue } from "../types";
import { WAIVER_TEXT } from "../lib/waiverText";
import { money, fullDate, time } from "../lib/format";
import { tapLight, notifySuccess } from "../lib/haptics";

type BookVenue = "yoga" | "pilates" | "zenden" | "massage";
const filters: BookVenue[] = ["yoga", "pilates", "zenden", "massage"];

// Each venue's banner is its own space.
const VENUE_PHOTO: Record<BookVenue, { src: string; alt: string }> = {
  yoga: { src: "/photos/yoga-class.jpeg", alt: "A joyful class at River Rock Yoga" },
  pilates: { src: "/photos/riverrock-lotus.jpeg", alt: "Mindful movement at Selah Pilates & Wellness" },
  zenden: { src: "/photos/zenden-salt.jpeg", alt: "The Zen Den Himalayan salt chamber" },
  massage: { src: "/photos/interior.jpeg", alt: "The Common Ground community space" },
};

export function Book() {
  const { user } = useAuth();
  const { state, bookClass, signWaiver, addClass, removeClass } = useStore();
  const [venue, setVenue] = useState<BookVenue>("yoga");
  // Owners manage their own venue's schedule; IT manages all of them.
  const canManage = postableVenues(user?.role, user?.venues).includes(venue);
  const [manageOpen, setManageOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newWhen, setNewWhen] = useState("");
  const [newDuration, setNewDuration] = useState("60");
  const [newCapacity, setNewCapacity] = useState("6");
  const [newPrice, setNewPrice] = useState("30");

  function submitClass() {
    if (!newName.trim() || !newWhen) return;
    addClass({
      venue,
      name: newName.trim(),
      instructor: user?.name ?? VENUES[venue].name,
      description: "",
      start: new Date(newWhen).toISOString(),
      durationMin: Math.max(15, Number(newDuration) || 60),
      capacity: Math.max(1, Number(newCapacity) || 6),
      price: Math.max(0, Number(newPrice) || 0),
      requiresWaiver: true,
    });
    setNewName(""); setNewWhen("");
    setManageOpen(false);
    setToast("Slot added to the schedule.");
    setTimeout(() => setToast(null), 3000);
  }
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
      {/* Storefront photo washing through behind the whole booking screen. */}
      <div className="page-photo-bg" aria-hidden />
      <div className="page-head">
        <div>
          <h1 className="page-title">Book a Session</h1>
          <p className="page-sub">Yoga &amp; Pilates classes, Zen Den treatments &amp; massage.</p>
        </div>
      </div>

      <div className="photo-banner">
        <img src={VENUE_PHOTO[venue].src} alt={VENUE_PHOTO[venue].alt} />
      </div>

      <div className="segmented">
        {filters.map((f) => (
          <button key={f} className={"seg" + (venue === f ? " active" : "")} onClick={() => setVenue(f)}>
            {VENUES[f].icon} {VENUES[f].short}
          </button>
        ))}
      </div>

      <div className="venue-banner card">
        {VENUES[venue].logo ? (
          <img className="venue-logo" src={VENUES[venue].logo} alt={`${VENUES[venue].name} logo`} />
        ) : (
          <span className="venue-icon" aria-hidden>{VENUES[venue].icon}</span>
        )}
        <div>
          <div className="row-title">{VENUES[venue].name}</div>
          <div className="row-sub">{VENUES[venue].blurb}</div>
        </div>
        {hasWaiver(state, venue) && <span className="pill pill-ok">Waiver signed ✓</span>}
      </div>

      <p className="footnote" style={{ margin: "-6px 2px 0" }}>🕐 {VENUES[venue].hours}</p>

      {canManage && (
        <div className="card">
          <button className="btn btn-ghost btn-block" onClick={() => setManageOpen((o) => !o)}>
            {manageOpen ? "Close" : "🗓️ Manage schedule — add a slot"}
          </button>
          {manageOpen && (
            <div className="auth-form" style={{ marginTop: 14 }}>
              <label className="field">
                <span>Session name</span>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Sunset Flow" />
              </label>
              <label className="field">
                <span>When</span>
                <input type="datetime-local" value={newWhen} onChange={(e) => setNewWhen(e.target.value)} />
              </label>
              <div className="stat-row" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <label className="field"><span>Minutes</span><input type="number" min="15" value={newDuration} onChange={(e) => setNewDuration(e.target.value)} /></label>
                <label className="field"><span>Capacity</span><input type="number" min="1" value={newCapacity} onChange={(e) => setNewCapacity(e.target.value)} /></label>
                <label className="field"><span>Price $</span><input type="number" min="0" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} /></label>
              </div>
              <button className="btn btn-primary" disabled={!newName.trim() || !newWhen} onClick={submitClass}>
                Add to schedule
              </button>
            </div>
          )}
        </div>
      )}

      <div className="stack">
        {classes.map((cls) => {
          const isBooked = bookedIds.has(cls.id);
          const full = cls.booked >= cls.capacity;
          const spots = cls.capacity - cls.booked;
          return (
            <div key={cls.id} className="card class-card">
              {canManage && (
                <button
                  className="slot-remove"
                  aria-label={`Close ${cls.name}`}
                  title="Close this slot"
                  onClick={() => { removeClass(cls.id); tapLight(); }}
                >✕</button>
              )}
              {cls.image && <img className="menu-item-photo" src={cls.image} alt={cls.name} />}
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
