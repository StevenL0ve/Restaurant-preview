import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../state/store";
import { buildNotifications, notificationTime } from "../lib/notifications";

export function NotificationsBell() {
  const { state } = useStore();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  const notes = buildNotifications(state);

  // Close when clicking outside.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function go(to: string) {
    setOpen(false);
    navigate(to);
  }

  return (
    <div className="bell-wrap" ref={ref}>
      <button
        className="bell"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications (${notes.length})`}
        aria-expanded={open}
      >
        🔔
        {notes.length > 0 && <span className="bell-badge">{notes.length}</span>}
      </button>

      {open && (
        <div className="bell-panel">
          <div className="bell-head">
            <strong>Notifications</strong>
            <span className="muted small">{notes.length} need attention</span>
          </div>
          {notes.length === 0 ? (
            <div className="bell-empty">
              <span className="bell-empty-emoji">✅</span>
              You're all caught up.
            </div>
          ) : (
            <div className="bell-list">
              {notes.map((n) => (
                <button key={n.id} className="bell-item" onClick={() => go(n.to)}>
                  <span className="bell-icon">{n.icon}</span>
                  <span className="bell-text">
                    <span className="bell-title">{n.title}</span>
                    <span className="bell-detail">{n.detail}</span>
                  </span>
                  <span className="muted small bell-when">{notificationTime(n.when)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
