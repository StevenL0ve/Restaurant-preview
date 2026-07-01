import { NavLink } from "react-router-dom";
import { APP_VERSION } from "../version";
import { Icon, type IconName } from "./Icon";

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
}

const items: NavItem[] = [
  { to: "/", label: "Home", icon: "home", end: true },
  { to: "/cards", label: "Cards", icon: "cards" },
  { to: "/surgeons", label: "Surgeons", icon: "surgeon" },
  { to: "/loaners", label: "Loaner trays", icon: "truck" },
  { to: "/facilities", label: "Facilities", icon: "building" },
  { to: "/search", label: "Search", icon: "search" },
  { to: "/settings", label: "Settings", icon: "settings" },
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <img className="brand-mark" src="/brand/logo-mark.png" alt="ORSync logo" width={36} height={36} />
        <div>
          <div className="brand-name">ORSync</div>
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
            <span className="nav-icon" aria-hidden><Icon name={it.icon} size={20} /></span>
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
        <p className="version">ORSync v{APP_VERSION}</p>
      </div>
    </aside>
  );
}
