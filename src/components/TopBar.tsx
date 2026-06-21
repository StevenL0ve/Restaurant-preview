import { Link, useLocation } from "react-router-dom";
import { LogoMark } from "./Logo";
import { useAuth } from "../state/auth";

const TITLES: Record<string, string> = {
  "/": "My Cellar",
  "/rack": "Wine Rack",
  "/add": "Log a Wine",
  "/outings": "Outings",
  "/settings": "Settings",
};

export function TopBar() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const title = TITLES[pathname] ?? (pathname.startsWith("/wine/") ? "Bottle" : "My Cellar");

  return (
    <header className="topbar">
      <Link to="/" className="brand">
        <LogoMark size={30} />
        <span className="brand-name">{title}</span>
      </Link>
      <div className="topbar-right">
        <Link to="/add" className="btn btn-primary btn-sm">＋ Add wine</Link>
        {user && <span className="whoami" title={user.email}>{initials(user.name)}</span>}
      </div>
    </header>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
