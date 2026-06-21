import { useState } from "react";
import { useAuth } from "../state/auth";
import { LogoMark } from "../components/Logo";

// Sign-in / create-account gate. A guest option lets people explore the demo
// cellar instantly.
export function Login() {
  const { signIn, signUp, continueAsGuest } = useAuth();
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

  return (
    <div className="auth">
      <div className="auth-card">
        <LogoMark size={64} />
        <h1 className="auth-title">My Cellar</h1>
        <p className="auth-sub">Your wine collection, beautifully kept.</p>

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

        <button className="btn auth-guest" onClick={continueAsGuest} type="button">
          Explore the demo cellar →
        </button>

        <p className="auth-foot">Your cellar is private to you. Export it any time.</p>
      </div>
    </div>
  );
}
