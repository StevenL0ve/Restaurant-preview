import { NavLink } from "react-router-dom";

// Mobile-only bottom tab bar — the native pattern people expect from a real
// phone app, which is what this competes with. Five flat destinations, no
// "more" sheet needed.

interface Tab {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
}

const tabs: Tab[] = [
  { to: "/", label: "Home", icon: "🏠", end: true },
  { to: "/cards", label: "Cards", icon: "🗂️" },
  { to: "/loaners", label: "Loaners", icon: "🚚" },
  { to: "/surgeons", label: "Surgeons", icon: "🧑‍⚕️" },
  { to: "/search", label: "Search", icon: "🔍" },
  { to: "/settings", label: "Settings", icon: "⚙️" },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      {tabs.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.end ?? false}
          className={({ isActive }) => "tab" + (isActive ? " active" : "")}
        >
          <span className="tab-icon">{it.icon}</span>
          <span className="tab-label">{it.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
