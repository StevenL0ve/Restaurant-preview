import { Link } from "react-router-dom";
import { useAuth } from "../state/auth";
import { useStore, cartCount } from "../state/store";
import { ThemeToggle } from "./ThemeToggle";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function TopBar() {
  const { user } = useAuth();
  const { state } = useStore();
  const cart = cartCount(state);
  const firstName = user?.name?.split(/\s+/)[0] ?? "friend";

  return (
    <header className="topbar">
      <div className="topbar-greeting">
        <span className="greet-hi">{greeting()},</span>
        <span className="greet-name">{firstName}</span>
      </div>

      <div className="topbar-right">
        <ThemeToggle />
        <Link to="/cart" className="cart-btn" aria-label={`Cart, ${cart} items`}>
          <span aria-hidden>🛒</span>
          {cart > 0 && <span className="cart-count">{cart}</span>}
        </Link>
      </div>
    </header>
  );
}
