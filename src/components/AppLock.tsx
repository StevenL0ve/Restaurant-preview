import { useEffect, useRef, useState } from "react";
import { App as CapApp } from "@capacitor/app";
import { useAuth } from "../state/auth";
import { Mascot } from "./Mascot";

// Face ID / Touch ID / fingerprint app lock. When it's on, the app opens
// locked, and locks again after it has been in the background for a minute
// (long enough to survive a quick app switch, short enough that a phone left
// on the back table doesn't hand anyone the cards).

const RELOCK_AFTER_MS = 60_000;

export function AppLock() {
  const { bioAvailable, bioEnabled, bioLabel, bioUnlock, signOut } = useAuth();
  const active = bioAvailable && bioEnabled;
  const [locked, setLocked] = useState(true);
  const [failed, setFailed] = useState(false);
  const prompting = useRef(false);
  const hiddenAt = useRef<number | null>(null);

  async function unlock() {
    if (prompting.current) return;
    prompting.current = true;
    setFailed(false);
    const ok = await bioUnlock();
    prompting.current = false;
    if (ok) setLocked(false);
    else setFailed(true);
  }

  // Prompt right away on launch while locked.
  useEffect(() => {
    if (active && locked) void unlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Relock after time in the background.
  useEffect(() => {
    if (!active) return;
    const sub = CapApp.addListener("appStateChange", ({ isActive }) => {
      if (!isActive) {
        hiddenAt.current = Date.now();
        return;
      }
      const away = hiddenAt.current ? Date.now() - hiddenAt.current : 0;
      hiddenAt.current = null;
      if (away >= RELOCK_AFTER_MS) {
        setLocked(true);
        void unlock();
      }
    });
    return () => { void sub.then((h) => h.remove()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!active || !locked) return null;

  return (
    <div className="app-lock" role="dialog" aria-label="ORSync is locked">
      <Mascot size={96} />
      <h1>ORSync is locked</h1>
      <p className="muted">Unlock with {bioLabel} to see your cards.</p>
      <button className="btn btn-primary auth-submit" onClick={() => void unlock()}>
        Unlock with {bioLabel}
      </button>
      {failed && (
        <p className="muted small" style={{ marginTop: 14 }}>
          Didn't work? Try again, or use your device passcode from the prompt.{" "}
          <button className="link small" onClick={signOut}>Sign out instead</button>
        </p>
      )}
    </div>
  );
}
