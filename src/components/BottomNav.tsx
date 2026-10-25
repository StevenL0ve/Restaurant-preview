import { NavLink } from "react-router-dom";
import { Icon, type IconName } from "./Icon";
import { usePendingRequests } from "../lib/approvals";

// Mobile-only bottom tab bar — the native pattern people expect from a real
// phone app, which is what this competes with.

interface Tab {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
}

// Search stays off the tab bar — the top-bar search field is on every screen.
const tabs: Tab[] = [
  { to: "/", label: "Home", icon: "home", end: true },
  { to: "/today", label: "My day", icon: "calendar" },
  { to: "/cards", label: "Cards", icon: "cards" },
  { to: "/on-call", label: "On call", icon: "bell" },
  { to: "/carts", label: "Carts", icon: "cart" },
  { to: "/settings", label: "Settings", icon: "settings" },
];

export function BottomNav() {
  const pending = usePendingRequests().length;
  return (
    <nav className="bottom-nav">
      {tabs.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.end ?? false}
          className={({ isActive }) => "tab" + (isActive ? " active" : "")}
        >
          <span className="tab-icon">
            <Icon name={it.icon} size={23} />
            {it.to === "/settings" && pending > 0 && <span className="tab-badge" aria-label={`${pending} join requests`}>{pending}</span>}
          </span>
          <span className="tab-label">{it.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
