import { useState } from "react";
import { Icon } from "./Icon";
import { changePassword, deleteAccountAndData, requestEmailChange } from "../lib/account";
import { useAuth } from "../state/auth";

// Settings → Account: change password, change email (verified by a link
// sent to the new address), delete the account and its data. Each one
// asks for the current password first.
type Mode = null | "password" | "email" | "delete";

export function AccountSecurity({ email }: { email: string }) {
  const { signOut } = useAuth();
  const [mode, setMode] = useState<Mode>(null);
  const [current, setCurrent] = useState("");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function open(m: Mode) {
    setMode(m); setCurrent(""); setA(""); setB(""); setMsg(null);
  }

  async function submit() {
    setMsg(null);
    setBusy(true);
    try {
      if (mode === "password") {
        if (a !== b) throw new Error("The two new passwords don't match.");
        await changePassword(current, a);
        setMsg({ ok: true, text: "Password changed." });
        setMode(null);
      } else if (mode === "email") {
        await requestEmailChange(current, a);
        setMsg({ ok: true, text: `Check ${a.trim()} for a verification link. Your email changes when you open it; until then ${email} keeps working.` });
        setMode(null);
      } else if (mode === "delete") {
        if (a.trim().toLowerCase() !== email.toLowerCase()) throw new Error("Type your email exactly to confirm.");
        await deleteAccountAndData(current);
        try {
          for (const k of Object.keys(localStorage)) if (k.startsWith("orsync.")) localStorage.removeItem(k);
        } catch { /* private mode */ }
        signOut();
        window.location.hash = "#/";
        window.location.reload();
      }
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Something went wrong." });
    } finally {
      setBusy(false);
    }
  }

  const pwInput = (value: string, set: (v: string) => void, label: string, autoComplete: string) => (
    <label className="field"><span>{label}</span>
      <span className="pw-wrap">
        <input type={show ? "text" : "password"} value={value} onChange={(e) => set(e.target.value)} autoComplete={autoComplete} autoCapitalize="none" autoCorrect="off" spellCheck={false} />
        <button type="button" className="pw-eye" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow((v) => !v)}>
          <Icon name={show ? "eye-off" : "eye"} size={20} />
        </button>
      </span>
    </label>
  );

  return (
    <div className="account-security">
      {mode === null ? (
        <>
          <div className="form-actions">
            <button className="btn btn-sm" onClick={() => open("password")}>Change password</button>
            <button className="btn btn-sm" onClick={() => open("email")}>Change email</button>
            <button className="btn btn-sm btn-danger-outline" onClick={() => open("delete")}>Delete account</button>
          </div>
          {msg && <p className={(msg.ok ? "pos" : "neg") + " small"} style={{ margin: "8px 0 0" }}>{msg.text}</p>}
        </>
      ) : (
        <form className="form-grid" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <h4 className="facility-admin-sub" style={{ gridColumn: "1 / -1", margin: "0 0 2px" }}>
            {mode === "password" ? "Change password" : mode === "email" ? "Change email" : "Delete account and data"}
          </h4>
          {mode === "delete" && (
            <p className="neg small" style={{ gridColumn: "1 / -1", margin: 0 }}>
              This removes your account, your personal cloud library, and your memberships at your
              facilities. Facility libraries you contributed to stay with the facility. The cards on
              this device are wiped too, so export first if you want a copy. This can't be undone.
            </p>
          )}
          {pwInput(current, setCurrent, "Current password", "current-password")}
          {mode === "password" && pwInput(a, setA, "New password", "new-password")}
          {mode === "password" && pwInput(b, setB, "New password again", "new-password")}
          {mode === "email" && (
            <label className="field"><span>New email</span>
              <input type="email" value={a} onChange={(e) => setA(e.target.value)} autoComplete="email" autoCapitalize="none" inputMode="email" />
              <span className="muted small">We send a verification link to the new address; the change takes effect when you open it.</span>
            </label>
          )}
          {mode === "delete" && (
            <label className="field"><span>Type your email to confirm</span>
              <input type="email" value={a} onChange={(e) => setA(e.target.value)} placeholder={email} autoCapitalize="none" inputMode="email" />
            </label>
          )}
          {msg && <p className={(msg.ok ? "pos" : "neg") + " small"} style={{ gridColumn: "1 / -1", margin: 0 }}>{msg.text}</p>}
          <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
            <button type="submit" className={"btn btn-sm " + (mode === "delete" ? "btn-danger" : "btn-primary")} disabled={busy || !current || !a || (mode === "password" && !b)}>
              {busy ? "Working…" : mode === "password" ? "Save new password" : mode === "email" ? "Send verification" : "Delete my account"}
            </button>
            <button type="button" className="btn btn-sm" onClick={() => setMode(null)}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
