import { useState } from "react";
import { useAuth } from "../state/auth";
import { cloudEnabled } from "../lib/cloud";

// Accounts made by early builds lived only on the phone, so signing in on
// the website or another phone looked like a brand-new account. One tap
// (with the password) puts this account on ORSync Cloud.
export function LocalAccountUpgrade() {
  const { user, upgradeLocalAccount } = useAuth();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!cloudEnabled() || !user || user.uid || user.guest) return null;
  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await upgradeLocalAccount(pw);
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Couldn't move the account.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="upgrade-local" onSubmit={go}>
      <p>
        <strong>This account only exists on this phone.</strong> Move it to ORSync Cloud so the same
        email and password sign you in on the website and your other devices.
      </p>
      <div className="form-actions">
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Your password" autoComplete="current-password" />
        <button className="btn btn-primary" disabled={busy || pw.length < 6}>{busy ? "Moving…" : "Move to ORSync Cloud"}</button>
      </div>
      {err && <p className="neg small">{err}</p>}
    </form>
  );
}
