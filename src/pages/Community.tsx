import { useState } from "react";
import { useAuth } from "../state/auth";
import { useStore, upcomingEvents } from "../state/store";
import { VENUES, type Venue } from "../types";
import { requestEventAlerts, notify } from "../lib/notify";
import { fullDate, time } from "../lib/format";
import { tapLight, notifySuccess } from "../lib/haptics";

const EVENT_VENUES: Venue[] = ["cafe", "restaurant", "yoga", "zenden"];

export function Community() {
  const { user } = useAuth();
  const { state, addEvent, setEventAlerts } = useStore();
  const events = upcomingEvents(state);
  const [alertStatus, setAlertStatus] = useState<string | null>(null);

  // "Post an event" form
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [venue, setVenue] = useState<Venue>("cafe");
  const [when, setWhen] = useState("");
  const [desc, setDesc] = useState("");
  const [poster, setPoster] = useState<string | undefined>();
  const [posted, setPosted] = useState(false);

  async function toggleAlerts(on: boolean) {
    tapLight();
    if (!on) {
      setEventAlerts(false);
      setAlertStatus(null);
      return;
    }
    const status = await requestEventAlerts();
    if (status === "granted") {
      setEventAlerts(true);
      const next = events[0];
      const fired = next
        ? notify("CGP Community", `Next up: ${next.title} · ${fullDate(next.start)}`)
        : notify("CGP Community", "You're set — we'll ping you about upcoming events.");
      setAlertStatus(fired ? "Notifications are on — we just sent a test." : "Notifications are on.");
    } else {
      setEventAlerts(false);
      setAlertStatus(
        status === "denied"
          ? "Notifications are blocked for this app — enable them in your device settings."
          : "This device doesn't support notifications.",
      );
    }
  }

  function onPosterPick(file: File | undefined) {
    if (!file) return setPoster(undefined);
    const reader = new FileReader();
    reader.onload = () => setPoster(typeof reader.result === "string" ? reader.result : undefined);
    reader.readAsDataURL(file);
  }

  function post() {
    if (!title.trim() || !when) return;
    addEvent({
      title: title.trim(),
      venue,
      start: new Date(when).toISOString(),
      description: desc.trim(),
      image: poster,
    });
    notifySuccess();
    setTitle(""); setWhen(""); setDesc(""); setPoster(undefined);
    setFormOpen(false);
    setPosted(true);
    setTimeout(() => setPosted(false), 3000);
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Community</h1>
          <p className="page-sub">What's happening across the café, Fig + Olive, The Studio &amp; the Zen Den.</p>
        </div>
      </div>

      {/* Notifications */}
      <div className="card">
        <div className="toggle-row">
          <div>
            <div className="row-title">🔔 Event notifications</div>
            <div className="row-sub">Get a heads-up about upcoming events.</div>
          </div>
          <input
            type="checkbox"
            role="switch"
            checked={state.eventAlerts}
            onChange={(e) => toggleAlerts(e.target.checked)}
            aria-label="Event notifications"
          />
        </div>
        {alertStatus && <p className="wallet-status" style={{ marginTop: 10 }}>{alertStatus}</p>}
      </div>

      {posted && <div className="card success-banner">🎉 Event posted!</div>}

      {/* Upcoming events */}
      <section className="section">
        <h2 className="section-title">Upcoming</h2>
        <div className="stack">
          {events.length === 0 && (
            <div className="empty"><div className="empty-icon">🗓️</div><p>Nothing on the calendar yet.</p></div>
          )}
          {events.map((e) => (
            <article key={e.id} className="card event-card">
              {e.image && <img className="event-poster" src={e.image} alt={`${e.title} poster`} />}
              <div className="event-body">
                <div className="menu-item-top">
                  <span className="row-title">{e.title}</span>
                  <span className="cat-venue">{VENUES[e.venue].icon} {VENUES[e.venue].short}</span>
                </div>
                <div className="row-sub">{fullDate(e.start)} · {time(e.start)} · {VENUES[e.venue].name}</div>
                {e.description && <p className="menu-item-desc">{e.description}</p>}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Posting is staff-only: the form only exists for admin accounts. */}
      {!user?.isAdmin && (
        <p className="footnote" style={{ textAlign: "center" }}>
          Events are posted by CGP staff.
        </p>
      )}
      {user?.isAdmin && (
      <div className="card">
        <button className="btn btn-ghost btn-block" onClick={() => setFormOpen((o) => !o)}>
          {formOpen ? "Close" : "📌 Post an event"}
        </button>
        {formOpen && (
          <div className="auth-form" style={{ marginTop: 14 }}>
            <label className="field">
              <span>Event title</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Open Mic Night" />
            </label>
            <label className="field">
              <span>Where</span>
              <select value={venue} onChange={(e) => setVenue(e.target.value as Venue)} className="select">
                {EVENT_VENUES.map((v) => (
                  <option key={v} value={v}>{VENUES[v].name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>When</span>
              <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
            </label>
            <label className="field">
              <span>Details</span>
              <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What should people know?" />
            </label>
            <label className="field">
              <span>Poster (optional)</span>
              <input type="file" accept="image/*" onChange={(e) => onPosterPick(e.target.files?.[0])} />
            </label>
            {poster && <img className="event-poster" src={poster} alt="Poster preview" />}
            <button className="btn btn-primary" disabled={!title.trim() || !when} onClick={post}>
              Post event
            </button>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
