import { NavLink } from "react-router-dom";
import { useStore, cartCount } from "../state/store";
import { APP_VERSION } from "../version";

interface NavItem {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
  badge?: "cart" | "rewards";
}

const items: NavItem[] = [
  { to: "/", label: "Home", icon: "🏡", end: true },
  { to: "/menu", label: "Menu & Order", icon: "🍽️" },
  { to: "/cart", label: "Cart", icon: "🛒", badge: "cart" },
  { to: "/rewards", label: "Punch Card", icon: "🎟️", badge: "rewards" },
  { to: "/book", label: "Book a Session", icon: "🧘" },
  { to: "/community", label: "Community", icon: "🎉" },
  { to: "/gift", label: "Gift Card", icon: "🎁" },
  { to: "/bookings", label: "My Bookings", icon: "📅" },
  { to: "/waivers", label: "Waivers", icon: "📝" },
  { to: "/orders", label: "My Orders", icon: "🧾" },
  { to: "/settings", label: "Settings", icon: "⚙️" },
];

export function Sidebar() {
  const { state } = useStore();
  const cart = cartCount(state);
  const rewards = state.punch.rewards;

  return (
    <aside className="sidebar">
      <div className="brand">
        <img className="brand-mark" src="/brand/logo.jpeg" alt="" aria-hidden />
        <div>
          <div className="brand-name">CGP</div>
          <div className="brand-tag">The Common Ground Projects</div>
        </div>
      </div>

      <nav className="nav">
        {items.map((it) => {
          const count = it.badge === "cart" ? cart : it.badge === "rewards" ? rewards : 0;
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
        <span className="pill pill-free">Community owned</span>
        <p className="footnote">
          One membership for the café, kitchen, studio &amp; Zen Den. Order, earn
          punches, and book your next session.
        </p>
        <p className="version">CGP v{APP_VERSION}</p>
      </div>
    </aside>
  );
}
