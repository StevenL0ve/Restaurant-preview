import { useState } from "react";
import { useAuth } from "../state/auth";

// Optional account gate. A personal tool shouldn't gate you behind anyone's
// approval — so the most prominent action is "use it now, no account."
export function Login() {
  const { signIn, signUp, continueAsGuest, bioAvailable, bioEnabled, bioUnlock } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
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
        <img className="auth-logo" src={`${import.meta.env.BASE_URL}brand/logo-mark.png`} alt="ORSync" width={64} height={64} />
        <h1 className="auth-title">ORSync</h1>
        <p className="auth-sub">Your surgical preference cards — yours alone</p>

        <button className="btn btn-primary auth-submit" onClick={continueAsGuest} type="button">
          Use it now — no account
        </button>
        <p className="auth-foot" style={{ margin: "10px 0 18px" }}>
          Everything stays on this device. Add an account anytime to lock it with Face&nbsp;ID.
        </p>

        <div className="auth-tabs">
          <button
            className={"auth-tab" + (mode === "signup" ? " active" : "")}
            onClick={() => { setMode("signup"); setError(null); }}
            type="button"
          >
            Create account
          </button>
          <button
            className={"auth-tab" + (mode === "signin" ? " active" : "")}
            onClick={() => { setMode("signin"); setError(null); }}
            type="button"
          >
            Sign in
          </button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {mode === "signup" && (
            <label className="field">
              <span>Your name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Lee" autoComplete="name" />
            </label>
          )}
          <label className="field">
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" autoComplete="email" />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </label>

          {error && <div className="auth-error">{error}</div>}

          <button className="btn auth-submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        {bioAvailable && bioEnabled && mode === "signin" && (
          <button className="btn auth-faceid" onClick={faceId} type="button">
            <span aria-hidden>☺</span> Unlock with Face ID
          </button>
        )}
      </div>
    </div>
  );
}
