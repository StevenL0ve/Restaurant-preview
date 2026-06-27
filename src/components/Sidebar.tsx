import { NavLink } from "react-router-dom";
import { APP_VERSION } from "../version";

interface NavItem {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
}

const items: NavItem[] = [
  { to: "/", label: "Home", icon: "🏠", end: true },
  { to: "/cards", label: "Cards", icon: "🗂️" },
  { to: "/surgeons", label: "Surgeons", icon: "🧑‍⚕️" },
  { to: "/loaners", label: "Loaner trays", icon: "🚚" },
  { to: "/facilities", label: "Facilities", icon: "🏥" },
  { to: "/search", label: "Search", icon: "🔍" },
  { to: "/settings", label: "Settings", icon: "⚙️" },
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <img className="brand-mark" src="/brand/logo-mark.png" alt="CaseReady logo" width={38} height={38} />
        <div>
          <div className="brand-name">CaseReady</div>
          <div className="brand-tag">Your preference cards</div>
        </div>
      </div>

      <nav className="nav">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end ?? false}
            className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
          >
            <span className="nav-icon" aria-hidden>{it.icon}</span>
            <span className="nav-label">{it.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span className="pill pill-free">Yours. Offline.</span>
        <p className="footnote">
          Your cards live on this device. No hospital account, no approvals.
          Export or wipe everything anytime.
        </p>
        <p className="version">CaseReady v{APP_VERSION}</p>
      </div>
    </aside>
  );
}
