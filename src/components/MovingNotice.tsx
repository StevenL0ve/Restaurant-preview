import { useState } from "react";
import { Link } from "react-router-dom";
import { NEW_WEB_HOST, onOldWebAddress } from "../lib/links";

// Shown only on the website at its old github.io address. Browsers keep a
// site's saved data per address, so a library kept only in this browser
// doesn't follow the move to the new domain; facility data (in the cloud)
// does. One tap to Export library carries the rest across.
const KEY = "orsync.moveNotice.v1";

export function MovingNotice() {
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
  });
  if (!onOldWebAddress || hidden) return null;
  const hide = () => {
    try { localStorage.setItem(KEY, "1"); } catch { /* private mode */ }
    setHidden(true);
  };
  return (
    <div className="rekey-banner">
      <div>
        <strong>ORSync's website is moving to {NEW_WEB_HOST}.</strong>{" "}
        Facility cards and schedules come along automatically. If you keep cards of your own in this
        browser, tap <strong>Export library</strong> in Settings to bring them to the new address.
      </div>
      <span style={{ display: "flex", gap: 8 }}>
        <Link className="btn btn-sm btn-primary" to="/settings">Export library</Link>
        <button className="btn btn-sm" onClick={hide}>Got it</button>
      </span>
    </div>
  );
}
