import { NavLink } from "react-router-dom";

// Bottom tab bar — the native pattern for a phone app. The center "Add" tab is
// the primary action: snap a bottle and log it.
const tabs = [
  { to: "/", label: "Cellar", icon: "🍇", end: true },
  { to: "/rack", label: "Rack", icon: "🗄️" },
  { to: "/add", label: "Add", icon: "＋", primary: true },
  { to: "/outings", label: "Outings", icon: "🧭" },
  { to: "/settings", label: "Settings", icon: "⚙️" },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end ?? false}
          className={({ isActive }) =>
            "tab" + (isActive ? " active" : "") + (t.primary ? " primary" : "")
          }
        >
          <span className="tab-icon">{t.icon}</span>
          <span className="tab-label">{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
