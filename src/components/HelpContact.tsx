import { useState } from "react";
import { useAuth } from "../state/auth";
import { useProfile } from "../lib/profile";
import { getWorkspace } from "../lib/workspace";
import { CONTACT_EMAIL, facilityPricingMailto, supportMailto, type ContactContext } from "../lib/contact";

/** Who's asking, for the footer of a help or pricing email. */
export function useContactContext(): ContactContext {
  const { user } = useAuth();
  const profile = useProfile(user?.uid);
  const ws = getWorkspace();
  return {
    email: user?.guest ? null : user?.email,
    name: profile?.name || (user?.guest ? null : user?.name),
    facility: ws && !ws.pending ? ws.name : null,
  };
}

// Settings → Help & contact: email support, or ask about facility pricing.
// Each button opens a filled-in draft in the phone's mail app.
export function HelpContactCard() {
  const ctx = useContactContext();
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(CONTACT_EMAIL); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* no clipboard */ }
  }
  return (
    <div className="card settings-card">
      <h2>Help & contact</h2>
      <p>
        Questions, problems, or ideas? Email us and a real person answers. For a facility account,
        the pricing request has everything we need to get you set up or send an invoice; fill in
        the lines marked ▶.
      </p>
      <div className="form-actions">
        <a className="btn btn-primary" href={supportMailto(ctx)}>Email support</a>
        <a className="btn" href={facilityPricingMailto(ctx)}>Request facility pricing</a>
      </div>
      <p className="muted small" style={{ margin: "8px 0 0" }}>
        Or write to <strong>{CONTACT_EMAIL}</strong>{" "}
        <button type="button" className="link small" onClick={copy}>{copied ? "Copied" : "Copy"}</button>
      </p>
    </div>
  );
}
