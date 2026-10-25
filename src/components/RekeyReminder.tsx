import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getWorkspace, onWorkspaceChange } from "../lib/workspace";

// After a facility password change, members the admin kept have 30 days to
// enter the new password (it's in their email). This nags, more loudly as
// the deadline nears; after it passes the facility logs the device out
// until the new password is entered.
export function RekeyReminder() {
  const [ws, setWs] = useState(getWorkspace());
  useEffect(() => onWorkspaceChange(() => setWs(getWorkspace())), []);
  if (!ws?.rekeyBy) return null;
  const by = new Date(ws.rekeyBy);
  if (Number.isNaN(by.getTime())) return null;
  const days = Math.ceil((by.getTime() - Date.now()) / 86400000);
  const urgent = days <= 7;
  const when = by.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return (
    <div className={"rekey-banner" + (urgent ? " urgent" : "")}>
      <div>
        <strong>{ws.name} changed its password.</strong>{" "}
        {days > 0
          ? <>Check your email for the new one and enter it by <strong>{when}</strong> ({days} {days === 1 ? "day" : "days"} left), or this device is signed out of the facility.</>
          : <>The deadline passed. Enter the new password from your email to reconnect.</>}
      </div>
      <Link className="btn btn-sm btn-primary" to={`/join?f=${encodeURIComponent(ws.name)}`}>Enter new password</Link>
    </div>
  );
}
