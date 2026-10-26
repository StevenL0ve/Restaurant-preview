import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../state/auth";
import { FacilityJoinForm } from "../components/FacilityJoin";
import { Icon, type IconName } from "../components/Icon";
import { cloudEnabled } from "../lib/cloud";
import { APP_STORE_URL, PLAY_STORE_URL, SALES_EMAIL, setDemo } from "../lib/facilityGate";

// Shown in place of a facility-only screen (carts, on call, loaners,
// catalog) when this device isn't synced with a facility. Three ways out:
// enter the facility login, try the demo, or ask us to set the hospital up.
const FEATURES: { icon: IconName; title: string; body: string }[] = [
  { icon: "cart", title: "Case carts, pulled together", body: "Every case on the schedule gets a cart. Pull it, mark what's missing, QC it, and everyone sees the status live." },
  { icon: "bell", title: "On-call board", body: "Who's on call tonight, with one tap to call or text. Everyone's number comes from their own account." },
  { icon: "truck", title: "Loaner trays", body: "Track rep trays coming in and going out, with photos, so nothing is lost between cases." },
  { icon: "search", title: "Supply catalog", body: "The custodian's REF list, with photos, so cards autocomplete and corrections flow to every card." },
  { icon: "pin", title: "Sterile processing", body: "Every tray and set with its cabinet and shelf, searchable from anywhere in the app." },
  { icon: "cards", title: "One shared card library", body: "The whole OR works from the same preference cards, with every change signed and dated." },
];

const WHAT: Record<string, string> = {
  "/carts": "Case carts",
  "/on-call": "The on-call board",
  "/loaners": "Loaner trays",
  "/catalog": "The supply catalog",
  "/spd": "Sterile processing",
};

export function FacilityRequired() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [joining, setJoining] = useState(false);
  const what = Object.entries(WHAT).find(([p]) => pathname === p || pathname.startsWith(p + "/"))?.[1] ?? "This";
  const canJoin = cloudEnabled() && !!user?.uid;
  const mailto = `mailto:${SALES_EMAIL}?subject=${encodeURIComponent("ORSync facility account")}&body=${encodeURIComponent(
    "Hi ORSync,\n\nWe'd like a facility account for our OR.\n\nHospital / facility:\nCity, state:\nYour name and role:\nAbout how many people on the OR team:\n\nThanks",
  )}`;

  return (
    <div className="page gate">
      <div className="gate-hero">
        <img src="brand/mascot-phone.png" alt="" className="gate-mascot" width={140} height={120} />
        <h1>{what} works with your facility</h1>
        <p className="muted">
          On your own, ORSync is your preference cards: build them, share them, keep your case log.
          {" "}{what === "This" ? "This part" : what} is for a whole OR working together, and it opens
          up once this device is synced with your facility.
        </p>
      </div>

      <div className="card gate-card">
        <h2>Have a facility login?</h2>
        <p className="muted small">
          Your charge desk or ORSync facility admin has the facility name and password. Enter them
          once and everything here turns on.
        </p>
        {!canJoin ? (
          <div className="auth-notice" style={{ alignItems: "flex-start", textAlign: "left" }}>
            <strong>Sign in first.</strong>
            <span>Facilities link to an ORSync account, so your name goes on what you pull and QC.</span>
            <Link to="/settings" className="btn btn-primary btn-sm">Create or sign in to your account</Link>
          </div>
        ) : joining ? (
          <FacilityJoinForm uid={user!.uid!} userName={user!.name} email={user!.email} compact onJoined={() => setJoining(false)} />
        ) : (
          <div className="form-actions">
            <button className="btn btn-primary" onClick={() => setJoining(true)}>Enter facility login</button>
          </div>
        )}
      </div>

      <div className="card gate-card">
        <h2>See what a facility gets</h2>
        <div className="gate-features">
          {FEATURES.map((f) => (
            <div key={f.title} className="gate-feature">
              <span className="gate-feature-icon"><Icon name={f.icon} size={20} /></span>
              <div>
                <strong>{f.title}</strong>
                <div className="muted small">{f.body}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="form-actions">
          <button className="btn" onClick={() => setDemo(true)}>Try the demo</button>
          <span className="muted small">Sample data on this device. Nothing syncs until a facility joins.</span>
        </div>
      </div>

      <div className="card gate-card">
        <h2>Get your hospital on ORSync</h2>
        <p className="muted small">
          A facility account gives the whole OR one shared library, with admins who control who's in.
          Email us and we'll set it up with you.
        </p>
        <div className="form-actions">
          <a className="btn btn-primary" href={mailto}>Contact us for facility pricing</a>
        </div>
        <div className="gate-stores">
          {APP_STORE_URL ? <a className="btn btn-sm" href={APP_STORE_URL} target="_blank" rel="noreferrer">App Store</a> : <span className="pill">App Store: coming soon</span>}
          {PLAY_STORE_URL ? <a className="btn btn-sm" href={PLAY_STORE_URL} target="_blank" rel="noreferrer">Google Play</a> : <span className="pill">Google Play: coming soon</span>}
        </div>
      </div>
    </div>
  );
}

/** The strip at the top of a gated screen while the demo is on. */
export function DemoBanner() {
  return (
    <div className="demo-banner">
      <span><strong>Demo.</strong> Sample data on this device only; nothing syncs until your facility joins.</span>
      <button className="link small" onClick={() => setDemo(false)}>Exit demo</button>
    </div>
  );
}
