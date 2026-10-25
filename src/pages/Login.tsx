import { useState } from "react";
import { Mascot } from "../components/Mascot";
import { useAuth } from "../state/auth";
import { cloudEnabled } from "../lib/cloud";

// Optional account gate. A personal tool shouldn't gate you behind anyone's
// approval — so the most prominent action is "use it now, no account."
export function Login() {
  const { signIn, signUp, resetPassword, continueAsGuest, bioAvailable, bioEnabled, bioUnlock } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signup");
  const [resetSentTo, setResetSentTo] = useState<string | null>(null);
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
      else if (mode === "reset") {
        await resetPassword(email);
        setResetSentTo(email.trim().toLowerCase());
      } else await signIn(email, password);
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
        <Mascot size={92} className="auth-mascot" />
        <h1 className="auth-title">ORSync</h1>
        <p className="auth-sub">
          {cloudEnabled()
            ? "Sign in and your library follows you: live on every device."
            : "Your surgical preference cards. Yours alone."}
        </p>

        <button className="btn btn-primary auth-submit" onClick={continueAsGuest} type="button">
          Use it now, no account
        </button>
        <p className="auth-foot" style={{ margin: "10px 0 18px" }}>
          Everything stays on this device. Add an account anytime to lock it with Face&nbsp;ID.
        </p>

        <div className="auth-tabs">
          <button
            className={"auth-tab" + (mode === "signup" ? " active" : "")}
            onClick={() => { setMode("signup"); setError(null); setResetSentTo(null); }}
            type="button"
          >
            Create account
          </button>
          <button
            className={"auth-tab" + (mode !== "signup" ? " active" : "")}
            onClick={() => { setMode("signin"); setError(null); setResetSentTo(null); }}
            type="button"
          >
            Sign in
          </button>
        </div>

        {mode === "reset" && resetSentTo ? (
          <div className="auth-form">
            <div className="auth-notice">
              <strong>Check your email.</strong> If <strong>{resetSentTo}</strong> has an ORSync account, a
              password reset link is on its way. It can take a minute; check spam or junk if it doesn't show up.
            </div>
            <button
              className="btn auth-submit"
              type="button"
              onClick={() => { setMode("signin"); setResetSentTo(null); setPassword(""); }}
            >
              Back to sign in
            </button>
            <button className="link small auth-link" type="button" onClick={() => setResetSentTo(null)}>
              Didn't get it? Send again
            </button>
          </div>
        ) : (
        <form className="auth-form" onSubmit={submit}>
          {mode === "reset" && (
            <p className="auth-foot" style={{ margin: 0, textAlign: "left" }}>
              Enter the email you signed up with and we'll send a link to set a new password.
            </p>
          )}
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
          {mode !== "reset" && (
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
          )}

          {error && <div className="auth-error">{error}</div>}

          <button className="btn auth-submit" disabled={busy}>
            {busy
              ? "Please wait…"
              : mode === "signup" ? "Create account" : mode === "reset" ? "Email me a reset link" : "Sign in"}
          </button>

          {mode === "signin" && (
            <button
              className="link small auth-link"
              type="button"
              onClick={() => { setMode("reset"); setError(null); }}
            >
              Forgot password?
            </button>
          )}
          {mode === "reset" && (
            <>
              <button
                className="link small auth-link"
                type="button"
                onClick={() => { setMode("signin"); setError(null); }}
              >
                Back to sign in
              </button>
              <p className="auth-foot" style={{ margin: 0 }}>
                Not sure which email you used? Try each address you might have signed up with; the
                link only arrives at the one with an account.
              </p>
            </>
          )}
        </form>
        )}

        {bioAvailable && bioEnabled && mode === "signin" && (
          <button className="btn auth-faceid" onClick={faceId} type="button">
            Unlock with Face ID
          </button>
        )}
      </div>
    </div>
  );
}
