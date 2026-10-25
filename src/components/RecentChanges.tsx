import { useState } from "react";
import { useStore } from "../state/store";
import { stampLine } from "../lib/user";
import type { ChangeKind } from "../types";

// "Who changed what, when" for a screen's slice of the change log. Shows
// the latest few; tap to see more. Entries carry the person's name as a
// chart-style stamp ("Nelson, S. · Oct 25, 2:14 PM").
export function RecentChanges({ kinds, title = "Recent changes" }: { kinds: ChangeKind[]; title?: string }) {
  const { state } = useStore();
  const [all, setAll] = useState(false);
  const entries = state.changeLog.filter((e) => kinds.includes(e.kind));
  if (entries.length === 0) return null;
  const shown = all ? entries.slice(0, 60) : entries.slice(0, 6);
  return (
    <div className="card form-card recent-changes">
      <div className="card-head">
        <h2>{title}</h2>
        {entries.length > 6 && (
          <button className="link" onClick={() => setAll((v) => !v)}>{all ? "Fewer" : `All ${Math.min(entries.length, 60)}`}</button>
        )}
      </div>
      <ul className="change-list">
        {shown.map((e) => (
          <li key={e.id}>
            <span className="change-text">{e.text}</span>
            <span className="muted small change-stamp">{stampLine(e.by, e.at) || "unsigned"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
