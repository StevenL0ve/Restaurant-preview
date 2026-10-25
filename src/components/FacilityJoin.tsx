import { useState } from "react";
import { Icon } from "./Icon";
import { rememberFacility, setWorkspace } from "../lib/workspace";
import { createFacility, joinFacility } from "../state/cloudSync";

// Join a hospital's shared library with its facility name and password.
// Shared by onboarding and Settings → Facility. A wrong password can't
// silently fork a facility: "not found" offers an explicit Create for
// first-time setup only, and a refused password says so.
export function FacilityJoinForm({ uid, userName, email, onJoined, compact }: {
  uid: string;
  userName: string;
  email: string;
  onJoined?: (name: string, status: "joined" | "pending") => void;
  compact?: boolean;
}) {
  const [pendingName, setPendingName] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [offerCreate, setOfferCreate] = useState<string | null>(null);
  const me = { uid, name: userName, email };

  async function join() {
    setErr(null);
    setOfferCreate(null);
    if (!name.trim() || !pw) return;
    setBusy(true);
    try {
      const r = await joinFacility(name, pw, me);
      if (r.result === "not-found") {
        setOfferCreate(name.trim());
      } else if (r.result === "denied") {
        setErr(`That password isn't right for ${name.trim()}, or this account's access to it was turned down. Check with the charge desk or a facility admin.`);
      } else if (r.result === "pending") {
        rememberFacility({ id: r.id, name: name.trim(), pending: true });
        setPendingName(name.trim());
        setPw("");
        onJoined?.(name.trim(), "pending");
      } else {
        setWorkspace({ id: r.id, name: name.trim(), role: r.role });
        setPw("");
        onJoined?.(name.trim(), "joined");
      }
    } catch (e) {
      setErr(friendly(e));
    } finally {
      setBusy(false);
    }
  }

  async function create() {
    if (!offerCreate) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await createFacility(offerCreate, pw, me);
      if (r.result === "exists") {
        setErr(`${offerCreate} was just created by someone else. Join it with its password instead.`);
        setOfferCreate(null);
        return;
      }
      setWorkspace({ id: r.id, name: offerCreate, role: "admin" });
      const n = offerCreate;
      setOfferCreate(null);
      setPw("");
      onJoined?.(n, "joined");
    } catch (e) {
      setErr(friendly(e));
    } finally {
      setBusy(false);
    }
  }

  if (pendingName) {
    return (
      <div className="facility-join">
        <div className="auth-notice" style={{ alignItems: "flex-start", textAlign: "left" }}>
          <strong>Request sent to {pendingName}.</strong>
          <span>
            A facility admin will see your name, email, and position and approve you. Until then
            ORSync works as your personal card app; the facility opens up on its own once you're in.
          </span>
          <button className="link small" type="button" onClick={() => setPendingName(null)}>Join a different facility</button>
        </div>
      </div>
    );
  }

  return (
    <div className="facility-join">
      <div className="form-grid facility-join">
        <label className="field"><span>Facility name</span>
          <input value={name} onChange={(e) => { setName(e.target.value); setOfferCreate(null); }} placeholder="Keesler AFB OR" autoCapitalize="words" autoComplete="organization" />
        </label>
        <label className="field"><span>Facility password</span>
          <span className="pw-wrap">
            <input
              type={showPw ? "text" : "password"}
              value={pw}
              onChange={(e) => { setPw(e.target.value); setOfferCreate(null); }}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              onKeyDown={(e) => e.key === "Enter" && void join()}
            />
            <button type="button" className="pw-eye" aria-label={showPw ? "Hide password" : "Show password"} onClick={() => setShowPw((v) => !v)}>
              <Icon name={showPw ? "eye-off" : "eye"} size={20} />
            </button>
          </span>
        </label>
      </div>
      {err && <p className="neg small">{err}</p>}
      {offerCreate ? (
        <div className="auth-notice" style={{ alignItems: "flex-start", textAlign: "left", marginTop: 10 }}>
          <strong>No facility named "{offerCreate}" yet.</strong>
          <span>
            Joining one that already exists? Check the spelling and try again. Setting
            up <strong>{offerCreate}</strong> for the first time? Create it now: your library on
            this device becomes its starting point, you become its first admin, and everyone who
            enters this name + password waits for your approval.
          </span>
          <div className="form-actions">
            <button className="btn btn-primary" type="button" disabled={busy} onClick={create}>{busy ? "Creating…" : `Create ${offerCreate}`}</button>
            <button className="btn" type="button" onClick={() => setOfferCreate(null)}>Try again</button>
          </div>
        </div>
      ) : (
        <div className="form-actions">
          <button className="btn btn-primary" type="button" disabled={busy || !name.trim() || !pw} onClick={join}>
            {busy ? "Checking…" : "Join facility"}
          </button>
        </div>
      )}
      {!compact && (
        <p className="muted small" style={{ margin: "8px 0 0" }}>
          Joining merges this device's library into the facility's. Your personal cloud copy stays as
          it was, and Leave facility brings it back.
        </p>
      )}
    </div>
  );
}

export function friendly(e: unknown): string {
  const msg = e instanceof Error ? e.message : "";
  if (/permission|insufficient/i.test(msg)) {
    return "ORSync Cloud isn't set up for facilities yet (the Firestore rules need the workspaces section). Ask whoever manages the Firebase project.";
  }
  return msg || "Couldn't reach ORSync Cloud. Try again.";
}
