import { useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { NavIcon, type NavIconName } from "./NavIcon";
import { usePendingRequests } from "../lib/approvals";

// Mobile tab bar: every destination the sidebar has, in one row that slides
// sideways. The first five fit on screen; swipe for the rest. The active
// tab scrolls itself into view, and soft edges hint there's more.

interface Tab {
  to: string;
  label: string;
  icon: NavIconName;
  end?: boolean;
}

const tabs: Tab[] = [
  { to: "/", label: "Home", icon: "home", end: true },
  { to: "/today", label: "My day", icon: "myday" },
  { to: "/cards", label: "Cards", icon: "cards" },
  { to: "/carts", label: "Carts", icon: "carts" },
  { to: "/on-call", label: "On call", icon: "oncall" },
  { to: "/surgeons", label: "Surgeons", icon: "surgeons" },
  { to: "/loaners", label: "Loaners", icon: "loaners" },
  { to: "/facilities", label: "Facilities", icon: "facilities" },
  { to: "/settings", label: "Settings", icon: "settings" },
];

export function BottomNav() {
  const pending = usePendingRequests().length;
  const { pathname } = useLocation();
  const strip = useRef<HTMLDivElement>(null);

  // Keep the current tab visible after navigating (including from a link
  // elsewhere in the app to a tab that's scrolled out of view).
  useEffect(() => {
    const el = strip.current?.querySelector<HTMLElement>(".tab.active");
    el?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [pathname]);

  return (
    <nav className="bottom-nav" aria-label="Main">
      <div className="tab-strip" ref={strip}>
        {tabs.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end ?? false}
            className={({ isActive }) => "tab" + (isActive ? " active" : "")}
          >
            <span className="tab-icon">
              <NavIcon name={it.icon} size={30} />
              {it.to === "/settings" && pending > 0 && <span className="tab-badge" aria-label={`${pending} join requests`}>{pending}</span>}
            </span>
            <span className="tab-label">{it.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
