import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./state/auth";
import { Login } from "./pages/Login";
import { Sidebar } from "./components/Sidebar";
import { BottomNav } from "./components/BottomNav";
import { TopBar } from "./components/TopBar";
import { Home } from "./pages/Home";
import { Menu } from "./pages/Menu";
import { Cart } from "./pages/Cart";
import { Rewards } from "./pages/Rewards";
import { Book } from "./pages/Book";
import { Bookings } from "./pages/Bookings";
import { Waivers } from "./pages/Waivers";
import { Community } from "./pages/Community";
import { GiftCard } from "./pages/GiftCard";
import { Orders } from "./pages/Orders";
import { Settings } from "./pages/Settings";

export default function App() {
  const { user, ready } = useAuth();

  // Wait for the session check, then gate the app behind sign-in.
  if (!ready) return null;
  if (!user) return <Login />;

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <Sidebar />
      <div className="main">
        <TopBar />
        <main id="main-content" className="content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/rewards" element={<Rewards />} />
            <Route path="/book" element={<Book />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/waivers" element={<Waivers />} />
            <Route path="/community" element={<Community />} />
            <Route path="/gift" element={<GiftCard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
