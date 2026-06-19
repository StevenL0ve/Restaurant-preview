import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useStore, unreadCount, pendingRequests } from "../state/store";

// Mobile-only bottom tab bar. On phones the icon-rail sidebar feels like a
// cramped desktop app; a bottom nav is the native pattern people expect from a
// real phone app — which is what this competes with.

interface Tab {
  to: string;
  label: string;
  icon: string;
  img?: string; // optional custom image icon (overrides the emoji)
  end?: boolean;
  badge?: "unread" | "requests";
}

const primary: Tab[] = [
  { to: "/", label: "Home", icon: "🏠", img: "/brand/nav-home.png", end: true },
  { to: "/messages", label: "Messages", icon: "💬", img: "/brand/nav-messages.png", badge: "unread" },
  { to: "/calendar", label: "Calendar", icon: "📅", img: "/brand/nav-calendar.png", badge: "requests" },
  { to: "/expenses", label: "Expenses", icon: "💵" },
];

const more = [
  { to: "/assistant", label: "Ask CoParent", icon: "✨" },
  { to: "/journal", label: "Journal", icon: "📔" },
  { to: "/info", label: "Info Bank", icon: "🗂️" },
  { to: "/search", label: "Search", icon: "🔍" },
  { to: "/settings", label: "Settings", icon: "⚙️" },
] as const;

export function BottomNav() {
  const { state } = useStore();
  const [sheetOpen, setSheetOpen] = useState(false);
  const location = useLocation();
  const unread = unreadCount(state);
  const requests = pendingRequests(state).length;

  // Close the "More" sheet whenever the route changes.
  useEffect(() => setSheetOpen(false), [location.pathname]);

  const moreActive = more.some((m) => m.to === location.pathname);

  return (
    <>
      {sheetOpen && <div className="sheet-scrim" onClick={() => setSheetOpen(false)} />}
      {sheetOpen && (
        <div className="more-sheet" role="menu">
          {more.map((m) => (
            <NavLink
              key={m.to}
              to={m.to}
              className={({ isActive }) => "sheet-item" + (isActive ? " active" : "")}
            >
              <span className="sheet-icon">{m.icon}</span>
              {m.label}
            </NavLink>
          ))}
        </div>
      )}

      <nav className="bottom-nav">
        {primary.map((it) => {
          const count =
            it.badge === "unread" ? unread : it.badge === "requests" ? requests : 0;
          return (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end ?? false}
              className={({ isActive }) => "tab" + (isActive ? " active" : "")}
              onClick={() => setSheetOpen(false)}
            >
              <span className="tab-icon">
                {it.img ? (
                  <img className="tab-img" src={it.img} alt="" aria-hidden width={28} height={28} />
                ) : (
                  it.icon
                )}
                {count > 0 && <span className="tab-badge">{count}</span>}
              </span>
              <span className="tab-label">{it.label}</span>
            </NavLink>
          );
        })}
        <button
          className={"tab" + (moreActive || sheetOpen ? " active" : "")}
          onClick={() => setSheetOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={sheetOpen}
        >
          <span className="tab-icon">⋯</span>
          <span className="tab-label">More</span>
        </button>
      </nav>
    </>
  );
}
