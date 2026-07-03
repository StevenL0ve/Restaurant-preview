import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, listTeam, addTeammate, removeTeammate, type Teammate } from "../state/auth";
import { ROLE_LABEL, ALL_VENUES } from "../lib/roles";
import { VENUES, type Venue } from "../types";
import { notifySuccess, tapLight } from "../lib/haptics";

// Team management — IT and owners only. Owners span every venue; staff are
// assigned the sections they actually work (one or several).

export function Team() {
  const { user } = useAuth();
  const [team, setTeam] = useState<Teammate[]>(() => listTeam());

  // Add-teammate form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState<"owner" | "staff">("staff");
  const [venues, setVenues] = useState<Venue[]>([]);
  const [issued, setIssued] = useState<{ email: string; password: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user || (user.role !== "it" && user.role !== "owner")) {
    return <Navigate to="/" replace />;
  }

  function toggleVenue(v: Venue) {
    setVenues((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]));
  }

  async function add() {
    setError(null);
    try {
      const temp = await addTeammate(name, email, tier, venues);
      setIssued({ email: email.trim().toLowerCase(), password: temp });
      setTeam(listTeam());
      setName(""); setEmail(""); setVenues([]);
      notifySuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add that account.");
    }
  }

  function remove(mate: Teammate) {
    try {
      removeTeammate(mate.email);
      setTeam(listTeam());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove that account.");
    }
  }

  const owners = team.filter((t) => t.role === "owner" || t.role === "it");
  const staff = team.filter((t) => t.role === "staff");

  const smsBody = issued
    ? encodeURIComponent(
        `Your CGP app login: ${issued.email} — temporary password ${issued.password}. ` +
        `Download the app, sign in, then change it in Settings.`,
      )
    : "";

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Team</h1>
          <p className="page-sub">Who can manage schedules and post community events.</p>
        </div>
      </div>

      <section className="section">
        <h2 className="section-title">Owners &amp; IT — all sections</h2>
        <div className="stack">
          {owners.map((t) => (
            <div key={t.email} className="card row-card">
              <div>
                <div className="row-title">{t.name}</div>
                <div className="row-sub">{t.email}</div>
              </div>
              <span className="pill pill-ok">{ROLE_LABEL[t.role]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Staff — assigned sections</h2>
        <div className="stack">
          {staff.map((t) => (
            <div key={t.email} className="card row-card">
              <div>
                <div className="row-title">{t.name}</div>
                <div className="row-sub">
                  {t.email} · {t.venues.map((v) => VENUES[v].short).join(" + ") || "no sections"}
                </div>
              </div>
              {t.builtIn ? (
                <span className="pill pill-muted">Built-in</span>
              ) : (
                <button className="btn btn-sm" onClick={() => remove(t)}>Remove</button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Add a teammate</h2>
        <div className="card reserve-form">
          <label className="field">
            <span>Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Their name" />
          </label>
          <label className="field">
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="them@example.com" />
          </label>
          <div className="segmented">
            <button className={"seg" + (tier === "staff" ? " active" : "")} onClick={() => setTier("staff")}>
              Staff
            </button>
            <button className={"seg" + (tier === "owner" ? " active" : "")} onClick={() => setTier("owner")}>
              Owner — everything
            </button>
          </div>
          {tier === "staff" && (
            <div>
              <div className="row-sub" style={{ marginBottom: 8 }}>Sections they work (pick all that apply):</div>
              <div className="form-actions">
                {ALL_VENUES.map((v) => (
                  <button
                    key={v}
                    className={"btn btn-sm " + (venues.includes(v) ? "btn-primary" : "btn-ghost")}
                    onClick={() => { tapLight(); toggleVenue(v); }}
                  >
                    {VENUES[v].icon} {VENUES[v].short}
                  </button>
                ))}
              </div>
            </div>
          )}
          {error && <div className="auth-error">{error}</div>}
          <button className="btn btn-primary btn-block" onClick={add}>Add teammate</button>
          {issued && (
            <>
              <div className="gift-code" aria-label="Temporary password">
                {issued.email}<br />temp password: {issued.password}
              </div>
              <div className="form-actions">
                <a className="btn btn-primary" href={`sms:?&body=${smsBody}`}>💬 Text them the login</a>
              </div>
            </>
          )}
          <p className="footnote">
            The owner &amp; section logins above are built in and work on every phone.
            Teammates added here work on this device now and sync everywhere once the
            cloud backend (Phase&nbsp;2) is live. Everyone should change their password
            in Settings after first sign-in.
          </p>
        </div>
      </section>
    </div>
  );
}
