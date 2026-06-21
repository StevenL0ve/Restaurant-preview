import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./state/auth";
import { Login } from "./pages/Login";
import { BottomNav } from "./components/BottomNav";
import { TopBar } from "./components/TopBar";
import { Cellar } from "./pages/Cellar";
import { Rack } from "./pages/Rack";
import { AddWine } from "./pages/AddWine";
import { WineDetail } from "./pages/WineDetail";
import { Outings } from "./pages/Outings";
import { Settings } from "./pages/Settings";

export default function App() {
  const { user, ready } = useAuth();

  if (!ready) return null;
  if (!user) return <Login />;

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <div className="main">
        <TopBar />
        <main id="main-content" className="content">
          <Routes>
            <Route path="/" element={<Cellar />} />
            <Route path="/rack" element={<Rack />} />
            <Route path="/add" element={<AddWine />} />
            <Route path="/wine/:id" element={<WineDetail />} />
            <Route path="/outings" element={<Outings />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
