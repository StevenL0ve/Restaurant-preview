import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./state/auth";
import { Login } from "./pages/Login";
import { Sidebar } from "./components/Sidebar";
import { BottomNav } from "./components/BottomNav";
import { TopBar } from "./components/TopBar";
import { Dashboard } from "./pages/Dashboard";
import { CardsPage } from "./pages/CardsPage";
import { CardDetail } from "./pages/CardDetail";
import { CardEdit } from "./pages/CardEdit";
import { SetupMode } from "./pages/SetupMode";
import { SurgeonsPage } from "./pages/SurgeonsPage";
import { SurgeonDetail } from "./pages/SurgeonDetail";
import { SearchPage } from "./pages/SearchPage";
import { Settings } from "./pages/Settings";

export default function App() {
  const { user, ready } = useAuth();

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
            <Route path="/" element={<Dashboard />} />
            <Route path="/cards" element={<CardsPage />} />
            <Route path="/cards/new" element={<CardEdit />} />
            <Route path="/cards/:id" element={<CardDetail />} />
            <Route path="/cards/:id/edit" element={<CardEdit />} />
            <Route path="/cards/:id/setup" element={<SetupMode />} />
            <Route path="/surgeons" element={<SurgeonsPage />} />
            <Route path="/surgeons/:id" element={<SurgeonDetail />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
