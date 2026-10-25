import { useState } from "react";
import { Icon } from "./Icon";
import { deriveWorkspaceKey, setWorkspace } from "../lib/workspace";
import { createWorkspace, joinWorkspace } from "../state/cloudSync";

// Join a hospital's shared library with its facility name and password.
// Shared by onboarding and Settings → Facility. A wrong password can't
// silently fork a facility: "not found" offers an explicit Create for
// first-time setup only.
export function FacilityJoinForm({ uid, userName, email, onJoined, compact }: {
  uid: string;
  userName: string;
  email: string;
  onJoined?: (name: string) => void;
  compact?: boolean;
}) {
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [offerCreate, setOfferCreate] = useState<{ key: string; name: string } | null>(null);
  const me = { uid, name: userName, email };

  async function join() {
    setErr(null);
    setOfferCreate(null);
    if (!name.trim() || !pw) return;
    setBusy(true);
    try {
      const key = await deriveWorkspaceKey(name, pw);
      const r = await joinWorkspace(key, name, me);
      if (r === "not-found") {
        setOfferCreate({ key, name: name.trim() });
      } else {
        setWorkspace({ key, name: name.trim() });
        setPw("");
        onJoined?.(name.trim());
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
      await createWorkspace(offerCreate.key, offerCreate.name, me);
      setWorkspace({ key: offerCreate.key, name: offerCreate.name });
      const n = offerCreate.name;
      setOfferCreate(null);
      setPw("");
      onJoined?.(n);
    } catch (e) {
      setErr(friendly(e));
    } finally {
      setBusy(false);
    }
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
          <strong>No facility found for "{offerCreate.name}" with that password.</strong>
          <span>
            Joining one that already exists? Check the spelling and password and try again. Setting
            up <strong>{offerCreate.name}</strong> for the first time? Create it now: your library on
            this device becomes its starting point, and this name + password is what everyone else
            will use to join.
          </span>
          <div className="form-actions">
            <button className="btn btn-primary" type="button" disabled={busy} onClick={create}>{busy ? "Creating…" : `Create ${offerCreate.name}`}</button>
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

function friendly(e: unknown): string {
  const msg = e instanceof Error ? e.message : "";
  if (/permission|insufficient/i.test(msg)) {
    return "ORSync Cloud isn't set up for facilities yet (the Firestore rules need the workspaces section). Ask whoever manages the Firebase project.";
  }
  return msg || "Couldn't reach ORSync Cloud. Try again.";
}
