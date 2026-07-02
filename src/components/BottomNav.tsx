import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useStore, cartCount } from "../state/store";
import { tapLight } from "../lib/haptics";

// Mobile-only bottom tab bar — the native pattern people expect from a phone
// app. The primary services sit on the bar; everything else lives behind "More".

interface Tab {
  to: string;
  label: string;
  img: string; // custom white-line icon sitting on the dark green bar
  end?: boolean;
  badge?: "cart" | "rewards";
}

const primary: Tab[] = [
  { to: "/", label: "Home", img: "/brand/nav-home.png", end: true },
  { to: "/menu", label: "Order", img: "/brand/nav-order.png" },
  { to: "/book", label: "Book", img: "/brand/nav-book.png" },
  { to: "/rewards", label: "Punches", img: "/brand/nav-punch.png", badge: "rewards" },
];

const more = [
  { to: "/community", label: "Community", icon: "🎉" },
  { to: "/gift", label: "Gift Card", icon: "🎁" },
  { to: "/cart", label: "Cart", icon: "🛒", badge: "cart" as const },
  { to: "/orders", label: "My Orders", icon: "🧾" },
  { to: "/bookings", label: "My Bookings", icon: "📅" },
  { to: "/waivers", label: "Waivers", icon: "📝" },
  { to: "/settings", label: "Settings", icon: "⚙️" },
] as const;

export function BottomNav() {
  const { state } = useStore();
  const [sheetOpen, setSheetOpen] = useState(false);
  const location = useLocation();
  const cart = cartCount(state);
  const rewards = state.punch.rewards;

  useEffect(() => setSheetOpen(false), [location.pathname]);

  const moreActive = more.some((m) => m.to === location.pathname);

  return (
    <>
      {sheetOpen && <div className="sheet-scrim" onClick={() => setSheetOpen(false)} />}
      {sheetOpen && (
        <div className="more-sheet" role="menu">
          {more.map((m) => {
            const c = "badge" in m && m.badge === "cart" ? cart : 0;
            return (
              <NavLink
                key={m.to}
                to={m.to}
                className={({ isActive }) => "sheet-item" + (isActive ? " active" : "")}
              >
                <span className="sheet-icon">{m.icon}</span>
                {m.label}
                {c > 0 && <span className="tab-badge sheet-badge">{c}</span>}
              </NavLink>
            );
          })}
        </div>
      )}

      <nav className="bottom-nav">
        {primary.map((it) => {
          const count = it.badge === "cart" ? cart : it.badge === "rewards" ? rewards : 0;
          return (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end ?? false}
              className={({ isActive }) => "tab" + (isActive ? " active" : "")}
              onClick={() => {
                tapLight();
                setSheetOpen(false);
              }}
            >
              <span className="tab-icon">
                <img className="tab-img" src={it.img} alt="" aria-hidden width={26} height={26} />
                {count > 0 && <span className="tab-badge">{count}</span>}
              </span>
              <span className="tab-label">{it.label}</span>
            </NavLink>
          );
        })}
        <button
          className={"tab" + (moreActive || sheetOpen ? " active" : "")}
          onClick={() => {
            tapLight();
            setSheetOpen((o) => !o);
          }}
          aria-haspopup="menu"
          aria-expanded={sheetOpen}
        >
          <span className="tab-icon">
            ⋯
            {cart > 0 && <span className="tab-badge">{cart}</span>}
          </span>
          <span className="tab-label">More</span>
        </button>
      </nav>
    </>
  );
}
