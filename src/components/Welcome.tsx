import { useState } from "react";
import { Icon } from "./Icon";
import { Mascot, MASCOT_NAME } from "./Mascot";

// One-time welcome sheet — the first thing a new user (or TestFlight tester)
// sees. Three beats, one button, never shown again.
const WELCOME_KEY = "orsync.welcomed.v1";

export function Welcome() {
  const [open, setOpen] = useState(() => localStorage.getItem(WELCOME_KEY) !== "1");
  if (!open) return null;

  function dismiss() {
    localStorage.setItem(WELCOME_KEY, "1");
    setOpen(false);
  }

  return (
    <div className="welcome-scrim" role="dialog" aria-modal="true" aria-label="Welcome to ORSync">
      <div className="welcome-card">
        <Mascot size={104} className="welcome-mascot" animate />
        <h1>Welcome to ORSync</h1>
        <p className="welcome-sub">Your preference cards. Yours alone.</p>
        <p className="welcome-jolie">That's <strong>{MASCOT_NAME}</strong>, ORSync's scrub sponge. She'll turn up around the app whenever a hand helps.</p>

        <ul className="welcome-points">
          <li>
            <span className="welcome-icon"><Icon name="cards" size={20} /></span>
            <span><strong>Every surgeon's setup</strong>, one tap away: positioning, prep, trays, sutures, quirks.</span>
          </li>
          <li>
            <span className="welcome-icon"><Icon name="pin" size={20} /></span>
            <span><strong>Pull the room by location</strong>: clear one cart or cabinet at a time until you're case-ready.</span>
          </li>
          <li>
            <span className="welcome-icon"><Icon name="truck" size={20} /></span>
            <span><strong>Track loaner trays</strong>: vendor, deadline, sterile status, and one-tap call the rep.</span>
          </li>
        </ul>

        <button className="btn btn-primary welcome-cta" onClick={dismiss}>Let's go</button>
        <p className="welcome-note">
          Preloaded with example cards so nothing's empty. Replace them with your own anytime in Settings.
        </p>
      </div>
    </div>
  );
}
