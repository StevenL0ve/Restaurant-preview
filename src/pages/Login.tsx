import { useState } from "react";
import { useAuth } from "../state/auth";

// Login + create-account gate. Local accounts for now; the same screen can
// drive a hosted auth backend later with no UI change.
export function Login() {
  const { signIn, signUp, bioAvailable, bioEnabled, bioUnlock } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") await signUp(name, email, password);
      else await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function faceId() {
    setError(null);
    const ok = await bioUnlock();
    if (!ok) setError("Face ID could not verify you. Use your password.");
  }

  return (
    <div className="auth">
      <div className="auth-card">
        <img className="auth-logo" src="/brand/logo.jpeg" alt="Common Ground logo" />
        <h1 className="auth-title">CGP</h1>
        <p className="auth-sub">The Common Ground Projects</p>
        <p className="auth-lede">Café, kitchen, yoga studio &amp; the Zen Den — all in one place.</p>

        <div className="auth-tabs">
          <button
            className={"auth-tab" + (mode === "signin" ? " active" : "")}
            onClick={() => { setMode("signin"); setError(null); }}
            type="button"
          >
            Sign in
          </button>
          <button
            className={"auth-tab" + (mode === "signup" ? " active" : "")}
            onClick={() => { setMode("signup"); setError(null); }}
            type="button"
          >
            Create account
          </button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {mode === "signup" && (
            <label className="field">
              <span>Your name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Rivera" autoComplete="name" />
            </label>
          )}
          <label className="field">
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" autoComplete="email" />
          </label>
          <label className="field">
            <span>Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete={mode === "signup" ? "new-password" : "current-password"} />
          </label>

          {error && <div className="auth-error">{error}</div>}

          <button className="btn btn-primary auth-submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        {bioAvailable && bioEnabled && mode === "signin" && (
          <button className="btn auth-faceid" onClick={faceId} type="button">
            <span aria-hidden>☺</span> Unlock with Face ID
          </button>
        )}

        <p className="auth-foot">
          Your account keeps your orders, punch card, and bookings in sync.
        </p>
      </div>
    </div>
  );
}
