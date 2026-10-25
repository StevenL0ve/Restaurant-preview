import { useState } from "react";
import { Mascot } from "../components/Mascot";
import { Icon } from "../components/Icon";
import { useAuth } from "../state/auth";
import { cloudEnabled } from "../lib/cloud";

// Optional account gate. A personal tool shouldn't gate you behind anyone's
// approval — so the most prominent action is "use it now, no account."
export function Login() {
  const { signIn, signUp, resetPassword, continueAsGuest, bioAvailable, bioLabel, setBioEnabled } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signup");
  const [resetSentTo, setResetSentTo] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [wantBio, setWantBio] = useState(false);
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
      if (mode === "reset") {
        await resetPassword(email);
        setResetSentTo(email.trim().toLowerCase());
        return;
      }
      if (mode === "signup") await signUp(name, email, password);
      else await signIn(email, password);
      // Opted in on the form: one scan turns the lock on. A cancel just
      // leaves it off; it can be turned on later in Settings.
      if (wantBio && bioAvailable) void setBioEnabled(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
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
          Everything stays on this device.
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
              <strong className="auth-notice-title">Check your email</strong>
              <span>If this address has an ORSync account, a reset link is on its way:</span>
              <strong className="auth-notice-email">{resetSentTo}</strong>
              <span>It can take a minute. Check spam or junk if it doesn't show up.</span>
              <span className="auth-notice-hint">
                No email at all? There may be no account for this address yet.{" "}
                <button
                  className="link small"
                  type="button"
                  onClick={() => { setMode("signup"); setResetSentTo(null); setPassword(""); setError(null); }}
                >
                  Create one
                </button>
              </span>
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
        <form className="auth-form" onSubmit={submit} autoComplete="on" name={mode === "signup" ? "signup" : "login"}>
          {mode === "reset" && (
            <p className="auth-foot" style={{ margin: 0, textAlign: "left" }}>
              Enter the email you signed up with and we'll send a link to set a new password.
            </p>
          )}
          {mode === "signup" && (
            <label className="field">
              <span>Your name</span>
              <input name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Lee" autoComplete="name" autoCapitalize="words" />
            </label>
          )}
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              id="orsync-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              inputMode="email"
            />
          </label>
          {mode !== "reset" && (
            <label className="field">
              <span>Password</span>
              <span className="pw-wrap">
              <input
                type={showPw ? "text" : "password"}
                name="password"
                id="orsync-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                {...(mode === "signup" ? { passwordrules: "minlength: 6;" } : {})}
              />
              <button
                type="button"
                className="pw-eye"
                aria-label={showPw ? "Hide password" : "Show password"}
                aria-pressed={showPw}
                onClick={() => setShowPw((v) => !v)}
              >
                <Icon name={showPw ? "eye-off" : "eye"} size={20} />
              </button>
              </span>
            </label>
          )}

          {bioAvailable && mode !== "reset" && (
            <label className="toggle-row auth-bio">
              <span>
                Enable {bioLabel}
                <span className="muted small"> · unlock ORSync with {bioLabel}</span>
              </span>
              <input type="checkbox" checked={wantBio} onChange={(e) => setWantBio(e.target.checked)} />
            </label>
          )}

          {error && (
            <div className="auth-error">
              {error}
              {mode === "signin" && /incorrect email or password/i.test(error) && (
                <>
                  {" "}New to ORSync Cloud?{" "}
                  <button
                    className="link small"
                    type="button"
                    onClick={() => { setMode("signup"); setError(null); }}
                  >
                    Create your account
                  </button>
                </>
              )}
            </div>
          )}

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

      </div>
    </div>
  );
}
