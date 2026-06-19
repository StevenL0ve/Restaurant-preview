import { NavLink } from "react-router-dom";
import { useStore, unreadCount, pendingRequests } from "../state/store";
import { APP_VERSION } from "../version";

interface NavItem {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
  badge?: "unread" | "requests";
}

const items: NavItem[] = [
  { to: "/", label: "Home", icon: "🏠", end: true },
  { to: "/assistant", label: "Ask CoParent", icon: "✨" },
  { to: "/messages", label: "Messages", icon: "💬", badge: "unread" },
  { to: "/calendar", label: "Calendar", icon: "📅", badge: "requests" },
  { to: "/expenses", label: "Expenses", icon: "💵" },
  { to: "/journal", label: "Journal", icon: "📔" },
  { to: "/info", label: "Info Bank", icon: "🗂️" },
  { to: "/settings", label: "Settings", icon: "⚙️" },
];

export function Sidebar() {
  const { state } = useStore();
  const unread = unreadCount(state);
  const requests = pendingRequests(state).length;

  return (
    <aside className="sidebar">
      <div className="brand">
        <img className="brand-mark" src="/brand/logo-mark.png" alt="CoParent logo" width={38} height={38} />
        <div>
          <div className="brand-name">CoParent</div>
          <div className="brand-tag">Calm, organized co-parenting</div>
        </div>
      </div>

      <nav className="nav">
        {items.map((it) => {
          const count =
            it.badge === "unread" ? unread : it.badge === "requests" ? requests : 0;
          return (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end ?? false}
              className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
            >
              <span className="nav-icon" aria-hidden>{it.icon}</span>
              <span className="nav-label">{it.label}</span>
              {count > 0 && <span className="nav-badge">{count}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <span className="pill pill-free">100% free</span>
        <p className="footnote">
          No subscription. Your data stays on your device and you can export or
          delete it anytime.
        </p>
        <p className="version">CoParent v{APP_VERSION}</p>
      </div>
    </aside>
  );
}
