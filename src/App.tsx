import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./state/auth";
import { Login } from "./pages/Login";
import { Sidebar } from "./components/Sidebar";
import { BottomNav } from "./components/BottomNav";
import { TopBar } from "./components/TopBar";
import { Dashboard } from "./pages/Dashboard";
import { Messages } from "./pages/Messages";
import { Calendar } from "./pages/Calendar";
import { Expenses } from "./pages/Expenses";
import { Journal } from "./pages/Journal";
import { InfoBank } from "./pages/InfoBank";
import { SearchPage } from "./pages/SearchPage";
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
            <Route path="/" element={<Dashboard />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/info" element={<InfoBank />} />
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
